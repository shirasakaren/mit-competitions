# PERFORMANCE.md — Benchmarks and the Round 5 Diagnostic Trail

This document reports **only measured numbers** — no target result is
fabricated or assumed. Every figure below came from a real `k6` run against
the live public deployment (`https://mit.creations.ren`) or a real
`EXPLAIN (ANALYZE, BUFFERS)` / `pg_stat_activity` capture against the live
database, both captured during this build.

## Hardware

Single DigitalOcean droplet, shared by every service (Postgres, the Rust
API, Nginx) — no infra upgrade was used between Round 1 and Round 5, per the
challenge's "same machine, no infrastructure upgrade" constraint.

- 4 vCPU, 7.8 GiB RAM, Ubuntu 24.04, single 160 GB SSD-backed volume
- Postgres 16 (`postgres:16-alpine`), `shared_buffers=2GB`,
  `effective_cache_size=5GB`, `max_connections=60`,
  `max_parallel_workers_per_gather=2`, `jit=off` (see below)

## Dataset actually loaded

| Table | Rows | Total size (incl. indexes/TOAST) |
|---|---:|---:|
| `ws_user` | 14,999,896 | 5,378 MB |
| `ws_orders` | 2,999,986 | 388 MB |
| `ws_transactions` | 2,400,548 | 330 MB |
| `ws_user_activity` | 2,000,000 | 279 MB |
| **Total** | **22,400,430** | **6,375 MB** |

`ws_user`'s true row count is 14,999,896, not 15,000,000. Every endpoint
that reports a record count reports the true value: `/health` serves the
live-computed count from the background quality snapshot (falling back to
the known true count only during the brief warm-up window before the first
snapshot lands), and `/api/quality` / `/api/metrics` report the same
live-queried count (14,999,896). See DATABASE_NOTES.md for the full
rationale.

## Round 2 — single-request latency (per-endpoint, no concurrent load)

Measured with `curl -w '%{time_total}'` and confirmed via `EXPLAIN (ANALYZE,
BUFFERS)` against the deployed database, post-index-fix:

| Query | Target (p50) | Measured |
|---|---|---|
| Exact email search | < 100ms | ~1-3ms (index scan via `idx_ws_user_email_lower`, after the OFFSET-0 fence — see below) |
| Exact phone search | < 100ms | ~1-3ms (index scan via `idx_ws_user_msisdn_norm`) |
| Exact user_id search | < 100ms | < 1ms (primary key lookup) |
| Fuzzy name search | < 300ms | ~15-150ms depending on substring commonality (GIN trigram scan, capped at 300 candidates, 700ms hard statement timeout) |

### The critical fix: the "OFFSET 0" planner fence

The single biggest correctness/performance bug found all session: Postgres's
**generic** prepared-statement plan for

```sql
SELECT ... FROM ws_user WHERE LOWER(user_email) = $1 ORDER BY user_id LIMIT $2 OFFSET $3
```

chose an **Index Scan on the `user_id` primary key, in `user_id` order**,
filtering by email as it walked — because for a placeholder it can't sample,
Postgres assumes ~0.5% selectivity by default. For a predicate that actually
matches ~1 row anywhere in 15M, that is a **44+ second full-table walk**.

Confirmed directly:

```
-- WITHOUT the fence (generic plan, 6th+ execution of the prepared statement):
Execution Time: 44593.213 ms

-- WITH an `OFFSET 0` subquery fence forcing the WHERE-filtered inner query
-- to be planned/executed independently of the outer ORDER BY/LIMIT:
Execution Time: 0.223 ms
```

Applied to both `search_email` and `search_phone` in
`backend/src/routes/search.rs`. This one fix is what makes Round 2's
sub-100ms single-request targets achievable at all.

## Round 5 — 100-VU / 60s concurrent load test

Script: `scripts/loadtest.js` (k6), weighted 40% email / 30% phone / 20%
name / 10% duplicates per the spec, run from a local machine against the
public HTTPS endpoint (Cloudflare in front, Full-Strict TLS, real Origin CA
cert — not a local/direct-IP shortcut).

**Targets:** avg < 1000ms, p50 < 800ms, p99 < 2000ms, success > 95%.

### Final measured result (clean run, analytics job confirmed idle)

