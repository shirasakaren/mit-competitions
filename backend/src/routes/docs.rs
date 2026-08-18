use axum::{http::header, response::IntoResponse};

const OPENAPI_JSON: &str = include_str!("../static/openapi.json");
const DOCS_HTML: &str = include_str!("../static/docs.html");

pub async fn openapi_json() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "application/json")], OPENAPI_JSON)
}

pub async fn docs_page() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], DOCS_HTML)
}
