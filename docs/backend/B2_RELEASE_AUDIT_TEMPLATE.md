# B2 Production Migration Release Audit Record

Mandatory per the B1 Future Release Audit Rule (docs/backend/B1_SHARED_CORE.md).
Fill in this template for EVERY production migration run. Safe metadata ONLY.

NEVER record: passwords, connection strings, tokens, password hashes,
database hostnames, Better Auth secrets, Cloudflare tokens, or any
credential material.

---

## Audit record

| Field | Value |
|---|---|
| Milestone | B2 (Phase: B / C / D / E) |
| Approved source SHA | `____________` |
| Operator / logical actor | `____________` |
| UTC timestamp | `____________` |
| Target environment | `rehearsal-branch | production` |
| Migration filenames | `0000_modern_hydra.sql`, `0001_material_king_bedlam.sql` |
| Migration hashes | `____________` (see below) |
| Grant script/version | `docs/sql/grants_b1.sql`, `docs/sql/grants_b2.sql` |
| Preflight result | `PASS | FAIL` |
| Postflight result | `PASS | FAIL` |
| Worker source SHA/version | `____________` |
| Acceptance result | `PASS | FAIL` |

## Verification evidence (safe)

### Read-only verify (`b2:live-acceptance --verify`)

- B1+B2 tables present (10/10)
- Runtime privileges: B1 20/20 + B2 20/20 = 40/40
- Runtime DDL (CREATE on public): DENIED
- Exact canonical journal: `0000_modern_hydra` → `0001_material_king_bedlam`, with DB migration hashes matching local SHA-256 content fingerprints
- Health endpoints: `/health` 200, `/health/db` 200 (deployed Worker current Hyperdrive path)
- `auth_rate_limits` storage queryable

### Rehearsal auth (`b2:live-acceptance --rehearse-auth`) — disposable identities, rehearsal branch only

- Trusted disposable Promotor provisioning succeeds
- Sign-in succeeds
- Session cookie round-trip succeeds
- `/api/me` returns canonical user/org/membership/entitlements
- Valid UUID set-active succeeds
- Malformed UUID set-active → 403 `ORG_CONTEXT_INVALID`
- organizationSlug set-active → 403
- Raw BA `/organization/list` → 403
- Public signup stays disabled
- BA user hard delete stays disabled
- Entitlement boundary: `promotorClass=false` / `promotorFlow=false` → `ENTITLEMENT_DENIED`; true entitlement passes
- Soft delete: canonical `softDeletePromotorUser()` purges all sessions; old session rejected; re-sign-in rejected

This template is used for BOTH the Neon rehearsal branch audit AND the eventual production release audit.

## Approval gate

- [ ] Rehearsal on a Neon branch completed with PASS (E-B)
- [ ] Human approval recorded before production run
- [ ] Production run performed by an identified operator
- [ ] Postflight acceptance PASS
