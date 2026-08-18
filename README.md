<div align="center">
  <img src="media/optimized/header.webp" alt="Customer Intelligence Platform" width="100%" style="max-width:1000px">
</div>

<div align="center">

# Customer Intelligence Platform

**Search, quality analytics, and duplicate detection over 22.4 million customer records. Everything computed live from PostgreSQL, nothing pre-canned.**

<p>
  <a href="https://mit.creations.ren"><img src="https://img.shields.io/badge/live-mit.creations.ren-5cb85c?style=flat-square" alt="live site"></a>
  <a href="https://mit.creations.ren/api/docs"><img src="https://img.shields.io/badge/docs-swagger_ui-87CEEB?style=flat-square" alt="swagger"></a>
</p>
<p>
  <img src="https://img.shields.io/badge/backend-rust_%2F_axum-111111?style=flat-square&logo=rust" alt="rust">
  <img src="https://img.shields.io/badge/frontend-react_19_%2F_vite-111111?style=flat-square&logo=react" alt="react">
  <img src="https://img.shields.io/badge/database-postgresql_16-111111?style=flat-square&logo=postgresql" alt="postgres">
  <img src="https://img.shields.io/badge/records-22.4M-111111?style=flat-square" alt="records">
  <img src="https://img.shields.io/badge/uptime-public_HTTPS-111111?style=flat-square" alt="https">
</p>

Built for a 4 hour coding challenge. A monochrome operations console and a Rust API on a single 4 core VPS, keeping a 15M row customer table searchable in single digit milliseconds.

</div>

---

## What it does

It answers three questions about a customer database, fast:

| Question | Answer |
|---|---|
| Who is this customer? | Exact email, exact phone, exact user ID, or fuzzy name search in under 100 ms on 15M rows |
| How clean is the data? | Completeness, validity, and issue analytics computed live off PostgreSQL |
| Who is the same person twice? | Scored duplicate detection using `email x 0.4 + phone x 0.4 + name x 0.2` |

No external APIs, no mock fixtures, no pre-computed results. Every number you see came out of the database, either per request or on a background refresh cycle.

## Preview

<p align="center"><i>The dashboard you get when you open the site.</i></p>

<p align="center">
  <img src="media/optimized/overview-dashboard.webp" alt="Overview dashboard" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
</p>

<p align="center">
  <img src="media/optimized/search.webp" alt="Search page" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>Search. Four modes, pagination, sortable columns, live timings.</i>
</p>

<p align="center">
  <img src="media/optimized/quality-overview.webp" alt="Data quality page" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>Data quality. Per field completeness and charts over 15M rows.</i>
</p>

<p align="center">
  <img src="media/optimized/analytics.webp" alt="Analytics page" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>Analytics. Growth since 2009, demographics, revenue, top spenders.</i>
</p>

<p align="center">
  <img src="media/optimized/activity.webp" alt="Activity heatmap" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>Activity. A day x hour heatmap of 2M events. Darker means busier.</i>
</p>

<p align="center">
  <img src="media/optimized/duplicates.webp" alt="Duplicate detection" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>Duplicates. Scored candidates with match reasons and confidence bands.</i>
</p>

<p align="center">
  <img src="media/optimized/system-status.webp" alt="System page" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>System. API and database health, plus a live endpoint explorer.</i>
</p>

<p align="center">
  <img src="media/optimized/api-access.webp" alt="API access page" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>API access. Copy paste curl and fetch snippets for every endpoint.</i>
</p>

<p align="center">
  <img src="media/optimized/settings.webp" alt="Settings page" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>Settings. Light and dark mode, plus the animation gallery.</i>
</p>

<p align="center">
  <img src="media/optimized/quality-fields.webp" alt="Quality detail" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>Quality detail. Unique, duplicate, and malformed counts per field.</i>
</p>

<p align="center">
  <img src="media/optimized/quality-issues.webp" alt="Data issues" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>Data issues. Status distribution and every flagged problem.</i>
</p>

<p align="center">
  <img src="media/optimized/system-explorer.webp" alt="API explorer" width="100%" style="max-width:920px;border:1px solid #30363d;border-radius:12px">
  <br><i>API explorer. Fire any endpoint and read the raw response.</i>
</p>

<p align="center"><img src="media/gifs/light.gif" alt="light" width="140"></p>

## Watch it in action

<p align="center"><i>A 60 second tour of the console.</i></p>

<div align="center">
  <video src="media/optimized/demo.mp4" controls width="100%" style="max-width:880px;border-radius:12px;border:1px solid #30363d"></video>
</div>

## How it works

<p align="center">
  <img src="media/architecture.png" alt="System architecture" width="95%" style="max-width:920px">
