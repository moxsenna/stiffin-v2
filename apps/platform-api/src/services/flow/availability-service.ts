import { eq, and, isNull } from 'drizzle-orm';
import type { DbHandle } from '../../db/client';
import { isOrganizationContext, type OrganizationContext } from '../../core/organization-context';
import { DomainError } from '../../core/errors';
import { DEFAULT_ORGANIZATION_TIMEZONE } from '@promotor/platform-core';
import { organizations } from '../../db/schema/organizations';
import { createAvailabilityRepository, type WeeklyRuleInput } from '../../repositories/availability-repository';
import { createServiceRepository } from '../../repositories/service-repository';
import { createBookingRepository } from '../../repositories/booking-repository';
import { generateCandidateSlots } from '../../domain/flow/slots';
import { deriveBusyIntervals } from '../../domain/flow/occupancy';

export interface AvailabilityServiceDependencies {
  clock?: () => Date;
  orgTz?: string;
}

export function createAvailabilityService(
  db: DbHandle,
  dependencies: AvailabilityServiceDependencies = {}
) {
  const getNow = dependencies.clock ?? (() => new Date());
  const fallbackTz = dependencies.orgTz ?? DEFAULT_ORGANIZATION_TIMEZONE;

  const availabilityRepo = createAvailabilityRepository(db);
  const serviceRepo = createServiceRepository(db);
  const bookingRepo = createBookingRepository(db);

  return {
    async getWeeklyRules(ctx: OrganizationContext) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      return availabilityRepo.listRules(ctx);
    },

    async replaceWeeklyRules(ctx: OrganizationContext, rules: WeeklyRuleInput[]) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      return availabilityRepo.replaceWeeklyRules(ctx, rules);
    },

    async getPublicAvailableSlots(input: {
      slug: string;
      serviceId: string;
      rangeFrom: Date;
      rangeTo: Date;
      evaluationNow?: Date;
    }) {
      const { slug, serviceId, rangeFrom, rangeTo } = input;
      const evalNow = input.evaluationNow ?? getNow();

      if (!slug || slug.trim().length === 0) {
        throw new DomainError('NOT_FOUND', 'Workspace slug is required');
      }
      if (!serviceId) {
        throw new DomainError('VALIDATION_ERROR', 'serviceId is required');
      }
      if (rangeFrom >= rangeTo) {
        throw new DomainError('VALIDATION_ERROR', 'rangeFrom must be earlier than rangeTo');
      }

      // Bound query range to max 31 days
      const maxRangeMs = 31 * 24 * 60 * 60 * 1000;
      if (rangeTo.getTime() - rangeFrom.getTime() > maxRangeMs) {
        throw new DomainError('VALIDATION_ERROR', 'Date range cannot exceed 31 days');
      }

      // 1. Resolve organization by slug
      const [org] = await (db as any)
        .select()
        .from(organizations)
        .where(and(eq(organizations.slug, slug), isNull(organizations.deletedAt)));

      if (!org) {
        throw new DomainError('NOT_FOUND', `Workspace not found: ${slug}`);
      }

      const organizationId = org.id;
      const orgCtx: OrganizationContext = { organizationId };

      // 2. Validate active service belongs to this organization
      const service = await serviceRepo.findById(orgCtx, serviceId);
      if (!service || !service.isActive) {
        throw new DomainError('NOT_FOUND', `Active service not found: ${serviceId}`);
      }

      // 3. Load active weekly availability rules for this organization
      const rules = await availabilityRepo.listActiveByOrgId(organizationId);

      // 4. Load bookings in extended range [rangeFrom - 1 day, rangeTo + 1 day]
      const queryFrom = new Date(rangeFrom.getTime() - 86400000);
      const queryTo = new Date(rangeTo.getTime() + 86400000);
      const rawBookings = await bookingRepo.listByOrg(orgCtx, {
        from: queryFrom.toISOString(),
        to: queryTo.toISOString(),
        includeCompleted: true,
      });

      // 5. Derive busy intervals
      const busyIntervals = deriveBusyIntervals(
        rawBookings.map((b) => ({
          startAt: b.startAt,
          endAt: b.endAt,
          status: b.status,
          serviceDurationMinutes: service.durationMinutes,
        })),
        service.durationMinutes
      );

      // 6. Generate candidate slots via pure engine
      const slots = generateCandidateSlots({
        organizationTimezone: fallbackTz,
        evaluationNow: evalNow,
        rangeFrom,
        rangeTo,
        serviceDurationMinutes: service.durationMinutes,
        weeklyRules: rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          isActive: r.isActive,
        })),
        existingBusyIntervals: busyIntervals,
        bufferMinutes: 30,
      });

      return {
        slots,
        service: {
          id: service.id,
          name: service.name,
          category: service.category,
          durationMinutes: service.durationMinutes,
          priceAmount: service.priceAmount,
          description: service.description ?? undefined,
        },
      };
    },
  };
}
