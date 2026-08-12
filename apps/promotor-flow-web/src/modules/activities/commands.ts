import { ActivityRepositoryPort } from './ports';
import { FlowActivity } from '@promotor/promotor-flow-fixtures';

export function createActivityCommands(repo: ActivityRepositoryPort) {
  return {
    async appendActivity(activity: Omit<FlowActivity, 'id'>): Promise<FlowActivity> {
      return repo.appendActivity(activity);
    },
  };
}
