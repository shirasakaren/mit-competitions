-- Analytics support indexes (applied on top of 001_indexes.sql).
-- Needed so the /api/analytics background pass can aggregate 15M rows by
-- creation month without a full heap scan: the registration time series
-- becomes an index-only scan over this b-tree.
SET statement_timeout = 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ws_user_create_time ON ws_user (create_time);
