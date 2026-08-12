import { ActivityRepositoryPort } from './ports';
import { FlowActivity } from '@promotor/promotor-flow-fixtures';

export function createActivityQueries(repo: ActivityRepositoryPort) {
  return {
    async listActivities(organizationId: string, contactId: string): Promise<FlowActivity[]> {
      return repo.listActivities(organizationId, contactId);
    },
  };
}
