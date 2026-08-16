import { pgTable, uuid, text, integer, timestamp, jsonb, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { contacts } from './contacts';
import { bookings } from './bookings';

export const nextActions = pgTable(
  'next_actions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'restrict' }),
    actionType: text('action_type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    dueAt: timestamp('due_at', { withTimezone: true, mode: 'string' }).notNull(),
    priority: integer('priority').notNull(),
    status: text('status').notNull().default('PENDING'),
    source: text('source').notNull().default('PROMOTORFLOW'),
    sourceEventId: text('source_event_id'),
    sourceSignalId: text('source_signal_id'),
    idempotencyKey: text('idempotency_key'),
    contextJson: jsonb('context_json').notNull().default('{}'),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('next_actions_org_source_idempotency_unique')
      .on(t.organizationId, t.source, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} IS NOT NULL`),
    index('next_actions_org_status_due_idx').on(t.organizationId, t.status, t.dueAt),
    index('next_actions_org_contact_status_idx').on(t.organizationId, t.contactId, t.status),
    index('next_actions_booking_idx').on(t.bookingId),
    check('next_actions_title_not_empty', sql`char_length(${t.title}) > 0`),
    check(
      'next_actions_type_check',
      sql`${t.actionType} IN ('CONTACT_LEAD', 'FOLLOW_UP', 'REMIND_PAYMENT', 'CONFIRM_BOOKING', 'REMIND_BOOKING', 'AFTERCARE', 'MANUAL')`
    ),
    check('next_actions_priority_range', sql`${t.priority} BETWEEN 1 AND 100`),
    check('next_actions_status_check', sql`${t.status} IN ('PENDING', 'COMPLETED', 'SKIPPED', 'CANCELLED')`),
    check('next_actions_source_check', sql`${t.source} IN ('PROMOTORFLOW', 'PROMOTORCLASS', 'MANUAL')`),
    check('next_actions_completed_at_status_invariant', sql`(${t.status} = 'COMPLETED') = (${t.completedAt} IS NOT NULL)`),
  ]
);

export type NextActionRow = typeof nextActions.$inferSelect;
export type NewNextActionRow = typeof nextActions.$inferInsert;
