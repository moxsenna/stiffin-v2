import { ActivityRepositoryPort } from '@/modules/activities/ports';
import { FlowActivity } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockActivityRepository implements ActivityRepositoryPort {
  constructor(private store: MockStateStore) {}

  private resolveOrgId(organizationId?: string): string {
    return organizationId || 'org_rina_stifin';
  }

  async listActivities(contactId: string, organizationId?: string): Promise<FlowActivity[]> {
    const orgId = this.resolveOrgId(organizationId);
    return this.store
      .getActivities()
      .filter((a) => a.organizationId === orgId && a.contactId === contactId);
  }

  async appendActivity(activityInput: Omit<FlowActivity, 'id'>): Promise<FlowActivity> {
    const orgId = this.resolveOrgId(activityInput.organizationId);
    const activity: FlowActivity = {
      ...activityInput,
      organizationId: orgId,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    this.store.addActivity(activity);
    return activity;
  }
}
