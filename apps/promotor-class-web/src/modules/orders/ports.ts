import {
  ProgramPurchaseRequest,
  OrdersListResponse,
  PurchaseStatus,
  PurchaseMethod,
} from '@promotor/contracts';

export interface OrderRepositoryPort {
  listOrders(query?: { status?: PurchaseStatus; method?: PurchaseMethod }): Promise<OrdersListResponse>;
  getOrderById(id: string): Promise<{ order: ProgramPurchaseRequest }>;
  approveOrder(id: string): Promise<{ order: ProgramPurchaseRequest; enrollmentId: string; wasAlreadyApproved: boolean }>;
  rejectOrder(id: string, reason?: string | null): Promise<{ order: ProgramPurchaseRequest }>;
}
