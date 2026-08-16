import { pgTable, uuid, text, integer, timestamp, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { programs } from './programs';

export const modules = pgTable(
  'modules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    order: integer('order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('modules_program_order_unique').on(t.programId, t.order),
    check('modules_title_not_empty', sql`char_length(${t.title}) > 0`),
    check('modules_order_positive', sql`${t.order} > 0`),
  ]
);

export type ModuleRow = typeof modules.$inferSelect;
export type NewModuleRow = typeof modules.$inferInsert;
