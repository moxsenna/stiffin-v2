import { pgTable, uuid, timestamp, text, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { enrollments } from './enrollments';
import { lessons } from './lessons';

export const learnerLessonNotes = pgTable(
  'learner_lesson_notes',
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
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    enrollmentLessonUq: uniqueIndex('learner_lesson_notes_enrollment_lesson_uq').on(
      table.enrollmentId,
      table.lessonId
    ),
    orgIdx: index('learner_lesson_notes_org_idx').on(table.organizationId),
  })
);

export type LearnerLessonNoteRow = typeof learnerLessonNotes.$inferSelect;
export type NewLearnerLessonNoteRow = typeof learnerLessonNotes.$inferInsert;
