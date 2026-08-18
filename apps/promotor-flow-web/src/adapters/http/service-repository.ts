import { ServiceRepositoryPort } from '@/modules/services/ports';
import { FlowService } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient, ApiError } from '@promotor/api-client';

export class HttpServiceRepository implements ServiceRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listServices(_organizationId?: string): Promise<FlowService[]> {
    const res = await this.api.listServices();
    return (res.services || []).map((s: any) => this.mapToFlowService(s));
  }

  async getServiceDetail(serviceId: string, _organizationId?: string): Promise<FlowService | null> {
    try {
      const list = await this.listServices();
      const match = list.find((s) => s.id === serviceId);
      return match || null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async createService(service: Omit<FlowService, 'id'>): Promise<FlowService> {
    const res = await this.api.createService({
      name: service.title,
      category: service.category as any,
      priceAmount: service.priceAmount,
      durationMinutes: service.durationMinutes,
      description: service.description,
    });
    return this.mapToFlowService(res.service);
  }

  async updateService(serviceId: string, updates: Partial<FlowService>): Promise<FlowService> {
    const res = await this.api.updateService(serviceId, {
      name: updates.title,
      priceAmount: updates.priceAmount,
      durationMinutes: updates.durationMinutes,
      description: updates.description,
    });
    return this.mapToFlowService(res.service);
  }

  private mapToFlowService(s: any): FlowService {
    return {
      id: s.id,
      organizationId: s.organizationId,
      title: s.name ?? s.title,
      category: s.category,
      priceAmount: s.priceAmount,
      durationMinutes: s.durationMinutes,
      description: s.description ?? undefined,
      isActive: s.isActive ?? true,
    };
  }
}
