import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../app';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb } from './test-env';
import { organizations } from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);
const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'admin-entitlements-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
  ADMIN_API_KEY: 'test-admin-key',
};

describe('admin entitlements', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
  });

  it('rejects without key, grants with key', async () => {
    await withIntegrationDb(async (db) => {
      const [org] = await db
        .insert(organizations)
        .values({ name: 'Admin Grant Org', slug: `admin-grant-${Date.now()}` })
        .returning();
      const app = createApp();

      const denied = await app.request(
        '/api/admin/entitlements',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: org.id, promotorClass: true }),
        },
        TEST_ENV
      );
      assert.strictEqual(denied.status, 403);

      const granted = await app.request(
        '/api/admin/entitlements',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': 'test-admin-key' },
          body: JSON.stringify({ organizationId: org.id, promotorClass: true, promotorFlow: false }),
        },
        TEST_ENV
      );
      assert.strictEqual(granted.status, 200);
      const body = (await granted.json()) as {
        entitlements: { organizationId: string; promotorClass: boolean; promotorFlow: boolean };
      };
      assert.strictEqual(body.entitlements.organizationId, org.id);
      assert.strictEqual(body.entitlements.promotorClass, true);
      assert.strictEqual(body.entitlements.promotorFlow, false);
    });
  });

  it('rejects bad uuid and empty patch', async () => {
    await withIntegrationDb(async () => {
      const app = createApp();
      const headers = { 'Content-Type': 'application/json', 'x-admin-key': 'test-admin-key' };
      const badId = await app.request(
        '/api/admin/entitlements',
        { method: 'POST', headers, body: JSON.stringify({ organizationId: 'nope' }) },
        TEST_ENV
      );
      assert.strictEqual(badId.status, 400);
      const empty = await app.request(
        '/api/admin/entitlements',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ organizationId: '00000000-0000-4000-8000-000000000000' }),
        },
        TEST_ENV
      );
      assert.strictEqual(empty.status, 400);
    });
  });
});
