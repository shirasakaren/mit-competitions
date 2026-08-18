# 45 Million Customer Records — Challenge

**17 Agustus Coding Festival**  
**Duration:** 4 hours (10:00 - 14:00 Jakarta Time)  
**Difficulty:** Hard  
**AI Tools:** ALLOWED

**🚀 Database sudah ada di VPS Anda:**  
File: `/app/data/challenge_db_anonymized_v2.sql.gz` (1.9GB)  
Extract & import ke PostgreSQL dengan docker-compose

---

## Overview

You have **15 million customer records** (3.8 GB PostgreSQL dump).

**Build a working Customer Intelligence Platform** in 4 hours (10:00 - 14:00 Jakarta Time).

Stack, database, language: **your choice.**

---

## ⚠️ REQUIRED API ENDPOINTS (WAJIB)

Sistem otomatis akan test endpoint ini. **Pastikan path, method, params EXACT sesuai:**

| Round | Endpoint | Method | Required Params | Status Code |
|-------|----------|--------|-----------------|------------|
| **Round 2** | `/api/search` | GET | `q`, `type`, `limit`, `offset` | 200 |
| **Round 3** | `/api/metrics` | GET | — | 200 |
| **Round 4** | `/api/duplicates` | POST | — | 200 |
| **Round 5** | `/api/health` | GET | — | 200 |

**Test akan hit:**
```
Round 2: GET /api/search?q=customer&type=name&limit=10&offset=0
Round 3: GET /api/metrics
Round 4: POST /api/duplicates
Round 5: GET /api/health
```

**Response harus include (minimum):**
```json
// Round 2: /api/search (sesuai spec di Round 2 section)
{ "query": "customer", "type": "name", "results": [...], "total": 123, "took_ms": 87 }

// Round 3: /api/metrics
{ "duplicates": 1500, "missing_fields": 2000, "quality_score": 85.5 }

// Round 4: /api/duplicates (POST)
{ "duplicates": [{id1: 123, id2: 456, similarity: 0.95}], "count": 1500 }

// Round 5: /api/health
{ "ok": true, "status": "running" }
```

---

## Dataset

**Core Tables:**

### 1. ws_user (15M records)
```
user_id           bigint PRIMARY KEY
user_name         varchar(128)
full_name         varchar(128)
user_email        varchar(512)
msisdn            varchar(20)
sex               smallint (0, 1, 2)
birth_date        date
status            smallint (-1, 0, 1)
location          text
occupation        varchar(128)
hobbies           text (with emoji, special chars, NULLs)
about_me          varchar(512)
create_time       timestamp
update_time       timestamp
last_login        timestamp
... (25+ columns)
```

### 2. ws_orders (3M records)
```
order_id          bigserial PRIMARY KEY
user_id           bigint FK → ws_user
order_date        timestamp
order_amount      numeric
order_status      smallint
payment_method    varchar(50)
```

### 3. ws_transactions (2.4M records)
```
transaction_id    bigserial PRIMARY KEY
order_id          bigint FK → ws_orders
transaction_date  timestamp
transaction_amount numeric
transaction_type  varchar(50)
status            varchar(50)
```

### 4. ws_user_activity (2M records)
```
activity_id       bigserial PRIMARY KEY
user_id           bigint FK → ws_user
activity_type     varchar(100)
activity_timestamp timestamp
ip_address        varchar(45)
```

**Total:** ~22.4M records across 4 tables (15M users + relational data)  

**Real Data Characteristics (ws_user):**
- Missing emails (~8%)
- Missing phones (~40%)
- Duplicate emails (~2%)
- Duplicate phones (~5%)
- Special characters & emoji in hobbies field
- Very long text in about_me field
- SQL injection-like strings in location field

**Relational Data Challenges:**

1. **Complex JOINs required (ws_orders, ws_transactions):**
   - users → orders → transactions hierarchy
   - Aggregation queries (SUM, COUNT, GROUP BY)
   - Timestamp-based filtering across 3+ tables
   - *Difficulty:* Round 2 search must handle cross-table queries

