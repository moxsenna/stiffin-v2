import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPlanAccessService } from '../services/billing/plan-access-service';
import { DomainError } from '../core/errors';

describe('Talira Commercial Engine — PlanAccessService', () => {
  it('FREE plan allows 1 published program, rejects second publication with PLAN_LIMIT_REACHED', async () => {
    let publishedCount = 1;
    const mockRepo: any = {
      getSubscription: async () => ({
        id: 'sub-1',
        organizationId: 'org-1',
        planCode: 'FREE',
        status: 'ACTIVE',
        billingCycle: 'NONE',
        provider: 'NONE',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      }),
      countUsage: async () => ({
        publishedPrograms: publishedCount,
        activeLearners: 5,
        contacts: 20,
      }),
    };

    const service = createPlanAccessService(mockRepo);

    await assert.rejects(
      async () => service.assertCanPublishProgram('org-1'),
      (err: any) => {
        assert.ok(err instanceof DomainError);
        assert.strictEqual(err.code, 'PLAN_LIMIT_REACHED');
        assert.strictEqual(err.details?.feature, 'publish_program');
        assert.strictEqual(err.details?.currentPlan, 'FREE');
        assert.strictEqual(err.details?.requiredPlan, 'SOLO');
        return true;
      }
    );
  });

  it('FREE plan rejects paid programs with FEATURE_REQUIRES_UPGRADE', async () => {
    const mockRepo: any = {
      getSubscription: async () => ({
        id: 'sub-1',
        organizationId: 'org-1',
        planCode: 'FREE',
        status: 'ACTIVE',
        billingCycle: 'NONE',
        provider: 'NONE',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      }),
      countUsage: async () => ({
        publishedPrograms: 0,
        activeLearners: 0,
        contacts: 0,
      }),
    };

    const service = createPlanAccessService(mockRepo);

    await assert.rejects(
      async () => service.assertCanUsePaidPrograms('org-1'),
      (err: any) => {
        assert.ok(err instanceof DomainError);
        assert.strictEqual(err.code, 'FEATURE_REQUIRES_UPGRADE');
        assert.strictEqual(err.details?.feature, 'paid_programs');
        assert.strictEqual(err.details?.requiredPlan, 'SOLO');
        return true;
      }
    );
  });

  it('SOLO plan allows up to 10 published programs and paid programs', async () => {
    const mockRepo: any = {
      getSubscription: async () => ({
        id: 'sub-solo',
        organizationId: 'org-solo',
        planCode: 'SOLO',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        provider: 'PAYCORE',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      }),
      countUsage: async () => ({
        publishedPrograms: 5,
        activeLearners: 120,
        contacts: 450,
      }),
    };

    const service = createPlanAccessService(mockRepo);
    // Should not throw
    await service.assertCanPublishProgram('org-solo');
    await service.assertCanUsePaidPrograms('org-solo');
    await service.assertCanCustomizeStorefront('org-solo');
  });

  it('GRACE_PERIOD preserves paid features during 7-day grace window', async () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const mockRepo: any = {
      getSubscription: async () => ({
        id: 'sub-grace',
        organizationId: 'org-grace',
        planCode: 'SOLO',
        status: 'PAST_DUE',
        graceEndsAt: '2026-09-15T00:00:00.000Z', // 5 days remaining
        billingCycle: 'MONTHLY',
        provider: 'PAYCORE',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-09-08T00:00:00.000Z',
      }),
      countUsage: async () => ({
        publishedPrograms: 2,
        activeLearners: 60,
        contacts: 300,
      }),
    };

    const service = createPlanAccessService(mockRepo, () => now);
    const access = await service.getPlanAccess('org-grace');
    assert.strictEqual(access.isGracePeriod, true);
    assert.strictEqual(access.effectivePaidProgramsAllowed, true);
  });
});
