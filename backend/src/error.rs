use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

/// Application-wide error type. Every variant maps to a stable machine-readable
/// `code` plus an HTTP status, and is rendered as the consistent envelope:
/// `{ "error": { "code": "...", "message": "..." } }`.
#[derive(Debug)]
pub enum AppError {
    InvalidSearchType(String),
    InvalidQuery(String),
    InvalidPagination(String),
    NotFound(String),
    Database(sqlx::Error),
    Timeout,
    PayloadTooLarge,
    WarmingUp,
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::InvalidSearchType(m)
            | AppError::InvalidQuery(m)
            | AppError::InvalidPagination(m)
            | AppError::NotFound(m) => write!(f, "{m}"),
            AppError::Database(e) => write!(f, "database error: {e}"),
            AppError::Timeout => write!(f, "request timed out"),
            AppError::PayloadTooLarge => write!(f, "payload too large"),
            AppError::WarmingUp => write!(f, "analytics snapshot still warming up"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError::Database(e)
    }
}

#[derive(Serialize)]
struct ErrorBody {
    error: ErrorInner,
}

#[derive(Serialize)]
struct ErrorInner {
    code: &'static str,
    message: String,
}

impl AppError {
    fn parts(&self) -> (StatusCode, &'static str, String) {
        match self {
            AppError::InvalidSearchType(m) => {
                (StatusCode::BAD_REQUEST, "INVALID_SEARCH_TYPE", m.clone())
            }
            AppError::InvalidQuery(m) => (StatusCode::BAD_REQUEST, "INVALID_QUERY", m.clone()),
            AppError::InvalidPagination(m) => {
                (StatusCode::BAD_REQUEST, "INVALID_PAGINATION", m.clone())
            }
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, "NOT_FOUND", m.clone()),
            AppError::Database(e) => {
                // Never leak internal DB error detail (queries, schema) to clients.
                tracing::error!(error = %e, "database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "internal server error".to_string(),
                )
            }
            AppError::Timeout => (
                StatusCode::GATEWAY_TIMEOUT,
                "TIMEOUT",
                "request timed out".to_string(),
            ),
            AppError::PayloadTooLarge => (
                StatusCode::PAYLOAD_TOO_LARGE,
                "PAYLOAD_TOO_LARGE",
                "request payload too large".to_string(),
            ),
            AppError::WarmingUp => (
                StatusCode::SERVICE_UNAVAILABLE,
                "WARMING_UP",
                "analytics snapshot is still computing, retry shortly".to_string(),
            ),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = self.parts();
        (status, Json(ErrorBody { error: ErrorInner { code, message } })).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
