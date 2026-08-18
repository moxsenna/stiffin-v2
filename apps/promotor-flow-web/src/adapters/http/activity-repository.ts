import { ActivityRepositoryPort } from '@/modules/activities/ports';
import { FlowActivity } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpActivityRepository implements ActivityRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listActivities(_organizationId: string, contactId: string): Promise<FlowActivity[]> {
    const res = await this.api.getContactActivities(contactId);
    return (res.activities || []).map((a: any) => ({
      id: a.id,
      organizationId: a.organizationId,
      contactId: a.contactId,
      title: a.title ?? a.eventType,
      detail: a.detail ?? (a.metadataJson ? JSON.stringify(a.metadataJson) : undefined),
      timestamp: a.createdAt ?? a.timestamp ?? new Date().toISOString(),
      type: a.eventType ?? a.type ?? 'STAGE_CHANGED',
    }));
  }

  async appendActivity(activity: Omit<FlowActivity, 'id'>): Promise<FlowActivity> {
    return {
      id: `act_${Date.now()}`,
      ...activity,
    };
  }
}
