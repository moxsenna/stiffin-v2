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

- Migration journal entries: `0000_modern_hydra` → `0001_material_king_bedlam`
- Runtime privilege checks: B1 20/20 + B2 20/20 = 40/40
- Runtime DDL (CREATE on public): DENIED
- Health endpoints: `/health` 200, `/health/db` 200
- Auth checks (disposable rehearsal identities only): sign-in, session
  round-trip, `/api/me`, set-active valid/invalid, org lockdown,
  entitlement boundary, soft-deleted principal, durable rate-limit presence

## Approval gate

- [ ] Rehearsal on a Neon branch completed with PASS (E-B)
- [ ] Human approval recorded before production run
- [ ] Production run performed by an identified operator
- [ ] Postflight acceptance PASS
