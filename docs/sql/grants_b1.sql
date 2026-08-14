-- ============================================================
-- B1 — Runtime role grants (least privilege)
-- ============================================================
-- Purpose: grant the application runtime role CRUD-only access to
-- the B1 Shared Core tables. This file contains ROLE NAMES ONLY.
-- Never add credentials or connection strings here.
--
-- Roles:
--   owner_role       : migration/owner authority (DDL). Never used at runtime.
--                      Neon: neondb_owner. CI/local: postgres.
--   promotor_runtime : application runtime role used by the Worker via Hyperdrive.
--
-- Run this AS the owner role AFTER the B1 migration has been applied:
--   Neon:  psql -v owner_role=neondb_owner -f docs/sql/grants_b1.sql
--   CI:    psql -v owner_role=postgres     -f docs/sql/grants_b1.sql
-- ============================================================

-- Schema usage
GRANT USAGE ON SCHEMA public TO promotor_runtime;

-- Existing B1 tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_members TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contacts TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_entitlements TO promotor_runtime;

-- Future tables created by the owner in this schema inherit the same CRUD grants
ALTER DEFAULT PRIVILEGES FOR ROLE :owner_role IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO promotor_runtime;

-- Explicitly NO DDL privileges are granted:
--   no CREATE on schema public
--   no ownership of any object
--   no CREATEDB / CREATEROLE (enforced at role creation time)
