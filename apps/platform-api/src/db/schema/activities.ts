import { pgTable, uuid, text, timestamp, jsonb, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { contacts } from './contacts';
import { bookings } from './bookings';
import { users } from './users';

export const activities = pgTable(
  'activities',
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
    eventType: text('event_type').notNull(),
    actorUserId: uuid('actor_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    metadataJson: jsonb('metadata_json').notNull().default('{}'),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('activities_org_contact_occurred_idx').on(t.organizationId, t.contactId, t.occurredAt),
    index('activities_org_occurred_idx').on(t.organizationId, t.occurredAt),
    check(
      'activities_event_type_check',
      sql`${t.eventType} IN ('CONTACT_CREATED', 'CONTACT_UPDATED', 'STAGE_CHANGED', 'WHATSAPP_OPENED', 'WHATSAPP_SENT', 'ACTION_CREATED', 'ACTION_COMPLETED', 'ACTION_RESCHEDULED', 'ACTION_SKIPPED', 'ACTION_CANCELLED', 'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED', 'BOOKING_NO_SHOW', 'BOOKING_COMPLETED', 'PAYMENT_MARKED', 'AFTERCARE_CREATED', 'AFTERCARE_COMPLETED', 'ASSESSMENT_STATUS_CHANGED', 'CLASS_SIGNAL')`
    ),
  ]
);

export type ActivityRow = typeof activities.$inferSelect;
export type NewActivityRow = typeof activities.$inferInsert;
