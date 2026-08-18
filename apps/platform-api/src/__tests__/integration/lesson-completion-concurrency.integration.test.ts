import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { eq, and } from 'drizzle-orm';
import {
  withIntegrationDb,
  TEST_DATABASE_URL,
  applyMigrationsAsOwner,
} from './test-env';
import {
  organizations,
  contacts,
  programs,
  modules,
  lessons,
  enrollments,
  learningEvents,
  integrationOutbox,
} from '../../db/schema';
import { createLearningEngineService } from '../../services/class/learning-engine-service';

const enabled = Boolean(TEST_DATABASE_URL);

describe('Lesson Completion Concurrency & Exactly-Once Semantics (§13, §35)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let testOrgId: string;
  let testProgramId: string;
  let testLessonId: string;
  let testContactId: string;
  let testEnrollmentId: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();

      const [org] = await db
        .insert(organizations)
        .values({ name: 'Race Org', slug: `race-org-${now}` })
        .returning();
      testOrgId = org.id;

      const [cnt] = await db
        .insert(contacts)
        .values({
          organizationId: testOrgId,
          name: 'Concurrent Runner',
          phoneE164: `+62817${Math.floor(10000000 + Math.random() * 90000000)}`,
        })
        .returning();
      testContactId = cnt.id;

      const [prog] = await db
        .insert(programs)
        .values({
          organizationId: testOrgId,
          title: 'Concurrency Program',
          slug: `race-prog-${now}`,
          programType: 'lead_magnet',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();
      testProgramId = prog.id;

      const [mod] = await db
        .insert(modules)
        .values({ programId: testProgramId, title: 'Mod 1', order: 1 })
        .returning();

      const [l] = await db
        .insert(lessons)
        .values({
          moduleId: mod.id,
          title: 'Lesson 1',
          order: 1,
          isRequired: true,
        })
        .returning();
      testLessonId = l.id;

      const [enr] = await db
        .insert(enrollments)
        .values({
          organizationId: testOrgId,
          programId: testProgramId,
          contactId: testContactId,
          status: 'ENROLLED',
        })
        .returning();
      testEnrollmentId = enr.id;
    });
  });

  it('proves concurrent completeLesson race produces exactly 1 completion event and 0 duplicate outbox records (§13, §35)', async () => {
    // Launch 2 parallel completeLesson requests with distinct database connections
    const results = await Promise.all([
      withIntegrationDb(async (db) => {
        const service = createLearningEngineService(db);
        return service.completeLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLessonId,
          authenticatedContactId: testContactId,
        });
      }),
      withIntegrationDb(async (db) => {
        const service = createLearningEngineService(db);
        return service.completeLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLessonId,
          authenticatedContactId: testContactId,
        });
      }),
    ]);

    // Both return valid idempotent responses
    for (const res of results) {
      assert.strictEqual(res.progress.isCompleted, true);
      assert.strictEqual(res.enrollment.progressPercent, 100);
      assert.strictEqual(res.enrollment.learningStatus, 'COMPLETED');
    }

    // Inspect database for duplicate events
    await withIntegrationDb(async (db) => {
      const completionEvents = await db
        .select()
        .from(learningEvents)
        .where(
          and(
            eq(learningEvents.organizationId, testOrgId),
            eq(learningEvents.enrollmentId, testEnrollmentId),
            eq(learningEvents.eventType, 'lesson.completed')
          )
        );

      assert.strictEqual(
        completionEvents.length,
        1,
        `Expected exactly 1 'lesson.completed' event, found ${completionEvents.length}`
      );

      // Verify outbox records
      const outboxRows = await db
        .select()
        .from(integrationOutbox)
        .where(eq(integrationOutbox.organizationId, testOrgId));

      const idempotencyKeys = new Set(outboxRows.map((r) => r.idempotencyKey));
      assert.strictEqual(
        idempotencyKeys.size,
        outboxRows.length,
        'Outbox must contain no duplicate idempotency keys'
      );
    });
  });
});
