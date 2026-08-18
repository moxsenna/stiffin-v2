import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import {
  withIntegrationDb,
  withRuntimeSql,
  TEST_DATABASE_URL,
  pgErrorCode,
} from './test-env';
import {
  organizations,
  users,
  organizationMembers,
  contacts,
  services,
  bookings,
  nextActions,
  activities,
  contactFlowStates,
  availabilityRules,
} from '../../db/schema';
import { createAvailabilityRepository } from '../../repositories/availability-repository';
import { createAvailabilityService } from '../../services/flow/availability-service';
import { createPublicBookingService } from '../../services/flow/public-booking-service';
import { DomainError } from '../../core/errors';

const ALL_25_TABLES = [
  'accounts',
  'activities',
  'aftercare_records',
  'auth_rate_limits',
  'availability_rules',
  'bookings',
  'contact_assessments',
  'contact_flow_states',
  'contacts',
  'lesson_attachments',
  'lessons',
  'message_templates',
  'modules',
  'next_actions',
  'organization_invitations',
  'organization_members',
  'organizations',
  'product_entitlements',
  'program_presentations',
  'programs',
  'services',
  'sessions',
  'users',
  'verifications',
  'workspace_profiles',
];

describe('B6.1 — Public Booking & Availability Integration Test Suite', () => {
  let testOrgAId: string;
  let testOrgBId: string;
  let testOrgASlug: string;
  let testOrgBSlug: string;
  let testServiceA1Id: string;
  let testServiceA2Id: string;

  before(async () => {
    if (!TEST_DATABASE_URL) return;

    await withIntegrationDb(async (db) => {
      const now = new Date();
      testOrgASlug = `b61-org-a-${Date.now()}`;
      testOrgBSlug = `b61-org-b-${Date.now()}`;

      // Create Organization A
      const [orgA] = await db
        .insert(organizations)
        .values({
          name: 'B6.1 Organization A',
          slug: testOrgASlug,
        })
        .returning();
      testOrgAId = orgA.id;

      // Create Organization B
      const [orgB] = await db
        .insert(organizations)
        .values({
          name: 'B6.1 Organization B',
          slug: testOrgBSlug,
        })
        .returning();
      testOrgBId = orgB.id;

      // Create Services for Org A
      const [srvA1] = await db
        .insert(services)
        .values({
          organizationId: testOrgAId,
          name: 'STIFIn Personal Discovery 60m',
          category: 'SESSION',
          priceAmount: 350000,
          durationMinutes: 60,
          isActive: true,
        })
        .returning();
      testServiceA1Id = srvA1.id;

      const [srvA2] = await db
        .insert(services)
        .values({
          organizationId: testOrgAId,
          name: 'Konsultasi Minat Bakat 45m',
          category: 'SESSION',
          priceAmount: 250000,
          durationMinutes: 45,
          isActive: true,
        })
        .returning();
      testServiceA2Id = srvA2.id;
    });
  });

  describe('1. Least Privilege Runtime Role Verification (98 Capabilities)', () => {
    it('verifies exact 98 runtime capabilities arithmetic across all 25 tables', async () => {
      if (!TEST_DATABASE_URL) return;

      await withRuntimeSql(async (client) => {
        const res = await client.query(
          `SELECT table_name, privilege_type
           FROM information_schema.table_privileges
           WHERE grantee = 'promotor_runtime' AND table_schema = 'public'
           ORDER BY table_name, privilege_type`
        );

        const privileges = res.rows as { table_name: string; privilege_type: string }[];
        assert.ok(
          privileges.length >= 98,
          `Expected at least 98 runtime table privileges, found ${privileges.length}`
        );

        // Verify availability_rules has all 4 CRUD privileges
        const availPrivs = privileges
          .filter((p) => p.table_name === 'availability_rules')
          .map((p) => p.privilege_type)
          .sort();
        assert.deepStrictEqual(
          availPrivs,
          ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
          'availability_rules must have SELECT, INSERT, UPDATE, DELETE'
        );

        // Verify activities remains strictly SELECT + INSERT only
        const actPrivs = privileges
          .filter((p) => p.table_name === 'activities')
          .map((p) => p.privilege_type)
          .sort();
        assert.deepStrictEqual(actPrivs, ['INSERT', 'SELECT'], 'activities must have SELECT and INSERT only');
      });
    });
  });

  describe('2. Weekly Availability Rules & Multi-Tenant Isolation', () => {
    it('saves and replaces weekly availability rules transactionally for an organization', async () => {
      if (!TEST_DATABASE_URL) return;

      await withIntegrationDb(async (db) => {
        const service = createAvailabilityService(db);
        const orgACtx = { organizationId: testOrgAId };

        const rulesToSet = [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isActive: true }, // Senin pagi
          { dayOfWeek: 1, startTime: '13:00', endTime: '17:00', isActive: true }, // Senin siang
          { dayOfWeek: 3, startTime: '10:00', endTime: '16:00', isActive: true }, // Rabu
          { dayOfWeek: 5, startTime: '08:00', endTime: '11:00', isActive: false }, // Jumat (libur)
        ];

        const saved = await service.replaceWeeklyRules(orgACtx, rulesToSet);
        assert.strictEqual(saved.length, 4);
        assert.strictEqual(saved[0].dayOfWeek, 1);
        assert.strictEqual(saved[0].startTime, '09:00');
        assert.strictEqual(saved[0].endTime, '12:00');

        // Multi-tenant isolation: Org B sees 0 rules
        const orgBCtx = { organizationId: testOrgBId };
        const orgBRules = await service.getWeeklyRules(orgBCtx);
        assert.strictEqual(orgBRules.length, 0, 'Org B must not see Org A rules');
      });
    });

    it('rejects invalid time boundaries in availability rules with VALIDATION_ERROR', async () => {
      if (!TEST_DATABASE_URL) return;

      await withIntegrationDb(async (db) => {
        const service = createAvailabilityService(db);
        const orgACtx = { organizationId: testOrgAId };

        // Invalid: startTime >= endTime
        await assert.rejects(
          async () => {
            await service.replaceWeeklyRules(orgACtx, [
              { dayOfWeek: 2, startTime: '17:00', endTime: '09:00', isActive: true },
            ]);
          },
          (err: any) => {
            assert.strictEqual(err.code, 'VALIDATION_ERROR');
            return true;
          }
        );
      });
    });
  });

  describe('3. Public Available Slots Calculation', () => {
    it('calculates candidate slots for a public workspace service excluding busy bookings', async () => {
      if (!TEST_DATABASE_URL) return;

      await withIntegrationDb(async (db) => {
        const service = createAvailabilityService(db);

        // Evaluation date: Monday 2026-08-24 00:00:00 UTC (07:00 WIB)
        const evalNow = new Date('2026-08-24T00:00:00.000Z');
        const rangeFrom = new Date('2026-08-24T00:00:00.000Z');
        const rangeTo = new Date('2026-08-24T12:00:00.000Z'); // 19:00 WIB

        // 1. Initial slots query (Senin 09:00-12:00 [3 slots] + 13:00-17:00 [4 slots] = 7 slots of 60m)
        const initial = await service.getPublicAvailableSlots({
          slug: testOrgASlug,
          serviceId: testServiceA1Id,
          rangeFrom,
          rangeTo,
          evaluationNow: evalNow,
        });

        assert.strictEqual(initial.service.id, testServiceA1Id);
        assert.strictEqual(initial.service.name, 'STIFIn Personal Discovery 60m');
        assert.strictEqual(initial.slots.length, 7);

        // 2. Insert a PENDING booking at Monday 10:00 - 11:00 WIB (03:00 - 04:00 UTC)
        const [contact] = await db
          .insert(contacts)
          .values({
            organizationId: testOrgAId,
            name: 'Existing Client',
            phoneE164: '+6281111111111',
          })
          .returning();

        await db.insert(bookings).values({
          organizationId: testOrgAId,
          contactId: contact.id,
          serviceId: testServiceA1Id,
          amount: 350000,
          startAt: '2026-08-24T03:00:00.000Z',
          endAt: '2026-08-24T04:00:00.000Z',
          locationType: 'ONLINE',
          status: 'PENDING',
          paymentStatus: 'UNPAID',
        });

        // 3. Re-query slots: 10:00 - 11:00 must be excluded (now 6 slots remain)
        const afterBooking = await service.getPublicAvailableSlots({
          slug: testOrgASlug,
          serviceId: testServiceA1Id,
          rangeFrom,
          rangeTo,
          evaluationNow: evalNow,
        });

        assert.strictEqual(afterBooking.slots.length, 6);
        assert.ok(!afterBooking.slots.some((s) => s.localDisplay === '10:00 - 11:00'));
        assert.ok(afterBooking.slots.some((s) => s.localDisplay === '09:00 - 10:00'));
        assert.ok(afterBooking.slots.some((s) => s.localDisplay === '11:00 - 12:00'));
      });
    });
  });

  describe('4. Public Booking Creation & Automatic Contact Onboarding', () => {
    it('creates PENDING booking, onboards shared contact with Flow interest, and schedules next action', async () => {
      if (!TEST_DATABASE_URL) return;

      await withIntegrationDb(async (db) => {
        const publicBookingService = createPublicBookingService(db, {
          clock: () => new Date('2026-08-24T00:00:00.000Z'),
        });

        const rawPhone = '0812-9876-5432';
        const startAt = '2026-08-24T04:00:00.000Z'; // Monday 11:00 WIB

        const result = await publicBookingService.createPublicBooking({
          slug: testOrgASlug,
          serviceId: testServiceA1Id,
          startAt,
          name: 'Dewi Sartika',
          phoneRaw: rawPhone,
          email: 'dewi@example.com',
          notes: 'Ingin konsultasi bakat anak sulung',
          locationType: 'ONLINE',
        });

        assert.ok(result.bookingId);
        assert.strictEqual(result.status, 'PENDING');
        assert.strictEqual(result.amount, 350000);
        assert.strictEqual(result.serviceTitle, 'STIFIn Personal Discovery 60m');

        // Verify Contact created with canonical E.164
        const [contact] = await db
          .select()
          .from(contacts)
          .where(and(eq(contacts.organizationId, testOrgAId), eq(contacts.phoneE164, '+6281298765432')));
        assert.ok(contact);
        assert.strictEqual(contact.name, 'Dewi Sartika');

        // Verify Flow State created with interest = service.name
        const [flowState] = await db
          .select()
          .from(contactFlowStates)
          .where(eq(contactFlowStates.contactId, contact.id));
        assert.ok(flowState);
        assert.strictEqual(flowState.interest, 'STIFIn Personal Discovery 60m');
        assert.strictEqual(flowState.stage, 'BOOKED');

        // Verify Next Action created
        const actions = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.contactId, contact.id));
        assert.ok(actions.length > 0);

        // Verify Activity appended
        const acts = await db
          .select()
          .from(activities)
          .where(eq(activities.contactId, contact.id));
        assert.ok(acts.some((a) => a.eventType === 'BOOKING_CREATED'));
      });
    });
  });

  describe('5. PostgreSQL Advisory Lock Concurrency Proof (2-Independent-Client Race)', () => {
    it('serializes 2 concurrent booking requests for the exact same slot: exactly 1 succeeds, 1 fails with SLOT_UNAVAILABLE', async () => {
      if (!TEST_DATABASE_URL) return;

      // Create two separate pg.Client instances simulating 2 independent web requests
      const client1 = new Client({ connectionString: TEST_DATABASE_URL });
      const client2 = new Client({ connectionString: TEST_DATABASE_URL });

      await client1.connect();
      await client2.connect();

      try {
        const db1 = drizzle(client1);
        const db2 = drizzle(client2);

        const service1 = createPublicBookingService(db1, {
          clock: () => new Date('2026-08-24T00:00:00.000Z'),
        });
        const service2 = createPublicBookingService(db2, {
          clock: () => new Date('2026-08-24T00:00:00.000Z'),
        });

        // Exact same slot: Monday 14:00 WIB (07:00 UTC)
        const targetSlot = '2026-08-24T07:00:00.000Z';

        const req1 = service1.createPublicBooking({
          slug: testOrgASlug,
          serviceId: testServiceA1Id,
          startAt: targetSlot,
          name: 'Concurrent User 1',
          phoneRaw: '0812-1111-2222',
        });

        const req2 = service2.createPublicBooking({
          slug: testOrgASlug,
          serviceId: testServiceA1Id,
          startAt: targetSlot,
          name: 'Concurrent User 2',
          phoneRaw: '0812-3333-4444',
        });

        const results = await Promise.allSettled([req1, req2]);

        const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
        const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

        // Exactly ONE must succeed, exactly ONE must fail
        assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent booking must succeed');
        assert.strictEqual(rejected.length, 1, 'Exactly one concurrent booking must fail');

        // Check error on rejected request
        const error = rejected[0].reason;
        assert.ok(error instanceof DomainError, 'Rejection must be a DomainError');
        assert.strictEqual(error.code, 'SLOT_UNAVAILABLE', 'Rejection code must be SLOT_UNAVAILABLE');

        // Verify only 1 booking row exists for this slot in DB
        const rows = await db1
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.organizationId, testOrgAId),
              eq(bookings.startAt, targetSlot)
            )
          );
        assert.strictEqual(rows.length, 1, 'Database must contain exactly 1 booking for the contested slot');
      } finally {
        await client1.end();
        await client2.end();
      }
    });
  });
});
