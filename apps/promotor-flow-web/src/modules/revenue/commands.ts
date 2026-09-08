import { RevenueRepositoryPort } from './ports';

export function createRevenueCommands(repo: RevenueRepositoryPort) {
  return {
    async updateRevenueSettings(commissionPercent: number): Promise<{ commissionPercent: number }> {
      return repo.updateRevenueSettings(commissionPercent);
    },
  };
}
