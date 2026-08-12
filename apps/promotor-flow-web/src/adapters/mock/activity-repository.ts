import { ActivityRepositoryPort } from '@/modules/activities/ports';
import { FlowActivity } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockActivityRepository implements ActivityRepositoryPort {
  constructor(private store: MockStateStore) {}

  async listActivities(organizationId: string, contactId: string): Promise<FlowActivity[]> {
    return this.store
      .getActivities()
      .filter((a) => a.organizationId === organizationId && a.contactId === contactId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async appendActivity(activityInput: Omit<FlowActivity, 'id'>): Promise<FlowActivity> {
    const activity: FlowActivity = {
      ...activityInput,
      id: `act_ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    this.store.addActivity(activity);
    return activity;
  }
}
