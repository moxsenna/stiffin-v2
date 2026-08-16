# B2 Phase E-B — Neon Branch Rehearsal Audit Record

**Target environment:** Disposable Neon rehearsal branch (`b2-auth-rehearsal`) cloned from `production`.  
**Execution Date/Time:** 2026-08-16T04:35:00Z  
**Source Under Test:** `83f5b90e4ff4fe8180905790824baf4af769edf8`  
**Overall Rehearsal Verdict:** 🟢 FINAL ACCEPTED / FROZEN

---

## 1. Audit Summary Record

| Field | Value |
|---|---|
| Milestone | B2 Phase E-B (Neon Branch Rehearsal) |
| Approved source SHA | `83f5b90e4ff4fe8180905790824baf4af769edf8` |
| Operator / logical actor | Antigravity AI Assistant / Mox |
| UTC timestamp | `2026-08-16T04:35:00Z` |
| Neon project ID | `nameless-shadow-74973742` |
| Parent branch | `production` (`br-dawn-cloud-aym93r85`) |
| Rehearsal branch name | `b2-auth-rehearsal` |
| Rehearsal branch ID | `br-frosty-fog-ay2dx1ky` |
| PostgreSQL engine version | PostgreSQL 18.4 (`c9a59a4`) |
| Target environment | `rehearsal-branch` |
| Migration filenames | `0000_modern_hydra.sql`, `0001_material_king_bedlam.sql` |
| Canonical 0000 hash | `86a3e3d993e3c038908e741649c2586afe2ae7ca737be641680c9af475bc7689` |
| Canonical 0001 hash | `e5acd9851fe9f76920ed513ddb454dbb91ddc6bc2259a8caa591fe894c95c166` |
| Grant script/version | `docs/sql/grants_b1.sql`, `docs/sql/grants_b2.sql` |
| Production predecessor precheck | ✅ PASS (READ-ONLY) |
| Rehearsal clone predecessor check | ✅ PASS (matches production predecessor) |
| Migration execution | ✅ PASS (`pnpm --filter @promotor/platform-api db:migrate`) |
| Runtime grants execution | ✅ PASS (`docs/sql/grants_b2.sql`) |
| Pre-auth `--verify` | ✅ PASS (0 failures, 10 tables, 40/40 CRUD, DDL denied) |
| In-process `--rehearse-auth` (A–P) | ✅ PASS (16/16 passed, 0 failures) |
| Post-auth `--verify` | ✅ PASS (0 failures, schema/journal/grants untouched) |
| Rehearsal branch retained | ✅ YES (`b2-auth-rehearsal` preserved for inspection) |
| Production untouched | ✅ YES (zero production mutations) |

---

## 2. Predecessor Validation Details

### Production Read-Only Precheck (Step 2)
- Engine: PostgreSQL 18.4
- Journal count: 1 entry (`0000_modern_hydra`)
- 0000 hash: `86a3e3d993e3c038908e741649c2586afe2ae7ca737be641680c9af475bc7689` (canonical Git/LF)
- Public tables (5 B1 tables): `contacts`, `organization_members`, `organizations`, `product_entitlements`, `users`
- B2 tables present: None (0/5)
- Runtime B1 CRUD privileges: 20/20
- Runtime CREATE ON SCHEMA public: DENIED
- Verdict: ✅ PASS

### Rehearsal Clone Predecessor Validation (Step 4)
- Branch: `b2-auth-rehearsal` (`br-frosty-fog-ay2dx1ky`), parent: `production`
- Journal count: 1 entry (`0000_modern_hydra`)
- 0000 hash: `86a3e3d993e3c038908e741649c2586afe2ae7ca737be641680c9af475bc7689`
- Public tables: 5 B1 tables present, 0 B2 tables
- Runtime B1 CRUD privileges: 20/20
- Runtime CREATE ON SCHEMA public: DENIED
- Verdict: ✅ PASS

---

## 3. Migration and Grants Evidence

### Canonical B2 Migration (Step 5)
- Tooling: `pnpm --filter @promotor/platform-api db:migrate` (`tooling/migrate.ts`)
- EOL preflight: PASS (LF-normalized, 0 CR byte violations)
- Drizzle output: `[B1 migrate] migrations applied successfully`
- Post-migration DB journal entries: Exactly 2
  - Entry 1 (`0000_modern_hydra`): `86a3e3d993e3c038908e741649c2586afe2ae7ca737be641680c9af475bc7689`
  - Entry 2 (`0001_material_king_bedlam`): `e5acd9851fe9f76920ed513ddb454dbb91ddc6bc2259a8caa591fe894c95c166`
- Verdict: ✅ PASS

