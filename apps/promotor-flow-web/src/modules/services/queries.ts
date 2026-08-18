import { ServiceRepositoryPort } from './ports';
import { FlowService } from '@promotor/promotor-flow-fixtures';

export function createServiceQueries(repo: ServiceRepositoryPort) {
  return {
    async listServices(organizationId?: string): Promise<FlowService[]> {
      return repo.listServices(organizationId);
    },

    async getServiceDetail(serviceId: string, organizationId?: string): Promise<FlowService | null> {
      return repo.getServiceDetail(serviceId, organizationId);
    },
  };
}
