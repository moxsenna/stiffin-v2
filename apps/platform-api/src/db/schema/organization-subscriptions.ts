import { pgTable, uuid, text, boolean, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const organizationSubscriptions = pgTable(
  'organization_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    planCode: text('plan_code').notNull().default('FREE'),
    status: text('status').notNull().default('ACTIVE'),
    billingCycle: text('billing_cycle').notNull().default('NONE'),
    provider: text('provider').notNull().default('NONE'),
    providerCustomerId: text('provider_customer_id'),
    providerSubscriptionId: text('provider_subscription_id'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true, mode: 'string' }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true, mode: 'string' }),
    graceEndsAt: timestamp('grace_ends_at', { withTimezone: true, mode: 'string' }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('org_subscriptions_org_unique').on(t.organizationId),
    index('org_subscriptions_plan_idx').on(t.planCode),
    index('org_subscriptions_status_idx').on(t.status),
    check('org_subscriptions_plan_check', sql`${t.planCode} IN ('FREE', 'SOLO', 'STUDIO')`),
    check('org_subscriptions_status_check', sql`${t.status} IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'CANCELED')`),
    check('org_subscriptions_cycle_check', sql`${t.billingCycle} IN ('MONTHLY', 'YEARLY', 'NONE')`),
    check('org_subscriptions_provider_check', sql`${t.provider} IN ('NONE', 'PAYCORE')`),
  ]
);

export type OrganizationSubscriptionRow = typeof organizationSubscriptions.$inferSelect;
export type NewOrganizationSubscriptionRow = typeof organizationSubscriptions.$inferInsert;
