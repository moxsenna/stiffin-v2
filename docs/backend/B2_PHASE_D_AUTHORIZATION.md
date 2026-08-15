# B2 Phase D — Authorization + Hardening

**Status:** B2 PHASE D — FINAL ACCEPTED / FROZEN
**Date:** 2026-08-15
**Frozen source head:** `a8995977dad10fc21ebadc83df69c5f3c525a0ed`
**Phase C frozen base SHA:** `18dc9996c832fdbc83b8f4dc2061b50b833fbb96`
**Branch:** `feat/b2-auth-authorization` (stacked on Phase C; NOT master)
**Option C:** Phase C + Phase D both remain UNMERGED; controlled promotion to master happens only after Phase E verification.

---

## 1. Authorization chain (frozen)

```text
authenticated User
→ fresh membership
→ OrganizationContext
→ product entitlement
→ role/domain permission
```

Middleware (Hono, `src/auth/authorization.ts`):

| Middleware | Semantics | Failure |
|---|---|---|
| `sessionMiddleware` | resolves session + AuthContext | 401 when unauthenticated |
| `requireOrganization()` | requires resolved org + actor | 403 `ORG_CONTEXT_REQUIRED` / `ORG_CONTEXT_INVALID` |
| `requireEntitlement('promotorClass'\|'promotorFlow')` | missing row = deny; false = deny | 403 `ENTITLEMENT_DENIED` |
| `requireRole([...])` | compare the SINGLE canonical role | 403 `FORBIDDEN` |

Never trusted: `organizationId` from body/query/header, role from browser input, entitlement from browser input. `OrganizationContext` remains exactly `{ organizationId: string }`.

Middleware proof uses a **test-only Hono composition**; the production app exposes only `/api/me` (no `/api/diag/*`).

## 2. BA organization HTTP surface lockdown (fail-closed)

Frozen V0.1 rule: the ONLY Better Auth organization endpoint exposed to the browser is **`/organization/set-active`**. Everything else under `/organization/*` is denied (403 where mounted; 404 only where the endpoint is deliberately unavailable, e.g. server-only `add-member` / unregistered `check-slug`), mutating ZERO canonical rows.

```text
ALLOW:  /organization/set-active
DENY:   /organization/* (everything else — reads, writes, invitations, slugs)
```

Config flags remain defense in depth: `allowUserToCreateOrganization: false`, `disableOrganizationDeletion: true`. Raw BA list/full-org/member/invitation/check-slug surfaces are NOT public V0.1 APIs. Shared Core/app-owned code owns org discovery, org/member reads, org lifecycle, membership writes, and entitlements.

## 3. Validated set-active (UUID-only)

