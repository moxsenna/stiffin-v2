import { pgTable, uuid, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { contacts } from './contacts';

export const learnerAccessTokens = pgTable(
  'learner_access_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('learner_access_tokens_token_hash_unique').on(t.tokenHash),
    index('idx_learner_access_tokens_lookup').on(t.tokenHash, t.expiresAt),
    index('idx_learner_access_tokens_org_contact').on(t.organizationId, t.contactId),
  ]
);

export type LearnerAccessTokenRow = typeof learnerAccessTokens.$inferSelect;
export type NewLearnerAccessTokenRow = typeof learnerAccessTokens.$inferInsert;
