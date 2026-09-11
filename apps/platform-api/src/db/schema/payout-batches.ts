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
