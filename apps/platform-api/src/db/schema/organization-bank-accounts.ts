import { pgTable, uuid, text, boolean, integer, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const organizationBankAccounts = pgTable(
  'organization_bank_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    bankName: text('bank_name').notNull(),
    accountNumber: text('account_number').notNull(),
    accountHolderName: text('account_holder_name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_org_bank_accounts_org_active').on(t.organizationId, t.isActive),
    check('bank_name_not_empty', sql`char_length(${t.bankName}) > 0`),
    check('account_number_not_empty', sql`char_length(${t.accountNumber}) > 0`),
    check('account_holder_not_empty', sql`char_length(${t.accountHolderName}) > 0`),
  ]
);

export type OrganizationBankAccountRow = typeof organizationBankAccounts.$inferSelect;
export type NewOrganizationBankAccountRow = typeof organizationBankAccounts.$inferInsert;
