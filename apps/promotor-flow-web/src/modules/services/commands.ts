import { ServiceRepositoryPort } from './ports';
import { FlowService } from '@promotor/promotor-flow-fixtures';

export function createServiceCommands(repo: ServiceRepositoryPort) {
  return {
    async createService(input: Omit<FlowService, 'id'>): Promise<FlowService> {
      return repo.createService(input);
    },

    async updateService(serviceId: string, updates: Partial<FlowService>): Promise<FlowService> {
      return repo.updateService(serviceId, updates);
    },
  };
}
