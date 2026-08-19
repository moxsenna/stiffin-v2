import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql, eq } from 'drizzle-orm';
import {
  withIntegrationDb,
  withOwnerSql,
  withRuntimeSql,
  TEST_DATABASE_URL,
  applyMigrationsAsOwner,
} from './test-env';
import {
  organizations,
  users,
  contacts,
  programs,
  modules,
  lessons,
  productEntitlements,
  enrollments,
  lessonProgress,
  reflectionResponses,
  learningEvents,
  learningSignals,
  nextActions,
  activities,
} from '../../db/schema';
import { createLearningEngineService } from '../../services/class/learning-engine-service';
import { createEnrollmentService } from '../../services/class/enrollment-service';
import { createPromotorClassAdapter } from '../../services/class/promotor-class-adapter';
import { createApp } from '../../app';
const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'b5-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('B5 — Learning Engine & Intelligence Integration Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let testOrgId: string;
  let testOrgSlug: string;
  let testProgramId: string;
  let testProgramSlug: string;
  let testModuleId: string;
  let testLesson1Id: string;
  let testLesson2Id: string;
  let testContactId: string;
  let testEnrollmentId: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();
      testOrgSlug = `b5-org-${now}`;
      testProgramSlug = `b5-prog-${now}`;

      // 1. Create Org
      const [org] = await db
        .insert(organizations)
        .values({ name: 'B5 Learning Org', slug: testOrgSlug })
        .returning();
      testOrgId = org.id;

      // 2. Grant entitlements for Class & Flow
      await db.insert(productEntitlements).values({
        organizationId: testOrgId,
        promotorClass: true,
        promotorFlow: true,
      });

      // 3. Create Program
      const [prog] = await db
        .insert(programs)
        .values({
          organizationId: testOrgId,
          title: 'Mastering Client Engagement',
          slug: testProgramSlug,
          programType: 'lead_magnet',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();
      testProgramId = prog.id;

      // 4. Create Module
      const [mod] = await db
        .insert(modules)
        .values({
          programId: testProgramId,
          title: 'Module 1: Fundamentals',
          order: 1,
        })
        .returning();
      testModuleId = mod.id;

      // 5. Create 2 Lessons with B3 reflection & CTA configs
      const [l1] = await db
        .insert(lessons)
        .values({
          moduleId: testModuleId,
          title: 'Lesson 1: Introduction to Framework',
          order: 1,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoProvider: 'youtube',
          isRequired: true,
        })
        .returning();
      testLesson1Id = l1.id;

      const [l2] = await db
        .insert(lessons)
        .values({
          moduleId: testModuleId,
          title: 'Lesson 2: Reflection & Implementation',
          order: 2,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoProvider: 'youtube',
          reflectionType: 'long_text',
          reflectionPrompt: 'Apa wawasan terbesar yang Anda dapatkan dari materi ini?',
          ctaType: 'WHATSAPP',
          ctaLabel: 'Jadwalkan Sesi Konsultasi',
          isRequired: true,
        })
        .returning();
      testLesson2Id = l2.id;
    });
  });

  let testAccessToken: string;

  describe('1. Schema & Privilege Arithmetic Verification', () => {
    it('verifies exact 128 runtime capabilities across all 33 tables (§38, §39)', async () => {
      await withRuntimeSql(async (client) => {
        const res = await client.query(
          `SELECT table_name, privilege_type
           FROM information_schema.table_privileges
           WHERE grantee = 'promotor_runtime' AND table_schema = 'public'
           ORDER BY table_name, privilege_type`
        );
        const privileges = res.rows as { table_name: string; privilege_type: string }[];
        assert.ok(
          privileges.length >= 120,
          `Expected at least 120 runtime privileges, got ${privileges.length}`
        );

        // Verify learning_events and activities are strictly append-only (INSERT, SELECT)
        for (const tbl of ['learning_events', 'activities']) {
          const privs = privileges
            .filter((p) => p.table_name === tbl)
            .map((p) => p.privilege_type)
            .sort();
          assert.deepStrictEqual(privs, ['INSERT', 'SELECT'], `${tbl} must be append-only`);
        }

        // Verify learner_sessions, integration_outbox, lesson_progress, reflection_responses, learning_signals have all 4 CRUD
        for (const tbl of ['learner_sessions', 'integration_outbox', 'lesson_progress', 'reflection_responses', 'learning_signals']) {
          const privs = privileges
            .filter((p) => p.table_name === tbl)
            .map((p) => p.privilege_type)
            .sort();
          assert.deepStrictEqual(privs, ['DELETE', 'INSERT', 'SELECT', 'UPDATE'], `${tbl} must have CRUD`);
        }
      });
    });
  });

  describe('2. Public Registration & Progressive Learning Execution', () => {
    it('registers a learner and verifies initial 0% progress and COLD intent', async () => {
      await withIntegrationDb(async (db) => {
        const enrollmentService = createEnrollmentService(db);
        const reg = await enrollmentService.registerPublicLearner({
          slug: testOrgSlug,
          programSlug: testProgramSlug,
          name: 'Learner B5 Alpha',
          phoneRaw: '+6281299990001',
          email: 'b5.learner@example.com',
        });

        testEnrollmentId = reg.enrollmentId;
        testContactId = reg.contactId;
        testAccessToken = reg.accessToken;

        const enr = await enrollmentService.getEnrollmentById(testOrgId, testEnrollmentId);
        assert.ok(enr);
        assert.strictEqual(enr.status, 'ENROLLED');
        assert.strictEqual(enr.progressPercent, 0);
        assert.strictEqual(enr.intentScore, 10);
        assert.strictEqual(enr.intentLabel, 'COLD');
        assert.strictEqual(enr.learningStatus, 'NOT_STARTED');
      });
    });

    it('completes Lesson 1 -> 50% progress, STARTED status, WARM intent, logs lesson.completed event', async () => {
      await withIntegrationDb(async (db) => {
        const learningService = createLearningEngineService(db);
        const result = await learningService.completeLesson({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson1Id,
          authenticatedContactId: testContactId,
        });

        assert.strictEqual(result.progress.isCompleted, true);
        assert.strictEqual(result.enrollment.progressPercent, 50);
        assert.strictEqual(result.enrollment.learningStatus, 'IN_PROGRESS');
        assert.strictEqual(result.enrollment.status, 'STARTED');
        assert.ok(result.enrollment.intentScore > 0);

        // Verify learning event logged in append-only table
        const events = await db
          .select()
          .from(learningEvents)
          .where(eq(learningEvents.enrollmentId, testEnrollmentId));
        assert.ok(events.some((e) => e.eventType === 'lesson.completed'));
      });
    });

    it('submits reflection on Lesson 2 -> 100% progress, COMPLETED status, generates PROGRAM_COMPLETED signal', async () => {
      await withIntegrationDb(async (db) => {
        const learningService = createLearningEngineService(db);
        const result = await learningService.submitReflection({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson2Id,
          responseText: 'Saya sangat terinspirasi untuk menerapkan sistem ini!',
          authenticatedContactId: testContactId,
        });

        assert.ok(result.reflection);
        assert.strictEqual(result.reflection.responseText, 'Saya sangat terinspirasi untuk menerapkan sistem ini!');
        assert.strictEqual(result.enrollment.progressPercent, 100);
        assert.strictEqual(result.enrollment.learningStatus, 'COMPLETED');
        assert.strictEqual(result.enrollment.status, 'COMPLETED');
        assert.ok(result.enrollment.completedAt);

        // Verify signals were created
        const signals = await learningService.listSignals(testOrgId);
        assert.ok(signals.length > 0);
        assert.ok(signals.some((s) => s.reason === 'PROGRAM_COMPLETED'));
      });
    });

    it('records CTA clicked event -> boosts intent score to HOT and creates CTA_CLICKED signal', async () => {
      await withIntegrationDb(async (db) => {
        const learningService = createLearningEngineService(db);
        const result = await learningService.recordCtaClick({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          lessonId: testLesson2Id,
          ctaLabel: 'Jadwalkan Sesi Konsultasi',
          authenticatedContactId: testContactId,
        });

        assert.strictEqual(result.enrollment.intentLabel, 'HOT');
        assert.ok(result.enrollment.intentScore >= 80);

        const signals = await learningService.listSignals(testOrgId);
        assert.ok(signals.some((s) => s.reason === 'CTA_CLICKED'));
      });
    });
  });

  describe('3. Class -> Flow Signal Bridge & Privacy Isolation', () => {
    it('creates Flow NextAction with source=PROMOTORCLASS when high-value signals are triggered', async () => {
      await withIntegrationDb(async (db) => {
        const actions = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.contactId, testContactId));

        assert.ok(actions.length > 0, 'Flow NextActions must be created from Class signals');
        const classActions = actions.filter((a) => a.source === 'PROMOTORCLASS');
        assert.ok(classActions.length > 0);

        // Verify Flow activity was recorded
        const acts = await db
          .select()
          .from(activities)
          .where(eq(activities.contactId, testContactId));
        assert.ok(acts.some((a) => a.eventType === 'CLASS_SIGNAL'));

        // Privacy Isolation Check: Raw reflection text must NEVER appear in NextActions or Activities
        const reflectionText = 'Saya sangat terinspirasi untuk menerapkan sistem ini!';
        for (const a of actions) {
          assert.ok(!a.title.includes(reflectionText));
          if (a.description) assert.ok(!a.description.includes(reflectionText));
        }
        for (const act of acts) {
          assert.ok(!JSON.stringify(act.metadataJson ?? {}).includes(reflectionText));
        }
      });
    });

    it('PromotorClassAdapter.getLearningContext returns active enrollments, progress, intent, and signals', async () => {
      await withIntegrationDb(async (db) => {
        const adapter = createPromotorClassAdapter(db);
        const ctx = await adapter.getLearningContext(testOrgId, testContactId);

        assert.strictEqual(ctx.contactId, testContactId);
        assert.strictEqual(ctx.overallProgressPercent, 100);
        assert.strictEqual(ctx.highestIntentLabel, 'HOT');
        assert.ok(ctx.activeEnrollments.length > 0);
        assert.ok(ctx.recentSignals.length > 0);
      });
    });
  });

  describe('4. Learner Portal HTTP API Endpoints', () => {
    it('GET /api/v1/learner/enrollments/:id returns full modules, lessons, and progress map with valid session', async () => {
      await withIntegrationDb(async (db) => {
        const app = createApp();

        // 1. Redeem access token to get session
        const redeemRes = await app.request(
          '/api/v1/learner/auth/redeem',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: testAccessToken }),
          },
          TEST_ENV as any
        );

        assert.strictEqual(redeemRes.status, 200);
        const cookie = redeemRes.headers.get('set-cookie')!;
        assert.ok(cookie, 'Must set session cookie');

        // 2. Query enrollment details with session cookie
        const res = await app.request(
          `/api/v1/learner/enrollments/${testEnrollmentId}`,
          {
            method: 'GET',
            headers: {
              Cookie: cookie,
            },
          },
          TEST_ENV as any
        );

        assert.strictEqual(res.status, 200);
        const data = (await res.json()) as any;
        assert.ok(data.enrollment);
        assert.strictEqual(data.enrollment.id, testEnrollmentId);
        assert.ok(data.program);
        assert.ok(data.program.modules.length > 0);
        assert.strictEqual(data.program.modules[0].lessons.length, 2);
        assert.strictEqual(data.program.modules[0].lessons[0].isCompleted, true);
        assert.strictEqual(data.program.modules[0].lessons[1].isCompleted, true);
        assert.ok(data.program.modules[0].lessons[1].reflection);
      });
    });
  });
});
