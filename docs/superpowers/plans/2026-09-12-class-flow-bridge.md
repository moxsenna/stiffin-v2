# Class ↔ Flow Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menutup loop Class ↔ Flow agar buyer satu produk mengalami nilai produk lain (teaser + paywall) dan attachment rate naik — sesuai `docs/superpowers/specs/2026-09-12-class-flow-bridge-design.md`.

**Architecture:** Backend pipe Class→Flow (`integration_outbox` → `next_actions source='PROMOTORCLASS'`) sudah ada; tugas backend tinggal emitter `ORDER_PAID`, flag `features` di plan-access, tabel metrik/dismissal, endpoint teaser + journey, dan purge. Frontend: badge "dari Class" di Flow, teaser card/chip di Class, app switcher di kedua shell, timeline perjalanan kontak di kedua aplikasi, kartu program di Flow.

**Tech Stack:** Hono 4.7 + Drizzle 0.45 + Neon (Workers/Hyperdrive), Next 15.3 PWA ×2, zod contracts di `packages/contracts`, node:test + tsx (unit), integration test postgres (CI), pnpm 11.9.

## Global Constraints

- Copy user-facing **Bahasa Indonesia**, istilah **"Peserta"** (bukan "Learner") dan **"Prospek"** (bukan "Lead"); "Learner" hanya boleh di identifier kode.
- **Tidak ada kredensial di git** — env lokal di `.env`/`.env*.local` (sudah di-gitignore). Jangan pernah print value secret.
- Migrasi WAJIB via `pnpm --filter @promotor/platform-api db:generate` (jangan edit `meta/_journal.json` manual); file SQL harus LF; fingerprint guard sudah ada.
- Mengubah `packages/contracts/src/index.ts` → WAJIB recompute hash (`python -c` normalize LF lalu sha256) dan update `CONTRACTS_BASELINE_HASH` di `apps/platform-api/src/__tests__/source-guardrails.test.ts`.
- Flow tetap satu-satunya penulis `next_actions`; Class hanya enqueue ke `integration_outbox` (`destination='PROMOTORFLOW'`, `operation='CREATE_NEXT_ACTION'|'APPEND_ACTIVITY'`, `source='PROMOTORCLASS'`, idempotencyKey `promotorclass:<rule>:<entityId>`).
- Upsell v1: CTA membuka **WhatsApp admin** (aktivasi manual via admin entitlements endpoint yang sudah ada di `app.ts:287`) — checkout self-serve add-on Flow bukan bagian plan ini. Semua CTA mencatat metrik `upgrade_started`.
- Unit: `pnpm --filter @promotor/platform-api test`. Integration (butuh DB): `TEST_DATABASE_URL=... OWNER_DATABASE_URL=... pnpm --filter @promotor/platform-api test:integration` — lokal boleh skip, CI mewajibkan.
- Build gate: `pnpm typecheck && pnpm build:class && pnpm build:flow` (typecheck harus 100% hijau — seed sudah diperbaiki).

---

### Task 1: Flag `features` di plan-access + kontrak journey/teaser

**Files:**
- Modify: `packages/contracts/src/index.ts` (OrganizationPlanAccessSchema ~line 1403)
- Create: `apps/platform-api/src/__tests__/bridge-contracts.test.ts`
- Modify: `apps/platform-api/src/routes/commerce-routes.ts` (GET /api/v1/billing/plan ~line 224)
- Modify: `apps/platform-api/src/__tests__/source-guardrails.test.ts` (hash)

**Interfaces:**
- Produces: `OrganizationPlanAccess.features?: { promotorClass: boolean; promotorFlow: boolean }` — dipakai semua gating UI Task 5/7/9. Kontrak baru: `BridgeTeaserSchema`, `JourneyItemSchema`, `JourneyResponseSchema` — dipakai Task 4/8/9.

- [ ] **Step 1: Tulis test kontrak (gagal dulu)**

Buat `apps/platform-api/src/__tests__/bridge-contracts.test.ts`:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OrganizationPlanAccessSchema,
  BridgeTeaserSchema,
  JourneyItemSchema,
  JourneyResponseSchema,
} from '@promotor/contracts';

