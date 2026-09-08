import { RevenueRepositoryPort } from '@/modules/revenue/ports';
import type { RevenueSummary } from '@promotor/contracts';

const EMPTY_SUMMARY: RevenueSummary = {
  period: 'MONTH',
  paidCount: 0,
  grossAmount: 0,
  commissionPercent: 0,
  estimatedCommission: 0,
};

export class MockRevenueRepository implements RevenueRepositoryPort {
  private commissionPercent = 0;

  async getRevenueSummary(period: 'WEEK' | 'MONTH'): Promise<RevenueSummary> {
    return { ...EMPTY_SUMMARY, period, commissionPercent: this.commissionPercent };
  }

  async getRevenueSettings(): Promise<{ commissionPercent: number }> {
    return { commissionPercent: this.commissionPercent };
  }

  async updateRevenueSettings(commissionPercent: number): Promise<{ commissionPercent: number }> {
    this.commissionPercent = Math.max(0, Math.min(100, Math.floor(commissionPercent)));
    return { commissionPercent: this.commissionPercent };
  }
}
