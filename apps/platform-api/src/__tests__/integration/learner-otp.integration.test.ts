import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app';
import {
  withIntegrationDb,
  applyMigrationsAsOwner,
  TEST_DATABASE_URL,
} from './test-env';
import { seedLearningFixture } from './helpers/learning-fixture';
import { contacts } from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
  APP_ENV: 'test',
  LEARNER_OTP_CHANNEL: 'log',
} as any;

async function postOtp(path: string, body: unknown) {
  const app = createApp();
  const res = await app.request(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    TEST_ENV
  );
  const json = (await res.json().catch(() => ({}))) as any;
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body: json, setCookie };
}

describe('learner OTP integration', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
  });

  it('happy path: request → verify → cookie → enrollments 200', async () => {
    await withIntegrationDb(async (db) => {
      const fixture = await seedLearningFixture(db);
      const [contact] = await db.select().from(contacts);
      const target = (await db.select().from(contacts)).find((c) => c.id === fixture.contactId) ?? contact;
      void contact;

      const req = await postOtp('/api/v1/learner/auth/otp/request', {
        phoneRaw: target.phoneE164,
      });
      assert.equal(req.status, 200);
      assert.ok(req.body.expiresAt);
      assert.match(req.body.devCode, /^\d{6}$/);

      const verify = await postOtp('/api/v1/learner/auth/otp/verify', {
        phoneRaw: target.phoneE164,
        code: req.body.devCode,
      });
      assert.equal(verify.status, 200);
      assert.equal(verify.body.contactId, fixture.contactId);
      assert.ok(verify.setCookie?.includes('promotor_learner_session='));

      const cookie = verify.setCookie!.split(';')[0];
      const app = createApp();
      const me = await app.request(
        '/api/v1/learner/me/enrollments',
        { method: 'GET', headers: { Cookie: cookie } },
        TEST_ENV
      );
      assert.equal(me.status, 200);
    });
  });

  it('5x kode salah → OTP_EXPIRED', async () => {
    await withIntegrationDb(async (db) => {
      const fixture = await seedLearningFixture(db);
      const rows = await db.select().from(contacts);
      const target = rows.find((c) => c.id === fixture.contactId)!;

      const req = await postOtp('/api/v1/learner/auth/otp/request', {
        phoneRaw: target.phoneE164,
      });
      assert.equal(req.status, 200);
      const realCode = req.body.devCode as string;
      const wrongCode = realCode === '000000' ? '111111' : '000000';

      for (let i = 0; i < 4; i++) {
        const attempt = await postOtp('/api/v1/learner/auth/otp/verify', {
          phoneRaw: target.phoneE164,
          code: wrongCode,
        });
        assert.equal(attempt.status, 401);
        assert.equal(attempt.body.error.code, 'OTP_INVALID');
      }
      const fifth = await postOtp('/api/v1/learner/auth/otp/verify', {
        phoneRaw: target.phoneE164,
        code: wrongCode,
      });
      assert.equal(fifth.status, 401);
      assert.equal(fifth.body.error.code, 'OTP_EXPIRED');
    });
  });
});
