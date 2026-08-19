import { pgTable, uuid, timestamp, text, jsonb, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { enrollments } from './enrollments';
import { contacts } from './contacts';

export const CANONICAL_LEARNING_EVENTS = [
  'learner.registered',
  'learner.enrolled',
  'lesson.started',
  'lesson.completed',
  'reflection.submitted',
  'program.progress_50',
  'program.progress_80',
  'program.completed',
  'cta.viewed',
  'cta.clicked',
  'learner.inactive',
] as const;

export type CanonicalLearningEventType = (typeof CANONICAL_LEARNING_EVENTS)[number];

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
    milestoneUniqueIdx: uniqueIndex('idx_learning_events_milestone_unique')
      .on(table.enrollmentId, table.eventType)
      .where(
        sql`${table.eventType} IN ('program.progress_50', 'program.progress_80', 'program.completed', 'learner.registered', 'learner.enrolled')`
      ),
    lessonUniqueIdx: uniqueIndex('idx_learning_events_lesson_unique')
      .on(table.enrollmentId, table.eventType, sql`(${table.payload}->>'lessonId')`)
      .where(
        sql`${table.eventType} IN ('lesson.completed', 'lesson.started', 'reflection.submitted')`
      ),
    eventTypeCheck: check(
      'learning_events_event_type_check',
      sql`${table.eventType} IN (
        'learner.registered',
        'learner.enrolled',
        'lesson.started',
        'lesson.completed',
        'reflection.submitted',
        'program.progress_50',
        'program.progress_80',
        'program.completed',
        'cta.viewed',
        'cta.clicked',
        'learner.inactive'
      )`
    ),
  })
);

export type LearningEventRow = typeof learningEvents.$inferSelect;
export type NewLearningEventRow = typeof learningEvents.$inferInsert;
