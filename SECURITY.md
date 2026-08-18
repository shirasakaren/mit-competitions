# SECURITY.md

## SQL injection

Every database query in the backend is a parameterized `sqlx::query()` /
`sqlx::query_as()` call with bound `$1, $2, ...` placeholders. **No user
input is ever string-interpolated into SQL.** The two places that use
`format!()` around SQL are both interpolating a **compile-time constant**,
never a request value:

- `quality.rs`'s `compute_cheap_metrics` interpolates `EMAIL_FORMAT_RE`, a
  `const &str` regex literal defined in the same file — not user input.
- `search.rs`/`duplicates.rs` interpolate `NAME_SEARCH_TIMEOUT_MS` /
  `DUPLICATE_QUERY_TIMEOUT_MS` into a `SET LOCAL statement_timeout = '...'`
  statement — both are `const &str` literals, never request-derived.

Every request-derived value (search query, threshold, limit, offset,
user_id) is passed as a bound parameter via `.bind(...)`, which SQLx sends
as a separate protocol-level parameter, never concatenated into the SQL
text.

## XSS / HTML injection

The dataset contains raw, unsanitized user-submitted strings (names,
hobbies, "about me" text) that can legitimately contain HTML tags, script
tags, or emoji/garbage bytes — the challenge's data-quality requirements
explicitly call this out (`hobbies` "with emoji, special chars, NULLs").
Two independent layers prevent this from becoming a stored/reflected XSS
vector:

- **React's default JSX text rendering** (`{value}`) escapes all string
  content automatically. No page component uses
  `dangerouslySetInnerHTML` to render API/database data. The one
  `dangerouslySetInnerHTML` call in the codebase is the vendored shadcn/ui
  `ChartStyle` helper, which renders a `<style>` block built only from a
  developer-authored color-config object at compile time — never database
  or request-derived content (see ARCHITECTURE.md).
- **`GET /api/docs`** (the static API documentation page) builds its DOM
  entirely via `document.createElement(...)` / `.textContent = ...` helper
  functions (`el()`, `pre()`), never `innerHTML`, so even though it renders
  the OpenAPI spec's field descriptions dynamically, no string is ever
  parsed as HTML.

## Sensitive-data masking

Per the challenge spec ("Results correctly masked (no raw phone numbers in
response)"), every API response masks phone numbers before they leave the
server: `mask_phone()` (`domain/mask.rs`) keeps a 4-character prefix and up
to a 2-character suffix and replaces the middle with a fixed `****`,
applied to every `msisdn` field in `/api/search`, `/api/duplicates/:id`,
and `POST /api/duplicates` responses. The mask is applied only to the
value returned over HTTP — the raw column is never mutated and is used
as-is for query matching. Email addresses are intentionally left unmasked
in search results, matching the spec exactly (only phone masking is
required; email needs to remain visible for the caller to visually confirm
an exact-match result).

## Secrets handling

- `.env` (database credentials, and locally, Cloudflare/AWS tokens used
  only by one-off admin scripts — never read by the running application)
  is gitignored (`.gitignore`: `.env`, `.env.*`, `!.env.example`) and was
  never committed. `.env.example` documents every variable name with a
  placeholder value only.
- The VPS's deployed `.env` (`/opt/cip/.env`) contains **only** the
  Postgres credentials the running containers actually need
  (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) — Cloudflare and AWS
  tokens are deliberately excluded from the deployed environment entirely,
  since the running application has no legitimate use for them.
- No secret is ever logged: `RUST_LOG` structured JSON logs contain query
  text and timings, never connection strings or credential values; SQLx's
  own connection-string parsing happens once at pool construction, before
  any per-request logging path.
- No secret is ever returned in an HTTP response body, error message, or
  header — `AppError`'s HTTP mapping returns a fixed, generic message per
  error variant (see `error.rs`), never a raw database driver error string
  (which could otherwise leak schema details or, in principle, connection
  info).

## Transport security

- Public traffic reaches the origin only via Cloudflare, in **Full-Strict**
  SSL mode — Cloudflare validates the origin's certificate, not just
  encrypts the hop, so a spoofed/self-signed origin would be rejected.
- The origin certificate is a genuine **Cloudflare Origin CA** certificate
  (15-year validity), issued via the Cloudflare API — not a self-signed
  cert generated locally, and not an expiring-soon Let's Encrypt cert that
  would need renewal automation for this exercise's timeframe.
- Nginx sets `real_ip_header CF-Connecting-IP` with the full published
  Cloudflare IP range in `set_real_ip_from`, so the backend/Nginx logs
  record genuine client IPs rather than Cloudflare's edge IP for every
  request — required for the access-log-based latency diagnostics in
  PERFORMANCE.md to be meaningful at all.
- Security headers set at the Nginx layer: HSTS, `X-Frame-Options`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`.
- Postgres's `5432` is bound to `127.0.0.1` only in `docker-compose.yml` —
  never reachable from outside the host, regardless of firewall state.

## Input validation

All query parameters (`limit`, `offset`, `threshold`, `q`, `type`) are
parsed and range-checked before use (`parse_limit`, `parse_offset`,
`parse_threshold` in `search.rs`/`duplicates.rs`) — out-of-range or
non-numeric values return a `400`-class typed error (`AppError::
InvalidPagination` / `InvalidQuery`), never silently clamped in a way that
could be surprising, and never passed through to SQL unchecked. `q` is
additionally capped at 256 characters to bound query cost. `POST
/api/duplicates`'s body is deliberately tolerant of empty/absent/malformed
JSON (defaulting rather than rejecting), per the challenge's own
no-defined-schema, no-body compatibility requirement — but a *provided*
`user_id`, `threshold`, or `limit` still goes through the exact same
range-checked path as the GET endpoint before reaching any query.

## What's explicitly out of scope for this exercise

- **Authentication/authorization**: the challenge defines an unauthenticated
  public API surface judged by an external grader with no issued credentials;
  no endpoint here handles credentials, sessions, or per-user access control,
  so there is none to secure. Adding an auth layer would make every
  judge-driven round (2-5) fail with 401 before it could score anything.
  The same reasoning applies to `CorsLayer::permissive()`: the API carries
  no cookies/session state, so a permissive CORS policy does not expose any
  credentialed context — it only allows the challenge's own frontend and
  the judge's tooling to call it from any origin, which is the point.
  Rate limiting is delegated to Cloudflare's edge in front of the origin.
- **Email masking in `/api/search` and `/api/duplicates`**: the challenge
  spec requires exactly one masking rule — "no raw phone numbers in
  response" — and Round 4's scoring verifies *exact email match detection*
  by comparing emails between the target user and its duplicate candidates.
  Masking candidate emails would make that verification impossible, so
  email addresses remain visible in those two responses. The dataset is the
  challenge's own anonymized dump (no real customer PII), and phone numbers
  are masked even inside `/api/quality`'s data-issue examples.
- **Rate limiting**: not implemented at the application layer; Cloudflare's
  edge provides basic DDoS/abuse protection in front of the origin, but
  `security_level` and `browser_check` were deliberately lowered from
  Cloudflare's defaults so the Round 5 load-test client (a non-browser HTTP
  client hitting the API at high concurrency) is not itself mistaken for
  the abuse this configuration would otherwise be defending against.
