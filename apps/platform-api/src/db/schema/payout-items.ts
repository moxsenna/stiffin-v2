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
