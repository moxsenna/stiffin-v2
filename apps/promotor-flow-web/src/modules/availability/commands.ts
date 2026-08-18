import { AvailabilityRepositoryPort, WeeklyAvailabilityRule } from './ports';

export function createAvailabilityCommands(repo: AvailabilityRepositoryPort) {
  return {
    async saveWeeklyRules(rules: WeeklyAvailabilityRule[]): Promise<WeeklyAvailabilityRule[]> {
      return repo.saveWeeklyRules(rules);
    },
  };
}
