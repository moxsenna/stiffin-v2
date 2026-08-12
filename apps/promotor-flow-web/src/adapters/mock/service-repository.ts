import { ServiceRepositoryPort } from '@/modules/services/ports';
import { FlowService } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockServiceRepository implements ServiceRepositoryPort {
  constructor(private store: MockStateStore) {}

  async listServices(organizationId: string): Promise<FlowService[]> {
    return this.store.getServices().filter((s) => s.organizationId === organizationId);
  }

  async getServiceDetail(organizationId: string, serviceId: string): Promise<FlowService | null> {
    const service = this.store.getServices().find((s) => s.organizationId === organizationId && s.id === serviceId);
    return service || null;
  }

  async createService(serviceInput: Omit<FlowService, 'id'>): Promise<FlowService> {
    const service: FlowService = {
      ...serviceInput,
      id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    this.store.addService(service);
    return service;
  }

  async updateService(serviceId: string, updates: Partial<FlowService>): Promise<FlowService> {
    return this.store.updateService(serviceId, updates);
  }
}
