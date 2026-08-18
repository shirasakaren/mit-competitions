use axum::{http::header, response::IntoResponse};

const OPENAPI_JSON: &str = include_str!("../static/openapi.json");
const DOCS_HTML: &str = include_str!("../static/docs.html");

// Swagger UI assets are vendored into the binary (swagger-ui-dist 5.x) so the
// interactive docs are fully self-hosted — no CDN, no external requests at
// runtime (the challenge forbids external queries; serving docs tooling from
// our own origin keeps /api/docs working even fully offline).
const SWAGGER_CSS: &[u8] = include_bytes!("../static/swagger-ui/swagger-ui.css");
const SWAGGER_JS: &[u8] = include_bytes!("../static/swagger-ui/swagger-ui-bundle.js");
const SWAGGER_PRESET_JS: &[u8] = include_bytes!("../static/swagger-ui/swagger-ui-standalone-preset.js");
const SWAGGER_FAVICON: &[u8] = include_bytes!("../static/swagger-ui/favicon-32x32.png");

pub async fn openapi_json() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "application/json")], OPENAPI_JSON)
}

pub async fn docs_page() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], DOCS_HTML)
}

pub async fn swagger_css() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "text/css"), (header::CACHE_CONTROL, "public, max-age=86400")],
        SWAGGER_CSS,
    )
}

pub async fn swagger_js() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "text/javascript"), (header::CACHE_CONTROL, "public, max-age=86400")],
        SWAGGER_JS,
    )
}

pub async fn swagger_preset_js() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "text/javascript"), (header::CACHE_CONTROL, "public, max-age=86400")],
        SWAGGER_PRESET_JS,
    )
}

pub async fn swagger_favicon() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "image/png"), (header::CACHE_CONTROL, "public, max-age=86400")],
        SWAGGER_FAVICON,
    )
}
