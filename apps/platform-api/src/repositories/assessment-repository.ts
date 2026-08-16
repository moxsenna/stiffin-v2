import { eq, and, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { contactAssessments, contacts, ContactAssessmentRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';

export interface AssessmentRepository {
  getOrCreate(ctx: OrganizationContext, contactId: string): Promise<ContactAssessmentRow | null>;
  findById(ctx: OrganizationContext, contactId: string): Promise<ContactAssessmentRow | null>;
  updateStatus(
    ctx: OrganizationContext,
    contactId: string,
    status: string,
    sourceBookingId?: string | null,
    assessedAt?: string | null,
    notes?: string | null
  ): Promise<ContactAssessmentRow | null>;
}

export function createAssessmentRepository(db: NodePgDatabase<any> | any): AssessmentRepository {
  return {
    async getOrCreate(ctx, contactId) {
      if (!isOrganizationContext(ctx)) {
        throw new Error('Tenant context is required');
      }

      // Atomic conditional insert: only inserts if contact belongs to current tenant and is active (deleted_at IS NULL)
      await db.execute(sql`
        INSERT INTO contact_assessments (id, organization_id, contact_id, status, created_at, updated_at)
        SELECT gen_random_uuid(), c.organization_id, c.id, 'NOT_STARTED', now(), now()
        FROM contacts c
        WHERE c.id = ${contactId} AND c.organization_id = ${ctx.organizationId} AND c.deleted_at IS NULL
        ON CONFLICT (contact_id) DO NOTHING;
      `);

      // Read back the row ensuring active tenant contact join
      const rows = await db
        .select({ assessment: contactAssessments })
        .from(contactAssessments)
        .innerJoin(contacts, eq(contactAssessments.contactId, contacts.id))
        .where(
          and(
            eq(contactAssessments.organizationId, ctx.organizationId),
            eq(contactAssessments.contactId, contactId),
            eq(contacts.organizationId, ctx.organizationId),
            isNull(contacts.deletedAt)
          )
        )
        .limit(1);

      return rows[0]?.assessment ?? null;
    },

    async findById(ctx, contactId) {
      if (!isOrganizationContext(ctx)) {
        throw new Error('Tenant context is required');
      }

      const rows = await db
        .select({ assessment: contactAssessments })
        .from(contactAssessments)
        .innerJoin(contacts, eq(contactAssessments.contactId, contacts.id))
        .where(
          and(
            eq(contactAssessments.organizationId, ctx.organizationId),
            eq(contactAssessments.contactId, contactId),
            eq(contacts.organizationId, ctx.organizationId),
            isNull(contacts.deletedAt)
          )
        )
        .limit(1);

      return rows[0]?.assessment ?? null;
    },

    async updateStatus(ctx, contactId, status, sourceBookingId, assessedAt, notes) {
      if (!isOrganizationContext(ctx)) {
        throw new Error('Tenant context is required');
      }

      // Verify active contact belongs to tenant
      const activeContact = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.id, contactId),
            eq(contacts.organizationId, ctx.organizationId),
            isNull(contacts.deletedAt)
          )
        )
        .limit(1);

      if (!activeContact[0]) {
        return null;
      }

      const patch: Record<string, unknown> = {
        status,
        updatedAt: new Date().toISOString(),
      };
      if (sourceBookingId !== undefined) patch.sourceBookingId = sourceBookingId;
      if (assessedAt !== undefined) {
        patch.assessedAt = assessedAt;
      } else if (status === 'COMPLETED') {
        patch.assessedAt = new Date().toISOString();
      }
      if (notes !== undefined) patch.notes = notes;

      const rows = await db
        .update(contactAssessments)
        .set(patch)
        .where(
          and(
            eq(contactAssessments.organizationId, ctx.organizationId),
            eq(contactAssessments.contactId, contactId)
          )
        )
        .returning();

      return rows[0] ?? null;
    },
  };
}