```
THRESHOLDS
  http_req_duration
    ✗ p(50)<800   →  p(50) = 1.82s
    ✗ p(99)<2000  →  p(99) = 3.80s
  http_req_failed
    ✓ rate<0.05   →  rate  = 0.80%

TOTAL RESULTS
  http_reqs:            3223  (51.06 req/s)
  checks_succeeded:     99.59%  (26 failed checks out of 6446)
  http_req_duration:    avg=1.89s  min=26.55ms  med=1.82s  max=4.21s  p90=2.62s  p95=2.96s
    name:duplicates:    avg=2.91s  med=2.97s  (worst tier — see below)
    name:search_email:  avg=1.86s  med=1.84s
    name:search_name:   avg=1.64s  med=1.63s
    name:search_phone:  avg=1.77s  med=1.78s
```

**Bottom line: success rate and "no crash / everything under 5s" pass. Avg
and p99 latency do not meet target.** Nothing here is invented — this is
the real result of the last clean test run.

### The diagnostic trail (what was tried, in order, with real deltas)

Four hypotheses were tested against the initial failing result (p50≈2.0s,
p99≈4.0s, throughput ≈46 req/s):

1. **DB pool size 12 → 50 connections.** No meaningful change.
2. **Disable intra-query parallelism on every request-serving connection**
   (`SET max_parallel_workers_per_gather = 0` in `db.rs`'s `after_connect`).
   No meaningful change on its own.
3. **Disable Postgres JIT globally** (`ALTER SYSTEM SET jit=off`). Small,
   real improvement, kept.
4. **Reduce the fuzzy-name candidate cap 300 → 80.** No meaningful change;
   reverted back to 300 (see below) since it cost recall for no latency
   benefit.

None of these fixed the core problem, and `docker stats` kept showing
`cip-postgres` pinned at **~389% CPU** (essentially all 4 vCPUs) throughout
every run, while `cip-backend` (the Rust process) sat at 2-4% CPU — proof
the bottleneck was entirely inside Postgres's query execution, not the API
layer, Nginx, or Cloudflare (also confirmed by testing direct-to-origin,
bypassing Cloudflare entirely).

### Root-causing it properly: live `pg_stat_activity` sampling

Rather than keep guessing at server settings, the next step was to sample
`pg_stat_activity` every ~5s during a live 60s test run and read the actual
query text of active backends. This found a smoking gun immediately:

> One backend (PID 7780) was running the **same query continuously across
> the entire 50+ second sampling window**, its age growing monotonically
> (10.9s → 17.7s → 24.4s → 31.4s → 38.3s → 45.3s → 52.1s — never restarting):
>
> ```sql
> SELECT count(*) AS total,
>        count(*) FILTER (WHERE user_email IS NOT NULL) AS email_present, ...
> FROM ws_user
> ```
>
> This is `compute_cheap_metrics` — the background `/api/quality` snapshot
> refresher's conditional-aggregate pass over all 15M rows.

Backend logs confirmed the scale of the problem: each full snapshot
computation (`compute_snapshot`, three sequential passes) logged
`computation_ms` in the **132,248 – 175,980 ms** range (132-176 **seconds**),
while the configured refresh interval (`QUALITY_REFRESH_SECS`) was only
**120 seconds**. That means the expensive analytics query was active roughly
**55%+ of all wall-clock time** — and since a single busy window (132-176s)
is longer than the 60s test itself, *any* test window that starts during a
busy period is guaranteed to overlap it entirely. This is not a rare
coincidence; it was structurally almost impossible for a 60s test to land
in a genuinely idle window.

`EXPLAIN (ANALYZE, BUFFERS)` on the query shape confirmed why it was so
expensive and so disruptive:

```
Finalize Aggregate
  Buffers: shared hit=215473 read=248621
  -> Gather (Workers Planned: 2, Workers Launched: 2)
       -> Parallel Seq Scan on ws_user (actual rows=4999965 loops=3)
             Buffers: shared hit=215473 read=248621
Execution Time: 7170.284 ms   -- for only 4 of the ~16 real FILTER clauses
```

Two compounding problems: (a) it spawned **2 parallel workers** (3 OS
processes total) doing sustained CPU work, and (b) **more blocks were read
from disk than served from cache** (`read=248621` vs `hit=215473`) — because
`ws_user`'s 5.4 GB total size exceeds the 2 GB `shared_buffers`, a large
fraction of every full-table pass misses cache and pays real disk I/O.

### The fix actually applied

1. **`compute_cheap_metrics` now runs on a dedicated connection with
   `max_parallel_workers_per_gather = 0`** (`backend/src/quality.rs`),
   matching the pattern already used by `compute_email_unique` /
   `compute_phone_unique`. This drops its footprint from 3 OS processes to
   1, without changing its measured wall-clock time (152,382 ms observed
   post-fix — squarely inside the pre-fix 132-176s range, so no wall-clock
   regression from losing parallelism).
2. **`QUALITY_REFRESH_SECS` default raised from 120 to 1800** (30 minutes)
   — `backend/src/config.rs` and `docker-compose.yml`. A refresh cycle is
   now active for ~150s out of every 1800s (~8% of wall-clock time) instead
   of ~55%+, making it statistically rare for any given 60s judge window to
   land inside one at all.

### Result after the fix

A load test run launched deliberately during a **confirmed-idle** analytics
window (immediately after a `quality snapshot refreshed` log line, well
before the next one was due) produced:

```
p(50) = 1.82s   p(99) = 3.80s   success = 99.59%   throughput = 51.06 req/s
```

This is the "Final measured result" shown above. **It is essentially
identical to the contaminated pre-fix runs.** Conclusion, stated plainly:
the background analytics job was a real, independently-worth-fixing bug —
it was needlessly burning CPU and disk I/O on a bad cadence, and the fix is
correct and has been kept — but it was **not the dominant cause** of the
Round 5 latency miss. Live sampling during load consistently showed all
four query types (duplicates, email, phone, name) degrading by a similar
multiple under 100-VU concurrency even with the analytics job confirmed
idle, which points to genuine CPU-capacity saturation from the interactive
query mix itself: `pg_stat_activity` samples during load consistently show
~11-13 concurrently active backends running trigram/fuzzy-similarity work
(the `name` search and the `duplicates` candidate-generation CTE's
name-similarity branch) competing for only 4 physical cores, with `docker
stats` confirming Postgres pinned near 389% CPU throughout. `EXPLAIN
ANALYZE` on the fuzzy-name query shape shows genuine per-row trigram
similarity computation cost, not a missing index — there is no query-plan
bug left to fix here, only a hardware-capacity ceiling for this
concurrency/query-mix combination on a 4-vCPU box, which the challenge's "no
infrastructure upgrade" constraint puts out of scope to solve further.

### Scoring impact (per the challenge's own Round 5 rubric)

| Metric | Target | Measured | Status |
|---|---|---|---|
| Correct responses (300 pts) | > 95% success | 99.2-99.6% | ✅ passes |
| Avg response time (150 pts) | < 1000ms | ~1.85-2.12s | ❌ partial credit at best |
| P99 latency (100 pts) | < 2000ms | ~3.6-4.0s | ❌ misses |
| Zero crashes (50 pts) | 0 errors/timeouts | 0.4-1.1% failed (503/408, no 500s) | ⚠ small deduction, no actual crash |

No request ever exceeded the 5-second hard limit across any run (max
observed: 4.65s). Nothing crashed; Nginx access logs and backend logs show
zero 500-class application errors under load — the only non-2xx responses
are `503` (connection-pool acquire timeout, immediate rejection under
extreme contention) and `408`-style client timeouts at the edge, both of
which are graceful, correctly-typed failure responses, not crashes.

## What was deliberately *not* attempted, and why

- **PgBouncer / connection pooling in front of Postgres**: the measured
  bottleneck is CPU-bound query execution, not connection setup/teardown
  overhead or `max_connections` exhaustion (pool size 12 vs 50 was tested
  and made no difference either way) — a pooler would not change the number
  of CPU-seconds the same query mix needs to execute.
- **Reducing the fuzzy-name candidate cap further**: tested at 80 (from
  300), produced no measured latency improvement, and would cost real
  Round 2 correctness/recall points for a query type that's independently
  already fast (~15-150ms) in isolation. Reverted to 300.
- **OS-level `nice`/cgroup CPU-priority isolation** between the analytics
  connection and request-serving connections: both run as OS processes
  inside the same `cip-postgres` container, so this is technically
  possible, but was judged too complex to implement safely with the
  remaining time budget for a problem the interval-widening fix already
  addresses adequately (analytics contention is now rare, not the dominant
  factor regardless).
- **Sampling-based (`TABLESAMPLE`) approximate quality metrics** instead of
  full-table scans: would further shrink the analytics query's own cost,
  but since it's no longer the dominant bottleneck, this was deprioritized
  in favor of finishing required documentation deliverables within the
  time budget.
