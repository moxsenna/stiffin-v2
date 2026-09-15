-- docs/sql/grants_admin.sql
-- Principle of Least Privilege: Grants for payout batches, bridge metrics, and admin audit logs
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payout_batches TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payout_items TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bridge_metrics TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bridge_dismissals TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_audit_logs TO promotor_runtime;
