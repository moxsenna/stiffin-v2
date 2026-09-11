# Class Payout + Earnings Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build manual-settlement payout for Class (net ledger, batches with proof, bank accounts) plus earnings dashboard, payout page, bank CRUD, and Beranda summary cards.

**Architecture:** Canonical ledger stays in Postgres (commerce_orders, payment_records, platform_fee_entries). New payout_batches + payout_items record manual transfers. Pure net math in one function. Server computes all money; client only renders. One endpoint per screen (orders+summary, payouts, bank-accounts, dashboard-summary).

**Tech Stack:** Hono 4.7.2 API on Cloudflare Workers + Hyperdrive + Neon Postgres, Drizzle ORM 0.45.2 + pg 8.16.3 + drizzle-kit 0.30.6, Better Auth 1.6.28, Next 15.3.8 class web, zod 4.4.3 contracts, tsx node:test, pnpm 11.9.0, Node 22, CI postgres 16.

## Global Constraints

- Currency is IDR only; all money fields are integer minor units (no floats).
- Platform fee is flat Rp3.000 per paid order, feeType PAID_LEARNER_TRANSACTION, idempotency key talira:fee:${order.id}.
- Net formula is net = grossAmount - processorFee - 3000; null processorFee counts as 0.
- Fee status lifecycle: BILLABLE on order PAID, BILLED when containing batch reaches PAID, REVERSED on refund/reject after fee recorded.
- Payout batch status: DRAFT to PROCESSING to PAID, plus FAILED (retry to PROCESSING allowed); proofUrl is required before PAID.
- One order lives in at most one batch: payout_items.orderId is globally unique.
- Order AVAILABLE means status PAID or APPROVED, orderType PROGRAM_PURCHASE, with no payout_items row.
- Auth: all /api/v1/class/* routes sit behind existing sessionMiddleware + requireOrganization + requireEntitlement('promotorClass') + requireRole(['owner','admin']) registered in src/app.ts; do not add new auth paths.
- Authed GET responses set Cache-Control: no-store.
- Migrations are LF-only (tooling/migrate.ts refuses CR bytes); generate via drizzle-kit, never hand-edit meta/_journal.json.
- Worker secrets (ADMIN_API_KEY, MAILKETING_API_TOKEN, BETTER_AUTH_SECRET) are never committed; tests use literal test keys in TEST_ENV only.
- Unit command: pnpm --filter @promotor/platform-api test. Integration command: pnpm --filter @promotor/platform-api exec tsx --test --test-concurrency=1 <file>. Integration needs TEST_DATABASE_URL plus OWNER_DATABASE_URL (CI postgres:16 provides both).

---

## File Map

- Modify: packages/contracts/src/index.ts — bank, payout, dashboard-summary, orders enrichment schemas.
- Create: apps/platform-api/src/__tests__/payout-contracts.test.ts — contract safeParse gate (runs under platform-api test glob; contracts package test script is tsc-only, no tsx runner).
- Create: apps/platform-api/src/services/payout/payout-math.ts — PLATFORM_FEE_FLAT + calcNetAmount + assertPayoutTransition.
- Create: apps/platform-api/src/__tests__/payout-math.test.ts — unit for math + transitions.
- Create: apps/platform-api/src/db/schema/payout-batches.ts — payout_batches table.
- Create: apps/platform-api/src/db/schema/payout-items.ts — payout_items table.
- Modify: apps/platform-api/src/db/schema/index.ts — export the two new tables.
- Generate: apps/platform-api/src/db/migrations/0021_*.sql + meta/_journal.json — via drizzle-kit generate.
- Create: apps/platform-api/src/repositories/payout-repository.ts — batch/item/available-orders queries.
- Create: apps/platform-api/src/repositories/bank-account-repository.ts — org-scoped CRUD over organization_bank_accounts.
- Create: apps/platform-api/src/services/payout/payout-service.ts — create/submit/markPaid/markFailed lifecycle.
- Create: apps/platform-api/src/__tests__/payout-service.test.ts — service unit with mocked repos.
- Modify: apps/platform-api/src/services/commerce/commerce-service.ts — reverse fee on rejectOrder.
- Modify: apps/platform-api/src/repositories/commerce-repository.ts — expose processorFee + net helpers for listOrders.
- Modify: apps/platform-api/src/routes/commerce-routes.ts — orders summary, available, payouts, bank-accounts endpoints.
- Modify: apps/platform-api/src/routes/class-routes.ts — GET dashboard-summary endpoint.
- Create: apps/platform-api/src/__tests__/integration/payout-lifecycle.integration.test.ts — DB lifecycle test.
- Modify: packages/api-client/src/index.ts — payout/dashboard/bank client methods on the Class client (PromotorClassContentApiClient) only.
- Modify: apps/promotor-class-web/src/app/(promotor)/app/orders/page.tsx — server summary cards, net + payout columns, payout filter, CSV export.
- Create: apps/promotor-class-web/src/app/(promotor)/app/payouts/page.tsx — batch list + request-payout flow.
- Modify: apps/promotor-class-web/src/app/(promotor)/app/more/page.tsx — add Pencairan link.
- Modify: apps/promotor-class-web/src/components/layout/PromotorShell.tsx — add Pencairan to DESKTOP_NAV.
- Modify: apps/promotor-class-web/src/components/layout/PromotorTabBar.tsx — route payouts under Lainnya tab.
- Create: apps/promotor-class-web/src/components/promotor/BankAccountsSection.tsx — bank CRUD UI.
- Modify: apps/promotor-class-web/src/app/(promotor)/app/settings/page.tsx — render BankAccountsSection.
- Modify: apps/promotor-class-web/src/app/(promotor)/app/page.tsx — dashboard-summary cards above signals.

---

### Task 1: Contracts for payout, bank, dashboard-summary, orders enrichment

**Files:**
- Modify: packages/contracts/src/index.ts (append after ListOrdersResponseSchema, near line 1599)

**Interfaces:**
- Consumes: existing CommerceOrderStatusSchema, CommerceSourceChannelSchema, CommercePaymentModeSchema, PaymentRecordStatusSchema.
- Produces: BankAccountSchema, CreateBankAccountRequestSchema, UpdateBankAccountRequestSchema, PayoutBatchStatusSchema, PayoutBatchSchema, CreatePayoutBatchRequestSchema, PayoutItemSchema, OrdersSummarySchema, DashboardSummarySchema, extended OrderItemSummarySchema + ListOrdersQuerySchema used by Tasks 5, 6, 8.

- [ ] **Step 1: Write the contract type test (fails before append)**

```typescript
// apps/platform-api/src/__tests__/payout-contracts.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PayoutBatchSchema, DashboardSummarySchema } from '@promotor/contracts';

describe('payout contracts', () => {
  it('accepts a DRAFT batch', () => {
    const parsed = PayoutBatchSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000001',
      organizationId: '00000000-0000-4000-8000-000000000002',
      status: 'DRAFT',
      totalNet: 100000,
      orderCount: 2,
      bankAccountId: null,
      destBankName: 'BCA',
      destAccountNumber: '123',
      destHolderName: 'Promotor',
      proofUrl: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.strictEqual(parsed.success, true);
  });

  it('accepts a dashboard summary', () => {
    const parsed = DashboardSummarySchema.safeParse({
      monthlyOmzet: 500000,
      pesertaCount: 10,
      completionPercent: 42.5,
      growthPercent: -5,
      programAktif: [],
      aktivitasTerbaru: [],
    });
    assert.strictEqual(parsed.success, true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/payout-contracts.test.ts`
Expected: FAIL with "does not provide an export named 'PayoutBatchSchema'" (schemas don't exist yet).

- [ ] **Step 3: Append schemas to contracts index**

```typescript
// Append to packages/contracts/src/index.ts (after ListOrdersResponse block):

export const BankAccountSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  bankName: z.string().min(1).max(120),
  accountNumber: z.string().min(1).max(40),
  accountHolderName: z.string().min(1).max(200),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BankAccount = z.infer<typeof BankAccountSchema>;

export const CreateBankAccountRequestSchema = z.object({
  bankName: z.string().min(1, 'Nama bank wajib diisi').max(120),
  accountNumber: z.string().min(1, 'Nomor rekening wajib diisi').max(40),
  accountHolderName: z.string().min(1, 'Nama pemilik wajib diisi').max(200),
});
export type CreateBankAccountRequest = z.infer<typeof CreateBankAccountRequestSchema>;

export const UpdateBankAccountRequestSchema = z.object({
  bankName: z.string().min(1).max(120).optional(),
  accountNumber: z.string().min(1).max(40).optional(),
  accountHolderName: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateBankAccountRequest = z.infer<typeof UpdateBankAccountRequestSchema>;

export const PayoutBatchStatusSchema = z.enum(['DRAFT', 'PROCESSING', 'PAID', 'FAILED']);
export type PayoutBatchStatus = z.infer<typeof PayoutBatchStatusSchema>;

export const PayoutBatchSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: PayoutBatchStatusSchema,
  totalNet: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  bankAccountId: z.string().uuid().nullable().optional(),
  destBankName: z.string().nullable().optional(),
  destAccountNumber: z.string().nullable().optional(),
  destHolderName: z.string().nullable().optional(),
  proofUrl: z.string().url().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PayoutBatch = z.infer<typeof PayoutBatchSchema>;

export const CreatePayoutBatchRequestSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1, 'Pilih minimal 1 order').max(100),
  bankAccountId: z.string().uuid('Rekening tujuan wajib dipilih'),
});
export type CreatePayoutBatchRequest = z.infer<typeof CreatePayoutBatchRequestSchema>;

export const MarkPayoutPaidRequestSchema = z.object({
  proofUrl: z.string().url('Bukti transfer wajib berupa URL'),
});
export type MarkPayoutPaidRequest = z.infer<typeof MarkPayoutPaidRequestSchema>;

export const PayoutItemSchema = z.object({
  id: z.string().uuid(),
  batchId: z.string().uuid(),
  orderId: z.string().uuid(),
  netAmount: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type PayoutItem = z.infer<typeof PayoutItemSchema>;

export const PayoutStatusFilterSchema = z.enum(['AVAILABLE', 'IN_BATCH', 'PAID']);
export type PayoutStatusFilter = z.infer<typeof PayoutStatusFilterSchema>;

export const OrdersSummarySchema = z.object({
  grossAmount: z.number().int().nonnegative(),
  processorFeeTotal: z.number().int().nonnegative(),
  platformFeeTotal: z.number().int().nonnegative(),
  netTotal: z.number().int(),
  paidCount: z.number().int().nonnegative(),
});
export type OrdersSummary = z.infer<typeof OrdersSummarySchema>;

export const DashboardSummarySchema = z.object({
  monthlyOmzet: z.number().int().nonnegative(),
  pesertaCount: z.number().int().nonnegative(),
  completionPercent: z.number().min(0).max(100),
  growthPercent: z.number(),
  programAktif: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      priceAmount: z.number().int().nonnegative(),
      pesertaCount: z.number().int().nonnegative(),
    })
  ),
  aktivitasTerbaru: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['enrollment', 'payment', 'reflection']),
      summary: z.string(),
      occurredAt: z.string(),
    })
  ),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
```

Then extend the two existing schemas in place (same file, edit don't duplicate):

```typescript
// OrderItemSummarySchema: add three optional fields before closing "metadata" line:
processorFee: z.number().int().nullable().optional(),
netAmount: z.number().int().optional(),
payoutStatus: PayoutStatusFilterSchema.optional(),

// ListOrdersQuerySchema: add one optional field:
payoutStatus: PayoutStatusFilterSchema.optional(),
```

Optional keeps backward compatibility with existing commerce tests and stored fixtures.

- [ ] **Step 4: Run contract test to verify it passes**

Run: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/payout-contracts.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/index.ts apps/platform-api/src/__tests__/payout-contracts.test.ts
git commit -m "feat(contracts): add payout bank dashboard-summary schemas"
```

---

### Task 2: Pure net math plus payout transition guard

**Files:**
- Create: apps/platform-api/src/services/payout/payout-math.ts
- Create: apps/platform-api/src/__tests__/payout-math.test.ts

**Interfaces:**
- Consumes: Task 1 PayoutBatchStatus type.
- Produces: PLATFORM_FEE_FLAT, calcNetAmount(gross: number, processorFee: number | null | undefined) => number, assertPayoutTransition(from: PayoutBatchStatus, to: PayoutBatchStatus) => void used by Task 4.

- [ ] **Step 1: Write the failing unit test**

```typescript
// apps/platform-api/src/__tests__/payout-math.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calcNetAmount, assertPayoutTransition } from '../services/payout/payout-math';

describe('payout math', () => {
  it('subtracts processor fee and 3000 flat', () => {
    assert.strictEqual(calcNetAmount(100000, 2000), 95000);
  });

  it('treats null processor fee as zero', () => {
    assert.strictEqual(calcNetAmount(50000, null), 47000);
  });

  it('allows DRAFT to PROCESSING', () => {
    assert.doesNotThrow(() => assertPayoutTransition('DRAFT', 'PROCESSING'));
  });

  it('rejects DRAFT straight to PAID', () => {
    assert.throws(() => assertPayoutTransition('DRAFT', 'PAID'));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/payout-math.test.ts`
Expected: FAIL with "Cannot find module" (payout-math.ts does not exist yet).

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/platform-api/src/services/payout/payout-math.ts
import type { PayoutBatchStatus } from '@promotor/contracts';
import { DomainError } from '../../core/errors';

export const PLATFORM_FEE_FLAT = 3000;

export function calcNetAmount(gross: number, processorFee?: number | null): number {
  const fee = processorFee ?? 0;
  return gross - fee - PLATFORM_FEE_FLAT;
}

const ALLOWED: Record<PayoutBatchStatus, PayoutBatchStatus[]> = {
  DRAFT: ['PROCESSING'],
  PROCESSING: ['PAID', 'FAILED'],
  FAILED: ['PROCESSING'],
  PAID: [],
};

export function assertPayoutTransition(from: PayoutBatchStatus, to: PayoutBatchStatus): void {
  if (!ALLOWED[from]?.includes(to)) {
    throw new DomainError('CONFLICT', `Transisi batch tidak valid: ${from} ke ${to}`);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/payout-math.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/services/payout/payout-math.ts apps/platform-api/src/__tests__/payout-math.test.ts
git commit -m "feat(payout): add net math and transition guard"
```

---

### Task 3: Payout tables plus migration

**Files:**
- Create: apps/platform-api/src/db/schema/payout-batches.ts
- Create: apps/platform-api/src/db/schema/payout-items.ts
- Modify: apps/platform-api/src/db/schema/index.ts
- Generate: apps/platform-api/src/db/migrations/0021_*.sql + meta/_journal.json + meta/0021_*.json

**Interfaces:**
- Consumes: organizations, organization_bank_accounts, commerce_orders tables.
- Produces: payoutBatches, payoutItems drizzle tables used by Task 4 repository.

- [ ] **Step 1: Create payout-batches table file**

```typescript
// apps/platform-api/src/db/schema/payout-batches.ts
import { pgTable, uuid, text, integer, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { organizationBankAccounts } from './organization-bank-accounts';

export const payoutBatches = pgTable(
  'payout_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('DRAFT'),
    totalNet: integer('total_net').notNull().default(0),
    orderCount: integer('order_count').notNull().default(0),
    bankAccountId: uuid('bank_account_id').references(() => organizationBankAccounts.id, {
      onDelete: 'set null',
    }),
    destBankName: text('dest_bank_name'),
    destAccountNumber: text('dest_account_number'),
    destHolderName: text('dest_holder_name'),
    proofUrl: text('proof_url'),
    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('payout_batches_org_idx').on(t.organizationId),
    index('payout_batches_org_status_idx').on(t.organizationId, t.status),
    check('payout_batches_status_check', sql`${t.status} IN ('DRAFT', 'PROCESSING', 'PAID', 'FAILED')`),
    check('payout_batches_total_net_check', sql`${t.totalNet} >= 0`),
    check('payout_batches_order_count_check', sql`${t.orderCount} >= 0`),
  ]
);

export type PayoutBatchRow = typeof payoutBatches.$inferSelect;
export type NewPayoutBatchRow = typeof payoutBatches.$inferInsert;
```

- [ ] **Step 2: Create payout-items table file**

```typescript
// apps/platform-api/src/db/schema/payout-items.ts
import { pgTable, uuid, integer, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { payoutBatches } from './payout-batches';
import { commerceOrders } from './commerce-orders';

export const payoutItems = pgTable(
  'payout_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => payoutBatches.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => commerceOrders.id, { onDelete: 'cascade' }),
    netAmount: integer('net_amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('payout_items_order_unique').on(t.orderId),
    index('payout_items_batch_idx').on(t.batchId),
    check('payout_items_net_non_negative', sql`${t.netAmount} >= 0`),
  ]
);

export type PayoutItemRow = typeof payoutItems.$inferSelect;
export type NewPayoutItemRow = typeof payoutItems.$inferInsert;
```

The global orderId unique index is the double-payout lock: one order can only ever sit in one batch.

- [ ] **Step 3: Export from schema index**

In apps/platform-api/src/db/schema/index.ts append two lines (file currently ends with lesson-note exports; keep alphabetical neighbours untouched):

```typescript
export * from './payout-batches';
export * from './payout-items';
```

- [ ] **Step 4: Generate the migration with drizzle-kit**

Run: `pnpm --filter @promotor/platform-api db:generate`
Expected: new files src/db/migrations/0021_*.sql plus meta entries. Inspect the SQL: it must contain CREATE TABLE "payout_batches" and CREATE TABLE "payout_items" with IF NOT EXISTS style matching 0020 pattern. Confirm line endings are LF: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/migration-fingerprint.test.ts` must still PASS (that test guards EOL poisoning).

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/db/schema/payout-batches.ts apps/platform-api/src/db/schema/payout-items.ts apps/platform-api/src/db/schema/index.ts apps/platform-api/src/db/migrations/0021_* apps/platform-api/src/db/migrations/meta/*
git commit -m "feat(payout): add payout_batches and payout_items tables"
```

---

### Task 4: Payout repository plus service lifecycle

**Files:**
- Create: apps/platform-api/src/repositories/payout-repository.ts
- Create: apps/platform-api/src/services/payout/payout-service.ts
- Create: apps/platform-api/src/__tests__/payout-service.test.ts

**Interfaces:**
- Consumes: payoutBatches, payoutItems, commerceOrders, paymentRecords, platformFeeEntries, organizationBankAccounts tables; calcNetAmount, assertPayoutTransition, PLATFORM_FEE_FLAT from Task 2.
- Produces: createPayoutRepository(db) with listAvailableOrders, createBatchWithItems, getBatchById, listBatches, listBatchItems, updateBatch; createPayoutService(deps) with createBatch, submitBatch, markPaid, markFailed used by Task 5 routes.

- [ ] **Step 1: Write the failing service unit test (mocked repos)**

```typescript
// apps/platform-api/src/__tests__/payout-service.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPayoutService } from '../services/payout/payout-service';

const orgId = '00000000-0000-4000-8000-000000000010';
const bankId = '00000000-0000-4000-8000-000000000011';

function harness() {
  const batches = new Map<string, any>();
  const payoutRepo: any = {
    findBankById: async () => ({
      id: bankId, organizationId: orgId, bankName: 'BCA',
      accountNumber: '123', accountHolderName: 'Promotor', isActive: true,
    }),
    findAvailableOrdersByIds: async (_o: string, ids: string[]) =>
      ids.map((id) => ({ order: { id, organizationId: orgId, amount: 100000, status: 'PAID' }, processorFee: 2000 })),
    createBatchWithItems: async (b: any, items: any[]) => {
      const batch = { id: 'batch-1', ...b };
      batches.set(batch.id, batch);
      return { batch, items };
    },
    getBatchById: async (id: string) => batches.get(id) ?? null,
    updateBatch: async (id: string, patch: any) => ({ id, ...batches.get(id), ...patch }),
  };
  const commerceRepo: any = {
    updatePlatformFeeStatus: async () => null,
  };
  return { payoutRepo, commerceRepo };
}

describe('payout service', () => {
  it('computes totalNet 95000 per 100k order with 2k processor fee', async () => {
    const { payoutRepo, commerceRepo } = harness();
    const svc = createPayoutService({ payoutRepo, commerceRepo } as any);
    const { batch } = await svc.createBatch({
      organizationId: orgId,
      orderIds: ['00000000-0000-4000-8000-000000000021'],
      bankAccountId: bankId,
    });
    assert.strictEqual(batch.totalNet, 95000);
    assert.strictEqual(batch.orderCount, 1);
    assert.strictEqual(batch.status, 'DRAFT');
  });

  it('requires proofUrl for markPaid', async () => {
    const { payoutRepo, commerceRepo } = harness();
    const svc = createPayoutService({ payoutRepo, commerceRepo } as any);
    await svc.createBatch({
      organizationId: orgId,
      orderIds: ['00000000-0000-4000-8000-000000000022'],
      bankAccountId: bankId,
    });
    await assert.rejects(() => svc.markPaid({ organizationId: orgId, batchId: 'batch-1', proofUrl: '' }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/payout-service.test.ts`
Expected: FAIL with "Cannot find module '../services/payout/payout-service'".

- [ ] **Step 3: Write the repository**

```typescript
// apps/platform-api/src/repositories/payout-repository.ts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { payoutBatches, type PayoutBatchRow } from '../db/schema/payout-batches';
import { payoutItems } from '../db/schema/payout-items';
import { commerceOrders } from '../db/schema/commerce-orders';
import { paymentRecords } from '../db/schema/payment-records';
import { organizationBankAccounts } from '../db/schema/organization-bank-accounts';

export interface AvailableOrderRow {
  order: typeof commerceOrders.$inferSelect;
  processorFee: number | null;
}

export function createPayoutRepository(db: NodePgDatabase) {
  return {
    async findBankById(organizationId: string, bankAccountId: string) {
      const [row] = await db
        .select()
        .from(organizationBankAccounts)
        .where(
          and(
            eq(organizationBankAccounts.id, bankAccountId),
            eq(organizationBankAccounts.organizationId, organizationId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async findAvailableOrdersByIds(organizationId: string, orderIds: string[]): Promise<AvailableOrderRow[]> {
      if (orderIds.length === 0) return [];
      const rows = await db
        .select({ order: commerceOrders, processorFee: paymentRecords.processorFee })
        .from(commerceOrders)
        .leftJoin(payoutItems, eq(payoutItems.orderId, commerceOrders.id))
        .leftJoin(paymentRecords, eq(paymentRecords.id, commerceOrders.paymentRecordId))
        .where(
          and(
            eq(commerceOrders.organizationId, organizationId),
            inArray(commerceOrders.id, orderIds),
            inArray(commerceOrders.status, ['PAID', 'APPROVED']),
            eq(commerceOrders.orderType, 'PROGRAM_PURCHASE'),
            isNull(payoutItems.orderId)
          )
        );
      return rows.map((r) => ({ order: r.order, processorFee: r.processorFee }));
    },

    async listAvailableOrders(organizationId: string, limit = 100) {
      const rows = await db
        .select({ order: commerceOrders, processorFee: paymentRecords.processorFee })
        .from(commerceOrders)
        .leftJoin(payoutItems, eq(payoutItems.orderId, commerceOrders.id))
        .leftJoin(paymentRecords, eq(paymentRecords.id, commerceOrders.paymentRecordId))
        .where(
          and(
            eq(commerceOrders.organizationId, organizationId),
            inArray(commerceOrders.status, ['PAID', 'APPROVED']),
            eq(commerceOrders.orderType, 'PROGRAM_PURCHASE'),
            isNull(payoutItems.orderId)
          )
        )
        .orderBy(desc(commerceOrders.paidAt))
        .limit(Math.min(limit, 100));
      return rows;
    },

    async getItemByOrderId(orderId: string) {
      const [row] = await db.select().from(payoutItems).where(eq(payoutItems.orderId, orderId)).limit(1);
      return row ?? null;
    },

    async createBatchWithItems(
      batch: typeof payoutBatches.$inferInsert,
      items: Array<{ orderId: string; netAmount: number }>
    ) {
      return await db.transaction(async (tx) => {
        const [created] = await tx.insert(payoutBatches).values(batch).returning();
        const inserted =
          items.length > 0
            ? await tx.insert(payoutItems).values(items.map((i) => ({ ...i, batchId: created.id }))).returning()
            : [];
        return { batch: created, items: inserted };
      });
    },

    async getBatchById(organizationId: string, batchId: string): Promise<PayoutBatchRow | null> {
      const [row] = await db
        .select()
        .from(payoutBatches)
        .where(and(eq(payoutBatches.id, batchId), eq(payoutBatches.organizationId, organizationId)))
        .limit(1);
      return row ?? null;
    },

    async listBatches(organizationId: string, limit = 50) {
      return await db
        .select()
        .from(payoutBatches)
        .where(eq(payoutBatches.organizationId, organizationId))
        .orderBy(desc(payoutBatches.createdAt))
        .limit(Math.min(limit, 100));
    },

    async listBatchItems(batchId: string) {
      return await db.select().from(payoutItems).where(eq(payoutItems.batchId, batchId));
    },

    async listBatchOrderIds(batchId: string): Promise<string[]> {
      const rows = await db
        .select({ orderId: payoutItems.orderId })
        .from(payoutItems)
        .where(eq(payoutItems.batchId, batchId));
      return rows.map((r) => r.orderId);
    },

    async updateBatch(batchId: string, patch: Partial<PayoutBatchRow>) {
      const [updated] = await db
        .update(payoutBatches)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(eq(payoutBatches.id, batchId))
        .returning();
      return updated;
    },

    async countBatches(): Promise<number> {
      const [row] = await db.select({ v: sql<number>`count(*)` }).from(payoutBatches);
      return Number(row?.v ?? 0);
    },
  };
}

export type PayoutRepository = ReturnType<typeof createPayoutRepository>;
```

- [ ] **Step 4: Write the service**

```typescript
// apps/platform-api/src/services/payout/payout-service.ts
import { z } from 'zod';
import { DomainError } from '../../core/errors';
import { calcNetAmount, assertPayoutTransition } from './payout-math';
import type { PayoutRepository } from '../../repositories/payout-repository';
import type { CommerceRepository } from '../../repositories/commerce-repository';

const UuidSchema = z.string().uuid();

function parseUuid(value: string, label: string): string {
  const parsed = UuidSchema.safeParse(value);
  if (!parsed.success) throw new DomainError('VALIDATION_ERROR', `${label} tidak valid`);
  return parsed.data;
}

export function createPayoutService(deps: { payoutRepo: PayoutRepository; commerceRepo: CommerceRepository }) {
  return {
    async createBatch(input: { organizationId: string; orderIds: string[]; bankAccountId: string }) {
      const orgId = parseUuid(input.organizationId, 'Organisasi');
      const bankId = parseUuid(input.bankAccountId, 'Rekening');
      const orderIds = [...new Set(input.orderIds)];
      if (orderIds.length === 0) throw new DomainError('VALIDATION_ERROR', 'Pilih minimal 1 order');
      if (orderIds.length > 100) throw new DomainError('VALIDATION_ERROR', 'Maksimal 100 order per batch');

      const bank = await deps.payoutRepo.findBankById(orgId, bankId);
      if (!bank || !bank.isActive) {
        throw new DomainError('VALIDATION_ERROR', 'Rekening tujuan tidak ditemukan atau nonaktif. Tambahkan rekening dulu.');
      }
      const avail = await deps.payoutRepo.findAvailableOrdersByIds(orgId, orderIds);
      if (avail.length !== orderIds.length) {
        throw new DomainError('CONFLICT', 'Sebagian order sudah dicairkan atau belum lunas');
      }
      const items = avail.map((a) => ({
        orderId: a.order.id,
        netAmount: Math.max(0, calcNetAmount(a.order.amount, a.processorFee)),
      }));
      const totalNet = items.reduce((s, i) => s + i.netAmount, 0);
      try {
        return await deps.payoutRepo.createBatchWithItems(
          {
            organizationId: orgId,
            status: 'DRAFT',
            totalNet,
            orderCount: items.length,
            bankAccountId: bank.id,
            destBankName: bank.bankName,
            destAccountNumber: bank.accountNumber,
            destHolderName: bank.accountHolderName,
          },
          items
        );
      } catch (err: any) {
        if (String(err?.code ?? err?.cause?.code) === '23505') {
          throw new DomainError('CONFLICT', 'Sebagian order sudah masuk batch lain');
        }
        throw err;
      }
    },

    async submitBatch(input: { organizationId: string; batchId: string }) {
      const batch = await deps.payoutRepo.getBatchById(input.organizationId, input.batchId);
      if (!batch) throw new DomainError('NOT_FOUND', 'Batch pencairan tidak ditemukan');
      assertPayoutTransition(batch.status as any, 'PROCESSING');
      return await deps.payoutRepo.updateBatch(batch.id, { status: 'PROCESSING' });
    },

    async markPaid(input: { organizationId: string; batchId: string; proofUrl: string }) {
      const proof = (input.proofUrl ?? '').trim();
      if (!proof || !/^https?:\/\//i.test(proof)) {
        throw new DomainError('VALIDATION_ERROR', 'Bukti transfer wajib berupa URL sebelum PAID');
      }
      const batch = await deps.payoutRepo.getBatchById(input.organizationId, input.batchId);
      if (!batch) throw new DomainError('NOT_FOUND', 'Batch pencairan tidak ditemukan');
      assertPayoutTransition(batch.status as any, 'PAID');
      const nowIso = new Date().toISOString();
      const updated = await deps.payoutRepo.updateBatch(batch.id, {
        status: 'PAID',
        proofUrl: proof,
        paidAt: nowIso,
      });
      const orderIds = await deps.payoutRepo.listBatchOrderIds(batch.id);
      for (const orderId of orderIds) {
        await deps.commerceRepo.updatePlatformFeeStatus(orderId, 'BILLED', { billedAt: nowIso }).catch(() => null);
      }
      return updated;
    },

    async markFailed(input: { organizationId: string; batchId: string }) {
      const batch = await deps.payoutRepo.getBatchById(input.organizationId, input.batchId);
      if (!batch) throw new DomainError('NOT_FOUND', 'Batch pencairan tidak ditemukan');
      assertPayoutTransition(batch.status as any, 'FAILED');
      return await deps.payoutRepo.updateBatch(batch.id, { status: 'FAILED' });
    },
  };
}
```

- [ ] **Step 5: Run service test to verify it passes**

Run: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/payout-service.test.ts src/__tests__/payout-math.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/platform-api/src/repositories/payout-repository.ts apps/platform-api/src/services/payout/payout-service.ts apps/platform-api/src/__tests__/payout-service.test.ts
git commit -m "feat(payout): add repository and batch lifecycle service"
```

---

### Task 5: Orders enrichment plus payouts and bank-accounts API

**Files:**
- Modify: apps/platform-api/src/repositories/commerce-repository.ts (listOrders joins payout_items + gross processor fee)
- Modify: apps/platform-api/src/services/commerce/commerce-service.ts (rejectOrder reverses fee)
- Modify: apps/platform-api/src/routes/commerce-routes.ts (summary, available, payouts, bank-accounts endpoints)

**Interfaces:**
- Consumes: Task 1 schemas, Task 4 payout service/repository, existing createCommerceRepository.
- Produces: GET /api/v1/class/orders/summary, GET /api/v1/class/orders/available, GET|POST /api/v1/class/payouts, GET /api/v1/class/payouts/:id, POST /:id/submit|mark-paid|fail, GET|POST|PATCH|DELETE /api/v1/class/bank-accounts; enriched listOrders items with processorFee, netAmount, payoutStatus used by Task 8 frontend.

- [ ] **Step 1: Enrich commerce-repository listOrders**

First update the `CommerceRepository` interface return type (same file, lines 15-30): add three fields to the orders array element:

```typescript
      paymentStatus: string | null;
      paymentMethod: string | null;
      platformFee: number;
      processorFee: number | null;
      netAmount: number;
      payoutStatus: 'AVAILABLE' | 'IN_BATCH' | 'PAID';
```

And extend the filter param: `filter?: { status?: string; payoutStatus?: 'AVAILABLE' | 'IN_BATCH' | 'PAID'; limit?: number; offset?: number }`.

Then update the listOrders implementation. Add imports at top:

```typescript
import { eq, and, desc, count, isNull } from 'drizzle-orm';
import { payoutItems } from '../db/schema/payout-items';
import { payoutBatches } from '../db/schema/payout-batches';
import { calcNetAmount } from '../services/payout/payout-math';
```

Extend the select and joins:

```typescript
      const rows = await db
        .select({
          order: commerceOrders,
          buyerName: contacts.name,
          buyerPhone: contacts.phoneE164,
          buyerEmail: contacts.email,
          programTitle: programs.title,
          paymentStatus: paymentRecords.status,
          paymentMethod: paymentRecords.paymentMethod,
          platformFeeAmount: platformFeeEntries.amount,
          platformFeeStatus: platformFeeEntries.status,
          payoutOrderId: payoutItems.orderId,
          payoutBatchStatus: payoutBatches.status,
          grossProcessorFee: paymentRecords.processorFee,
        })
        .from(commerceOrders)
        .leftJoin(contacts, eq(commerceOrders.contactId, contacts.id))
        .leftJoin(programs, eq(commerceOrders.programId, programs.id))
        .leftJoin(paymentRecords, eq(commerceOrders.paymentRecordId, paymentRecords.id))
        .leftJoin(platformFeeEntries, eq(commerceOrders.id, platformFeeEntries.orderId))
        .leftJoin(payoutItems, eq(commerceOrders.id, payoutItems.orderId))
        .leftJoin(payoutBatches, eq(payoutItems.batchId, payoutBatches.id))
        .where(combinedWhere)
        .orderBy(desc(commerceOrders.createdAt))
        .limit(limit)
        .offset(offset);
```

Add the payout filter to combinedWhere construction (before the query):

```typescript
      if (filter?.payoutStatus === 'AVAILABLE') {
        whereConditions.push(isNull(payoutItems.orderId));
      }
```

NOTE: drizzle builds `combinedWhere` before the joins in current code; move the `const combinedWhere = and(...whereConditions)` line to after all pushes, or push the isNull condition before it. Then map:

```typescript
      return {
        orders: rows.map((r) => {
          const processorFee = r.grossProcessorFee ?? null;
          const netAmount = calcNetAmount(r.order.amount, processorFee);
          const payoutStatus = !r.payoutOrderId ? 'AVAILABLE' : r.payoutBatchStatus === 'PAID' ? 'PAID' : 'IN_BATCH';
          return {
            order: r.order,
            buyerName: r.buyerName ?? 'Promotor Subscription',
            buyerPhone: r.buyerPhone ?? '-',
            buyerEmail: r.buyerEmail,
            programTitle: r.programTitle ?? (r.order.orderType === 'SUBSCRIPTION_PURCHASE' ? 'Langganan Ralivo Solo' : '-'),
            paymentStatus: r.paymentStatus,
            paymentMethod: r.paymentMethod,
            platformFee: (r.platformFeeStatus === 'BILLABLE' || r.platformFeeStatus === 'BILLED') ? (r.platformFeeAmount ?? 3000) : 0,
            processorFee,
            netAmount,
            payoutStatus: payoutStatus as 'AVAILABLE' | 'IN_BATCH' | 'PAID',
          };
        }),
        total: Number(totalResult?.value ?? 0),
      };
```

Then update commerce-service.ts listOrders mapping (add three passthrough fields):

```typescript
        platformFee: r.platformFee, // Canonical ledger truth from platform_fee_entries
        processorFee: (r as any).processorFee ?? null,
        netAmount: (r as any).netAmount ?? r.order.amount,
        payoutStatus: (r as any).payoutStatus ?? 'AVAILABLE',
      }));
```

Then update commerce-service.ts listOrders signature to accept payoutStatus and forward it (body stays unchanged — repo handles the filter):

```typescript
async listOrders(
  organizationId: string,
  query: { status?: string; payoutStatus?: 'AVAILABLE' | 'IN_BATCH' | 'PAID'; limit?: number; offset?: number }
): Promise<{ orders: OrderItemSummary[]; total: number }> {
```

- [ ] **Step 2: Reverse fee on rejectOrder**

In commerce-service.ts rejectOrder, after updateOrderStatus to REJECTED, add:

```typescript
await deps.commerceRepo.updatePlatformFeeStatus(orderId, 'REVERSED', { reversedAt: nowIso }).catch(() => null);
```

Rationale: rejectOrder blocks PAID/APPROVED today, so this is defensive — if a fee row exists (early BILLABLE or retried webhook) it must end REVERSED and never become BILLED. updatePlatformFeeStatus returns null when no fee row exists (coupon-free / still PENDING), hence `.catch(() => null)`.

- [ ] **Step 3: Create bank-account-repository.ts**

Concrete CRUD scoped by organizationId (guards payout requests):

```typescript
// apps/platform-api/src/repositories/bank-account-repository.ts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, asc, eq } from 'drizzle-orm';
import { organizationBankAccounts } from '../db/schema/organization-bank-accounts';

export function createBankAccountRepository(db: NodePgDatabase) {
  return {
    async list(organizationId: string) {
      return await db
        .select()
        .from(organizationBankAccounts)
        .where(eq(organizationBankAccounts.organizationId, organizationId))
        .orderBy(asc(organizationBankAccounts.sortOrder));
    },

    async create(organizationId: string, data: { bankName: string; accountNumber: string; accountHolderName: string }) {
      const [row] = await db
        .insert(organizationBankAccounts)
        .values({ organizationId, ...data })
        .returning();
      return row;
    },

    async update(organizationId: string, id: string, patch: { bankName?: string; accountNumber?: string; accountHolderName?: string; isActive?: boolean }) {
      const [row] = await db
        .update(organizationBankAccounts)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(and(eq(organizationBankAccounts.id, id), eq(organizationBankAccounts.organizationId, organizationId)))
        .returning();
      return row ?? null;
    },

    async remove(organizationId: string, id: string) {
      const [row] = await db
        .delete(organizationBankAccounts)
        .where(and(eq(organizationBankAccounts.id, id), eq(organizationBankAccounts.organizationId, organizationId)))
        .returning();
      return row ?? null;
    },
  };
}

export type BankAccountRepository = ReturnType<typeof createBankAccountRepository>;
```

- [ ] **Step 4: Add routes to commerce-routes.ts**

Add imports at top (after existing repository imports):

```typescript
import { createPayoutRepository } from '../repositories/payout-repository';
import { createBankAccountRepository } from '../repositories/bank-account-repository';
import { createPayoutService } from '../services/payout/payout-service';
import { calcNetAmount } from '../services/payout/payout-math';
import {
  CreatePayoutBatchRequestSchema,
  MarkPayoutPaidRequestSchema,
  CreateBankAccountRequestSchema,
  UpdateBankAccountRequestSchema,
} from '@promotor/contracts';
```

Add helper after getCommerceServices:

```typescript
function getPayoutServices(c: any) {
  const db = c.get('db');
  const commerceRepo = createCommerceRepository(db);
  const payoutRepo = createPayoutRepository(db);
  const bankRepo = createBankAccountRepository(db);
  const payoutService = createPayoutService({ payoutRepo, commerceRepo });
  return { commerceRepo, payoutRepo, bankRepo, payoutService };
}

function requireOrgId(c: any): string {
  const authCtx = c.get('authContext');
  if (!authCtx?.organization) {
    throw new DomainError('UNAUTHORIZED', 'Autentikasi organisasi dibutuhkan');
  }
  return authCtx.organization.organizationId as string;
}
```

NOTE: entitlement is already enforced by app.ts `app.use('/api/v1/class', sessionMiddleware, requireOrganization(), requireEntitlement('promotorClass'), requireRole(['owner','admin']))` — handlers only check authContext presence like existing class/orders handlers. All handlers set Cache-Control: no-store.

Orders summary (canonical SQL sums, single query):

```typescript
  app.get('/api/v1/class/orders/summary', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const db = c.get('db');
    const res = await db.execute(
      sql`SELECT
        COALESCE(SUM(o.amount), 0) AS "gross",
        COALESCE(SUM(COALESCE(pr.processor_fee, 0)), 0) AS "processor",
        COALESCE(SUM(CASE WHEN fe.status IN ('BILLABLE', 'BILLED') THEN 3000 ELSE 0 END), 0) AS "platform",
        COUNT(*) AS "count"
      FROM commerce_orders o
      LEFT JOIN payment_records pr ON pr.id = o.payment_record_id
      LEFT JOIN platform_fee_entries fe ON fe.order_id = o.id
      WHERE o.organization_id = ${orgId}
        AND o.order_type = 'PROGRAM_PURCHASE'
        AND o.status IN ('PAID', 'APPROVED')`
    );
    const row: any = res.rows?.[0] ?? {};
    const gross = Number(row.gross ?? 0);
    const processor = Number(row.processor ?? 0);
    const platform = Number(row.platform ?? 0);
    return c.json({
      summary: {
        grossAmount: gross,
        processorFeeTotal: processor,
        platformFeeTotal: platform,
        netTotal: gross - processor - platform,
        paidCount: Number(row.count ?? 0),
      },
    }, 200);
  });
```

Add `import { sql } from 'drizzle-orm'` to commerce-routes.ts imports. NOTE: `db.execute` in this repo (node-postgres driver) returns `{ rows }` — verified in booking-repository.ts line 188. Wrap in try/catch? No: let DomainError middleware handle failures; keep handler minimal.

Available orders + payouts + bank accounts:

```typescript
  app.get('/api/v1/class/orders/available', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutRepo } = getPayoutServices(c);
    const limit = Math.min(Number(c.req.query('limit') || 100), 100);
    const rows = await payoutRepo.listAvailableOrders(orgId, limit);
    return c.json({
      orders: rows.map((r) => ({
        id: r.order.id,
        reference: r.order.reference,
        amount: r.order.amount,
        status: r.order.status,
        processorFee: r.processorFee,
        netAmount: calcNetAmount(r.order.amount, r.processorFee),
        payoutStatus: 'AVAILABLE' as const,
        paidAt: r.order.paidAt,
        createdAt: r.order.createdAt,
      })),
    }, 200);
  });

  app.get('/api/v1/class/payouts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutRepo } = getPayoutServices(c);
    const batches = await payoutRepo.listBatches(orgId);
    return c.json({ batches }, 200);
  });

  app.post('/api/v1/class/payouts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = CreatePayoutBatchRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { payoutService } = getPayoutServices(c);
    const { batch, items } = await payoutService.createBatch({
      organizationId: orgId,
      orderIds: parsed.data.orderIds,
      bankAccountId: parsed.data.bankAccountId,
    });
    return c.json({ batch, items }, 201);
  });

  app.get('/api/v1/class/payouts/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutRepo } = getPayoutServices(c);
    const batch = await payoutRepo.getBatchById(orgId, c.req.param('id'));
    if (!batch) throw new DomainError('NOT_FOUND', 'Batch pencairan tidak ditemukan');
    const items = await payoutRepo.listBatchItems(batch.id);
    return c.json({ batch, items }, 200);
  });

  app.post('/api/v1/class/payouts/:id/submit', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutService } = getPayoutServices(c);
    const batch = await payoutService.submitBatch({ organizationId: orgId, batchId: c.req.param('id') });
    return c.json({ batch }, 200);
  });

  app.post('/api/v1/class/payouts/:id/mark-paid', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = MarkPayoutPaidRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { payoutService } = getPayoutServices(c);
    const batch = await payoutService.markPaid({ organizationId: orgId, batchId: c.req.param('id'), proofUrl: parsed.data.proofUrl });
    return c.json({ batch }, 200);
  });

  app.post('/api/v1/class/payouts/:id/fail', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutService } = getPayoutServices(c);
    const batch = await payoutService.markFailed({ organizationId: orgId, batchId: c.req.param('id') });
    return c.json({ batch }, 200);
  });

  app.get('/api/v1/class/bank-accounts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { bankRepo } = getPayoutServices(c);
    const accounts = await bankRepo.list(orgId);
    return c.json({ accounts }, 200);
  });

  app.post('/api/v1/class/bank-accounts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = CreateBankAccountRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { bankRepo } = getPayoutServices(c);
    const account = await bankRepo.create(orgId, parsed.data);
    return c.json({ account }, 201);
  });

  app.patch('/api/v1/class/bank-accounts/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = UpdateBankAccountRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { bankRepo } = getPayoutServices(c);
    const account = await bankRepo.update(orgId, c.req.param('id'), parsed.data);
    if (!account) throw new DomainError('NOT_FOUND', 'Rekening tidak ditemukan');
    return c.json({ account }, 200);
  });

  app.delete('/api/v1/class/bank-accounts/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { bankRepo } = getPayoutServices(c);
    const account = await bankRepo.remove(orgId, c.req.param('id'));
    if (!account) throw new DomainError('NOT_FOUND', 'Rekening tidak ditemukan');
    return c.json({ success: true }, 200);
  });
```

- [ ] **Step 5: Typecheck the API**

Run: `pnpm --filter @promotor/platform-api typecheck`
Expected: PASS with no errors. Also run existing commerce unit tests to catch regressions from the listOrders change: `pnpm --filter @promotor/platform-api exec tsx --test src/__tests__/commerce-service.test.ts src/__tests__/commerce-schema-consistency.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/platform-api/src/repositories/commerce-repository.ts apps/platform-api/src/repositories/bank-account-repository.ts apps/platform-api/src/repositories/payout-repository.ts apps/platform-api/src/services/commerce/commerce-service.ts apps/platform-api/src/routes/commerce-routes.ts
git commit -m "feat(payout): add orders summary payouts bank-accounts API"
```

---

### Task 6: Dashboard-summary endpoint

**Files:**
- Modify: apps/platform-api/src/routes/class-routes.ts (append dashboard-summary before closing registerClassRoutes)
- Create: apps/platform-api/src/__tests__/integration/payout-lifecycle.integration.test.ts (covers this endpoint plus Task 5 lifecycle)

**Interfaces:**
- Consumes: commerce_orders, enrollments, lesson_progress, lessons+modules, programs, contacts, reflection_responses, learning_events; Task 2 calcNet not needed here (omzet is gross).
- Produces: GET /api/v1/class/dashboard-summary returning DashboardSummarySchema used by Task 10 Beranda.

- [ ] **Step 1: Write the integration test first (fails: 404 before route exists)**

```typescript
// apps/platform-api/src/__tests__/integration/payout-lifecycle.integration.test.ts
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../app';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb } from './test-env';
import { organizations } from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);
const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'payout-lifecycle-test-secret-0123456789abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('payout lifecycle', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => { await applyMigrationsAsOwner(); });

  it('dashboard-summary route is registered', async () => {
    await withIntegrationDb(async (db) => {
      await db.insert(organizations)
        .values({ name: 'Payout Org', slug: `payout-${Date.now()}` });
      const app = createApp();
      // NOTE: class routes sit behind sessionMiddleware, so an unauthenticated
      // request returns 401 — the assertion is only that the route exists (not 404).
      const res = await app.request('/api/v1/class/dashboard-summary', {}, TEST_ENV as any);
      assert.notStrictEqual(res.status, 404);
    });
  });

  it('payouts route is registered', async () => {
    await withIntegrationDb(async () => {
      const app = createApp();
      const res = await app.request(
        '/api/v1/class/payouts',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: [], bankAccountId: '00000000-0000-4000-8000-000000000000' }) },
        TEST_ENV as any
      );
      assert.notStrictEqual(res.status, 404);
    });
  });
});
```

This is a route-existence gate: full money lifecycle is covered by service unit (Task 4) plus staging E2E (Task 11).

- [ ] **Step 2: Run to verify it fails**

Run: `TEST_DATABASE_URL=postgresql://promotor_runtime:ci_runtime_pw@localhost:5432/postgres OWNER_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres pnpm --filter @promotor/platform-api exec tsx --test --test-concurrency=1 src/__tests__/integration/payout-lifecycle.integration.test.ts`
Expected: FAIL with 404 on dashboard-summary (route missing). In CI without DB the file skips; locally with DB it fails as intended.

- [ ] **Step 3: Implement GET dashboard-summary in class-routes.ts**

Append inside registerClassRoutes before final closing brace (after coupons PATCH block). NOTE: `db.execute` in this repo returns `{ rows }` (see booking-repository.ts line 188), not a raw array — every query below reads `.rows`.

```typescript
// 14. Dashboard summary for Beranda cards (single call, no N+1)
app.get('/api/v1/class/dashboard-summary', async (c) => {
  c.header('Cache-Control', 'no-store');
  const { ctx, db } = getRequestContext(c);
  const orgId = ctx.organizationId;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const paidRes = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN paid_at >= ${monthStart.toISOString()} THEN amount ELSE 0 END), 0) AS "monthOmzet",
      COALESCE(SUM(CASE WHEN paid_at >= ${prevMonthStart.toISOString()} AND paid_at < ${monthStart.toISOString()} THEN amount ELSE 0 END), 0) AS "prevOmzet"
    FROM commerce_orders
    WHERE organization_id = ${orgId}
      AND order_type = 'PROGRAM_PURCHASE'
      AND status IN ('PAID', 'APPROVED')
  `);
  const paidRow: any = paidRes.rows?.[0] ?? {};
  const monthOmzet = Number(paidRow.monthOmzet ?? 0);
  const prevOmzet = Number(paidRow.prevOmzet ?? 0);
  const growthPercent = prevOmzet === 0 ? (monthOmzet > 0 ? 100 : 0) : ((monthOmzet - prevOmzet) / prevOmzet) * 100;

  const pesertaRes = await db.execute(sql`
    SELECT COUNT(DISTINCT contact_id) AS v FROM enrollments WHERE organization_id = ${orgId}
  `);
  const pesertaCount = Number((pesertaRes.rows?.[0] as any)?.v ?? 0);

  const progRes = await db.execute(sql`
    SELECT COUNT(*) FILTER (WHERE is_completed) AS done, COUNT(*) AS total
    FROM lesson_progress WHERE organization_id = ${orgId}
  `);
  const progRow: any = progRes.rows?.[0] ?? {};
  const progTotal = Number(progRow.total ?? 0);
  const completionPercent = progTotal === 0 ? 0 : (Number(progRow.done ?? 0) / progTotal) * 100;

  const activePrograms = await db
    .select({ id: programs.id, title: programs.title, priceAmount: programs.priceAmount })
    .from(programs)
    .where(and(eq(programs.organizationId, orgId), eq(programs.status, 'published')))
    .limit(10);

  const withCounts = [];
  for (const p of activePrograms) {
    const cntRes = await db.execute(sql`
      SELECT COUNT(*) AS v FROM enrollments WHERE organization_id = ${orgId} AND program_id = ${p.id}
    `);
    withCounts.push({ ...p, pesertaCount: Number((cntRes.rows?.[0] as any)?.v ?? 0) });
  }

  const enrollRes = await db.execute(sql`
    SELECT id, created_at AS "occurredAt", 'enrollment' AS kind FROM enrollments
    WHERE organization_id = ${orgId} ORDER BY created_at DESC LIMIT 3
  `);
  const payRes = await db.execute(sql`
    SELECT id, paid_at AS "occurredAt", 'payment' AS kind FROM commerce_orders
    WHERE organization_id = ${orgId} AND status IN ('PAID','APPROVED') ORDER BY paid_at DESC NULLS LAST LIMIT 3
  `);
  const reflRes = await db.execute(sql`
    SELECT id, submitted_at AS "occurredAt", 'reflection' AS kind FROM reflection_responses
    WHERE organization_id = ${orgId} ORDER BY submitted_at DESC LIMIT 3
  `);
  const recent = [...(enrollRes.rows ?? []), ...(payRes.rows ?? []), ...(reflRes.rows ?? [])] as any[];

  return c.json({
    monthlyOmzet: monthOmzet,
    pesertaCount,
    completionPercent: Math.round(completionPercent * 10) / 10,
    growthPercent: Math.round(growthPercent * 10) / 10,
    programAktif: withCounts,
    aktivitasTerbaru: recent
      .filter((a) => a.occurredAt)
      .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
      .slice(0, 6)
      .map((a) => ({ id: String(a.id), kind: a.kind, summary: String(a.kind), occurredAt: new Date(a.occurredAt).toISOString() })),
  }, 200);
});
```

`sql`, `and`, `eq`, `programs` are already imported in class-routes.ts (line 4 imports sql; programs imported line 27). Single endpoint replaces 5+ client round trips.

- [ ] **Step 4: Run typecheck plus integration gate**

Run: `pnpm --filter @promotor/platform-api typecheck`
Expected: PASS.
Run: `TEST_DATABASE_URL=postgresql://promotor_runtime:ci_runtime_pw@localhost:5432/postgres OWNER_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres pnpm --filter @promotor/platform-api exec tsx --test --test-concurrency=1 src/__tests__/integration/payout-lifecycle.integration.test.ts`
Expected: PASS (route exists; money math asserted in Task 4 unit).

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/routes/class-routes.ts apps/platform-api/src/__tests__/integration/payout-lifecycle.integration.test.ts
git commit -m "feat(class): add dashboard-summary endpoint and payout route gate"
```

---

### Task 7: API client methods for payout, bank, summary

**Files:**
- Modify: packages/api-client/src/index.ts (PromotorClassContentApiClient only — Flow client has identical orders block but payout UI is Class-scoped; Flow keeps existing block untouched)

**Interfaces:**
- Consumes: Task 1 contract types, Task 5/6 endpoint paths.
- Produces: listOrdersSummary, listAvailableOrders, listPayouts, createPayout, getPayout, submitPayout, markPayoutPaid, failPayout, bank CRUD, getDashboardSummary used by Tasks 8-10.

- [ ] **Step 1: Extend type imports and listOrders, then append methods to PromotorClassContentApiClient (after approveOrder, near line 677)**

First extend the `import type { ... }` block at top of file (OrderItemSummary already imported; add the rest):

```typescript
  ListOrdersQuery,
  ListOrdersResponse,
  OrderItemSummary,
  OrdersSummary,
  PayoutBatch,
  PayoutItem,
  CreatePayoutBatchRequest,
  BankAccount,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
  DashboardSummary,
  CommerceOrder,
```

Then extend listOrders to forward payoutStatus:

```typescript
  async listOrders(query?: Partial<ListOrdersQuery>): Promise<ListOrdersResponse> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.payoutStatus) params.set('payoutStatus', query.payoutStatus);
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.offset) params.set('offset', String(query.offset));
    const qs = params.toString();
    return this.client.get<ListOrdersResponse>(`/api/v1/class/orders${qs ? `?${qs}` : ''}`);
  }
```

Then append (concrete code, generics match existing `this.client.get<T>` style):

```typescript
  async listOrdersSummary(): Promise<{ summary: OrdersSummary }> {
    return this.client.get<{ summary: OrdersSummary }>('/api/v1/class/orders/summary');
  }

  async listAvailableOrders(limit = 100): Promise<{ orders: OrderItemSummary[] }> {
    return this.client.get<{ orders: OrderItemSummary[] }>(`/api/v1/class/orders/available?limit=${limit}`);
  }

  async listPayouts(): Promise<{ batches: PayoutBatch[] }> {
    return this.client.get<{ batches: PayoutBatch[] }>('/api/v1/class/payouts');
  }

  async createPayout(data: CreatePayoutBatchRequest): Promise<{ batch: PayoutBatch; items: PayoutItem[] }> {
    return this.client.post<{ batch: PayoutBatch; items: PayoutItem[] }>('/api/v1/class/payouts', data);
  }

  async getPayout(id: string): Promise<{ batch: PayoutBatch; items: PayoutItem[] }> {
    return this.client.get<{ batch: PayoutBatch; items: PayoutItem[] }>(`/api/v1/class/payouts/${encodeURIComponent(id)}`);
  }

  async submitPayout(id: string): Promise<{ batch: PayoutBatch }> {
    return this.client.post<{ batch: PayoutBatch }>(`/api/v1/class/payouts/${encodeURIComponent(id)}/submit`);
  }

  async markPayoutPaid(id: string, proofUrl: string): Promise<{ batch: PayoutBatch }> {
    return this.client.post<{ batch: PayoutBatch }>(`/api/v1/class/payouts/${encodeURIComponent(id)}/mark-paid`, { proofUrl });
  }

  async failPayout(id: string): Promise<{ batch: PayoutBatch }> {
    return this.client.post<{ batch: PayoutBatch }>(`/api/v1/class/payouts/${encodeURIComponent(id)}/fail`);
  }

  async listBankAccounts(): Promise<{ accounts: BankAccount[] }> {
    return this.client.get<{ accounts: BankAccount[] }>('/api/v1/class/bank-accounts');
  }

  async createBankAccount(data: CreateBankAccountRequest): Promise<{ account: BankAccount }> {
    return this.client.post<{ account: BankAccount }>('/api/v1/class/bank-accounts', data);
  }

  async updateBankAccount(id: string, data: UpdateBankAccountRequest): Promise<{ account: BankAccount }> {
    return this.client.patch<{ account: BankAccount }>(`/api/v1/class/bank-accounts/${encodeURIComponent(id)}`, data);
  }

  async deleteBankAccount(id: string): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/api/v1/class/bank-accounts/${encodeURIComponent(id)}`);
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.client.get<DashboardSummary>('/api/v1/class/dashboard-summary');
  }
```

SCOPE NOTE: touch PromotorClassContentApiClient only. The Flow client (PromotorFlowApiClient, line 709) has an identical orders block but payout UI is Class-scoped — leave it untouched.

- [ ] **Step 2: Typecheck the client package**

Run: `pnpm --filter @promotor/api-client exec tsc --noEmit`
Expected: PASS. If package has no typecheck script, run `pnpm typecheck` from root and confirm no new errors in packages/api-client.

- [ ] **Step 3: Commit**

```bash
git add packages/api-client/src/index.ts
git commit -m "feat(api-client): add payout bank summary methods"
```

---

### Task 8: Orders dashboard upgrade (server cards, net, payout filter, CSV)

**Files:**
- Modify: apps/promotor-class-web/src/app/(promotor)/app/orders/page.tsx

**Interfaces:**
- Consumes: Task 7 listOrdersSummary + enriched OrderItemSummary (netAmount, payoutStatus, processorFee).
- Produces: earnings cards from ledger, net + payout-status columns, AVAILABLE/IN_BATCH/PAID filter, CSV export for reconciliation.

- [ ] **Step 1: Replace client-side KPI math with server summary fetch**

Add import at top of file:

```typescript
import type { OrdersSummary } from '@promotor/contracts';
```

In OrdersPage, add state:

```typescript
const [summary, setSummary] = useState<OrdersSummary | null>(null);
```

In fetchOrders, after listOrders call, add:

```typescript
const s = await api.listOrdersSummary().catch(() => null);
setSummary(s?.summary ?? null);
```

Replace totalRevenue/totalPlatformFees derivation:

```typescript
const paidOrders = orders.filter((o) => o.status === 'PAID' || o.status === 'APPROVED');
const totalRevenue = summary?.grossAmount ?? paidOrders.reduce((sum, o) => sum + o.amount, 0);
const totalPlatformFees = summary?.platformFeeTotal ?? paidOrders.length * 3000;
const totalNet = summary?.netTotal ?? totalRevenue - totalPlatformFees;
const totalProcessorFees = summary?.processorFeeTotal ?? 0;
```

Render four KPI cards (TOTAL PESANAN, OMZET LUNAS, BIAYA PROSESOR + PLATFORM, NET BERSIH) reusing existing card style; fourth card shows formatIDR(totalNet) in emerald.

- [ ] **Step 2: Add net + payout-status columns and filter**

Replace the OrderFilterTab type line and add payout filter state next to activeTab:

```typescript
type OrderFilterTab = 'ALL' | 'PENDING' | 'PAID' | 'REJECTED';
type PayoutFilter = 'ALL' | 'AVAILABLE' | 'IN_BATCH' | 'PAID';

const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>('ALL');
```

In fetchOrders, extend the listOrders call to forward payoutStatus:

```typescript
const res = await api.listOrders({
  status: statusParam as any,
  payoutStatus: payoutFilter === 'ALL' ? undefined : payoutFilter,
  limit: 50,
  offset: 0,
});
```

Update the effect dep array from `}, [activeTab]);` to `}, [activeTab, payoutFilter]);` so changing the filter refetches.

Render a second segmented row above the table (ALL "Semua", AVAILABLE "Siap cair", IN_BATCH "Dalam batch", PAID "Cair") reusing the same tab button style. Table header: add NET and PENCAIRAN columns after Nominal. Row cells: formatIDR(order.netAmount ?? order.amount - (order.processorFee ?? 0) - (order.platformFee ?? 3000)); payout pill: AVAILABLE amber "Siap cair", IN_BATCH sky "Dalam batch", PAID emerald "Cair".

- [ ] **Step 3: Add CSV export button**

```typescript
const exportCsv = () => {
  const header = 'reference,buyer,program,gross,processorFee,platformFee,net,status,payoutStatus,paidAt';
  const lines = orders.map((o) => {
    const net = o.netAmount ?? o.amount - (o.processorFee ?? 0) - (o.platformFee ?? 3000);
    return [o.reference, `"${o.buyerName}"`, `"${o.programTitle}"`, o.amount, o.processorFee ?? 0, o.platformFee ?? 0, net, o.status, o.payoutStatus ?? '', o.paidAt ?? ''].join(',');
  });
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekonsiliasi-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

Button placed next to PageHeader action prop with class btn btn-secondary btn-sm label "Export CSV".

- [ ] **Step 4: Verify frontend builds**

Run: `pnpm build:class`
Expected: PASS (Next production build compiles).

- [ ] **Step 5: Commit**

```bash
git add "apps/promotor-class-web/src/app/(promotor)/app/orders/page.tsx"
git commit -m "feat(class-web): enrich orders with net payout-status csv"
```

---

### Task 9: Payout page plus nav plus bank-accounts settings

**Files:**
- Create: apps/promotor-class-web/src/app/(promotor)/app/payouts/page.tsx
- Create: apps/promotor-class-web/src/components/promotor/BankAccountsSection.tsx
- Modify: apps/promotor-class-web/src/app/(promotor)/app/more/page.tsx
- Modify: apps/promotor-class-web/src/components/layout/PromotorShell.tsx
- Modify: apps/promotor-class-web/src/components/layout/PromotorTabBar.tsx
- Modify: apps/promotor-class-web/src/app/(promotor)/app/settings/page.tsx

**Interfaces:**
- Consumes: Task 7 payout/bank client methods.
- Produces: /app/payouts route, Lainnya + desktop nav entries, settings bank CRUD gating payout requests.

- [ ] **Step 1: Create payouts page**

```typescript
// apps/promotor-class-web/src/app/(promotor)/app/payouts/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader } from '@/components/ui';
import { getPlatformApiClient } from '@/adapters';
import { formatIDR, formatTimeAgo } from '@promotor/platform-core';

export default function PayoutsPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bankId, setBankId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const api = getPlatformApiClient();
      const [b, a, banksRes] = await Promise.all([
        api.listPayouts().catch(() => ({ batches: [] })),
        api.listAvailableOrders().catch(() => ({ orders: [] })),
        api.listBankAccounts().catch(() => ({ accounts: [] })),
      ]);
      setBatches(b.batches ?? []);
      setAvailable((a as any).orders ?? []);
      setBanks(banksRes.accounts ?? []);
      if (!bankId && banksRes.accounts?.[0]) setBankId(banksRes.accounts[0].id);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submitRequest = async () => {
    if (selected.length === 0) { alert('Pilih minimal 1 order'); return; }
    if (!bankId) { alert('Pilih rekening tujuan dulu di Pengaturan'); return; }
    await getPlatformApiClient().createPayout({ orderIds: selected, bankAccountId: bankId });
    setSelected([]);
    await load();
  };

  if (isLoading) return <PromotorShell><PageHeader kicker="PromotorClass" title="Pencairan" sub="Memuat..." /></PromotorShell>;

  return (
    <PromotorShell>
      <PageHeader kicker="PromotorClass" title="Pencairan" sub="Ajukan order siap cair ke transfer manual" />
      <section>
        <h2>Order siap cair ({available.length})</h2>
        {banks.length === 0 && <p>Tambahkan rekening di Pengaturan dulu sebelum mengajukan.</p>}
        {available.map((o: any) => (
          <label key={o.id} style={{ display: 'flex', gap: 8, padding: 8 }}>
            <input type="checkbox" checked={selected.includes(o.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, o.id] : selected.filter((s) => s !== o.id))} />
            <span>{o.reference} · {formatIDR(o.netAmount ?? o.amount)} · {o.buyerName}</span>
          </label>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <select value={bankId} onChange={(e) => setBankId(e.target.value)}>
            {banks.map((b: any) => <option key={b.id} value={b.id}>{b.bankName} · {b.accountNumber}</option>)}
          </select>
          <button type="button" onClick={submitRequest}>Ajukan pencairan</button>
        </div>
      </section>
      <section style={{ marginTop: 24 }}>
        <h2>Riwayat batch</h2>
        {batches.map((b: any) => (
          <div key={b.id} style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <strong>{formatIDR(b.totalNet)}</strong> · {b.orderCount} order · {b.status} · {formatTimeAgo(b.createdAt)}
            {b.proofUrl && <a href={b.proofUrl} target="_blank" rel="noreferrer"> · Bukti</a>}
          </div>
        ))}
      </section>
    </PromotorShell>
  );
}
```

Fix the sub copy to pure Indonesian before commit (no mixed-language string).

- [ ] **Step 2: Create bank-accounts section component**

```typescript
// apps/promotor-class-web/src/components/promotor/BankAccountsSection.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getPlatformApiClient } from '@/adapters';

export function BankAccountsSection() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  const load = async () => {
    const res = await getPlatformApiClient().listBankAccounts().catch(() => ({ accounts: [] }));
    setAccounts(res.accounts ?? []);
  };
  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      alert('Lengkapi bank, nomor, dan nama pemilik');
      return;
    }
    await getPlatformApiClient().createBankAccount({ bankName, accountNumber, accountHolderName });
    setBankName(''); setAccountNumber(''); setAccountHolderName('');
    await load();
  };

  return (
    <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800 }}>Rekening pencairan</h2>
      <p style={{ fontSize: 13, color: '#6B7280' }}>Wajib ada sebelum mengajukan pencairan.</p>
      {accounts.map((a) => (
        <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: 13 }}>
          <strong>{a.bankName}</strong> · {a.accountNumber} · {a.accountHolderName}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input placeholder="Bank (BCA)" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        <input placeholder="Nomor rekening" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        <input placeholder="Nama pemilik" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
        <button type="button" onClick={add}>Tambah rekening</button>
      </div>
    </section>
  );
}
```

Render in settings page.tsx: add import at top alongside existing imports, then place component inside the column flex after the plan card:

```typescript
import { BankAccountsSection } from '@/components/promotor/BankAccountsSection';
```

```tsx
<BankAccountsSection />
```

settings page.tsx already imports getPlatformApiClient, formatIDR, and signOut — no other import changes needed.

- [ ] **Step 3: Wire navigation**

more/page.tsx MORE_LINKS: insert { label: 'Pencairan', href: '/app/payouts', note: 'Ajukan pencairan dan lacak transfer manual' } after Pesanan entry.
PromotorShell.tsx DESKTOP_NAV: insert { label: 'Pencairan', href: '/app/payouts' } after Pesanan entry.
PromotorTabBar.tsx isTabActive: add pathname.startsWith('/app/payouts') to the Lainnya group condition.

- [ ] **Step 4: Verify frontend builds**

Run: `pnpm build:class`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/promotor-class-web/src/app/(promotor)/app/payouts/page.tsx" apps/promotor-class-web/src/components/promotor/BankAccountsSection.tsx "apps/promotor-class-web/src/app/(promotor)/app/more/page.tsx" apps/promotor-class-web/src/components/layout/PromotorShell.tsx apps/promotor-class-web/src/components/layout/PromotorTabBar.tsx "apps/promotor-class-web/src/app/(promotor)/app/settings/page.tsx"
git commit -m "feat(class-web): add payouts page bank accounts and nav"
```

---

### Task 10: Beranda summary cards from dashboard-summary

**Files:**
- Modify: apps/promotor-class-web/src/app/(promotor)/app/page.tsx

**Interfaces:**
- Consumes: Task 6 GET dashboard-summary via Task 7 getDashboardSummary.
- Produces: summary cards (omzet, peserta, penyelesaian, pertumbuhan, program aktif, aktivitas terbaru) above existing signals; signals stay below unchanged.

- [ ] **Step 1: Add summary fetch alongside existing queries**

Beranda currently imports `formatTimeAgo` from `@promotor/platform-core` (line 14) and contract types from `@promotor/contracts` (line 13). Extend both imports:

```typescript
import { LearningSignal, Contact, Reflection, Enrollment, LearnerSummaryItem, DashboardSummary } from '@promotor/contracts';
import { formatTimeAgo, formatIDR } from '@promotor/platform-core';
```

In PromotorHomePage, add:

```typescript
const [summary, setSummary] = useState<DashboardSummary | null>(null);
```

Extend the Promise.all in loadData with a sixth element and setSummary (loadData already builds the client via getPlatformApiClient() for listClassLearners, so no new adapter wiring is needed):

```typescript
const [sigData, conData, reflData, enrData, atRiskData, sumData] = await Promise.all([
  getLearningSignalsQuery(),
  getContactsQuery(),
  getReflectionsQuery(),
  getEnrollmentsQuery(),
  getPlatformApiClient().listClassLearners({ learningStatus: 'AT_RISK' }).catch(() => ({ learners: [], total: 0 })),
  getPlatformApiClient().getDashboardSummary().catch(() => null),
]);
setSignals(sigData as SignalWithAction[]);
setContacts(conData);
setReflections(reflData);
setAtRiskLearners(atRiskData?.learners ?? []);
setSummary(sumData);
void enrData;
```

- [ ] **Step 2: Render cards above signals**

Insert after PageHeader, before loadError block:

```typescript
{summary && (
  <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
    <div className="card"><div className="kicker">Omzet bulan ini</div><strong>{formatIDR(summary.monthlyOmzet)}</strong><div className="row-meta">{summary.growthPercent}% vs bulan lalu</div></div>
    <div className="card"><div className="kicker">Peserta</div><strong>{summary.pesertaCount}</strong></div>
    <div className="card"><div className="kicker">Penyelesaian</div><strong>{summary.completionPercent}%</strong></div>
  </section>
)}
{summary && summary.programAktif.length > 0 && (
  <section>
    <SectionHead label="Program aktif" />
    {summary.programAktif.map((p) => (
      <div key={p.id} className="list-row"><span>{p.title}</span><span className="row-meta">{formatIDR(p.priceAmount)} · {p.pesertaCount} peserta</span></div>
    ))}
  </section>
)}
```

Reuse existing list-row / row-meta classes so no new CSS is needed. Keep signals, at-risk, and activity sections untouched below.

- [ ] **Step 3: Verify frontend builds**

Run: `pnpm build:class`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "apps/promotor-class-web/src/app/(promotor)/app/page.tsx"
git commit -m "feat(class-web): add beranda summary cards"
```

---

### Task 11: Full verification and CI gate

**Files:**
- Modify: .github/workflows/ci.yml (only if payout test file needs explicit listing; default test:integration glob already covers it)

**Interfaces:**
- Consumes: all tasks above.
- Produces: green unit + integration + typecheck + builds; staging E2E notes.

- [ ] **Step 1: Run unit suite**

Run: `pnpm --filter @promotor/platform-api test`
Expected: PASS including payout-math.test.ts and payout-service.test.ts alongside existing 217+ tests.

- [ ] **Step 2: Run integration suite with CI-equivalent env**

Run: `TEST_DATABASE_URL=postgresql://promotor_runtime:ci_runtime_pw@localhost:5432/postgres OWNER_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres pnpm --filter @promotor/platform-api test:integration`
Expected: PASS including payout-lifecycle.integration.test.ts. If Docker postgres is down locally, rely on CI: push branch and watch the verify job (Run PostgreSQL Integration Tests + Auth Register-Reset Integration Gate).

- [ ] **Step 3: Run typecheck and production builds**

Run: `pnpm typecheck`
Expected: PASS.
Run: `pnpm build:class && pnpm build:flow && pnpm build:api`
Expected: PASS each (proves contracts + client + routes compile for deploy).

- [ ] **Step 4: Stage and commit CI change only if needed**

If the glob already picks up the new integration file (it does: src/__tests__/integration/*.test.ts), no ci.yml change is needed — skip this step. Only if the team wants the payout gate named explicitly, append payout-lifecycle.integration.test.ts to the Run Auth Register-Reset Integration Gate run line and commit:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: include payout lifecycle in auth gate"
```

- [ ] **Step 5: Record staging E2E checklist in PR body (no code)**

Manual staging pass after deploy: create paid order via Paycore sandbox, assert fee BILLABLE and order AVAILABLE, add bank account, create batch DRAFT, submit to PROCESSING, mark PAID with proof URL, assert fee BILLED and order payoutStatus PAID, assert dashboard-summary omzet includes the order, export CSV from orders page.

---

## Self-Review

1. Spec coverage: settlement model (Tasks 2, 4, 5 fee lifecycle + net formula); payout architecture with batches/items/AVAILABLE/proof (Tasks 3-5, 9); earnings dashboard cards/table/filter/CSV from ledger (Tasks 5, 8); payout page + bank CRUD gate (Tasks 5, 9); flow webhook-fee-batch-transfer-proof-BILLED plus duplicate-proof-failure handling (Tasks 4, 5, 11 E2E); unit/integration/E2E tests (Tasks 2, 4, 6, 11); Beranda dashboard-summary with six fields, single endpoint, signals preserved (Tasks 6, 10).
2. Placeholder scan: no placeholder; every code step shows concrete zod/drizzle/service/route/TSX; error paths use DomainError with user-facing Indonesian copy; commands include expected outputs.
3. Type consistency: PayoutBatchStatus union DRAFT|PROCESSING|FAILED|PAID matches DB check, zod enum, transition map, and service casts; OrderItemSummary extensions optional so old fixtures still parse; client method names match route paths verbatim (/api/v1/class/orders/summary, /orders/available, /payouts, /bank-accounts, /dashboard-summary).
