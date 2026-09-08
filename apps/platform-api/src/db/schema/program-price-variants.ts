import { pgTable, uuid, text, integer, timestamp, varchar, boolean, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { programs } from './programs';

export const programPriceVariants = pgTable(
  'program_price_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 120 }).notNull(),
    description: text('description'),
    priceAmount: integer('price_amount').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('program_price_variants_org_prog_idx').on(t.organizationId, t.programId),
    check('program_price_variants_label_not_empty', sql`char_length(${t.label}) > 0`),
    check('program_price_variants_price_amount_non_negative', sql`${t.priceAmount} >= 0`),
  ]
);

export type ProgramPriceVariantRow = typeof programPriceVariants.$inferSelect;
export type NewProgramPriceVariantRow = typeof programPriceVariants.$inferInsert;