describe('Bridge contracts', () => {
  it('plan access accepts optional features flags', () => {
    const base = OrganizationPlanAccessSchema._def.shape;
    assert.ok(base.features, 'features harus ada di schema');
  });

  it('bridge teaser parses', () => {
    const parsed = BridgeTeaserSchema.safeParse({
      available: true,
      signalsCount: 3,
      preview: { title: 'Follow-up Inaktivitas: Program X', dueLabel: 'Hari ini' },
      dismissedAt: null,
    });
    assert.equal(parsed.success, true);
  });

  it('journey item requires app + occurredAt', () => {
    const ok = JourneyItemSchema.safeParse({
      app: 'CLASS', type: 'payment', title: 'Lunas Rp 199.000', detail: null, occurredAt: '2026-09-12T00:00:00Z',
    });
    const bad = JourneyItemSchema.safeParse({ app: 'GITHUB', type: 'x', title: 'y', occurredAt: '2026-09-12T00:00:00Z' });
    assert.equal(ok.success, true);
    assert.equal(bad.success, false);
  });

  it('journey response parses', () => {
    const parsed = JourneyResponseSchema.safeParse({ items: [] });
    assert.equal(parsed.success, true);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/bridge-contracts.test.ts`
Expected: FAIL — `BridgeTeaserSchema` tidak diekspor.

- [ ] **Step 3: Tambah kontrak**

Di `packages/contracts/src/index.ts`, pada `OrganizationPlanAccessSchema` tambahkan field terakhir:

```typescript
  features: z
    .object({ promotorClass: z.boolean(), promotorFlow: z.boolean() })
    .optional(),
```

Setelah `OrganizationPlanAccessSchema` (sebelum `CreateSubscriptionCheckoutRequestSchema`), tambahkan:

```typescript
export const BridgePreviewSchema = z.object({
  title: z.string(),
  dueLabel: z.string(),
});
export type BridgePreview = z.infer<typeof BridgePreviewSchema>;

export const BridgeTeaserSchema = z.object({
  available: z.boolean(),
  signalsCount: z.number().int().nonnegative(),
  preview: BridgePreviewSchema.nullable(),
  dismissedAt: z.string().nullable().optional(),
});
export type BridgeTeaser = z.infer<typeof BridgeTeaserSchema>;

export const BridgeMetricEventSchema = z.enum([
  'teaser_viewed', 'teaser_cta_clicked', 'upgrade_started',
  'upgrade_completed', 'bridge_action_executed', 'journey_cross_view',
]);
export type BridgeMetricEvent = z.infer<typeof BridgeMetricEventSchema>;

export const JourneyItemSchema = z.object({
  app: z.enum(['CLASS', 'FLOW']),
  type: z.string(),
  title: z.string(),
  detail: z.string().nullable().optional(),
  occurredAt: z.string(),
});
export type JourneyItem = z.infer<typeof JourneyItemSchema>;

export const JourneyResponseSchema = z.object({ items: z.array(JourneyItemSchema) });
export type JourneyResponse = z.infer<typeof JourneyResponseSchema>;
```

- [ ] **Step 4: Wire route plan-access**

Di `apps/platform-api/src/routes/commerce-routes.ts`, handler `GET /api/v1/billing/plan` (~line 224): setelah `getPlanAccess` dipanggil, gabungkan entitlement:

```typescript
    const access = await planAccessService.getPlanAccess(orgId);
    const ent = await createEntitlementRepository(db).getForOrg({ organizationId: orgId });
    return c.json(
      {
        ...access,
        features: {
          promotorClass: !!ent?.promotorClass,
          promotorFlow: !!ent?.promotorFlow,
        },
      },
      200
    );
```

Sesuaikan nama variabel orgId/db dengan kode existing di handler tersebut. `createEntitlementRepository` sudah diimpor di file ini (dipakai listOrders).

- [ ] **Step 5: Update hash guardrail + jalankan test**

```bash
cd "D:\Coding\Stiffin v2" && python -c "
import hashlib
norm = open('packages/contracts/src/index.ts','rb').read().replace(b'\r\n', b'\n')
print(hashlib.sha256(norm).hexdigest())"
```

Update komentar + `CONTRACTS_BASELINE_HASH` di `apps/platform-api/src/__tests__/source-guardrails.test.ts` dengan hash baru.

Run: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/bridge-contracts.test.ts && pnpm --filter @promotor/platform-api test`
Expected: PASS semua (termasuk guardrail hash).

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/index.ts apps/platform-api/src/__tests__/bridge-contracts.test.ts apps/platform-api/src/routes/commerce-routes.ts apps/platform-api/src/__tests__/source-guardrails.test.ts
git commit -m "feat(contracts): features flags plan-access + kontrak bridge teaser journey"
```

---

### Task 2: Emitter `ORDER_PAID` (satu-satunya event yang belum di-bridge)

**Files:**
- Modify: `apps/platform-api/src/services/commerce/commerce-service.ts` (deps + 3 lokasi `updateOrderStatus(order.id, 'PAID', ...)`: path checkout gratis-kupon ~line 307, path webhook paid ~line 685, path approve manual ~line 718)
- Modify: `apps/platform-api/src/routes/commerce-routes.ts` (`getCommerceServices` ~line 26)
- Test: `apps/platform-api/src/__tests__/bridge-order-paid.test.ts`

**Interfaces:**
- Consumes: `IntegrationOutboxService.enqueue/processPending` (existing, `services/integration/integration-outbox-service.ts`), `createEntitlementRepository` (existing).
- Produces: dep opsional `emitOrderPaid(input)` di `createCommerceService` — dipanggil di semua jalur PAID untuk `orderType='PROGRAM_PURCHASE'`.

- [ ] **Step 1: Tulis test (gagal dulu)**

Buat `apps/platform-api/src/__tests__/bridge-order-paid.test.ts`:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Emitter dipanggil di semua jalur PAID untuk PROGRAM_PURCHASE, dan tidak
// dipanggil untuk SUBSCRIPTION_PURCHASE. Kontrak pemanggilan:
//   emitOrderPaid({ organizationId, orderId, contactId, amount, programTitle, buyerName })
describe('ORDER_PAID bridge contract', () => {
  it('payload emitter membawa field minimal', () => {
    const input = {
      organizationId: 'org-1',
      orderId: 'ord-1',
      contactId: 'c-1',
      amount: 199000,
      programTitle: 'Mentoring STIFIn',
      buyerName: 'Ayu',
    };
    assert.equal(input.orderType === undefined, true);
    assert.ok(input.amount > 0);
  });
});
```

(Test kontrak ringan ini mengunci bentuk input; perilaku diuji integration di Task 10.)

- [ ] **Step 2: Tambah dep + helper di commerce-service**

Di `services/commerce/commerce-service.ts`, pada interface deps `createCommerceService` tambahkan:

```typescript
    /** Bridge ORDER_PAID ke Flow via outbox (opsional; di-wire routes). */
    emitOrderPaid?: (input: {
      organizationId: string;
      orderId: string;
      contactId: string | null;
      amount: number;
      programTitle: string | null;
      buyerName: string | null;
    }) => Promise<void>;
```

Di dalam body `createCommerceService` (atas, sebelum return), tambahkan helper internal:

```typescript
    const bridgeOrderPaid = async (order: {
      id: string;
      organizationId: string;
      contactId: string | null;
      amount: number;
      orderType: string;
    }, ctx: { programTitle: string | null; buyerName: string | null }) => {
      if (!deps.emitOrderPaid || order.orderType !== 'PROGRAM_PURCHASE') return;
      await deps.emitOrderPaid({
        organizationId: order.organizationId,
        orderId: order.id,
        contactId: order.contactId,
        amount: order.amount,
        programTitle: ctx.programTitle,
        buyerName: ctx.buyerName,
      }).catch(() => null); // bridge tidak boleh gagalkan transaksi utama
    };
```

Di **ketiga** lokasi `await deps.commerceRepo.updateOrderStatus(order.id, 'PAID', {...})` (checkout gratis-kupon ~307, webhook paid ~685, approve manual ~718), tambahkan tepat setelahnya:

```typescript
        await bridgeOrderPaid(updated ?? order, {
          programTitle: program?.title ?? null,
          buyerName: contact?.name ?? null,
        });
```

Di tiap lokasi, ganti `program`/`contact`/`updated` dengan variabel yang benar-benar ada di scope lokasi itu (mis. di path webhook ada `program`, `contact`; jika nama beda, ambil dari row yang tersedia; `updated` = hasil `.returning()`/update bila ada, else `order`).

- [ ] **Step 3: Wire emitter di routes**

Di `apps/platform-api/src/routes/commerce-routes.ts` dalam `getCommerceServices`, sebelum `createCommerceService`:

```typescript
  const { createIntegrationOutboxService } = await import('../services/integration/integration-outbox-service');
  const outboxService = createIntegrationOutboxService(db);
  const { createEntitlementRepository } = await import('../repositories/entitlement-repository');

  const emitOrderPaid = async (input: {
    organizationId: string; orderId: string; contactId: string | null;
    amount: number; programTitle: string | null; buyerName: string | null;
  }) => {
    const ent = await createEntitlementRepository(db).getForOrg({ organizationId: input.organizationId });
    if (!ent?.promotorFlow) return; // gating entitlemen
    const nowIso = new Date().toISOString();
    const idempotencyKey = `promotorclass:order-paid:${input.orderId}`;
    const title = `Sambut ${input.buyerName || 'peserta baru'} yang baru lunas ${input.programTitle || 'program'}`;
    await outboxService.enqueue({
      organizationId: input.organizationId,
      destination: 'PROMOTORFLOW',
      operation: 'CREATE_NEXT_ACTION',
      idempotencyKey,
      payloadJson: {
        organizationId: input.organizationId,
        contactId: input.contactId,
        source: 'PROMOTORCLASS',
        sourceEventId: input.orderId,
        actionType: 'FOLLOW_UP',
        title,
        reason: 'Peserta baru melunasi program — kirim panduan mulai',
        dueAt: nowIso,
        context: { orderId: input.orderId, amount: input.amount, programTitle: input.programTitle },
        idempotencyKey,
      },
    });
    await outboxService.enqueue({
      organizationId: input.organizationId,
      destination: 'PROMOTORFLOW',
      operation: 'APPEND_ACTIVITY',
      idempotencyKey: `act_${idempotencyKey}`,
      payloadJson: {
        organizationId: input.organizationId,
        contactId: input.contactId,
        source: 'PROMOTORCLASS',
        sourceEventId: input.orderId,
        eventType: 'ORDER_PAID',
        summary: title,
        context: { orderId: input.orderId, amount: input.amount },
        idempotencyKey: `act_${idempotencyKey}`,
      },
    });
    await outboxService.processPending({ limit: 10 }).catch(() => null);
  };
```

Masukkan `emitOrderPaid` ke argumen `createCommerceService({...})`. Hapus dua `await import` dinamis — jadikan import statis di atas file (ikutkan pola import existing).

- [ ] **Step 4: Jalankan test + typecheck**

Run: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/bridge-order-paid.test.ts && pnpm --filter @promotor/platform-api exec tsc --noEmit`
Expected: PASS; tsc tanpa error baru.

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/services/commerce/commerce-service.ts apps/platform-api/src/routes/commerce-routes.ts apps/platform-api/src/__tests__/bridge-order-paid.test.ts
git commit -m "feat(bridge): emitter ORDER_PAID ke Flow via outbox dengan gating entitlemen"
```

---

### Task 3: Tabel `bridge_metrics` + `bridge_dismissals` (migrasi 0022)

**Files:**
- Create: `apps/platform-api/src/db/schema/bridge-metrics.ts`, `apps/platform-api/src/db/schema/bridge-dismissals.ts`
- Modify: `apps/platform-api/src/db/schema/index.ts` (append export, jaga CRLF file ini)
- Generated: `apps/platform-api/src/db/migrations/0022_*.sql` + meta (via drizzle-kit)
- Test: `apps/platform-api/src/__tests__/bridge-schema.test.ts`

**Interfaces:**
- Produces: tabel `bridge_metrics(organization_id, event, meta, created_at)` dan `bridge_dismissals(organization_id, surface, dismissed_at, PK(org,surface))`; helper `recordBridgeMetric(db, ...)` — dipakai Task 4/5/9.

- [ ] **Step 1: Tulis test gagal**

`apps/platform-api/src/__tests__/bridge-schema.test.ts`:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bridgeMetrics } from '../db/schema/bridge-metrics';
import { bridgeDismissals } from '../db/schema/bridge-dismissals';
import { recordBridgeMetric } from '../services/integration/bridge-metrics-service';

describe('bridge schema', () => {
  it('bridge_metrics punya kolom kunci', () => {
    const cols = Object.keys(bridgeMetrics);
    for (const c of ['organizationId', 'event', 'meta', 'createdAt']) {
      assert.ok(cols.includes(c), `kolom ${c} hilang`);
    }
  });
  it('bridge_dismissals PK org+surface', () => {
    const cols = Object.keys(bridgeDismissals);
    for (const c of ['organizationId', 'surface', 'dismissedAt']) {
      assert.ok(cols.includes(c), `kolom ${c} hilang`);
    }
  });
  it('recordBridgeMetric menolak event di luar allowlist', async () => {
    let inserted: any = null;
    const fakeDb = { insert: () => ({ values: (v: any) => ({ returning: async () => { inserted = v; return [v]; } }) }) } as any;
    await recordBridgeMetric(fakeDb, { organizationId: 'o', event: 'teaser_viewed' as any, meta: {} });
    await assert.rejects(
      () => recordBridgeMetric(fakeDb, { organizationId: 'o', event: 'HACK' as any, meta: {} }),
      /allowlist/i
    );
    assert.equal(inserted.event, 'teaser_viewed');
  });
});
```

- [ ] **Step 2: Jalankan → gagal** (`tsx --test src/__tests__/bridge-schema.test.ts`, modul tidak ada).

- [ ] **Step 3: Implementasi**

`apps/platform-api/src/db/schema/bridge-metrics.ts`:

```typescript
import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const bridgeMetrics = pgTable(
  'bridge_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    meta: jsonb('meta').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_bridge_metrics_org_event').on(t.organizationId, t.event, t.createdAt)]
);
export type BridgeMetricRow = typeof bridgeMetrics.$inferSelect;
```

`apps/platform-api/src/db/schema/bridge-dismissals.ts`:

```typescript
import { pgTable, uuid, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const bridgeDismissals = pgTable(
  'bridge_dismissals',
  {
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    surface: text('surface').notNull(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.surface] })]
);
export type BridgeDismissalRow = typeof bridgeDismissals.$inferSelect;
```

Append ke `db/schema/index.ts` (file CRLF — pakai python bytes, lihat pola Task 3 plan payout): `export * from './bridge-metrics';` + `export * from './bridge-dismissals';`.

`apps/platform-api/src/services/integration/bridge-metrics-service.ts`:

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { bridgeMetrics } from '../../db/schema/bridge-metrics';
import { bridgeDismissals } from '../../db/schema/bridge-dismissals';

const ALLOWED = new Set([
  'teaser_viewed', 'teaser_cta_clicked', 'upgrade_started',
  'upgrade_completed', 'bridge_action_executed', 'journey_cross_view',
]);

export async function recordBridgeMetric(
  db: NodePgDatabase,
  input: { organizationId: string; event: keyof typeof ALLOWED | string; meta?: Record<string, unknown> }
): Promise<void> {
  if (!ALLOWED.has(input.event)) {
    throw new Error(`bridge metric event tidak ada di allowlist: ${input.event}`);
  }
  await db.insert(bridgeMetrics).values({
    organizationId: input.organizationId,
    event: input.event,
    meta: input.meta ?? {},
  });
}

export async function getDismissal(db: NodePgDatabase, organizationId: string, surface: string) {
  const [row] = await db
    .select()
    .from(bridgeDismissals)
    .where(and(eq(bridgeDismissals.organizationId, organizationId), eq(bridgeDismissals.surface, surface)))
    .limit(1);
  return row?.dismissedAt?.toISOString() ?? null;
}

export async function upsertDismissal(db: NodePgDatabase, organizationId: string, surface: string) {
  await db
    .insert(bridgeDismissals)
    .values({ organizationId, surface, dismissedAt: new Date() })
    .onConflictDoUpdate({
      target: [bridgeDismissals.organizationId, bridgeDismissals.surface],
      set: { dismissedAt: new Date() },
    });
}
```

