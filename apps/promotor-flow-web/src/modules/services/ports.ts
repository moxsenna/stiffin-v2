import { FlowService } from '@promotor/promotor-flow-fixtures';

export interface ServiceRepositoryPort {
  listServices(organizationId?: string): Promise<FlowService[]>;
  getServiceDetail(serviceId: string, organizationId?: string): Promise<FlowService | null>;
  createService(service: Omit<FlowService, 'id'>): Promise<FlowService>;
  updateService(serviceId: string, updates: Partial<FlowService>): Promise<FlowService>;
}
