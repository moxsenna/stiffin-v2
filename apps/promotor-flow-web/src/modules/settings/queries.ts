import { SettingsRepositoryPort, PromotorSettings } from './ports';

export function createSettingsQueries(repo: SettingsRepositoryPort) {
  return {
    async getSettings(): Promise<PromotorSettings> {
      return repo.getSettings();
    },
  };
}
