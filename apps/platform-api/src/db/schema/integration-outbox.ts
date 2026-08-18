import { pgTable, uuid, timestamp, text, integer, jsonb, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const integrationOutbox = pgTable(
  'integration_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    destination: text('destination').notNull(),
    operation: text('operation').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    payloadJson: jsonb('payload_json').notNull(),
    status: text('status').default('PENDING').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
    lastErrorCode: text('last_error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => ({
    destIdempotencyUnique: uniqueIndex('integration_outbox_dest_idempotency_unique').on(
      table.destination,
      table.idempotencyKey
    ),
    orgStatusNextIdx: index('idx_integration_outbox_org_status_next').on(
      table.organizationId,
      table.status,
      table.nextAttemptAt
    ),
    statusCheck: check(
      'integration_outbox_status_check',
      sql`${table.status} IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')`
    ),
  })
);

export type IntegrationOutboxRow = typeof integrationOutbox.$inferSelect;
export type NewIntegrationOutboxRow = typeof integrationOutbox.$inferInsert;
