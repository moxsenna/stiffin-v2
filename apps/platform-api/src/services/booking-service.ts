import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
import { DEFAULT_ORGANIZATION_TIMEZONE } from '@promotor/platform-core';
import { createBookingRepository, type ListBookingsOrgOptions } from '../repositories/booking-repository';
import { createServiceRepository } from '../repositories/service-repository';
import { createNextActionRepository } from '../repositories/next-action-repository';
import { createActivityRepository } from '../repositories/activity-repository';
import { createAftercareRepository } from '../repositories/aftercare-repository';
import { createContactLifecycleService } from './contact-lifecycle-service';
import { createNextActionService } from './next-action-service';
import { createAssessmentService } from './assessment-service';
import {
  calculateRemindPaymentRule,
  calculateRemindBookingRule,
  calculateAftercareRule,
  buildAftercareIdempotencyKey,
} from '../domain/next-action-rules';

export interface CreateBookingInput {
  contactId: string;
  serviceId: string;
  startAt: string;
  endAt?: string | null;
  locationType: 'HOME_VISIT' | 'ON_SITE' | 'ONLINE';
  locationText?: string | null;
  paymentStatus?: 'UNPAID' | 'PAID' | 'WAIVED';
  notes?: string | null;
  idempotencyKey?: string | null;
}

export interface BookingServiceDependencies {
  lifecycle?: typeof createContactLifecycleService;
  nextActions?: typeof createNextActionService;
  activities?: typeof createActivityRepository;
  aftercare?: typeof createAftercareRepository;
  assessment?: typeof createAssessmentService;
  services?: typeof createServiceRepository;
  clock?: () => Date;
  orgTz?: string;
}

