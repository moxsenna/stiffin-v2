import { BookingRepositoryPort } from './ports';
import { FlowBooking, BookingStatus, PaymentStatus } from '@promotor/promotor-flow-fixtures';
import { LifecycleRepositoryPort } from '../lifecycle/ports';
import { NextActionRepositoryPort } from '../next-actions/ports';
import { ActivityRepositoryPort } from '../activities/ports';
import { ClockPort } from '../clock/ports';

export interface CreateBookingInput {
  organizationId: string;
  contactId: string;
  serviceId: string;
  serviceTitle: string;
  startAt: string;
  endAt: string;
  locationType: 'HOME_VISIT' | 'ON_SITE' | 'ONLINE';
  locationAddress?: string;
  paymentStatus: PaymentStatus;
  amount: number;
  notes?: string;
}

export function createBookingCommands(
  bookingRepo: BookingRepositoryPort,
  lifecycleRepo: LifecycleRepositoryPort,
  actionRepo: NextActionRepositoryPort,
  activityRepo: ActivityRepositoryPort,
  clock: ClockPort
) {
  return {
    async createBooking(input: CreateBookingInput): Promise<FlowBooking> {
      const newBooking: Omit<FlowBooking, 'id' | 'createdAt' | 'updatedAt'> = {
        organizationId: input.organizationId,
        contactId: input.contactId,
        serviceId: input.serviceId,
        serviceTitle: input.serviceTitle,
        startAt: input.startAt,
        endAt: input.endAt,
        locationType: input.locationType,
        locationAddress: input.locationAddress,
        status: 'CONFIRMED',
        paymentStatus: input.paymentStatus,
        amount: input.amount,
        notes: input.notes,
      };

      const created = await bookingRepo.createBooking(newBooking);

      // Update stage to BOOKED
      await lifecycleRepo.updateStage(input.contactId, 'BOOKED');

      // Schedule action for booking confirmation or payment reminder
      const actionType = input.paymentStatus === 'UNPAID' ? 'REMIND_PAYMENT' : 'CONFIRM_BOOKING';
      const actionTitle = `${input.serviceTitle} (${input.paymentStatus === 'UNPAID' ? 'DP belum dibayar' : 'Jadwal terkonfirmasi'})`;
      
      await actionRepo.createNextAction({
        organizationId: input.organizationId,
        contactId: input.contactId,
        actionType,
        title: actionTitle,
        subtitle: `Booking ${created.serviceTitle}`,
        dueAt: input.startAt,
        status: 'PENDING',
        source: 'PROMOTORFLOW',
      });

      // Log activity
      await activityRepo.appendActivity({
        organizationId: input.organizationId,
        contactId: input.contactId,
        title: `Booking dibuat: ${created.serviceTitle}`,
        detail: `Status pembayaran: ${input.paymentStatus}`,
        timestamp: clock.nowIso(),
        type: 'BOOKING_CREATED',
      });

      return created;
    },

    async changePaymentStatus(bookingId: string, paymentStatus: PaymentStatus): Promise<FlowBooking> {
      const updated = await bookingRepo.updateBooking(bookingId, { paymentStatus });
      await activityRepo.appendActivity({
        organizationId: updated.organizationId,
        contactId: updated.contactId,
        title: `Status pembayaran diperbarui ke ${paymentStatus}`,
        timestamp: clock.nowIso(),
        type: 'STAGE_CHANGED',
      });
      return updated;
    },

    async rescheduleBooking(bookingId: string, newStartAt: string, newEndAt: string): Promise<FlowBooking> {
      const updated = await bookingRepo.updateBooking(bookingId, {
        startAt: newStartAt,
        endAt: newEndAt,
      });

      await activityRepo.appendActivity({
        organizationId: updated.organizationId,
        contactId: updated.contactId,
        title: `Jadwal booking diubah ke ${newStartAt}`,
        timestamp: clock.nowIso(),
        type: 'STAGE_CHANGED',
      });

      return updated;
    },

    async completeBooking(bookingId: string): Promise<FlowBooking> {
      const updated = await bookingRepo.updateBooking(bookingId, {
        status: 'COMPLETED',
      });

      // Update contact stage to COMPLETED
      await lifecycleRepo.updateStage(updated.contactId, 'COMPLETED');

      // Schedule D+7 Aftercare NextAction
      const dueD7 = clock.addDays(clock.now(), 7).toISOString();
      const idempotencyKey = `aftercare:booking:${bookingId}:d7`;

      // Check if aftercare already exists
      const existingAction = await actionRepo.findByIdempotencyKey(updated.organizationId, idempotencyKey);
      if (!existingAction) {
        await actionRepo.createNextAction({
          organizationId: updated.organizationId,
          contactId: updated.contactId,
          actionType: 'AFTERCARE',
          title: 'Tanya pemahaman & perkembangan hasil tes',
          subtitle: `Aftercare D+7 · ${updated.serviceTitle}`,
          dueAt: dueD7,
          status: 'PENDING',
          source: 'PROMOTORFLOW',
          idempotencyKey,
        });
      }

      // Log activity
      await activityRepo.appendActivity({
        organizationId: updated.organizationId,
        contactId: updated.contactId,
        title: `Layanan selesai: ${updated.serviceTitle}`,
        detail: 'Aftercare D+7 dijadwalkan otomatis',
        timestamp: clock.nowIso(),
        type: 'BOOKING_COMPLETED',
      });

      return updated;
    },
  };
}
