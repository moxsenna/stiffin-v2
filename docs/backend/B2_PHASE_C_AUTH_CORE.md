# B2 Phase C — Auth Core

**Status:** B2 PHASE C AUTH CORE — FINAL ACCEPTED / FROZEN
**Date:** 2026-08-15
**Frozen source head:** `18dc9996c832fdbc83b8f4dc2061b50b833fbb96`
**Base:** master @ `b1ddb6f4c0f58f172ea2a6f402ad3dc7b17f0bb8`
**Branch:** `feat/b2-auth-core`
**Recon basis:** `docs/backend/B2_RECONNAISSANCE.md` (PLAN ACCEPTED / FROZEN)
**Option C (unchanged):** Phase C remains UNMERGED; Phase D stacks on the frozen Phase C head. Master receives neither C nor D until Phase D review passes.

---

## 1. Gate results

### C0 — Dependency gate: PASS

```json
"better-auth": "1.6.28",
"@better-auth/drizzle-adapter": "1.6.28",
"drizzle-orm": "^0.45.2",
"@better-auth/utils": "0.4.2"   // BA-owned password hashing primitive
```

- Better Auth packages are **exact pins** (no caret).
- drizzle-orm resolved `0.45.2` (peer `^0.45.2`).
- `pnpm install --frozen-lockfile` PASS; typecheck PASS; unit 15/15; build PASS.
- **drizzle-kit unchanged: 0.30.6** (no bump — BA peers on drizzle-orm, not drizzle-kit; `drizzle-kit` is only used by our own `db:generate`, and no migration was generated in Phase C).
- **Regression note:** drizzle-orm 0.45.2 wraps pg errors in `DrizzleQueryError` (pg code moves to `error.cause.code`). The B1/B2 integration tests were updated with a version-tolerant `pgErrorCode()` helper in `test-env.ts` — **no schema or migration change**. 36/36 B1+B2 integration green.

### C0.1 — Timestamp reuse gate: PASS

Integration spike against real PostgreSQL 16 with the pinned 1.6.28 adapter and the canonical B1 schema (`mode: 'string'` timestamps):

1. BA reads an existing canonical `users` row; `created_at`/`updated_at` map to valid `Date`s (no Invalid Date / string coercion).
2. BA writes a `sessions` row (Date `expires_at`) linked to the canonical user; round-trips valid.
3. `organizations` + `organization_members` reuse works with plugin mappings (single role preserved).
4. Sign-in through BA's real HTTP handler + signed cookie resolves the session; session row exists in canonical `sessions`.
5. **No B1 schema mutation required** — all `created_at`/`updated_at` remain `timestamptz`, Drizzle `mode: 'string'` untouched.

**Wiring discovery (proven by the pinned adapter source):** the Drizzle adapter resolves models by the resolved model name and field names by the Drizzle **property** names. The canonical schema map is keyed by plural table names (`users`, `sessions`, …) with BA `modelName` set; `fields` maps BA field → Drizzle property (`userId: 'userId'`, `expiresAt: 'expiresAt'`, …).

### C0.2 — Trusted provisioning gate: PASS

- `auth.api.signUpEmail` **respects** `disableSignUp: true` → throws `EMAIL_PASSWORD_SIGN_UP_DISABLED` (verified by integration test). It cannot serve trusted provisioning.
- The supported server-side path is the **internal adapter** (`createInternalAdapter` from `better-auth/db`), which uses Better Auth's own password hashing (`@better-auth/utils/password`). No hand-written scrypt, no copied BA hash code, no direct credential INSERT with a plaintext password.
- Proven: provisioned user (users row + credential account with BA hash) can sign in via the real endpoint; stored password is a hash.

## 2. Implementation

### New files

