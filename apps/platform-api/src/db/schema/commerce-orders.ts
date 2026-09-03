import { pgTable, uuid, text, integer, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { programs } from './programs';
import { contacts } from './contacts';
import { enrollments } from './enrollments';
import { users } from './users';

export const commerceOrders = pgTable(
  'commerce_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    reference: text('reference').notNull(),
    sourceChannel: text('source_channel').notNull().default('STOREFRONT'),
    paymentMode: text('payment_mode').notNull().default('PAYCORE'),
    amount: integer('amount').notNull().default(0),
    currency: text('currency').notNull().default('IDR'),
    status: text('status').notNull().default('PENDING'),
    paymentRecordId: uuid('payment_record_id'),
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id, { onDelete: 'set null' }),
    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'string' }),
    approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'string' }),
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true, mode: 'string' }),
    rejectedByUserId: uuid('rejected_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    rejectionReason: text('rejection_reason'),
    refundedAt: timestamp('refunded_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('commerce_orders_reference_unique').on(t.reference),
    index('commerce_orders_org_idx').on(t.organizationId),
    index('commerce_orders_org_status_idx').on(t.organizationId, t.status),
    index('commerce_orders_program_idx').on(t.programId),
    index('commerce_orders_contact_idx').on(t.contactId),
    check('commerce_orders_amount_non_negative', sql`${t.amount} >= 0`),
    check('commerce_orders_currency_idr', sql`${t.currency} = 'IDR'`),
    check('commerce_orders_source_channel_check', sql`${t.sourceChannel} IN ('STOREFRONT', 'WHATSAPP', 'OPERATOR')`),
    check('commerce_orders_payment_mode_check', sql`${t.paymentMode} IN ('PAYCORE', 'MANUAL_BANK')`),
    check('commerce_orders_status_check', sql`${t.status} IN ('PENDING', 'PAID', 'APPROVED', 'REJECTED', 'EXPIRED', 'REFUNDED')`),
  ]
);

export type CommerceOrderRow = typeof commerceOrders.$inferSelect;
export type NewCommerceOrderRow = typeof commerceOrders.$inferInsert;
