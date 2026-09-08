import { RevenueRepositoryPort } from '@/modules/revenue/ports';
import { PromotorFlowApiClient } from '@promotor/api-client';
import type { RevenueSummary } from '@promotor/contracts';

export class HttpRevenueRepository implements RevenueRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async getRevenueSummary(period: 'WEEK' | 'MONTH'): Promise<RevenueSummary> {
    const res = await this.api.getRevenueSummary(period);
    return res.summary;
  }

  async getRevenueSettings(): Promise<{ commissionPercent: number }> {
    return this.api.getRevenueSettings();
  }

  async updateRevenueSettings(commissionPercent: number): Promise<{ commissionPercent: number }> {
    return this.api.updateRevenueSettings(commissionPercent);
  }
}
