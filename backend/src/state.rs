use sqlx::PgPool;
use std::sync::Arc;
use std::time::Instant;

use crate::config::Config;
use crate::quality::QualityCache;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Arc<Config>,
    pub quality: QualityCache,
    pub started_at: Instant,
}
