import { boolean, integer, pgTable, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { programs } from './programs';

export const promoCoupons = pgTable(
  'promo_coupons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 40 }).notNull(),
    discountType: varchar('discount_type', { length: 16 }).notNull(), // 'PERCENT' | 'FIXED'
    discountValue: integer('discount_value').notNull(),
    programId: uuid('program_id').references(() => programs.id, { onDelete: 'cascade' }),
    maxRedemptions: integer('max_redemptions'),
    usedCount: integer('used_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('promo_coupons_org_code_uq').on(table.organizationId, table.code)]
);

export type PromoCouponRow = typeof promoCoupons.$inferSelect;
export type NewPromoCouponRow = typeof promoCoupons.$inferInsert;