2. **High cardinality data (ws_user_activity):**
   - 2M activity logs (avg 0.13 per user)
   - Timestamp filtering (last 90 days)
   - Activity type grouping (LOGIN, LOGOUT, PURCHASE, BROWSE)
   - *Difficulty:* Round 3 quality metrics must analyze activity patterns

3. **Edge case handling:**
   - ~1.5M users with NULL hobbies (1% of data)
   - ~150k users with duplicate emails
   - ~15k users with dangerous strings in location
   - *Difficulty:* Input validation + safe SQL escaping required

---

## Round 1: Import (10:00 — 10:20)

**Goal:** Load 15M customer records into database and verify with health check.

**Requirement:**

```http
GET /health
```

Response (must include ALL fields):

```json
{
  "status": "ready",
  "total_records": 15000000,
  "database": "connected",
  "timestamp": "2026-08-17T10:30:45Z"
}
```

**Acceptance Criteria:**
- ✅ HTTP Status: 200 OK
- ✅ Content-Type: application/json
- ✅ `status` field = "ready" (exact string)
- ✅ `total_records` = 15000000 (exact integer)
- ✅ `database` = "connected" (exact string)
- ✅ `timestamp` = valid ISO 8601 format
- ✅ Response time < 500ms
- ✅ All 4 tables created (ws_user, ws_orders, ws_transactions, ws_user_activity)

**Scoring:**

| Criteria | Points | Details |
|----------|--------|---------|
| Database fully imported | 100 | All 15M+ records in DB |
| Health endpoint working | 75 | Returns valid JSON with all fields |
| Correct record count | 25 | total_records exactly 15000000 |
| **BASE TOTAL** | **200** | |
| **EARLY BONUS** | **+100** | First 5 teams to complete |

**Scoring Examples:**
- Team A: Imports correctly at 0:30 → 200 + 100 = **300 pts**
- Team B: Imports correctly at 0:35 → 200 + 100 = **300 pts** (still top 5)
- Team C: Imports correctly at 0:40 → 200 pts (no bonus)
- Team D: Imports but health endpoint broken → 100 + 75 = **175 pts**


---

## Round 2: Search Engine (10:20 — 10:50)

**Goal:** Build high-performance search across 15M records. Handle exact + fuzzy matching.

**API Requirement:**

```http
GET /api/search?q=<query>&type=<search_type>&limit=10&offset=0
```

**Search Types & Performance Targets:**

| Type | Example | Performance | Response |
|------|---------|-------------|----------|
| **email** | user@example.com | < 100ms | Exact match only |
| **phone** | 081234567890 | < 100ms | Exact match only |
| **user_id** | 1234567 | < 50ms | Exact match only |
| **name** | komang pipit | < 300ms | Fuzzy/partial match |

**Response Format (EXACT):**

```json
{
  "query": "komang pipit",
  "type": "name",
  "limit": 10,
  "offset": 0,
  "results": [
    {
      "user_id": 1234567,
      "full_name": "Komang Pipit",
      "user_email": "komang@email.com",
      "msisdn": "081234567890",
      "status": 1,
      "created_at": "2020-05-15T10:30:00Z"
    }
  ],
  "total": 1,
  "took_ms": 87
}
```

**Acceptance Criteria:**

✅ **Correctness:**
- Email search returns exact matches only
- Phone search returns exact matches only
- user_id search returns exact single match or empty
- Name search supports partial/fuzzy matching (substring, Levenshtein, etc.)
- Results correctly masked (no raw phone numbers in response)
- Pagination works (limit, offset respected)
- No duplicate results

✅ **Performance:**
- Email/phone/user_id: **< 100ms** (p50)
- Name search: **< 300ms** (p50)
- P99 latency: name search < 500ms
- Handles 100+ concurrent requests without degradation

✅ **UI/UX:**
- Search box with type dropdown
- Results table (paginated, sortable)
- Real-time response time display
- Loading state during search
- Error handling (no results, malformed input)
- Mobile responsive
- No console.log or debug output

**Scoring:**

| Criteria | Points | Details |
|----------|--------|---------|
| **Correctness** | 300 | All search types work, accurate results |
| **Performance** | 200 | Meets response time targets (p50) |
| **UI/UX Quality** | 100 | Polished, responsive, professional |
| **TOTAL** | **600** | |

