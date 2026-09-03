import { pgTable, uuid, text, timestamp, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const organizationPaymentSettings = pgTable(
  'organization_payment_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    salesWhatsAppNumber: text('sales_whatsapp_number'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('org_payment_settings_org_unique').on(t.organizationId),
    check(
      'sales_whatsapp_e164_check',
      sql`${t.salesWhatsAppNumber} IS NULL OR ${t.salesWhatsAppNumber} ~ '^\\+[1-9][0-9]{1,14}$'`
    ),
  ]
);

export type OrganizationPaymentSettingsRow = typeof organizationPaymentSettings.$inferSelect;
export type NewOrganizationPaymentSettingsRow = typeof organizationPaymentSettings.$inferInsert;
