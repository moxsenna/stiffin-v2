export interface PromotorSettings {
  promotorName: string;
  promotorPhoneE164: string;
  organizationName: string;
  isDevMode: boolean;
}

export interface SettingsRepositoryPort {
  getSettings(): Promise<PromotorSettings>;
  updateSettings(updates: Partial<PromotorSettings>): Promise<PromotorSettings>;
  resetDemo(): Promise<void>;
}
