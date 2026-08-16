import { pgTable, uuid, text, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { contacts } from './contacts';
import { bookings } from './bookings';

export const aftercareRecords = pgTable(
  'aftercare_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true, mode: 'string' }).notNull(),
    status: text('status').notNull().default('PENDING'),
    outcome: text('outcome'),
    outcomeNotes: text('outcome_notes'),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('aftercare_records_org_booking_unique').on(t.organizationId, t.bookingId),
    index('aftercare_records_org_status_scheduled_idx').on(t.organizationId, t.status, t.scheduledFor),
    check('aftercare_records_status_check', sql`${t.status} IN ('PENDING', 'COMPLETED')`),
    check(
      'aftercare_records_outcome_check',
      sql`${t.outcome} IS NULL OR ${t.outcome} IN ('NO_NEED', 'HAS_QUESTION', 'INTERESTED_NEXT_SESSION', 'CONTACT_LATER')`
    ),
    check(
      'aftercare_records_completed_outcome_invariant',
      sql`(${t.status} = 'COMPLETED') = (${t.outcome} IS NOT NULL)`
    ),
    check(
      'aftercare_records_completed_recorded_at_invariant',
      sql`(${t.status} = 'COMPLETED') = (${t.recordedAt} IS NOT NULL)`
    ),
  ]
);

export type AftercareRecordRow = typeof aftercareRecords.$inferSelect;
export type NewAftercareRecordRow = typeof aftercareRecords.$inferInsert;
