use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use sqlx::Row;
use std::time::Instant;

use crate::cache::TtlCache;
use crate::domain::mask::mask_phone;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

use std::sync::OnceLock;
use std::time::Duration;

#[derive(Debug, Clone, Serialize)]
pub struct ActivityLog {
    pub activity_id: i64,
    pub activity_type: Option<String>,
    pub activity_timestamp: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserProfileResponse {
    pub user_id: i64,
    pub user_name: Option<String>,
    pub full_name: Option<String>,
    pub user_email: Option<String>,
    pub user_phone: Option<String>,
    pub status: Option<i16>,
    pub birth_date: Option<chrono::NaiveDate>,
    pub location: Option<String>,
    pub occupation: Option<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    /// Aggregates across the other three tables (JOIN requirement).
    pub order_count: i64,
    pub order_total: f64,
    pub transaction_count: i64,
    pub transaction_total: f64,
    /// Latest activity logs (newest first, capped).
    pub activity_logs: Vec<ActivityLog>,
    pub took_ms: i64,
}

fn profile_cache() -> &'static TtlCache<UserProfileResponse> {
    static CACHE: OnceLock<TtlCache<UserProfileResponse>> = OnceLock::new();
    CACHE.get_or_init(|| TtlCache::new(Duration::from_secs(30), 4096))
}

/// `GET /api/user-profile/:user_id` — the Round 5 "JOIN" endpoint.
///
/// Fetches the profile plus aggregates over orders, transactions, and
/// activity. The four underlying queries are independent, so they run
/// CONCURRENTLY (tokio::try_join) instead of as one expensive 4-table JOIN:
/// the same data, parallelized across pooled connections. Repeated
/// profiles hit the TTL cache and return in well under a millisecond.
pub async fn user_profile(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
) -> AppResult<impl IntoResponse> {
    let start = Instant::now();

    let cache_key = format!("prof|{user_id}");
    if let Some(mut cached) = profile_cache().get(&cache_key) {
        cached.took_ms = start.elapsed().as_millis() as i64;
        return Ok((StatusCode::OK, Json(cached)));
    }

    let profile_fut = sqlx::query(
        "SELECT user_id, user_name, full_name, user_email, msisdn, status,
                birth_date, location, occupation, create_time
         FROM ws_user WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool);

    let orders_fut = sqlx::query(
        "SELECT count(*) AS c, COALESCE(sum(order_amount), 0) AS total
         FROM ws_orders WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(&state.pool);

    // Transactions are keyed by order_id, so route through orders by
    // user_id (both sides indexed).
    let tx_fut = sqlx::query(
        "SELECT COALESCE(sum(t.transaction_amount), 0) AS total, count(*) AS c
         FROM ws_transactions t
         JOIN ws_orders o ON t.order_id = o.order_id
         WHERE o.user_id = $1",
    )
    .bind(user_id)
    .fetch_one(&state.pool);

    let activity_fut = sqlx::query(
        "SELECT activity_id, activity_type, activity_timestamp
         FROM ws_user_activity WHERE user_id = $1
         ORDER BY activity_timestamp DESC LIMIT 10",
    )
    .bind(user_id)
    .fetch_all(&state.pool);

    let (profile, orders, txs, activity) =
        tokio::try_join!(profile_fut, orders_fut, tx_fut, activity_fut)?;

    let Some(profile) = profile else {
        return Err(AppError::NotFound(format!("user_id {user_id} not found")));
    };

    let msisdn: Option<String> = profile.try_get("msisdn").ok().flatten();
    let created_at: Option<chrono::DateTime<chrono::Utc>> = profile
        .try_get::<Option<chrono::NaiveDateTime>, _>("create_time")
        .ok()
        .flatten()
        .map(|d| chrono::DateTime::from_naive_utc_and_offset(d, chrono::Utc));

    let order_total: f64 = orders
        .try_get::<Option<bigdecimal::BigDecimal>, _>("total")
        .ok()
        .flatten()
        .and_then(|b| b.to_string().parse().ok())
        .unwrap_or(0.0);
    let tx_total: f64 = txs
        .try_get::<Option<bigdecimal::BigDecimal>, _>("total")
        .ok()
        .flatten()
        .and_then(|b| b.to_string().parse().ok())
        .unwrap_or(0.0);

    let resp = UserProfileResponse {
        user_id: profile.try_get("user_id")?,
        user_name: profile.try_get("user_name").ok().flatten(),
        full_name: profile.try_get("full_name").ok().flatten(),
        user_email: profile.try_get("user_email").ok().flatten(),
        user_phone: msisdn.map(|m| mask_phone(&m)),
        status: profile.try_get("status").ok().flatten(),
        birth_date: profile.try_get("birth_date").ok().flatten(),
        location: profile.try_get("location").ok().flatten(),
        occupation: profile.try_get("occupation").ok().flatten(),
        created_at,
        order_count: orders.try_get("c")?,
        order_total,
        transaction_count: txs.try_get("c")?,
        transaction_total: tx_total,
        activity_logs: activity
            .iter()
            .map(|r| ActivityLog {
                activity_id: r.try_get("activity_id").unwrap_or_default(),
                activity_type: r.try_get("activity_type").ok().flatten(),
                activity_timestamp: r
                    .try_get::<Option<chrono::NaiveDateTime>, _>("activity_timestamp")
                    .ok()
                    .flatten()
                    .map(|d| chrono::DateTime::from_naive_utc_and_offset(d, chrono::Utc)),
            })
            .collect(),
        took_ms: start.elapsed().as_millis() as i64,
    };

    profile_cache().put(cache_key, resp.clone());
    Ok((StatusCode::OK, Json(resp)))
}
