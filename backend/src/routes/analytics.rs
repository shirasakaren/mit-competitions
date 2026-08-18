use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};

use crate::error::{AppError, AppResult};
use crate::state::AppState;

/// `GET /api/analytics` — the live data-analysis snapshot.
///
/// Every dataset (growth time series, demographics, revenue, top spenders,
/// activity heatmap) is computed against the live tables by the background
/// refresher and served from the watch cache in well under a millisecond.
/// Returns 503 WARMING_UP until the first pass finishes (~a few minutes
/// after boot) — consumers poll.
pub async fn analytics(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    match state.analytics.get() {
        Some(snapshot) => Ok((StatusCode::OK, Json((*snapshot).clone()))),
        None => Err(AppError::WarmingUp),
    }
}
