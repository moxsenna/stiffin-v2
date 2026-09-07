import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { withIntegrationDb, TEST_DATABASE_URL } from './test-env';
import {
  productEntitlements,
  programs,
  contacts,
  enrollments,
} from '../../db/schema';
import { createApp } from '../../app';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'learners-atrisk-filter-test-secret-0123456789-abcdef',
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

async function seedTwoLearnersOneAtRisk(db: NodePgDatabase) {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  const orgSlug = `test-atrisk-org-${now}-${rand}`;
  const userEmail = `operator-atrisk-${now}-${rand}@example.com`;

  // 1. Provision user & organization
  const provisioned = await provisionPromotorUser(db, {
    email: userEmail,
    password: 'Password123!',
    name: 'Operator At-Risk Test',
    organizationName: 'Test At-Risk Org',
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

  // 4. Program
  const [prog] = await db
    .insert(programs)
    .values({
      organizationId: orgId,
      title: 'At-Risk Test Program',
      slug: `prog-atrisk-${now}-${rand}`,
      programType: 'lead_magnet',
      accessType: 'public',
      status: 'published',
      pricing: 'free',
      priceAmount: 0,
    })
    .returning();

  // 5. Contacts
  const [atRiskContact] = await db
    .insert(contacts)
    .values({
      organizationId: orgId,
      name: 'At Risk Learner',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  const [normalContact] = await db
    .insert(contacts)
    .values({
      organizationId: orgId,
      name: 'Normal Learner',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  // 6. Enrollments: one AT_RISK, one IN_PROGRESS
  await db
    .insert(enrollments)
    .values({
      organizationId: orgId,
      programId: prog.id,
      contactId: atRiskContact.id,
      status: 'STARTED',
      learningStatus: 'AT_RISK',
      progressPercent: 30,
    });

  await db
    .insert(enrollments)
    .values({
      organizationId: orgId,
      programId: prog.id,
      contactId: normalContact.id,
      status: 'STARTED',
      learningStatus: 'IN_PROGRESS',
      progressPercent: 60,
    });

  return {
    orgId,
    sessionToken,
    programId: prog.id,
    atRiskContactId: atRiskContact.id,
    normalContactId: normalContact.id,
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

describe('GET /api/v1/class/learners?learningStatus=AT_RISK', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  it('hanya mengembalikan enrollment AT_RISK', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, atRiskContactId, normalContactId } = await seedTwoLearnersOneAtRisk(db);
      const res = await requestOperator(db, 'GET', '/api/v1/class/learners?learningStatus=AT_RISK', sessionToken);
      assert.equal(res.status, 200);
      const ids = res.body.learners.map((l: any) => l.contactId);
      assert.ok(ids.includes(atRiskContactId));
      assert.ok(!ids.includes(normalContactId));
    });
  });

  it('mengembalikan 400 bila learningStatus tidak ada dalam whitelist', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken } = await seedTwoLearnersOneAtRisk(db);
      const res = await requestOperator(db, 'GET', '/api/v1/class/learners?learningStatus=INVALID_STATUS', sessionToken);
      assert.equal(res.status, 400);
    });
  });
});
