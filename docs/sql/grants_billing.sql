-- ============================================================
-- Talira Billing & Commerce — Runtime role grants (least privilege)
-- ============================================================
-- Purpose: grant the application runtime role access to
-- the billing and commerce tables introduced by migration (0010_*).
-- This file contains ROLE NAMES ONLY.
-- Never add credentials or connection strings here.
--
-- Roles:
--   owner            : migration/owner authority (DDL). Never used at runtime.
--                      Neon: neondb_owner. CI/local: postgres.
--   promotor_runtime : application runtime role used by the Worker via Hyperdrive.
--
-- Run this AS the owner role AFTER the 0010 migration has been applied.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_subscriptions TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.commerce_orders TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_records TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_fee_entries TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_bank_accounts TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.provider_webhook_events TO promotor_runtime;
