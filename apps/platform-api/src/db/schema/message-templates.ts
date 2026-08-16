import { pgTable, uuid, text, boolean, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const messageTemplates = pgTable(
  'message_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    category: text('category').notNull(),
    templateText: text('template_text').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('message_templates_org_category_active_idx').on(t.organizationId, t.category, t.isActive),
    check('message_templates_title_not_empty', sql`char_length(${t.title}) > 0`),
    check(
      'message_templates_category_check',
      sql`${t.category} IN ('CONTACT_LEAD', 'FOLLOW_UP', 'CONFIRM_BOOKING', 'REMIND_PAYMENT', 'REMIND_BOOKING', 'AFTERCARE')`
    ),
  ]
);

export type MessageTemplateRow = typeof messageTemplates.$inferSelect;
export type NewMessageTemplateRow = typeof messageTemplates.$inferInsert;