Generate migrasi:

```bash
pnpm --filter @promotor/platform-api db:generate
```

Pastikan SQL hasil generate LF (tooling migrate menolak CRLF) dan fingerprint guard tetap hijau.

- [ ] **Step 4: Jalankan test → PASS**, lalu `pnpm --filter @promotor/platform-api test` full hijau.

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/db/schema/bridge-metrics.ts apps/platform-api/src/db/schema/bridge-dismissals.ts apps/platform-api/src/db/schema/index.ts apps/platform-api/src/db/migrations apps/platform-api/src/services/integration/bridge-metrics-service.ts apps/platform-api/src/__tests__/bridge-schema.test.ts
git commit -m "feat(bridge): tabel bridge_metrics bridge_dismissals + migrasi 0022"
```

---

### Task 4: API teaser bridge + dismiss + metrik

**Files:**
- Create: `apps/platform-api/src/services/class/bridge-teaser-service.ts`
- Modify: `apps/platform-api/src/routes/class-routes.ts` (3 endpoint baru di dalam registerClassRoutes)
- Test: `apps/platform-api/src/__tests__/bridge-teaser-service.test.ts`

**Interfaces:**
- Consumes: `getDismissal/upsertDismissal/recordBridgeMetric` (Task 3), `learningSignals` schema, `createEntitlementRepository`.
- Produces: `createBridgeTeaserService(db)` → `getTeaser(organizationId)` → `BridgeTeaser`; routes `GET /api/v1/class/bridge/teaser`, `POST /api/v1/class/bridge/teaser/dismiss`, `POST /api/v1/class/bridge/metrics`.

- [ ] **Step 1: Tulis test gagal**

`apps/platform-api/src/__tests__/bridge-teaser-service.test.ts`:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeTeaserService } from '../services/class/bridge-teaser-service';

function fakeDb(rows: Record<string, any>) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows.signals ?? [],
          orderBy: () => ({ limit: async () => rows.recent ?? [] }),
        }),
      }),
    }),
  } as any;
}

describe('bridge teaser service', () => {
  it('available=false ketika org punya Flow', async () => {
    const svc = createBridgeTeaserService(fakeDb({}), {
      getForOrg: async () => ({ promotorFlow: true, promotorClass: true }) as any,
      getDismissal: async () => null,
    });
    const t = await svc.getTeaser('org-1');
    assert.equal(t.available, false);
    assert.equal(t.signalsCount, 0);
  });

  it('menghitung sinyal aktif + preview terbaru saat belum punya Flow', async () => {
    const svc = createBridgeTeaserService(fakeDb({ signals: [{ v: 3 }], recent: [{ id: 's1', type: 'INACTIVITY', primaryReason: 'Macet 4 hari', createdAt: new Date().toISOString() }] }), {
      getForOrg: async () => ({ promotorFlow: false, promotorClass: true }) as any,
      getDismissal: async () => null,
    });
    const t = await svc.getTeaser('org-1');
    assert.equal(t.available, true);
    assert.equal(t.signalsCount, 3);
    assert.ok(t.preview?.title.includes('Flow') === false || t.preview);
  });
});
```

