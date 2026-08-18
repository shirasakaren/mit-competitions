# ARCHITECTURE.md

## Overview

A Customer Intelligence Platform serving search, data-quality, and
duplicate-detection over a 22.4M-row PostgreSQL dataset, deployed publicly
at `https://mit.creations.ren` on a single 4 vCPU / 7.8 GB VPS. One
docker-compose stack, three services:

```
                    ┌─────────────┐
   Internet ───────▶│  Cloudflare │  (Full-Strict TLS, DNS, edge proxy)
                    └──────┬──────┘
                           │ HTTPS (Origin CA cert)
                    ┌──────▼──────┐
                    │    Nginx    │  (TLS termination, static frontend,
                    │  (cip-nginx)│   reverse-proxy /api/* + /health)
                    └──┬───────┬──┘
                       │       │
        static files ◀─┘       └─▶ ┌─────────────┐      ┌──────────────┐
      (React SPA build)            │  cip-backend │─────▶│ cip-postgres │
                                    │ Rust / Axum  │      │  Postgres 16 │
                                    └─────────────┘      └──────────────┘
```

All three containers run on one Docker bridge network (`cip`); only Nginx's
80/443 are published to the host. Postgres's 5432 is bound to
`127.0.0.1` only (host-local access for admin/psql, never reachable
externally).

## Backend — Rust / Axum / SQLx

Chosen over an interpreted stack specifically for this workload: a
single-digit-millisecond p50 on indexed lookups over 15M rows, and
predictable behavior under 100 concurrent connections, both benefit
directly from a compiled, no-GC runtime with a real async I/O model.

- **Axum 0.8** for routing/extractors, **Tokio** async runtime.
- **SQLx 0.8**, runtime-checked queries (not the compile-time offline-macro
  mode) — every query is a plain `sqlx::query()`/`sqlx::query_as()` call
  with bound parameters, never string-interpolated SQL.
- Two separate connection pools: a main request-serving pool
  (`DB_POOL_MIN`/`DB_POOL_MAX`, defaults 20/50) and a small, isolated
  analytics pool (min 1 / max 2) for the background quality-snapshot
  refresher — see DATABASE_NOTES.md for why they're isolated.
- Middleware stack (`tower` / `tower-http`): request-ID propagation,
  structured JSON tracing, a 4.5s per-request timeout (stays under the
  judge's 5s hard limit), gzip response compression, permissive CORS (the
  API has no cookies/session state to protect against cross-origin
  reading), and a 64 KB request body cap.
- Multi-stage Docker build: `rust:1-slim-bookworm` builder (release profile
  with `lto=true`, `codegen-units=1`, `panic="abort"`, `strip=true`) → a
  slim `debian` runtime image containing only the compiled binary and CA
  certificates.

### Module layout

```
backend/src/
  main.rs        — router wiring, middleware, graceful shutdown
  config.rs      — env-driven configuration, judge-compat constants
  db.rs          — the two connection pools
  state.rs       — shared AppState (pools, config, quality cache)
  error.rs       — AppError → HTTP status/JSON mapping
  quality.rs      — background analytics snapshot + refresher loop
  domain/
    normalize.rs — email/phone/name normalization
    mask.rs      — phone masking for API responses
    similarity.rs — duplicate-detection composite scoring
  routes/
    health.rs, search.rs, quality.rs, metrics.rs, duplicates.rs, docs.rs
```

### API surface

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Round 1 liveness; `total_records` = live snapshot count with a true-count warm-up fallback (see DATABASE_NOTES.md) |
| `/api/health` | GET | cheap liveness probe, no DB touch |
| `/api/search` | GET | email / phone / user_id / name search |
| `/api/quality` | GET | live-computed data-quality snapshot |
| `/api/metrics` | GET | Round 3 judge-compat metrics shape |
| `/api/duplicates/:user_id` | GET | scored duplicate candidates for one user |
| `/api/duplicates` | POST | Round 4 judge-compat duplicates shape (no-body fallback supported) |
| `/api/openapi.json` | GET | machine-readable API spec |
| `/api/docs` | GET | interactive Swagger UI (vendored swagger-ui-dist 5.x, compiled into the binary — fully self-hosted, no CDN, no external requests) |
| `/api/docs/assets/*` | GET | the Swagger UI css/js/favicon assets (same-origin) |

