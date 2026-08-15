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

---

## Migration fingerprint (E-A remediation)

**Root cause:** Drizzle hashes the RAW BYTES it reads from migration files. Git
stores canonical LF content in its object database, but on a Windows working
tree with `core.autocrlf=true` (and no attributes) the files check out as
CRLF — so Drizzle on Windows hashes CRLF bytes and records a NONCANONICAL
journal hash. The canonical fingerprint is the Git/LF content.

**Canonical migration fingerprints (Git/LF — ACCEPTED):**

```text
0000_modern_hydra.sql        86a3e3d993e3c038908e741649c2586afe2ae7ca737be641680c9af475bc7689
0001_material_king_bedlam.sql e5acd9851fe9f76920ed513ddb454dbb91ddc6bc2259a8caa591fe894c95c166
```

**Noncanonical diagnostics (Windows CRLF working tree — NEVER canonical):**

```text
0000_modern_hydra.sql        06f67712f2024e8b605d73da5530b855e2648e87361367a18626a47cd459ae56
0001_material_king_bedlam.sql 6c433d8e3f20f57d1ab1c4a86a92cb99952bd8d051a666e6ca1e800149683d66
```

**Fix (E-A remediation):**
- `.gitattributes`: `apps/platform-api/src/db/migrations/*.sql text eol=lf`,
  `meta/*.json text eol=lf`, `docs/sql/*.sql text eol=lf`.
- `tooling/migrate.ts` now REFUSES (before any DB access) migration SQL or
  meta JSON containing CR bytes (`MIGRATION_EOL_NOT_CANONICAL`).
- `b2-live-acceptance` distinguishes CANONICAL SOURCE FINGERPRINT (LF =
  canonical) from RAW WORKTREE FINGERPRINT (diagnostic). `--verify` checks
  canonical == `86a3...`/`e5acd9...`; DB journal must match canonical.
- Unit tests prove: LF→canonical, CRLF→noncanonical diagnostic, CRLF rejected.

**E-B production predecessor rule:** production B1 journal `0000` hash must
equal the canonical `86a3e3d9...` — this is the ACCEPTED canonical fingerprint.
Do NOT update the production journal.

**Production drift:** NONE. This was an OS-dependent fingerprint bug discovered
during E-A/E-B investigation; no production data or journal changed. B1 is NOT
reopened.