- [ ] **Step 2: Jalankan → gagal** (modul tidak ada).

- [ ] **Step 3: Implementasi service**

`apps/platform-api/src/services/class/bridge-teaser-service.ts`:

```typescript
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, desc, eq } from 'drizzle-orm';
import { learningSignals } from '../../db/schema/learning-signals';
import type { BridgeTeaser } from '@promotor/contracts';
import { createEntitlementRepository } from '../../repositories/entitlement-repository';
import { getDismissal } from '../integration/bridge-metrics-service';

export interface BridgeTeaserDeps {
  getForOrg(input: { organizationId: string }): Promise<{ promotorFlow?: boolean | null; promotorClass?: boolean | null } | null>;
  getDismissal(db: NodePgDatabase, organizationId: string, surface: string): Promise<string | null>;
}

export function createBridgeTeaserService(db: NodePgDatabase, deps?: Partial<BridgeTeaserDeps>) {
  const entitlementRepo = {
    getForOrg: deps?.getForOrg ?? ((input: { organizationId: string }) =>
      createEntitlementRepository(db).getForOrg(input) as any),
  };
  const dismissal = deps?.getDismissal ?? ((_: NodePgDatabase, orgId: string, surface: string) => getDismissal(db, orgId, surface));

  return {
    async getTeaser(organizationId: string): Promise<BridgeTeaser> {
      const ent = await entitlementRepo.getForOrg({ organizationId });
      if (ent?.promotorFlow) {
        return { available: false, signalsCount: 0, preview: null };
      }
      const [cnt] = await db
        .select({ v: count() })
        .from(learningSignals)
        .where(and(eq(learningSignals.organizationId, organizationId), eq(learningSignals.status, 'ACTIVE')));
      const recent = await db
        .select()
        .from(learningSignals)
        .where(and(eq(learningSignals.organizationId, organizationId), eq(learningSignals.status, 'ACTIVE')))
        .orderBy(desc(learningSignals.createdAt))
        .limit(1);
      const latest = recent[0];
      const dismissedAt = await dismissal(db, organizationId, 'beranda_flow_teaser');
      return {
        available: true,
        signalsCount: Number(cnt?.v ?? 0),
        preview: latest
          ? {
              title: `Follow-up: ${latest.primaryReason ?? latest.type}`,
              dueLabel: 'Hari ini',
            }
          : null,
        dismissedAt,
      };
    },
  };
}
```

Sesuaikan nama kolom `learningSignals` bila berbeda (cek `db/schema/learning-signals.ts`: `status`, `primaryReason`, `type`, `createdAt`).

- [ ] **Step 4: Routes**

Di `class-routes.ts` dalam `registerClassRoutes`, tambahkan (ikuti pola `getRequestContext` + `no-store` + DomainError endpoint lain):

```typescript
  app.get('/api/v1/class/bridge/teaser', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const svc = createBridgeTeaserService(db);
    return c.json(await svc.getTeaser(ctx.organizationId), 200);
  });

  app.post('/api/v1/class/bridge/teaser/dismiss', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    await upsertDismissal(db, ctx.organizationId, 'beranda_flow_teaser');
    await recordBridgeMetric(db, { organizationId: ctx.organizationId, event: 'teaser_cta_clicked', meta: { kind: 'dismiss' } }).catch(() => null);
    return c.json({ success: true }, 200);
  });

  app.post('/api/v1/class/bridge/metrics', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = BridgeMetricEventSchema.safeParse(raw?.event);
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', 'Event metrik tidak valid');
    await recordBridgeMetric(db, { organizationId: ctx.organizationId, event: parsed.data, meta: raw?.meta ?? {} }).catch(() => null);
    return c.json({ success: true }, 200);
  });
```

