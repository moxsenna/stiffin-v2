import { pgTable, uuid, timestamp, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { enrollments } from './enrollments';
import { lessons } from './lessons';

export const lessonProgress = pgTable(
  'lesson_progress',
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
    isCompleted: boolean('is_completed').default(false).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    enrollmentLessonUnique: uniqueIndex('lesson_progress_enrollment_lesson_unique').on(
      table.enrollmentId,
      table.lessonId
    ),
    orgEnrollmentIdx: index('idx_lesson_progress_org_enrollment').on(
      table.organizationId,
      table.enrollmentId
    ),
  })
);

export type LessonProgressRow = typeof lessonProgress.$inferSelect;
export type NewLessonProgressRow = typeof lessonProgress.$inferInsert;
