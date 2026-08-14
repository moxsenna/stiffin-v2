# B2 Schema Compatibility Spike — Evidence

**Date:** 2026-08-14
**Revision:** 2 — final proof added (invitation role/expiresAt reconciliation)

## Method

Pinned packages (exact, matching frozen recon):

```text
better-auth                    = 1.6.28
@better-auth/drizzle-adapter   = 1.6.28
auth (CLI)                     = 1.6.28
drizzle-orm (spike-only peer)  = 0.45.2   ← satisfies adapter peer ^0.45.2
```

The spike ran `auth generate` (Drizzle, postgres dialect) in an isolated scratchpad with a Phase C-mirroring config. The reference output was compared field-by-field against PR #13's schema. The reference was never applied to any database; Drizzle remains the sole migration authority.

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

## Raw evidence — invitation role/expiresAt (final audit P0)

The final audit raised one open question: whether `organization_invitations.role` should be NOT NULL and `expires_at` nullable. The answer is **no — the PR shape is correct**. Evidence, raw:

### 1. Official v1.6.28 tagged source (GitHub), DB schema model

`packages/better-auth/src/plugins/organization/organization.ts` @ tag `v1.6.28`:

```ts
invitation: {
  modelName: opts.schema?.invitation?.modelName,
  fields: {
    organizationId: { type: "string", required: true, references: { model: "organization", field: "id" }, index: true },
    email:          { type: "string", required: true, sortable: true, index: true },
    role:           { type: "string", required: false, sortable: true },      // ← nullable
    status:         { type: "string", required: true, defaultValue: "pending" },
    expiresAt:      { type: "date",   required: true },                       // ← NOT NULL
    createdAt:      { type: "date",   required: true, defaultValue: () => new Date() },
    inviterId:      { type: "string", required: true, references: { model: "user", field: "id" } },
  },
},
```

This is the **DB schema model** — the exact input to the Drizzle generator. It contradicts a reading of the **zod API body schema** (`packages/better-auth/src/plugins/organization/schema.ts`), where `role` is `z.string()` (required in request bodies) and `expiresAt` is `z.date()` (required in the create payload). Those two layers are different artifacts; the generator consumes the DB model, not the zod body schema.

### 2. Generator notNull rule (pinned CLI `auth@1.6.28`)

`auth/dist/index.mjs:710`:

```js
return `${fieldName}: ${type}${attr.required !== false ? ".notNull()" : ""}${...}`;
```

Applied to the DB model above:
- `role` (`required: false`) → **no** `.notNull()` → nullable ✅
- `expiresAt` (`required: true`) → `.notNull()` → NOT NULL ✅

### 3. Generated reference block (pinned CLI run, verbatim)

From the spike's `ref-schema.ts` (teams disabled, canonical table mapping):

```ts
export const organization_invitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),                                  // ← nullable
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),        // ← NOT NULL
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("organization_invitations_organizationId_idx").on(table.organizationId),
    index("organization_invitations_email_idx").on(table.email),
  ],
);
```

### 4. PR #13 current schema (matches the generated reference)

```ts
export const organizationInvitations = pgTable(
  'organization_invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),                                  // ← nullable, matches reference
    status: text('status').notNull().default('pending'), // ← matches reference
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(), // ← matches reference
    inviterId: uuid('inviter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('organization_invitations_organizationId_idx').on(t.organizationId),
    index('organization_invitations_email_idx').on(t.email),
  ]
);
```

**Conclusion: CASE A — no explicit schema override exists, and none is needed. PR #13's `role` (nullable) + `expires_at` (NOT NULL) is exactly the pinned v1.6.28 generated default.**

## Phase C dependency constraint (blocking finding)

`@better-auth/drizzle-adapter@1.6.x` requires `drizzle-orm >= 0.41.0` (1.6.0–1.6.3) or `^0.45.2` (1.6.4+). The repo currently pins `drizzle-orm@^0.40.0` (resolved 0.40.1). **Phase C must bump drizzle-orm to the adapter's peer requirement.**

Matching pinned version set for Phase C (per frozen recon — no patch mixing):

```text
better-auth                  = 1.6.28
@better-auth/drizzle-adapter = 1.6.28
drizzle-orm                  = compatible peer ^0.45.2 (bump from ^0.40.0)
```

If a different 1.6.x patch is chosen later, pin all three explicitly and rerun this compatibility verification before any auth implementation.
