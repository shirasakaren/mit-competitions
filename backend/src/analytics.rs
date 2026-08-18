//! Live data-analysis snapshot for `/api/analytics`.
//!
//! Same architectural pattern as `quality.rs`: every dataset below is a
//! real SQL aggregation over the live tables, recomputed by the same
//! background loop on a fixed cadence and served from a `watch` channel in
//! well under a millisecond. Nothing is pre-computed once-and-frozen and
//! nothing is hardcoded — the snapshot is continuously refreshed against
//! the database.
//!
//! The pass runs on the isolated analytics pool (no `statement_timeout`,
//! parallelism left enabled so the bigger scans can use parallel workers).
//! Total cost is a few minutes, which the 30-minute cadence absorbs.

use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use tokio::sync::watch;

#[derive(Debug, Clone, Serialize)]
pub struct MonthPoint {
    /// `YYYY-MM`
    pub month: String,
    pub count: i64,
    /// Money column (orders: total order_amount; transactions: total
    /// transaction_amount; registrations: 0.0).
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct Bucket {
    pub label: String,
    pub count: i64,
    pub percent: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TopSpender {
    pub user_id: i64,
    pub full_name: Option<String>,
    pub orders: i64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActivityHeatmap {
    /// Day labels, Monday-first (`["Mon", ... "Sun"]`).
    pub days: Vec<&'static str>,
    /// Hour labels `0..23`.
    pub hours: Vec<u8>,
    /// `cells[dow][hour]` event counts.
    pub cells: Vec<Vec<i64>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnalyticsSnapshot {
    pub analyzed_at: DateTime<Utc>,
    pub computation_ms: i64,
    /// Monthly new-user registrations (from `create_time`).
    pub registrations: Vec<MonthPoint>,
    /// 10-year age buckets.
    pub age_distribution: Vec<Bucket>,
    pub sex_distribution: Vec<Bucket>,
    pub lang_distribution: Vec<Bucket>,
    /// Deposit amount histogram (IDR).
    pub deposit_histogram: Vec<Bucket>,
    /// Share of rows with a non-empty location / occupation.
    pub location_completeness: f64,
    pub occupation_completeness: f64,
    pub top_locations: Vec<Bucket>,
    pub top_occupations: Vec<Bucket>,
    /// Monthly order counts and total order_amount.
    pub orders_over_time: Vec<MonthPoint>,
    /// Monthly transaction counts and total transaction_amount.
    pub revenue_over_time: Vec<MonthPoint>,
    pub order_statuses: Vec<Bucket>,
    pub transaction_types: Vec<Bucket>,
    pub transaction_statuses: Vec<Bucket>,
    pub top_spenders: Vec<TopSpender>,
    /// Day-of-week × hour-of-day activity event matrix.
    pub activity_heatmap: ActivityHeatmap,
    pub activity_types: Vec<Bucket>,
    pub activity_over_time: Vec<MonthPoint>,
}

fn pct(n: i64, total: i64) -> f64 {
    if total == 0 {
        0.0
    } else {
        ((n as f64 / total as f64) * 1000.0).round() / 10.0
    }
}

fn buckets_with_percent(rows: Vec<(String, i64)>) -> Vec<Bucket> {
    let total: i64 = rows.iter().map(|(_, c)| *c).sum();
    rows.into_iter()
        .map(|(label, count)| Bucket {
            label,
            count,
            percent: pct(count, total),
        })
        .collect()
}

/// Monthly registrations. Index-only scan over `idx_ws_user_create_time`.
async fn registrations(pool: &PgPool) -> sqlx::Result<Vec<MonthPoint>> {
    let rows = sqlx::query(
        "SELECT to_char(date_trunc('month', create_time), 'YYYY-MM') AS m, count(*) AS c
         FROM ws_user GROUP BY 1 ORDER BY 1",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| MonthPoint {
            month: r.try_get("m").unwrap_or_default(),
            count: r.try_get("c").unwrap_or_default(),
            amount: 0.0,
        })
        .collect())
}

/// 10-year age buckets from `birth_date` (index-only scan).
async fn age_distribution(pool: &PgPool) -> sqlx::Result<Vec<Bucket>> {
    let rows = sqlx::query(
        r#"
        SELECT CASE
                 WHEN birth_date IS NULL THEN 'unknown'
                 WHEN birth_date <= CURRENT_DATE - INTERVAL '70 years' THEN '70+'
                 WHEN birth_date <= CURRENT_DATE - INTERVAL '60 years' THEN '60-69'
                 WHEN birth_date <= CURRENT_DATE - INTERVAL '50 years' THEN '50-59'
                 WHEN birth_date <= CURRENT_DATE - INTERVAL '40 years' THEN '40-49'
                 WHEN birth_date <= CURRENT_DATE - INTERVAL '30 years' THEN '30-39'
                 WHEN birth_date <= CURRENT_DATE - INTERVAL '20 years' THEN '20-29'
                 ELSE 'under 20'
               END AS bucket,
               count(*) AS c
        FROM ws_user GROUP BY 1
        "#,
    )
    .fetch_all(pool)
    .await?;

    let order = ["under 20", "20-29", "30-39", "40-49", "50-59", "60-69", "70+", "unknown"];
    let mut pairs: Vec<(String, i64)> = rows
        .into_iter()
        .map(|r| {
            (
                r.try_get::<Option<String>, _>("bucket").ok().flatten().unwrap_or_else(|| "unknown".into()),
                r.try_get("c").unwrap_or_default(),
            )
        })
        .collect();
    pairs.sort_by_key(|(label, _)| {
        order
            .iter()
            .position(|o| o == label)
            .unwrap_or(order.len())
    });
    Ok(buckets_with_percent(pairs))
}

/// One full scan computing every cheap per-row dimension at once:
/// sex, language, location/occupation completeness, and a deposit
/// histogram (deposit is numeric IDR; measured range 0..~7M).
async fn user_dimensions(pool: &PgPool) -> sqlx::Result<(Vec<Bucket>, Vec<Bucket>, Vec<Bucket>, f64, f64)> {
    let row = sqlx::query(
        r#"
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE sex = 0) AS sex_0,
          count(*) FILTER (WHERE sex = 1) AS sex_1,
          count(*) FILTER (WHERE sex = 2) AS sex_2,
          count(*) FILTER (WHERE sex IS NULL OR sex NOT IN (0,1,2)) AS sex_other,
          count(*) FILTER (WHERE lang = 'id') AS lang_id,
          count(*) FILTER (WHERE lang = 'en') AS lang_en,
          count(*) FILTER (WHERE lang IS NOT NULL AND lang NOT IN ('id','en')) AS lang_other,
          count(*) FILTER (WHERE lang IS NULL OR lang = '') AS lang_empty,
          count(*) FILTER (WHERE location IS NOT NULL AND location <> '') AS loc_present,
          count(*) FILTER (WHERE occupation IS NOT NULL AND occupation <> '') AS occ_present,
          count(*) FILTER (WHERE deposit IS NOT NULL AND deposit = 0) AS dep_zero,
          count(*) FILTER (WHERE deposit IS NOT NULL AND deposit > 0 AND deposit <= 10000) AS dep_0_10k,
          count(*) FILTER (WHERE deposit IS NOT NULL AND deposit > 10000 AND deposit <= 100000) AS dep_10k_100k,
          count(*) FILTER (WHERE deposit IS NOT NULL AND deposit > 100000 AND deposit <= 1000000) AS dep_100k_1m,
          count(*) FILTER (WHERE deposit IS NOT NULL AND deposit > 1000000) AS dep_1m_plus,
          count(*) FILTER (WHERE deposit IS NULL) AS dep_null
        FROM ws_user
        "#,
    )
    .fetch_one(pool)
    .await?;

    let total: i64 = row.try_get("total")?;
    let sex = buckets_with_percent(vec![
        ("female".into(), row.try_get("sex_0")?),
        ("male".into(), row.try_get("sex_1")?),
        ("other".into(), row.try_get("sex_2")?),
        ("unknown".into(), row.try_get("sex_other")?),
    ]);
    let lang = buckets_with_percent(vec![
        ("Indonesian (id)".into(), row.try_get("lang_id")?),
        ("English (en)".into(), row.try_get("lang_en")?),
        ("other".into(), row.try_get("lang_other")?),
        ("unset".into(), row.try_get("lang_empty")?),
    ]);
    let deposits = buckets_with_percent(vec![
        ("0".into(), row.try_get("dep_zero")?),
        ("1 – 10K".into(), row.try_get("dep_0_10k")?),
        ("10K – 100K".into(), row.try_get("dep_10k_100k")?),
        ("100K – 1M".into(), row.try_get("dep_100k_1m")?),
        ("1M+".into(), row.try_get("dep_1m_plus")?),
        ("no deposit".into(), row.try_get("dep_null")?),
    ]);
    let loc_present: i64 = row.try_get("loc_present")?;
    let occ_present: i64 = row.try_get("occ_present")?;
    Ok((
        sex,
        lang,
        deposits,
        pct(loc_present, total),
        pct(occ_present, total),
    ))
}

/// Top-N grouped dimension over a text column (single hash-agg pass).
async fn top_grouped(
    pool: &PgPool,
    table: &str,
    column: &str,
    limit: i64,
) -> sqlx::Result<Vec<Bucket>> {
    // table/column are compile-time literals at both call sites — never
    // request-derived — so formatting them into the SQL is safe.
    let sql = format!(
        "SELECT {column} AS v, count(*) AS c FROM {table}
         WHERE {column} IS NOT NULL AND {column} <> ''
         GROUP BY 1 ORDER BY 2 DESC LIMIT $1"
    );
    let rows = sqlx::query(&sql).bind(limit).fetch_all(pool).await?;
    let mut pairs: Vec<(String, i64)> = rows
        .into_iter()
        .map(|r| {
            (
                r.try_get::<Option<String>, _>("v").ok().flatten().unwrap_or_default(),
                r.try_get("c").unwrap_or_default(),
            )
        })
        .collect();
    pairs.sort_by(|a, b| b.1.cmp(&a.1));
    Ok(buckets_with_percent(pairs))
}

async fn monthly_orders(pool: &PgPool) -> sqlx::Result<Vec<MonthPoint>> {
    let rows = sqlx::query(
        "SELECT to_char(date_trunc('month', order_date), 'YYYY-MM') AS m,
                count(*) AS c, COALESCE(sum(order_amount), 0) AS a
         FROM ws_orders GROUP BY 1 ORDER BY 1",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| MonthPoint {
            month: r.try_get("m").unwrap_or_default(),
            count: r.try_get("c").unwrap_or_default(),
            amount: r.try_get::<Option<bigdecimal::BigDecimal>, _>("a").ok().flatten().and_then(|b| b.to_string().parse().ok()).unwrap_or(0.0),
        })
        .collect())
}

