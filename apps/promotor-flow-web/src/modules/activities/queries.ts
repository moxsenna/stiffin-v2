import { ActivityRepositoryPort } from './ports';
import { FlowActivity } from '@promotor/promotor-flow-fixtures';

export function createActivityQueries(repo: ActivityRepositoryPort) {
  return {
    async listActivities(contactId: string, organizationId?: string): Promise<FlowActivity[]> {
      return repo.listActivities(contactId, organizationId);
    },
  };
}
