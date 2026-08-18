import { AvailabilityRepositoryPort, WeeklyAvailabilityRule } from './ports';

export function createAvailabilityQueries(repo: AvailabilityRepositoryPort) {
  return {
    async getWeeklyRules(): Promise<WeeklyAvailabilityRule[]> {
      return repo.getWeeklyRules();
    },
  };
}
