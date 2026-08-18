use sqlx::PgPool;
use std::sync::Arc;
use std::time::Instant;

use crate::analytics::AnalyticsCache;
use crate::config::Config;
use crate::quality::QualityCache;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Arc<Config>,
    pub quality: QualityCache,
    pub analytics: AnalyticsCache,
    pub started_at: Instant,
}
