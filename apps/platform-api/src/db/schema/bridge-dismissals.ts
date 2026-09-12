import { pgTable, uuid, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const bridgeDismissals = pgTable(
  'bridge_dismissals',
  {
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    surface: text('surface').notNull(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.surface] })]
);

export type BridgeDismissalRow = typeof bridgeDismissals.$inferSelect;
