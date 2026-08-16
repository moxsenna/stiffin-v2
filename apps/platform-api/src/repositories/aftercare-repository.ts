import { eq, and, isNull, asc } from 'drizzle-orm';
import { aftercareRecords, bookings, contacts, AftercareRecordRow, NewAftercareRecordRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';
import { isUniqueConstraintViolation } from '../db/pg-errors';
import type { DbHandle } from '../db/client';

export type CreateAftercareInput = Omit<NewAftercareRecordRow, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;

export interface CompleteAftercarePatch {
  outcome: string;
  outcomeNotes?: string | null;
  recordedAt: string;
}

export interface ListAftercareOrgOptions {
  status?: string;
  limit?: number;
}

export interface AftercareRepository {
  create(ctx: OrganizationContext, input: CreateAftercareInput): Promise<AftercareRecordRow>;
  findByBooking(ctx: OrganizationContext, bookingId: string): Promise<AftercareRecordRow | null>;
  findById(ctx: OrganizationContext, id: string): Promise<AftercareRecordRow | null>;
  listByOrg(ctx: OrganizationContext, opts?: ListAftercareOrgOptions): Promise<AftercareRecordRow[]>;
  completeRecord(
    ctx: OrganizationContext,
    bookingId: string,
    patch: CompleteAftercarePatch
  ): Promise<AftercareRecordRow | null>;
}

export function createAftercareRepository(db: DbHandle): AftercareRepository {
  return {
    async create(ctx, input) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      // Tenant contact parent verification (fail-closed)
      const [contact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.id, input.contactId),
            eq(contacts.organizationId, ctx.organizationId),
            isNull(contacts.deletedAt)
          )
        )
        .limit(1);

      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Active tenant contact is required to create an aftercare record');
      }

      // Tenant booking parent verification: booking must belong to same tenant AND same contact (fail-closed)
      const [booking] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.organizationId, ctx.organizationId),
            eq(bookings.contactId, input.contactId)
          )
        )
        .limit(1);

      if (!booking) {
        throw new DomainError('NOT_FOUND', 'Tenant booking not found or does not belong to active tenant contact');
      }

      const now = new Date().toISOString();
      try {
        const rows = await db
          .insert(aftercareRecords)
          .values({
            ...input,
            organizationId: ctx.organizationId,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        return rows[0];
      } catch (err) {
        if (isUniqueConstraintViolation(err, 'aftercare_records_org_booking_unique')) {
          throw new DomainError(
            'CONFLICT',
            'Aftercare record already exists for this booking'
          );
        }
        throw err;
      }
    },

    async findByBooking(ctx, bookingId) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .select()
        .from(aftercareRecords)
        .where(
          and(
            eq(aftercareRecords.organizationId, ctx.organizationId),
            eq(aftercareRecords.bookingId, bookingId)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async findById(ctx, id) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .select()
        .from(aftercareRecords)
        .where(
          and(
            eq(aftercareRecords.organizationId, ctx.organizationId),
            eq(aftercareRecords.id, id)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async listByOrg(ctx, opts = {}) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const conditions = [eq(aftercareRecords.organizationId, ctx.organizationId)];
      if (opts.status) {
        conditions.push(eq(aftercareRecords.status, opts.status));
      }
      return db
        .select()
        .from(aftercareRecords)
        .where(and(...conditions))
        .orderBy(asc(aftercareRecords.scheduledFor))
        .limit(opts.limit ?? 100);
    },

    async completeRecord(ctx, bookingId, patch) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .update(aftercareRecords)
        .set({
          status: 'COMPLETED',
          outcome: patch.outcome,
          outcomeNotes: patch.outcomeNotes ?? null,
          recordedAt: patch.recordedAt,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(aftercareRecords.organizationId, ctx.organizationId),
            eq(aftercareRecords.bookingId, bookingId)
          )
        )
        .returning();
      return rows[0] ?? null;
    },
  };
}
