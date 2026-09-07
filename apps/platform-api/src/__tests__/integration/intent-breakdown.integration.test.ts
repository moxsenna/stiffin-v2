import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { withIntegrationDb, TEST_DATABASE_URL } from './test-env';
import {
  productEntitlements,
  programs,
  modules,
  lessons,
  contacts,
  enrollments,
} from '../../db/schema';
import { createLearningEngineService } from '../../services/class/learning-engine-service';
import { createApp } from '../../app';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'intent-breakdown-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

async function signInCookie(auth: ReturnType<typeof createAuth>, email: string): Promise<string> {
  const res = await auth.handler(
    new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    })
  );
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie, 'sign-in sets cookie');
  return setCookie!.split(';')[0];
}

async function seedClassFixture(db: NodePgDatabase) {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  const orgSlug = `test-intent-org-${now}-${rand}`;
  const userEmail = `operator-${now}-${rand}@example.com`;

  // 1. Provision user & organization
  const provisioned = await provisionPromotorUser(db, {
    email: userEmail,
    password: 'Password123!',
    name: 'Operator Test',
    organizationName: 'Test Intent Org',
    organizationSlug: orgSlug,
  });
  const orgId = provisioned.organizationId!;

  // 2. Grant promotorClass entitlement
  await db
    .update(productEntitlements)
    .set({ promotorClass: true })
    .where(eq(productEntitlements.organizationId, orgId));

  // 3. Auth session cookie
  const auth = createAuth(db, TEST_ENV, { disableRateLimit: true });
  const sessionToken = await signInCookie(auth, userEmail);

  // 4. Program + Module + Lesson
  const [prog] = await db
    .insert(programs)
    .values({
      organizationId: orgId,
      title: 'Class Intent Test Program',
      slug: `prog-${now}-${rand}`,
      programType: 'lead_magnet',
      accessType: 'public',
      status: 'published',
      pricing: 'free',
      priceAmount: 0,
    })
    .returning();

  const [mod] = await db
    .insert(modules)
    .values({
      programId: prog.id,
      title: 'Module 1',
      order: 1,
    })
    .returning();

  const [les] = await db
    .insert(lessons)
    .values({
      moduleId: mod.id,
      title: 'Lesson 1',
      order: 1,
      isRequired: true,
      videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      videoProvider: 'youtube',
    })
    .returning();

  // 5. Contact
  const [cnt] = await db
    .insert(contacts)
    .values({
      organizationId: orgId,
      name: 'Learner Contact',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  // 6. Enrollment
  const [enr] = await db
    .insert(enrollments)
    .values({
      organizationId: orgId,
      programId: prog.id,
      contactId: cnt.id,
      status: 'ENROLLED',
    })
    .returning();

  return {
    orgId,
    sessionToken,
    programId: prog.id,
    lessonId: les.id,
    contactId: cnt.id,
    enrollmentId: enr.id,
  };
}

async function requestOperator(
  _db: NodePgDatabase,
  method: 'GET' | 'POST',
  path: string,
  sessionToken: string,
  body?: unknown
) {
  const app = createApp();
  const headers: Record<string, string> = {
    cookie: sessionToken,
  };
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  const res = await app.request(
    path,
    {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    TEST_ENV as any
  );

  const resBody = await res.json().catch(() => ({}));
  return {
    status: res.status,
    body: resBody as any,
  };
}

describe('intent breakdown transparansi', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  it('menyimpan breakdown saat intent dihitung ulang dan mengembalikannya di learners list', async () => {
    await withIntegrationDb(async (db) => {
      const { orgId, sessionToken, programId, lessonId, enrollmentId, contactId } = await seedClassFixture(db);
      // selesaikan 1 lesson via service langsung (pola test integrasi refleksi existing)
      const learning = createLearningEngineService(db);
      await learning.completeLesson({ organizationId: orgId, enrollmentId, lessonId, authenticatedContactId: contactId });

      const res = await requestOperator(db, 'GET', `/api/v1/class/learners?programId=${programId}`, sessionToken);
      assert.equal(res.status, 200);
      const learner = res.body.learners.find((l: any) => l.contactId === contactId);
      assert.ok(learner, 'learner must be found in learners list');
      assert.ok(Array.isArray(learner.intentBreakdown), 'intentBreakdown must be an array');
      assert.ok(
        learner.intentBreakdown.some((b: any) => b.points > 0 && typeof b.label === 'string' && b.label.length > 0),
        'intentBreakdown items must have points > 0 and non-empty label'
      );

      // check detail endpoint as well
      const detailRes = await requestOperator(db, 'GET', `/api/v1/class/learners/${contactId}`, sessionToken);
      assert.equal(detailRes.status, 200);
      const enrDetail = detailRes.body.enrollments?.find((e: any) => e.id === enrollmentId);
      assert.ok(enrDetail, 'enrollment must be found in learner detail');
      assert.ok(Array.isArray(enrDetail.intentBreakdown), 'detail enrollment intentBreakdown must be an array');
    });
  });
});
