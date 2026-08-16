import { eq, and, isNull, desc, lte } from 'drizzle-orm';
import { activities, contacts, bookings, ActivityRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
import type { DbHandle } from '../db/client';

export interface AppendActivityInput {
  contactId: string;
  bookingId?: string | null;
  eventType: string;
  metadataJson?: Record<string, unknown>;
  occurredAt?: string;
}

export interface ListActivitiesOrgOptions {
  limit?: number;
  before?: string;
}

export interface ActivityRepository {
  append(
    ctx: OrganizationContext,
    actor: AuthenticatedActor | null | undefined,
    input: AppendActivityInput
  ): Promise<ActivityRow>;
  listByContact(ctx: OrganizationContext, contactId: string, limit?: number): Promise<ActivityRow[]>;
  listByOrg(ctx: OrganizationContext, opts?: ListActivitiesOrgOptions): Promise<ActivityRow[]>;
}

export function createActivityRepository(db: DbHandle): ActivityRepository {
  return {
    async append(ctx, actor, input) {
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
        throw new DomainError('NOT_FOUND', 'Active tenant contact is required to append an activity');
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
          throw new DomainError('NOT_FOUND', 'Tenant booking is required when bookingId is supplied to activity');
        }
      }

      // Trusted actor: actor_user_id comes ONLY from server-resolved AuthenticatedActor
      const actorUserId = actor?.userId ?? null;

      const rows = await db
        .insert(activities)
        .values({
          organizationId: ctx.organizationId,
          contactId: input.contactId,
          bookingId: input.bookingId ?? null,
          eventType: input.eventType,
          actorUserId,
          metadataJson: input.metadataJson ?? {},
          occurredAt: input.occurredAt ?? new Date().toISOString(),
        })
        .returning();

      return rows[0];
    },

    async listByContact(ctx, contactId, limit = 100) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      return db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.organizationId, ctx.organizationId),
            eq(activities.contactId, contactId)
          )
        )
        .orderBy(desc(activities.occurredAt))
        .limit(limit);
    },

    async listByOrg(ctx, opts = {}) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const conditions = [eq(activities.organizationId, ctx.organizationId)];
      if (opts.before) {
        conditions.push(lte(activities.occurredAt, opts.before));
      }
      return db
        .select()
        .from(activities)
        .where(and(...conditions))
        .orderBy(desc(activities.occurredAt))
        .limit(opts.limit ?? 100);
    },
  };
}
