import { pgTable, uuid, text, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';

export const ORGANIZATION_ROLES = ['owner', 'admin', 'member'] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('organization_members_org_user_unique').on(t.organizationId, t.userId),
    index('organization_members_user_idx').on(t.userId),
    check('organization_members_role_check', sql`${t.role} IN ('owner','admin','member')`),
  ]
);

export type OrganizationMemberRow = typeof organizationMembers.$inferSelect;
export type NewOrganizationMemberRow = typeof organizationMembers.$inferInsert;
