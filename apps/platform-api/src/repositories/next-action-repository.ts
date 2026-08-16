import { eq, and, isNull, lte, gt, asc, desc, count } from 'drizzle-orm';
import { nextActions, contacts, bookings, NextActionRow, NewNextActionRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';
import { isUniqueViolation } from '../db/pg-errors';
import type { DbHandle } from '../db/client';

export type CreateNextActionInput = Omit<NewNextActionRow, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;

export interface NextActionRepository {
  create(ctx: OrganizationContext, input: CreateNextActionInput): Promise<NextActionRow>;
  findById(ctx: OrganizationContext, id: string): Promise<NextActionRow | null>;
  listByContact(ctx: OrganizationContext, contactId: string, status?: string): Promise<NextActionRow[]>;
  listPendingDueBy(ctx: OrganizationContext, upTo: string): Promise<NextActionRow[]>;
  listPendingUpcoming(ctx: OrganizationContext, from: string, limit: number): Promise<NextActionRow[]>;
  countPending(ctx: OrganizationContext): Promise<number>;
  findByIdempotency(ctx: OrganizationContext, source: string, idempotencyKey: string): Promise<NextActionRow | null>;
  findActiveByBookingType(
    ctx: OrganizationContext,
    bookingId: string,
    actionType: string
  ): Promise<NextActionRow[]>;
  complete(ctx: OrganizationContext, id: string, completedAt: string): Promise<NextActionRow | null>;
  resolve(ctx: OrganizationContext, id: string, status: 'SKIPPED' | 'CANCELLED'): Promise<NextActionRow | null>;
  reschedule(ctx: OrganizationContext, id: string, dueAt: string): Promise<NextActionRow | null>;
}

export function createNextActionRepository(db: DbHandle): NextActionRepository {
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
        throw new DomainError('NOT_FOUND', 'Active tenant contact is required to create a next action');
      }

      // Tenant booking parent verification if bookingId is supplied
      if (input.bookingId) {
        const [booking] = await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.id, input.bookingId),
              eq(bookings.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        if (!booking) {
          throw new DomainError('NOT_FOUND', 'Tenant booking is required when bookingId is supplied');
        }
      }

      const now = new Date().toISOString();
      try {
        const rows = await db
          .insert(nextActions)
          .values({
            ...input,
            organizationId: ctx.organizationId,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        return rows[0];
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new DomainError(
            'CONFLICT',
            'Next action with this idempotency key already exists for this source'
          );
        }
        throw err;
      }
    },

    async findById(ctx, id) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .select()
        .from(nextActions)
        .where(
          and(
            eq(nextActions.organizationId, ctx.organizationId),
            eq(nextActions.id, id)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async listByContact(ctx, contactId, status) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const conditions = [
        eq(nextActions.organizationId, ctx.organizationId),
        eq(nextActions.contactId, contactId),
      ];
      if (status) {
        conditions.push(eq(nextActions.status, status));
      }
      return db
        .select()
        .from(nextActions)
        .where(and(...conditions))
        .orderBy(asc(nextActions.dueAt));
    },

    async listPendingDueBy(ctx, upTo) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      return db
        .select()
        .from(nextActions)
        .where(
          and(
            eq(nextActions.organizationId, ctx.organizationId),
            eq(nextActions.status, 'PENDING'),
            lte(nextActions.dueAt, upTo)
          )
        )
        .orderBy(asc(nextActions.dueAt), desc(nextActions.priority));
    },

    async listPendingUpcoming(ctx, from, limit) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      return db
        .select()
        .from(nextActions)
        .where(
          and(
            eq(nextActions.organizationId, ctx.organizationId),
            eq(nextActions.status, 'PENDING'),
            gt(nextActions.dueAt, from)
          )
        )
        .orderBy(asc(nextActions.dueAt), desc(nextActions.priority))
        .limit(limit);
    },

    async countPending(ctx) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const res = await db
        .select({ c: count() })
        .from(nextActions)
        .where(
          and(
            eq(nextActions.organizationId, ctx.organizationId),
            eq(nextActions.status, 'PENDING')
          )
        );
      return Number(res[0]?.c ?? 0);
    },

    async findByIdempotency(ctx, source, idempotencyKey) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .select()
        .from(nextActions)
        .where(
          and(
            eq(nextActions.organizationId, ctx.organizationId),
            eq(nextActions.source, source),
            eq(nextActions.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async findActiveByBookingType(ctx, bookingId, actionType) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      return db
        .select()
        .from(nextActions)
        .where(
          and(
            eq(nextActions.organizationId, ctx.organizationId),
            eq(nextActions.bookingId, bookingId),
            eq(nextActions.actionType, actionType),
            eq(nextActions.status, 'PENDING')
          )
        )
        .orderBy(asc(nextActions.dueAt));
    },

    async complete(ctx, id, completedAt) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .update(nextActions)
        .set({
          status: 'COMPLETED',
          completedAt,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(nextActions.organizationId, ctx.organizationId),
            eq(nextActions.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    },

    async resolve(ctx, id, status) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .update(nextActions)
        .set({
          status,
          completedAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(nextActions.organizationId, ctx.organizationId),
            eq(nextActions.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    },

    async reschedule(ctx, id, dueAt) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .update(nextActions)
        .set({
          dueAt,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(nextActions.organizationId, ctx.organizationId),
            eq(nextActions.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    },
  };
}
