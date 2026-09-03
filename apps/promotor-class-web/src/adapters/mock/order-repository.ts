import {
  ProgramPurchaseRequest,
  OrdersListResponse,
  PurchaseStatus,
  PurchaseMethod,
} from '@promotor/contracts';
import { OrderRepositoryPort } from '@/modules/orders/ports';

let mockOrders: ProgramPurchaseRequest[] = [
  {
    id: 'ord-1',
    organizationId: 'org-demo',
    programId: 'prog-demo-paid',
    contactId: 'cnt-1',
    purchaseReference: 'TLR-8F4K2Q',
    purchaseMethod: 'BANK_TRANSFER',
    priceAmount: 349000,
    currency: 'IDR',
    status: 'PENDING',
    buyerName: 'Ayu Rahmawati',
    buyerPhone: '+6281234567890',
    buyerNote: 'Sudah transfer lewat BCA an Ayu Rahmawati',
    bankAccountId: 'bank-1',
    bankAccountDetails: {
      bankName: 'BCA',
      accountNumber: '1234567890',
      accountHolderName: 'Rina Prameswari',
    },
    createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  },
  {
    id: 'ord-2',
    organizationId: 'org-demo',
    programId: 'prog-demo-paid',
    contactId: 'cnt-2',
    purchaseReference: 'TLR-9X2M7L',
    purchaseMethod: 'WHATSAPP',
    priceAmount: 349000,
    currency: 'IDR',
    status: 'APPROVED',
    buyerName: 'Budi Santoso',
    buyerPhone: '+6281298765432',
    buyerNote: null,
    bankAccountId: null,
    programTitle: 'Parenting Intensif STIFIn',
    programSlug: 'parenting-intensif-stifin',
    enrollmentId: 'enr-2',
    approvedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    approvedByUserId: 'usr-1',
    createdAt: new Date(Date.now() - 3600 * 1000 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
  },
];

export class MockOrderRepository implements OrderRepositoryPort {
  async listOrders(query?: { status?: PurchaseStatus; method?: PurchaseMethod }): Promise<OrdersListResponse> {
    let result = [...mockOrders];
    if (query?.status) {
      result = result.filter((o) => o.status === query.status);
    }
    if (query?.method) {
      result = result.filter((o) => o.purchaseMethod === query.method);
    }
    return { orders: result, total: result.length };
  }

  async getOrderById(id: string): Promise<{ order: ProgramPurchaseRequest }> {
    const order = mockOrders.find((o) => o.id === id);
    if (!order) throw new Error('Order not found');
    return { order };
  }

  async approveOrder(id: string): Promise<{ order: ProgramPurchaseRequest; enrollmentId: string; wasAlreadyApproved: boolean }> {
    const idx = mockOrders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Order not found');
    const existing = mockOrders[idx];
    if (existing.status === 'APPROVED') {
      return { order: existing, enrollmentId: existing.enrollmentId || 'enr-mock', wasAlreadyApproved: true };
    }

    const updated: ProgramPurchaseRequest = {
      ...existing,
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedByUserId: 'usr-demo',
      enrollmentId: `enr-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    mockOrders[idx] = updated;
    return { order: updated, enrollmentId: updated.enrollmentId!, wasAlreadyApproved: false };
  }

  async rejectOrder(id: string, reason?: string | null): Promise<{ order: ProgramPurchaseRequest }> {
    const idx = mockOrders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Order not found');
    const existing = mockOrders[idx];

    const updated: ProgramPurchaseRequest = {
      ...existing,
      status: 'REJECTED',
      rejectedAt: new Date().toISOString(),
      rejectedByUserId: 'usr-demo',
      rejectionReason: reason || null,
      updatedAt: new Date().toISOString(),
    };
    mockOrders[idx] = updated;
    return { order: updated };
  }
}
