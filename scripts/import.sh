#!/usr/bin/env bash
# Streams a gzip-compressed pg_dump (plain SQL) into the running `postgres`
# compose service without ever materializing the decompressed 5GB+ file on disk.
#
# Usage: scripts/import.sh /path/to/challenge_db_anonymized_v2.sql.gz
set -euo pipefail

DUMP_PATH="${1:?usage: import.sh <path-to-dump.sql.gz>}"
COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$COMPOSE_DIR"

# shellcheck disable=SC1091
[ -f .env ] && set -a && source .env && set +a

POSTGRES_USER="${POSTGRES_USER:-cip}"
POSTGRES_DB="${POSTGRES_DB:-challenge_db}"

echo "==> Applying import-time PostgreSQL overrides (durability traded for throughput)"
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
ALTER SYSTEM SET fsync = off;
ALTER SYSTEM SET synchronous_commit = off;
ALTER SYSTEM SET full_page_writes = off;
ALTER SYSTEM SET autovacuum = off;
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET max_wal_size = '16GB';
ALTER SYSTEM SET checkpoint_timeout = '60min';
SELECT pg_reload_conf();
SQL
# fsync/full_page_writes/max_wal_size need a restart to take effect (not all are reloadable)
docker compose restart postgres
until docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do sleep 1; done

echo "==> Streaming import from $DUMP_PATH ($(date))"
time gzip -dc "$DUMP_PATH" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q

echo "==> Import finished ($(date)). Reverting to durable production settings."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
ALTER SYSTEM RESET fsync;
ALTER SYSTEM RESET synchronous_commit;
ALTER SYSTEM RESET full_page_writes;
ALTER SYSTEM RESET autovacuum;
ALTER SYSTEM RESET maintenance_work_mem;
ALTER SYSTEM RESET max_wal_size;
ALTER SYSTEM RESET checkpoint_timeout;
SQL
docker compose restart postgres
until docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do sleep 1; done

echo "==> Verifying row counts"
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 'ws_user' t, COUNT(*) FROM ws_user
UNION ALL SELECT 'ws_orders', COUNT(*) FROM ws_orders
UNION ALL SELECT 'ws_transactions', COUNT(*) FROM ws_transactions
UNION ALL SELECT 'ws_user_activity', COUNT(*) FROM ws_user_activity
UNION ALL SELECT 'ws_user_preferences', COUNT(*) FROM ws_user_preferences;
"
echo "==> Done."
