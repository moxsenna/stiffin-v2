-- ============================================================
-- B2 — Runtime role grants (least privilege)
-- ============================================================
-- Purpose: grant the application runtime role CRUD-only access to
-- the B2 auth tables introduced by the B2 migration (0001_*).
-- This file contains ROLE NAMES ONLY.
-- Never add credentials or connection strings here.
--
-- Roles:
--   owner            : migration/owner authority (DDL). Never used at runtime.
--                      Neon: neondb_owner. CI/local: postgres.
--   promotor_runtime : application runtime role used by the Worker via Hyperdrive.
--
-- Run this AS the owner role AFTER the B2 migration has been applied
-- (grants_b1.sql must already be applied).
-- ALWAYS use -v ON_ERROR_STOP=1 so a partial grant failure cannot be
-- mistaken for completed provisioning:
--   Neon:  psql "$OWNER_DATABASE_URL" \
--            -v ON_ERROR_STOP=1 \
--            -f docs/sql/grants_b2.sql
--   CI:    PGPASSWORD=postgres psql -h localhost -U postgres -d postgres \
--            -v ON_ERROR_STOP=1 \
--            -f docs/sql/grants_b2.sql
-- ============================================================

-- New B2 tables (explicit, reviewable per milestone)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.verifications TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_invitations TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_rate_limits TO promotor_runtime;

-- Deliberately NO ALTER DEFAULT PRIVILEGES.
-- Least privilege must remain reviewable per milestone: B3/B4/B5/B6
-- MUST explicitly extend runtime grants for the tables they introduce.

-- Explicitly NO DDL privileges are granted:
--   no CREATE on schema public
--   no ownership of any object
--   no CREATEDB / CREATEROLE (enforced at role creation time)
