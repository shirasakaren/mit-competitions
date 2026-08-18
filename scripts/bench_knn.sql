\timing on
\echo '=== index sizes ==='
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) size
FROM pg_indexes WHERE indexname IN ('idx_ws_user_fullname_trgm','idx_ws_user_fullname_gist');

\echo '=== NAME FUZZY via GiST KNN ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, user_email, msisdn, status, create_time,
       similarity(LOWER(full_name), LOWER('komang pipit')) AS sim
FROM ws_user
WHERE full_name IS NOT NULL
ORDER BY LOWER(full_name) <-> LOWER('komang pipit')
LIMIT 10;

\echo '=== NAME FUZZY via GiST KNN (typo tolerance test) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(LOWER(full_name), LOWER('komang pipit')) AS sim
FROM ws_user
WHERE full_name IS NOT NULL
ORDER BY LOWER(full_name) <-> LOWER('komang piipt')
LIMIT 10;

\echo '=== common single-word query (stress case) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(LOWER(full_name), LOWER('budi')) AS sim
FROM ws_user
WHERE full_name IS NOT NULL
ORDER BY LOWER(full_name) <-> LOWER('budi')
LIMIT 10;
