# B2 Phase D — Authorization + Hardening

**Status:** IMPLEMENTED / AWAITING REVIEW (not B2 FINAL)
**Date:** 2026-08-15
**Phase C frozen base SHA:** `18dc9996c832fdbc83b8f4dc2061b50b833fbb96`
**Branch:** `feat/b2-auth-authorization` (stacked on Phase C; NOT master)
**Option C:** Phase C + Phase D both remain UNMERGED; controlled promotion to master happens only after Phase D review.

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

App-owned diagnostic seam (not product APIs): `GET /api/diag/organization`, `/api/diag/class`, `/api/diag/flow` prove the chain end-to-end.

## 2. BA organization endpoint lockdown

`hooks.before` deny matrix in `createAuth` — every denied endpoint returns a deterministic **403** (or library **404** only where the endpoint is deliberately unavailable, e.g. server-only `add-member`) and mutates **ZERO** canonical rows:

```text
/organization/create          disabled (allowUserToCreateOrganization: false)
/organization/update          DENY 403
/organization/delete          disabled (disableOrganizationDeletion: true)
/organization/invite-member   DENY 403
/organization/accept-invitation  DENY 403
/organization/cancel-invitation  DENY 403
/organization/reject-invitation  DENY 403
/organization/add-member      DENY (server-only -> 404)
/organization/remove-member   DENY 403
/organization/update-member-role DENY 403
/organization/leave           DENY 403
```

Shared Core remains owner of organization lifecycle, membership writes, and entitlements. Raw BA org mutation APIs are not exposed as an alternative path.

## 3. Validated set-active

`/organization/set-active` is the ONLY approved org mutation-like path. `hooks.before` server-side validation (never trust BA's default check alone):

1. authenticated user exists and is active (`users.deleted_at IS NULL`)
2. target organization id valid
3. `organizations.deleted_at IS NULL`
4. fresh `organization_members` row exists for `(user_id, organization_id)`

Any failure → 403 `ORG_CONTEXT_INVALID` / `FORBIDDEN`, no session hint mutation. After success, the next domain request still performs fresh membership resolution; `activeOrganizationId` remains only a hint.

## 4. Single-role policy

`src/auth/roles.ts` — `assertSingleRole` rejects: `"owner,admin"`, arrays, unknown strings, empty role. Canonical roles exactly `owner | admin | member`. DB CHECK remains final guard. All BA membership-mutating endpoints are denied anyway.

## 5. Entitlement semantics

- `promotorClass=false` → Class gate 403
- `promotorFlow=false` → Flow gate 403
- missing entitlement row → 403 `ENTITLEMENT_DENIED`
- entitlement=true → passes entitlement layer
- wrong organization cannot borrow another org's entitlement (resolver is org-scoped)

## 6. Durable rate limiting (proof)

- Production `createAuth` always `storage: 'database'`, `modelName: 'auth_rate_limits'`. No env kill switch.
- Test 25 proves against real PostgreSQL: auth attempts write `auth_rate_limits`; the limit is enforced across **separate requests / fresh request-scoped auth instances** (two fresh `createAuth` instances share the DB bucket); fresh instances do NOT reset the limit; error responses do not leak internal DB state (no table names / `postgres`).

## 7. Security matrix

Integration suite `phase-d-authorization.integration.test.ts` (real PostgreSQL 16), 28 cases:

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
15. insufficient role denied
16. owner/admin accepted
17. single-role malformed/comma/multi/unknown/empty rejected
18. forged org body/query/header ignored (server-resolved org wins)
19. each forbidden BA org endpoint mutates zero rows
20. BA create org disabled
21. BA delete org disabled
22. BA user hard delete disabled
23. public signup disabled
24. invitations unavailable
25. durable rate limit persists across fresh request-scoped auth instances
26. runtime role cannot CREATE TABLE
27. B1/B2 Phase B regression green
28. Phase C baseline green

## 8. Changed files (Phase D delta)

| File | Change |
|---|---|
| `src/auth/authorization.ts` | new — requireOrganization / requireEntitlement / requireRole |
| `src/auth/roles.ts` | new — single-role validator |
| `src/auth/create-auth.ts` | deny matrix + validated set-active in hooks.before |
| `src/auth/errors.ts` | add `ENTITLEMENT_DENIED`; export `authErrorStatus` |
| `src/auth/session-middleware.ts` | use shared `authErrorStatus` |
| `src/app.ts` | `onError` AuthError→HTTP; diag seam routes |
| `src/__tests__/integration/phase-d-authorization.integration.test.ts` | new — 28-case matrix |
| `docs/backend/B2_PHASE_C_AUTH_CORE.md` | D0 sync: FINAL ACCEPTED/FROZEN status, 80/80 |
| `docs/backend/B2_PHASE_D_AUTHORIZATION.md` | this document |

## 9. Test counts (Phase D head)

- Phase C baseline: unit 15/15, integration 80/80 (unchanged)
- Phase D: integration 28/28 (new)
- Total integration: **108/108**
- typecheck/lint: PASS (workspace)
- Builds (Class/Flow/API + wrangler dry-run): PASS
- migrations/grants: ZERO DIFF (0000 unchanged, 0001_material_king_bedlam unchanged, journal unchanged, grants_b1/b2 unchanged)

## 10. Phase E deferrals

- Neon rehearsal, release audit, live acceptance tooling
- Frontend auth UI + same-origin proxy
- Production deploy
- B3/B6 domain routes
