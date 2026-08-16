import { pgTable, uuid, text, boolean, timestamp, jsonb, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { programs } from './programs';

export const programPresentations = pgTable(
  'program_presentations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    coverVariant: text('cover_variant').notNull().default('cover-a'),
    featured: boolean('featured').notNull().default(false),
    imageUrl: text('image_url'),
    heroEyebrow: text('hero_eyebrow'),
    shortOutcome: text('short_outcome'),
    durationLabel: text('duration_label'),
    learningOutcomes: jsonb('learning_outcomes')
      .notNull()
      .default('[]')
      .$type<Array<{ title: string; description: string }>>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('program_presentations_program_id_unique').on(t.programId),
    check('program_presentations_cover_variant_check', sql`${t.coverVariant} IN ('cover-a', 'cover-b', 'cover-c')`),
  ]
);

export type ProgramPresentationRow = typeof programPresentations.$inferSelect;
export type NewProgramPresentationRow = typeof programPresentations.$inferInsert;
