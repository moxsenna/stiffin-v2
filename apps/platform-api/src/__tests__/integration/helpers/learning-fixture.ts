import * as crypto from 'node:crypto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  organizations,
  productEntitlements,
  programs,
  modules,
  lessons,
  contacts,
  enrollments,
  learnerSessions,
} from '../../../db/schema';
import { createApp } from '../../../app';
import { TEST_DATABASE_URL } from '../test-env';

export async function seedLearningFixture(db: NodePgDatabase) {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  const orgSlug = `test-org-${now}-${rand}`;
  const progSlug = `test-prog-${now}-${rand}`;

  // 1. Organization
  const [org] = await db
    .insert(organizations)
    .values({ name: 'Test Learning Org', slug: orgSlug })
    .returning();

  // 2. Entitlements
  await db.insert(productEntitlements).values({
    organizationId: org.id,
    promotorClass: true,
    promotorFlow: true,
  });

  // 3. Program
  const [prog] = await db
    .insert(programs)
    .values({
      organizationId: org.id,
      title: 'Test Program',
      slug: progSlug,
      programType: 'lead_magnet',
      accessType: 'public',
      status: 'published',
      pricing: 'free',
      priceAmount: 0,
    })
    .returning();

  // 4. Module
  const [mod] = await db
    .insert(modules)
    .values({
      programId: prog.id,
      title: 'Module 1',
      order: 1,
    })
    .returning();

  // 5. Lesson
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

  // 6. Contact
  const [cnt] = await db
    .insert(contacts)
    .values({
      organizationId: org.id,
      name: 'Test Learner',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  // 7. Enrollment
  const [enr] = await db
    .insert(enrollments)
    .values({
      organizationId: org.id,
      programId: prog.id,
      contactId: cnt.id,
      status: 'ENROLLED',
    })
    .returning();

  // 8. Learner Session Token
  const rawSessionToken = 'lsess_' + crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawSessionToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(learnerSessions).values({
    organizationId: org.id,
    contactId: cnt.id,
    tokenHash,
    expiresAt,
  });

  return {
    orgId: org.id,
    programId: prog.id,
    moduleId: mod.id,
    lessonId: les.id,
    contactId: cnt.id,
    enrollmentId: enr.id,
    sessionToken: rawSessionToken,
  };
}

export async function requestApp(
  _db: NodePgDatabase,
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown,
  sessionToken?: string
) {
  const app = createApp();
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (sessionToken) {
    headers['Cookie'] = `promotor_learner_session=${sessionToken}`;
  }

  const res = await app.request(
    path,
    {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    {
      HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
      BETTER_AUTH_SECRET: 'test-secret-fixture-32-chars-long!',
      BETTER_AUTH_URL: 'http://localhost:8787',
      BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
    } as any
  );

  const resBody = await res.json().catch(() => ({}));
  return {
    status: res.status,
    body: resBody as any,
  };
}