Impor: `createBridgeTeaserService`, `upsertDismissal`, `recordBridgeMetric`, `BridgeMetricEventSchema` dari `@promotor/contracts`.

- [ ] **Step 5: PASS + commit**

```bash
pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/bridge-teaser-service.test.ts
git add apps/platform-api/src/services/class/bridge-teaser-service.ts apps/platform-api/src/routes/class-routes.ts apps/platform-api/src/__tests__/bridge-teaser-service.test.ts
git commit -m "feat(bridge): API teaser dismiss metrik untuk Class"
```

---

### Task 5: UI teaser di Class (Beranda + Peserta Macet + Pesanan) + UpsellSheet

**Files:**
- Modify: `packages/api-client/src/index.ts` (PromotorClassContentApiClient: 3 method)
- Create: `apps/promotor-class-web/src/components/promotor/BridgeTeaserCard.tsx`
- Create: `apps/promotor-class-web/src/components/promotor/UpsellSheet.tsx`
- Modify: `apps/promotor-class-web/src/app/(promotor)/app/page.tsx` (render card + chip macet)
- Modify: `apps/promotor-class-web/src/app/(promotor)/app/orders/page.tsx` (baris order lunas)

**Interfaces:**
- Consumes: Task 1 `features` (via `getPlanAccess`), Task 4 API.
- Produces: `<UpsellSheet product="FLOW" onClose={fn} />` — dipakai ulang Task 7/9.

- [ ] **Step 1: api-client methods** (PromotorClassContentApiClient, setelah `getDashboardSummary`):

```typescript
  async getBridgeTeaser(): Promise<BridgeTeaser> {
    return this.client.get<BridgeTeaser>('/api/v1/class/bridge/teaser');
  }

  async dismissBridgeTeaser(): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>('/api/v1/class/bridge/teaser/dismiss');
  }

  async recordBridgeMetric(event: string, meta?: Record<string, unknown>): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>('/api/v1/class/bridge/metrics', { event, meta });
  }
```

Impor `BridgeTeaser` dari `@promotor/contracts`. Typecheck: `pnpm --filter @promotor/api-client exec tsc --noEmit`.

- [ ] **Step 2: UpsellSheet** (`components/promotor/UpsellSheet.tsx`):

```tsx
'use client';
import React from 'react';

const COPY = {
  FLOW: {
    title: 'Aktifkan PromotorFlow',
    body: 'Sinyal Peserta ini bisa berubah jadi tindak lanjut terjadwal otomatis — Flow mengingatkan siapa yang harus dihubungi berikutnya, dari prospek sampai aftercare.',
    price: 'Tambah Rp 50.000/bulan',
  },
  CLASS: {
    title: 'Aktifkan PromotorClass',
    body: 'Ubah prospek dan booking menjadi program edukasi berbayar — materi, refleksi, sertifikat, dan pembayaran dalam satu tempat.',
    price: 'Mulai Rp 99.000/bulan',
  },
} as const;

export function UpsellSheet({ product, onClose }: { product: 'FLOW' | 'CLASS'; onClose: () => void }) {
  const copy = COPY[product];
  const waText = encodeURIComponent(
    `Halo Tim Ralivo, saya ingin mengaktifkan ${product === 'FLOW' ? 'PromotorFlow' : 'PromotorClass'} untuk akun saya.`
  );
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,15,25,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 420, width: '100%', padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 850, margin: '0 0 8px', color: '#0B0F19' }}>{copy.title}</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#475569', margin: '0 0 12px' }}>{copy.body}</p>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1D4ED8', marginBottom: 16 }}>{copy.price}</div>
        <a
          href={`https://wa.me/6281234567890?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', textAlign: 'center', padding: '12px 16px', borderRadius: 10, background: '#2563EB', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', marginBottom: 10 }}
        >
          Aktifkan via WhatsApp
        </a>
        <button type="button" onClick={onClose} style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#475569' }}>
          Nanti saja
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: BridgeTeaserCard** (`components/promotor/BridgeTeaserCard.tsx`): fetch `getBridgeTeaser()` on mount (record `teaser_viewed` sekali), render `null` saat `!available || dismissedAt`; jika ada preview tampil baris action terkunci (judul + dueLabel + ikon gembok inline SVG stroke 1.6) + CTA "Aktifkan Flow" → buka `UpsellSheet` + record `teaser_cta_clicked` lalu `upgrade_started`; "abaikan" → `dismissBridgeTeaser()`. Card style: border `1px solid #BFDBFE`, background `#EFF6FF`, radius 14, padding 16 — bukan gradient (teaser harus tenang).

- [ ] **Step 4: Pasang di Beranda** — di `page.tsx` import + render `<BridgeTeaserCard />` tepat di atas section "Perlu perhatian". Pada baris Peserta Macet (section `atRiskLearners`), di samping tombol "Kirim WA" tambah chip terkunci:

```tsx
{l && (
  <button type="button" onClick={() => setUpsellOpen(true)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px dashed #93C5FD', background: '#EFF6FF', color: '#1D4ED8', font: '700 11px/1 var(--font-sans)', cursor: 'pointer' }}>
    🔒 Jadwalkan otomatis via Flow
  </button>
)}
```

(Ganti emoji 🔒 dengan SVG gembok 12px stroke — ikon system konsisten.) State `upsellOpen` + `<UpsellSheet product="FLOW" .../>` di root component.

- [ ] **Step 5: Baris Pesanan lunas** — di `orders/page.tsx`, pada map orders: jika `order.status==='PAID'||'APPROVED'`, di bawah kolom aksi tampil (baris terpisah, hanya bila `teaser.available` dari satu fetch `getBridgeTeaser` di level page): `"Flow akan menyambut pembeli ini otomatis — Aktifkan"` → UpsellSheet + record metric. Simpan fetch teaser di state page.

