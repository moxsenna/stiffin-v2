import { SettingsRepositoryPort, PromotorSettings } from '@/modules/settings/ports';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpSettingsRepository implements SettingsRepositoryPort {
  private settings: PromotorSettings = {
    promotorName: 'Operator',
    promotorPhoneE164: '+6281200000000',
    organizationName: 'Active Organization',
    isDevMode: false,
  };

  constructor(_api: PromotorFlowApiClient) {}

  async getSettings(): Promise<PromotorSettings> {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<PromotorSettings>): Promise<PromotorSettings> {
    this.settings = { ...this.settings, ...updates };
    return { ...this.settings };
  }

  async resetDemo(): Promise<void> {
    // In HTTP mode, live backend is the single source of truth
  }
}
