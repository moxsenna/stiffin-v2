import { FlowService } from '@promotor/promotor-flow-fixtures';

export interface ServiceRepositoryPort {
  listServices(organizationId: string): Promise<FlowService[]>;
  getServiceDetail(organizationId: string, serviceId: string): Promise<FlowService | null>;
  createService(service: Omit<FlowService, 'id'>): Promise<FlowService>;
  updateService(serviceId: string, updates: Partial<FlowService>): Promise<FlowService>;
}
