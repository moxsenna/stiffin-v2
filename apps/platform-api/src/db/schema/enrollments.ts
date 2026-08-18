import { pgTable, uuid, text, integer, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { programs } from './programs';
import { contacts } from './contacts';

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('ENROLLED'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true, mode: 'string' }),
    progressPercent: integer('progress_percent').notNull().default(0),
    intentScore: integer('intent_score').notNull().default(0),
    intentLabel: text('intent_label').notNull().default('COLD'),
    learningStatus: text('learning_status').notNull().default('NOT_STARTED'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('enrollments_org_program_contact_unique').on(t.organizationId, t.programId, t.contactId),
    index('idx_enrollments_org_contact').on(t.organizationId, t.contactId),
    index('idx_enrollments_org_program').on(t.organizationId, t.programId),
    check('enrollments_status_check', sql`${t.status} IN ('ENROLLED', 'STARTED', 'COMPLETED', 'CANCELLED')`),
    check('enrollments_progress_percent_check', sql`${t.progressPercent} >= 0 AND ${t.progressPercent} <= 100`),
    check('enrollments_intent_score_check', sql`${t.intentScore} >= 0 AND ${t.intentScore} <= 100`),
    check('enrollments_intent_label_check', sql`${t.intentLabel} IN ('COLD', 'WARM', 'HOT')`),
    check(
      'enrollments_learning_status_check',
      sql`${t.learningStatus} IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'AT_RISK')`
    ),
  ]
);

export type EnrollmentRow = typeof enrollments.$inferSelect;
export type NewEnrollmentRow = typeof enrollments.$inferInsert;