export function createBookingService(
  db: DbHandle,
  dependencies: BookingServiceDependencies = {}
) {
  const getNow = dependencies.clock ?? (() => new Date());
  const orgTz = dependencies.orgTz ?? DEFAULT_ORGANIZATION_TIMEZONE;

  return {
    /**
     * Creates a new booking.
     * Amount is server-canonical (snapshotted from service.priceAmount; client never supplies amount).
     */
    async createBooking(
      ctx: OrganizationContext,
      input: CreateBookingInput,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const bookingRepo = createBookingRepository(tx);
        const serviceRepo = (dependencies.services ?? createServiceRepository)(tx);
        const lifecycleService = (dependencies.lifecycle ?? createContactLifecycleService)(tx);
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);
        const assessmentService = (dependencies.assessment ?? createAssessmentService)(tx);

        // 1. Validate service
        const service = await serviceRepo.findById(ctx, input.serviceId);
        if (!service || !service.isActive) {
          throw new DomainError('NOT_FOUND', 'Active tenant service not found');
        }

        const now = getNow();
        const paymentStatus = input.paymentStatus ?? 'UNPAID';

        // 2. Insert booking with server-canonical amount snapshot
        const booking = await bookingRepo.create(
          ctx,
          {
            contactId: input.contactId,
            serviceId: input.serviceId,
            amount: service.priceAmount,
            startAt: input.startAt,
            endAt: input.endAt ?? null,
            locationType: input.locationType,
            locationText: input.locationText ?? null,
            status: 'PENDING',
            paymentStatus,
            notes: input.notes ?? null,
          },
          input.idempotencyKey
        );

        // 3. Update lifecycle stage to BOOKED via lifecycle authority
        await lifecycleService.transitionStage(ctx, input.contactId, 'BOOKED', {}, actor);

        // 4. Provision NextAction based on payment status
        if (paymentStatus === 'UNPAID') {
          // NA-005: REMIND_PAYMENT
          const reminderRule = calculateRemindPaymentRule(now, booking.startAt);
          const paymentAction = await actionRepo.create(ctx, {
            contactId: booking.contactId,
            bookingId: booking.id,
            actionType: 'REMIND_PAYMENT',
            title: 'Kirim pengingat pembayaran',
            dueAt: reminderRule.dueAt.toISOString(),
            priority: reminderRule.priority,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
            contextJson: {
              serviceName: service.name,
              amount: booking.amount,
            },
          });

          await activityRepo.append(ctx, actor, {
            contactId: booking.contactId,
            bookingId: booking.id,
            eventType: 'ACTION_CREATED',
            metadataJson: {
              actionId: paymentAction.id,
              actionType: 'REMIND_PAYMENT',
              dueAt: paymentAction.dueAt,
              priority: paymentAction.priority,
              source: 'PROMOTORFLOW',
            },
          });
        } else {
          // NA-005b: CONFIRM_BOOKING
          const confirmAction = await actionRepo.create(ctx, {
            contactId: booking.contactId,
            bookingId: booking.id,
            actionType: 'CONFIRM_BOOKING',
            title: 'Konfirmasi kehadiran booking',
            dueAt: booking.startAt,
            priority: 90,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
            contextJson: {
              serviceName: service.name,
              amount: booking.amount,
            },
          });

          await activityRepo.append(ctx, actor, {
            contactId: booking.contactId,
            bookingId: booking.id,
            eventType: 'ACTION_CREATED',
            metadataJson: {
              actionId: confirmAction.id,
              actionType: 'CONFIRM_BOOKING',
              dueAt: confirmAction.dueAt,
              priority: confirmAction.priority,
              source: 'PROMOTORFLOW',
            },
          });
        }

        // 5. Append BOOKING_CREATED activity
        await activityRepo.append(ctx, actor, {
          contactId: booking.contactId,
          bookingId: booking.id,
          eventType: 'BOOKING_CREATED',
          metadataJson: {
            bookingId: booking.id,
            serviceName: service.name,
            amount: booking.amount,
            startAt: booking.startAt,
          },
        });

        // 6. Assessment sync if service category is ASSESSMENT
        if (service.category === 'ASSESSMENT') {
          await assessmentService.syncFromBooking(ctx, booking.id, actor);
        }

        return booking;
      });
    },

    /**
     * Confirms a PENDING booking.
     * Transitions status to CONFIRMED, cancels pending CONFIRM_BOOKING, and provisions NA-006 REMIND_BOOKING.
     */
    async confirmBooking(
      ctx: OrganizationContext,
      bookingId: string,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const bookingRepo = createBookingRepository(tx);
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const booking = await bookingRepo.findById(ctx, bookingId);
        if (!booking) {
          throw new DomainError('NOT_FOUND', 'Booking not found');
        }

        if (booking.status === 'CONFIRMED') {
          // Idempotent return of existing confirmed booking
          return booking;
        }

        if (booking.status !== 'PENDING') {
          throw new DomainError('VALIDATION_ERROR', 'INVALID_BOOKING_STATE');
        }

        const now = getNow();
        const updated = await bookingRepo.updateStatus(ctx, bookingId, 'CONFIRMED');

        // Cancel pending CONFIRM_BOOKING actions for this booking
        const confirmActions = await actionRepo.findActiveByBookingType(
          ctx,
          bookingId,
          'CONFIRM_BOOKING'
        );
        for (const act of confirmActions) {
          await actionRepo.resolve(ctx, act.id, 'CANCELLED');
          await activityRepo.append(ctx, actor, {
            contactId: booking.contactId,
            bookingId,
            eventType: 'ACTION_CANCELLED',
            metadataJson: {
              actionId: act.id,
              actionType: 'CONFIRM_BOOKING',
              reason: 'BOOKING_CONFIRMED',
            },
          });
        }

        // NA-006: Create REMIND_BOOKING (due startAt - 24h or now if <24h)
        const reminderRule = calculateRemindBookingRule(now, booking.startAt);
        const reminderAction = await actionRepo.create(ctx, {
          contactId: booking.contactId,
          bookingId,
          actionType: 'REMIND_BOOKING',
          title: 'Kirim pengingat sesi H-1',
          dueAt: reminderRule.dueAt.toISOString(),
          priority: reminderRule.priority,
          status: 'PENDING',
          source: 'PROMOTORFLOW',
          contextJson: {},
        });

        await activityRepo.append(ctx, actor, {
          contactId: booking.contactId,
          bookingId,
          eventType: 'ACTION_CREATED',
          metadataJson: {
            actionId: reminderAction.id,
            actionType: 'REMIND_BOOKING',
            dueAt: reminderAction.dueAt,
            priority: reminderAction.priority,
            source: 'PROMOTORFLOW',
          },
        });

        // Append BOOKING_CONFIRMED activity
        await activityRepo.append(ctx, actor, {
          contactId: booking.contactId,
          bookingId,
          eventType: 'BOOKING_CONFIRMED',
          metadataJson: {
            bookingId,
          },
        });

        return updated ?? booking;
      });
    },

    /**
     * Marks payment status for a booking.
     * Completes pending REMIND_PAYMENT actions (Rule F) and ensures exactly one CONFIRM_BOOKING if still PENDING.
     */
    async markPaid(
      ctx: OrganizationContext,
      bookingId: string,
      paymentStatus: 'PAID' | 'WAIVED' = 'PAID',
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const bookingRepo = createBookingRepository(tx);
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const booking = await bookingRepo.findById(ctx, bookingId);
        if (!booking) {
          throw new DomainError('NOT_FOUND', 'Booking not found');
        }

        const now = getNow();
        const updated = await bookingRepo.updatePayment(ctx, bookingId, paymentStatus);

        // Rule F: Complete pending REMIND_PAYMENT actions for this booking
        const remindPaymentActions = await actionRepo.findActiveByBookingType(
          ctx,
          bookingId,
          'REMIND_PAYMENT'
        );
        for (const act of remindPaymentActions) {
          await actionRepo.complete(ctx, act.id, now.toISOString());
          await activityRepo.append(ctx, actor, {
            contactId: booking.contactId,
            bookingId,
            eventType: 'ACTION_COMPLETED',
            metadataJson: {
              actionId: act.id,
              actionType: 'REMIND_PAYMENT',
              completedBy: 'PAYMENT',
            },
          });
        }

        // If the booking is still PENDING, ensure exactly one pending CONFIRM_BOOKING action exists (R2-6)
        if (booking.status === 'PENDING') {
          const activeConfirmActions = await actionRepo.findActiveByBookingType(
            ctx,
            bookingId,
            'CONFIRM_BOOKING'
          );
          if (activeConfirmActions.length === 0) {
            const confirmAction = await actionRepo.create(ctx, {
              contactId: booking.contactId,
              bookingId,
              actionType: 'CONFIRM_BOOKING',
              title: 'Konfirmasi kehadiran booking',
              dueAt: booking.startAt,
              priority: 90,
              status: 'PENDING',
              source: 'PROMOTORFLOW',
              contextJson: {},
            });

            await activityRepo.append(ctx, actor, {
              contactId: booking.contactId,
              bookingId,
              eventType: 'ACTION_CREATED',
              metadataJson: {
                actionId: confirmAction.id,
                actionType: 'CONFIRM_BOOKING',
                dueAt: confirmAction.dueAt,
                priority: confirmAction.priority,
                source: 'PROMOTORFLOW',
              },
            });
          }
        }

        // Append PAYMENT_MARKED activity
        await activityRepo.append(ctx, actor, {
          contactId: booking.contactId,
          bookingId,
          eventType: 'PAYMENT_MARKED',
          metadataJson: {
            bookingId,
            paymentStatus,
          },
        });

        return updated ?? booking;
      });
    },

    /**
     * Reschedules a booking.
     * Re-syncs reminder actions (cancels stale ones and recreates for new time).
     */
    async rescheduleBooking(
      ctx: OrganizationContext,
      bookingId: string,
      startAt: string,
      endAt?: string | null,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const bookingRepo = createBookingRepository(tx);
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const booking = await bookingRepo.findById(ctx, bookingId);
        if (!booking) {
          throw new DomainError('NOT_FOUND', 'Booking not found');
        }

        if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
          throw new DomainError('VALIDATION_ERROR', 'INVALID_BOOKING_STATE');
        }

        const now = getNow();
        const oldStartAt = booking.startAt;

        // Cancel stale reminder actions
        const staleTypes = ['REMIND_BOOKING', 'CONFIRM_BOOKING', 'REMIND_PAYMENT'];
        for (const t of staleTypes) {
          const acts = await actionRepo.findActiveByBookingType(ctx, bookingId, t);
          for (const act of acts) {
            await actionRepo.resolve(ctx, act.id, 'CANCELLED');
            await activityRepo.append(ctx, actor, {
              contactId: booking.contactId,
              bookingId,
              eventType: 'ACTION_CANCELLED',
              metadataJson: {
                actionId: act.id,
                actionType: act.actionType,
                reason: 'BOOKING_RESCHEDULED',
              },
            });
          }
        }

        // Update booking start time
        const updated = await bookingRepo.reschedule(ctx, bookingId, startAt, endAt);

        // Recreate appropriate reminders
        if (booking.status === 'CONFIRMED') {
          const reminderRule = calculateRemindBookingRule(now, startAt);
          const reminderAction = await actionRepo.create(ctx, {
            contactId: booking.contactId,
            bookingId,
            actionType: 'REMIND_BOOKING',
            title: 'Kirim pengingat sesi H-1',
            dueAt: reminderRule.dueAt.toISOString(),
            priority: reminderRule.priority,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
            contextJson: {},
          });

          await activityRepo.append(ctx, actor, {
            contactId: booking.contactId,
            bookingId,
            eventType: 'ACTION_CREATED',
            metadataJson: {
              actionId: reminderAction.id,
              actionType: 'REMIND_BOOKING',
              dueAt: reminderAction.dueAt,
              priority: reminderAction.priority,
              source: 'PROMOTORFLOW',
            },
          });
        } else if (booking.status === 'PENDING') {
          if (booking.paymentStatus === 'UNPAID') {
            const reminderRule = calculateRemindPaymentRule(now, startAt);
            const paymentAction = await actionRepo.create(ctx, {
              contactId: booking.contactId,
              bookingId,
              actionType: 'REMIND_PAYMENT',
              title: 'Kirim pengingat pembayaran',
              dueAt: reminderRule.dueAt.toISOString(),
              priority: reminderRule.priority,
              status: 'PENDING',
              source: 'PROMOTORFLOW',
              contextJson: {
                amount: booking.amount,
              },
            });

            await activityRepo.append(ctx, actor, {
              contactId: booking.contactId,
              bookingId,
              eventType: 'ACTION_CREATED',
              metadataJson: {
                actionId: paymentAction.id,
                actionType: 'REMIND_PAYMENT',
                dueAt: paymentAction.dueAt,
                priority: paymentAction.priority,
                source: 'PROMOTORFLOW',
              },
            });
          } else {
            const confirmAction = await actionRepo.create(ctx, {
              contactId: booking.contactId,
              bookingId,
              actionType: 'CONFIRM_BOOKING',
              title: 'Konfirmasi kehadiran booking',
              dueAt: startAt,
              priority: 90,
              status: 'PENDING',
              source: 'PROMOTORFLOW',
              contextJson: {},
            });

            await activityRepo.append(ctx, actor, {
              contactId: booking.contactId,
              bookingId,
              eventType: 'ACTION_CREATED',
              metadataJson: {
                actionId: confirmAction.id,
                actionType: 'CONFIRM_BOOKING',
                dueAt: confirmAction.dueAt,
                priority: confirmAction.priority,
                source: 'PROMOTORFLOW',
              },
            });
          }
        }

        // Append BOOKING_RESCHEDULED activity
        await activityRepo.append(ctx, actor, {
          contactId: booking.contactId,
          bookingId,
          eventType: 'BOOKING_RESCHEDULED',
          metadataJson: {
            bookingId,
            from: oldStartAt,
            to: startAt,
          },
        });

        return updated ?? booking;
      });
    },

    /**
     * Completes a booking with concurrency-safe FOR UPDATE row locking.
     * Transitions lifecycle stage to COMPLETED (promoting classification to CLIENT).
     * Creates aftercare record and NA-009 AFTERCARE action atomically.
     */
    async completeBooking(
      ctx: OrganizationContext,
      bookingId: string,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const bookingRepo = createBookingRepository(tx);
        const lifecycleService = (dependencies.lifecycle ?? createContactLifecycleService)(tx);
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);
        const aftercareRepo = (dependencies.aftercare ?? createAftercareRepository)(tx);
        const assessmentService = (dependencies.assessment ?? createAssessmentService)(tx);
        const serviceRepo = (dependencies.services ?? createServiceRepository)(tx);

        // Lock row FOR UPDATE
        const booking = await bookingRepo.lockById(ctx, bookingId);
        if (!booking) {
          throw new DomainError('NOT_FOUND', 'Booking not found');
        }

        // Idempotency: already completed returns canonical result
        if (booking.status === 'COMPLETED') {
          return booking;
        }

        // Source status MUST be CONFIRMED
        if (booking.status !== 'CONFIRMED') {
          throw new DomainError('VALIDATION_ERROR', 'INVALID_BOOKING_STATE');
        }

        const now = getNow();
        const completedAtIso = now.toISOString();

        // 1. Mark booking COMPLETED
        const updated = await bookingRepo.markCompleted(ctx, bookingId, completedAtIso);

        // 2. Lifecycle authority: transition contact to COMPLETED (promotes classification to CLIENT)
        await lifecycleService.transitionStage(ctx, booking.contactId, 'COMPLETED', {}, actor);

        // 3. Cancel pending booking-scoped actions
        const bookingActions = ['REMIND_PAYMENT', 'CONFIRM_BOOKING', 'REMIND_BOOKING'];
        for (const t of bookingActions) {
          const acts = await actionRepo.findActiveByBookingType(ctx, bookingId, t);
          for (const act of acts) {
            await actionRepo.resolve(ctx, act.id, 'CANCELLED');
            await activityRepo.append(ctx, actor, {
              contactId: booking.contactId,
              bookingId,
              eventType: 'ACTION_CANCELLED',
              metadataJson: {
                actionId: act.id,
                actionType: act.actionType,
                reason: 'BOOKING_COMPLETED',
              },
            });
          }
        }

        // 4. Create aftercare_records row (+7 days)
        const aftercareRule = calculateAftercareRule(now, bookingId);
        const scheduledForIso = aftercareRule.dueAt.toISOString();

        const existingRecord = await aftercareRepo.findByBooking(ctx, bookingId);
        if (!existingRecord) {
          await aftercareRepo.create(ctx, {
            bookingId,
            contactId: booking.contactId,
            scheduledFor: scheduledForIso,
            status: 'PENDING',
          });
        }

        // 5. Create AFTERCARE NextAction (NA-009)
        const idempotencyKey = buildAftercareIdempotencyKey(bookingId);
        const existingAction = await actionRepo.findByIdempotency(ctx, 'PROMOTORFLOW', idempotencyKey);

        if (!existingAction) {
          const aftercareAction = await actionRepo.create(ctx, {
            contactId: booking.contactId,
            bookingId,
            actionType: 'AFTERCARE',
            title: 'Aftercare D+7 layanan',
            dueAt: scheduledForIso,
            priority: aftercareRule.priority,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
            idempotencyKey,
            contextJson: {
              bookingId,
              amount: booking.amount,
            },
          });

          await activityRepo.append(ctx, actor, {
            contactId: booking.contactId,
            bookingId,
            eventType: 'ACTION_CREATED',
            metadataJson: {
              actionId: aftercareAction.id,
              actionType: 'AFTERCARE',
              dueAt: aftercareAction.dueAt,
              priority: aftercareAction.priority,
              source: 'PROMOTORFLOW',
            },
          });
        }

        // 6. Append BOOKING_COMPLETED activity
        await activityRepo.append(ctx, actor, {
          contactId: booking.contactId,
          bookingId,
          eventType: 'BOOKING_COMPLETED',
          metadataJson: {
            bookingId,
            amount: booking.amount,
          },
        });

        // 7. Append AFTERCARE_CREATED activity
        await activityRepo.append(ctx, actor, {
          contactId: booking.contactId,
          bookingId,
          eventType: 'AFTERCARE_CREATED',
          metadataJson: {
            bookingId,
            scheduledFor: scheduledForIso,
          },
        });

        // 8. Assessment sync if service category is ASSESSMENT
        const service = await serviceRepo.findById(ctx, booking.serviceId);
        if (service?.category === 'ASSESSMENT') {
          await assessmentService.syncFromBooking(ctx, bookingId, actor);
        }

        return updated ?? booking;
      });
    },

    /**
     * Cancels a booking.
     */
    async cancelBooking(
      ctx: OrganizationContext,
      bookingId: string,
      opts?: { reason?: string },
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const bookingRepo = createBookingRepository(tx);
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);
        const assessmentService = (dependencies.assessment ?? createAssessmentService)(tx);
        const serviceRepo = (dependencies.services ?? createServiceRepository)(tx);

        const booking = await bookingRepo.findById(ctx, bookingId);
        if (!booking) {
          throw new DomainError('NOT_FOUND', 'Booking not found');
        }

        if (booking.status === 'CANCELLED') {
          return booking; // Idempotent no-op
        }

        if (booking.status === 'COMPLETED' || booking.status === 'NO_SHOW') {
          throw new DomainError('VALIDATION_ERROR', 'INVALID_BOOKING_STATE');
        }

        const updated = await bookingRepo.updateStatus(ctx, bookingId, 'CANCELLED');

        // Cancel pending booking-scoped actions
        const bookingActions = ['REMIND_PAYMENT', 'CONFIRM_BOOKING', 'REMIND_BOOKING'];
        for (const t of bookingActions) {
          const acts = await actionRepo.findActiveByBookingType(ctx, bookingId, t);
          for (const act of acts) {
            await actionRepo.resolve(ctx, act.id, 'CANCELLED');
            await activityRepo.append(ctx, actor, {
              contactId: booking.contactId,
              bookingId,
              eventType: 'ACTION_CANCELLED',
              metadataJson: {
                actionId: act.id,
                actionType: act.actionType,
                reason: 'BOOKING_CANCELLED',
              },
            });
          }
        }

        // Append BOOKING_CANCELLED activity
        await activityRepo.append(ctx, actor, {
          contactId: booking.contactId,
          bookingId,
          eventType: 'BOOKING_CANCELLED',
          metadataJson: {
            bookingId,
            reason: opts?.reason,
          },
        });

        // Assessment sync if service category is ASSESSMENT
        const service = await serviceRepo.findById(ctx, booking.serviceId);
        if (service?.category === 'ASSESSMENT') {
          await assessmentService.syncFromBooking(ctx, bookingId, actor);
        }

        return updated ?? booking;
      });
    },

    /**
     * Marks a booking as NO_SHOW.
     */
    async markNoShow(
      ctx: OrganizationContext,
      bookingId: string,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const bookingRepo = createBookingRepository(tx);
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);
        const assessmentService = (dependencies.assessment ?? createAssessmentService)(tx);
        const serviceRepo = (dependencies.services ?? createServiceRepository)(tx);

        const booking = await bookingRepo.findById(ctx, bookingId);
        if (!booking) {
          throw new DomainError('NOT_FOUND', 'Booking not found');
        }

        if (booking.status === 'NO_SHOW') {
          return booking; // Idempotent no-op
        }

        if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
          throw new DomainError('VALIDATION_ERROR', 'INVALID_BOOKING_STATE');
        }

        const updated = await bookingRepo.updateStatus(ctx, bookingId, 'NO_SHOW');

        // Cancel pending booking-scoped actions
        const bookingActions = ['REMIND_PAYMENT', 'CONFIRM_BOOKING', 'REMIND_BOOKING'];
        for (const t of bookingActions) {
          const acts = await actionRepo.findActiveByBookingType(ctx, bookingId, t);
          for (const act of acts) {
            await actionRepo.resolve(ctx, act.id, 'CANCELLED');
            await activityRepo.append(ctx, actor, {
              contactId: booking.contactId,
              bookingId,
              eventType: 'ACTION_CANCELLED',
              metadataJson: {
                actionId: act.id,
                actionType: act.actionType,
                reason: 'BOOKING_NO_SHOW',
              },
            });
          }
        }

        // Append BOOKING_NO_SHOW activity
        await activityRepo.append(ctx, actor, {
          contactId: booking.contactId,
          bookingId,
          eventType: 'BOOKING_NO_SHOW',
          metadataJson: {
            bookingId,
          },
        });

        // Assessment sync if service category is ASSESSMENT
        const service = await serviceRepo.findById(ctx, booking.serviceId);
        if (service?.category === 'ASSESSMENT') {
          await assessmentService.syncFromBooking(ctx, bookingId, actor);
        }

        return updated ?? booking;
      });
    },

    /**
     * Reads calendar agenda bookings with joined service title.
     */
    async getAgenda(ctx: OrganizationContext, opts: ListBookingsOrgOptions = {}) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const bookingRepo = createBookingRepository(db);
      const serviceRepo = (dependencies.services ?? createServiceRepository)(db);

      const bookingRows = await bookingRepo.listByOrg(ctx, opts);
      if (bookingRows.length === 0) return [];

      const serviceIds = Array.from(new Set(bookingRows.map((b) => b.serviceId)));
      const serviceRows = await serviceRepo.listByIds(ctx, serviceIds);
      const serviceMap = new Map(serviceRows.map((s) => [s.id, s]));

      return bookingRows.map((b) => ({
        ...b,
        serviceTitle: serviceMap.get(b.serviceId)?.name ?? 'Layanan',
        serviceCategory: serviceMap.get(b.serviceId)?.category ?? 'OTHER',
      }));
    },

    /**
     * Reads booking detail with joined service.
     */
    async getBookingDetail(ctx: OrganizationContext, id: string) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const bookingRepo = createBookingRepository(db);
      const serviceRepo = (dependencies.services ?? createServiceRepository)(db);

      const booking = await bookingRepo.findById(ctx, id);
      if (!booking) return null;

      const service = await serviceRepo.findById(ctx, booking.serviceId);

      return {
        ...booking,
        serviceTitle: service?.name ?? 'Layanan',
        serviceCategory: service?.category ?? 'OTHER',
        serviceDurationMinutes: service?.durationMinutes ?? 60,
      };
    },
  };
}
