import { ActivityRepositoryPort } from '@/modules/activities/ports';
import { FlowActivity } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpActivityRepository implements ActivityRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listActivities(contactId: string, _organizationId?: string): Promise<FlowActivity[]> {
    const res = await this.api.getContactActivities(contactId);
    return (res.activities || []).map((a: any) => this.mapToFlowActivity(a));
  }

  async appendActivity(activity: Omit<FlowActivity, 'id'>): Promise<FlowActivity> {
    // In production HTTP mode, Flow activities are generated server-side by domain operations.
    // Return a typed stub to satisfy interface
    return {
      ...activity,
      id: `act_${Date.now()}`,
    };
  }

  private mapToFlowActivity(a: any): FlowActivity {
    const meta = (a.metadataJson ?? a.metadata ?? {}) as Record<string, any>;
    const title =
      a.title ??
      (a.eventType === 'NOTE_ADDED'
        ? 'Catatan Ditambahkan'
        : a.eventType ?? 'Aktivitas');
    const detail = a.detail ?? meta.note ?? meta.text ?? undefined;
    return {
      id: a.id,
      organizationId: a.organizationId,
      contactId: a.contactId,
      title,
      detail,
      type: (a.eventType || a.type || 'NOTE_ADDED') as FlowActivity['type'],
      timestamp: a.occurredAt ?? a.createdAt ?? new Date().toISOString(),
    };
  }
}
