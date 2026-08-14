# B2 Schema Compatibility Spike — Evidence

**Date:** 2026-08-14
**Method:** `auth@1.6.28` CLI (`npx auth generate` equivalent, exact pinned stable 1.6.x) run in an isolated scratchpad with a Phase C-mirroring config:
- canonical table mapping (`users`/`sessions`/`accounts`/`verifications` via `modelName`; org plugin `organization`→`organizations`, `member`→`organization_members`, `invitation`→`organization_invitations`)
- `teams: { enabled: false }`
- `advanced.database.generateId: "uuid"`
- `rateLimit.storage: "database"`, `modelName: "auth_rate_limits"`

The reference output was compared field-by-field against PR #13's schema. The reference was never applied to any database; Drizzle remains the sole migration authority.

## Result: 2 real mismatches found → schema fixed, `0001` regenerated

| Table/Field | Reference (pinned 1.6.28) | PR #13 before spike | Verdict |
|---|---|---|---|
| `sessions.active_organization_id` | `text`, **no FK** | `uuid` + FK `ON DELETE SET NULL` to organizations | **MISMATCH → FIXED** (now `text`, no FK) |
| `organization_invitations.status` | `text` NOT NULL **`.default('pending')`** | `text` NOT NULL, no default | **MISMATCH → FIXED** (default added) |
| `organization_invitations` org index name | `organization_invitations_organizationId_idx` | `organization_invitations_org_idx` | **MISMATCH → FIXED** (renamed) |
| `sessions.active_team_id` | **absent** (teams disabled) | omitted | **MATCH** — no column needed |
| `auth_rate_limits` (id/key/count/lastRequest) | uuid PK / unique key / int count / bigint lastRequest | identical | **MATCH** |
| `accounts` (all 13 columns + `accounts_user_id_idx`) | reference shape | identical | **MATCH** |
| `verifications` (6 columns + identifier idx) | reference shape | identical | **MATCH** |
| `organizations` logo/metadata | nullable text columns | present | **MATCH** |
| `organization_members` role default `'member'` | default member | present (B1) | **MATCH** |

## Phase C dependency constraint (blocking finding)

`@better-auth/drizzle-adapter@1.6.x` requires `drizzle-orm >= 0.41.0` (1.6.0–1.6.3) or `^0.45.2` (1.6.4+). The repo currently pins `drizzle-orm@^0.40.0` (resolved 0.40.1). **Phase C must bump drizzle-orm to the adapter's peer requirement** (recommend `^0.45.2` with adapter 1.6.29, re-verify migrations/tests after the bump). This is a dependency upgrade decision for Phase C, not a Phase B schema issue — no Phase B action needed.
