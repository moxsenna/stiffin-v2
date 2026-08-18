-- ============================================================
-- V0.1 — Runtime role grants (least privilege)
-- ============================================================
-- Purpose: grant the application runtime role access to
-- the V0.1 release hardening tables introduced by migration (0007_*).
-- This file contains ROLE NAMES ONLY.
-- Never add credentials or connection strings here.
--
-- Roles:
--   owner            : migration/owner authority (DDL). Never used at runtime.
--                      Neon: neondb_owner. CI/local: postgres.
--   promotor_runtime : application runtime role used by the Worker via Hyperdrive.
--
-- Run this AS the owner role AFTER the 0007 migration has been applied.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.learner_sessions TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_outbox TO promotor_runtime;
