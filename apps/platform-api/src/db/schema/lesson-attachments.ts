import { pgTable, uuid, text, integer, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { lessons } from './lessons';

export const lessonAttachments = pgTable(
  'lesson_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    sizeFormatted: text('size_formatted'),
    order: integer('order').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('lesson_attachments_lesson_id_idx').on(t.lessonId),
    check('lesson_attachments_kind_check', sql`${t.kind} IN ('image', 'download')`),
    check('lesson_attachments_name_not_empty', sql`char_length(${t.name}) > 0`),
    check('lesson_attachments_url_not_empty', sql`char_length(${t.url}) > 0`),
    check('lesson_attachments_order_positive', sql`${t.order} > 0`),
  ]
);

export type LessonAttachmentRow = typeof lessonAttachments.$inferSelect;
export type NewLessonAttachmentRow = typeof lessonAttachments.$inferInsert;
