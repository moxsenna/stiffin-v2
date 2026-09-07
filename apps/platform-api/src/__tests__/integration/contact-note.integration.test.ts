import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { TEST_DATABASE_URL, withIntegrationDb } from './test-env';
import { createApp } from '../../app';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';
import { contacts, contactFlowStates, productEntitlements } from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);
const app = createApp();

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'contact-note-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

async function seedFlowContactFixture(db: NodePgDatabase) {
  const auth = createAuth(db, TEST_ENV, { disableRateLimit: true });
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const email = `operator-${unique}@example.com`;
  const orgSlug = `org-flow-${unique}`;

  const provisioned = await provisionPromotorUser(db, {
    email,
    password: 'Password123!',
    name: 'Operator Flow Note',
    organizationName: 'Flow Note Academy',
    organizationSlug: orgSlug,
  });

  const organizationId = provisioned.organizationId!;

  await db
    .update(productEntitlements)
    .set({ promotorFlow: true, promotorClass: true })
    .where(eq(productEntitlements.organizationId, organizationId));

  const signInRes = await auth.handler(
    new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    })
  );
  const setCookie = signInRes.headers.get('set-cookie');
  assert.ok(setCookie, 'sign-in sets cookie');
  const sessionToken = setCookie.split(';')[0];

  const [contact] = await db
    .insert(contacts)
    .values({
      organizationId,
      name: 'Prospek Note Test',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  await db.insert(contactFlowStates).values({
    organizationId,
    contactId: contact.id,
    stage: 'NEW',
    classification: 'PROSPECT',
  });

  return { sessionToken, contactId: contact.id, organizationId };
}

async function requestOperator(
  _db: NodePgDatabase,
  method: string,
  path: string,
  sessionToken: string,
  body?: unknown
) {
  const reqInit: RequestInit = {
    method,
    headers: {
      cookie: sessionToken,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const res = await app.request(path, reqInit, TEST_ENV as any);
  const text = await res.text();
  let jsonBody: any = null;
  try {
    jsonBody = text ? JSON.parse(text) : null;
  } catch {
    jsonBody = text;
  }

  return {
    status: res.status,
    body: jsonBody,
  };
}

describe('POST /api/v1/flow/contacts/:id/notes', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  it('membuat aktivitas NOTE_ADDED dan muncul di timeline', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, contactId } = await seedFlowContactFixture(db);
      const res = await requestOperator(db, 'POST', `/api/v1/flow/contacts/${contactId}/notes`, sessionToken,
        { body: 'Anak kelas 2 SMP, pemalu, suka melukis — cocok tes minat bakat.' });
      assert.equal(res.status, 201);

      const timeline = await requestOperator(db, 'GET', `/api/v1/flow/contacts/${contactId}/activities`, sessionToken);
      const note = timeline.body.activities.find((a: any) => a.eventType === 'NOTE_ADDED');
      assert.ok(note);
      assert.match(JSON.stringify(note.metadata), /melukis/);
    });
  });

  it('menolak body kosong', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, contactId } = await seedFlowContactFixture(db);
      const res = await requestOperator(db, 'POST', `/api/v1/flow/contacts/${contactId}/notes`, sessionToken, { body: '  ' });
      assert.equal(res.status, 400);
    });
  });
});
