import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { TEST_DATABASE_URL, withIntegrationDb } from './test-env';
import { createApp } from '../../app';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';
import {
  contacts,
  contactFlowStates,
  productEntitlements,
  activities,
  nextActions,
} from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);
const app = createApp();

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'contact-filters-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

async function seedTwoContactsOneContacted(db: NodePgDatabase) {
  const auth = createAuth(db, TEST_ENV, { disableRateLimit: true });
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const email = `operator-wa-${unique}@example.com`;
  const orgSlug = `org-wa-${unique}`;

  const provisioned = await provisionPromotorUser(db, {
    email,
    password: 'Password123!',
    name: 'Operator WA Filters',
    organizationName: 'WA Filter Academy',
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

  const [contacted] = await db
    .insert(contacts)
    .values({
      organizationId,
      name: 'Contacted Person',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  const [untouched] = await db
    .insert(contacts)
    .values({
      organizationId,
      name: 'Untouched Person',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  await db.insert(contactFlowStates).values([
    {
      organizationId,
      contactId: contacted.id,
      stage: 'CONTACTED',
      classification: 'PROSPECT',
    },
    {
      organizationId,
      contactId: untouched.id,
      stage: 'NEW',
      classification: 'PROSPECT',
    },
  ]);

  await db.insert(activities).values({
    organizationId,
    contactId: contacted.id,
    eventType: 'WHATSAPP_SENT',
    metadataJson: {},
    occurredAt: new Date().toISOString(),
  });

  return {
    sessionToken,
    contactedId: contacted.id,
    untouchedId: untouched.id,
    organizationId,
  };
}

async function seedOverdueAndFutureContacts(db: NodePgDatabase) {
  const auth = createAuth(db, TEST_ENV, { disableRateLimit: true });
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const email = `operator-overdue-${unique}@example.com`;
  const orgSlug = `org-overdue-${unique}`;

  const provisioned = await provisionPromotorUser(db, {
    email,
    password: 'Password123!',
    name: 'Operator Overdue Filters',
    organizationName: 'Overdue Filter Academy',
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

  const [overdueContact] = await db
    .insert(contacts)
    .values({
      organizationId,
      name: 'Overdue Person',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  const [futureContact] = await db
    .insert(contacts)
    .values({
      organizationId,
      name: 'Future Person',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  await db.insert(contactFlowStates).values([
    {
      organizationId,
      contactId: overdueContact.id,
      stage: 'FOLLOW_UP',
      classification: 'PROSPECT',
    },
    {
      organizationId,
      contactId: futureContact.id,
      stage: 'FOLLOW_UP',
      classification: 'PROSPECT',
    },
  ]);

  // Overdue action: due_at 1 day ago
  await db.insert(nextActions).values({
    organizationId,
    contactId: overdueContact.id,
    actionType: 'FOLLOW_UP',
    title: 'Follow up terlambat',
    dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    priority: 70,
    status: 'PENDING',
  });

  // Future action: due_at 1 day later
  await db.insert(nextActions).values({
    organizationId,
    contactId: futureContact.id,
    actionType: 'FOLLOW_UP',
    title: 'Follow up besok',
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    priority: 70,
    status: 'PENDING',
  });

  return {
    sessionToken,
    overdueContactId: overdueContact.id,
    futureContactId: futureContact.id,
    organizationId,
  };
}

async function seedStageContacts(db: NodePgDatabase) {
  const auth = createAuth(db, TEST_ENV, { disableRateLimit: true });
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const email = `operator-stage-${unique}@example.com`;
  const orgSlug = `org-stage-${unique}`;

  const provisioned = await provisionPromotorUser(db, {
    email,
    password: 'Password123!',
    name: 'Operator Stage Filters',
    organizationName: 'Stage Filter Academy',
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

  const [newContact] = await db
    .insert(contacts)
    .values({
      organizationId,
      name: 'New Stage Person',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  const [contactedContact] = await db
    .insert(contacts)
    .values({
      organizationId,
      name: 'Contacted Stage Person',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  await db.insert(contactFlowStates).values([
    {
      organizationId,
      contactId: newContact.id,
      stage: 'NEW',
      classification: 'PROSPECT',
    },
    {
      organizationId,
      contactId: contactedContact.id,
      stage: 'CONTACTED',
      classification: 'PROSPECT',
    },
  ]);

  return {
    sessionToken,
    newContactId: newContact.id,
    contactedContactId: contactedContact.id,
    organizationId,
  };
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

describe('filter cerdas kontak', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  it('neverContacted hanya kontak tanpa aktivitas WA', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, contactedId, untouchedId } = await seedTwoContactsOneContacted(db);
      const res = await requestOperator(db, 'GET', '/api/v1/flow/contacts?neverContacted=true', sessionToken);
      assert.equal(res.status, 200);
      const ids = res.body.contacts.map((c: any) => c.id);
      assert.ok(ids.includes(untouchedId));
      assert.ok(!ids.includes(contactedId));
    });
  });

  it('followUpOverdue hanya kontak dengan action PENDING lewat jatuh tempo', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, overdueContactId, futureContactId } = await seedOverdueAndFutureContacts(db);
      const res = await requestOperator(db, 'GET', '/api/v1/flow/contacts?followUpOverdue=true', sessionToken);
      assert.equal(res.status, 200);
      const ids = res.body.contacts.map((c: any) => c.id);
      assert.ok(ids.includes(overdueContactId));
      assert.ok(!ids.includes(futureContactId));
    });
  });

  it('stage memfilter kontak sesuai lifecycle stage', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, newContactId, contactedContactId } = await seedStageContacts(db);
      const res = await requestOperator(db, 'GET', '/api/v1/flow/contacts?stage=CONTACTED', sessionToken);
      assert.equal(res.status, 200);
      const ids = res.body.contacts.map((c: any) => c.id);
      assert.ok(ids.includes(contactedContactId));
      assert.ok(!ids.includes(newContactId));
    });
  });
});
