import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockRevenueRepository } from '../adapters/mock/revenue-repository';
import { HttpRevenueRepository } from '../adapters/http/revenue-repository';
import { createRevenueQueries } from '../modules/revenue/queries';
import { createRevenueCommands } from '../modules/revenue/commands';

describe('C7 — Revenue Flow Web Unit Tests', () => {
  it('MockRevenueRepository gets and updates commission settings', async () => {
    const repo = new MockRevenueRepository();
    const queries = createRevenueQueries(repo);
    const commands = createRevenueCommands(repo);

    const initial = await queries.getRevenueSettings();
    assert.equal(initial.commissionPercent, 0);

    const updated = await commands.updateRevenueSettings(15);
    assert.equal(updated.commissionPercent, 15);

    const summary = await queries.getRevenueSummary('MONTH');
    assert.equal(summary.period, 'MONTH');
    assert.equal(summary.commissionPercent, 15);
    assert.equal(summary.grossAmount, 0);
    assert.equal(summary.paidCount, 0);
  });

  it('HttpRevenueRepository delegates to PromotorFlowApiClient correctly', async () => {
    const mockApiClient: any = {
      getRevenueSummary: async (period: string) => ({
        summary: {
          period,
          paidCount: 3,
          grossAmount: 1500000,
          commissionPercent: 10,
          estimatedCommission: 150000,
        },
      }),
      getRevenueSettings: async () => ({ commissionPercent: 10 }),
      updateRevenueSettings: async (commissionPercent: number) => ({ commissionPercent }),
    };

    const repo = new HttpRevenueRepository(mockApiClient);
    const summary = await repo.getRevenueSummary('WEEK');
    assert.equal(summary.period, 'WEEK');
    assert.equal(summary.paidCount, 3);
    assert.equal(summary.estimatedCommission, 150000);

    const settings = await repo.getRevenueSettings();
    assert.equal(settings.commissionPercent, 10);

    const updated = await repo.updateRevenueSettings(20);
    assert.equal(updated.commissionPercent, 20);
  });
});