**Scoring Breakdown:**

Correctness (300):
- Email search works + accurate: 75
- Phone search works + accurate: 75
- Name search works + fuzzy: 75
- Pagination + masking correct: 75

Performance (200):
- Email/phone/user_id < 100ms: 100
- Name search < 300ms: 100

UI/UX (100):
- Professional UI: 40
- Responsive design: 30
- Error handling: 30

**Edge Cases to Handle:**
- Empty query string
- SQL injection attempts in query
- Very large result sets (pagination)
- Special characters in names (emoji, accents)
- Missing/NULL values in email/phone
- Duplicate emails or phones (should return all)


---

## Round 3: Data Quality Dashboard (10:50 — 12:00)

**Goal:** Analyze data quality metrics across 15M records. Detect & categorize data issues.

**API Requirement:**

```http
GET /api/quality
```

**Response Format (EXACT):**

```json
{
  "total_records": 14999896,
  "analyzed_at": "2026-08-17T10:30:45Z",
  "quality_metrics": {
    "email": {
      "total": 14999896,
      "present": 13799896,
      "missing_count": 1200000,
      "missing_percent": 8.0,
      "unique": 13500000,
      "duplicate_count": 299896,
      "invalid_format": 15000
    },
    "phone": {
      "total": 14999896,
      "present": 8999896,
      "missing_count": 6000000,
      "missing_percent": 40.0,
      "unique": 8500000,
      "duplicate_count": 499896,
      "malformed": 8000
    },
    "birth_date": {
      "total": 14999896,
      "present": 13999896,
      "missing_count": 1000000,
      "missing_percent": 6.7,
      "invalid_dates": 25000,
      "impossible_dates": 3000,
      "future_dates": 500
    },
    "hobbies": {
      "total": 14999896,
      "null_count": 1500000,
      "null_percent": 10.0,
      "with_special_chars": 299640,
      "with_emoji": 299640
    },
    "status": {
      "total": 14999896,
      "distribution": {
        "-1": 150000,
        "0": 7200000,
        "1": 7649896
      }
    }
  },
  "data_issues": [
    {
      "field": "email",
      "issue_type": "invalid_format",
      "count": 15000,
      "examples": ["test@test", "@gmail.com", "test@@test.com"],
      "severity": "medium"
    },
    {
      "field": "phone",
      "issue_type": "malformed",
      "count": 8000,
      "examples": ["123", "+62", "abc123"],
      "severity": "high"
    }
  ]
}
```

**Acceptance Criteria:**

✅ **Correctness:**
- All 5 main fields analyzed (email, phone, birth_date, hobbies, status)
- Counts match actual data
- Percentages calculated correctly (missing_count / total * 100)
- Duplicate detection accurate (case-insensitive for emails)
- Invalid format detection (regex validation)
- Distribution for status field includes all values

✅ **Data Issues Detection:**
- Identifies invalid email formats (missing @, double @@, etc.)
- Identifies malformed phones (too short, invalid chars)
- Identifies impossible dates (9999-12-31, 0001-01-01, future dates)
- Detects special characters & emoji in text fields
- Categorizes by severity (low, medium, high)

✅ **UI/UX:**
- Dashboard cards for each metric
- Percentage gauges/progress bars
- Data completeness visualization
- Table of top 10 issues
- Response time display
- Mobile responsive
- Real-time calculation (not cached)

**Scoring:**

| Criteria | Points | Details |
|----------|--------|---------|
| **Accuracy** | 150 | Metrics calculated correctly, counts match |
| **Issue Detection** | 50 | Identifies & categorizes data problems |
| **UI/UX** | 50 | Professional dashboard, visualizations |
| **TOTAL** | **250** | |

**Scoring Breakdown:**

Accuracy (150):
- Email metrics: 30
- Phone metrics: 30
- Birth date metrics: 30
- Hobbies/status metrics: 30
- Percentages calculated correctly: 30

Issue Detection (50):
- Identifies 3+ types of data issues: 25
- Severity categorization: 25

UI/UX (50):
- Clean dashboard layout: 20
- Visualizations (charts/gauges): 20
- Responsive design: 10

