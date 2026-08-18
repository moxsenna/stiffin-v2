import { AvailabilityRepositoryPort, WeeklyAvailabilityRule } from '@/modules/availability/ports';

const DEFAULT_WEEKLY_RULES: WeeklyAvailabilityRule[] = [
  { id: 'rule_1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true }, // Senin
  { id: 'rule_2', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true }, // Selasa
  { id: 'rule_3', dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true }, // Rabu
  { id: 'rule_4', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true }, // Kamis
  { id: 'rule_5', dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isActive: true }, // Jumat
  { id: 'rule_6', dayOfWeek: 6, startTime: '10:00', endTime: '15:00', isActive: false }, // Sabtu
  { id: 'rule_7', dayOfWeek: 0, startTime: '10:00', endTime: '15:00', isActive: false }, // Minggu
];

export class MockAvailabilityRepository implements AvailabilityRepositoryPort {
  private rules: WeeklyAvailabilityRule[] = [...DEFAULT_WEEKLY_RULES];

  async getWeeklyRules(): Promise<WeeklyAvailabilityRule[]> {
    return [...this.rules];
  }

  async saveWeeklyRules(rules: WeeklyAvailabilityRule[]): Promise<WeeklyAvailabilityRule[]> {
    this.rules = rules.map((r, idx) => ({
      ...r,
      id: r.id || `mock_rule_${idx + 1}`,
    }));
    return [...this.rules];
  }
}
