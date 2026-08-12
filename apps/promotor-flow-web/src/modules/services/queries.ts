import { ServiceRepositoryPort } from './ports';
import { FlowService } from '@promotor/promotor-flow-fixtures';

export function createServiceQueries(repo: ServiceRepositoryPort) {
  return {
    async listServices(organizationId: string): Promise<FlowService[]> {
      return repo.listServices(organizationId);
    },

    async getServiceDetail(organizationId: string, serviceId: string): Promise<FlowService | null> {
      return repo.getServiceDetail(organizationId, serviceId);
    },
  };
}