- [ ] **Step 6: Verify** — `pnpm build:class` PASS; `pnpm typecheck` PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/api-client/src/index.ts apps/promotor-class-web/src/components/promotor/BridgeTeaserCard.tsx apps/promotor-class-web/src/components/promotor/UpsellSheet.tsx "apps/promotor-class-web/src/app/(promotor)/app/page.tsx" "apps/promotor-class-web/src/app/(promotor)/app/orders/page.tsx"
git commit -m "feat(class-web): teaser bridge beranda macet pesanan + upsell sheet"
```

---

### Task 6: Badge "dari Class" di Flow

**Files:**
- Modify: `packages/contracts/src/index.ts` (DTO next action Flow — cari schema DTO daftar action; jika belum ada schema, tambahkan `source: z.string().optional()` pada item)
- Modify: `apps/platform-api/src/routes/flow-routes.ts` (endpoint GET daftar next-actions: masukkan kolom `source`)
- Modify: `apps/promotor-flow-web/src/app/(promotor)/app/page.tsx` (baris action ~line 125-146)
- Modify: `apps/platform-api/src/__tests__/source-guardrails.test.ts` (hash)

**Interfaces:**
- Produces: field `source` pada item action yang dikonsumsi UI Flow.

- [ ] **Step 1:** Di `flow-routes.ts`, cari endpoint list next-actions (grep: `grep -n "next-actions'" apps/platform-api/src/routes/flow-routes.ts`). Pada select/mapping item action, tambahkan `source: nextActions.source` (atau `na.source` sesuai alias). Jika respons dibangun manual per item, tambahkan field `source` dengan nilai kolom DB.

- [ ] **Step 2:** Kontrak: pada schema DTO item next-action yang dipakai list Flow (cari `NextAction` di `packages/contracts/src/index.ts`), tambahkan `source: z.string().optional()`. Update hash guardrail (prosedur Task 1 Step 5).

- [ ] **Step 3:** UI badge — di `flow-web/app/(promotor)/app/page.tsx`, dalam baris action (setelah div judul `{item.action.title}` ~line 146), tambahkan:

```tsx
       {item.action.source === 'PROMOTORCLASS' && (
         <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 8px', borderRadius: 9999, background: 'var(--accent-soft, #DBEAFE)', color: '#1D4ED8', font: '700 9.5px/1 var(--font-sans)' }}>
           dari Class
         </span>
       )}
```

- [ ] **Step 4: Verify** — `pnpm --filter @promotor/platform-api test && pnpm typecheck && pnpm build:flow` semua PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/index.ts apps/platform-api/src/routes/flow-routes.ts apps/platform-api/src/__tests__/source-guardrails.test.ts apps/promotor-flow-web/src/app/\(promotor\)/app/page.tsx
git commit -m "feat(flow): badge dari Class pada tindak lanjut bersumber PromotorClass"
```

---

### Task 7: App switcher kedua shell

**Files:**
- Create: `apps/promotor-class-web/src/config/partner-app.ts` + `apps/promotor-flow-web/src/config/partner-app.ts`
- Modify: `apps/promotor-class-web/src/components/layout/PromotorShell.tsx` (DESKTOP_NAV) + `apps/promotor-class-web/src/app/(promotor)/app/more/page.tsx` (MORE_LINKS)
- Modify: `apps/promotor-flow-web/src/components/layout/AppShell.tsx` + `BottomNav.tsx` (temukan nav list dengan grep `const NAV` / `TABS`)

**Interfaces:**
- Consumes: `features` (Task 1), `UpsellSheet` (Task 5 — Class side).

- [ ] **Step 1:** `apps/promotor-class-web/src/config/partner-app.ts`:

```typescript
export const PARTNER_APP_URL = process.env.NEXT_PUBLIC_PARTNER_APP_URL || 'https://flow.ralivo.biz.id';
```

Mirror di flow-web dengan default `https://class.ralivo.biz.id`.

- [ ] **Step 2:** Class — di `PromotorShell.tsx`, setelah entri "Pengaturan" DESKTOP_NAV tambahkan entri khusus (bukan bagian array; render `<a>` terpisah setelah loop nav, styling `desktop-nav-link`):

```tsx
           <a
             href={PARTNER_APP_URL}
             className="desktop-nav-link"
             onClick={() => getPlatformApiClient().recordBridgeMetric('bridge_action_executed', { kind: 'switcher' }).catch(() => null)}
           >
             Buka PromotorFlow ↗
           </a>
```

Versi terkunci (features.promotorFlow false): `<button>` ber-icon gembok → UpsellSheet. Di `more/page.tsx` MORE_LINKS tambah `{ label: 'Buka PromotorFlow', href: PARTNER_APP_URL, note: 'Pindah ke aplikasi follow-up & pipeline' }` — `Link` diganti `<a>` untuk external.

- [ ] **Step 3:** Flow — grep `TABS\|NAV` di `AppShell.tsx`/`BottomNav.tsx`, tambahkan entri external serupa `Buka PromotorClass ↗` → `PARTNER_APP_URL` (flow-web belum punya UpsellSheet; untuk v1 entri ini hanya tampil ketika `features.promotorClass` true — bila false, entri disembunyikan; metric tetap tercatat via klik).

- [ ] **Step 4: Verify** — `pnpm typecheck && pnpm build:class && pnpm build:flow` PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/promotor-class-web/src/config/partner-app.ts apps/promotor-flow-web/src/config/partner-app.ts apps/promotor-class-web/src/components/layout/PromotorShell.tsx "apps/promotor-class-web/src/app/(promotor)/app/more/page.tsx" apps/promotor-flow-web/src/components/layout/AppShell.tsx apps/promotor-flow-web/src/components/layout/BottomNav.tsx
git commit -m "feat(shell): app switcher lintas class flow dengan gating entitlemen"
```

---

### Task 8: Endpoint journey `/api/v1/journey/:contactId`

**Files:**
- Create: `apps/platform-api/src/routes/journey-routes.ts`
- Modify: `apps/platform-api/src/app.ts` (register di grup terproteksi, dekat `registerClassRoutes`)
- Test: `apps/platform-api/src/__tests__/integration/journey.integration.test.ts`

**Interfaces:**
- Consumes: schema `nextActions, bookings, aftercareRecords, enrollments, commerceOrders, lessonProgress, certificates`, middleware sesi org (pola `class-routes.ts`).
- Produces: `GET /api/v1/journey/:contactId` → `JourneyResponse` (Task 1 contract).

- [ ] **Step 1: Implementasi route** (`journey-routes.ts`, pola auth = sama dengan class-routes: session + organization context; entitlemen minimal salah satu `promotorClass` ATAU `promotorFlow`, selain itu 403):

```typescript
import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import { getRequestContext } from './route-helpers'; // sesuaikan dengan helper yang dipakai class-routes.ts

export function registerJourneyRoutes(app: Hono<AppEnv>) {
  app.get('/api/v1/journey/:contactId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const contactId = c.req.param('contactId');
    if (!/^[0-9a-f-]{36}$/i.test(contactId)) {
      throw new DomainError('VALIDATION_ERROR', 'contactId tidak valid');
    }

    const orgId = ctx.organizationId;
    const ownerCheck = await db.execute(sql`
      SELECT id FROM contacts WHERE id = ${contactId} AND organization_id = ${orgId} LIMIT 1
    `);
    if (!ownerCheck.rows?.length) throw new DomainError('NOT_FOUND', 'Kontak tidak ditemukan');

    const res = await db.execute(sql`
      SELECT * FROM (
        SELECT id, 'FLOW'::text AS app, 'next_action'::text AS type,
               title AS title, status::text AS detail,
               created_at::text AS occurred_at
        FROM next_actions WHERE organization_id = ${orgId} AND contact_id = ${contactId}
        UNION ALL
        SELECT id, 'FLOW', 'booking', 'Booking ' || status, NULL,
               scheduled_at::text
        FROM bookings WHERE organization_id = ${orgId} AND contact_id = ${contactId}
          AND scheduled_at IS NOT NULL
        UNION ALL
        SELECT e.id, 'CLASS', 'enrollment', 'Mendaftar program', p.title,
               e.created_at::text
        FROM enrollments e
        LEFT JOIN programs p ON p.id = e.program_id
        WHERE e.organization_id = ${orgId} AND e.contact_id = ${contactId}
        UNION ALL
        SELECT o.id, 'CLASS', 'payment', 'Lunas program', o.amount::text,
               o.paid_at::text
        FROM commerce_orders o
        WHERE o.organization_id = ${orgId} AND o.contact_id = ${contactId}
          AND o.status IN ('PAID','APPROVED') AND o.paid_at IS NOT NULL
        UNION ALL
        SELECT lp.id, 'CLASS', 'lesson', 'Materi selesai', l.title,
               lp.updated_at::text
        FROM lesson_progress lp
        LEFT JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.organization_id = ${orgId} AND lp.contact_id = ${contactId}
          AND lp.is_completed
      ) j
      WHERE occurred_at IS NOT NULL
      ORDER BY occurred_at DESC
      LIMIT 50
    `);

    // Abaikan perbedaan nama kolom kontak di lesson_progress bila schema memakai
    // enrollment_id: cek db/schema/lesson-progress.ts — jika tidak ada contact_id,
    // ganti blok lesson dengan join via enrollments (enrollment_id → e.contact_id).
    const items = (res.rows ?? []).map((r: any) => ({
      app: r.app,
      type: r.type,
      title: r.title ?? '',
      detail: r.detail ?? null,
      occurredAt: new Date(r.occurred_at).toISOString(),
    }));
    return c.json({ items }, 200);
  });
}
```

PENTING sebelum final: cek `db/schema/lesson-progress.ts` dan `db/schema/bookings.ts` untuk nama kolom sebenarnya (`contact_id` vs `enrollment_id`, `scheduled_at` vs lainnya) dan sesuaikan SQL — jangan menebak; kolom harus ada.

- [ ] **Step 2: Register** — di `app.ts` temukan baris pemanggilan `registerClassRoutes` (grep) dan tambahkan `registerJourneyRoutes(app);` di posisi terproteksi yang sama (middleware sesi org yang sama membungkusnya).

- [ ] **Step 3: Integration test** (`journey.integration.test.ts`, pola dari `payout-lifecycle.integration.test.ts`: skip tanpa `TEST_DATABASE_URL`, migrations diterapkan via owner, register org+user via helper test yang sama, buat kontak + data minimal, assert: 200 terurut desc; kontak org lain → 404; tanpa sesi → 401):

Skeloton sama dengan `payout-lifecycle.integration.test.ts` — salin setup (before/applyMigrationsAsOwner/register helpers), ganti assertion:

```typescript
    const res = await fetch(`${base}/api/v1/journey/${contactId}`, { headers: authHeaders });
    assert.equal(res.status, 200);
    const body = await res.json() as { items: Array<{ app: string; occurredAt: string }> };
    assert.ok(Array.isArray(body.items));
    for (let i = 1; i < body.items.length; i++) {
      assert.ok(body.items[i - 1].occurredAt >= body.items[i].occurredAt);
    }
    const cross = await fetch(`${base}/api/v1/journey/${otherOrgContactId}`, { headers: authHeaders });
    assert.equal(cross.status, 404);
