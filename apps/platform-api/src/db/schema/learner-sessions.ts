import { pgTable, uuid, timestamp, text, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { contacts } from './contacts';

export const learnerSessions = pgTable(
  'learner_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => ({
    orgContactIdx: index('idx_learner_sessions_org_contact').on(
      table.organizationId,
      table.contactId
    ),
    tokenHashIdx: index('idx_learner_sessions_token_hash').on(table.tokenHash),
  })
);

export type LearnerSessionRow = typeof learnerSessions.$inferSelect;
export type NewLearnerSessionRow = typeof learnerSessions.$inferInsert;
