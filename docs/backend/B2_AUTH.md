# B2 — Auth on Promotor Platform (Milestone)

**Status:** IN PROGRESS — Phase E-A (tooling + verification). NOT B2 FINAL.

## Frozen milestone phases

| Phase | Scope | Status | Frozen source head |
|---|---|---|---|
| B2 Phase B | Schema / migration / grants | ✅ FINAL ACCEPTED / FROZEN | canonical master (merged PR #13) |
| B2 Phase C | Auth Core | ✅ FINAL ACCEPTED / FROZEN | `18dc9996c832fdbc83b8f4dc2061b50b833fbb96` |
| B2 Phase D | Authorization + Hardening | ✅ FINAL ACCEPTED / FROZEN | `a8995977dad10fc21ebadc83df69c5f3c525a0ed` |
| B2 Phase E | Rehearsal + release evidence | ✅ E-A IMPLEMENTED / AWAITING FINAL REVIEW | `feat/b2-rehearsal-tooling` head |

## Frozen source SHAs

- Phase C (Auth Core): `18dc9996c832fdbc83b8f4dc2061b50b833fbb96`
- Phase D (Authorization + Hardening): `a8995977dad10fc21ebadc83df69c5f3c525a0ed`

## Frozen canonical DB state

- Migrations: `0000_modern_hydra.sql` (B1, frozen), `0001_material_king_bedlam.sql` (B2, frozen)
- Grants: `docs/sql/grants_b1.sql` (20 CRUD), `docs/sql/grants_b2.sql` (20 CRUD)
- Runtime role `promotor_runtime`: CRUD only, no DDL, no ownership
- No `ALTER DEFAULT PRIVILEGES`

## Open PRs (Option C — all UNMERGED)

- PR #16 `feat/b2-auth-core` → (stack base) — do not merge
- PR #17 `feat/b2-auth-authorization` → `feat/b2-auth-core` — do not merge
- Phase E-A PR → `feat/b2-auth-authorization` — do not merge
- Master-target verification PR (E-A) — do not merge, verification evidence only

## Phase E plan

- **E-A (in progress):** rehearsal tooling, release audit template, milestone doc,
  master-target verification PR (GitHub Actions on combined B+C+D+E-A source).
- **E-B:** Neon branch rehearsal (separate human GO required).
- **E-C:** final B2 acceptance + controlled promotion under Option C.

Overall B2 is NOT FINAL until Phase E completes.
