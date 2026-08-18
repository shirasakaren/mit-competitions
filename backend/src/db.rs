use sqlx::postgres::{PgPoolOptions, PgConnectOptions};
use std::str::FromStr;
use std::time::Duration;

use crate::config::Config;

/// The main request-serving pool.
///
/// Every connection disables intra-query parallelism, which is cheap
/// insurance against any request-path query plan choosing a multi-worker
/// Gather. This did NOT turn out to be the Round 5 bottleneck, though —
/// direct `pg_stat_activity` sampling during a live load test found the
/// actual cause on the separate analytics pool below (a background query
/// that was active ~55%+ of all wall-clock time and read ~1.9GB from disk
/// per pass with its own 2-worker Gather). See PERFORMANCE.md for the full
/// diagnostic trail and before/after numbers. Pool size (12 vs 50
/// connections) was also tested and ruled out as a factor either way.
pub async fn connect_pool(cfg: &Config) -> sqlx::Result<sqlx::PgPool> {
    let opts = PgConnectOptions::from_str(&cfg.database_url)?
        .application_name("cip-backend");

    PgPoolOptions::new()
        .min_connections(cfg.db_pool_min)
        .max_connections(cfg.db_pool_max)
        .acquire_timeout(Duration::from_secs(3))
        .idle_timeout(Duration::from_secs(300))
        .max_lifetime(Duration::from_secs(1800))
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                sqlx::query("SET max_parallel_workers_per_gather = 0")
                    .execute(&mut *conn)
                    .await?;
                Ok(())
            })
        })
        .connect_with(opts)
        .await
}

/// A separate, tiny pool for the background analytics refresher (quality
/// metrics). Isolated from the request-serving pool so a slow analytic query
/// never starves a connection a live search/duplicate request needs.
///
/// Every connection disables `statement_timeout`: the production default
/// (8s, see db/postgresql.tuned.conf) is sized for interactive queries and
/// would otherwise cancel the deliberately-expensive ~30-90s analytics
/// queries mid-flight. An 8s-cancelled connection was observed leaving the
/// pool in a bad state that cascaded into unrelated search-query failures
/// during integration testing — disabling the timeout here removes the
/// trigger entirely rather than working around the cascade.
pub async fn connect_analytics_pool(cfg: &Config) -> sqlx::Result<sqlx::PgPool> {
    let opts = PgConnectOptions::from_str(&cfg.database_url)?
        .application_name("cip-backend-analytics");

    PgPoolOptions::new()
        .min_connections(1)
        .max_connections(2)
        .acquire_timeout(Duration::from_secs(5))
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                sqlx::query("SET statement_timeout = 0").execute(&mut *conn).await?;
                Ok(())
            })
        })
        .connect_with(opts)
        .await
}
