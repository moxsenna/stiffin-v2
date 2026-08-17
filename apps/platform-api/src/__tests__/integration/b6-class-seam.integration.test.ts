import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { eq, and, count } from 'drizzle-orm';
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
  contactFlowStates,
  nextActions,
  contactAssessments,
  activities,
} from '../../db/schema';
import { createLocalPromotorFlowAdapter } from '../../adapters/local-promotor-flow-adapter';
import { createContactLifecycleService } from '../../services/contact-lifecycle-service';
import { createBookingService } from '../../services/booking-service';
import { createAssessmentService } from '../../services/assessment-service';
import { createAssessmentRepository } from '../../repositories/assessment-repository';
import type { AuthenticatedActor } from '../../auth/types';
import { DomainError } from '../../core/errors';
import { getNextLocalDay10Am } from '../../domain/next-action-rules';

const enabled = Boolean(TEST_DATABASE_URL);

describe('B6 — Class Integration Seam Integration Suite (PR 6 / Contract §12)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let contactA1Id: string;
  let contactA2Id: string;
  let contactB1Id: string;
  let serviceAId: string;

  const actorA: AuthenticatedActor = {
    userId: '',
    membershipId: 'mem-a',
    role: 'owner',
  };

  const ctxA = { organizationId: '' };
  const ctxB = { organizationId: '' };

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      // Create Tenant A
      const [orgA] = await db
        .insert(organizations)
        .values({ name: 'Tenant A Class Seam', slug: `org-a-seam-${Date.now()}` })
        .returning();
      orgAId = orgA.id;
      ctxA.organizationId = orgAId;

      // Create Tenant B
      const [orgB] = await db
        .insert(organizations)
        .values({ name: 'Tenant B Class Seam', slug: `org-b-seam-${Date.now()}` })
        .returning();
      orgBId = orgB.id;
      ctxB.organizationId = orgBId;

      // Create User
      const [uA] = await db
        .insert(users)
        .values({ name: 'Operator A', email: `op-seam-${Date.now()}@example.com` })
        .returning();
      userAId = uA.id;
      actorA.userId = userAId;

      // Create Contacts for Org A
      const [cA1] = await db
        .insert(contacts)
        .values({ organizationId: orgAId, name: 'Learner Ayu', phoneE164: '+6281111111111' })
        .returning();
      contactA1Id = cA1.id;

      const [cA2] = await db
        .insert(contacts)
        .values({ organizationId: orgAId, name: 'Learner Budi', phoneE164: '+6281111111112' })
        .returning();
      contactA2Id = cA2.id;

      // Create Contact for Org B
      const [cB1] = await db
        .insert(contacts)
        .values({ organizationId: orgBId, name: 'Learner Citra', phoneE164: '+6281111111113' })
        .returning();
      contactB1Id = cB1.id;

      // Create Service for Org A
      const [sA] = await db
        .insert(services)
        .values({
          organizationId: orgAId,
          name: 'Konsultasi Belajar',
          category: 'SESSION',
          priceAmount: 150000,
          durationMinutes: 45,
          isActive: true,
        })
        .returning();
      serviceAId = sA.id;
    });
  });

  // =========================================================================
  // 1. getContactContext (§12)
  // =========================================================================
  describe('1. getContactContext', () => {
    it('returns canonical stage and classification (PROSPECT / default NEW)', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });
        const context = await adapter.getContactContext(contactA1Id);

        assert.strictEqual(context.contactId, contactA1Id);
        assert.strictEqual(context.stage, 'NEW');
        assert.strictEqual(context.classification, 'PROSPECT');
        assert.strictEqual(context.primaryNextAction, undefined);
        assert.strictEqual(context.activeBooking, undefined);
      });
    });

    it('reflects updated stage, classification (CLIENT), primaryNextAction, and activeBooking', async () => {
      await withIntegrationDb(async (db) => {
        const now = new Date('2026-08-17T10:00:00.000Z');
        const bookingService = createBookingService(db, { clock: () => now });
        const lifecycleService = createContactLifecycleService(db, { clock: () => now });

        // 1. Transition contact to INTERESTED
        await lifecycleService.transitionStage(ctxA, contactA2Id, 'INTERESTED', {}, actorA);

        // 2. Create Booking for contactA2
        const startAt = new Date(now.getTime() + 24 * 3600_000).toISOString();
        const booking = await bookingService.createBooking(
          ctxA,
          {
            contactId: contactA2Id,
            serviceId: serviceAId,
            startAt,
            locationType: 'ONLINE',
          },
          actorA
        );

        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA, clock: () => now });
        const context = await adapter.getContactContext(contactA2Id);

        assert.strictEqual(context.contactId, contactA2Id);
        assert.strictEqual(context.stage, 'BOOKED');
        assert.strictEqual(context.classification, 'PROSPECT');

        // Check activeBooking projection
        assert.ok(context.activeBooking, 'activeBooking must be present');
        assert.strictEqual(context.activeBooking.id, booking.id);
        assert.strictEqual(context.activeBooking.serviceId, serviceAId);
        assert.strictEqual(context.activeBooking.status, 'PENDING');

        // Check primaryNextAction
        assert.ok(context.primaryNextAction, 'primaryNextAction must be present');
        assert.strictEqual(typeof context.primaryNextAction.id, 'string');
        assert.strictEqual(typeof context.primaryNextAction.type, 'string');
      });
    });

    it('fails closed with NOT_FOUND for soft-deleted or non-existent contact', async () => {
      await withIntegrationDb(async (db) => {
        // Soft delete a contact
        const [deletedContact] = await db
          .insert(contacts)
          .values({
            organizationId: orgAId,
            name: 'Deleted Learner',
            phoneE164: '+6281999999999',
            deletedAt: new Date().toISOString(),
          })
          .returning();

        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });

        await assert.rejects(
          async () => adapter.getContactContext(deletedContact.id),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );

        await assert.rejects(
          async () => adapter.getContactContext('00000000-0000-0000-0000-000000000000'),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );
      });
    });

    it('fails closed when querying cross-organization contact', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });

        // Contact B1 belongs to Org B, querying with Org A context must fail closed
        await assert.rejects(
          async () => adapter.getContactContext(contactB1Id),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );
      });
    });
  });

  // =========================================================================
  // 2. getAssessmentStatus (§12)
  // =========================================================================
  describe('2. getAssessmentStatus', () => {
    it('returns NOT_STARTED when no assessment record exists for active contact', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });
        const status = await adapter.getAssessmentStatus(contactA1Id);
        assert.strictEqual(status, 'NOT_STARTED');
      });
    });

    it('returns canonical assessment status when assessment is recorded', async () => {
      await withIntegrationDb(async (db) => {
        const assessmentRepo = createAssessmentRepository(db);
        await assessmentRepo.getOrCreate(ctxA, contactA1Id);
        await assessmentRepo.updateStatus(
          ctxA,
          contactA1Id,
          'COMPLETED',
          null,
          new Date().toISOString(),
          'Penilaian awal selesai, profil kuat'
        );

        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });
        const status = await adapter.getAssessmentStatus(contactA1Id);
        assert.strictEqual(status, 'COMPLETED');
      });
    });

    it('returns UNKNOWN for non-existent or cross-tenant contact', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });
        const statusMissing = await adapter.getAssessmentStatus('00000000-0000-0000-0000-000000000000');
        assert.strictEqual(statusMissing, 'UNKNOWN');

        const statusCrossOrg = await adapter.getAssessmentStatus(contactB1Id);
        assert.strictEqual(statusCrossOrg, 'UNKNOWN');
      });
    });
  });

  // =========================================================================
  // 3. createNextAction from Learning Signal (§12, §8.6, §8.7)
  // =========================================================================
  describe('3. createNextAction from Learning Signal', () => {
    it('preserves explicit dueAt when provided by Class signal', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, { actor: actorA });
        const explicitDue = '2026-08-20T14:30:00.000Z';
        const idempotencyKey = `promotorclass:evt-due-1:${Date.now()}`;

        const ref = await adapter.createNextAction({
          organizationId: orgAId,
          contactId: contactA1Id,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-101',
          sourceSignalId: 'sig-201',
          actionType: 'FOLLOW_UP',
          title: 'Follow-up Bab 1 Selesai',
          reason: 'Learner telah menyelesaikan modul pengantar',
          dueAt: explicitDue,
          context: {
            programId: 'prog-1',
            programTitle: 'Dasar Kepemimpinan',
            intentLabel: 'hot',
          },
          idempotencyKey,
        });

        assert.strictEqual(ref.id, idempotencyKey);
        assert.strictEqual(ref.contactId, contactA1Id);
        assert.strictEqual(ref.title, 'Follow-up Bab 1 Selesai');

        // Check persisted nextAction in DB
        const [row] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.id, ref.nextActionId));

        assert.ok(row);
        assert.strictEqual(new Date(row.dueAt).toISOString(), explicitDue);
        assert.strictEqual(row.priority, 70, 'FOLLOW_UP default priority must be 70');
        assert.strictEqual(row.source, 'PROMOTORCLASS');
        assert.strictEqual(row.sourceEventId, 'evt-101');
        assert.strictEqual(row.sourceSignalId, 'sig-201');
        assert.strictEqual(row.idempotencyKey, idempotencyKey);
        assert.deepStrictEqual(row.contextJson, {
          programId: 'prog-1',
          programTitle: 'Dasar Kepemimpinan',
          intentLabel: 'hot',
        });

        // Check ACTION_CREATED activity emission
        const [act] = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.organizationId, orgAId),
              eq(activities.contactId, contactA1Id),
              eq(activities.eventType, 'ACTION_CREATED')
            )
          )
          .orderBy(activities.occurredAt);

        assert.ok(act);
        assert.strictEqual(act.eventType, 'ACTION_CREATED');
      });
    });

    it('computes deterministic fallback dueAt (next local day 10:00) when dueAt is omitted', async () => {
      await withIntegrationDb(async (db) => {
        const fixedNow = new Date('2026-08-17T03:00:00.000Z'); // 10:00 WIB
        const adapter = createLocalPromotorFlowAdapter(db, {
          actor: actorA,
          clock: () => fixedNow,
          orgTz: 'Asia/Jakarta',
        });

        const expectedFallbackDue = getNextLocalDay10Am(fixedNow, 'Asia/Jakarta');
        const idempotencyKey = `promotorclass:evt-nodue-1:${Date.now()}`;

        const ref = await adapter.createNextAction({
          organizationId: orgAId,
          contactId: contactA1Id,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-102',
          actionType: 'MANUAL',
          title: 'Kontak Manual Sinyal Belajar',
          reason: 'Perlu verifikasi kebutuhan khusus',
          context: {
            programId: 'prog-2',
            intentLabel: 'warm',
          },
          idempotencyKey,
        });

        const [row] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.id, ref.nextActionId));

        assert.ok(row);
        assert.strictEqual(
          new Date(row.dueAt).toISOString(),
          expectedFallbackDue.toISOString(),
          'Omitted dueAt must deterministically resolve to next local day 10:00'
        );
        assert.strictEqual(row.priority, 40, 'MANUAL default priority must be 40');
        assert.strictEqual(row.source, 'PROMOTORCLASS');
      });
    });

    it('enforces idempotency: repeat request returns existing ref without duplicating rows or activities', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, { actor: actorA });
        const idempotencyKey = `promotorclass:evt-repeat-1:${Date.now()}`;

        const payload = {
          organizationId: orgAId,
          contactId: contactA1Id,
          source: 'PROMOTORCLASS' as const,
          sourceEventId: 'evt-repeat-100',
          actionType: 'FOLLOW_UP' as const,
          title: 'Idempotency Action',
          reason: 'First trigger',
          idempotencyKey,
          context: {
            signalType: 'MILESTONE_REACHED',
          },
        };

        // First call
        const firstRef = await adapter.createNextAction(payload);
        assert.ok(firstRef.nextActionId);

        // Count rows and activities before second call
        const [actionCountBefore] = await db
          .select({ c: count() })
          .from(nextActions)
          .where(eq(nextActions.idempotencyKey, idempotencyKey));
        assert.strictEqual(Number(actionCountBefore.c), 1);

        // Second call with same idempotencyKey
        const secondRef = await adapter.createNextAction(payload);

        assert.strictEqual(secondRef.nextActionId, firstRef.nextActionId);
        assert.strictEqual(secondRef.id, firstRef.id);

        // Verify still exactly 1 row in DB
        const [actionCountAfter] = await db
          .select({ c: count() })
          .from(nextActions)
          .where(eq(nextActions.idempotencyKey, idempotencyKey));
        assert.strictEqual(Number(actionCountAfter.c), 1);
      });
    });

    it('fails closed when target contact is cross-org or missing', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db);

        // Cross-org contact (contactB1Id belongs to orgB, but request declares orgAId)
        await assert.rejects(
          async () =>
            adapter.createNextAction({
              organizationId: orgAId,
              contactId: contactB1Id,
              source: 'PROMOTORCLASS',
              sourceEventId: 'evt-cross',
              actionType: 'FOLLOW_UP',
              title: 'Cross org action',
              reason: 'Invalid cross org',
              idempotencyKey: `promotorclass:cross:${Date.now()}`,
              context: {},
            }),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );
      });
    });
  });

  // =========================================================================
  // 4. appendLearningActivity (§12, §11)
  // =========================================================================
  describe('4. appendLearningActivity', () => {
    it('appends CLASS_SIGNAL activity with projection payload', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, { actor: actorA });
        const idempotencyKey = `promotorclass:act-1:${Date.now()}`;

        await adapter.appendLearningActivity({
          organizationId: orgAId,
          contactId: contactA1Id,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-act-101',
          eventType: 'PROGRAM_COMPLETED',
          summary: 'Learner menyelesaikan program kepemimpinan',
          context: {
            programId: 'prog-leadership-1',
            completedLessonsCount: 12,
          },
          idempotencyKey,
        });

        const rows = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.organizationId, orgAId),
              eq(activities.contactId, contactA1Id),
              eq(activities.eventType, 'CLASS_SIGNAL')
            )
          );

        const targetActivity = rows.find(
          (r) => (r.metadataJson as any)?.sourceEventId === 'evt-act-101'
        );
        assert.ok(targetActivity, 'CLASS_SIGNAL activity must be persisted in Flow activities table');
        assert.strictEqual(targetActivity.eventType, 'CLASS_SIGNAL');
        assert.strictEqual((targetActivity.metadataJson as any)?.classEventType, 'PROGRAM_COMPLETED');
        assert.strictEqual((targetActivity.metadataJson as any)?.summary, 'Learner menyelesaikan program kepemimpinan');
        assert.strictEqual((targetActivity.metadataJson as any)?.idempotencyKey, idempotencyKey);
      });
    });

    it('fails closed when appending learning activity for cross-org or deleted contact', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db);

        await assert.rejects(
          async () =>
            adapter.appendLearningActivity({
              organizationId: orgAId,
              contactId: contactB1Id,
              source: 'PROMOTORCLASS',
              sourceEventId: 'evt-act-cross',
              eventType: 'LEARNING_SIGNAL',
              summary: 'Cross org signal',
              context: {},
              idempotencyKey: `promotorclass:act-cross:${Date.now()}`,
            }),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );
      });
    });
  });

  // =========================================================================
  // 5. Ownership & Boundary Guardrails
  // =========================================================================
  describe('5. Ownership & Boundary Guardrails', () => {
    it('Flow remains the single source of truth for next_actions without copying Class reflection tables', async () => {
      await withIntegrationDb(async (db) => {
        // Assert adapter produces Flow canonical nextAction without requiring Class reflection schemas in Flow
        const adapter = createLocalPromotorFlowAdapter(db, { actor: actorA });
        const idempotencyKey = `promotorclass:boundary:${Date.now()}`;

        const ref = await adapter.createNextAction({
          organizationId: orgAId,
          contactId: contactA1Id,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-b-1',
          actionType: 'FOLLOW_UP',
          title: 'Reflect on Module 1',
          reason: 'Student completed reflection',
          context: {
            intentLabel: 'hot',
          },
          idempotencyKey,
        });

        const [row] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.id, ref.nextActionId));

        assert.ok(row);
        assert.strictEqual(row.source, 'PROMOTORCLASS');
        // Verified: Flow next_action only contains contextual reference, not raw reflection entity
      });
    });
  });
});
