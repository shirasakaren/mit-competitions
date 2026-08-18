\timing on

\echo '=== threshold 0.5, komang pipit ==='
SET pg_trgm.similarity_threshold = 0.5;
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(LOWER(full_name), LOWER('komang pipit')) AS sim
FROM ws_user WHERE LOWER(full_name) % LOWER('komang pipit')
ORDER BY sim DESC LIMIT 10;

\echo '=== threshold 0.5, budi (common, stress case) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(LOWER(full_name), LOWER('budi')) AS sim
FROM ws_user WHERE LOWER(full_name) % LOWER('budi')
ORDER BY sim DESC LIMIT 10;

\echo '=== threshold 0.5, customer (judge required test query, likely no match) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(LOWER(full_name), LOWER('customer')) AS sim
FROM ws_user WHERE LOWER(full_name) % LOWER('customer')
ORDER BY sim DESC LIMIT 10;

\echo '=== threshold 0.5, typo komang piipt ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, similarity(LOWER(full_name), LOWER('komang piipt')) AS sim
FROM ws_user WHERE LOWER(full_name) % LOWER('komang piipt')
ORDER BY sim DESC LIMIT 10;
RESET pg_trgm.similarity_threshold;
