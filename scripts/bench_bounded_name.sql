\timing on
SET pg_trgm.similarity_threshold = 0.3;

\echo '=== BOUNDED: budi (common, previously 1163ms) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, sim FROM (
  SELECT user_id, full_name, similarity(lower(full_name), lower('budi')) AS sim
  FROM ws_user
  WHERE lower(full_name) % lower('budi')
  LIMIT 300
) sub
ORDER BY sim DESC LIMIT 10;

\echo '=== BOUNDED: komang pipit ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, sim FROM (
  SELECT user_id, full_name, similarity(lower(full_name), lower('komang pipit')) AS sim
  FROM ws_user
  WHERE lower(full_name) % lower('komang pipit')
  LIMIT 300
) sub
ORDER BY sim DESC LIMIT 10;

\echo '=== BOUNDED: customer (likely empty) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, sim FROM (
  SELECT user_id, full_name, similarity(lower(full_name), lower('customer')) AS sim
  FROM ws_user
  WHERE lower(full_name) % lower('customer')
  LIMIT 300
) sub
ORDER BY sim DESC LIMIT 10;

\echo '=== BOUNDED: typo komang piipt ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, sim FROM (
  SELECT user_id, full_name, similarity(lower(full_name), lower('komang piipt')) AS sim
  FROM ws_user
  WHERE lower(full_name) % lower('komang piipt')
  LIMIT 300
) sub
ORDER BY sim DESC LIMIT 10;

\echo '=== BOUNDED: single common word "andi" ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, sim FROM (
  SELECT user_id, full_name, similarity(lower(full_name), lower('andi')) AS sim
  FROM ws_user
  WHERE lower(full_name) % lower('andi')
  LIMIT 300
) sub
ORDER BY sim DESC LIMIT 10;

RESET pg_trgm.similarity_threshold;
