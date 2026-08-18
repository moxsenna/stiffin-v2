import { pgTable, uuid, timestamp, text, integer, jsonb, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { programs } from './programs';
import { enrollments } from './enrollments';
import { contacts } from './contacts';
import { learningEvents } from './learning-events';

export const learningSignals = pgTable(
  'learning_signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    programId: uuid('program_id').references(() => programs.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id, { onDelete: 'cascade' }),
    sourceEventId: uuid('source_event_id').references(() => learningEvents.id, { onDelete: 'set null' }),
    type: text('type').default('HIGH_LEARNING_INTENT').notNull(),
    priority: integer('priority').default(50).notNull(),
    reason: text('reason').notNull(),
    recommendedActionType: text('recommended_action_type'),
    recommendedActionReason: text('recommended_action_reason'),
    status: text('status').default('ACTIVE').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgStatusIdx: index('idx_learning_signals_org_status').on(
      table.organizationId,
      table.status
    ),
    orgContactIdx: index('idx_learning_signals_org_contact').on(
      table.organizationId,
      table.contactId
    ),
    statusCheck: check(
      'learning_signals_status_check',
      sql`${table.status} IN ('ACTIVE', 'RESOLVED', 'DISMISSED')`
    ),
  })
);

export type LearningSignalRow = typeof learningSignals.$inferSelect;
export type NewLearningSignalRow = typeof learningSignals.$inferInsert;
