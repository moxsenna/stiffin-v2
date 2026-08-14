import { pgTable, uuid, text, integer, bigint, uniqueIndex } from 'drizzle-orm/pg-core';

export const authRateLimits = pgTable(
  'auth_rate_limits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').notNull(),
    count: integer('count').notNull(),
    lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
  },
  (t) => [uniqueIndex('auth_rate_limits_key_unique').on(t.key)]
);

export type AuthRateLimitRow = typeof authRateLimits.$inferSelect;
export type NewAuthRateLimitRow = typeof authRateLimits.$inferInsert;