async fn monthly_revenue(pool: &PgPool) -> sqlx::Result<Vec<MonthPoint>> {
    let rows = sqlx::query(
        "SELECT to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS m,
                count(*) AS c, COALESCE(sum(transaction_amount), 0) AS a
         FROM ws_transactions GROUP BY 1 ORDER BY 1",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| MonthPoint {
            month: r.try_get("m").unwrap_or_default(),
            count: r.try_get("c").unwrap_or_default(),
            amount: r.try_get::<Option<bigdecimal::BigDecimal>, _>("a").ok().flatten().and_then(|b| b.to_string().parse().ok()).unwrap_or(0.0),
        })
        .collect())
}

async fn top_spenders(pool: &PgPool) -> sqlx::Result<Vec<TopSpender>> {
    let rows = sqlx::query(
        "SELECT user_id, count(*) AS orders, COALESCE(sum(order_amount), 0) AS total
         FROM ws_orders GROUP BY user_id ORDER BY 3 DESC LIMIT 10",
    )
    .fetch_all(pool)
    .await?;

    let mut spenders = Vec::new();
    for r in rows {
        let user_id: i64 = r.try_get("user_id")?;
        // Point lookup for the display name — cheap and keeps the
        // aggregation itself a pure orders-table scan.
        let name: Option<String> = sqlx::query("SELECT full_name FROM ws_user WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .and_then(|n| n.try_get("full_name").ok().flatten());
        spenders.push(TopSpender {
            user_id,
            full_name: name,
            orders: r.try_get("orders")?,
            total: r
                .try_get::<Option<bigdecimal::BigDecimal>, _>("total")
                .ok()
                .flatten()
                .and_then(|b| b.to_string().parse().ok())
                .unwrap_or(0.0),
        });
    }
    Ok(spenders)
}

async fn activity_heatmap(pool: &PgPool) -> sqlx::Result<ActivityHeatmap> {
    let rows = sqlx::query(
        "SELECT EXTRACT(DOW FROM activity_timestamp)::int AS dow,
                EXTRACT(HOUR FROM activity_timestamp)::int AS hr,
                count(*) AS c
         FROM ws_user_activity GROUP BY 1, 2",
    )
    .fetch_all(pool)
    .await?;

    let days = vec!["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let hours: Vec<u8> = (0..24).collect();
    // Postgres DOW: 0=Sunday..6=Saturday → map to Monday-first rows.
    let mut cells = vec![vec![0i64; 24]; 7];
    for r in rows {
        let dow: i32 = r.try_get("dow").unwrap_or_default();
        let hr: i32 = r.try_get("hr").unwrap_or_default();
        if !(0..7).contains(&dow) || !(0..24).contains(&hr) {
            continue;
        }
        let row_idx = ((dow + 6) % 7) as usize; // 0(Mon)..6(Sun)
        cells[row_idx][hr as usize] = r.try_get("c").unwrap_or_default();
    }
    Ok(ActivityHeatmap { days, hours, cells })
}

async fn activity_types(pool: &PgPool) -> sqlx::Result<Vec<Bucket>> {
    let rows = sqlx::query(
        "SELECT activity_type AS v, count(*) AS c FROM ws_user_activity
         WHERE activity_type IS NOT NULL AND activity_type <> ''
         GROUP BY 1 ORDER BY 2 DESC LIMIT 15",
    )
    .fetch_all(pool)
    .await?;
    let pairs: Vec<(String, i64)> = rows
        .into_iter()
        .map(|r| {
            (
                r.try_get::<Option<String>, _>("v").ok().flatten().unwrap_or_default(),
                r.try_get("c").unwrap_or_default(),
            )
        })
        .collect();
    Ok(buckets_with_percent(pairs))
}

async fn activity_over_time(pool: &PgPool) -> sqlx::Result<Vec<MonthPoint>> {
    let rows = sqlx::query(
        "SELECT to_char(date_trunc('month', activity_timestamp), 'YYYY-MM') AS m, count(*) AS c
         FROM ws_user_activity GROUP BY 1 ORDER BY 1",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| MonthPoint {
            month: r.try_get("m").unwrap_or_default(),
            count: r.try_get("c").unwrap_or_default(),
            amount: 0.0,
        })
        .collect())
}

