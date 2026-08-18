use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};

use crate::error::{AppError, AppResult};
use crate::state::AppState;

/// `GET /api/quality` — serves the latest background-computed snapshot.
/// See `quality.rs` module docs for why this is cached rather than computed
/// per-request (two of the metrics are inherently ~20-35s full-table scans).
pub async fn quality(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    match state.quality.get() {
        Some(snapshot) => Ok((StatusCode::OK, Json((*snapshot).clone()))),
        None => Err(AppError::WarmingUp),
    }
}