**Expected Metrics (Reference):**

- Total records: 14,999,896
- Email missing: ~1.2M (8%)
- Phone missing: ~6M (40%)
- Birth date invalid: ~28K
- Hobbies with NULL: ~1.5M (10%)
- Email duplicates: ~299K
- Phone duplicates: ~499K


---

## Round 4: Duplicate Detection (12:00 — 13:20)

**Goal:** Find potential duplicate accounts using similarity matching.

**Data Characteristics:**
- ~300k+ duplicate email addresses
- ~500k+ duplicate phone numbers
- Accounts with matching birth_date + location
- Typo'd names (Levenshtein distance < 3)

**Endpoint Requirement:**

```http
GET /api/duplicates/<user_id>?threshold=0.7&limit=10
```

**Response Format (EXACT):**

```json
{
  "user_id": 1234567,
  "user_email": "budi@email.com",
  "user_phone": "081234567890",
  "full_name": "Budi Santoso",
  "possible_duplicates": [
    {
      "user_id": 7654321,
      "user_email": "budi2@email.com",
      "user_phone": "081234567890",
      "full_name": "Budi Santo",
      "similarity_score": 0.94,
      "match_reasons": ["phone_exact_match", "name_similarity_0.92"],
      "confidence": "high"
    },
    {
      "user_id": 7654322,
      "user_email": "budi@email.com",
      "user_phone": "082345678901",
      "full_name": "Budi Santosa",
      "similarity_score": 0.87,
      "match_reasons": ["email_exact_match", "name_similarity_0.89"],
      "confidence": "high"
    }
  ],
  "total_possible_duplicates": 2
}
```

**Acceptance Criteria:**

✅ **Algorithm Accuracy:**
- Detects exact phone matches (case-insensitive, normalized)
- Detects exact email matches (case-insensitive)
- Implements name similarity (Levenshtein/Jaro-Winkler distance)
- Calculates overall similarity_score (0-1 range)
- Confidence levels based on match types

✅ **Performance:**
- Response time < 2 seconds per query
- Handles concurrent duplicate lookups
- Efficient querying (not full table scan)

✅ **Correctness:**
- No false positives (wrong matches)
- Catches actual duplicates
- Confidence scores reflect accuracy
- Results ordered by similarity_score (descending)

**Scoring:**

| Criteria | Points | Details |
|----------|--------|---------|
| **Accuracy** | 150 | Correctly identifies duplicates |
| **Recall** | 75 | Finds most of the actual duplicates |
| **Precision** | 75 | Avoids false positives |
| **TOTAL** | **300** | |

**Scoring Breakdown:**

Accuracy (150):
- Exact email match detection: 50
- Exact phone match detection: 50
- Name similarity scoring: 50

Recall (75):
- Finds > 80% of actual duplicates: 75

Precision (75):
- Accuracy > 90% (few false positives): 75

**Duplicate Detection Strategies:**

1. **Exact Matching:**
   - Email: `LOWER(user_email) = LOWER(?)`
   - Phone: Normalize (remove +, -, spaces), then exact match
   - Status: Both accounts must be active (status = 1)

2. **Fuzzy Matching (Names):**
   - Levenshtein distance: `distance(name1, name2) / MAX(len(name1), len(name2))`
   - Target: Score > 0.85
   - Formula: `similarity = 1 - (distance / max_length)`

3. **Composite Scoring:**
   ```
   final_score = 
     (email_match * 0.4) +
     (phone_match * 0.4) +
     (name_similarity * 0.2)
   ```

4. **Confidence Levels:**
   - High: score >= 0.9 (exact + fuzzy match)
   - Medium: 0.7-0.9 (two partial matches)
   - Low: < 0.7 (single weak match)


---

## Round 5: Concurrent Load Test (13:20 — 13:40)

**FINAL BOSS** — Prove your API can handle real-world load.

**Test Specifications:**

- **Duration:** 60 seconds
- **Concurrency:** 100 concurrent connections
- **Request Mix:**
  - 40% Email search (exact match)
  - 30% Phone search (exact match)
  - 20% Name search (fuzzy match)
  - 10% Duplicate detection

