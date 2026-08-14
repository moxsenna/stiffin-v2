# Milestone B1 — Shared Core Persistence

**Status:** IMPLEMENTED (code + CI proof on real PostgreSQL; live Neon proof pending operator run)
**Date:** 2026-08-14
**Base:** master @ `7dd3298a003e5d4d5af05eb2e4c6511992e639c9`
**Branch:** `feat/b1-shared-core-persistence`

---

## 1. Scope

B1 creates the canonical persistence foundation required by every later domain:
Shared Core tables, Drizzle migration infrastructure, migration discipline,
runtime least-privilege grants, tenant-safe repositories, application service
boundaries, and real-PostgreSQL integration tests.

B1 explicitly does **not** implement Better Auth (B2), PromotorClass domains
(B3–B5), PromotorFlow domains (B6), or Referral tables (B4.5).

---

## 2. Schema (Drizzle canonical, one migration history)

Location: `apps/platform-api/src/db/schema/`
Migrations: `apps/platform-api/src/db/migrations/` (SQL + journal committed)

| Table | Purpose | Key constraints |
|---|---|---|
| `organizations` | Tenant root | `id` uuid PK, `slug` UNIQUE, name/slug CHECK, `timezone` default `Asia/Jakarta` |
| `users` | Auth identity stub for B2 | `id` uuid PK, `email` partial UNIQUE (`WHERE email IS NOT NULL`) |
| `organization_members` | Membership (Better Auth plugin maps here in B2) | `UNIQUE(organization_id, user_id)`, `role` CHECK (`owner/admin/member`), FK CASCADE both sides |
| `contacts` | Canonical person identity (Shared Core) | `UNIQUE(organization_id, phone_e164) WHERE phone_e164 IS NOT NULL`, E.164 regex CHECK, FK to org `ON DELETE RESTRICT` |
| `product_entitlements` | Which products an org may use | 1:1 unique FK to org, two NOT NULL booleans |

Conventions:
- PKs: `uuid DEFAULT gen_random_uuid()`.
- Timestamps: `timestamptz NOT NULL DEFAULT now()`, UTC by convention; `updated_at` application-maintained.
- Soft delete: `deleted_at` on organizations/users/contacts. A soft-deleted contact's
  phone **stays reserved** (unique index is unconditional on `deleted_at`), so
  `matchOrCreateContact` restores instead of duplicating — one person = one contact_id.
- No triggers, no magic — boring PostgreSQL.

---

## 3. Migration discipline

- Drizzle is the only schema/migration authority. SQL + journal are committed and reviewed.
- `pnpm --filter @promotor/platform-api db:generate` — generate from schema.
- `pnpm --filter @promotor/platform-api db:migrate` — apply (owner role only; reads `DATABASE_URL`).
- The Worker runtime NEVER reads `DATABASE_URL` (source-guard unit test enforces this).
- One migration history owns the database; B2 auth tables join the same history.

---

## 4. Security model

### Two DB identities

```
neondb_owner      migration/owner authority — DDL only, never at runtime.
promotor_runtime  application runtime role — SELECT/INSERT/UPDATE/DELETE only.
                  Used exclusively via env.HYPERDRIVE.connectionString.
```

- `docs/sql/grants_b1.sql` is the committed, auditable grant script
  (role names only — never credentials). Parameterized `:owner_role` so the
  same file works on Neon (`neondb_owner`) and CI (`postgres`).
- `promotor_runtime` receives no DDL, no schema ownership, no CREATEDB/CREATEROLE.
- Request-scoped connections preserved (`withDb`: connect → operate → finally end).
- Hyperdrive primary binding caching remains DISABLED (read-after-write consistency).
- No new public HTTP endpoints in B1 (no auth yet → any org-scoped HTTP surface
  would be an unsafe debug endpoint). Health endpoints remain the only public surface.

### Tenant isolation

- Repositories are org-scoped factories; every query's WHERE includes
  `organization_id` from a server-resolved `OrganizationContext`.
- Application services accept `OrganizationContext` explicitly; B2 will source it
  from the session (never browser input).
- Integration tests prove org B cannot read/update org A data.

---

## 5. Repository & service boundaries

```
src/repositories/  organization-repository, membership-repository,
                   contact-repository, entitlement-repository
src/services/      organization-service, contact-service, entitlement-service
src/core/          organization-context, errors (safe domain error envelope)
```

- `ContactRepository.matchOrCreateContact` implements the canonical match:
  normalize (platform-core) → match `organization_id + phone_e164` (incl. soft-deleted)
  → restore-if-deleted → else insert with `ON CONFLICT DO NOTHING` (DB unique index
  is the final duplicate guard) → re-select winner. Runs in one transaction.
- Phone normalization lives only in `@promotor/platform-core` — no ad-hoc copies.

---

## 6. Test strategy & proof

### Unit (node:test, no DB)
- E.164 normalization invariants, timezone validation, format helpers.
- Source guardrails: runtime src/ never references `DATABASE_URL`;
  `packages/contracts` hash frozen (no B1 contract changes).

### Integration (real PostgreSQL — GH Actions `postgres:16` service)
- All five tables exist; CHECK constraints reject bad phones/slugs/roles.
- Same phone across orgs allowed; same phone same org reuses contact_id.
- Soft-delete → restore preserves contact_id; phone stays reserved.
- Membership unique (org, user); entitlements 1:1 semantics.
- Tenant isolation: cross-org read returns null, cross-org update affects 0 rows.
- Least privilege: runtime role CRUD works; `CREATE TABLE` fails.
- Migration journal present and consistent (owner-role check).

CI runs this suite on every PR/push via `scripts/ci-setup-db.sh`
(creates runtime role, applies migrations as owner, applies grants).

### Live acceptance (Neon — operator-run)
`pnpm --filter @promotor/platform-api b1:live-acceptance` asserts on real Neon:
migration applied, runtime sees tables, CRUD works, DDL forbidden, tenant
isolation, and live Worker `/health` + `/health/db` return 200.

**Rehearse on a Neon branch first; production run is human-approved.**

---

## 7. B2 compatibility

- `users`/`organizations`/`organization_members` are the canonical tables
  Better Auth will map onto (model/field mapping at B2). No duplicate identity tables.
- `contacts` stays domain-owned; Better Auth never writes it.
- B2 auth tables (`sessions`, `accounts`, `verifications`, `organization_invitations`)
  join the same migration history.
- Runtime grants use default privileges, so future tables inherit CRUD automatically.

---

## 8. Explicitly not in B1

Better Auth (sessions/accounts/verifications), PromotorClass domains,
PromotorFlow domains, Referral tables, R2, Queues, payments, public HTTP
integration, frontend changes.
