import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const programs = pgTable(
  'programs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    description: text('description'),
    programType: text('program_type').notNull(),
    accessType: text('access_type').notNull().default('public'),
    status: text('status').notNull().default('draft'),
    pricing: text('pricing').notNull().default('free'),
    priceAmount: integer('price_amount').notNull().default(0),
    bankTransferEnabled: boolean('bank_transfer_enabled').notNull().default(false),
    whatsAppEnabled: boolean('whatsapp_enabled').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('programs_org_slug_unique').on(t.organizationId, t.slug),
    index('programs_org_status_idx').on(t.organizationId, t.status),
    index('programs_org_type_idx').on(t.organizationId, t.programType),
    check('programs_title_not_empty', sql`char_length(${t.title}) > 0`),
    check('programs_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('programs_type_check', sql`${t.programType} IN ('lead_magnet', 'aftersales', 'paid', 'private')`),
    check('programs_access_type_check', sql`${t.accessType} IN ('public', 'private', 'manual')`),
    check('programs_status_check', sql`${t.status} IN ('draft', 'published', 'archived')`),
    check('programs_pricing_check', sql`${t.pricing} IN ('free', 'one_time')`),
    check('programs_price_amount_non_negative', sql`${t.priceAmount} >= 0`),
    check(
      'programs_pricing_amount_invariant',
      sql`(${t.pricing} = 'free' AND ${t.priceAmount} = 0) OR (${t.pricing} = 'one_time' AND ${t.priceAmount} > 0)`
    ),
    check(
      'programs_type_invariants',
      sql`(${t.programType} = 'lead_magnet' AND ${t.accessType} = 'public' AND ${t.pricing} = 'free') OR (${t.programType} = 'aftersales' AND ${t.accessType} = 'manual' AND ${t.pricing} = 'free') OR (${t.programType} = 'paid' AND ${t.pricing} = 'one_time') OR (${t.programType} = 'private' AND ${t.accessType} = 'private')`
    ),
  ]
);

export type ProgramRow = typeof programs.$inferSelect;
export type NewProgramRow = typeof programs.$inferInsert;
