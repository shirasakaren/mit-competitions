\timing on
SET pg_trgm.similarity_threshold = 0.3;
SET gin_fuzzy_search_limit = 2000;

\echo '=== FUZZY-LIMIT: andi (worst case, was 1092ms) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(lower(full_name), lower('andi')) AS sim
FROM ws_user WHERE lower(full_name) % lower('andi')
ORDER BY sim DESC LIMIT 10;

\echo '=== FUZZY-LIMIT: budi ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(lower(full_name), lower('budi')) AS sim
FROM ws_user WHERE lower(full_name) % lower('budi')
ORDER BY sim DESC LIMIT 10;

\echo '=== FUZZY-LIMIT: komang pipit ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(lower(full_name), lower('komang pipit')) AS sim
FROM ws_user WHERE lower(full_name) % lower('komang pipit')
ORDER BY sim DESC LIMIT 10;

\echo '=== FUZZY-LIMIT: customer ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(lower(full_name), lower('customer')) AS sim
FROM ws_user WHERE lower(full_name) % lower('customer')
ORDER BY sim DESC LIMIT 10;

\echo '=== FUZZY-LIMIT: typo komang piipt ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(lower(full_name), lower('komang piipt')) AS sim
FROM ws_user WHERE lower(full_name) % lower('komang piipt')
ORDER BY sim DESC LIMIT 10;

RESET gin_fuzzy_search_limit;
RESET pg_trgm.similarity_threshold;
