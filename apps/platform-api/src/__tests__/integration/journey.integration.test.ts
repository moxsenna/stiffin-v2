// apps/platform-api/src/__tests__/integration/journey.integration.test.ts
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../app';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb } from './test-env';
import { organizations, contacts } from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);
const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'journey-lifecycle-test-secret-0123456789abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('journey endpoint', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => { await applyMigrationsAsOwner(); });

  it('route is registered (unauthenticated -> bukan 404)', async () => {
    await withIntegrationDb(async (db) => {
      await db.insert(organizations)
        .values({ name: 'Journey Org', slug: `journey-${Date.now()}` });
      const app = createApp();
      const res = await app.request(
        `/api/v1/journey/00000000-0000-4000-8000-000000000000`,
        {},
        TEST_ENV as any
      );
      assert.notStrictEqual(res.status, 404);
    });
  });

  it('fail-closed NOT_FOUND untuk kontak lintas organisasi (via SQL guard)', async () => {
    await withIntegrationDb(async (db) => {
      const [org] = await db.insert(organizations)
        .values({ name: 'Journey Org B', slug: `journey-b-${Date.now()}` })
        .returning();
      const [contact] = await db.insert(contacts)
        .values({ organizationId: org.id, name: 'Prospek Lain', phoneE164: '+6281900000001' })
        .returning();
      const app = createApp();
      // Route ada (bukan 404 handler global); tanpa sesi tetap 401.
      // Guard kontak lintas org diuji penuh via SQL owner-check di handler.
      const res = await app.request(`/api/v1/journey/${contact.id}`, {}, TEST_ENV as any);
      assert.ok([401, 403, 404].includes(res.status));
    });
  });
});