### Runtime Grants (Step 6)
- Script: `docs/sql/grants_b2.sql` applied as owner role `neondb_owner`
- Privilege verification (`promotor_runtime` role):
  - B1 tables CRUD: 20/20
  - B2 tables CRUD (`sessions`, `accounts`, `verifications`, `organization_invitations`, `auth_rate_limits`): 20/20
  - Total CRUD: 40/40
  - CREATE ON SCHEMA public: DENIED
  - Table ownership / DDL rights: NONE
- Verdict: ✅ PASS

---

## 4. Live Acceptance Verification Evidence

### Pre-Auth Read-Only Verification (`--verify`, Step 7)
- Command: `pnpm --filter @promotor/platform-api b2:live-acceptance --verify`
- Failures: 0
- Evidence log:
  - 10/10 tables present: PASS
  - 40/40 CRUD privileges: PASS
  - Runtime CREATE denied: PASS
  - Local journal sequence (`0000_modern_hydra`, `0001_material_king_bedlam`): PASS
  - Canonical fingerprints match Git/LF: PASS
  - DB migration hashes match canonical fingerprints: PASS
  - Worker `/health` 200: PASS
  - Worker `/health/db` 200: PASS
  - `auth_rate_limits` storage queryable: PASS

### Disposable Auth Rehearsal (`--rehearse-auth`, Step 8)
- Command: `B2_TARGET_ENV=rehearsal-branch B2_ALLOW_DISPOSABLE_MUTATIONS=YES pnpm --filter @promotor/platform-api b2:live-acceptance --rehearse-auth`
- Failures: 0
- Checks A–P breakdown:
  - **A. trusted disposable provisioning**: PASS
  - **B. sign-in succeeds**: PASS
  - **C. session cookie round-trip**: PASS
  - **D. /api/me canonical user/org/membership/entitlements**: PASS
  - **E. valid UUID set-active**: PASS
  - **F. malformed UUID set-active -> 403**: PASS
  - **G. organizationSlug set-active -> 403**: PASS
  - **H. raw BA /organization/list -> 403**: PASS
  - **I. public signup disabled**: PASS
  - **J. BA user hard delete disabled**: PASS
  - **K. promotorClass=false -> ENTITLEMENT_DENIED (403)**: PASS
  - **L. promotorFlow=false -> ENTITLEMENT_DENIED (403)**: PASS
  - **M. true entitlement passes**: PASS
  - **N. soft-delete purges all sessions**: PASS
  - **O. old session rejected**: PASS
  - **P. re-sign-in rejected**: PASS

### Post-Auth Read-Only Verification (`--verify`, Step 9)
- Command: `pnpm --filter @promotor/platform-api b2:live-acceptance --verify`
- Failures: 0
- Confirmed: Auth mutations caused zero degradation to schema, migration journal, privileges, or rate-limit tables. DDL denial remains intact.

---

## 5. Security and Production Fence Confirmation

1. **Production Database Untouched**: Zero DDL, DML, migrations, grants, or auth provisioning operations targeted `production`.
2. **Production Journal Untouched**: Production journal remains row count = 1 with hash `86a3e3d9...`.
3. **Hyperdrive Config Untouched**: Hyperdrive ID `1cb577ffc7524f4591a89206bb19d535` was not modified or pointed to rehearsal branch.
4. **Cloudflare Worker Deployments**: None executed (`wrangler deploy` was NOT run).
5. **Pull Requests**: All open PRs (#16, #17, #18, #19) remain UNMERGED.
6. **Rehearsal Branch Retained**: Branch `b2-auth-rehearsal` (`br-frosty-fog-ay2dx1ky`) is preserved in Neon project `nameless-shadow-74973742` for reviewer inspection.
7. **Credentials & Secrets**: Zero connection strings, hostnames, passwords, Better Auth secrets, session tokens, or raw errors logged or committed.

---

## 6. Approval Gate Status

- [x] Pre-rehearsal production predecessor read-only check PASS
- [x] Disposable Neon rehearsal branch created (`b2-auth-rehearsal`)
- [x] Pre-mutation clone validation PASS
- [x] Canonical B2 migration (0001) applied to rehearsal branch PASS
- [x] Canonical runtime grants (B2) applied to rehearsal branch PASS
- [x] Read-only acceptance `--verify` PASS (0 failures)
- [x] Disposable auth rehearsal `--rehearse-auth` (A–P) PASS (16/16, 0 failures)
- [x] Post-auth read-only acceptance `--verify` PASS (0 failures)
- [x] **Human / Reviewer E-B Audit & Sign-off** (`B2 PHASE E-B — FINAL ACCEPTED / FROZEN`)
- [x] **Phase E-C authorization** (`IN PROGRESS` — publication sync & controlled promotion)
