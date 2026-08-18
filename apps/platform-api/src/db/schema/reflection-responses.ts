import { pgTable, uuid, timestamp, text, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { enrollments } from './enrollments';
import { lessons } from './lessons';

export const reflectionResponses = pgTable(
  'reflection_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    responseText: text('response_text'),
    selectedOptions: jsonb('selected_options'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    enrollmentLessonUnique: uniqueIndex('reflection_responses_enrollment_lesson_unique').on(
      table.enrollmentId,
      table.lessonId
    ),
    orgEnrollmentIdx: index('idx_reflection_responses_org_enrollment').on(
      table.organizationId,
      table.enrollmentId
    ),
  })
);

export type ReflectionResponseRow = typeof reflectionResponses.$inferSelect;
export type NewReflectionResponseRow = typeof reflectionResponses.$inferInsert;
