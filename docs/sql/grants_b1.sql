-- ============================================================
-- B1 — Runtime role grants (least privilege)
-- ============================================================
-- Purpose: grant the application runtime role CRUD-only access to
-- the B1 Shared Core tables. This file contains ROLE NAMES ONLY.
-- Never add credentials or connection strings here.
--
-- Roles:
--   owner            : migration/owner authority (DDL). Never used at runtime.
--                      Neon: neondb_owner. CI/local: postgres.
--   promotor_runtime : application runtime role used by the Worker via Hyperdrive.
--
-- Run this AS the owner role AFTER the B1 migration has been applied.
-- ALWAYS use -v ON_ERROR_STOP=1 so a partial grant failure cannot be
-- mistaken for completed provisioning:
--   Neon:  psql "$OWNER_DATABASE_URL" \
--            -v ON_ERROR_STOP=1 \
--            -f docs/sql/grants_b1.sql
--   CI:    PGPASSWORD=postgres psql -h localhost -U postgres -d postgres \
--            -v ON_ERROR_STOP=1 \
--            -f docs/sql/grants_b1.sql
-- ============================================================

-- Schema usage
GRANT USAGE ON SCHEMA public TO promotor_runtime;

-- Existing B1 tables (explicit, reviewable per milestone)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_members TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contacts TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_entitlements TO promotor_runtime;

-- Deliberately NO ALTER DEFAULT PRIVILEGES.
-- Least privilege must remain reviewable per milestone: B2/B3/B4/B5/B6
-- MUST explicitly extend runtime grants for the tables they introduce.

-- Explicitly NO DDL privileges are granted:
--   no CREATE on schema public
--   no ownership of any object
--   no CREATEDB / CREATEROLE (enforced at role creation time)
