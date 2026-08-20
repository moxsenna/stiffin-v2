import { SettingsRepositoryPort, PromotorSettings } from '@/modules/settings/ports';
import { PromotorFlowApiClient } from '@promotor/api-client';
import { getSession } from '@/lib/auth';

export class HttpSettingsRepository implements SettingsRepositoryPort {
  constructor(private readonly api: PromotorFlowApiClient) {}

  async getSettings(): Promise<PromotorSettings> {
    const session = await getSession();
    return {
      promotorName: session?.user?.name || 'Promotor STIFIn',
      promotorPhoneE164: '+6281200000000',
      organizationName: session?.organization?.name || 'STIFIn Center',
      isDevMode: false,
    };
  }

  async updateSettings(updates: Partial<PromotorSettings>): Promise<PromotorSettings> {
    const current = await this.getSettings();
    return { ...current, ...updates };
  }

  async resetDemo(): Promise<void> {
    // In HTTP mode, live backend is the single source of truth
  }
}
