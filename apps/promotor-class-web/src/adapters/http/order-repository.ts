import { PromotorClassContentApiClient } from '@promotor/api-client';
import {
  ProgramPurchaseRequest,
  OrdersListResponse,
  PurchaseStatus,
  PurchaseMethod,
} from '@promotor/contracts';
import { OrderRepositoryPort } from '@/modules/orders/ports';

export class HttpOrderRepository implements OrderRepositoryPort {
  constructor(private readonly client: PromotorClassContentApiClient) {}

  async listOrders(query?: { status?: PurchaseStatus; method?: PurchaseMethod }): Promise<OrdersListResponse> {
    return this.client.listOrders(query);
  }

  async getOrderById(id: string): Promise<{ order: ProgramPurchaseRequest }> {
    return this.client.getOrderById(id);
  }

  async approveOrder(id: string): Promise<{ order: ProgramPurchaseRequest; enrollmentId: string; wasAlreadyApproved: boolean }> {
    return this.client.approveOrder(id);
  }

  async rejectOrder(id: string, reason?: string | null): Promise<{ order: ProgramPurchaseRequest }> {
    return this.client.rejectOrder(id, reason);
  }
}
