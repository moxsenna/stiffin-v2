-- ============================================================
-- B6 — Runtime role grants (least privilege)
-- ============================================================
-- Purpose: grant the application runtime role access to
-- the B6 PromotorFlow domain tables introduced by migration (0003_*).
-- This file contains ROLE NAMES ONLY.
-- Never add credentials or connection strings here.
--
-- Roles:
--   owner            : migration/owner authority (DDL). Never used at runtime.
--                      Neon: neondb_owner. CI/local: postgres.
--   promotor_runtime : application runtime role used by the Worker via Hyperdrive.
--
-- Run this AS the owner role AFTER the B6 migration has been applied
-- (grants_b1.sql, grants_b2.sql, and grants_b3.sql must already be applied).
-- ALWAYS use -v ON_ERROR_STOP=1 so a partial grant failure cannot be
-- mistaken for completed provisioning:
--   Neon:  psql "$OWNER_DATABASE_URL" \
--            -v ON_ERROR_STOP=1 \
--            -f docs/sql/grants_b6.sql
--   CI:    PGPASSWORD=postgres psql -h localhost -U postgres -d postgres \
--            -v ON_ERROR_STOP=1 \
--            -f docs/sql/grants_b6.sql
-- ============================================================

-- B6 Flow tables (explicit, reviewable per milestone) — 8 tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.services TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bookings TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.next_actions TO promotor_runtime;
GRANT SELECT, INSERT ON TABLE public.activities TO promotor_runtime; -- True append-only least privilege (UPDATE/DELETE denied)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_flow_states TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.aftercare_records TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_assessments TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_templates TO promotor_runtime;

-- Deliberately NO ALTER DEFAULT PRIVILEGES.
-- Least privilege must remain reviewable per milestone.

-- Explicitly NO DDL privileges are granted:
--   no CREATE on schema public
--   no ownership of any object
--   no CREATEDB / CREATEROLE (enforced at role creation time)
