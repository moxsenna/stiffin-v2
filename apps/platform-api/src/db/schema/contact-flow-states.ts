import { pgTable, uuid, text, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { contacts } from './contacts';

export const contactFlowStates = pgTable(
  'contact_flow_states',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    stage: text('stage').notNull().default('NEW'),
    classification: text('classification').notNull().default('PROSPECT'),
    interest: text('interest'),
    lostReason: text('lost_reason'),
    sourceChannel: text('source_channel'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('contact_flow_states_contact_unique').on(t.contactId),
    index('contact_flow_states_org_stage_idx').on(t.organizationId, t.stage),
    check(
      'contact_flow_states_stage_check',
      sql`${t.stage} IN ('NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'BOOKED', 'COMPLETED', 'LOST')`
    ),
    check('contact_flow_states_classification_check', sql`${t.classification} IN ('PROSPECT', 'CLIENT')`),
    check(
      'contact_flow_states_lost_reason_invariant',
      sql`(${t.stage} = 'LOST' AND ${t.lostReason} IS NOT NULL) OR (${t.stage} <> 'LOST' AND ${t.lostReason} IS NULL)`
    ),
  ]
);

export type ContactFlowStateRow = typeof contactFlowStates.$inferSelect;
export type NewContactFlowStateRow = typeof contactFlowStates.$inferInsert;
