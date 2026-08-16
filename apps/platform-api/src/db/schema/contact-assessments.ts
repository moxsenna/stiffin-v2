import { pgTable, uuid, text, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { contacts } from './contacts';
import { bookings } from './bookings';

export const contactAssessments = pgTable(
  'contact_assessments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('NOT_STARTED'),
    sourceBookingId: uuid('source_booking_id')
      .references(() => bookings.id, { onDelete: 'restrict' }),
    assessedAt: timestamp('assessed_at', { withTimezone: true, mode: 'string' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('contact_assessments_contact_unique').on(t.contactId),
    index('contact_assessments_org_status_idx').on(t.organizationId, t.status),
    check(
      'contact_assessments_status_check',
      sql`${t.status} IN ('NOT_STARTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'UNKNOWN')`
    ),
  ]
);

export type ContactAssessmentRow = typeof contactAssessments.$inferSelect;
export type NewContactAssessmentRow = typeof contactAssessments.$inferInsert;
