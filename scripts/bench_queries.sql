-- ad-hoc benchmark queries, run manually during setup, not part of the app
\timing on

\echo '=== EMAIL EXACT ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, user_email, msisdn, status, create_time
FROM ws_user WHERE LOWER(user_email) = LOWER('komangpipit809@gmail.com') LIMIT 10;

\echo '=== PHONE EXACT ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, user_email, msisdn, status, create_time
FROM ws_user WHERE msisdn_norm = '6285758507688' LIMIT 10;

\echo '=== USER_ID EXACT ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, user_email, msisdn, status, create_time
FROM ws_user WHERE user_id = 26856268;

\echo '=== NAME FUZZY ==='
SET pg_trgm.similarity_threshold = 0.3;
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, full_name, user_email, msisdn, status, create_time,
       similarity(LOWER(full_name), LOWER('komang pipit')) AS sim
FROM ws_user WHERE LOWER(full_name) % LOWER('komang pipit')
ORDER BY sim DESC LIMIT 10;

\echo '=== EMAIL DISTINCT FORCED GROUPAGG (no hashagg) ==='
SET enable_hashagg = off;
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM (SELECT lower(user_email) FROM ws_user WHERE user_email IS NOT NULL GROUP BY lower(user_email)) t;
RESET enable_hashagg;
