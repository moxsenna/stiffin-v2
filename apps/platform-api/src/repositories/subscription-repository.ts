import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, count, countDistinct, inArray } from 'drizzle-orm';
import { organizationSubscriptions, OrganizationSubscriptionRow } from '../db/schema/organization-subscriptions';
import { programs } from '../db/schema/programs';
import { enrollments } from '../db/schema/enrollments';
import { contacts } from '../db/schema/contacts';

export interface PlanUsageCounts {
  publishedPrograms: number;
  activeLearners: number;
  contacts: number;
}

export interface SubscriptionRepository {
  getSubscription(organizationId: string): Promise<OrganizationSubscriptionRow>;
  updateSubscription(
    organizationId: string,
    data: Partial<Omit<OrganizationSubscriptionRow, 'id' | 'organizationId' | 'createdAt'>>
  ): Promise<OrganizationSubscriptionRow>;
  countUsage(organizationId: string): Promise<PlanUsageCounts>;
}

export function createSubscriptionRepository(db: NodePgDatabase): SubscriptionRepository {
  return {
    async getSubscription(organizationId: string): Promise<OrganizationSubscriptionRow> {
      const [existing] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.organizationId, organizationId))
        .limit(1);

      if (existing) {
        return existing;
      }

      // Default to FREE subscription row if not yet seeded
      const [created] = await db
        .insert(organizationSubscriptions)
        .values({
          organizationId,
          planCode: 'FREE',
          status: 'ACTIVE',
          billingCycle: 'NONE',
          provider: 'NONE',
        })
        .onConflictDoNothing({ target: organizationSubscriptions.organizationId })
        .returning();

      if (created) {
        return created;
      }

      const [reRead] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.organizationId, organizationId))
        .limit(1);
      return reRead;
    },

    async updateSubscription(
      organizationId: string,
      data: Partial<Omit<OrganizationSubscriptionRow, 'id' | 'organizationId' | 'createdAt'>>
    ): Promise<OrganizationSubscriptionRow> {
      // Ensure subscription row exists
      await this.getSubscription(organizationId);

      const [updated] = await db
        .update(organizationSubscriptions)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(organizationSubscriptions.organizationId, organizationId))
        .returning();

      return updated;
    },

    async countUsage(organizationId: string): Promise<PlanUsageCounts> {
      const [progResult] = await db
        .select({ value: count() })
        .from(programs)
        .where(and(eq(programs.organizationId, organizationId), eq(programs.status, 'published')));

      const [learnerResult] = await db
        .select({ value: countDistinct(enrollments.contactId) })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.organizationId, organizationId),
            inArray(enrollments.status, ['ENROLLED', 'STARTED'])
          )
        );

      const [contactResult] = await db
        .select({ value: count() })
        .from(contacts)
        .where(eq(contacts.organizationId, organizationId));

      return {
        publishedPrograms: Number(progResult?.value ?? 0),
        activeLearners: Number(learnerResult?.value ?? 0),
        contacts: Number(contactResult?.value ?? 0),
      };
    },
  };
}
