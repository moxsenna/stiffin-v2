import { ActivityRepositoryPort } from './ports';
import { FlowActivity } from '@promotor/promotor-flow-fixtures';

export type AppendActivityInput = Omit<FlowActivity, 'id' | 'organizationId'> & { organizationId?: string };

export function createActivityCommands(repo: ActivityRepositoryPort) {
  return {
    async appendActivity(activity: AppendActivityInput): Promise<FlowActivity> {
      return repo.appendActivity({
        ...activity,
        organizationId: activity.organizationId || '',
      });
    },
  };
}
