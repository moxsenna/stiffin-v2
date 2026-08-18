import { pgTable, uuid, timestamp, text, jsonb, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { enrollments } from './enrollments';
import { contacts } from './contacts';

export const learningSignals = pgTable(
  'learning_signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    status: text('status').default('ACTIVE').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgStatusIdx: index('idx_learning_signals_org_status').on(
      table.organizationId,
      table.status
    ),
    statusCheck: check(
      'learning_signals_status_check',
      sql`${table.status} IN ('ACTIVE', 'RESOLVED', 'DISMISSED')`
    ),
  })
);

export type LearningSignalRow = typeof learningSignals.$inferSelect;
export type NewLearningSignalRow = typeof learningSignals.$inferInsert;
