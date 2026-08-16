import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { contactAssessments, contacts, bookings, ContactAssessmentRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';
import type { DbHandle } from '../db/client';

/**
 * Precedence hierarchy (highest evidence always wins):
 * COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED
 *
 * For atomic SQL updates, map each incoming status to the subset of current statuses
 * that it is allowed to overwrite.
 */
const ALLOWED_CURRENT_STATUSES: Record<string, string[]> = {
  COMPLETED: ['NOT_STARTED', 'CANCELLED', 'SCHEDULED', 'COMPLETED'],
  SCHEDULED: ['NOT_STARTED', 'CANCELLED', 'SCHEDULED'],
  CANCELLED: ['NOT_STARTED', 'CANCELLED'],
  NOT_STARTED: ['NOT_STARTED'],
};

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
        patch.assessedAt = now;
      }
      if (notes !== undefined) {
        patch.notes = notes;
      }

      // Atomic conditional update: guards update at SQL-level by allowed current status set
      const allowedCurrent = ALLOWED_CURRENT_STATUSES[status] ?? [status];
      const updatedRows = await db
        .update(contactAssessments)
        .set(patch)
        .where(
          and(
            eq(contactAssessments.organizationId, ctx.organizationId),
            eq(contactAssessments.contactId, contactId),
            inArray(contactAssessments.status, allowedCurrent)
          )
        )
        .returning();

      if (updatedRows.length > 0) {
        return updatedRows[0];
      }

      // If 0 rows updated because higher evidence already exists, re-read and return current canonical row
      const existing = await db
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

      return existing[0]?.assessment ?? null;
    },
  };
}
