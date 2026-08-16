import { eq, and, isNull, sql } from 'drizzle-orm';
import { contactAssessments, contacts, bookings, ContactAssessmentRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';
import type { DbHandle } from '../db/client';

const STATUS_PRECEDENCE: Record<string, number> = {
  COMPLETED: 4,
  SCHEDULED: 3,
  CANCELLED: 2,
  NOT_STARTED: 1,
  UNKNOWN: 0,
};

function getStatusRank(status: string): number {
  return STATUS_PRECEDENCE[status] ?? 0;
}

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

export function createAssessmentRepository(db: DbHandle): AssessmentRepository {
  return {
    async getOrCreate(ctx, contactId) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
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
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
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
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      // Verify active contact belongs to tenant (fail-closed)
      const [activeContact] = await db
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

      if (!activeContact) {
        return null;
      }

      // If sourceBookingId is supplied, verify it belongs to current tenant AND same contact (fail-closed)
      if (sourceBookingId) {
        const [sourceBooking] = await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.id, sourceBookingId),
              eq(bookings.organizationId, ctx.organizationId),
              eq(bookings.contactId, contactId)
            )
          )
          .limit(1);

        if (!sourceBooking) {
          throw new DomainError(
            'NOT_FOUND',
            'Source booking not found or does not belong to active tenant contact'
          );
        }
      }

      // Check existing assessment row for precedence guard
      const existingRows = await db
        .select()
        .from(contactAssessments)
        .where(
          and(
            eq(contactAssessments.organizationId, ctx.organizationId),
            eq(contactAssessments.contactId, contactId)
          )
        )
        .limit(1);

      const existing = existingRows[0];
      if (!existing) {
        return null;
      }

      // Canonical precedence guard: COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED
      const currentRank = getStatusRank(existing.status);
      const incomingRank = getStatusRank(status);

      if (currentRank > incomingRank) {
        // Lower evidence cannot overwrite higher evidence — ignore downgrade and return existing state
        return existing;
      }

      const now = new Date().toISOString();
      const patch: {
        status: string;
        updatedAt: string;
        sourceBookingId?: string | null;
        assessedAt?: string | null;
        notes?: string | null;
      } = {
        status,
        updatedAt: now,
      };

      if (sourceBookingId !== undefined) {
        patch.sourceBookingId = sourceBookingId;
      }
      if (assessedAt !== undefined) {
        patch.assessedAt = assessedAt;
      } else if (status === 'COMPLETED') {
        patch.assessedAt = existing.assessedAt ?? now;
      }
      if (notes !== undefined) {
        patch.notes = notes;
      }

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
