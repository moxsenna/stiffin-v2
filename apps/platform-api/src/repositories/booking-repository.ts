import { eq, and, isNull, gte, lte, asc, desc, sql } from 'drizzle-orm';
import { bookings, contacts, services, BookingRow, NewBookingRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';
import type { DbHandle } from '../db/client';

export type CreateBookingInput = Omit<NewBookingRow, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;

export interface ListBookingsOrgOptions {
  contactId?: string;
  status?: string;
  from?: string;
  to?: string;
  includeCompleted?: boolean;
}

export interface BookingRepository {
  create(ctx: OrganizationContext, input: CreateBookingInput, idempotencyKey?: string | null): Promise<BookingRow>;
  findById(ctx: OrganizationContext, id: string): Promise<BookingRow | null>;
  listByOrg(ctx: OrganizationContext, opts?: ListBookingsOrgOptions): Promise<BookingRow[]>;
  listByContact(ctx: OrganizationContext, contactId: string): Promise<BookingRow[]>;
  lockById(ctx: OrganizationContext, id: string): Promise<BookingRow | null>;
  updateStatus(ctx: OrganizationContext, id: string, status: string): Promise<BookingRow | null>;
  updatePayment(ctx: OrganizationContext, id: string, paymentStatus: string): Promise<BookingRow | null>;
  reschedule(ctx: OrganizationContext, id: string, startAt: string, endAt?: string | null): Promise<BookingRow | null>;
  markCompleted(ctx: OrganizationContext, id: string, completedAt: string): Promise<BookingRow | null>;
}

export function createBookingRepository(db: DbHandle): BookingRepository {
  return {
    async create(ctx, input, idempotencyKey) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      // Tenant parent verification (fail-closed): Contact must be active in tenant
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
        throw new DomainError('NOT_FOUND', 'Active tenant contact is required to create a booking');
      }

      // Tenant parent verification (fail-closed): Service must be active in tenant
      const [service] = await db
        .select({ id: services.id, name: services.name })
        .from(services)
        .where(
          and(
            eq(services.id, input.serviceId),
            eq(services.organizationId, ctx.organizationId),
            eq(services.isActive, true)
          )
        )
        .limit(1);

      if (!service) {
        throw new DomainError('NOT_FOUND', 'Active tenant service is required to create a booking');
      }

      const now = new Date().toISOString();
      const rows = await db
        .insert(bookings)
        .values({
          id: sql`gen_random_uuid()`,
          organizationId: ctx.organizationId,
          contactId: input.contactId,
          serviceId: input.serviceId,
          amount: input.amount,
          startAt: input.startAt,
          endAt: input.endAt ?? null,
          locationType: input.locationType ?? 'ONLINE',
          locationText: input.locationText ?? null,
          status: input.status ?? 'PENDING',
          paymentStatus: input.paymentStatus ?? 'UNPAID',
          notes: input.notes ?? null,
          idempotencyKey: idempotencyKey ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        ...rows[0],
        serviceTitle: service ? (service as any).name : undefined,
      } as any;
    },

    async findById(ctx, id) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .select({
          booking: bookings,
          serviceName: services.name,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(
          and(
            eq(bookings.organizationId, ctx.organizationId),
            eq(bookings.id, id)
          )
        )
        .limit(1);

      if (!rows[0]) return null;
      return {
        ...rows[0].booking,
        serviceTitle: rows[0].serviceName ?? 'Sesi Konsultasi',
      } as any;
    },

    async listByOrg(ctx, opts = {}) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const conditions = [eq(bookings.organizationId, ctx.organizationId)];

      if (opts.contactId) {
        conditions.push(eq(bookings.contactId, opts.contactId));
      }

      if (opts.status) {
        conditions.push(eq(bookings.status, opts.status));
      } else if (opts.includeCompleted === false) {
        conditions.push(sql`${bookings.status} <> 'COMPLETED'`);
      }

      if (opts.from) {
        conditions.push(gte(bookings.startAt, opts.from));
      }
      if (opts.to) {
        conditions.push(lte(bookings.startAt, opts.to));
      }

      const rows = await db
        .select({
          booking: bookings,
          serviceName: services.name,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(and(...conditions))
        .orderBy(asc(bookings.startAt));

      return rows.map((r) => ({
        ...r.booking,
        serviceTitle: r.serviceName ?? 'Sesi Konsultasi',
      })) as any;
    },

    async listByContact(ctx, contactId) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .select({
          booking: bookings,
          serviceName: services.name,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(
          and(
            eq(bookings.organizationId, ctx.organizationId),
            eq(bookings.contactId, contactId)
          )
        )
        .orderBy(desc(bookings.startAt));

      return rows.map((r) => ({
        ...r.booking,
        serviceTitle: r.serviceName ?? 'Sesi Konsultasi',
      })) as any;
    },

    async lockById(ctx, id) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const res = await db.execute(sql`
        SELECT * FROM bookings
        WHERE organization_id = ${ctx.organizationId} AND id = ${id}
        FOR UPDATE
      `);

      const raw = res.rows[0];
      if (!raw) return null;

      return {
        id: raw.id,
        organizationId: raw.organization_id,
        contactId: raw.contact_id,
        serviceId: raw.service_id,
        amount: Number(raw.amount),
        startAt: typeof raw.start_at === 'string' ? raw.start_at : new Date(raw.start_at).toISOString(),
        endAt: raw.end_at ? (typeof raw.end_at === 'string' ? raw.end_at : new Date(raw.end_at).toISOString()) : null,
        locationType: raw.location_type,
        locationText: raw.location_text,
        status: raw.status,
        paymentStatus: raw.payment_status,
        notes: raw.notes,
        completedAt: raw.completed_at
          ? typeof raw.completed_at === 'string'
            ? raw.completed_at
            : new Date(raw.completed_at).toISOString()
          : null,
        idempotencyKey: raw.idempotency_key,
        createdAt: typeof raw.created_at === 'string' ? raw.created_at : new Date(raw.created_at).toISOString(),
        updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : new Date(raw.updated_at).toISOString(),
      } as BookingRow;
    },

    async updateStatus(ctx, id, status) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .update(bookings)
        .set({
          status,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(bookings.organizationId, ctx.organizationId),
            eq(bookings.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    },

    async updatePayment(ctx, id, paymentStatus) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .update(bookings)
        .set({
          paymentStatus,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(bookings.organizationId, ctx.organizationId),
            eq(bookings.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    },

    async reschedule(ctx, id, startAt, endAt) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .update(bookings)
        .set({
          startAt,
          endAt: endAt ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(bookings.organizationId, ctx.organizationId),
            eq(bookings.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    },

    async markCompleted(ctx, id, completedAt) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .update(bookings)
        .set({
          status: 'COMPLETED',
          completedAt,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(bookings.organizationId, ctx.organizationId),
            eq(bookings.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    },
  };
}
