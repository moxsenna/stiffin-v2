import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, count, sql } from 'drizzle-orm';
import { withIntegrationDb, TEST_DATABASE_URL } from './test-env';
import {
  organizations,
  users,
  contacts,
  contactFlowStates,
  services,
  nextActions,
  activities,
} from '../../db/schema';
import { createLocalPromotorFlowAdapter } from '../../adapters/local-promotor-flow-adapter';
import { createBookingService } from '../../services/booking-service';
import { createContactLifecycleService } from '../../services/contact-lifecycle-service';
import { createAssessmentRepository } from '../../repositories/assessment-repository';
import { getNextLocalDay10Am } from '../../domain/next-action-rules';
import { DomainError } from '../../core/errors';
import type { OrganizationContext } from '../../core/organization-context';
import type { AuthenticatedActor } from '../../auth/types';

const enabled = Boolean(TEST_DATABASE_URL);

describe('B6 — Class Integration Seam Integration Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgAId: string;
  let orgBId: string;
  let ctxA: OrganizationContext;
  let ctxB: OrganizationContext;
  let actorA: AuthenticatedActor;

  let contactA1Id: string;
  let contactA2Id: string;
  let contactB1Id: string;
  let serviceAId: string;

  before(async () => {
    await withIntegrationDb(async (db: any) => {
      // Create Org A
      const [orgA] = await db
        .insert(organizations)
        .values({ name: 'Seam Academy A', slug: `seam-a-${Date.now()}` })
        .returning();
      orgAId = orgA.id;
      ctxA = { organizationId: orgAId };

      // Create Org B
      const [orgB] = await db
        .insert(organizations)
        .values({ name: 'Seam Academy B', slug: `seam-b-${Date.now()}` })
        .returning();
      orgBId = orgB.id;
      ctxB = { organizationId: orgBId };

      // Create User for Actor A
      const [uA] = await db
        .insert(users)
        .values({ name: 'Teacher A', email: `teacher-a-${Date.now()}@example.com` })
        .returning();

      actorA = {
        userId: uA.id,
        membershipId: 'mem-a',
        role: 'owner',
      };

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
  // 1. getContactContext (§12, §14)
  // =========================================================================
  describe('1. getContactContext', () => {
    it('returns canonical stage, classification, and null interest on lazy flow state', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });
        const context = await adapter.getContactContext(contactA1Id);

        assert.strictEqual(context.contactId, contactA1Id);
        assert.strictEqual(context.stage, 'NEW');
        assert.strictEqual(context.classification, 'PROSPECT');
        assert.strictEqual(context.interest, null);
        assert.strictEqual(context.primaryNextAction, undefined);
        assert.strictEqual(context.activeBooking, undefined);
      });
    });

    it('returns non-null stored interest when persisted in contact_flow_states', async () => {
      await withIntegrationDb(async (db: any) => {
        const [cInterest] = await db
          .insert(contacts)
          .values({ organizationId: orgAId, name: 'Learner Interest', phoneE164: `+62811${Date.now().toString().slice(-8)}` })
          .returning();

        await db
          .insert(contactFlowStates)
          .values({
            organizationId: orgAId,
            contactId: cInterest.id,
            stage: 'INTERESTED',
            classification: 'PROSPECT',
            interest: 'Kelas Public Speaking Intensif',
          });

        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });
        const context = await adapter.getContactContext(cInterest.id);

        assert.strictEqual(context.contactId, cInterest.id);
        assert.strictEqual(context.stage, 'INTERESTED');
        assert.strictEqual(context.classification, 'PROSPECT');
        assert.strictEqual(context.interest, 'Kelas Public Speaking Intensif');
      });
    });

    it('reflects updated stage, classification (CLIENT), primaryNextAction, and activeBooking', async () => {
      await withIntegrationDb(async (db: any) => {
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
      await withIntegrationDb(async (db: any) => {
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

        // Soft-deleted contact must fail closed with NOT_FOUND
        await assert.rejects(
          async () => adapter.getContactContext(deletedContact.id),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );

        // Non-existent contact must fail closed with NOT_FOUND
        await assert.rejects(
          async () => adapter.getContactContext('00000000-0000-0000-0000-000000000000'),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );
      });
    });

    it('fails closed with NOT_FOUND when querying cross-tenant contact', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });

        // Contact B1 belongs to Org B, querying with Org A context must fail closed
        await assert.rejects(
          async () => adapter.getContactContext(contactB1Id),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );
      });
    });

    it('unbound adapter fails closed with UNAUTHORIZED', async () => {
      await withIntegrationDb(async (db: any) => {
        const unboundAdapter = createLocalPromotorFlowAdapter(db);
        await assert.rejects(
          async () => unboundAdapter.getContactContext(contactA1Id),
          (err: any) => err instanceof DomainError && err.code === 'UNAUTHORIZED'
        );
      });
    });
  });

  // =========================================================================
  // 2. getAssessmentStatus (§12)
  // =========================================================================
  describe('2. getAssessmentStatus', () => {
    it('returns NOT_STARTED when no assessment record exists for active contact', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });
        const status = await adapter.getAssessmentStatus(contactA1Id);
        assert.strictEqual(status, 'NOT_STARTED');
      });
    });

    it('returns canonical assessment status when assessment is recorded', async () => {
      await withIntegrationDb(async (db: any) => {
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

    it('fails closed with NOT_FOUND for non-existent or cross-tenant contact', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });

        // Non-existent contact must fail closed with NOT_FOUND (not UNKNOWN)
        await assert.rejects(
          async () => adapter.getAssessmentStatus('00000000-0000-0000-0000-000000000000'),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );

        // Cross-org contact must fail closed with NOT_FOUND (not UNKNOWN)
        await assert.rejects(
          async () => adapter.getAssessmentStatus(contactB1Id),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );
      });
    });

    it('unbound adapter fails closed with UNAUTHORIZED', async () => {
      await withIntegrationDb(async (db: any) => {
        const unboundAdapter = createLocalPromotorFlowAdapter(db);
        await assert.rejects(
          async () => unboundAdapter.getAssessmentStatus(contactA1Id),
          (err: any) => err instanceof DomainError && err.code === 'UNAUTHORIZED'
        );
      });
    });
  });

  // =========================================================================
  // 3. createNextAction from Learning Signal (§12, §8.6, §8.7)
  // =========================================================================
  describe('3. createNextAction from Learning Signal', () => {
    it('preserves explicit dueAt when provided by Class signal', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA, actor: actorA });
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
      await withIntegrationDb(async (db: any) => {
        const fixedNow = new Date('2026-08-17T03:00:00.000Z'); // 10:00 WIB
        const adapter = createLocalPromotorFlowAdapter(db, {
          ctx: ctxA,
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

    it('enforces idempotency under TRUE PostgreSQL concurrency: duplicate concurrent calls converge to 1 row and 1 activity', async () => {
      const idempotencyKey = `promotorclass:concurrent:${Date.now()}`;

      const payload = {
        organizationId: orgAId,
        contactId: contactA1Id,
        source: 'PROMOTORCLASS' as const,
        sourceEventId: 'evt-concurrent-100',
        actionType: 'FOLLOW_UP' as const,
        title: 'Concurrent Action',
        reason: 'Concurrent trigger test',
        idempotencyKey,
        context: {
          signalType: 'MILESTONE_REACHED',
        },
      };

      // Create two independent PostgreSQL client connections
      const client1 = new Client({ connectionString: TEST_DATABASE_URL });
      const client2 = new Client({ connectionString: TEST_DATABASE_URL });
      await client1.connect();
      await client2.connect();

      try {
        const db1 = drizzle(client1);
        const db2 = drizzle(client2);

        const adapter1 = createLocalPromotorFlowAdapter(db1, { ctx: ctxA, actor: actorA });
        const adapter2 = createLocalPromotorFlowAdapter(db2, { ctx: ctxA, actor: actorA });

        // Launch 2 truly concurrent calls on independent connections
        const [ref1, ref2] = await Promise.all([
          adapter1.createNextAction(payload),
          adapter2.createNextAction(payload),
        ]);

        // Both calls must resolve to the exact same canonical action
        assert.ok(ref1.nextActionId);
        assert.ok(ref2.nextActionId);
        assert.strictEqual(ref1.nextActionId, ref2.nextActionId);
        assert.strictEqual(ref1.id, ref2.id);

        // Verify database state: exactly 1 next_actions row, exactly 1 ACTION_CREATED activity
        await withIntegrationDb(async (db: any) => {
          const [actionCount] = await db
            .select({ c: count() })
            .from(nextActions)
            .where(eq(nextActions.idempotencyKey, idempotencyKey));
          assert.strictEqual(Number(actionCount.c), 1, 'Must persist exactly 1 next_action row');

          const [activityCount] = await db
            .select({ c: count() })
            .from(activities)
            .where(
              and(
                eq(activities.organizationId, orgAId),
                eq(activities.contactId, contactA1Id),
                eq(activities.eventType, 'ACTION_CREATED'),
                sql`metadata_json->>'idempotencyKey' = ${idempotencyKey}`
              )
            );
          assert.strictEqual(Number(activityCount.c), 1, 'Must emit exactly 1 ACTION_CREATED activity');
        });
      } finally {
        await client1.end();
        await client2.end();
      }
    });

    it('unbound adapter rejects createNextAction with UNAUTHORIZED', async () => {
      await withIntegrationDb(async (db: any) => {
        const unboundAdapter = createLocalPromotorFlowAdapter(db);
        await assert.rejects(
          async () =>
            unboundAdapter.createNextAction({
              organizationId: orgAId,
              contactId: contactA1Id,
              source: 'PROMOTORCLASS',
              sourceEventId: 'evt-unbound',
              actionType: 'FOLLOW_UP',
              title: 'Unbound Action',
              reason: 'Should fail',
              idempotencyKey: `promotorclass:unbound:${Date.now()}`,
              context: {},
            }),
          (err: any) => err instanceof DomainError && err.code === 'UNAUTHORIZED'
        );
      });
    });

    it('rejects payload organizationId mismatch with FORBIDDEN', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });
        await assert.rejects(
          async () =>
            adapter.createNextAction({
              organizationId: orgBId, // Mismatch with ctxA
              contactId: contactA1Id,
              source: 'PROMOTORCLASS',
              sourceEventId: 'evt-mismatch',
              actionType: 'FOLLOW_UP',
              title: 'Mismatch Action',
              reason: 'Should fail',
              idempotencyKey: `promotorclass:mismatch:${Date.now()}`,
              context: {},
            }),
          (err: any) => err instanceof DomainError && err.code === 'FORBIDDEN'
        );
      });
    });

    it('fails closed when target contact is cross-org or missing', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });

        // Cross-org contact (contactB1Id belongs to orgB, but bound context is orgA)
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
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA, actor: actorA });
        const idempotencyKey = `promotorclass:act-1:${Date.now()}`;

        await adapter.appendLearningActivity({
          organizationId: orgAId,
          contactId: contactA1Id,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-act-101',
          eventType: 'PROGRAM_COMPLETED',
          summary: 'Learner Ayu menyelesaikan Program Dasar',
          context: {
            programId: 'prog-1',
            score: 95,
          },
          idempotencyKey,
        });

        // Verify activity row written to Flow activities
        const [act] = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.organizationId, orgAId),
              eq(activities.contactId, contactA1Id),
              eq(activities.eventType, 'CLASS_SIGNAL')
            )
          );

        assert.ok(act);
        assert.strictEqual(act.eventType, 'CLASS_SIGNAL');
        assert.strictEqual(act.organizationId, orgAId);
        assert.strictEqual(act.contactId, contactA1Id);
        assert.strictEqual(act.actorUserId, actorA.userId);
        assert.deepStrictEqual(act.metadataJson, {
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-act-101',
          classEventType: 'PROGRAM_COMPLETED',
          summary: 'Learner Ayu menyelesaikan Program Dasar',
          context: {
            programId: 'prog-1',
            score: 95,
          },
          idempotencyKey,
        });
      });
    });

    it('unbound adapter rejects appendLearningActivity with UNAUTHORIZED', async () => {
      await withIntegrationDb(async (db: any) => {
        const unboundAdapter = createLocalPromotorFlowAdapter(db);
        await assert.rejects(
          async () =>
            unboundAdapter.appendLearningActivity({
              organizationId: orgAId,
              contactId: contactA1Id,
              source: 'PROMOTORCLASS',
              sourceEventId: 'evt-unbound-act',
              eventType: 'PROGRAM_COMPLETED',
              summary: 'Summary',
              context: {},
              idempotencyKey: `promotorclass:unbound-act:${Date.now()}`,
            }),
          (err: any) => err instanceof DomainError && err.code === 'UNAUTHORIZED'
        );
      });
    });

    it('rejects payload organizationId mismatch with FORBIDDEN', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });
        await assert.rejects(
          async () =>
            adapter.appendLearningActivity({
              organizationId: orgBId, // Mismatch with ctxA
              contactId: contactA1Id,
              source: 'PROMOTORCLASS',
              sourceEventId: 'evt-mismatch-act',
              eventType: 'PROGRAM_COMPLETED',
              summary: 'Summary',
              context: {},
              idempotencyKey: `promotorclass:mismatch-act:${Date.now()}`,
            }),
          (err: any) => err instanceof DomainError && err.code === 'FORBIDDEN'
        );
      });
    });

    it('fails closed when contact does not exist or is cross-tenant', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA });

        // Missing contact
        await assert.rejects(
          async () =>
            adapter.appendLearningActivity({
              organizationId: orgAId,
              contactId: '00000000-0000-0000-0000-000000000000',
              source: 'PROMOTORCLASS',
              sourceEventId: 'evt-missing',
              eventType: 'PROGRAM_COMPLETED',
              summary: 'Program done',
              context: {},
              idempotencyKey: `promotorclass:missing:${Date.now()}`,
            }),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );

        // Cross-org contact
        await assert.rejects(
          async () =>
            adapter.appendLearningActivity({
              organizationId: orgAId,
              contactId: contactB1Id,
              source: 'PROMOTORCLASS',
              sourceEventId: 'evt-cross',
              eventType: 'PROGRAM_COMPLETED',
              summary: 'Program done',
              context: {},
              idempotencyKey: `promotorclass:cross-act:${Date.now()}`,
            }),
          (err: any) => err instanceof DomainError && err.code === 'NOT_FOUND'
        );
      });
    });
  });

  // =========================================================================
  // 5. Ownership & Boundary Guardrails (§11, §12)
  // =========================================================================
  describe('5. Ownership & Boundary Guardrails', () => {
    it('Flow remains the single source of truth for next_actions', async () => {
      await withIntegrationDb(async (db: any) => {
        const adapter = createLocalPromotorFlowAdapter(db, { ctx: ctxA, actor: actorA });
        const idempotencyKey = `promotorclass:own-1:${Date.now()}`;

        const ref = await adapter.createNextAction({
          organizationId: orgAId,
          contactId: contactA1Id,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-own-1',
          actionType: 'FOLLOW_UP',
          title: 'Ownership Guardrail Action',
          reason: 'Learning event signal',
          context: {},
          idempotencyKey,
        });

        // Verify action exists in Flow next_actions table
        const [action] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.id, ref.nextActionId));

        assert.ok(action);
        assert.strictEqual(action.organizationId, orgAId);
        assert.strictEqual(action.source, 'PROMOTORCLASS');
      });
    });
  });
});
