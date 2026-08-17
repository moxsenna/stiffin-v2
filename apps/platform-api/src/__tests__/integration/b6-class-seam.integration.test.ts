import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { eq, and, isNull } from 'drizzle-orm';
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
import { createContactFlowService } from '../../services/contact-flow-service';
import { createContactLifecycleService } from '../../services/contact-lifecycle-service';
import { createBookingService } from '../../services/booking-service';
import { createNextActionService } from '../../services/next-action-service';
import { createAssessmentService } from '../../services/assessment-service';
import { createAssessmentRepository } from '../../repositories/assessment-repository';
import type { OrganizationContext } from '../../core/organization-context';
import type { AuthenticatedActor } from '../../auth/types';
import { DomainError, isDomainError } from '../../core/errors';
import type { LearningNextActionRequest, LearningActivityProjection } from '@promotor/contracts';

const enabled = Boolean(TEST_DATABASE_URL);

describe('B6 — Class Integration Seam Integration Suite (§11 & Canonical Contract)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;

  const ctxA: OrganizationContext = { organizationId: '' };
  const ctxB: OrganizationContext = { organizationId: '' };

  const actorA: AuthenticatedActor = {
    userId: '',
    membershipId: 'mem_a_seam',
    role: 'owner',
  };

  let contactAId: string;
  let serviceAId: string;
  let bookingAId: string;
  let contactBId: string;

  before(async () => {
    await applyMigrationsAsOwner();

    if (!enabled) return;

    await withIntegrationDb(async (db) => {
      // 1. Organizations
      const [orgA] = await db
        .insert(organizations)
        .values({ name: 'Class Seam Org A', slug: `class-seam-a-${Date.now()}` })
        .returning();
      orgAId = orgA.id;
      ctxA.organizationId = orgAId;

      const [orgB] = await db
        .insert(organizations)
        .values({ name: 'Class Seam Org B', slug: `class-seam-b-${Date.now()}` })
        .returning();
      orgBId = orgB.id;
      ctxB.organizationId = orgBId;

      // 2. Users
      const [uA] = await db
        .insert(users)
        .values({ name: 'Operator A', email: `op_a_seam_${Date.now()}@promotor.id` })
        .returning();
      userAId = uA.id;
      actorA.userId = userAId;

      const [uB] = await db
        .insert(users)
        .values({ name: 'Operator B', email: `op_b_seam_${Date.now()}@promotor.id` })
        .returning();
      userBId = uB.id;

      // 3. Contacts
      const [cA] = await db
        .insert(contacts)
        .values({
          organizationId: orgAId,
          name: 'Learner Contact A',
          phoneE164: '+6281299990101',
          email: 'learner_a@promotor.id',
        })
        .returning();
      contactAId = cA.id;

      const [cB] = await db
        .insert(contacts)
        .values({
          organizationId: orgBId,
          name: 'Learner Contact B',
          phoneE164: '+6281299990202',
          email: 'learner_b@promotor.id',
        })
        .returning();
      contactBId = cB.id;

      // Initialize Flow state for Contact A
      const flowService = createContactFlowService(db);
      await flowService.updateProfile(ctxA, contactAId, {
        interest: 'Kursus Baking Pemula',
        sourceChannel: 'PromotorClass',
      });

      // 4. Services
      const [sA] = await db
        .insert(services)
        .values({
          organizationId: orgAId,
          name: 'Private Class Consultation',
          category: 'SESSION',
          priceAmount: 150000,
          durationMinutes: 60,
          isActive: true,
        })
        .returning();
      serviceAId = sA.id;

      // 5. Booking for Contact A
      const bookingService = createBookingService(db);
      const bRes = await bookingService.createBooking(
        ctxA,
        {
          contactId: contactAId,
          serviceId: serviceAId,
          startAt: '2026-08-20T10:00:00.000Z',
          endAt: '2026-08-20T11:00:00.000Z',
          locationType: 'ONLINE',
        },
        actorA
      );
      bookingAId = bRes.id;
    });
  });

  // =========================================================================
  // 1. getContactContext
  // =========================================================================
  describe('1. getContactContext', () => {
    it('returns canonical Flow-owned context including identity, stage, stored sticky classification, primaryNextAction, and activeBooking', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
          orgTz: 'Asia/Jakarta',
        });

        const context = await adapter.getContactContext(contactAId);

        assert.strictEqual(context.contactId, contactAId);
        assert.strictEqual(context.stage, 'BOOKED');
        assert.strictEqual(context.classification, 'PROSPECT');
        assert.ok(context.primaryNextAction);
        assert.strictEqual(context.primaryNextAction?.type, 'REMIND_PAYMENT');
        assert.ok(context.activeBooking);
        assert.strictEqual(context.activeBooking?.id, bookingAId);
        assert.strictEqual(context.activeBooking?.serviceId, serviceAId);
        assert.strictEqual(context.activeBooking?.status, 'PENDING');
      });
    });

    it('fails closed with NOT_FOUND for cross-organization contact access', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
        });

        await assert.rejects(
          async () => {
            await adapter.getContactContext(contactBId);
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual((err as DomainError).code, 'NOT_FOUND');
            return true;
          }
        );
      });
    });

    it('fails closed with NOT_FOUND for soft-deleted contact', async () => {
      await withIntegrationDb(async (db) => {
        const [delContact] = await db
          .insert(contacts)
          .values({
            organizationId: orgAId,
            name: 'Deleted Learner',
            phoneE164: '+6281299990303',
            deletedAt: new Date().toISOString(),
          })
          .returning();

        const adapter = createLocalPromotorFlowAdapter(db, { context: ctxA });

        await assert.rejects(
          async () => {
            await adapter.getContactContext(delContact.id);
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual((err as DomainError).code, 'NOT_FOUND');
            return true;
          }
        );
      });
    });
  });

  // =========================================================================
  // 2. getAssessmentStatus
  // =========================================================================
  describe('2. getAssessmentStatus', () => {
    it('returns NOT_STARTED when contact has no assessment records', async () => {
      await withIntegrationDb(async (db) => {
        const [freshContact] = await db
          .insert(contacts)
          .values({
            organizationId: orgAId,
            name: 'Fresh Contact For Assessment',
            phoneE164: '+6281299990404',
          })
          .returning();

        const adapter = createLocalPromotorFlowAdapter(db, { context: ctxA });
        const status = await adapter.getAssessmentStatus(freshContact.id);
        assert.strictEqual(status, 'NOT_STARTED');
      });
    });

    it('returns exact canonical status (e.g. COMPLETED) when assessment record exists', async () => {
      await withIntegrationDb(async (db) => {
        const assessmentRepo = createAssessmentRepository(db);
        await assessmentRepo.getOrCreate(ctxA, contactAId);
        await assessmentRepo.updateStatus(
          ctxA,
          contactAId,
          'COMPLETED',
          null,
          new Date().toISOString(),
          'Assessment selesai di PromotorClass'
        );

        const adapter = createLocalPromotorFlowAdapter(db, { context: ctxA });
        const status = await adapter.getAssessmentStatus(contactAId);
        assert.strictEqual(status, 'COMPLETED');
      });
    });

    it('fails closed for cross-organization assessment status query', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, { context: ctxA });

        await assert.rejects(
          async () => {
            await adapter.getAssessmentStatus(contactBId);
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual((err as DomainError).code, 'NOT_FOUND');
            return true;
          }
        );
      });
    });
  });

  // =========================================================================
  // 3. createNextAction
  // =========================================================================
  describe('3. createNextAction', () => {
    it('persists a FOLLOW_UP action with priority 70, explicit dueAt, and source PROMOTORCLASS, emitting ACTION_CREATED', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
          orgTz: 'Asia/Jakarta',
        });

        const explicitDue = '2026-08-25T08:00:00.000Z';
        const idempotencyKey = `class_event_001_${Date.now()}`;

        const request: LearningNextActionRequest = {
          organizationId: orgAId,
          contactId: contactAId,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt_lesson_completed_001',
          sourceSignalId: 'sig_high_intent_001',
          actionType: 'FOLLOW_UP',
          title: 'Follow-up Progres Belajar Modul 1',
          reason: 'Learner telah menyelesaikan modul 1 dengan nilai sempurna',
          dueAt: explicitDue,
          context: {
            programId: 'prog_baking_101',
            programTitle: 'Baking 101',
            enrollmentId: 'enr_001',
            signalType: 'COMPLETION_SIGNAL',
            intentLabel: 'hot',
          },
          idempotencyKey,
        };

        const result = await adapter.createNextAction(request);

        assert.ok(result);
        assert.strictEqual(result.id, idempotencyKey);
        assert.strictEqual(result.contactId, contactAId);
        assert.ok(result.nextActionId);

        // Verify next action in DB
        const [actionRow] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.id, result.nextActionId));

        assert.ok(actionRow);
        assert.strictEqual(actionRow.source, 'PROMOTORCLASS');
        assert.strictEqual(actionRow.sourceEventId, 'evt_lesson_completed_001');
        assert.strictEqual(actionRow.sourceSignalId, 'sig_high_intent_001');
        assert.strictEqual(actionRow.idempotencyKey, idempotencyKey);
        assert.strictEqual(actionRow.priority, 70);
        assert.strictEqual(actionRow.actionType, 'FOLLOW_UP');
        assert.strictEqual(new Date(actionRow.dueAt).toISOString(), explicitDue);

        // Verify ACTION_CREATED activity emitted
        const contactActivities = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.contactId, contactAId),
              eq(activities.eventType, 'ACTION_CREATED')
            )
          );

        const actionActivity = contactActivities.find(
          (a) => (a.metadataJson as any)?.idempotencyKey === idempotencyKey
        );
        assert.ok(actionActivity, 'ACTION_CREATED activity must be emitted');
      });
    });

    it('persists a MANUAL action with priority 40', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
          orgTz: 'Asia/Jakarta',
        });

        const explicitDue = '2026-08-26T09:00:00.000Z';
        const idempotencyKey = `class_event_002_${Date.now()}`;

        const request: LearningNextActionRequest = {
          organizationId: orgAId,
          contactId: contactAId,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt_reflection_002',
          actionType: 'MANUAL',
          title: 'Hubungi Learner untuk Diskusi Resep',
          reason: 'Learner menulis refleksi membutuhkan bantuan instruktur',
          dueAt: explicitDue,
          context: {
            programId: 'prog_baking_101',
          },
          idempotencyKey,
        };

        const result = await adapter.createNextAction(request);

        const [actionRow] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.id, result.nextActionId));

        assert.ok(actionRow);
        assert.strictEqual(actionRow.actionType, 'MANUAL');
        assert.strictEqual(actionRow.priority, 40);
      });
    });

    it('falls back to next local day at 10:00 AM when dueAt is absent', async () => {
      await withIntegrationDb(async (db) => {
        const fixedNow = new Date('2026-08-17T03:00:00.000Z'); // 10:00 WIB
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
          orgTz: 'Asia/Jakarta',
          clock: () => fixedNow,
        });

        const idempotencyKey = `class_event_003_${Date.now()}`;

        const request: LearningNextActionRequest = {
          organizationId: orgAId,
          contactId: contactAId,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt_no_due_003',
          actionType: 'FOLLOW_UP',
          title: 'Follow-up Tanpa Due Date Spesifik',
          reason: 'Sinyal otomatis dari sistem pembelajaran',
          context: {},
          idempotencyKey,
        };

        const result = await adapter.createNextAction(request);

        const [actionRow] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.id, result.nextActionId));

        assert.ok(actionRow);
        // Next local day (2026-08-18) at 10:00 WIB = 2026-08-18T03:00:00.000Z
        assert.strictEqual(
          new Date(actionRow.dueAt).toISOString(),
          '2026-08-18T03:00:00.000Z',
          'Absent dueAt must deterministically fall back to next local day at 10:00 AM'
        );
      });
    });

    it('is strictly idempotent on repeat calls with the same idempotency key (zero duplicate rows, zero duplicate activities)', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
          orgTz: 'Asia/Jakarta',
        });

        const idempotencyKey = `class_event_004_${Date.now()}`;

        const request: LearningNextActionRequest = {
          organizationId: orgAId,
          contactId: contactAId,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt_repeat_004',
          actionType: 'FOLLOW_UP',
          title: 'Follow-up Idempotency Test',
          reason: 'Testing idempotent convergence',
          context: {},
          idempotencyKey,
        };

        const firstRes = await adapter.createNextAction(request);
        const secondRes = await adapter.createNextAction(request);

        assert.strictEqual(firstRes.nextActionId, secondRes.nextActionId);
        assert.strictEqual(firstRes.id, secondRes.id);

        // Verify exactly one next action row in DB
        const matchingRows = await db
          .select()
          .from(nextActions)
          .where(
            and(
              eq(nextActions.organizationId, orgAId),
              eq(nextActions.source, 'PROMOTORCLASS'),
              eq(nextActions.idempotencyKey, idempotencyKey)
            )
          );
        assert.strictEqual(matchingRows.length, 1);

        // Verify exactly one activity emitted
        const matchingActivities = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.contactId, contactAId),
              eq(activities.eventType, 'ACTION_CREATED')
            )
          );

        const activitiesWithKey = matchingActivities.filter(
          (a) => (a.metadataJson as any)?.idempotencyKey === idempotencyKey
        );
        assert.strictEqual(activitiesWithKey.length, 1);
      });
    });

    it('fails closed when attempting to create action for cross-organization contact', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
        });

        const request: LearningNextActionRequest = {
          organizationId: orgAId,
          contactId: contactBId, // contact belongs to Org B
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt_cross_org_005',
          actionType: 'FOLLOW_UP',
          title: 'Cross-Org Attack Attempt',
          reason: 'Should fail closed',
          context: {},
          idempotencyKey: `class_event_005_${Date.now()}`,
        };

        await assert.rejects(
          async () => {
            await adapter.createNextAction(request);
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual((err as DomainError).code, 'NOT_FOUND');
            return true;
          }
        );
      });
    });
  });

  // =========================================================================
  // 4. appendLearningActivity
  // =========================================================================
  describe('4. appendLearningActivity', () => {
    it('appends a CLASS_SIGNAL activity with projection metadata to the activities table', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
        });

        const idempotencyKey = `sig_projection_001_${Date.now()}`;

        const projection: LearningActivityProjection = {
          organizationId: orgAId,
          contactId: contactAId,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt_learning_001',
          eventType: 'LEARNING_SIGNAL',
          summary: 'Learner menunjukkan minat tinggi pada program lanjutan',
          context: {
            programId: 'prog_baking_101',
            score: 95,
          },
          idempotencyKey,
        };

        await adapter.appendLearningActivity(projection);

        // Verify activity row in DB
        const matchingActivities = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.contactId, contactAId),
              eq(activities.eventType, 'CLASS_SIGNAL')
            )
          );

        const signalActivity = matchingActivities.find(
          (a) => (a.metadataJson as any)?.idempotencyKey === idempotencyKey
        );

        assert.ok(signalActivity, 'CLASS_SIGNAL activity must exist');
        assert.strictEqual(
          (signalActivity.metadataJson as any)?.summary,
          'Learner menunjukkan minat tinggi pada program lanjutan'
        );
        assert.strictEqual(
          (signalActivity.metadataJson as any)?.learningEventType,
          'LEARNING_SIGNAL'
        );
      });
    });

    it('is strictly idempotent on repeat calls with the same idempotency key (zero duplicate CLASS_SIGNAL activities)', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
        });

        const idempotencyKey = `sig_projection_repeat_${Date.now()}`;

        const projection: LearningActivityProjection = {
          organizationId: orgAId,
          contactId: contactAId,
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt_learning_repeat_001',
          eventType: 'LEARNING_SIGNAL',
          summary: 'Learner lulus modul praktek',
          context: {
            moduleId: 'mod_001',
          },
          idempotencyKey,
        };

        // Call twice with identical idempotencyKey
        await adapter.appendLearningActivity(projection);
        await adapter.appendLearningActivity(projection);

        // Verify exactly one CLASS_SIGNAL activity exists
        const matchingActivities = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.contactId, contactAId),
              eq(activities.eventType, 'CLASS_SIGNAL')
            )
          );

        const signalsWithKey = matchingActivities.filter(
          (a) => (a.metadataJson as any)?.idempotencyKey === idempotencyKey
        );
        assert.strictEqual(signalsWithKey.length, 1);
      });
    });

    it('fails closed when attempting to append learning activity for cross-organization contact', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createLocalPromotorFlowAdapter(db, {
          context: ctxA,
        });

        const projection: LearningActivityProjection = {
          organizationId: orgAId,
          contactId: contactBId, // contact belongs to Org B
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt_learning_cross_org',
          eventType: 'PROGRAM_COMPLETED',
          summary: 'Cross-org attack projection',
          context: {},
          idempotencyKey: `sig_cross_org_002_${Date.now()}`,
        };

        await assert.rejects(
          async () => {
            await adapter.appendLearningActivity(projection);
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual((err as DomainError).code, 'NOT_FOUND');
            return true;
          }
        );
      });
    });
  });
});