| Path | Purpose |
|---|---|
| `src/auth/types.ts` | `AuthenticatedActor`, `AuthContext`, `AuthEntitlements`; re-exports frozen `OrganizationContext` |
| `src/auth/schema.ts` | Canonical Drizzle schema map (`authSchema`) + `MODEL_NAMES` + `FIELD_MAPS` |
| `src/auth/create-auth.ts` | `createAuth(db, env)` request-scoped Better Auth factory (all V0.1 config) |
| `src/auth/context-resolver.ts` | `resolveAuthContext` — authoritative OrganizationContext resolution + entitlements read |
| `src/auth/provisioning.ts` | `provisionPromotorUser` — trusted BA-internal-adapter provisioning |
| `src/auth/errors.ts` | `AuthError` (extends `DomainError`; adds `ORG_CONTEXT_*` codes) |
| `src/auth/session-middleware.ts` | `authLifecycle` (request-scoped pg Client + db + auth) and `sessionMiddleware` |
| `docs/backend/B2_PHASE_C_AUTH_CORE.md` | this document |

### Modified files

| Path | Change |
|---|---|
| `src/app.ts` | mounts `/api/auth/*` via auth lifecycle, CORS on auth surface, `GET /api/me` |
| `src/env.ts` | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` bindings |
| `src/db/schema/index.ts` | (unchanged) — no new schema |
| `src/__tests__/integration/test-env.ts` | added `pgErrorCode()` (drizzle-orm 0.45.2 error wrapping) |
| `src/__tests__/integration/{b2-auth-schema,shared-core}.integration.test.ts` | use `pgErrorCode` for error-code assertions |
| `src/__tests__/source-guardrails.test.ts` | added `src/auth` must never reference `process.env` |
| `apps/platform-api/package.json` | pinned BA deps + drizzle-orm bump + `@better-auth/utils` |
| `wrangler.jsonc` | `BETTER_AUTH_URL` var (name only; secret stays in Worker secret binding) |
| `pnpm-lock.yaml` | regenerated |

### DB mapping (frozen recon §3)

```
user        -> users                (modelName 'users')
session     -> sessions             (modelName 'sessions')
account     -> accounts             (modelName 'accounts')
verification-> verifications        (modelName 'verifications')
organization-> organizations        (plugin schema modelName)
member      -> organization_members (plugin schema modelName)
invitation  -> organization_invitations (plugin schema modelName)
rateLimit   -> auth_rate_limits     (rateLimit.modelName)
```

- `advanced.database.generateId = "uuid"` — UUID ids throughout.
- Teams OFF, dynamic access control OFF, `experimental.joins` OFF.
- `emailAndPassword.enabled: true`, `disableSignUp: true`.
- `user.deleteUser.enabled: false`.
- `organization({ allowUserToCreateOrganization: false, disableOrganizationDeletion: true })`.
- `rateLimit: { storage: 'database', modelName: 'auth_rate_limits' }` — durable DB rate limiting.
- No social providers, no password reset email, no invitations, no crossSubDomainCookies.

### Request-scoped lifecycle (locked)

```
request
→ new pg.Client(env.HYPERDRIVE.connectionString)
→ connect
→ drizzle(client)
→ createAuth(db, env)         // fresh Better Auth instance per request
→ handle (/api/auth/* via auth.handler, /api/me via resolver)
→ finally client.end()
```

No module-global connected pg client, no Pool, no DB-bound auth instance.

### OrganizationContext resolution (frozen §5)

`session.activeOrganizationId` is a HINT. `resolveAuthContext`:

- soft-deleted canonical user → fail closed (`UNAUTHORIZED`)
- hint set → fresh membership join on non-deleted org; stale/removed → `ORG_CONTEXT_INVALID`
- no hint + 1 membership → deterministic single-org resolution
- no hint + >1 memberships → organization null (client must select)
- no hint + 0 memberships → organization null
- missing entitlement row → `entitlements: null` (deny-all representation)
- forged org in body/query/header → ignored (never read)

`OrganizationContext` stays exactly `{ organizationId: string }`.

### Trusted provisioning

`provisionPromotorUser(db, { name, email, password, organizationName?, organizationSlug? })`:

1. duplicate-email check against canonical `users.email` UNIQUE → `CONFLICT`
2. BA internal adapter `createUser` + `createAccount` (BA-owned `hashPassword`) — no hand-written scrypt
3. when org args provided: org + `product_entitlements(false,false)` + owner membership in one Drizzle transaction

## 3. Tests

- Unit: **15/15** (incl. new `src/auth` no-`process.env` guardrail)
- Integration (real PostgreSQL 16): **80/80**
  - B2 schema regression: 13
  - C0.1 timestamp gate: 3
  - C0.2 provisioning gate: 3
  - B2 Phase C matrix: 27
  - B1 regression: 23
- Wrangler dry-run: PASS (bundle ~3 MB with Better Auth; gzip ~500 KB)

## 4. Known Phase D deferrals (not in this PR)

- Product entitlement middleware (`requireEntitlement`)
- `requireRole` middleware
- Full BA organization endpoint deny matrix (create/update/delete/invite/accept/cancel/reject/add-member/remove-member/update-role/leave)
- Full set-active hardening matrix
- Complete Phase D security suite
- B3/B6 domain routes
- Frontend login UI + same-origin proxy
- Neon rehearsal, production deploy

## 5. Version pins (matching, frozen)

```
better-auth                  = 1.6.28
@better-auth/drizzle-adapter = 1.6.28
@better-auth/utils           = 0.4.2
drizzle-orm                  = ^0.45.2 (resolved 0.45.2)
drizzle-kit                  = 0.30.6 (unchanged)
```

## 6. Migration/grants integrity

- `git diff master...HEAD -- apps/platform-api/src/db/migrations` → ZERO DIFF
- `git diff master...HEAD -- docs/sql/grants_b1.sql docs/sql/grants_b2.sql` → ZERO DIFF
- No `db:generate`, no new migration, no grants change.

---

## 7. Source audit remediation (round 1)

All findings from the exact source audit were addressed:

| Finding | Resolution |
|---|---|
| **P0** soft-deleted user could sign in / create session | `createAuth` now has a `hooks.before` on `/sign-in/email` that queries the canonical `users` table via the request-scoped db and rejects with generic `INVALID_EMAIL_OR_PASSWORD` (401, no enumeration), plus a `databaseHooks.session.create.before` that returns `false` when `users.deleted_at` is set. Tests 28/29 prove sign-in fails and no session row is created. |
| **P0** provisioning "atomically-ish" | `provisionPromotorUser` now runs the ENTIRE operation (user + credential account + org + entitlement + membership) in ONE Drizzle transaction. Organization creation reuses the canonical Shared Core primitive `createOrganizationInTx` (extracted from `createOrganizationService`). Duplicate-slug failure rolls everything back — no orphaned user/account (C0.2 test 2b). |
| **P0** C0.2 gate didn't test the real path | C0.2 test 2+3 now calls `provisionPromotorUser` (the exact production mechanism) and asserts full state + sign-in; test 2b asserts all-or-nothing rollback. |
| **P0** Drizzle 0.45 runtime error mapping | New runtime util `src/db/pg-errors.ts` (`getPostgresErrorCode`/`isUniqueViolation`) reads `error.code` and `error.cause.code`. `organization-service.ts` uses it; regression test 30 proves duplicate slug → `DomainError('CONFLICT')` under drizzle-orm 0.45.2. |
| **P0** runtime rate-limit kill switch | Removed `BETTER_AUTH_RATE_LIMIT_DISABLED` env entirely. Production `createAuth` ALWAYS uses `storage: 'database'`. Test-only `options.disableRateLimit` seam is passed directly by tests and can never be activated via Worker env. |
| **P0 config** deleteUser not set | `user.deleteUser.enabled: false` is now explicit in `create-auth.ts`; test 33 asserts it in source. |
| **P1** `/api/me` placeholders | Resolver now carries safe canonical `user {id,name,email}` + `organizationDetail {name,slug}` server-side; `/api/me` returns real values and sets `Cache-Control: no-store`. Test 32. |
| **P1** 401 vs 403 | `ORG_CONTEXT_INVALID`/`ORG_CONTEXT_REQUIRED` → **403**; unauthenticated → 401; soft-deleted user → 401. Test 31. |
| **P1** env fail-closed | Missing `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` → `AuthConfigError` → sanitized 503 `AUTH_CONFIG_ERROR` (no raw config leakage). Test 34. |

### Merge / release gate (chosen: option C)

PR #16 remains DRAFT and is NOT merged until Phase D completes. Current master CI can deploy platform-api automatically when Cloudflare secrets are present; the fact that they're currently absent is NOT a security mechanism. **Decision: keep Phase C unmerged and stack Phase D on this head, then promote only after Phase D review.** The auth public surface (`/api/auth/*`) stays out of master until the full BA organization endpoint lockdown + security matrix lands.

### Test counts (remediated head)

- Unit: 15/15 (incl. `src/auth` no-`process.env` guardrail)
- Integration: **80/80** (13 B2 schema + 3 C0.1 + 4 C0.2 + 37 Phase C + 23 B1)
- typecheck/lint: PASS (workspace)
- Class/Flow/API builds + wrangler dry-run: PASS
- migrations/grants: ZERO DIFF vs base

---

## 8. Final closure patch (round 2)

### Shared email/password policy + trusted provisioning validation

`src/auth/policy.ts` freezes the shared policy:

```ts
export const EMAIL_PASSWORD_POLICY = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  maxNameLength: 200,
} as const;
```

- `createAuth.emailAndPassword` explicitly sets `minPasswordLength`/`maxPasswordLength` from the same policy.
- `provisionPromotorUser` validates BEFORE hashing/writing (the internal adapter bypasses `/sign-up/email` validation): trimmed non-empty name, valid lowercase email, password 8–128, and `organizationName` + `organizationSlug` both-supplied-or-both-absent.
- Invalid input → `AuthError('VALIDATION_ERROR')` with **zero** user/account/org/member/entitlement writes.
- Duplicate-email race: a DB unique violation after the pre-check is translated to canonical `AuthError('CONFLICT')` (never a raw `DrizzleQueryError`); the tx rolls back.

### Canonical soft-delete + old-session revocation

`src/services/promotor-user-service.ts` — `createPromotorUserService(db).softDeletePromotorUser(userId)`:

```text
one transaction:
  UPDATE users SET deleted_at = now, updated_at = now WHERE id = userId
  DELETE FROM sessions WHERE user_id = userId
```

- Does NOT hard-delete User, does NOT delete the credential Account, does NOT remove memberships.
- Completes the frozen 4-layer soft-delete policy: (a) sign-in blocked by hook, (b) new-session creation blocked by database hook, (c) old sessions now revoked authoritatively by this operation, (d) resolver defense-in-depth.
- Integration test 37 proves the full flow: sign-in → session cookie valid → `softDeletePromotorUser` → sessions count 0 → old cookie no longer resolves via `get-session` → `/api/me` 401 → re-sign-in generic 401.

### C0.2 rollback evidence (real)

Test 2b now captures genuine counts/state before the failing call and asserts after rollback: attempted user email absent, user/account/membership/entitlement counts unchanged (only the pre-created colliding org's own entitlement remains, byte-identical).

### Test counts (closure head)

- Integration: **80/80** (13 B2 + 3 C0.1 + 4 C0.2 + 37 Phase C + 23 B1)
- New tests added: 35 (validation matrix), 36 (shared policy), 37 (canonical soft-delete revocation); C0.2 2b rewritten with real rollback evidence.

### Merge gate (unchanged — Option C)

Phase C stays unmerged. Phase D stacks on this head after Phase C FINAL ACCEPTED/FROZEN. Master receives neither C nor D until Phase D review passes.

