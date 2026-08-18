export interface WeeklyAvailabilityRule {
  id?: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  isActive: boolean;
}

export interface AvailabilityRepositoryPort {
  getWeeklyRules(): Promise<WeeklyAvailabilityRule[]>;
  saveWeeklyRules(rules: WeeklyAvailabilityRule[]): Promise<WeeklyAvailabilityRule[]>;
}