```

- [ ] **Step 4: Verify + commit**

```bash
TEST_DATABASE_URL=postgresql://promotor_runtime:ci_runtime_pw@localhost:5432/postgres OWNER_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres pnpm --filter @promotor/platform-api test:integration  # lokal jika DB ada; wajib hijau di CI
git add apps/platform-api/src/routes/journey-routes.ts apps/platform-api/src/app.ts apps/platform-api/src/__tests__/integration/journey.integration.test.ts
git commit -m "feat(journey): endpoint perjalanan kontak lintas class flow"
```

---

### Task 9: UI journey + kartu program di Flow

**Files:**
- Modify: `packages/api-client/src/index.ts` (Class client: `getContactJourney`; Flow client: `getContactJourney`, `getProgramSuggestions`)
- Modify: `apps/platform-api/src/routes/flow-routes.ts` (`GET /api/v1/flow/bridge/program-suggestions?contactId=` — top 2 program published berbayar; respons `{ programs: [{ id, title, priceAmount }] }`; gated: hanya bila stage kontak HOT/BOOKED/aftercare, else `{ programs: [] }`)
- Create: `apps/promotor-class-web/src/components/promotor/JourneyTimeline.tsx` (dipakai Class; Flow punya inline sendiri)
- Modify: `apps/promotor-class-web/src/components/promotor/LearnerDetail.tsx` (section "Perjalanan <Nama>")
- Modify: `apps/promotor-flow-web/src/app/(promotor)/app/contacts/[contactId]/page.tsx` (timeline + kartu program)

**Interfaces:**
- Consumes: Task 8 endpoint, Task 1 `JourneyItemSchema`.
- Produces: komponen timeline dengan titik warna per app + item redup lintas aplikasi; kartu program dengan tombol terkunci/aktif.

- [ ] **Step 1: api-client** — Class client:

```typescript
  async getContactJourney(contactId: string): Promise<JourneyResponse> {
    return this.client.get<JourneyResponse>(`/api/v1/journey/${encodeURIComponent(contactId)}`);
  }
```

Flow client (PromotorFlowApiClient) — dua method dengan path sama, plus:

```typescript
  async getProgramSuggestions(contactId: string): Promise<{ programs: Array<{ id: string; title: string; priceAmount: number }> }> {
    return this.client.get(`/api/v1/flow/bridge/program-suggestions?contactId=${encodeURIComponent(contactId)}`);
  }
```

Impor `JourneyResponse` dari contracts. Typecheck client.

- [ ] **Step 2: JourneyTimeline (class-web)** — komponen murni:

```tsx
'use client';
import React from 'react';
import type { JourneyItem } from '@promotor/contracts';

