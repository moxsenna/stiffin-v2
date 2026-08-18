import { pgTable, uuid, integer, text, boolean, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgDayIdx: index('idx_availability_rules_org_day')
      .on(table.organizationId, table.dayOfWeek)
      .where(sql`${table.isActive} = true`),
    dayOfWeekCheck: check(
      'availability_rules_day_of_week_check',
      sql`${table.dayOfWeek} >= 0 AND ${table.dayOfWeek} <= 6`
    ),
    startTimeCheck: check(
      'availability_rules_start_time_check',
      sql`${table.startTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`
    ),
    endTimeCheck: check(
      'availability_rules_end_time_check',
      sql`${table.endTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`
    ),
    timeOrderCheck: check(
      'availability_rules_time_order_check',
      sql`${table.startTime} < ${table.endTime}`
    ),
  })
);

export type AvailabilityRuleRow = typeof availabilityRules.$inferSelect;
export type NewAvailabilityRuleRow = typeof availabilityRules.$inferInsert;
