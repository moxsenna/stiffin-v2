import { FlowActivity } from '@promotor/promotor-flow-fixtures';

export interface ActivityRepositoryPort {
  listActivities(organizationId: string, contactId: string): Promise<FlowActivity[]>;
  appendActivity(activity: Omit<FlowActivity, 'id'>): Promise<FlowActivity>;
}
