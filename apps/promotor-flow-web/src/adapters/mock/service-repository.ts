import { ServiceRepositoryPort } from '@/modules/services/ports';
import { FlowService } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockServiceRepository implements ServiceRepositoryPort {
  constructor(private store: MockStateStore) {}

  private resolveOrgId(organizationId?: string): string {
    return organizationId || 'org_rina_stifin';
  }

  async listServices(organizationId?: string): Promise<FlowService[]> {
    const orgId = this.resolveOrgId(organizationId);
    return this.store.getServices().filter((s) => s.organizationId === orgId);
  }

  async getServiceDetail(serviceId: string, organizationId?: string): Promise<FlowService | null> {
    const orgId = this.resolveOrgId(organizationId);
    const s = this.store.getServices().find((s) => s.organizationId === orgId && s.id === serviceId);
    return s || null;
  }

  async createService(serviceInput: Omit<FlowService, 'id'>): Promise<FlowService> {
    const service: FlowService = {
      ...serviceInput,
      id: `service_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    this.store.addService(service);
    return service;
  }

  async updateService(serviceId: string, updates: Partial<FlowService>): Promise<FlowService> {
    return this.store.updateService(serviceId, updates);
  }
}
