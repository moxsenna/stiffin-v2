// apps/platform-api/src/__tests__/integration/payout-lifecycle.integration.test.ts
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../app';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb } from './test-env';
import { organizations } from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);
const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'payout-lifecycle-test-secret-0123456789abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('payout lifecycle', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => { await applyMigrationsAsOwner(); });

  it('dashboard-summary route is registered', async () => {
    await withIntegrationDb(async (db) => {
      await db.insert(organizations)
        .values({ name: 'Payout Org', slug: `payout-${Date.now()}` });
      const app = createApp();
      // NOTE: class routes sit behind sessionMiddleware, so an unauthenticated
      // request returns 401 — the assertion is only that the route exists (not 404).
      const res = await app.request('/api/v1/class/dashboard-summary', {}, TEST_ENV as any);
      assert.notStrictEqual(res.status, 404);
    });
  });

  it('payouts route is registered', async () => {
    await withIntegrationDb(async () => {
      const app = createApp();
      const res = await app.request(
        '/api/v1/class/payouts',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: [], bankAccountId: '00000000-0000-4000-8000-000000000000' }) },
        TEST_ENV as any
      );
      assert.notStrictEqual(res.status, 404);
    });
  });
});
