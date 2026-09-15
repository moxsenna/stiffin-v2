# Gates: ralivo-admin-panel-complete

OWNS: apps/platform-api/**, apps/promotor-class-web/**, packages/api-client/**, packages/contracts/**

Scope: Implement complete production-ready Admin Panel for Ralivo across 7 modules (Payout & Cashflow, Payment Ops & Transaksi Paycore, Tenant Management & Impersonation, Helpdesk Peserta Global, Moderasi Konten & Anti-Fraud, Engine Room & Integrasi, Executive Dashboard).

- [ ] G1: Database schema and migration for admin audit logs exists and compiles clean
  CHECK: node -e "const { adminAuditLogs } = require('./apps/platform-api/src/db/schema/admin-audit-logs.ts'); console.log('admin_audit_logs schema loaded');"
  EXPECT: admin_audit_logs schema loaded
  EVIDENCE: pending

- [ ] G2: Admin API endpoints in platform-api handle all 7 operational domains with fail-closed authentication
  CHECK: pnpm -C apps/platform-api test
  EXPECT: apps/platform-api test: Done
  EVIDENCE: pending

- [ ] G3: ApiClient provides comprehensive admin methods for all 7 operational domains
  CHECK: pnpm -C packages/api-client typecheck
  EXPECT: packages/api-client typecheck: Done
  EVIDENCE: pending

- [ ] G4: Admin panel UI in promotor-class-web compiles and builds with zero TypeScript errors
  CHECK: pnpm -C apps/promotor-class-web typecheck
  EXPECT: apps/promotor-class-web typecheck: Done
  EVIDENCE: pending

- [ ] G5: All monorepo workspace packages typecheck and tests pass cleanly
  CHECK: pnpm -r typecheck
  EXPECT: apps/promotor-flow-web typecheck: Done
  EVIDENCE: pending

- [ ] G6: Production Cloudflare build succeeds for all applications
  CHECK: pnpm build:class
  EXPECT: ✓ Generating static pages
  EVIDENCE: pending
