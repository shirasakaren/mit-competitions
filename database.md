  Source

  - File: /app/data/challenge_db_anonymized_v2.sql.gz (root's home is /app/data on 188.166.219.49)
  - Size: 1.97 GB compressed → 5.11 GB uncompressed




 188.166.219.49)
- Size: 1.97 GB compressed → 5.11 GB uncompressed
- Format: PostgreSQL pg_dump (schema+data, plain SQL), dumped from PostgreSQL 14.23
- No CREATE DATABASE/\connect statement in the dump itself (plain single-DB dump) — the only name identifying it is the filename challenge_db_anonymized_v2. No live Postgres/docker instance is running on this VPS; it's just the dump file sitting on disk.

Schema: public — 6 tables, 22.4M rows total

Table: test_table
Columns: id integer
Row count: 0
PK: none
FK →: —
Notes: empty, no constraints — looks like a scratch/test artifact
────────────────────────────────────────
Table: ws_user
Columns: 38 cols (see below)
Row count: 14,999,896
PK: user_id (bigint)
FK →: —
Notes: central user profile table, heavily nullable
────────────────────────────────────────
Table: ws_orders
Columns: order_id, user_id, order_date, order_amount, order_status
Row count: 2,999,986
PK: order_id
FK →: user_id → ws_user.user_id
Notes:
────────────────────────────────────────
Table: ws_transactions
Columns: transaction_id, order_id, transaction_date, transaction_amount,
transaction_type, status
Row count: 2,400,548
PK: transaction_id
FK →: order_id → ws_orders.order_id
Notes:
────────────────────────────────────────
Table: ws_user_activity
Columns: activity_id, user_id, activity_type, activity_timestamp, ip_address
Row count: 2,000,000
PK: activity_id
FK →: user_id → ws_user.user_id
Notes: event/log table
────────────────────────────────────────
Table: ws_user_preferences
Columns: preference_id, user_id, theme, language
Row count: 0
PK: preference_id
FK →: user_id → ws_user.user_id (UNIQUE)
Notes: 1:1 with ws_user; currently empty

Column detail

ws_user (38 columns) — the widest table:
user_id bigint NOT NULL (PK, seq), user_name varchar(128), user_email varchar(512), user_pwd varchar(32), status smallint, full_name varchar(128), sex smallint, birth_date date, location text, msisdn varchar(20), messenger varchar(128), flag_email/flag_messenger/flag_birthdate/flag_hp/flag_img smallint, occupation/company/schools varchar(128), hobbies text, relationship smallint, activation_code varchar(128), about_me varchar(512), last_login timestamp, deposit numeric, create_by integer, create_time timestamp, update_by integer, update_time timestamp, email_new/email_cancel_code/email_confirm_code/reset_password_code varchar(128), profile_effective_date timestamp, status_data smallint, shop_info text, lang varchar(4), user_pwd_1 varchar(100), uniq_char varchar(64).

ws_orders: order_id bigint NOT NULL (PK), user_id bigint NOT NULL (FK), order_date timestamp NOT NULL, order_amount numeric(12,2), order_status smallint.

ws_transactions: transaction_id bigint NOT NULL (PK), order_id bigint NOT NULL (FK), transaction_date timestamp NOT NULL, transaction_amount numeric(12,2), transaction_type varchar(50) (e.g. PAYMENT), status varchar(50) (e.g. SUCCESS).

ws_user_activity: activity_id bigint NOT NULL (PK), user_id bigint NOT NULL (FK), activity_type varchar(100) (categorical, e.g. LOGIN/LOGOUT/PURCHASE), activity_timestamp timestamp NOT NULL, ip_address varchar(45).

ws_user_preferences: preference_id bigint NOT NULL (PK), user_id bigint NOT NULL (FK, UNIQUE), theme varchar(20), language varchar(10).

Example data shape (values masked, not the real data)

- ws_orders: order_id=2792162 | user_id=57240309 | order_date=2026-02-02 16:45:31 | order_amount=424.49 | order_status=2
- ws_transactions: transaction_id=1 | order_id=2792162 | transaction_date=2026-02-02 17:16:54 | amount=411.81 | type=PAYMENT | status=SUCCESS
- ws_user_activity: activity_id=1 | user_id=27208217 | type=PURCHASE | timestamp=2026-06-01 11:13:31 | ip=192.168.x.x
- ws_user: rows are extremely sparse (mostly \N) — real, populated columns per sample rows were user_id, user_email (valid email format), status, full_name (occasionally replaced with [CHARACTER_NOT_ALLOWED] — anonymization artifact), sex, birth_date, activation_code (UUID), deposit, create_time. Note: real emails/names ARE present in the actual dump despite "anonymized" in the filename — it's not fully scrubbed.

Structural notes for AI agents / integrators

- No secondary indexes anywhere beyond what PK/UNIQUE constraints auto-create. Filtering ws_orders.order_date, ws_transactions.transaction_date, ws_user_activity.activity_timestamp, or ws_user.user_email will full-scan tables up to 15M rows.
- Relationships (all enforced via FK): ws_user (1) —< ws_orders —< ws_transactions; ws_user (1) —< ws_user_activity; ws_user (1) —1 ws_user_preferences (unique FK, so true 1:1, but currently empty).
- test_table is dead weight — no rows, no constraints, no relation to anything else.
- ws_user is mostly NULL outside of core identity fields — treat most of its 38 columns as sparse/optional in practice, not just nullable-by-schema.
  - Format: PostgreSQL pg_dump (schema+data, plain SQL), dumped from PostgreSQL 14.23
  - No CREATE DATABASE/\connect statement in the dump itself (plain single-DB dump) — the only name identifying it is the filename challenge_db_anonymized_v2. No live Postgres/docker instance is running on this VPS; it's just the dump file sitting on disk.

  Schema: public — 6 tables, 22.4M rows total

  Table: test_table
  Columns: id integer
  Row count: 0
  PK: none
  FK →: —
  Notes: empty, no constraints — looks like a scratch/test artifact
  ────────────────────────────────────────
  Table: ws_user
  Columns: 38 cols (see below)
  Row count: 14,999,896
  PK: user_id (bigint)
  FK →: —
  Notes: central user profile table, heavily nullable
  ────────────────────────────────────────
  Table: ws_orders
  Columns: order_id, user_id, order_date, order_amount, order_status
  Row count: 2,999,986
  PK: order_id
  FK →: user_id → ws_user.user_id
  Notes:
  ────────────────────────────────────────
  Table: ws_transactions
  Columns: transaction_id, order_id, transaction_date, transaction_amount,
  transaction_type, status
  Row count: 2,400,548
  PK: transaction_id
  FK →: order_id → ws_orders.order_id
  Notes:
  ──────────────────────────