**Test Command:**

```bash
# Using Apache Bench
ab -n 6000 -c 100 -p queries.json http://your-api.com/api/search

# Using wrk
wrk -t12 -c100 -d60s --script load_test.lua http://your-api.com/api/search
```

**Constraints:**
- No infrastructure upgrade allowed
- Same machine/resources as Rounds 1-4
- **Per-request timeout: 5 seconds (hard limit)**
- Any request taking > 5s = FAILED

**Acceptance Criteria:**

✅ **All 4 endpoints respond:**
- GET /health (must be fast)
- GET /api/search
- GET /api/quality
- GET /api/duplicates/<id>

✅ **No crashes or 500 errors** during 60-second test

✅ **Response accuracy maintained** (correct results under load)

✅ **Performance targets:**
- Avg response time: < 1 second
- P50 latency: < 800ms
- P99 latency: < 2 seconds
- Success rate: > 95% (< 5% timeouts)

**Scoring:**

| Metric | Points | Target |
|--------|--------|--------|
| Correct responses (%) | 300 | > 95% success |
| Avg response time | 150 | < 1000ms avg |
| P99 latency | 100 | < 2000ms p99 |
| Zero crashes | 50 | 0 errors/timeouts |
| **TOTAL** | **600** | |

**Scoring Examples:**

Team A:
- 98% success rate (180/300)
- Avg response time 850ms (150/150)
- P99 latency 1800ms (100/100)
- 0 crashes (50/50)
- **Total: 480/600 pts**

Team B:
- 92% success rate (170/300)
- Avg response time 1200ms (100/150)
- P99 latency 3000ms (0/100) - TOO SLOW
- 2 crashes (40/50)
- **Total: 310/600 pts**

Team C:
- 85% success rate (160/300) - TOO MANY TIMEOUTS
- Avg response time 900ms (150/150)
- P99 latency 1500ms (100/100)
- 1 crash (45/50)
- **Total: 455/600 pts** - Better success rate matters most

**Load Test Simulation (Local Testing):**

```bash
# Test with 50 concurrent requests first
ab -n 1000 -c 50 http://localhost:3000/api/search?q=test&type=name

# Check response times
# Should see avg response time < 1000ms

# Scale up to 100 concurrent
ab -n 6000 -c 100 http://localhost:3000/api/search?q=test&type=name
```

**Common Failure Modes:**

❌ Connection pooling exhausted (too many connections)
- Fix: Increase pool size (min 20, max 100)

❌ Database query timeouts
- Fix: Add indexes, optimize queries

❌ Memory exhaustion (6k requests = 6MB+ if not efficient)
- Fix: Streaming responses, pagination

❌ CPU maxed out
- Fix: Query optimization, caching

**Performance Optimization Checklist:**

- [ ] Database indexes on (email, phone, user_id, name)
- [ ] Connection pooling configured (min 20, max 100)
- [ ] Query caching (Redis or in-memory)
- [ ] Pagination implemented (max 100 results per query)
- [ ] Response compression (gzip)
- [ ] Database query optimization (EXPLAIN ANALYZE)
- [ ] Load testing locally before deployment
- [ ] Monitor: CPU, memory, connections during test

**Bonus Challenges (Optional):**

- Response time < 500ms avg: +50 pts
- P99 latency < 1s: +50 pts
- 100% success rate: +50 pts
- All endpoints responsive: +50 pts


---

## Scoring Summary & Timeline

### 4-Hour Challenge Timeline (Jakarta Time: 10:00 - 14:00)

```
10:00 — START (Stage 1: Overview)
10:20 — Round 1 deadline (Import Database)
10:50 — Round 2 deadline (Search Engine)
12:00 — Round 3 deadline (Data Quality Dashboard)
13:20 — Round 4 deadline (Duplicate Detection)
13:40 — Round 5 deadline (Load Test)
14:00 — END / SUBMISSIONS CLOSE
```

### Total Points Breakdown

