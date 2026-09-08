import { RevenueRepositoryPort } from './ports';
import type { RevenueSummary } from '@promotor/contracts';

export function createRevenueQueries(repo: RevenueRepositoryPort) {
  return {
    async getRevenueSummary(period: 'WEEK' | 'MONTH' = 'MONTH'): Promise<RevenueSummary> {
      return repo.getRevenueSummary(period);
    },
    async getRevenueSettings(): Promise<{ commissionPercent: number }> {
      return repo.getRevenueSettings();
    },
  };
}
