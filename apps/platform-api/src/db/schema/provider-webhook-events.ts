import { pgTable, uuid, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const providerWebhookEvents = pgTable(
  'provider_webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(), // e.g. 'PAYCORE'
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processingResult: text('processing_result').default('PROCESSING').notNull(), // 'PROCESSING' | 'SUCCESS' | 'DUPLICATE' | 'FAILED' | 'RECONCILIATION_FAILED'
    details: text('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    providerEventUnique: uniqueIndex('provider_webhook_events_provider_event_unique').on(
      table.provider,
      table.providerEventId
    ),
    resultIdx: index('provider_webhook_events_result_idx').on(table.processingResult),
  })
);

export type ProviderWebhookEventRow = typeof providerWebhookEvents.$inferSelect;
export type InsertProviderWebhookEvent = typeof providerWebhookEvents.$inferInsert;
