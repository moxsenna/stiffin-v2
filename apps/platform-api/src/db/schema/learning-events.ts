import { pgTable, uuid, timestamp, text, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { enrollments } from './enrollments';
import { contacts } from './contacts';

export const learningEvents = pgTable(
  'learning_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').default({}).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgContactIdx: index('idx_learning_events_org_contact').on(
      table.organizationId,
      table.contactId
    ),
    orgEnrollmentIdx: index('idx_learning_events_org_enrollment').on(
      table.organizationId,
      table.enrollmentId
    ),
  })
);

export type LearningEventRow = typeof learningEvents.$inferSelect;
export type NewLearningEventRow = typeof learningEvents.$inferInsert;
