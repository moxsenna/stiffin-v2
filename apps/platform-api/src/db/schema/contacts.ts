import { pgTable, uuid, text, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    phoneE164: text('phone_e164'),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (t) => [
    uniqueIndex('contacts_org_phone_unique')
      .on(t.organizationId, t.phoneE164)
      .where(sql`${t.phoneE164} IS NOT NULL`),
    index('contacts_org_active_idx')
      .on(t.organizationId, t.deletedAt)
      .where(sql`${t.deletedAt} IS NULL`),
    index('contacts_org_email_idx')
      .on(t.organizationId, t.email)
      .where(sql`${t.email} IS NOT NULL`),
    check('contacts_name_not_empty', sql`char_length(${t.name}) > 0`),
    check('contacts_phone_e164_format', sql`${t.phoneE164} IS NULL OR ${t.phoneE164} ~ '^\\+[1-9][0-9]{1,14}$'`),
  ]
);

export type ContactRow = typeof contacts.$inferSelect;
export type NewContactRow = typeof contacts.$inferInsert;
