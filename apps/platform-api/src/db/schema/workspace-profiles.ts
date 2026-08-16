import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { programs } from './programs';

export const workspaceProfiles = pgTable(
  'workspace_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    displayName: text('display_name').notNull(),
    tagline: text('tagline'),
    headline: text('headline'),
    bio: text('bio'),
    city: text('city'),
    roleLabel: text('role_label'),
    whatsappPhoneE164: text('whatsapp_phone_e164'),
    avatarUrl: text('avatar_url'),
    logoUrl: text('logo_url'),
    heroProgramId: uuid('hero_program_id').references(() => programs.id, { onDelete: 'set null' }),
    stats: jsonb('stats')
      .notNull()
      .default('{}')
      .$type<{ familiesHelped?: string; location?: string }>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('workspace_profiles_organization_id_unique').on(t.organizationId),
    check('workspace_profiles_display_name_not_empty', sql`char_length(${t.displayName}) > 0`),
    check(
      'workspace_profiles_phone_format',
      sql`${t.whatsappPhoneE164} IS NULL OR ${t.whatsappPhoneE164} ~ '^\\+[1-9][0-9]{1,14}$'`
    ),
  ]
);

export type WorkspaceProfileRow = typeof workspaceProfiles.$inferSelect;
export type NewWorkspaceProfileRow = typeof workspaceProfiles.$inferInsert;