## Frontend — React / Vite / Tailwind v4 / shadcn

A monochrome (black/white, light+dark mode) operations console scoped to
what can be genuinely backed by live data within the challenge's "no
external API calls, no pre-computed results" constraint — not the full
aspirational feature list from the original design brief, which assumed
scope (an LLM-backed AI copilot, forecasting, a full admin/settings suite)
this challenge explicitly rules out. Built with:

- **React 19 + TypeScript + Vite 8**, **Tailwind CSS v4** (`@theme inline`,
  no separate config file), **shadcn/ui** ("Nova" preset: Lucide icons +
  Geist Sans).
- **TanStack Query** for server-state caching against the live API.
- **react-router-dom** for client-side routing.
- `.lottie` animations (`@lottiefiles/dotlottie-react`), forced monochrome
  via `grayscale dark:invert`, auto-discovered from `src/assets/animations`
  via `import.meta.glob` — new files dropped into that folder are picked up
  without code changes.

### Pages

`Overview`, `Search`, `Quality`, `Duplicates`, `System` (live Postgres/host
stats), `ApiAccess` (endpoint catalog with a live try-it explorer, curl and
fetch snippets, and a link to the Swagger docs), `Gallery` (renders every
shipped animation, auto-discovered), `Settings` (theme/appearance),
`NotFound`. Every page renders raw
database values as **plain text only** — no `dangerouslySetInnerHTML`
anywhere in the app, since search results can legitimately contain
HTML-like or script-like garbage strings from the source data (see
SECURITY.md).

Multi-stage Docker build: Node builder (`npm run build`) → `nginx:alpine`
runtime serving the static bundle, with the SPA fallback (`try_files ... 
/index.html`) handled by the same Nginx config that reverse-proxies `/api/*`
to the backend — one edge process for both the API and the web app.

The one exception to "no `dangerouslySetInnerHTML`" is the vendored
shadcn/ui `ChartStyle` helper (`components/ui/chart.tsx`), which injects a
`<style>` block built entirely from a developer-authored color `config`
object (chart series names → hex colors, fixed at compile time) — never
database or user-supplied content. No page-level component renders raw API
data through it.

## Deployment topology

- **Cloudflare**: DNS + edge proxy for `mit.creations.ren`, SSL mode
  Full-Strict (validates the origin's cert, not just encrypts), Origin CA
  certificate issued via the Cloudflare API (15-year validity, not
  self-signed). `security_level` and `browser_check` tuned down from
  defaults so the Round 5 load-test client (a non-browser HTTP client) isn't
  challenged/blocked by Cloudflare's bot heuristics.
- **Nginx**: terminates TLS using that Origin CA cert, sets
  `real_ip_header CF-Connecting-IP` with the full published Cloudflare IP
  range in `set_real_ip_from` (so backend logs and rate-limiting see real
  client IPs, not Cloudflare's edge IP), serves the frontend's static build,
  reverse-proxies `/api/*` and `/health` to `cip-backend:8080`, and sets
  standard security headers (HSTS, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- **docker-compose.yml**: three services (`postgres`, `backend`, `nginx`),
  health-checked and dependency-ordered (`backend` waits on Postgres
  healthy, `nginx` waits on backend healthy), one named volume for Postgres
  data, one bridge network.

## Why not a "Billion-Record" architecture

The dataset here is 22.4M rows (~6.4 GB on disk with indexes), comfortably
served by a single well-indexed Postgres instance on one VPS — the
challenge explicitly forbids an infrastructure upgrade for Round 5, and
nothing about the measured bottleneck (see PERFORMANCE.md — CPU-bound
query-execution contention under 100 concurrent connections doing
trigram/fuzzy work) would be solved by sharding, read replicas, or a
different database engine; it is a compute-capacity ceiling on a
fixed-size box, not a data-scale problem. Read replicas, connection
poolers (PgBouncer), or a columnar OLAP engine were all considered and
rejected as solving a different problem than the one actually measured.
