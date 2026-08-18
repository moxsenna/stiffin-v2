import { sql, eq, and, or, isNull } from 'drizzle-orm';
import type { DbHandle } from '../../db/client';
import type { OrganizationContext } from '../../core/organization-context';
import { DomainError } from '../../core/errors';
import { normalizePhone, normalizeEmail, DEFAULT_ORGANIZATION_TIMEZONE } from '@promotor/platform-core';
import { organizations } from '../../db/schema/organizations';
import { createServiceRepository } from '../../repositories/service-repository';
import { createContactRepository } from '../../repositories/contact-repository';
import { createContactFlowRepository } from '../../repositories/contact-flow-repository';
import { createBookingService } from '../booking-service';
import { bookings } from '../../db/schema/bookings';

export interface CreatePublicBookingInput {
  slug: string;
  serviceId: string;
  startAt: string; // ISO 8601 string
  name: string;
  phoneRaw: string;
  email?: string | null;
  notes?: string | null;
  locationType?: 'HOME_VISIT' | 'ON_SITE' | 'ONLINE';
  locationText?: string | null;
}

export interface PublicBookingResult {
  bookingId: string;
  status: 'PENDING';
  startAt: string;
  endAt: string;
  serviceTitle: string;
  amount: number;
}

export function createPublicBookingService(
  db: DbHandle,
  dependencies: {
    clock?: () => Date;
    orgTz?: string;
  } = {}
) {
  const getNow = dependencies.clock ?? (() => new Date());
  const fallbackTz = dependencies.orgTz ?? DEFAULT_ORGANIZATION_TIMEZONE;

  const serviceRepo = createServiceRepository(db);

  return {
    async createPublicBooking(input: CreatePublicBookingInput): Promise<PublicBookingResult> {
      const { slug, serviceId, startAt: rawStartAt, name, phoneRaw, email, notes, locationType = 'ONLINE', locationText } = input;

      if (!slug || slug.trim().length === 0) {
        throw new DomainError('NOT_FOUND', 'Workspace slug is required');
      }
      if (!serviceId) {
        throw new DomainError('VALIDATION_ERROR', 'serviceId is required');
      }
      if (!name || name.trim().length === 0) {
        throw new DomainError('VALIDATION_ERROR', 'Name is required');
      }
      if (!phoneRaw || phoneRaw.trim().length === 0) {
        throw new DomainError('VALIDATION_ERROR', 'Phone number is required');
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

      const startDate = new Date(rawStartAt);
      if (isNaN(startDate.getTime())) {
        throw new DomainError('VALIDATION_ERROR', 'Invalid startAt date format');
      }

      const endDate = new Date(startDate.getTime() + service.durationMinutes * 60000);

      // Check buffer: booking must be at least 30 minutes in advance
      const now = getNow();
      if (startDate.getTime() < now.getTime() + 30 * 60000) {
        throw new DomainError('VALIDATION_ERROR', 'Bookings must be scheduled at least 30 minutes in advance');
      }

      // 3. Execute inside transactional lock
      return (db as any).transaction(async (tx: DbHandle) => {
        // Advisory lock on organization and local day
        const localDayKey = `booking_slot:${organizationId}:${startDate.toISOString().slice(0, 10)}`;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${localDayKey}))`);

        // 4. Re-check slot overlap against active busy bookings
        // Overlap condition: start_at < endDate AND COALESCE(end_at, start_at + interval '1 minute' * ${service.durationMinutes}) > startDate
        const overlappingRows = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.organizationId, organizationId),
              or(
                eq(bookings.status, 'PENDING'),
                eq(bookings.status, 'CONFIRMED'),
                eq(bookings.status, 'COMPLETED')
              ),
              sql`${bookings.startAt} < ${endDate}`,
              sql`COALESCE(${bookings.endAt}, ${bookings.startAt} + interval '1 minute' * ${service.durationMinutes}) > ${startDate}`
            )
          );

        if (overlappingRows.length > 0) {
          throw new DomainError('SLOT_UNAVAILABLE', 'The requested time slot is no longer available');
        }

        // 5. Match or create Shared Contact
        const contactRepo = createContactRepository(tx as any, normalizePhone, normalizeEmail);
        const contactFlowRepo = createContactFlowRepository(tx);

        const contact = await contactRepo.matchOrCreate({
          context: orgCtx,
          name: name.trim(),
          phoneRaw,
          email: email?.trim() || undefined,
        });

        // Ensure Flow state exists with interest set to service.name
        const flowProfile = await contactFlowRepo.getOrCreate(orgCtx, contact.id);
        if (flowProfile && !flowProfile.interest) {
          await contactFlowRepo.updateProfile(orgCtx, contact.id, {
            interest: service.name,
            notes: notes?.trim() || null,
          });
        }

        // 6. Delegate canonical booking creation to BookingService
        const bookingService = createBookingService(tx, {
          clock: () => now,
          orgTz: fallbackTz,
        });

        const createdBooking = await bookingService.createBooking(
          orgCtx,
          {
            contactId: contact.id,
            serviceId: service.id,
            startAt: startDate.toISOString(),
            endAt: endDate.toISOString(),
            locationType,
            locationText: locationText || null,
            paymentStatus: 'UNPAID',
            notes: notes?.trim() || null,
          },
          null // System / Anonymous attribution
        );

        const toIso = (val: string | Date | null | undefined): string => {
          if (!val) return '';
          if (typeof val === 'string') return new Date(val).toISOString();
          return (val as Date).toISOString();
        };

        return {
          bookingId: createdBooking.id,
          status: 'PENDING' as const,
          startAt: toIso(createdBooking.startAt),
          endAt: toIso(createdBooking.endAt ?? endDate),
          serviceTitle: service.name,
          amount: createdBooking.amount,
        };
      });
    },
  };
}
