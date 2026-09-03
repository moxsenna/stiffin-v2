import { pgTable, uuid, text, integer, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { commerceOrders } from './commerce-orders';

export const paymentRecords = pgTable(
  'payment_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => commerceOrders.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default('PAYCORE'),
    providerPaymentId: text('provider_payment_id'),
    providerReference: text('provider_reference'),
    paymentMethod: text('payment_method'),
    grossAmount: integer('gross_amount').notNull(),
    currency: text('currency').notNull().default('IDR'),
    processorFee: integer('processor_fee'),
    status: text('status').notNull().default('PENDING'),
    rawMetadata: text('raw_metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('payment_records_order_idx').on(t.orderId),
    index('payment_records_org_idx').on(t.organizationId),
    index('payment_records_provider_id_idx').on(t.providerPaymentId),
    index('payment_records_status_idx').on(t.status),
    check('payment_records_amount_positive', sql`${t.grossAmount} > 0`),
    check('payment_records_currency_idr', sql`${t.currency} = 'IDR'`),
    check('payment_records_provider_check', sql`${t.provider} IN ('PAYCORE', 'MANUAL_BANK')`),
    check('payment_records_status_check', sql`${t.status} IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED')`),
  ]
);

export type PaymentRecordRow = typeof paymentRecords.$inferSelect;
export type NewPaymentRecordRow = typeof paymentRecords.$inferInsert;
