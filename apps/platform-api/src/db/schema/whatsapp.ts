import { pgTable, uuid, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { contacts } from './contacts';

export const whatsappDevices = pgTable(
  'whatsapp_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    deviceId: text('device_id').notNull(),
    deviceToken: text('device_token').notNull(),
    phoneE164: text('phone_e164'),
    status: text('status').notNull().default('needs_pairing'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('whatsapp_devices_device_id_idx').on(t.deviceId),
  ]
);

export type WhatsappDeviceRow = typeof whatsappDevices.$inferSelect;
export type InsertWhatsappDevice = typeof whatsappDevices.$inferInsert;

export const whatsappInbox = pgTable(
  'whatsapp_inbox',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .references(() => contacts.id, { onDelete: 'set null' }),
    waMessageId: text('wa_message_id').notNull().unique(),
    chatJid: text('chat_jid').notNull(),
    phoneE164: text('phone_e164').notNull(),
    isGroup: boolean('is_group').notNull().default(false),
    type: text('type').notNull().default('text'),
    text: text('text').notNull().default(''),
    rawPayload: jsonb('raw_payload'),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    isRead: boolean('is_read').notNull().default(false),
  },
  (t) => [
    index('whatsapp_inbox_org_received_idx').on(t.organizationId, t.receivedAt),
    index('whatsapp_inbox_contact_idx').on(t.contactId),
  ]
);

export type WhatsappInboxRow = typeof whatsappInbox.$inferSelect;
export type InsertWhatsappInbox = typeof whatsappInbox.$inferInsert;
