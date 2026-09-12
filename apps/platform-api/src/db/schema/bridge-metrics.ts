import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const bridgeMetrics = pgTable(
  'bridge_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    meta: jsonb('meta').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_bridge_metrics_org_event').on(t.organizationId, t.event, t.createdAt)]
);

export type BridgeMetricRow = typeof bridgeMetrics.$inferSelect;
