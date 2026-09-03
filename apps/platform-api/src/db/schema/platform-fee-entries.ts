import { pgTable, uuid, text, integer, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { commerceOrders } from './commerce-orders';

export const platformFeeEntries = pgTable(
  'platform_fee_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => commerceOrders.id, { onDelete: 'cascade' }),
    feeType: text('fee_type').notNull().default('PAID_LEARNER_TRANSACTION'),
    amount: integer('amount').notNull().default(3000),
    currency: text('currency').notNull().default('IDR'),
    status: text('status').notNull().default('BILLABLE'),
    providerChargeId: text('provider_charge_id'),
    billedAt: timestamp('billed_at', { withTimezone: true, mode: 'string' }),
    reversedAt: timestamp('reversed_at', { withTimezone: true, mode: 'string' }),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('platform_fee_idempotency_unique').on(t.idempotencyKey),
    index('platform_fee_org_idx').on(t.organizationId),
    index('platform_fee_order_idx').on(t.orderId),
    index('platform_fee_status_idx').on(t.status),
    check('platform_fee_amount_flat_3000', sql`${t.amount} = 3000`),
    check('platform_fee_currency_idr', sql`${t.currency} = 'IDR'`),
    check('platform_fee_type_check', sql`${t.feeType} = 'PAID_LEARNER_TRANSACTION'`),
    check('platform_fee_status_check', sql`${t.status} IN ('PENDING', 'BILLABLE', 'BILLED', 'REVERSED')`),
  ]
);

export type PlatformFeeEntryRow = typeof platformFeeEntries.$inferSelect;
export type NewPlatformFeeEntryRow = typeof platformFeeEntries.$inferInsert;
