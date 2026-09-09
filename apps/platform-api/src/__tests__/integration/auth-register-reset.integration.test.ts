import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../app';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb } from './test-env';
import { users, authRateLimits } from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);
const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'register-reset-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('auth register reset', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
    await withIntegrationDb(async (db) => {
      await db.delete(authRateLimits);
    });
  });

  beforeEach(async () => {
    await withIntegrationDb(async (db) => {
      await db.delete(authRateLimits);
    });
  });

  it('signup creates unverified user then login blocked until verified', async () => {
    await withIntegrationDb(async () => {
      const app = createApp();
      const email = `reg-${Date.now()}@example.com`;
      const res = await app.request(
        '/api/auth/sign-up/email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Reg Test', email, password: 'password123' }),
        },
        TEST_ENV
      );
      assert.ok([200, 201].includes(res.status), `signup status ${res.status}`);

      const loginRes = await app.request(
        '/api/auth/sign-in/email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'password123' }),
        },
        TEST_ENV
      );
      assert.strictEqual(loginRes.status, 403, `login must be blocked when unverified, got ${loginRes.status}`);
    });
  });

  it('forget-password returns generic success for unknown email', async () => {
    await withIntegrationDb(async () => {
      const app = createApp();
      const res = await app.request(
        '/api/auth/forget-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `unknown-${Date.now()}@example.com` }),
        },
        TEST_ENV
      );
      assert.ok([200, 201].includes(res.status), `forget status ${res.status}`);
    });
  });

  it('soft-deleted user is blocked at sign-up and forget-password', async () => {
    await withIntegrationDb(async (db) => {
      const app = createApp();
      const email = `del-${Date.now()}@example.com`;
      await db.insert(users).values({
        name: 'Deleted User',
        email,
        deletedAt: new Date().toISOString(),
      });

      const signupRes = await app.request(
        '/api/auth/sign-up/email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Deleted User', email, password: 'password123' }),
        },
        TEST_ENV
      );
      assert.strictEqual(signupRes.status, 401, `signup of deleted user must be 401, got ${signupRes.status}`);

      const forgetRes = await app.request(
        '/api/auth/forget-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        },
        TEST_ENV
      );
      assert.strictEqual(forgetRes.status, 401, `forget of deleted user must be 401, got ${forgetRes.status}`);
    });
  });

  it('reset-password rejects invalid or missing token', async () => {
    await withIntegrationDb(async () => {
      const app = createApp();
      const res = await app.request(
        '/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: 'newpassword123', token: 'invalid-token-123' }),
        },
        TEST_ENV
      );
      assert.ok([400, 422].includes(res.status), `invalid token must be rejected, got ${res.status}`);
    });
  });
});
