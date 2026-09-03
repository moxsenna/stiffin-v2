import { describe, it } from 'node:test';
import assert from 'node:assert';
import { eq } from 'drizzle-orm';
import { withIntegrationDb, TEST_DATABASE_URL } from './test-env';
import { seedStagingDemo, DEMO_IDS } from '../../../tooling/seed-staging-demo';
import { verifyStagingDemo } from '../../../tooling/verify-staging-demo';
import { resetStagingDemo } from '../../../tooling/reset-staging-demo';
import { organizations } from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);

describe('Staging Demo Workspace — Seeding, Idempotency & Verification', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  it('1. Executes initial demo seeding against staging/test database', async () => {
    await withIntegrationDb(async (db) => {
      process.env.APP_ENV = 'staging';
      process.env.ALLOW_DEMO_SEED = 'true';

      await seedStagingDemo(db, {
        anchorDate: new Date('2026-09-01T10:00:00.000Z'),
        promoterEmail: 'demo.promotor@stifin.id',
        promoterPassword: 'DemoPromotor123!',
        learnerSecret: 'demo-ayu-rahma-token-secret-2026',
      });
    });
  });

  it('2. Automated verification passes all checks with zero failures', async () => {
    await withIntegrationDb(async (db) => {
      const res = await verifyStagingDemo(db);

      assert.strictEqual(res.passed, true, 'All verification checks must pass');
      assert.strictEqual(res.summary.orgSlug, 'demo-promotor');
      assert.strictEqual(res.summary.programsCount, 4);
      assert.strictEqual(res.summary.publishedCount, 3);
      assert.strictEqual(res.summary.draftCount, 1);
      assert.strictEqual(res.summary.contactsCount, 9);
      assert.strictEqual(res.summary.flowOnlyContactsCount, 2);
      assert.strictEqual(res.summary.classLearnersCount, 7);
      assert.strictEqual(res.summary.ayuEnrollmentCount, 3);
      assert.strictEqual(res.summary.unknownEventsCount, 0);
      assert.strictEqual(res.summary.duplicateMilestonesCount, 0);
      assert.strictEqual(res.summary.aftercareCount, 1);
    });
  });

  it('3. Re-running seed is 100% idempotent (0 duplicates, 0 errors)', async () => {
    await withIntegrationDb(async (db) => {
      // Second run
      await seedStagingDemo(db, {
        anchorDate: new Date('2026-09-01T10:00:00.000Z'),
        promoterEmail: 'demo.promotor@stifin.id',
        promoterPassword: 'DemoPromotor123!',
        learnerSecret: 'demo-ayu-rahma-token-secret-2026',
      });

      const res = await verifyStagingDemo(db);
      assert.strictEqual(res.passed, true, 'Verification must still pass after second seed run');
      assert.strictEqual(res.summary.duplicateMilestonesCount, 0);
    });
  });

  it('4. Reset script removes demo tenant cleanly', async () => {
    await withIntegrationDb(async (db) => {
      await resetStagingDemo(db);

      // Verify organization is gone
      const orgRows = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, DEMO_IDS.organization));

      assert.strictEqual(orgRows.length, 0, 'Demo organization should be deleted after reset');
    });
  });

  it('5. Re-seeding after reset restores the canonical demo workspace completely', async () => {
    await withIntegrationDb(async (db) => {
      await seedStagingDemo(db, {
        anchorDate: new Date('2026-09-01T10:00:00.000Z'),
        promoterEmail: 'demo.promotor@stifin.id',
        promoterPassword: 'DemoPromotor123!',
        learnerSecret: 'demo-ayu-rahma-token-secret-2026',
      });

      const res = await verifyStagingDemo(db);
      assert.strictEqual(res.passed, true, 'Verification must pass after fresh seed');
    });
  });
});
