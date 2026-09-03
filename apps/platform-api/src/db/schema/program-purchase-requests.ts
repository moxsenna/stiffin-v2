import { pgTable, uuid, text, integer, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { programs } from './programs';
import { contacts } from './contacts';
import { users } from './users';
import { enrollments } from './enrollments';
import { organizationBankAccounts } from './organization-bank-accounts';

export const programPurchaseRequests = pgTable(
  'program_purchase_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    purchaseReference: text('purchase_reference').notNull(),
    purchaseMethod: text('purchase_method').notNull(),
    status: text('status').notNull().default('PENDING'),
    priceAmount: integer('price_amount').notNull().default(0),
    currency: text('currency').notNull().default('IDR'),
    buyerName: text('buyer_name').notNull(),
    buyerPhone: text('buyer_phone').notNull(),
    buyerNote: text('buyer_note'),
    bankAccountId: uuid('bank_account_id').references(() => organizationBankAccounts.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'string' }),
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true, mode: 'string' }),
    rejectedByUserId: uuid('rejected_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    rejectionReason: text('rejection_reason'),
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('program_purchase_requests_ref_unique').on(t.purchaseReference),
    index('idx_purchase_requests_org_status').on(t.organizationId, t.status),
    index('idx_purchase_requests_org_program').on(t.organizationId, t.programId),
    index('idx_purchase_requests_org_contact').on(t.organizationId, t.contactId),
    check('purchase_requests_method_check', sql`${t.purchaseMethod} IN ('BANK_TRANSFER', 'WHATSAPP')`),
    check('purchase_requests_status_check', sql`${t.status} IN ('PENDING', 'APPROVED', 'REJECTED')`),
    check('purchase_requests_price_non_negative', sql`${t.priceAmount} >= 0`),
    check('purchase_requests_currency_check', sql`${t.currency} = 'IDR'`),
    check('purchase_requests_buyer_name_not_empty', sql`char_length(${t.buyerName}) > 0`),
    check('purchase_requests_phone_format', sql`${t.buyerPhone} ~ '^\\+[1-9][0-9]{1,14}$'`),
  ]
);

export type ProgramPurchaseRequestRow = typeof programPurchaseRequests.$inferSelect;
export type NewProgramPurchaseRequestRow = typeof programPurchaseRequests.$inferInsert;
