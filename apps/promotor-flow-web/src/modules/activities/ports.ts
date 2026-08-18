import { FlowActivity } from '@promotor/promotor-flow-fixtures';

export interface ActivityRepositoryPort {
  listActivities(contactId: string, organizationId?: string): Promise<FlowActivity[]>;
  appendActivity(activity: Omit<FlowActivity, 'id'>): Promise<FlowActivity>;
}
