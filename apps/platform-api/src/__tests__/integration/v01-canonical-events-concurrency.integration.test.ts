import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql, eq } from 'drizzle-orm';
import {
  withIntegrationDb,
  TEST_DATABASE_URL,
  applyMigrationsAsOwner,
} from './test-env';
import {
  organizations,
  programs,
  modules,
  lessons,
  productEntitlements,
  learningEvents,
  learningSignals,
  integrationOutbox,
} from '../../db/schema';
import { createLearningEngineService } from '../../services/class/learning-engine-service';
import { createEnrollmentService } from '../../services/class/enrollment-service';

const enabled = Boolean(TEST_DATABASE_URL);

describe('V0.1 Canonical Events & Concurrency Exactly-Once Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let testOrgId: string;
  let testOrgSlug: string;
  let testProgramId: string;
  let testModuleId: string;
  let testLesson1Id: string;
  let testLesson2Id: string;
  let testContactId: string;
  let testEnrollmentId: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();
      testOrgSlug = `canon-evt-${now}`;

      const [org] = await db
        .insert(organizations)
        .values({ name: 'Canonical Events Org', slug: testOrgSlug })
        .returning();
      testOrgId = org.id;

      await db.insert(productEntitlements).values({
        organizationId: testOrgId,
        promotorClass: true,
        promotorFlow: true,
      });

      const [prog] = await db
        .insert(programs)
        .values({
          organizationId: testOrgId,
          title: 'Concurrency & Event Provenance Mastery',
          slug: `prog-canon-${now}`,
          programType: 'lead_magnet',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();
      testProgramId = prog.id;

      const [mod] = await db
        .insert(modules)
        .values({
          programId: testProgramId,
          title: 'Module 1: Concurrency',
          order: 1,
        })
        .returning();
      testModuleId = mod.id;

      const [l1] = await db
        .insert(lessons)
        .values({
          moduleId: testModuleId,
          title: 'Lesson 1: Idempotency Mechanics',
          order: 1,
          isRequired: true,
        })
        .returning();
      testLesson1Id = l1.id;

      const [l2] = await db
        .insert(lessons)
        .values({
          moduleId: testModuleId,
          title: 'Lesson 2: Milestone Verification & Reflection',
          order: 2,
          isRequired: true,
          reflectionType: 'long_text',
          reflectionPrompt: 'Detail the concurrency guarantees.',
          ctaType: 'WHATSAPP',
          ctaLabel: 'Verify Architecture',
        })
        .returning();
      testLesson2Id = l2.id;
    });
  });

  it('1. Registration emits exactly one learner.registered and learner.enrolled', async () => {
    await withIntegrationDb(async (db) => {
      const enrollmentService = createEnrollmentService(db);
      const reg = await enrollmentService.registerPublicLearner({
        slug: testOrgSlug,
        programSlug: `prog-canon-${testOrgSlug.split('-')[2]}`,
        name: 'Concurrent Learner',
        phoneRaw: '+6281277770001',
        email: 'concurrent@example.com',
      });

      testEnrollmentId = reg.enrollmentId;
      testContactId = reg.contactId;

      const events = await db
        .select()
        .from(learningEvents)
        .where(eq(learningEvents.enrollmentId, testEnrollmentId));

      const regEvents = events.filter((e) => e.eventType === 'learner.registered');
      const enrEvents = events.filter((e) => e.eventType === 'learner.enrolled');

      assert.strictEqual(regEvents.length, 1);
      assert.strictEqual(enrEvents.length, 1);
    });
  });

  it('2. Concurrent startLesson on Lesson 1 emits exactly one lesson.started with correct provenance', async () => {
    await withIntegrationDb(async (db) => {
      const learningService = createLearningEngineService(db);

      const results = await Promise.all([
        learningService.startLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson1Id,
          authenticatedContactId: testContactId,
        }),
        learningService.startLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson1Id,
          authenticatedContactId: testContactId,
        }),
        learningService.startLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson1Id,
          authenticatedContactId: testContactId,
        }),
      ]);

      for (const res of results) {
        assert.strictEqual(res.enrollment.status, 'STARTED');
      }

      const events = await db
        .select()
        .from(learningEvents)
        .where(eq(learningEvents.enrollmentId, testEnrollmentId));

      const startedEvents = events.filter(
        (e) => e.eventType === 'lesson.started' && (e.payload as any)?.lessonId === testLesson1Id
      );

      assert.strictEqual(startedEvents.length, 1, 'Must have exactly one lesson.started for Lesson 1');
      assert.strictEqual(startedEvents[0].contactId, testContactId);
      assert.strictEqual(startedEvents[0].enrollmentId, testEnrollmentId);
    });
  });

  it('3. Concurrent completeLesson on Lesson 1 yields exactly one lesson.completed and one program.progress_50', async () => {
    await withIntegrationDb(async (db) => {
      const learningService = createLearningEngineService(db);

      // Fire 5 concurrent completion requests simultaneously
      const results = await Promise.all([
        learningService.completeLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson1Id,
          authenticatedContactId: testContactId,
        }),
        learningService.completeLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson1Id,
          authenticatedContactId: testContactId,
        }),
        learningService.completeLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson1Id,
          authenticatedContactId: testContactId,
        }),
        learningService.completeLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson1Id,
          authenticatedContactId: testContactId,
        }),
        learningService.completeLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson1Id,
          authenticatedContactId: testContactId,
        }),
      ]);

      for (const res of results) {
        assert.strictEqual(res.enrollment.progressPercent, 50);
      }

      const events = await db
        .select()
        .from(learningEvents)
        .where(eq(learningEvents.enrollmentId, testEnrollmentId));

      const l1Events = events.filter(
        (e) => e.eventType === 'lesson.completed' && (e.payload as any)?.lessonId === testLesson1Id
      );
      const prog50Events = events.filter((e) => e.eventType === 'program.progress_50');

      assert.strictEqual(l1Events.length, 1, 'Must have exactly one lesson.completed for Lesson 1');
      assert.strictEqual(prog50Events.length, 1, 'Must have exactly one program.progress_50');
    });
  });

  it('4. Reflection submission on Lesson 2 completes program and emits canonical events & signals with provenance', async () => {
    await withIntegrationDb(async (db) => {
      const learningService = createLearningEngineService(db);

      const refl = await learningService.submitReflection({
        organizationId: testOrgId,
        enrollmentId: testEnrollmentId,
        lessonId: testLesson2Id,
        responseText: 'PostgreSQL unique partial indexes and atomicComplete guarantee concurrency safety.',
        authenticatedContactId: testContactId,
      });

      assert.strictEqual(refl.enrollment.progressPercent, 100);
      assert.strictEqual(refl.enrollment.status, 'COMPLETED');

      const events = await db
        .select()
        .from(learningEvents)
        .where(eq(learningEvents.enrollmentId, testEnrollmentId));

      const reflEvents = events.filter(
        (e) => e.eventType === 'reflection.submitted' && (e.payload as any)?.lessonId === testLesson2Id
      );
      const l2Events = events.filter(
        (e) => e.eventType === 'lesson.completed' && (e.payload as any)?.lessonId === testLesson2Id
      );
      const prog80Events = events.filter((e) => e.eventType === 'program.progress_80');
      const progCompEvents = events.filter((e) => e.eventType === 'program.completed');

      assert.strictEqual(reflEvents.length, 1, 'Exactly one reflection.submitted');
      assert.strictEqual(l2Events.length, 1, 'Exactly one lesson.completed for Lesson 2');
      assert.strictEqual(prog80Events.length, 1, 'Exactly one program.progress_80');
      assert.strictEqual(progCompEvents.length, 1, 'Exactly one program.completed');

      // Verify Signal Provenance
      const signals = await db
        .select()
        .from(learningSignals)
        .where(eq(learningSignals.enrollmentId, testEnrollmentId));

      const compSignal = signals.find((s) => s.reason === 'PROGRAM_COMPLETED');
      const prog80Signal = signals.find((s) => s.reason === 'MILESTONE_80_PERCENT');

      assert.ok(compSignal);
      assert.strictEqual(
        compSignal.sourceEventId,
        progCompEvents[0].id,
        'PROGRAM_COMPLETED signal must reference canonical program.completed event'
      );

      assert.ok(prog80Signal);
      assert.strictEqual(
        prog80Signal.sourceEventId,
        prog80Events[0].id,
        'MILESTONE_80_PERCENT signal must reference canonical program.progress_80 event'
      );

      // Verify Outbox Idempotency Keys
      const outbox = await db
        .select()
        .from(integrationOutbox)
        .where(eq(integrationOutbox.organizationId, testOrgId));

      const expectedCompKey = `promotorclass:${progCompEvents[0].id}:completed`;
      const expectedProg80Key = `promotorclass:${prog80Events[0].id}:progress_80`;

      assert.ok(
        outbox.some((o) => o.idempotencyKey === expectedCompKey),
        `Outbox must contain key: ${expectedCompKey}`
      );
      assert.ok(
        outbox.some((o) => o.idempotencyKey === expectedProg80Key),
        `Outbox must contain key: ${expectedProg80Key}`
      );
    });
  });

  it('5. CTA Click emits exactly one cta.clicked event, sets signal provenance, and is mutation-immutable', async () => {
    await withIntegrationDb(async (db) => {
      const learningService = createLearningEngineService(db);

      const ctaRes = await learningService.recordCtaClick({
        organizationId: testOrgId,
        enrollmentId: testEnrollmentId,
        lessonId: testLesson2Id,
        ctaLabel: 'Verify Architecture',
        authenticatedContactId: testContactId,
      });

      assert.strictEqual(ctaRes.enrollment.intentScore, 100);
      assert.strictEqual(ctaRes.enrollment.intentLabel, 'HOT');

      const eventsAfterCta = await db
        .select()
        .from(learningEvents)
        .where(eq(learningEvents.enrollmentId, testEnrollmentId));
      const ctaEvents = eventsAfterCta.filter((e) => e.eventType === 'cta.clicked');
      assert.strictEqual(ctaEvents.length, 1);

      const signalsAfterCta = await db
        .select()
        .from(learningSignals)
        .where(eq(learningSignals.enrollmentId, testEnrollmentId));
      const ctaSignal = signalsAfterCta.find((s) => s.reason === 'CTA_CLICKED');
      assert.ok(ctaSignal);
      assert.strictEqual(ctaSignal.sourceEventId, ctaEvents[0].id);

      // Idempotency: Retrying multiple operations does NOT increase count
      const initialEventsCount = eventsAfterCta.length;
      const initialSignalsCount = signalsAfterCta.length;

      await learningService.completeLesson({
        organizationId: testOrgId,
        enrollmentId: testEnrollmentId,
        lessonId: testLesson1Id,
        authenticatedContactId: testContactId,
      });
      await learningService.submitReflection({
        organizationId: testOrgId,
        enrollmentId: testEnrollmentId,
        lessonId: testLesson2Id,
        responseText: 'Retry submission',
        authenticatedContactId: testContactId,
      });
      await learningService.recordCtaClick({
        organizationId: testOrgId,
        enrollmentId: testEnrollmentId,
        lessonId: testLesson2Id,
        ctaLabel: 'Verify Architecture',
        authenticatedContactId: testContactId,
      });

      const finalEvents = await db
        .select()
        .from(learningEvents)
        .where(eq(learningEvents.enrollmentId, testEnrollmentId));
      const finalSignals = await db
        .select()
        .from(learningSignals)
        .where(eq(learningSignals.enrollmentId, testEnrollmentId));

      assert.strictEqual(finalEvents.length, initialEventsCount, 'Events count must remain immutable');
      assert.strictEqual(finalSignals.length, initialSignalsCount, 'Signals count must remain immutable');
    });
  });
});
