# B2 — Auth on Promotor Platform (Milestone)

**Status:** B2 IMPLEMENTATION FINAL ACCEPTED / FROZEN ✅  
**Production Activation:** NOT YET AUTHORIZED (Separate Operational Release Gate)

---

## 1. Frozen Milestone Phases

| Phase | Scope | Status | Canonical Source / Head |
|---|---|---|---|
| B2 Phase B | Schema / migration / grants | ✅ FINAL ACCEPTED / FROZEN | canonical master (merged PR #13) |
| B2 Phase C | Auth Core | ✅ FINAL ACCEPTED / FROZEN | `18dc9996c832fdbc83b8f4dc2061b50b833fbb96` (merged PR #16) |
| B2 Phase D | Authorization + Hardening | ✅ FINAL ACCEPTED / FROZEN | `a8995977dad10fc21ebadc83df69c5f3c525a0ed` (merged PR #17) |
| B2 Phase E-A | Rehearsal tooling + release audit | ✅ FINAL ACCEPTED / FROZEN | `83f5b90e4ff4fe8180905790824baf4af769edf8` (merged PR #18) |
| B2 Phase E-B | Neon branch rehearsal | ✅ FINAL ACCEPTED / FROZEN | `83f5b90e4ff4fe8180905790824baf4af769edf8` (merged PR #18) |
| B2 Phase E-C | Evidence publication + controlled promotion | ✅ FINAL ACCEPTED / FROZEN | `1a3121fb78498301f8916a3435a79ea65d1af4de` (canonical master) |

---

## 2. Authoritative Commit SHAs & Ancestry

- **Tested Runtime Source SHA:** `83f5b90e4ff4fe8180905790824baf4af769edf8`
- **Phase C Frozen Head:** `18dc9996c832fdbc83b8f4dc2061b50b833fbb96`
- **Phase D Frozen Head:** `a8995977dad10fc21ebadc83df69c5f3c525a0ed`
- **Release-Control Hardening (P0):** `40124853b541b16f5e3e3365b6690869ddcfa21f` (merged PR #20)
- **Phase C Promotion Merge Commit:** `a512708fee21148067d255c4fd3d4e96b682e483` (merged PR #16)
- **Phase D Promotion Merge Commit:** `1145499b32ecea9474ddd584baaff76b604a6a28` (merged PR #17)
- **Phase E Promotion Merge Commit:** `5b345b8aa65478e239d449fc1230c37792d89fd8` (merged PR #18)
- **Final Canonical Master SHA:** `1a3121fb78498301f8916a3435a79ea65d1af4de`

All exact frozen SHAs (`18dc999...`, `a899597...`, `83f5b90...`) are preserved as direct ancestors of canonical `master`.

---

## 3. Frozen Canonical DB State & Zero Semantic Drift Blobs

- **Migrations:** `0000_modern_hydra.sql` (B1, frozen), `0001_material_king_bedlam.sql` (B2, frozen)
- **Grants:** `docs/sql/grants_b1.sql` (20 CRUD), `docs/sql/grants_b2.sql` (20 CRUD)
- **Runtime Role `promotor_runtime`:** CRUD only (40/40), no DDL, no ownership, `CREATE` on public denied
- **No `ALTER DEFAULT PRIVILEGES`**

### Exact Git Blob IDs
- `0000_modern_hydra.sql`: `4beeb1c0d26445a2a0de98d7e5436a3d1bbe02d1`
- `0001_material_king_bedlam.sql`: `85cd58aa6ee9eb753760850a25b2807eaff60782`
- `meta/_journal.json`: `dbe881df6eac0c4b04ccec28c26dd589b6f901dc`
- `docs/sql/grants_b1.sql`: `e154122edd1147027dbac24ffe0aa7e8f363d51e`
- `docs/sql/grants_b2.sql`: `53bcdbd93ddf606510c6838d4c52d0b6a265e2b9`

---

## 4. Migration Fingerprints (LF Canonical Policy)

```text
0000_modern_hydra.sql        86a3e3d993e3c038908e741649c2586afe2ae7ca737be641680c9af475bc7689
0001_material_king_bedlam.sql e5acd9851fe9f76920ed513ddb454dbb91ddc6bc2259a8caa591fe894c95c166
```

- Production B1 journal `0000` hash MUST equal canonical `86a3e3d9...`.
- Rehearsal branch journal has exactly entries 1 and 2 matching canonical LF hashes.

---

## 5. Promotion and Release Gate Summary

- **Option C Stack Promotion:** PR #16, PR #17, and PR #18 were merged into `master` via **merge commits** without squashing/rebasing.
- **PR #19:** Verification purpose fulfilled; closed/resolved on GitHub.
- **Release-Control Decoupling:** Deployment jobs removed from ordinary `push` / `pull_request` CI (`ci.yml`); moved to manual `workflow_dispatch` (`deploy.yml`). Pushes to `master` execute verify-only.
- **Production Status:** Production database remains B1 predecessor (unmodified). Hyperdrive binding remains unchanged. Production rollout is deferred to a future authorized operational release window.