| Round | Duration | Max Points | Details |
|-------|----------|--------:|---------|
| 1. Import | 00:00-00:45 | 200 | +100 bonus (first 5) |
| 2. Search | 00:45-02:15 | 600 | Email, Phone, Name |
| 3. Data Quality | 02:15-03:30 | 250 | Metrics + visualization |
| 4. Duplicates | 03:30-04:30 | 300 | Similarity matching |
| 5. Load Test | 04:30-05:00 | 600 | Concurrency + stability |
| **SUBTOTAL** | **5 hours** | **1,950** | Base points |

### Bonus Points (Optional)

| Achievement | Points | Criteria |
|-------------|--------|----------|
| Fast email search | +50 | < 50ms avg |
| Fast name search | +50 | < 100ms avg |
| Perfect load test | +50 | 100% success rate |
| Code quality | +50 | Well-documented, clean |
| **MAX BONUS** | **+200** | |

### Maximum Possible Score

```
Base: 1,950 points
Bonus: +200 points
═════════════════════
TOTAL: 2,150 points maximum
```

### Scoring Rules

1. **All-or-nothing per round:**
   - Round 1: 0 pts if health check fails
   - Rounds 2-5: Partial credit for partial correctness

2. **Early completion bonus:**
   - Round 1 only: First 5 teams get +100 pts
   - All other rounds: No time-based bonus

3. **Load test scoring:**
   - Success rate > 95% required for full points
   - Each 1% drop in success rate = -1 pt
   - P99 latency > 5s = 0 pts for that metric

4. **Tiebreaker (if same points):**
   - Earlier submission wins
   - Then: Highest load test success rate
   - Then: Lowest average response time

### Example Scorecards

**High Score (1,500+ pts):**
- Round 1: 300 pts (import + bonus)
- Round 2: 600 pts (all search types work)
- Round 3: 250 pts (accurate metrics)
- Round 4: 300 pts (good duplicate detection)
- Round 5: 550 pts (95%+ success rate)
- Bonus: +100 pts (fast search + clean code)
- **Total: 2,100 pts**

**Mid Score (1,000-1,500 pts):**
- Round 1: 200 pts (import works, no bonus)
- Round 2: 450 pts (partial search working)
- Round 3: 200 pts (metrics mostly correct)
- Round 4: 250 pts (basic duplicate detection)
- Round 5: 400 pts (85% success rate)
- **Total: 1,500 pts**

**Low Score (< 1,000 pts):**
- Round 1: 150 pts (import works, count off)
- Round 2: 300 pts (email search only)
- Round 3: 100 pts (basic metrics)
- Round 4: 0 pts (duplicate detection broken)
- Round 5: 200 pts (crashes during load test)
- **Total: 750 pts**

---

## Submission

### Requirements

```
/api/health
/api/search?q=<query>&type=<type>
/api/quality
/api/duplicates/<user_id>
```

All must respond in valid JSON within timeout.

### Deliverables

1. **Source code** (git repo)
2. **Docker Compose** (single `docker-compose.yml`)
3. **README.md** with setup instructions
4. **DATABASE_NOTES.md** (schema changes, indexes, optimizations)

### Testing Locally

```bash
git clone <your-repo>
cd <your-repo>
docker-compose up
sleep 30
curl http://localhost:3000/api/health
```

Must return 200 + valid JSON.

---

## Rules

1. **No external API calls** (except for learning)
2. **Dataset must stay in PostgreSQL** (or equivalent)
3. **No pre-computed results** (calculations must be live)
4. **Code must be reviewed** (document design decisions)
5. **AI tools allowed** (Claude, ChatGPT, Copilot, etc.) — but **you must understand your code**
6. **Any tech stack OK** (Python, Go, Node.js, Java, Rust, etc.) — gunakan tools apapun yang kamu kuasai
7. **UI/Frontend wajib** (harus ada dashboard atau interface untuk menampilkan hasil, bukan CLI-only)

---

## Judge Criteria

1. **Correctness** (accuracy of results)
2. **Performance** (response time, concurrency)
3. **Scalability** (handles 15M gracefully)
4. **Code Quality** (readability, maintainability)
5. **UI/UX** (usability of interface)

---

## Resources

- Dataset: `/data/users_15m.sql.gz`
- Docker image: `postgres:14-alpine`
- Time: 6 hours
- No external database services

Good luck. 🚀
