import { pgTable, uuid, text, integer, timestamp, jsonb, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { modules } from './modules';
import { programs } from './programs';

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    order: integer('order').notNull(),
    textContent: text('text_content'),
    videoProvider: text('video_provider'),
    videoUrl: text('video_url'),
    videoExternalId: text('video_external_id'),
    reflectionType: text('reflection_type'),
    reflectionPrompt: text('reflection_prompt'),
    reflectionOptions: jsonb('reflection_options').$type<Array<{ id: string; label: string }>>(),
    ctaType: text('cta_type'),
    ctaLabel: text('cta_label'),
    ctaTargetProgramId: uuid('cta_target_program_id').references(() => programs.id, { onDelete: 'set null' }),
    ctaConfig: jsonb('cta_config').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('lessons_module_order_unique').on(t.moduleId, t.order),
    check('lessons_title_not_empty', sql`char_length(${t.title}) > 0`),
    check('lessons_order_positive', sql`${t.order} > 0`),
    check('lessons_video_provider_check', sql`${t.videoProvider} IS NULL OR ${t.videoProvider} IN ('youtube')`),
    check(
      'lessons_video_external_id_format',
      sql`${t.videoExternalId} IS NULL OR ${t.videoExternalId} ~ '^[A-Za-z0-9_-]{11}$'`
    ),
    check(
      'lessons_reflection_type_check',
      sql`${t.reflectionType} IS NULL OR ${t.reflectionType} IN ('long_text', 'single_select', 'multi_select')`
    ),
    check(
      'lessons_cta_type_check',
      sql`${t.ctaType} IS NULL OR ${t.ctaType} IN ('WHATSAPP', 'FLOW_BOOKING', 'EXTERNAL', 'ENROLL_PROGRAM')`
    ),
  ]
);

export type LessonRow = typeof lessons.$inferSelect;
export type NewLessonRow = typeof lessons.$inferInsert;
