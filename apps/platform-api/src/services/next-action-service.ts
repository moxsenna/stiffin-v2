import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
import { DEFAULT_ORGANIZATION_TIMEZONE, normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { createNextActionRepository } from '../repositories/next-action-repository';
import { createActivityRepository } from '../repositories/activity-repository';
import { createContactRepository } from '../repositories/contact-repository';
import { createBookingRepository } from '../repositories/booking-repository';
import { createServiceRepository } from '../repositories/service-repository';
import {
  getNextLocalDay10Am,
  getLocalCalendarDate,
  getInstantForZonedDateTime,
  calculateSkipNextStepRule,
} from '../domain/next-action-rules';
import {
  calculateEffectivePriority,
  comparePrimaryCandidate,
  selectPrimaryAction,
} from '../domain/priority';
import { groupTodayActions } from '../domain/today-grouping';

export interface CreateFollowUpInput {
  contactId: string;
  dueAt?: string | Date;
  title?: string;
  description?: string | null;
  priority?: number;
}

export interface CreateManualActionInput {
  contactId: string;
  title: string;
  dueAt?: string | Date;
  description?: string | null;
  priority?: number;
}

export interface SkipNextStepInput {
  type: string;
  dueAt?: string | Date;
  title?: string;
  description?: string | null;
}

export interface NextActionServiceDependencies {
  activities?: typeof createActivityRepository;
  contacts?: typeof createContactRepository;
  bookings?: typeof createBookingRepository;
  services?: typeof createServiceRepository;
  clock?: () => Date;
  orgTz?: string;
}

export function createNextActionService(
  db: DbHandle,
  dependencies: NextActionServiceDependencies = {}
) {
  const getNow = dependencies.clock ?? (() => new Date());
  const orgTz = dependencies.orgTz ?? DEFAULT_ORGANIZATION_TIMEZONE;

  return {
    /**
     * Creates a manual or generic FOLLOW_UP next action.
     */
    async createFollowUp(
      ctx: OrganizationContext,
      input: CreateFollowUpInput,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const now = getNow();
        const dueAtIso = input.dueAt
          ? (typeof input.dueAt === 'string' ? input.dueAt : input.dueAt.toISOString())
          : getNextLocalDay10Am(now, orgTz).toISOString();

        const action = await actionRepo.create(ctx, {
          contactId: input.contactId,
          actionType: 'FOLLOW_UP',
          title: input.title ?? 'Follow-up prospek',
          description: input.description ?? null,
          dueAt: dueAtIso,
          priority: input.priority ?? 70,
          status: 'PENDING',
          source: 'PROMOTORFLOW',
          contextJson: {},
        });

        await activityRepo.append(ctx, actor, {
          contactId: input.contactId,
          eventType: 'ACTION_CREATED',
          metadataJson: {
            actionId: action.id,
            actionType: 'FOLLOW_UP',
            dueAt: action.dueAt,
            priority: action.priority,
            source: 'PROMOTORFLOW',
          },
        });

        return action;
      });
    },

    /**
     * Creates a custom MANUAL next action.
     */
    async createManualAction(
      ctx: OrganizationContext,
      input: CreateManualActionInput,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const now = getNow();
        const dueAtIso = input.dueAt
          ? (typeof input.dueAt === 'string' ? input.dueAt : input.dueAt.toISOString())
          : getNextLocalDay10Am(now, orgTz).toISOString();

        const action = await actionRepo.create(ctx, {
          contactId: input.contactId,
          actionType: 'MANUAL',
          title: input.title,
          description: input.description ?? null,
          dueAt: dueAtIso,
          priority: input.priority ?? 40,
          status: 'PENDING',
          source: 'MANUAL',
          contextJson: {},
        });

        await activityRepo.append(ctx, actor, {
          contactId: input.contactId,
          eventType: 'ACTION_CREATED',
          metadataJson: {
            actionId: action.id,
            actionType: 'MANUAL',
            dueAt: action.dueAt,
            priority: action.priority,
            source: 'MANUAL',
          },
        });

        return action;
      });
    },

    /**
     * Completes a next action.
     * Respects wa.me rule: emits WHATSAPP_SENT when confirmedWhatsAppSent is true.
     */
    async completeAction(
      ctx: OrganizationContext,
      actionId: string,
      opts: { confirmedWhatsAppSent?: boolean } = {},
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const action = await actionRepo.findById(ctx, actionId);
        if (!action) {
          throw new DomainError('NOT_FOUND', 'Next action not found');
        }

        if (action.status === 'COMPLETED') {
          return action; // Idempotent no-op
        }

        if (action.status !== 'PENDING') {
          throw new DomainError('VALIDATION_ERROR', 'Action is not pending');
        }

        const now = getNow();
        const updated = await actionRepo.complete(ctx, actionId, now.toISOString());

        // Emit WHATSAPP_SENT if confirmed by user
        if (opts.confirmedWhatsAppSent === true) {
          await activityRepo.append(ctx, actor, {
            contactId: action.contactId,
            bookingId: action.bookingId,
            eventType: 'WHATSAPP_SENT',
            metadataJson: {
              actionId: action.id,
            },
          });
        }

        // Append ACTION_COMPLETED activity
        await activityRepo.append(ctx, actor, {
          contactId: action.contactId,
          bookingId: action.bookingId,
          eventType: 'ACTION_COMPLETED',
          metadataJson: {
            actionId: action.id,
            actionType: action.actionType,
            completedBy: 'MANUAL',
          },
        });

        return updated ?? action;
      });
    },

    /**
     * Skips an action. Next step is REQUIRED.
     * Atomically marks current action SKIPPED and creates the replacement pending action.
     */
    async skipAction(
      ctx: OrganizationContext,
      actionId: string,
      nextStep: SkipNextStepInput,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const action = await actionRepo.findById(ctx, actionId);
        if (!action) {
          throw new DomainError('NOT_FOUND', 'Next action not found');
        }

        if (action.status !== 'PENDING') {
          throw new DomainError('VALIDATION_ERROR', 'Action is not pending');
        }

        const now = getNow();
        const skipRule = calculateSkipNextStepRule({ nextStep: nextStep as any }, now, orgTz);

        if (!skipRule.ok) {
          throw new DomainError(
            'VALIDATION_ERROR',
            skipRule.errorReason ?? 'NEXT_STEP_REQUIRED'
          );
        }

        // 1. Resolve current action as SKIPPED
        const skipped = await actionRepo.resolve(ctx, actionId, 'SKIPPED');

        // 2. Create the replacement action atomically
        const newAction = await actionRepo.create(ctx, {
          contactId: action.contactId,
          bookingId: action.bookingId,
          actionType: skipRule.actionType,
          title: skipRule.title ?? 'Aksi baru',
          description: nextStep.description ?? null,
          dueAt: skipRule.dueAt.toISOString(),
          priority: skipRule.priority,
          status: 'PENDING',
          source: action.source,
          contextJson: action.contextJson,
        });

        // 3. Append ACTION_SKIPPED activity
        await activityRepo.append(ctx, actor, {
          contactId: action.contactId,
          bookingId: action.bookingId,
          eventType: 'ACTION_SKIPPED',
          metadataJson: {
            actionId: action.id,
            actionType: action.actionType,
            nextActionId: newAction.id,
          },
        });

        // 4. Append ACTION_CREATED activity for new action
        await activityRepo.append(ctx, actor, {
          contactId: action.contactId,
          bookingId: action.bookingId,
          eventType: 'ACTION_CREATED',
          metadataJson: {
            actionId: newAction.id,
            actionType: newAction.actionType,
            dueAt: newAction.dueAt,
            priority: newAction.priority,
            source: newAction.source,
          },
        });

        return {
          skippedAction: skipped ?? action,
          newAction,
        };
      });
    },

    /**
     * Cancels an action.
     */
    async cancelAction(
      ctx: OrganizationContext,
      actionId: string,
      reason?: string,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const action = await actionRepo.findById(ctx, actionId);
        if (!action) {
          throw new DomainError('NOT_FOUND', 'Next action not found');
        }

        if (action.status === 'CANCELLED') {
          return action; // Idempotent
        }

        if (action.status !== 'PENDING') {
          throw new DomainError('VALIDATION_ERROR', 'Action is not pending');
        }

        const updated = await actionRepo.resolve(ctx, actionId, 'CANCELLED');

        await activityRepo.append(ctx, actor, {
          contactId: action.contactId,
          bookingId: action.bookingId,
          eventType: 'ACTION_CANCELLED',
          metadataJson: {
            actionId: action.id,
            actionType: action.actionType,
            reason,
          },
        });

        return updated ?? action;
      });
    },

    /**
     * Reschedules an action's due date.
     */
    async rescheduleAction(
      ctx: OrganizationContext,
      actionId: string,
      dueAt: string | Date,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const action = await actionRepo.findById(ctx, actionId);
        if (!action) {
          throw new DomainError('NOT_FOUND', 'Next action not found');
        }

        if (action.status !== 'PENDING') {
          throw new DomainError('VALIDATION_ERROR', 'Action is not pending');
        }

        const dueIso = typeof dueAt === 'string' ? dueAt : dueAt.toISOString();
        const oldDueAt = action.dueAt;
        const updated = await actionRepo.reschedule(ctx, actionId, dueIso);

        await activityRepo.append(ctx, actor, {
          contactId: action.contactId,
          bookingId: action.bookingId,
          eventType: 'ACTION_RESCHEDULED',
          metadataJson: {
            actionId: action.id,
            actionType: action.actionType,
            from: oldDueAt,
            to: dueIso,
          },
        });

        return updated ?? action;
      });
    },

    /**
     * Resolves the primary next action for a contact using canonical effective priority ordering.
     */
    async getPrimaryNextAction(ctx: OrganizationContext, contactId: string) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const actionRepo = createNextActionRepository(db);
      const pendingActions = await actionRepo.listByContact(ctx, contactId, 'PENDING');
      if (pendingActions.length === 0) return null;

      const now = getNow();
      return selectPrimaryAction(pendingActions, now);
    },

    /**
     * Reads canonical Today feed grouped by local calendar day (overdue, today, upcoming).
     * Bounded upcoming horizon with independent totalActiveCount query.
     */
    async getToday(ctx: OrganizationContext, nowOverride?: string | Date) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const now = nowOverride
        ? (typeof nowOverride === 'string' ? new Date(nowOverride) : nowOverride)
        : getNow();

      const localNow = getLocalCalendarDate(now, orgTz);
      const yearStr = String(localNow.year);
      const monthStr = String(localNow.month).padStart(2, '0');
      const dayStr = String(localNow.day).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

      const nextDayUtc = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day + 1, 12, 0, 0));
      const startOfTomorrow = getInstantForZonedDateTime({
        year: nextDayUtc.getUTCFullYear(),
        month: nextDayUtc.getUTCMonth() + 1,
        day: nextDayUtc.getUTCDate(),
        hour: 0,
        minute: 0,
        second: 0,
        timeZone: orgTz,
      });
      const endOfToday = new Date(startOfTomorrow.getTime() - 1);

      const actionRepo = createNextActionRepository(db);
      const contactRepo = (dependencies.contacts ?? createContactRepository)(
        db as any,
        normalizePhone,
        normalizeEmail
      );
      const bookingRepo = (dependencies.bookings ?? createBookingRepository)(db);
      const serviceRepo = (dependencies.services ?? createServiceRepository)(db);

      // 1. Full count query (R2.1-7: never derived from limited upcoming query)
      const totalActiveCount = await actionRepo.countPending(ctx);

      // 2. Fetch overdue + today actions
      const overdueAndTodayActions = await actionRepo.listPendingDueBy(
        ctx,
        endOfToday.toISOString()
      );

      // 3. Fetch bounded upcoming actions (limit 20)
      const upcomingActions = await actionRepo.listPendingUpcoming(
        ctx,
        startOfTomorrow.toISOString(),
        20
      );

      const allFetchedActions = [...overdueAndTodayActions, ...upcomingActions];

      // 4. Batch fetch contacts, bookings, and services (avoid N+1)
      const contactIds = Array.from(new Set(allFetchedActions.map((a) => a.contactId)));
      const bookingIds = Array.from(
        new Set(allFetchedActions.map((a) => a.bookingId).filter((id): id is string => !!id))
      );

      const contactsMap = new Map<string, any>();
      for (const cId of contactIds) {
        const c = await contactRepo.findById(ctx, cId);
        if (c) contactsMap.set(cId, c);
      }

      const bookingsMap = new Map<string, any>();
      const serviceIds: string[] = [];
      for (const bId of bookingIds) {
        const b = await bookingRepo.findById(ctx, bId);
        if (b) {
          bookingsMap.set(bId, b);
          serviceIds.push(b.serviceId);
        }
      }

      const servicesMap = new Map<string, any>();
      if (serviceIds.length > 0) {
        const sRows = await serviceRepo.listByIds(ctx, Array.from(new Set(serviceIds)));
        for (const s of sRows) {
          servicesMap.set(s.id, s);
        }
      }

      // 5. Group actions
      const grouped = groupTodayActions(allFetchedActions, now, orgTz);

      const enrichAction = (action: (typeof allFetchedActions)[0]) => {
        const contact = contactsMap.get(action.contactId);
        const booking = action.bookingId ? bookingsMap.get(action.bookingId) : null;
        const service = booking ? servicesMap.get(booking.serviceId) : null;
        const effectivePriority = calculateEffectivePriority(action.priority, action.dueAt, now);

        return {
          ...action,
          effectivePriority,
          contact: contact
            ? {
                id: contact.id,
                name: contact.name,
                phoneE164: contact.phoneE164,
              }
            : null,
          booking: booking
            ? {
                id: booking.id,
                serviceTitle: service?.name ?? 'Layanan',
                amount: booking.amount,
                startAt: booking.startAt,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
              }
            : null,
          service: service
            ? {
                id: service.id,
                name: service.name,
                category: service.category,
              }
            : null,
        };
      };

      const sortGroup = (items: typeof allFetchedActions) => {
        return [...items].sort((a, b) => comparePrimaryCandidate(a, b, now)).map(enrichAction);
      };

      const richOverdue = sortGroup(grouped.overdue);
      const richToday = sortGroup(grouped.today);
      const richUpcoming = sortGroup(grouped.upcoming);

      return {
        date: dateStr,
        totalActiveCount,
        overdueCount: richOverdue.length,
        groups: {
          overdue: richOverdue,
          today: richToday,
          upcoming: richUpcoming,
        },
      };
    },
  };
}
