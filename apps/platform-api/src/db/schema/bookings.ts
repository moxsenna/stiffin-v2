import { pgTable, uuid, text, integer, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { contacts } from './contacts';
import { services } from './services';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    amount: integer('amount').notNull(),
    startAt: timestamp('start_at', { withTimezone: true, mode: 'string' }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true, mode: 'string' }),
    locationType: text('location_type').notNull(),
    locationText: text('location_text'),
    status: text('status').notNull().default('PENDING'),
    paymentStatus: text('payment_status').notNull().default('UNPAID'),
    notes: text('notes'),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    idempotencyKey: text('idempotency_key'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('bookings_org_idempotency_unique')
      .on(t.organizationId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} IS NOT NULL`),
    index('bookings_org_start_idx').on(t.organizationId, t.startAt),
    index('bookings_org_status_start_idx').on(t.organizationId, t.status, t.startAt),
    index('bookings_contact_start_idx').on(t.contactId, t.startAt),
    check('bookings_amount_non_negative', sql`${t.amount} >= 0`),
    check('bookings_end_after_start', sql`${t.endAt} IS NULL OR ${t.endAt} > ${t.startAt}`),
    check('bookings_location_type_check', sql`${t.locationType} IN ('HOME_VISIT', 'ON_SITE', 'ONLINE')`),
    check('bookings_status_check', sql`${t.status} IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')`),
    check('bookings_payment_status_check', sql`${t.paymentStatus} IN ('UNPAID', 'PAID', 'WAIVED')`),
    check('bookings_completed_at_status_invariant', sql`(${t.status} = 'COMPLETED') = (${t.completedAt} IS NOT NULL)`),
  ]
);

export type BookingRow = typeof bookings.$inferSelect;
export type NewBookingRow = typeof bookings.$inferInsert;
