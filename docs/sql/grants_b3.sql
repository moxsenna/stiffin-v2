-- ============================================================
-- B3 — Runtime role grants (least privilege)
-- ============================================================
-- Purpose: grant the application runtime role CRUD-only access to
-- the B3 PromotorClass content tables introduced by migration (0002_*).
-- This file contains ROLE NAMES ONLY.
-- Never add credentials or connection strings here.
--
-- Roles:
--   owner            : migration/owner authority (DDL). Never used at runtime.
--                      Neon: neondb_owner. CI/local: postgres.
--   promotor_runtime : application runtime role used by the Worker via Hyperdrive.
--
-- Run this AS the owner role AFTER the B3 migration has been applied
-- (grants_b1.sql and grants_b2.sql must already be applied).
-- ALWAYS use -v ON_ERROR_STOP=1 so a partial grant failure cannot be
-- mistaken for completed provisioning:
--   Neon:  psql "$OWNER_DATABASE_URL" \
--            -v ON_ERROR_STOP=1 \
--            -f docs/sql/grants_b3.sql
--   CI:    PGPASSWORD=postgres psql -h localhost -U postgres -d postgres \
--            -v ON_ERROR_STOP=1 \
--            -f docs/sql/grants_b3.sql
-- ============================================================

-- New B3 tables (explicit, reviewable per milestone)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.programs TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modules TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lessons TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_attachments TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.program_presentations TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_profiles TO promotor_runtime;

-- Deliberately NO ALTER DEFAULT PRIVILEGES.
-- Least privilege must remain reviewable per milestone: B4/B5/B6
-- MUST explicitly extend runtime grants for the tables they introduce.

-- Explicitly NO DDL privileges are granted:
--   no CREATE on schema public
--   no ownership of any object
--   no CREATEDB / CREATEROLE (enforced at role creation time)
