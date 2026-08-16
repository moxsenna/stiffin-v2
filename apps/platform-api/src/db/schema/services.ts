import { pgTable, uuid, text, integer, boolean, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category').notNull(),
    priceAmount: integer('price_amount').notNull().default(0),
    depositAmount: integer('deposit_amount'),
    durationMinutes: integer('duration_minutes').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('services_org_active_idx').on(t.organizationId, t.isActive),
    check('services_name_not_empty', sql`char_length(${t.name}) > 0`),
    check('services_category_check', sql`${t.category} IN ('ASSESSMENT', 'SESSION', 'PROGRAM', 'OTHER')`),
    check('services_price_amount_non_negative', sql`${t.priceAmount} >= 0`),
    check('services_deposit_amount_non_negative', sql`${t.depositAmount} IS NULL OR ${t.depositAmount} >= 0`),
    check('services_duration_minutes_positive', sql`${t.durationMinutes} > 0`),
  ]
);

export type ServiceRow = typeof services.$inferSelect;
export type NewServiceRow = typeof services.$inferInsert;
