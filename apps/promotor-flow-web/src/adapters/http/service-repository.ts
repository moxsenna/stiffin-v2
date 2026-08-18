import { ServiceRepositoryPort } from '@/modules/services/ports';
import { FlowService, ServiceCategory } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpServiceRepository implements ServiceRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listServices(_organizationId: string): Promise<FlowService[]> {
    const res = await this.api.listServices();
    return (res.services || []).map((s: any) => this.mapToFlowService(s));
  }

  async getServiceDetail(organizationId: string, serviceId: string): Promise<FlowService | null> {
    const services = await this.listServices(organizationId);
    return services.find((s) => s.id === serviceId) || null;
  }

  async createService(service: Omit<FlowService, 'id'>): Promise<FlowService> {
    const res = await this.api.createService({
      name: service.title,
      category: service.category as any,
      priceAmount: service.priceAmount,
      durationMinutes: service.durationMinutes,
      description: service.description,
      isActive: service.isActive,
    });
    return this.mapToFlowService(res.service);
  }

  async updateService(serviceId: string, updates: Partial<FlowService>): Promise<FlowService> {
    const res = await this.api.updateService(serviceId, {
      name: updates.title,
      category: updates.category as any,
      priceAmount: updates.priceAmount,
      durationMinutes: updates.durationMinutes,
      description: updates.description,
      isActive: updates.isActive,
    });
    return this.mapToFlowService(res.service);
  }

  private mapToFlowService(s: any): FlowService {
    return {
      id: s.id,
      organizationId: s.organizationId,
      title: s.name ?? s.title,
      category: (s.category || 'SESSION') as ServiceCategory,
      priceAmount: s.priceAmount ?? 0,
      durationMinutes: s.durationMinutes ?? 60,
      description: s.description ?? undefined,
      isActive: s.isActive ?? true,
    };
  }
}
