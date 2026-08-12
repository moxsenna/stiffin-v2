import { SettingsRepositoryPort, PromotorSettings } from './ports';

export function createSettingsCommands(repo: SettingsRepositoryPort) {
  return {
    async updateSettings(updates: Partial<PromotorSettings>): Promise<PromotorSettings> {
      return repo.updateSettings(updates);
    },

    async resetDemo(): Promise<void> {
      return repo.resetDemo();
    },
  };
}
