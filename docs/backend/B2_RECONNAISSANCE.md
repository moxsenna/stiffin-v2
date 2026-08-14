# B2 Reconnaissance — Better Auth on Promotor Platform

**Status:** PLAN ACCEPTED / FROZEN — implementation not started (Phase B in review)
**Date:** 2026-08-14
**Revision:** 3 — source audit PASS + version-pin note
**Base:** master @ `c121f860fa03e5338286483c368e99dbe07add22` (B1 FINAL ACCEPTED / FROZEN)
**Better Auth docs basis:** official better-auth.com, **v1.6 stable track only** (v1.7 beta/RC out of scope).
**Version pin:** Phase C must install and pin the exact stable Better Auth 1.6.x version used for schema reference generation (at time of writing: `better-auth@1.6.28` + the matching `@better-auth/drizzle-adapter` 1.6.x — reconfirm latest stable 1.6.x at implementation start and record it in the Phase C PR; no `auth@latest` floating reference). The `npx auth generate` reference output is generated with that pinned version and never applied — Drizzle/drizzle-kit remains the sole migration authority.
**Scope:** Reconnaissance only. No dependency installed, no schema/migration generated, no grants applied, production Neon untouched, nothing deployed.

---

## Locked review findings honored by this doc

> **L25 — P0:** B2 must explicitly solve Better Auth + Drizzle adapter lifecycle on Cloudflare Hyperdrive.
> Current B1 DB architecture creates a fresh `pg.Client` per request and closes it in `finally`;
> do not introduce a module-global connected pg client. (Addressed: §3 request-scoped runtime design, §11.)

> **Architecture P0:** Better Auth Organization must not bypass Shared Core organization invariants.
> Canonical org creation must continue provisioning `organizations + product_entitlements(false,false)` atomically.
> Better Auth owns auth/session/membership integration; Shared Core owns org lifecycle. (Addressed: §3 ownership decision.)

> **Review surface P1:** This document lives in the repo and is the canonical review artifact.

> **Round 3 final patch (locked):**
> 1. `OrganizationContext` stays minimal (`{ organizationId: string }`, frozen); `AuthenticatedActor` + `AuthContext` are separate auth DTOs.
> 2. Rate limiting is durable: new `auth_rate_limits` table via BA `rateLimit.storage: "database"` — memory-only rejected. B2 = 5 new tables → 20 B2 grants → 40 total CRUD checks.
> 3. Promotor User provisioning is a trusted server-side path (BA User + credential Account + org if needed + entitlements(false,false) + owner membership). No public self-signup, no hand-rolled password hashing.
> 4. BA organization mutation endpoints are explicitly disabled/denied while `/api/auth/*` is mounted; org discovery is app-owned and soft-delete filtered.
> 5. Browser topology locked to same-origin frontend Worker API/auth proxy; no auth cookies scoped to `.workers.dev`.
> 6. Soft-delete checks query the canonical `users` table via the closed-over request-scoped `db` — never assumed via generic adapter behavior; `deleted_at` never exposed as client-editable user data.
> 7. B1 timestamp mode `'string'` vs BA `Date` = IMPLEMENTATION VERIFY GATE (first spike must typecheck + runtime-test reuse). No speculative B1 schema mutation.
> 8. Email verification is a B2/future-auth concern, NOT B4 — B4 learner registration creates Contact + Enrollment, never a Better Auth User.

---

## 1. Current repo state

From exploration of master @ `c121f86` (matches B1 FINAL ACCEPTED state):