</p>

```text
Cloudflare (Full Strict TLS) -> Nginx -> React SPA (static bundle)
                                     -> Rust/Axum API -> Postgres (request pool)
                                                      -> Postgres (isolated analytics pool)
```

- **Rust + Axum + SQLx.** Compiled, async, no garbage collector. Every query parameterized, indexed lookups in single digit milliseconds.
- **PostgreSQL 16.** 22.4M rows. A generated and indexed normalized phone column, btree indexes for exact matches, a GIN trigram index for fuzzy names.
- **Background analytics.** Expensive full table metrics run on an isolated pool and get served from a live snapshot cache in under 1 ms.
- **React 19 + Tailwind v4 + shadcn/ui.** Monochrome console with light and dark mode, animated with a self discovered `.lottie` catalog.

The diagram source is in [`media/architecture.puml`](media/architecture.puml) if you want to edit it.

## The API

| Route | Method | Purpose |
|---|---|---|
| `/health` | `GET` | Liveness plus the true record count |
| `/api/health` | `GET` | Cheapest possible probe, never touches the DB |
| `/api/search` | `GET` | `?q=&type=email\|phone\|user_id\|name&limit=&offset=` |
| `/api/quality` | `GET` | Live data quality snapshot |
| `/api/metrics` | `GET` | Judge shape metrics: duplicates, missing fields, quality score |
| `/api/analytics` | `GET` | Growth, demographics, revenue, top spenders, activity heatmap |
| `/api/duplicates/:user_id` | `GET` | Scored duplicate candidates with `?threshold=&limit=` |
| `/api/duplicates` | `POST` | Compatibility shape, scoped lookup or bounded sample |
| `/api/openapi.json` | `GET` | Machine readable spec |
| `/api/docs` | `GET` | Interactive Swagger UI, fully self hosted |

```bash
curl -s https://mit.creations.ren/health
curl -s "https://mit.creations.ren/api/search?q=customer&type=name&limit=5"
curl -s "https://mit.creations.ren/api/duplicates/21003474?threshold=0.5"
```

## Performance, measured

<p align="center"><img src="media/gifs/rock-shooter.gif" alt="load test" width="140"></p>

| Round | Target | Result |
|---|---|---|
| Email / phone / user ID search | under 100 ms | 1 to 3 ms |
| Fuzzy name search | under 300 ms | 15 to 150 ms, 61 ms for common substrings |
| Load test success rate | over 95 % | 99.2 to 99.6 % :white_check_mark: |
| Load test crashes | zero | zero, nothing crossed the 5 s hard limit :white_check_mark: |
| Load test avg / p99 latency | under 1000 / 2000 ms | about 1.9 s / 3.8 s :x: four core CPU saturation |

The p99 miss is the honest part. The whole story is in [PERFORMANCE.md](PERFORMANCE.md): a 44 second query plan bug fixed to 0.2 ms, a background job CPU bug found by sampling `pg_stat_activity` during a live test, and every number behind this table.

<p align="center"><img src="media/gifs/cry.gif" alt="p99" width="140"></p>

## Quick start

```bash
git clone https://github.com/shirasakaren/mit-competitions.git && cd mit-competitions
cp .env.example .env        # set a real POSTGRES_PASSWORD
docker compose up -d --build
scripts/import.sh /path/to/challenge_db_anonymized_v2.sql.gz   # one time dataset load, about 2.5 min
```

Three containers come up: Postgres 16 with the tuned config and indexes, the Rust API, and Nginx serving the console and API together. Check it works:

```bash
curl -s http://localhost/health | jq
scripts/api_check.sh        # 22 end to end checks
```

<p align="center"><img src="media/gifs/kawaii.gif" alt="welcome" width="140"></p>

<p align="center"><i>Welcome aboard.</i></p>

## Docs

| Doc | Covers |
|---|---|
| [DATABASE_NOTES.md](DATABASE_NOTES.md) | Schema, indexes, generated phone column, trigram tuning, duplicate detection |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, module layout, deployment topology |
| [PERFORMANCE.md](PERFORMANCE.md) | Real benchmark numbers and the Round 5 diagnostic trail |
| [SECURITY.md](SECURITY.md) | SQL injection, XSS, masking, secrets, transport security |

<div align="center">

---

**Live:** [mit.creations.ren](https://mit.creations.ren) · **Docs:** [Swagger UI](https://mit.creations.ren/api/docs) · **Load test:** `k6 run -e BASE_URL=https://mit.creations.ren scripts/loadtest.js`

<sub>Rust + Postgres + React. 22,400,430 records, one VPS.</sub>

</div>
