import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMigrationsAsOwner,
  TEST_DATABASE_URL,
  withIntegrationDb,
} from './test-env';
import {
  organizations,
  users,
  contacts,
  services,
  bookings,
} from '../../db/schema';
import { createBookingService } from '../../services/booking-service';
import { createRevenueSettingsService } from '../../services/revenue-settings-service';
import { createBookingRepository } from '../../repositories/booking-repository';
import type { AuthenticatedActor } from '../../auth/types';

const enabled = Boolean(TEST_DATABASE_URL);

describe('C7 — Revenue paid_at + commission settings (tenant scoped)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgAId = '';
  let orgBId = '';
  const ctxA = { organizationId: '' };
  const ctxB = { organizationId: '' };
  const actorA: AuthenticatedActor = { userId: '', membershipId: 'mem-a', role: 'owner' };
  let contactAId = '';
  let serviceAId = '';

  before(async () => {
    await applyMigrationsAsOwner();
    await withIntegrationDb(async (db) => {
      const [orgA] = await db
        .insert(organizations)
        .values({ name: 'Tenant A Revenue', slug: `org-a-rev-${Date.now()}` })
        .returning();
      orgAId = orgA.id;
      ctxA.organizationId = orgAId;

      const [orgB] = await db
        .insert(organizations)
        .values({ name: 'Tenant B Revenue', slug: `org-b-rev-${Date.now()}` })
        .returning();
      orgBId = orgB.id;
      ctxB.organizationId = orgBId;

      const [uA] = await db
        .insert(users)
        .values({ name: 'Operator A', email: `op-a-rev-${Date.now()}@example.com` })
        .returning();
      actorA.userId = uA.id;

      const [cA] = await db
        .insert(contacts)
        .values({ organizationId: orgAId, name: 'Contact A', phoneE164: '+6281100000099' })
        .returning();
      contactAId = cA.id;

      const [sA] = await db
        .insert(services)
        .values({
          organizationId: orgAId,
          name: 'Tes Bakat',
          category: 'ASSESSMENT',
          priceAmount: 500000,
          durationMinutes: 90,
          isActive: true,
        })
        .returning();
      serviceAId = sA.id;
    });
  });

  it('markPaid set paidAt + listPaid tenant-scoped', async () => {
    await withIntegrationDb(async (db) => {
      const bookingService = createBookingService(db);
      const booking = await bookingService.createBooking(
        ctxA,
        {
          contactId: contactAId,
          serviceId: serviceAId,
          startAt: new Date('2026-09-10T02:00:00.000Z').toISOString(),
          locationType: 'ONLINE',
        },
        actorA
      );

      const paid = await bookingService.markPaid(ctxA, booking.id, 'PAID', actorA);
      assert.equal(paid.paymentStatus, 'PAID');
      assert.ok((paid as any).paidAt, 'markPaid harus set paidAt');

      const repo = createBookingRepository(db);
      const paidA = await repo.listPaid(ctxA);
      assert.ok(paidA.some((b) => b.id === booking.id));

      const paidB = await repo.listPaid(ctxB);
      assert.ok(!paidB.some((b) => b.id === booking.id), 'tenant B tidak boleh lihat booking tenant A');

      await db.delete(bookings);
    });
  });

  it('revenue settings default 0, update tenant-scoped, validasi 0-100 di kontrak', async () => {
    const { UpdateRevenueSettingsRequestSchema } = await import('@promotor/contracts');
    await withIntegrationDb(async (db) => {
      const svc = createRevenueSettingsService(db);
      const initial = await svc.get(ctxA);
      assert.equal(initial.commissionPercent, 0);

      const updated = await svc.update(ctxA, 10);
      assert.equal(updated.commissionPercent, 10);

      const other = await svc.get(ctxB);
      assert.equal(other.commissionPercent, 0);

      assert.equal(UpdateRevenueSettingsRequestSchema.safeParse({ commissionPercent: 101 }).success, false);
      assert.equal(UpdateRevenueSettingsRequestSchema.safeParse({ commissionPercent: -1 }).success, false);

      await svc.update(ctxA, 0);
      void orgBId;
    });
  });
});
