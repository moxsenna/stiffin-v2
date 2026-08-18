import { AvailabilityRepositoryPort, WeeklyAvailabilityRule } from '@/modules/availability/ports';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpAvailabilityRepository implements AvailabilityRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async getWeeklyRules(): Promise<WeeklyAvailabilityRule[]> {
    const res = await this.api.getAvailability();
    return (res.rules ?? []).map((r) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      isActive: r.isActive,
    }));
  }

  async saveWeeklyRules(rules: WeeklyAvailabilityRule[]): Promise<WeeklyAvailabilityRule[]> {
    const res = await this.api.replaceAvailability(
      rules.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        isActive: r.isActive,
      }))
    );
    return (res.rules ?? []).map((r) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      isActive: r.isActive,
    }));
  }
}
