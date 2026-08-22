import { SettingsRepositoryPort, PromotorSettings } from '@/modules/settings/ports';
import { PromotorFlowApiClient } from '@promotor/api-client';
import { getSession } from '@/lib/auth';

export class HttpSettingsRepository implements SettingsRepositoryPort {
  constructor(private readonly api: PromotorFlowApiClient) {}

  async getSettings(): Promise<PromotorSettings> {
    const session = await getSession();
    return {
      promotorName: session?.user?.name || 'Promotor',
      promotorPhoneE164: '',
      organizationName: session?.organization?.name || '',
      isDevMode: false,
    };
  }

  async updateSettings(_updates: Partial<PromotorSettings>): Promise<PromotorSettings> {
    throw new Error('Pengaturan profil hanya dapat diubah melalui portal manajemen organisasi di HTTP mode');
  }

  async resetDemo(): Promise<void> {
    // No-op in HTTP production mode
  }
}
