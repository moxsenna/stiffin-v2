import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import {
  applyMigrationsAsOwner,
  TEST_DATABASE_URL,
  withIntegrationDb,
} from './test-env';
import {
  productEntitlements,
  contacts,
  contactFlowStates,
} from '../../db/schema';
import { createApp } from '../../app';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';
import { resolveOutcomeEffect } from '../../domain/next-action-rules';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'wa-outcome-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

async function signInCookie(auth: ReturnType<typeof createAuth>, email: string) {
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

describe('resolveOutcomeEffect', () => {
  it('INTERESTED_TEST → stage INTERESTED + follow-up +2 hari', () => {
    const effect = resolveOutcomeEffect('INTERESTED_TEST', 'act-1', new Date('2026-09-06T02:00:00Z'));
    assert.equal(effect.stage, 'INTERESTED');
    assert.equal(effect.followUp?.title, 'Ajak booking Tes STIFIn');
    assert.equal(effect.followUp?.dueAt.toISOString(), new Date('2026-09-08T02:00:00Z').toISOString());
    assert.equal(effect.followUp?.idempotencyKey, 'wa-outcome:INTERESTED_TEST:act-1');
  });

  it('ASK_SCHEDULE → manual action kunci jadwal +1 hari', () => {
    const effect = resolveOutcomeEffect('ASK_SCHEDULE', 'act-1', new Date('2026-09-06T02:00:00Z'));
    assert.equal(effect.followUp?.actionType, 'MANUAL');
    assert.equal(effect.followUp?.title, 'Kunci jadwal konsultasi');
  });

  it('WAIT_PAYDAY → follow-up +3 hari', () => {
    const effect = resolveOutcomeEffect('WAIT_PAYDAY', 'act-1', new Date('2026-09-06T02:00:00Z'));
    assert.equal(effect.nextFollowUpDays, 3);
  });

  it('NO_RESPONSE → follow-up +2 hari', () => {
    const effect = resolveOutcomeEffect('NO_RESPONSE', 'act-1', new Date('2026-09-06T02:00:00Z'));
    assert.equal(effect.nextFollowUpDays, 2);
  });

  it('outcome undefined → efek netral', () => {
    assert.deepEqual(resolveOutcomeEffect(undefined, 'act-1', new Date()), { stage: null, followUp: null, nextFollowUpDays: null });
  });
});

describe('C1 — WA outcome confirm-sent integration', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  const app = createApp();
  let cookie: string;
  let contactId: string;

  async function createPendingAction(title = 'Kirim follow-up WA'): Promise<string> {
    const res = await app.request(
      '/api/v1/flow/next-actions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({
          contactId,
          actionType: 'FOLLOW_UP',
          title,
          dueAt: new Date(Date.now() + 86400000).toISOString(),
          priority: 70,
        }),
      },
      TEST_ENV as any
    );
    assert.strictEqual(res.status, 201);
    const json = (await res.json()) as any;
    return json.nextAction.id as string;
  }

  before(async () => {
    await applyMigrationsAsOwner();
    await withIntegrationDb(async (db) => {
      const auth = createAuth(db, TEST_ENV, { disableRateLimit: true });
      const email = `wa-outcome-${Date.now()}@example.com`;
      const provisioned = await provisionPromotorUser(db, {
        email,
        password: 'Password123!',
        name: 'WA Outcome Tester',
        organizationName: 'WA Outcome Org',
        organizationSlug: `wa-outcome-${Date.now()}`,
      });
      await db
        .update(productEntitlements)
        .set({ promotorFlow: true, promotorClass: true })
        .where(eq(productEntitlements.organizationId, provisioned.organizationId!));
      cookie = await signInCookie(auth, email);

      const [contact] = await db
        .insert(contacts)
        .values({
          organizationId: provisioned.organizationId!,
          name: 'Outcome Contact',
          phoneE164: '+6289900000011',
        })
        .returning();
      contactId = contact.id;
      await db.insert(contactFlowStates).values({
        organizationId: provisioned.organizationId!,
        contactId,
        stage: 'CONTACTED',
        classification: 'PROSPECT',
        interest: 'Tes STIFIn',
      });
    });
  });

  it('INTERESTED_TEST: stage INTERESTED + createdAction Ajak booking', async () => {
    const actionId = await createPendingAction();
    const res = await app.request(
      '/api/v1/flow/messaging/confirm-sent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ nextActionId: actionId, outcome: 'INTERESTED_TEST' }),
      },
      TEST_ENV as any
    );
    assert.strictEqual(res.status, 200);
    const json = (await res.json()) as any;
    assert.strictEqual(json.nextAction.status, 'COMPLETED');
    assert.strictEqual(json.createdAction.title, 'Ajak booking Tes STIFIn');

    const ctxRes = await app.request(
      `/api/v1/flow/contacts/${contactId}`,
      { method: 'GET', headers: { cookie } },
      TEST_ENV as any
    );
    const ctxJson = (await ctxRes.json()) as any;
    assert.strictEqual(ctxJson.context.stage, 'INTERESTED');
  });

  it('idempotent retry tidak menduplikasi createdAction', async () => {
    const actionId = await createPendingAction('Retry outcome action');
    const payload = { nextActionId: actionId, outcome: 'ASK_SCHEDULE' };
    const first = await app.request(
      '/api/v1/flow/messaging/confirm-sent',
      { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(payload) },
      TEST_ENV as any
    );
    const firstJson = (await first.json()) as any;
    const second = await app.request(
      '/api/v1/flow/messaging/confirm-sent',
      { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(payload) },
      TEST_ENV as any
    );
    const secondJson = (await second.json()) as any;
    assert.strictEqual(firstJson.createdAction.id, secondJson.createdAction.id);
    assert.strictEqual(secondJson.createdAction.title, 'Kunci jadwal konsultasi');
  });

  it('NO_RESPONSE tanpa pilihan manual memakai default +2 hari', async () => {
    const actionId = await createPendingAction('No response action');
    const res = await app.request(
      '/api/v1/flow/messaging/confirm-sent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ nextActionId: actionId, outcome: 'NO_RESPONSE' }),
      },
      TEST_ENV as any
    );
    assert.strictEqual(res.status, 200);
    const json = (await res.json()) as any;
    assert.strictEqual(json.createdAction.title, 'Follow-up 2 hari lagi');
  });

  it('legacy tanpa outcome tetap backward-compatible', async () => {
    const actionId = await createPendingAction('Legacy action');
    const res = await app.request(
      '/api/v1/flow/messaging/confirm-sent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ nextActionId: actionId }),
      },
      TEST_ENV as any
    );
    assert.strictEqual(res.status, 200);
    const json = (await res.json()) as any;
    assert.strictEqual(json.nextAction.status, 'COMPLETED');
    assert.strictEqual(json.createdAction, null);
  });
});