Canonical V0.1 input: `organizationId: UUID | null`. `organizationSlug` is NOT an accepted V0.1 authorization input and is rejected explicitly. `hooks.before` server-side validation (never trust BA's default check alone):

1. authenticated user exists and is active (`users.deleted_at IS NULL`)
2. `organizationId` is a canonical UUID (malformed → 403 `ORG_CONTEXT_INVALID`, never a DB error)
3. `organizations.deleted_at IS NULL`
4. fresh `organization_members` row exists for `(user_id, organization_id)`

`organizationId === null` clears the active org (allowed). Any failure → 403, no session hint mutation. `organizationSlug` supplied → 403 `ORG_CONTEXT_INVALID`, no hint mutation.

## 4. Session hint UUID fail-closed

Phase C resolver now validates `sessions.active_organization_id` with `isCanonicalUuid` BEFORE any UUID predicate; malformed/stale hint → 403 `ORG_CONTEXT_INVALID`, never 500 / raw PG error.

## 5. Single-role policy

`src/auth/roles.ts` — `assertSingleRole` rejects: `"owner,admin"`, arrays, unknown strings, empty role. Canonical roles exactly `owner | admin | member`. DB CHECK remains final guard. All BA membership-mutating endpoints are denied anyway.

## 6. Entitlement semantics

- `promotorClass=false` → Class gate 403
- `promotorFlow=false` → Flow gate 403
- missing entitlement row → 403 `ENTITLEMENT_DENIED`
- entitlement=true → passes entitlement layer
- wrong organization cannot borrow another org's entitlement (resolver is org-scoped)

## 7. Durable rate limiting (proof)

- Production `createAuth` explicitly `{ enabled: true, storage: 'database', modelName: 'auth_rate_limits' }` — deterministic, not dependent on BA's environment inference. No env kill switch.
- Test 25 proves against real PostgreSQL: auth attempts write `auth_rate_limits`; the limit is enforced across **fresh `createAuth()` instances constructed per request/iteration** (exact request-scoped lifecycle); fresh instances do NOT reset the bucket; error responses do not leak internal DB state.

## 8. Security matrix

Integration suite `phase-d-authorization.integration.test.ts` (real PostgreSQL 16), 32 cases, with **test-only Hono composition** (production has NO `/api/diag/*`):

1. unauthenticated → 401
2. authenticated + org unresolved → 403 `ORG_CONTEXT_REQUIRED`
3. one membership resolves
4. multiple memberships without hint never guessed
5. valid set-active switches org (fresh membership)
6. set-active non-member org rejected 403, zero hint mutation
7. set-active soft-deleted org rejected 403
8. removed membership rejected on next request
9. soft-deleted user rejected
10. soft-deleted org rejected
11. missing entitlement row denied
12. Class entitlement false denied
13. Flow entitlement false denied
14. entitlement true passes
15. **real role denial**: member → 403 `FORBIDDEN` on owner/admin-only route; member still passes all-role route
16. **owner AND admin** accepted on owner/admin-only route
17. single-role malformed/comma/multi/unknown/empty rejected
18. forged org body/query/header ignored (server-resolved org wins)
19. each forbidden BA org endpoint mutates zero rows (**real deep-equal snapshots** of target org row, membership rows, `organization_invitations` rows, and totals)
20. BA create org disabled (non-200 response; org-count unchanged is proven by the generic fail-closed hook + deep snapshot test 19)
21. BA delete org disabled (+ target org still present)
22. BA user hard delete disabled
23. public signup disabled
24. invitations unavailable
25. durable rate limit persists across fresh request-scoped auth instances (one per request)
26. runtime role cannot CREATE TABLE
27. B1/B2 Phase B regression green
28. Phase C baseline green
29. all raw BA organization read endpoints denied (fail-closed surface; set-active stays allowed)
30. set-active malformed UUID → 403 `ORG_CONTEXT_INVALID`, hint unchanged
31. set-active organizationSlug → 403 `ORG_CONTEXT_INVALID`, hint unchanged
32. malformed `sessions.active_organization_id` hint → 403 `ORG_CONTEXT_INVALID`, never 500

## 9. Changed files (Phase D delta)

| File | Change |
|---|---|
| `src/auth/authorization.ts` | new — requireOrganization / requireEntitlement / requireRole |
| `src/auth/roles.ts` | new — single-role validator + `isCanonicalUuid` |
| `src/auth/create-auth.ts` | fail-closed /organization/* lockdown; UUID-only validated set-active; explicit `rateLimit.enabled: true` |
| `src/auth/context-resolver.ts` | hint UUID fail-closed |
| `src/auth/errors.ts` | add `ENTITLEMENT_DENIED`; export `authErrorStatus` |
| `src/auth/session-middleware.ts` | use shared `authErrorStatus` |
| `src/app.ts` | `onError` AuthError→HTTP; `/api/me` only (no diag routes in production) |
| `src/__tests__/integration/phase-d-authorization.integration.test.ts` | new — 32-case matrix + test-only Hono composition |
| `docs/backend/B2_PHASE_C_AUTH_CORE.md` | D0 sync: FINAL ACCEPTED/FROZEN status, 80/80 |
| `docs/backend/B2_PHASE_D_AUTHORIZATION.md` | this document |

## 10. Test counts (Phase D head)

- Phase C baseline: unit 15/15, integration 80/80 (unchanged)
- Phase D: integration **32/32** (new)
- Total integration: **112/112**
- typecheck/lint: PASS (workspace)
- Builds (Class/Flow/API + wrangler dry-run): PASS
- migrations/grants: ZERO DIFF (0000 unchanged, 0001_material_king_bedlam unchanged, journal unchanged, grants_b1/b2 unchanged)

## 11. Phase E deferrals

- Neon rehearsal, release audit, live acceptance tooling
- Frontend auth UI + same-origin proxy
- Production deploy
- B3/B6 domain routes
- Master-target verification PR (must run GitHub Actions against combined C+D source before any merge)