pub async fn compute_analytics_snapshot(pool: &PgPool) -> sqlx::Result<AnalyticsSnapshot> {
    let start = std::time::Instant::now();

    let registrations = registrations(pool).await?;
    let age = age_distribution(pool).await?;
    let (sex, lang, deposits, loc_complete, occ_complete) = user_dimensions(pool).await?;
    let top_locations = top_grouped(pool, "ws_user", "location", 12).await?;
    let top_occupations = top_grouped(pool, "ws_user", "occupation", 12).await?;
    let orders_over_time = monthly_orders(pool).await?;
    let revenue_over_time = monthly_revenue(pool).await?;

    let order_statuses = top_grouped(pool, "ws_orders", "order_status::text", 8).await?;
    let transaction_types = top_grouped(pool, "ws_transactions", "transaction_type", 12).await?;
    let transaction_statuses = top_grouped(pool, "ws_transactions", "status", 12).await?;

    let top_spenders = top_spenders(pool).await?;
    let activity_heatmap = activity_heatmap(pool).await?;
    let activity_types = activity_types(pool).await?;
    let activity_over_time = activity_over_time(pool).await?;

    Ok(AnalyticsSnapshot {
        analyzed_at: Utc::now(),
        computation_ms: start.elapsed().as_millis() as i64,
        registrations,
        age_distribution: age,
        sex_distribution: sex,
        lang_distribution: lang,
        deposit_histogram: deposits,
        location_completeness: loc_complete,
        occupation_completeness: occ_complete,
        top_locations,
        top_occupations,
        orders_over_time,
        revenue_over_time,
        order_statuses,
        transaction_types,
        transaction_statuses,
        top_spenders,
        activity_heatmap,
        activity_types,
        activity_over_time,
    })
}

#[derive(Clone)]
pub struct AnalyticsCache {
    rx: watch::Receiver<Option<Arc<AnalyticsSnapshot>>>,
}

impl AnalyticsCache {
    pub fn get(&self) -> Option<Arc<AnalyticsSnapshot>> {
        self.rx.borrow().clone()
    }
}

/// Creates the watch channel backing `/api/analytics`. The sender side is
/// driven by the quality refresher loop (see `quality::spawn_refresher`),
/// which computes this snapshot right after each quality pass.
pub fn analytics_channel() -> (watch::Sender<Option<Arc<AnalyticsSnapshot>>>, AnalyticsCache) {
    let (tx, rx) = watch::channel(None);
    (tx, AnalyticsCache { rx })
}
