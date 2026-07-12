-- ──────────────────────────────────────────────────────────────────────────────
-- AssetFlow — Postgres extensions (run automatically on first container start)
--
-- pgcrypto   → gen_random_uuid() for UUID primary keys
-- btree_gist → EXCLUDE USING gist constraints (booking overlap prevention)
-- citext     → case-insensitive text for email columns
-- ──────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;
