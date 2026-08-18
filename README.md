# Customer Intelligence Platform

A search / data-quality / duplicate-detection API and console over a
22.4M-row PostgreSQL dataset, built for a 4-hour coding challenge. Rust
(Axum + SQLx) backend, React (Vite + Tailwind v4 + shadcn/ui) frontend,
Postgres 16, deployed publicly behind Cloudflare + Nginx.

**Live:** https://mit.creations.ren
**API docs:** https://mit.creations.ren/api/docs

See ARCHITECTURE.md (system design), DATABASE_NOTES.md (schema, indexes,
the query-plan bug that mattered most), PERFORMANCE.md (real benchmark
numbers and the Round 5 diagnostic trail — nothing in it is invented),
and SECURITY.md (how injection/XSS/secrets/masking are handled).

## Quick start (local, from scratch)

Requires Docker + Docker Compose. No local Rust/Node toolchain needed —
both are built inside multi-stage Docker images.

```bash
git clone https://github.com/shirasakaren/lomba-koding-17-agustus.git && cd lomba-koding-17-agustus
cp .env.example .env        # fill in a real POSTGRES_PASSWORD
docker compose up -d --build
```

This starts three services: `cip-postgres` (Postgres 16, tuned config from
`db/postgresql.tuned.conf`, indexes applied from
`db/migrations/001_indexes.sql`), `cip-backend` (the Rust API on :8080,
internal to the compose network), and `cip-nginx` (serves the built React
frontend and reverse-proxies `/api/*` + `/health` to the backend, on
:80/:443).

### Loading the dataset

The anonymized dump isn't part of this repo (it's a multi-GB SQL file,
gitignored — see `.gitignore`). To load it:

```bash
scripts/import.sh /path/to/challenge_db_anonymized_v2.sql.gz
```

This temporarily relaxes durability settings (`fsync`, `synchronous_commit`,
`full_page_writes`, `autovacuum` all off) for the duration of the bulk
load only, streams the gzip dump directly into the running container
without ever materializing an uncompressed copy on disk, then restores the
production durability settings. Measured import time for the full
22.4M-row dataset: ~2.5 minutes.

### Verifying it's up

```bash
curl -s http://localhost/health | jq
curl -s "http://localhost/api/search?q=test&type=name&limit=5" | jq
curl -s http://localhost/api/quality | jq   # warms up on a background timer; see DATABASE_NOTES.md
```

## Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Round 1 judge-compat liveness |
| `/api/health` | GET | cheap liveness probe |
| `/api/search` | GET | `?q=&type=email\|phone\|user_id\|name&limit=&offset=` |
| `/api/quality` | GET | live-computed data-quality snapshot |
| `/api/metrics` | GET | Round 3 judge-compat metrics shape |
| `/api/duplicates/:user_id` | GET | `?threshold=0.5&limit=10` — scored duplicate candidates |
| `/api/duplicates` | POST | Round 4 judge-compat shape; accepts `{"user_id": N}` or no body |
| `/api/openapi.json` | GET | machine-readable spec |
| `/api/docs` | GET | human-readable API docs |

Full request/response shapes: `/api/openapi.json` or `/api/docs` on the
live deployment.

## Load testing

```bash
k6 run -e BASE_URL=https://mit.creations.ren scripts/loadtest.js
```

Runs the exact Round 5 profile: 60s, 100 concurrent VUs, 40% email / 30%
phone / 20% name / 10% duplicates. See PERFORMANCE.md for the last measured
result and the full diagnostic story behind it.

## Repository layout

```
backend/     Rust/Axum API — see backend/src/ for module layout (ARCHITECTURE.md)
frontend/    React/Vite console
db/          Postgres tuning configs, extensions, index migrations
nginx/       reverse-proxy config + Cloudflare Origin CA cert
scripts/     import.sh, loadtest.js, bench SQL
docker-compose.yml
```

## Configuration reference

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — (required) | Postgres connection string |
| `HTTP_PORT` | `8080` | backend listen port (internal) |
| `DB_POOL_MIN` / `DB_POOL_MAX` | `20` / `50` | main request-serving pool size |
| `TOTAL_RECORDS_COMPAT` | `14999896` | `/health`'s warm-up fallback record count (the known true count) — see DATABASE_NOTES.md |
| `QUALITY_REFRESH_SECS` | `1800` | background quality-snapshot refresh cadence — see PERFORMANCE.md |
| `RUST_LOG` | `info` | tracing verbosity |

## Known limitations

Round 5's avg/p99 latency targets (< 1000ms avg, < 2000ms p99 under 100
concurrent VUs) are not met on this hardware — measured avg ≈1.9s, p99
≈3.8s. Success rate (>95%) and zero-crash/under-5s targets are met. The
full diagnostic trail — what was tried, what was ruled out, and what the
actual root cause turned out to be — is in PERFORMANCE.md; nothing there is
guessed or fabricated.