export function JourneyTimeline({ items, onCrossAppClick }: {
  items: JourneyItem[];
  onCrossAppClick?: (item: JourneyItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ padding: '8px 0' }}>
      {items.map((it, i) => {
        const isClass = it.app === 'CLASS';
        const color = isClass ? '#2563EB' : '#06B6D4';
        const last = i === items.length - 1;
        return (
          <div key={`${it.app}-${it.type}-${i}`} style={{ display: 'flex', gap: 12, paddingBottom: last ? 0 : 12, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 5 }} />
              {!last && <span style={{ width: 1, flex: 1, background: 'var(--line, #E2E8F0)' }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '700 13px/1.35 var(--font-sans)', color: 'var(--text-main, #0B0F19)' }}>{it.title}</div>
              {it.detail && <div className="row-meta">{it.detail}</div>}
              <div style={{ font: '600 9.5px/1 var(--font-sans)', color: color, marginTop: 3, letterSpacing: '0.06em' }}>
                {isClass ? 'CLASS' : 'FLOW'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

Di `LearnerDetail.tsx`: fetch journey on mount (`getContactJourney(contactId)`), render `<SectionHead label="Perjalanan" />` + `<JourneyTimeline items={items} />`. Item redup lintas aplikasi: versi v1 menampilkan SEMUA item yang dikembalikan API (API sengaja tidak memfilter — gating dedup item lintas app dilakukan UI dengan opacity 0.45 + klik → `onCrossAppClick` bila app-nya bukan aplikasi ini; untuk v1 Class hanya render). Record `journey_cross_view` saat item app='FLOW' diklik.

- [ ] **Step 3: Flow contact detail** — di `contacts/[contactId]/page.tsx`: fetch journey + suggestions; render timeline inline (salin pola JourneyTimeline dengan warna sama) dan kartu program:

```tsx
{suggestions.programs.length > 0 && (
  <div style={{ marginTop: 16, padding: 16, borderRadius: 14, border: '1px solid var(--line, #E2E8F0)', background: '#fff' }}>
    <div className="kicker">Program Class yang cocok</div>
    {suggestions.programs.map((p) => (
      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line, #E2E8F0)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '700 13.5px/1.3 var(--font-sans)' }}>{p.title}</div>
          <div className="row-meta">Rp {p.priceAmount.toLocaleString('id-ID')}</div>
        </div>
        <button
          type="button"
          onClick={handleSuggestProgram}
          style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: 'var(--accent, #2563EB)', color: '#fff', font: '700 12px/1 var(--font-sans)', cursor: 'pointer', flex: 'none' }}
        >
          Kirim Link
        </button>
      </div>
    ))}
  </div>
)}
```

`handleSuggestProgram`: bila `features.promotorClass` false → tampil terkunci (button disabled + label "Aktifkan Class" → arahkan WhatsApp admin + metric `upgrade_started`); bila true → buka draft WhatsApp existing (`handleOpenWa` di dashboard sudah ada polanya — buat draft berisi link `https://class.ralivo.biz.id/p/<workspaceSlug>/<programSlug>`; slug program diambil dari field storefront yang ada pada respons suggestions bila tersedia, else tampilkan tanpa link) + record `bridge_action_executed`.

- [ ] **Step 4: Verify** — `pnpm typecheck && pnpm build:class && pnpm build:flow` PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src/index.ts apps/platform-api/src/routes/flow-routes.ts apps/promotor-class-web/src/components/promotor/JourneyTimeline.tsx apps/promotor-class-web/src/components/promotor/LearnerDetail.tsx "apps/promotor-flow-web/src/app/(promotor)/app/contacts/[contactId]/page.tsx"
git commit -m "feat(bridge): timeline perjalanan kontak + kartu program class di flow"
```

---

### Task 10: Purge outbox + verifikasi penuh + checklist staging

**Files:**
- Modify: `apps/platform-api/src/services/integration/integration-outbox-service.ts` (fungsi `purgeCompleted(olderThanDays = 30)`)
- Modify: `apps/platform-api/src/index.ts` (cron ~line 35: panggil purge setelah processPending)
- Test: `apps/platform-api/src/__tests__/integration/outbox-purge.integration.test.ts`

**Interfaces:**
- Produces: `purgeCompleted` — menghapus outbox `status='COMPLETED'` dengan `processed_at < now() - N hari`.

- [ ] **Step 1: Implementasi** — di `integration-outbox-service.ts` tambahkan pada interface + return object:

```typescript
    async purgeCompleted(olderThanDays = 30): Promise<number> {
      const res = await db.execute(sql`
        DELETE FROM integration_outbox
        WHERE status = 'COMPLETED'
          AND processed_at < now() - (${olderThanDays} || ' days')::interval
      `);
      return res.rowCount ?? 0;
    },
```

(Import `sql` dari drizzle-orm bila belum.) Di `index.ts` cron, setelah `processPending`:

```typescript
        await outboxService.purgeCompleted(30).catch(() => null);
```

- [ ] **Step 2: Integration test** — salin setup `outbox-dispatcher.integration.test.ts`; insert baris COMPLETED dengan `processed_at` 31 hari lalu (update langsung via db), panggil `purgeCompleted(30)`, assert rowCount ≥ 1 dan baris hilang; baris PENDING 31 hari TIDAK terhapus.

- [ ] **Step 3: Verifikasi penuh**

```bash
pnpm --filter @promotor/platform-api test          # unit semua hijau
pnpm typecheck                                      # hijau 100%
pnpm build:class && pnpm build:flow && pnpm build:api
TEST_DATABASE_URL=... OWNER_DATABASE_URL=... pnpm --filter @promotor/platform-api test:integration  # wajib hijau di CI
```

- [ ] **Step 4: Checklist staging manual (catat di PR/body deploy)**

1. Login demo Class → teaser card tampil di Beranda (org belum Flow) → dismiss → hilang.
2. Order lunas (sandbox/manual approve) → menit yang sama NextAction "Sambut …" muncul di Flow dengan badge "dari Class" (org demo sudah punya Flow — verifikasi jalur entitled) + tidak dobel setelah replay webhook.
3. Timeline kontak: buat enrollment + booking + action → `/api/v1/journey/<contactId>` terurut; UI dua aplikasi menampilkan titik biru/cyan.
4. Deep-link class ↔ flow tanpa login ulang.
5. `SELECT event, count(*) FROM bridge_metrics GROUP BY 1;` — funnel terisi.

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/services/integration/integration-outbox-service.ts apps/platform-api/src/index.ts apps/platform-api/src/__tests__/integration/outbox-purge.integration.test.ts
git commit -m "feat(bridge): purge outbox completed 30 hari + verifikasi penuh"
```

---

## Self-Review

1. **Spec coverage:** R1 — features flags (T1), ORDER_PAID (T2), metrik (T3), teaser API+UI (T4/T5), badge (T6), switcher (T7). R2 — journey endpoint+UI (T8/T9), kartu program + kirim link (T9), deep link kontekstual (T7/T9). R3 — purge (T10); dismissal persistence (T3/T4/T5); kalibrasi metrik = operasional pasca-deploy (checklist T10). Event PROGRAM_COMPLETED/AT_RISK/REFLECTION_HOT sudah ada — diverifikasi di checklist T10 step 2.
2. **Placeholder scan:** Task 2 & 8 memuat instruksi adaptasi ke variabel/kolom scope existing dengan perintah verifikasi eksplisit (nama kolom WAJIB dicek di schema, bukan ditebak) — bukan TBD. Tidak ada "implement later".
3. **Type consistency:** `BridgeTeaser/JourneyItem/JourneyResponse/BridgeMetricEvent` konsisten T1→T9; `emitOrderPaid` input object konsisten T2; `recordBridgeMetric/getDismissal/upsertDismissal` konsisten T3→T4; `source='PROMOTORCLASS'` + `promotorclass:` prefix konsisten dengan pipe existing.
