import { pgTable, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const productEntitlements = pgTable('product_entitlements', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  promotorClass: boolean('promotor_class').notNull().default(false),
  promotorFlow: boolean('promotor_flow').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export type ProductEntitlementRow = typeof productEntitlements.$inferSelect;
export type NewProductEntitlementRow = typeof productEntitlements.$inferInsert;
