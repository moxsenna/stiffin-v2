import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
import { createAssessmentRepository } from '../repositories/assessment-repository';
import { createBookingRepository } from '../repositories/booking-repository';
import { createActivityRepository } from '../repositories/activity-repository';

export interface AssessmentServiceDependencies {
  assessments?: typeof createAssessmentRepository;
  bookings?: typeof createBookingRepository;
  activities?: typeof createActivityRepository;
}

export function createAssessmentService(
  db: DbHandle,
  dependencies: AssessmentServiceDependencies = {}
) {
  return {
    /**
     * Synchronizes canonical assessment record from an assessment-category booking.
     * Applies highest-evidence precedence (COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED).
     * Emits ASSESSMENT_STATUS_CHANGED ONLY when the canonical status actually changes
     * and the incoming candidate status was what became persisted (R2.1-4).
     */
    async syncFromBooking(
      ctx: OrganizationContext,
      bookingId: string,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const bookingRepo = (dependencies.bookings ?? createBookingRepository)(tx);
        const assessmentRepo = (dependencies.assessments ?? createAssessmentRepository)(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const booking = await bookingRepo.findById(ctx, bookingId);
        if (!booking) {
          throw new DomainError('NOT_FOUND', 'Booking not found');
        }

        // Map booking status to candidate assessment evidence status
        let candidateStatus: 'COMPLETED' | 'SCHEDULED' | 'CANCELLED';
        if (booking.status === 'COMPLETED') {
          candidateStatus = 'COMPLETED';
        } else if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
          candidateStatus = 'SCHEDULED';
        } else {
          // CANCELLED or NO_SHOW
          candidateStatus = 'CANCELLED';
        }

        const assessedAt =
          candidateStatus === 'COMPLETED'
            ? booking.completedAt ?? new Date().toISOString()
            : null;

        // Ensure canonical row exists and capture canonical status before update
        const beforeRow = await assessmentRepo.getOrCreate(ctx, booking.contactId);
        const previousStatus = beforeRow?.status;

        // Update status with precedence guard
        const updated = await assessmentRepo.updateStatus(
          ctx,
          booking.contactId,
          candidateStatus,
          bookingId,
          assessedAt
        );

        // Emit ASSESSMENT_STATUS_CHANGED only if canonical status changed AND matched candidateStatus
        if (
          updated &&
          updated.status !== previousStatus &&
          updated.status === candidateStatus
        ) {
          await activityRepo.append(ctx, actor, {
            contactId: booking.contactId,
            bookingId,
            eventType: 'ASSESSMENT_STATUS_CHANGED',
            metadataJson: {
              status: updated.status,
              sourceBookingId: bookingId,
            },
          });
        }

        return updated;
      });
    },

    /**
     * Reads canonical assessment record (get-or-create).
     */
    async getAssessmentStatus(ctx: OrganizationContext, contactId: string) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const assessmentRepo = (dependencies.assessments ?? createAssessmentRepository)(db);
      const assessment = await assessmentRepo.getOrCreate(ctx, contactId);
      if (!assessment) {
        throw new DomainError('NOT_FOUND', 'Active tenant contact not found');
      }

      return assessment;
    },
  };
}