- Monorepo: pnpm workspaces (`apps/*`, `packages/*`). API = `apps/platform-api` (Hono on Cloudflare Workers).
- DB: Neon PostgreSQL via Cloudflare Hyperdrive binding `HYPERDRIVE`; driver `pg` (node-postgres) + `drizzle-orm/node-postgres`; request-scoped connections via `withDb()` in `src/db/client.ts` — **no module-global connected client**.
- Drizzle is the sole migration authority: `src/db/migrations/0000_modern_hydra.sql` + `meta/_journal.json` (1 entry, frozen), generated from `src/db/schema/*.ts` (5 tables: `organizations`, `users`, `organization_members`, `contacts`, `product_entitlements`).
- Runtime role `promotor_runtime` has explicit CRUD on exactly the 5 B1 tables (`docs/sql/grants_b1.sql`, no ALTER DEFAULT PRIVILEGES, no DDL). Owner = `neondb_owner` (prod) / `postgres` (CI), DDL only.
- **No Better Auth dependency anywhere yet.** No auth code: only `/health` and `/health/db` routes; `OrganizationContext` is caller-supplied and documented to become session-derived in B2.
- `wrangler.jsonc`: compatibility date `2026-08-13`, flags `["nodejs_compat"]` (already satisfies Better Auth's AsyncLocalStorage requirement).
- CI: `postgres:16` service; `scripts/ci-setup-db.sh` creates role → migrates as owner → applies `grants_b1.sql`; unit (node:test/tsx) + integration (real PG) + builds.
- Contracts: `packages/contracts` frozen (SHA guardrail test). `packages/platform-core` owns `normalizeEmail`/`normalizePhone`.
- Locked decisions: `docs/ADR-001-better-auth-neon-hyperdrive.md`, `docs/BACKEND_STACK_DECISION.md` (authorization chain: user → membership → entitlement → domain permission), `docs/INTEGRATION_CONTRACT.md` §5/§37/§38, `docs/backend/B1_SHARED_CORE.md` §2/§7 (B2 mapping notes, frozen).
- B1 invariant to preserve: new organization MUST be created with `product_entitlements(false,false)` in the same transaction (guaranteed by `createOrganizationService()`); missing row = deny-all.

## 2. Better Auth compatibility matrix (B1 vs BA v1.6 required vs action)

Classification legend: **REUSE + MAP** / **REUSE + PLUGIN MAP** / **NEW B2** / **DEFER** / **COMPATIBLE** / **B2 MIGRATION REQUIRED** / **DO NOT USE** / **IMPLEMENTATION VERIFY GATE** / **UNKNOWN / VERIFY**.

Minimal table-level matrix (locked):

```text
users                  REUSE + MAP            (core User → users)
organizations          REUSE + PLUGIN MAP     (plugin organization → organizations; needs logo/metadata columns)
organization_members   REUSE + PLUGIN MAP     (plugin member → organization_members; single-role only)
sessions               NEW B2
accounts               NEW B2
verifications          NEW B2
invitations            NEW B2 (table created; flows EXPLICITLY DEFERRED to post-V0.1)
auth_rate_limits       NEW B2                 (durable rate limiting; BA rateLimit.storage "database")
```

Field-level matrix:

| Element | B1 current | Better Auth v1.6 required | Class | B2 action |
|---|---|---|---|---|
| `users.id` | uuid PK `DEFAULT gen_random_uuid()` | string id | COMPATIBLE | `advanced.database.generateId: "uuid"` (see UUID row below) |
| `users.name` | text NOT NULL | name (string) | COMPATIBLE | — |
| `users.email` | text NOT NULL + unique index | email | COMPATIBLE | Duplicate email → BA 422 `USER_ALREADY_EXISTS`, backed by DB unique |
| `users.email_verified` | boolean NOT NULL default false | emailVerified boolean | REUSE + MAP | Drizzle adapter maps by property name (`emailVerified` → `email_verified` column); B1 column already correct |
| `users.image` | text NULL | image? | COMPATIBLE | — |
| `users.created_at/updated_at` | timestamptz NOT NULL default now() (mode 'string') | createdAt/updatedAt Date | **IMPLEMENTATION VERIFY GATE** | NOT proven safe yet. The first auth spike must typecheck AND runtime-test reuse of existing `users`/`organizations`/`organization_members` timestamp mappings under BA reads/writes. No B1 schema mutation solely for speculation |
| `users.deleted_at` | timestamptz NULL (soft delete) | — (BA has no soft delete) | COMPATIBLE (with policy) | `user.deleteUser.enabled: false`; `deleted_at` never exposed as client-editable BA user data; soft-delete policy in §7 |
| `organizations.id/name/slug` | uuid PK / text NOT NULL+CHECK / text NOT NULL+CHECK+UNIQUE | id/name/slug | REUSE + PLUGIN MAP | — |
| `organizations.logo` | **absent** | logo? (plugin schema) | **B2 MIGRATION REQUIRED** | Add nullable `logo text` column in B2 migration |
| `organizations.metadata` | **absent** | metadata? (plugin schema) | **B2 MIGRATION REQUIRED** | Add nullable `metadata text` column in B2 migration |
| `organizations.timezone` | text NOT NULL default 'Asia/Jakarta' | — (BA ignores unknown columns) | COMPATIBLE | App-owned; has default so any insert path works |
| `organizations.updated_at/deleted_at` | timestamptz (app-maintained) | — | COMPATIBLE | App-owned; BA org model has no updatedAt |
| `organization_members.id/org_id/user_id` | uuid PK / FK CASCADE / FK CASCADE | member id/userId/organizationId | REUSE + PLUGIN MAP | Plugin `schema.member.modelName: "organization_members"` + Drizzle property names |
| `organization_members.role` | text NOT NULL default 'member', CHECK `IN ('owner','admin','member')` | role string; BA default supports **comma-separated multi-role** | **REUSE + PLUGIN MAP — KEEP SINGLE ROLE (locked)** | See "Role policy" below |
| `organization_members.updated_at` | timestamptz | — | COMPATIBLE | App-owned |
| `organization_members` unique (org, user) | unique index | addMember dedupes (userId, organizationId) | COMPATIBLE | DB unique is final guard |
| `sessions` | **absent** | id, token (unique), userId FK, expiresAt, ipAddress?, userAgent?, createdAt, updatedAt + plugin `activeOrganizationId` (+`activeTeamId` if teams) | **NEW B2** | Exact DDL in §4 |
| `accounts` | **absent** | id, userId FK, accountId, providerId, password?, tokens+expiries, scope?, idToken?, createdAt, updatedAt | **NEW B2** | password = scrypt hash for `credential` provider |
| `verifications` | **absent** | id, identifier, value, expiresAt, createdAt, updatedAt | **NEW B2** | — |
| `organization_invitations` | **absent** | invitation model: id, email, inviterId FK, organizationId FK, role?, status, expiresAt, createdAt | **NEW B2 (table); flows DEFERRED** | Table joins B2 migration per frozen B1 §7; no invitation endpoints/sendInvitationEmail in V0.1 |
| `auth_rate_limits` | **absent** | rate-limit storage model: id, key, count, lastRequest | **NEW B2** | Durable database-backed rate limiting (`rateLimit.storage: "database"`, `modelName: "auth_rate_limits"`). Memory-only rate limiting is **REJECTED**: request-scoped `createAuth()` instances + serverless isolates cannot form a production security boundary. Exact DDL in §4 |
| teams / teamMember | — | optional plugin feature | **DO NOT USE** | V0.1 teams disabled (ADR-001) |
| organizationRole / dynamic access control | — | optional | **DO NOT USE** | V0.1 static roles only |
| UUID generation | DB `gen_random_uuid()` defaults | `advanced.database.generateId` | COMPATIBLE (locked) | `generateId: "uuid"` — **no text IDs may appear in sessions/accounts/verifications/organization_invitations/auth_rate_limits**. Bonus: opaque UUID invitation IDs keep the normal emailed-invitation flow valid when invitations are enabled later |
| email uniqueness | unique index | BA relies on it | COMPATIBLE | — |
| emailVerified naming | `email_verified` | `emailVerified` | REUSE + MAP | Drizzle property naming (no SQL change) |
| soft delete vs BA delete | `deleted_at` on orgs/users/contacts | BA hard delete | COMPATIBLE (with policy) | `disableOrganizationDeletion: true` + `user.deleteUser.enabled: false` (§3, §7) |
| timestamp mode | mode 'string' (B1) | Date objects | **IMPLEMENTATION VERIFY GATE** | Same gate as the `users.created_at` row above; B2 auth tables may use mode 'date' only after the spike proves the B1-table reuse path |
| cookie/session behavior | none | signed `better-auth.session_token` cookie (httpOnly, secure in prod), secret from `BETTER_AUTH_SECRET` | B2 IMPLEMENTATION | Worker **env binding** for secret — Workers has no `process.env` (§7/§11) |
| trusted origins / CORS | none | `trustedOrigins` + explicit CORS origins + credentials | B2 IMPLEMENTATION | §7/§11 |
| Hono/Workers runtime | Hono Worker, nodejs_compat set | `app.all('/api/auth/*', c => auth.handler(c.req.raw))` | COMPATIBLE | Mount per-request auth instance (§3) |
| BA CLI `migrate` | — | Kysely-only; **not supported with Drizzle adapter** | **DO NOT USE** | `npx auth@<pinned 1.6.x> generate` reference-only cross-check to temp output (exact version from the version-pin header — never `auth@latest`); never applied. Drizzle/drizzle-kit stays sole authority |

**Role policy (locked): KEEP SINGLE ROLE for V0.1.**

B1 CHECK allows exactly one of `owner | admin | member`; BA's default multi-role writes comma-separated strings, which would violate the CHECK. Decision:
- B2 V0.1 never writes multi-role values. Enforcement: Shared Core membership services validate against `ORGANIZATION_ROLES`; BA `hooks.before` on membership-mutating paths rejects array/unknown roles; DB CHECK stays unchanged as the final guard.
- Multi-role is a later, explicit decision with its own migration to widen/remove the CHECK (B1 doc already permits this future path). It is NOT enabled in B2 V0.1.

**Verdict:** B1 is deliberately B2-ready. Only 5 new tables + 2 nullable columns on `organizations` are needed. No B1 migration, contract, or grant changes. No proven incompatibility exists that would reopen B1.

## 3. Proposed auth architecture

**Ownership decision (locked):**

```text
Better Auth owns:
- authentication (email/password)
- session lifecycle
- credential account
- verification records
- membership auth integration (mapped set-active + internal reads)

Shared Core remains canonical owner of:
- organization creation semantics
- entitlement provisioning (org + product_entitlements(false,false), one transaction)
- soft-delete organization semantics
- membership writes (add / update role / remove)
- organization discovery (app-owned, soft-delete filtered)
```

Concretely (all official v1.6 options):
- `allowUserToCreateOrganization: false` — direct BA organization creation is **disabled** in V0.1. Canonical org creation path = Shared Core `createOrganizationService()`, extended to create `organizations + product_entitlements(false,false) + owner membership row` in ONE transaction. BA never creates organizations.
- `disableOrganizationDeletion: true` — BA hard-delete organization endpoint disabled (it would hard-delete, conflicting with B1 `deleted_at` soft delete and `contacts` FK RESTRICT).
- `user.deleteUser.enabled: false` — BA user hard delete disabled; user soft delete stays app-owned (§7).
- BA maps onto canonical tables (ADR-001 Decision 2; B1 §7 "No duplicate identity tables"): core user → `users`, session → `sessions`, account → `accounts`, verification → `verifications`; plugin organization → `organizations`, member → `organization_members`, invitation → `organization_invitations`.
- `set-active` goes through BA's mapped plugin with server-side validation (§5); membership **writes** go through Shared Core services only.

Rationale (not convenience): Shared Core ownership is fixed by INTEGRATION_CONTRACT §5 and ADR-001; the entitlement provisioning invariant is B1-frozen; BA endpoints that hard-delete or create bare orgs would compete with those invariants. Zero data migration — only additive DDL joins the single Drizzle history.

**Promotor User provisioning (locked — trusted path with self-signup OFF and invitations OFF):**

Since sign-in is ON but public self-signup and invitations are OFF, the platform needs an explicit trusted path that creates the first/new Promotor User. The provisioning operation MUST produce ALL of:

1. Better Auth User (`users` row)
2. credential Account (BA-owned scrypt password hashing/storage)
3. Shared Core Organization if needed
4. `product_entitlements(false,false)` in the same transaction as the org
5. owner membership row

Constraints:
- **Never** manually reproduce Better Auth password hashing or account storage internals. Use a supported server-side BA path — `auth.api.signUpEmail` invoked server-side on the request-scoped BA instance, or the documented internal-adapter equivalent — with the exact mechanism VERIFIED during the implementation spike.
- No public self-signup. The provisioning surface is trusted server-side only (operator/tooling/future admin); never public HTTP in V0.1.

**BA organization endpoint lockdown (locked):**

"APP-ONLY" is not sufficient while `/api/auth/*` is mounted. Every BA organization mutation endpoint that competes with Shared Core is explicitly disabled/denied:

| Endpoint | Disposition |
|---|---|
| `/organization/create` | disabled (`allowUserToCreateOrganization: false`) |
| `/organization/update` | denied in `hooks.before` |
| `/organization/delete` | disabled (`disableOrganizationDeletion: true`) |
| `/organization/invite-member` | denied (invitations deferred) |
| `/organization/accept-invitation` | denied (invitations deferred) |
| `/organization/cancel-invitation` | denied (invitations deferred) |
| `/organization/reject-invitation` | denied (invitations deferred) |
| `/organization/add-member` | denied (Shared Core service owns writes) |
| `/organization/remove-member` | denied |
| `/organization/update-member-role` | denied |
| `/organization/leave` | denied |

Enforcement: BA `hooks.before` (403) plus config flags where v1.6 provides them (`allowUserToCreateOrganization`, `disableOrganizationDeletion`, `user.deleteUser.enabled`); integration tests assert each denied endpoint returns 403/404 and mutates nothing (§10).

Remaining exposed BA org functionality (explicitly approved): `set-active` (with server-side membership + active-org validation, §5) and internal mapped reads used only by the resolver.

**Organization discovery:** raw BA organization list/member read endpoints are NOT exposed as canonical Shared Core discovery — they can include soft-deleted organizations. Canonical discovery is app-owned and filtered (`deleted_at IS NULL`): `GET /api/me` plus future app-owned org endpoints.

**Request-scoped runtime design (locked — L25 P0):**

No module-global connected pg client, no module-global auth instance bound to a live DB. Concrete pattern (Hono middleware wrapping the B1 request-scoped lifecycle):

```ts
// future src/app.ts shape (conceptual; implementation is post-approval)
app.use('*', async (c, next) => {
  const client = new Client({ connectionString: c.env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    const db = drizzle(client);
    const auth = createAuth(db, c.env);   // fresh Better Auth instance per request
    c.set('db', db);
    c.set('auth', auth);
    await next();
  } finally {
    await client.end();                    // B1 discipline preserved
  }
});

app.all('/api/auth/*', (c) => c.get('auth').handler(c.req.raw));
```

- `createAuth(db, env)` is a pure factory: `betterAuth({ database: drizzleAdapter(db, { provider: 'pg', schema }), secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL, ... })` with all v1.6 decisions from this doc baked in. Config object rebuilt per request — acceptable cost; no state leaks between requests.
- The request-scoped `db` is available in the factory closure for soft-delete checks (§7) — never via assumptions about generic adapter behavior.
- Secrets/baseURL come from **Worker env bindings** (`env.BETTER_AUTH_SECRET`, `env.BETTER_AUTH_URL`), not `process.env` (Workers has none) and never from `DATABASE_URL` (source-guardrail extends to `src/auth/`).
- Rejected alternative: pg `Pool` + module-scope `betterAuth({ database: drizzleAdapter(globalDb) })` — violates B1 request-scoped discipline and Cloudflare Hyperdrive per-request client guidance. Noted as a future perf experiment only if profiling demands it.

Module layout (future implementation, for reference):

```text
apps/platform-api/src/auth/
  config.ts               # createAuth(db, env) factory (all V0.1 decisions)
  schema.ts               # B2 drizzle tables wired to BA models
  session-middleware.ts   # session → AuthContext (soft-delete revalidation)
  organization-context.ts # authoritative resolver (hint → live membership)
  entitlements.ts         # entitlement gate (missing row = deny)
  permissions.ts          # role → domain action map (owner/admin/member)
  provisioning.ts         # trusted server-side Promotor User provisioning
```

## 4. Exact data model (B2 additions — no migrations generated yet)

All additions follow B1 conventions (uuid PK `DEFAULT gen_random_uuid()`, timestamptz). **UUID strategy locked: `advanced.database.generateId: "uuid"`; every new table's PK and FK columns are `uuid` — no text IDs.** Auth-owned tables use Drizzle timestamp mode `'date'` (BA-native Dates); B1 tables unchanged.

**New table `sessions`** (BA core + org plugin):
- `id` uuid PK defaultRandom
- `token` text NOT NULL, UNIQUE index `sessions_token_unique`
- `user_id` uuid NOT NULL, FK → `users.id` ON DELETE CASCADE
- `expires_at` timestamptz NOT NULL
- `ip_address` text NULL, `user_agent` text NULL
- `active_organization_id` uuid NULL, FK → `organizations.id` ON DELETE SET NULL (plugin field; hint only — §5)
- `active_team_id` text NULL — include only if the v1.6 reference schema requires it with teams disabled; else omit (VERIFY at implementation)
- `created_at` / `updated_at` timestamptz NOT NULL DEFAULT now()
- index `sessions_user_id_idx` on (`user_id`)

**New table `accounts`**:
- `id` uuid PK defaultRandom
- `user_id` uuid NOT NULL, FK → `users.id` ON DELETE CASCADE
- `account_id` text NOT NULL, `provider_id` text NOT NULL (`credential` for email/password)
- `password` text NULL (scrypt hash), `access_token` text NULL, `refresh_token` text NULL
- `access_token_expires_at` timestamptz NULL, `refresh_token_expires_at` timestamptz NULL
- `scope` text NULL, `id_token` text NULL
- `created_at` / `updated_at` timestamptz NOT NULL DEFAULT now()
- index `accounts_user_id_idx` on (`user_id`); composite uniqueness (user_id, provider_id) → UNKNOWN/VERIFY against BA multi-account semantics (do not add unless verified)

**New table `verifications`**:
- `id` uuid PK defaultRandom
- `identifier` text NOT NULL, `value` text NOT NULL
- `expires_at` timestamptz NOT NULL
- `created_at` / `updated_at` timestamptz NOT NULL DEFAULT now()
- index `verifications_identifier_idx` on (`identifier`)

**New table `organization_invitations`** (created now per frozen B1 §7; flows DEFERRED):
- `id` uuid PK defaultRandom
- `organization_id` uuid NOT NULL, FK → `organizations.id` ON DELETE CASCADE
- `email` text NOT NULL
- `role` text NULL
- `status` text NOT NULL (BA values `pending | accepted | rejected | canceled` — VERIFY exact enum at implementation)
- `expires_at` timestamptz NOT NULL
- `inviter_id` uuid NOT NULL, FK → `users.id` ON DELETE CASCADE (nullability VERIFY against BA types)
- `created_at` timestamptz NOT NULL DEFAULT now()
- indexes: `organization_invitations_org_idx` (organization_id), `organization_invitations_email_idx` (email)

**New table `auth_rate_limits`** (BA durable rate-limit storage):
- `id` uuid PK defaultRandom — **UUID PK if compatible with the final generated v1.6 reference; if the reference requires otherwise, follow the reference exactly (VERIFY at implementation)**
- `key` text NOT NULL, unique index `auth_rate_limits_key_unique` (VERIFY against reference)
- `count` integer NOT NULL
- `last_request` bigint NOT NULL (epoch ms; VERIFY exact type against reference)
- config: `rateLimit.storage: "database"`, `modelName: "auth_rate_limits"`

**ALTER `organizations`** (B2 migration only — B1 migration file untouched):
- `ADD COLUMN logo text` NULL
- `ADD COLUMN metadata text` NULL
- Rationale: plugin schema references both; nullable keeps Shared Core ownership (metadata is display-only, never read for authorization).

**No changes to:** `users`, `organization_members`, `contacts`, `product_entitlements`, B1 migration `0000_modern_hydra.sql`, `grants_b1.sql`.

**Not added (V0.1):** teams/teamMember, organizationRole, `active_team_id` (unless BA requires).

**Migration mechanics:** hand-write Drizzle tables in `src/db/schema/{sessions,accounts,verifications,organization-invitations,auth-rate-limits}.ts` + extend `organizations.ts`, then `pnpm --filter @promotor/platform-api db:generate` → `0001_*.sql` joins the existing journal. Cross-check with `npx auth@1.6.x generate --output <temp>` (exact pinned stable 1.6.x from the version-pin header — never `auth@latest`) as reference only; never `auth migrate` (unsupported with Drizzle adapter; prohibited as competing authority).

## 5. OrganizationContext design

Authoritative resolution — fresh membership read on every authenticated request. **`session.activeOrganizationId` is a selection HINT ONLY, never authorization proof.** Locked chain:

```text
session.userId
  → selected activeOrganizationId (hint)
  → query membership for that user + org
  → reject deleted org / deleted user
  → resolve AuthenticatedActor + OrganizationContext
  → load ProductEntitlements
  → domain authorization
```

Never: `session.activeOrganizationId → trust directly → query tenant data`.

**Context types (locked — B1 OrganizationContext stays FROZEN/minimal):**

B1 `OrganizationContext` is NOT extended. It remains exactly:

```ts
interface OrganizationContext {
  organizationId: string;
}
```

Tenant context must not become an auth/session DTO. Auth-specific concepts are separate, new types in `src/auth/`:

```ts
interface AuthenticatedActor {
  userId: string;
  membershipId: string;
  role: OrganizationRole; // owner | admin | member (single role)
}

interface AuthContext {
  actor: AuthenticatedActor;
  organization: OrganizationContext | null;
  entitlements: { promotorClass: boolean; promotorFlow: boolean } | null;
  session: Session; // BA session record
}
```

```
request
  → BA getSession (signed cookie, expiry, session row)          [401 if none]
  → users.deleted_at IS NULL check                              [403 if soft-deleted]
  → read sessions.active_organization_id  (HINT ONLY)
  → resolve:
      if hint set:
        SELECT om.* FROM organization_members om
        JOIN organizations o ON o.id = om.organization_id AND o.deleted_at IS NULL
        WHERE om.user_id = :userId AND om.organization_id = :hint
        → row:    AuthenticatedActor { userId, membershipId, role }
                  + OrganizationContext { organizationId }
        → no row: stale/invalid → context null → 403 ORG_CONTEXT_INVALID
                  (optional lazy cleanup of the session hint)
      if hint null:
        count active memberships
          0 → context null (no organization)
          1 → resolve that membership (auto-select; set hint server-side for UX)
          >1 → context null; client must POST /organization/set-active;
               server never guesses
  → entitlements: SELECT ... FROM product_entitlements WHERE organization_id = :orgId
      row present → { promotorClass, promotorFlow }
      row missing  → deny-all (B1 invariant)
  → return AuthContext { actor, organization, entitlements, session }
```

Edge-case matrix (must be tested, §10):

| Case | Behavior |
|---|---|
| unauthenticated | 401 |
| one user, multiple orgs | no org until set-active; explicit switch via BA set-active |
| invalid/stale selected org (membership removed) | 403 ORG_CONTEXT_INVALID; context null |
| removed membership | same as stale (fresh membership read each request) |
| soft-deleted organization | excluded by JOIN; 403 |
| soft-deleted user | 403 (policy in §7) |
| entitlement row absent | context resolves but entitlement gate denies (deny-all) |
| forged organization input (body/query/header) | ignored — never read for resolution |
| set-active to org user doesn't belong to | rejected via `hooks.before` server-side check: authenticated user + membership exists + `organization.deleted_at IS NULL` |

B1 `OrganizationContext` stays exactly `{ organizationId: string }` — frozen, unchanged. `AuthenticatedActor` and `AuthContext` are new B2 types; the resolver returns `AuthContext`. B1 repositories/services keep accepting the minimal `OrganizationContext` unchanged; B2 middlewares consume the richer `AuthContext`.

## 6. Authorization chain

```text
Authenticated session (BA)
  → active user (not soft-deleted)
  → membership (live row, role ∈ {owner, admin, member}, single role)
  → active organization (server-resolved)
  → product entitlement (per-product boolean; missing row = deny)
  → domain permission (role → action map per product)
  → route handler
```

Hono middleware composition:
- `sessionMiddleware` → sets `AuthContext` (401 if none; 403 if user/org soft-deleted)
- `requireOrganization` → 403 `ORG_CONTEXT_REQUIRED` / `ORG_CONTEXT_INVALID`
- `requireEntitlement('promotorClass' | 'promotorFlow')` → 403 `ENTITLEMENT_DENIED`
- `requireRole(['owner','admin'])` → 403 `FORBIDDEN` (reuses `DomainError` codes)

No domain routes exist yet (B3+); B2 ships the boundary + a `GET /api/me` context endpoint (phase 2 of implementation) proving the chain end-to-end.

## 7. Session / cookie / security model + V0.1 surface + soft-delete policy

**Session/cookie:**
- Cookie: `better-auth.session_token`, httpOnly, secure in production, SameSite=Lax (VERIFY exact v1.6 default), signed with `BETTER_AUTH_SECRET` (Worker secret binding).
- Sessions: DB-backed `sessions` table; `expiresIn` 7d default, `updateAge` 1d sliding refresh; `freshAge` default for sensitive ops.
- Logout: BA `POST /sign-out` deletes session row + clears cookie. Password change revokes other sessions (`revokeOtherSessions: true`).
- CSRF: BA origin check + fetch-metadata checks enabled (never disabled).
- Rate limiting: **durable, database-backed** (`rateLimit.storage: "database"`, `modelName: "auth_rate_limits"`, §4) with `rateLimit.customRules` on `/sign-in/*` and other auth-sensitive paths. Memory-only rate limiting is **REJECTED**: request-scoped `createAuth()` instances + serverless isolates cannot form a production security boundary.
- CORS: Hono `cors` with explicit origins + `credentials: true` on `/api/auth/*`; same origins in BA `trustedOrigins`. `baseURL` set explicitly from `env.BETTER_AUTH_URL` (no request inference — BA recommends against it).

**Browser cookie topology (locked — decided before B2 freeze): Option B — same-origin frontend Worker API/auth proxy.**

- Each frontend Worker (PromotorClass and PromotorFlow) reverse-proxies `/api/*` (including `/api/auth/*`) to the platform-api Worker, forwarding request cookies and response `Set-Cookie` headers verbatim.
- The browser only ever sees first-party cookies on the frontend origin. **No auth cookies are ever scoped to `.workers.dev`** (that would expose the token to every workers.dev tenant).
- platform-api remains the canonical auth/API authority; `trustedOrigins` lists the frontend origins; `crossSubDomainCookies` stays disabled.
- Request/cookie path: browser → frontend Worker (first-party `better-auth.session_token` on frontend origin) → proxy fetch to platform-api with the cookie → platform-api validates via Hyperdrive/Neon → `Set-Cookie` flows back verbatim through the proxy.
- Direct server-to-server callers (tooling, tests, future internal services) call platform-api directly with explicit cookie handling.
- Option A (shared custom-domain site) is deferred and documented as a later option if a unified product domain is introduced; it is not required for V0.1.

**Auth surface V0.1 (locked — product policy decided explicitly, not by BA defaults):**

| Capability | V0.1 | Mechanism / note |
|---|---|---|
| email/password sign-in | **ON** | `emailAndPassword.enabled: true` |
| self sign-up | **OFF** | `emailAndPassword.disableSignUp: true`. Public learner registration (B4) creates Contact + Enrollment, NOT a Better Auth User; platform User creation is trusted server-side provisioning only (§3) |
| sessions (create/refresh/expiry) | **ON** | DB-backed; 7d/1d defaults |
| logout / revoke sessions | **ON** | `/sign-out`, `revokeSessions` |
| password change | **ON** | `changePassword` with `revokeOtherSessions: true` |
| password reset | **OFF (deferred)** | no `sendResetPassword` in V0.1 |
| email verification | **OFF (deferred)** | Platform User email verification is a B2/future-auth concern — NOT tied to B4 learner registration |
| organization selection (set-active) | **ON (validated)** | set-active validated server-side (user + membership + active org); org LIST via app-owned filtered endpoint, not raw BA list |
| membership reads | **APP-OWNED (filtered)** | app-owned endpoints read canonical tables with `deleted_at IS NULL`; raw BA read endpoints not exposed in V0.1 |
| membership writes (add / update role / remove) | **APP-ONLY + BA ENDPOINTS DENIED** | Shared Core services; BA mutation endpoints explicitly denied (§3 lockdown) |
| organization creation (via BA) | **OFF** | `allowUserToCreateOrganization: false`; Shared Core service canonical |
| organization deletion | **OFF** | `disableOrganizationDeletion: true`; soft delete app-owned |
| invitations | **OFF (deferred)** | table exists (B1 §7); endpoints denied; no `sendInvitationEmail` |
| social login | **OFF** | no `socialProviders` configured |
| user deletion (BA) | **OFF** | `user.deleteUser.enabled: false`; soft delete app-owned |
| teams / dynamic roles | **OFF** | plugin features disabled (ADR-001) |
| durable rate limiting | **ON** | `auth_rate_limits` database storage (§4) |

**Soft-deleted user policy (locked):**

BA's generic adapter does NOT understand Shared Core's `deleted_at`. All soft-delete checks query the canonical `users` table directly using the request-scoped `db` held in the `createAuth(db, env)` closure — never by assuming BA's user model sees or filters the column. A `deleted_at IS NOT NULL` user must become unable to: (a) sign in, (b) create new sessions, (c) continue using old sessions. Enforced in four layers:

1. **Sign-in block:** `hooks.before` on `/sign-in/*` → `SELECT deleted_at FROM users WHERE email = :email` via the closed-over `db` → if the only matching row is deleted, respond generic invalid-credentials (no user enumeration).
2. **New-session block:** `databaseHooks.session.create.before` → `SELECT deleted_at FROM users WHERE id = :userId` via closed-over `db` → `return false` if set.
3. **Old-session death (authoritative):** the Shared Core soft-delete service sets `deleted_at` AND deletes `sessions WHERE user_id = :id` in ONE transaction — old sessions die immediately; BA getSession fails on the missing row.
4. **Defense in depth:** `sessionMiddleware` revalidates `deleted_at` from the canonical table on every domain request.

`deleted_at` is NEVER exposed as `user.additionalFields` or any client-editable BA user data. It stays an invisible, Shared Core-owned column outside BA's API surface.

## 8. Migration strategy

- One canonical Drizzle history: `0000_modern_hydra.sql` (frozen) + new `0001_*.sql` from `db:generate`.
- Drizzle/drizzle-kit remains the only migration authority. Better Auth CLI: `generate` = reference-only cross-check (temp file, never committed/applied); `migrate` = never used.
- Apply as owner (`DATABASE_URL` = owner role, tooling-only; runtime never reads it — extend the source-guardrail test to `src/auth/`).
- Then apply `docs/sql/grants_b2.sql` (owner, `ON_ERROR_STOP=1`).
- B2 live acceptance asserts: journal hash match, 5 new tables + 2 new columns present, grants complete (20 new privilege checks), runtime CREATE still denied, B1 20/20 still passing, tenant isolation with auth context.
- Rehearse on a Neon branch; production run human-approved; audit record per B1 rule (§9/§12).

## 9. Grants strategy

New file `docs/sql/grants_b2.sql` (successor to frozen `grants_b1.sql`; role names only, no credentials):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.verifications TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_invitations TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_rate_limits TO promotor_runtime;
```

- `grants_b1.sql` remains byte-for-byte unchanged.
- `scripts/ci-setup-db.sh` runs both files (fail-fast).
- NO `ALTER DEFAULT PRIVILEGES`, no DDL, no ownership for `promotor_runtime`.
- Column additions to `organizations` need no new grants (table-level).
- Live acceptance: **20 B1 + 20 B2 = 40 `has_table_privilege` checks** (B2 = 5 tables × 4 privileges).

## 10. Test strategy

Unit (node:test, no DB):
- Auth config guardrails: runtime `src/` (incl. `src/auth/`) never references `DATABASE_URL`; secrets come from env bindings.
- Permission map: role → allowed actions (owner/admin/member, single role).
- Context resolver decision logic (mocked membership/entitlement results): null hint + 0/1/N memberships; stale hint; deleted org/user; `AuthContext`/`AuthenticatedActor` shapes (B1 `OrganizationContext` unchanged).
- Cookie/CORS config assertions (secure flags, explicit origins, `disableSignUp: true`, delete endpoints disabled flags).
- Role policy: multi-role array rejected by service validation.
- Provisioning: trusted path produces user + account + org + entitlements + owner membership; no hand-rolled password hashing.

Integration (real PostgreSQL, CI service, runtime role):
1. authentication success (sign-in correct password → session + cookie)
2. authentication failure (wrong password → 401)
3. session creation (row in `sessions`, token unique)
4. session expiration (expired token → 401)
5. logout (session row deleted, cookie cleared)
6. duplicate email (provisioning path in test env → 422, DB unique backs it)
7. membership resolution (active org → context + role)
8. multi-org user (no hint + multiple memberships → null context; set-active switches)
9. cross-tenant denial (user A context cannot read org B data)
10. removed membership (mid-session removal → 403 on next request)
11. entitlement deny (org `promotor_class=false` / missing row → 403 on Class route)
12. soft-deleted user: sign-in denied, new session aborted, old session purged → 401
13. soft-deleted org → 403
14. unauthenticated request → 401
15. forged organization input (body `organizationId` ignored; set-active to non-member org rejected)
16. single-role enforcement: comma/multi-role writes rejected (CHECK + service + hook)
17. org creation via BA disabled; Shared Core creation provisions org + entitlements(false,false) + owner membership atomically (one tx)
18. runtime least privilege (CRUD on 5 new tables works; CREATE TABLE still denied; 40/40 privilege checks)
19. migration from existing B1 (apply `0001` over `0000` with seeded B1 data; journal consistent)
20. migration from blank DB through full history (`0000` → `0001`; hash checks)
21. durable rate limiting (`auth_rate_limits` rows written on auth attempts; limits enforced across requests — proves no per-isolate memory state)
22. BA org mutation endpoint lockdown (each denied endpoint in §3 returns 403/404 and mutates nothing)
23. trusted provisioning path end-to-end (user + credential account + org + entitlements + owner membership, one logical operation)

## 11. Cloudflare runtime considerations

- `nodejs_compat` already enabled (BA needs AsyncLocalStorage) — verified in `wrangler.jsonc`.
- **Request-scoped lifecycle (locked):** every request creates `pg.Client(HYPERDRIVE.connectionString)` → connect → `drizzle(client)` → `createAuth(db, env)` → serve (`/api/auth/*` via `auth.handler`, domain routes via ctx vars) → `finally client.end()`. No module-global connected client or DB-bound auth instance (§3).
- `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` as Worker secret bindings (no `process.env` on Workers).
- `trustedOrigins`: frontend Worker origins (topology B, §7) + localhost dev origins (explicit list; wildcards only for preview patterns if needed). No `crossSubDomainCookies`.
- Browser topology: same-origin frontend Worker proxy (option B, §7) — platform-api stays canonical; no cookies scoped to `.workers.dev`.
- Hyperdrive caching stays disabled (read-after-write for sessions and `auth_rate_limits`).
- Rate limiting: database-backed `auth_rate_limits` — durable across isolates; memory-only rejected (§7).
- Bundle: BA ESM imports; `wrangler deploy --dry-run` in CI verifies.
- Health endpoints unchanged; `/api/auth/*` is the only new public surface.
- Per-request BA instance construction cost: accepted; pg Pool alternative noted as future perf experiment only.

## 12. Risks / unresolved questions

| # | Risk | Severity | Mitigation / status |
|---|---|---|---|
| 1 | workers.dev cross-site cookies + Safari ITP break browser login | High | LOCKED: topology B (same-origin frontend Worker proxy) for V0.1 — first-party cookies, ITP-safe per official BA guidance; shared custom domain (A) deferred |
| 2 | BA multi-role comma format vs B1 role CHECK | Medium | Locked: KEEP SINGLE ROLE; hooks + service + CHECK enforcement; widening is a separate future decision |
| 3 | Timestamp mode 'string' (B1 tables) vs BA Date writes | **IMPLEMENTATION VERIFY GATE** | First spike typechecks + runtime-tests B1-table reuse before B2 freeze; no speculative B1 schema mutation |
| 4 | Per-request BA instance cost | Low | Accepted; Pool alternative documented |
| 5 | Rate-limit table write per auth request (Hyperdrive latency) | Low | `customRules` scoped to auth-sensitive paths only; durable enforcement outweighs the write cost |
| 6 | `set-active` validation inside BA (does it check membership?) | Medium | Enforce via `hooks.before` server-side regardless: user + membership + active org |
| 7 | Invitation status enum / inviter FK nullability / active_team_id / rate-limit PK type | Low | VERIFY against v1.6 reference schema at implementation (`auth generate` cross-check) |
| 8 | BA delete endpoints vs B1 soft-delete semantics | Medium | Locked: org deletion + user deletion disabled; app-owned soft delete |
| 9 | accounts (user_id, provider_id) uniqueness assumptions | Low | Plain index; verify BA multi-account semantics before any composite unique |
| 10 | `logo`/`metadata` columns expose BA-managed fields into Shared Core | Low | Nullable, app-auditable; metadata never trusted for authorization |
| 11 | Session hint cleanup on stale org (write on read path) | Low | Optional lazy cleanup; resolver denial is authoritative regardless |
| 12 | BA org plugin endpoints bypassing Shared Core services | Medium | Locked: mutation endpoints explicitly disabled/denied (§3 lockdown); org discovery app-owned + soft-delete filtered |
| 13 | Production audit trail (B1 rule) | High (process) | Release gate in §13; audit record mandatory |
| 14 | Trusted provisioning path uses a BA mechanism that conflicts with `disableSignUp: true` | Medium | VERIFY in spike: server-side `auth.api.signUpEmail` on a dedicated internal config vs internal adapter; must be a supported, documented BA path |

## 13. Detailed implementation plan (future, post-review)

Phase A — Recon doc (PR 1): this repo doc; nothing else. Review gate.

Phase B — Schema + grants (PR): B2 drizzle tables (incl. `auth_rate_limits`), `organizations.logo/metadata`, `db:generate` → `0001_*.sql`, `grants_b2.sql` (20 B2 grants), `ci-setup-db.sh` update, integration tests for new tables + least privilege (40 checks) + migration-from-B1/blank.

Phase C — Auth core (PR): deps `better-auth` + `@better-auth/drizzle-adapter` (v1.6 stable pinned), `src/auth/*` (per-request factory, schema wiring, Hono mount + middleware lifecycle, CORS, session middleware, context resolver), Worker secret bindings, `GET /api/me`, source-guardrail extension, single-role + soft-delete hooks. **Includes the IMPLEMENTATION VERIFY GATE spike**: typecheck + runtime-test B1-table timestamp reuse and the trusted provisioning mechanism (§2/§3/§12) before anything else lands.

Phase D — Authorization + hardening (PR): entitlement/role middlewares, `hooks.before` set-active membership check, BA org endpoint lockdown (§3) with per-endpoint deny tests, disable flags verification (`disableSignUp`, `disableOrganizationDeletion`, `deleteUser.enabled: false`), durable rate-limit rules, full security test matrix (§10 cases 1–23).

Phase E — Rehearsal + docs (PR): `tooling/b2-live-acceptance.ts`, Neon branch rehearsal record, release audit template (B1 rule: milestone, approved source SHA, operator/logical actor, UTC timestamp, target environment, migration names + hashes, grant script/version, preflight, postflight, deployed Worker source SHA/version; never credentials), finalize `docs/backend/B2_AUTH.md` milestone doc.

Production release gate: rehearsal on Neon branch → human approval → owner-role migration (audit record per B1 rule) → grants → deploy Worker from approved SHA → live acceptance.

## 14. Recommended PR breakdown

1. **PR 1 — `docs/b2-reconnaissance`**: this document itself (`docs/backend/B2_RECONNAISSANCE.md`, full content). Lands FIRST — the canonical review surface in the repo. No code.
2. **PR 2 — `feat/b2-auth-schema-grants`**: schema files + `0001_*.sql` migration + `grants_b2.sql` + CI setup update + integration tests (tables, grants, migration-from-B1, migration-from-blank). No app code.
3. **PR 3 — `feat/b2-auth-core`**: BA + drizzle adapter deps (v1.6 pinned); `src/auth/` (per-request factory, handler, middleware, resolver); Hono mount; CORS; `/api/me`; verify-gate spike; unit tests.
4. **PR 4 — `feat/b2-auth-authorization`**: entitlement/role gates; endpoint lockdown; hooks (set-active validation, sign-in/session soft-delete guards, role policy); durable rate limiting; security test matrix; disable-flag verification.
5. **PR 5 — `feat/b2-rehearsal-tooling`**: live-acceptance tooling, rehearsal record, release audit template, `docs/backend/B2_AUTH.md` milestone doc.
