import type { RevenueSummary } from '@promotor/contracts';

export interface RevenueRepositoryPort {
  getRevenueSummary(period: 'WEEK' | 'MONTH'): Promise<RevenueSummary>;
  getRevenueSettings(): Promise<{ commissionPercent: number }>;
  updateRevenueSettings(commissionPercent: number): Promise<{ commissionPercent: number }>;
}
