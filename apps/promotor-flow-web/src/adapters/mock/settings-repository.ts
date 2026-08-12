import { SettingsRepositoryPort, PromotorSettings } from '@/modules/settings/ports';
import { MockStateStore } from './mock-state-store';

export class MockSettingsRepository implements SettingsRepositoryPort {
  constructor(private store: MockStateStore) {}

  async getSettings(): Promise<PromotorSettings> {
    const s = this.store.getState();
    return {
      promotorName: s.promotorName,
      promotorPhoneE164: s.promotorPhoneE164,
      organizationName: s.organizationName,
      isDevMode: s.isDevMode,
    };
  }

  async updateSettings(updates: Partial<PromotorSettings>): Promise<PromotorSettings> {
    this.store.updateSettings(updates);
    return this.getSettings();
  }

  async resetDemo(): Promise<void> {
    this.store.resetDemo();
  }
}
