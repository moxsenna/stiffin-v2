import {
  OrganizationPaymentSettings,
  OrganizationBankAccount,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
  UpdatePaymentSettingsRequest,
  PublicPaymentInfo,
} from '@promotor/contracts';
import { PaymentRepositoryPort } from '@/modules/payments/ports';

let mockBankAccounts: OrganizationBankAccount[] = [
  {
    id: 'bank-1',
    organizationId: 'org-demo',
    bankName: 'BCA',
    accountNumber: '8735019284',
    accountHolderName: 'Rina Prameswari',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bank-2',
    organizationId: 'org-demo',
    bankName: 'Bank Mandiri',
    accountNumber: '1370019283746',
    accountHolderName: 'Rina Prameswari',
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let mockSettings: OrganizationPaymentSettings = {
  organizationId: 'org-demo',
  salesWhatsAppNumber: '+6281234567890',
  bankAccounts: mockBankAccounts,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export class MockPaymentRepository implements PaymentRepositoryPort {
  async getPaymentSettings(): Promise<{ settings: OrganizationPaymentSettings }> {
    return { settings: { ...mockSettings, bankAccounts: [...mockBankAccounts] } };
  }

  async updatePaymentSettings(data: UpdatePaymentSettingsRequest): Promise<{ settings: OrganizationPaymentSettings }> {
    mockSettings = {
      ...mockSettings,
      salesWhatsAppNumber: data.salesWhatsAppNumber ?? null,
      bankAccounts: [...mockBankAccounts],
      updatedAt: new Date().toISOString(),
    };
    return { settings: { ...mockSettings } };
  }

  async createBankAccount(data: CreateBankAccountRequest): Promise<{ bankAccount: OrganizationBankAccount }> {
    const newBank: OrganizationBankAccount = {
      id: `bank-${Date.now()}`,
      organizationId: 'org-demo',
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountHolderName: data.accountHolderName,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? mockBankAccounts.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockBankAccounts.push(newBank);
    mockSettings.bankAccounts = [...mockBankAccounts];
    return { bankAccount: newBank };
  }

  async updateBankAccount(id: string, data: UpdateBankAccountRequest): Promise<{ bankAccount: OrganizationBankAccount }> {
    const idx = mockBankAccounts.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Bank account not found');
    const existing = mockBankAccounts[idx];
    const updated: OrganizationBankAccount = {
      ...existing,
      bankName: data.bankName ?? existing.bankName,
      accountNumber: data.accountNumber ?? existing.accountNumber,
      accountHolderName: data.accountHolderName ?? existing.accountHolderName,
      isActive: data.isActive ?? existing.isActive,
      sortOrder: data.sortOrder ?? existing.sortOrder,
      updatedAt: new Date().toISOString(),
    };
    mockBankAccounts[idx] = updated;
    mockSettings.bankAccounts = [...mockBankAccounts];
    return { bankAccount: updated };
  }

  async deleteBankAccount(id: string): Promise<{ success: boolean }> {
    mockBankAccounts = mockBankAccounts.filter((b) => b.id !== id);
    return { success: true };
  }

  async getPublicPaymentInfo(workspaceSlug: string): Promise<PublicPaymentInfo> {
    return {
      salesWhatsAppNumber: mockSettings.salesWhatsAppNumber,
      bankAccounts: mockBankAccounts
        .filter((b) => b.isActive)
        .map((b) => ({
          id: b.id,
          bankName: b.bankName,
          accountNumber: b.accountNumber,
          accountHolderName: b.accountHolderName,
        })),
    };
  }

  async createPublicPurchaseRequest(
    workspaceSlug: string,
    programSlug: string,
    data: any
  ): Promise<any> {
    const ref = `TLR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return {
      orderId: `mock-ord-${Date.now()}`,
      purchaseReference: ref,
      status: 'PENDING',
      purchaseMethod: data.purchaseMethod,
      priceAmount: 150000,
      paymentInstructions: {
        method: data.purchaseMethod,
        purchaseReference: ref,
        priceAmount: 150000,
        bankAccounts: mockBankAccounts.filter((b) => b.isActive),
        whatsappNumber: mockSettings.salesWhatsAppNumber || '+6281234567890',
        whatsappConfirmationUrl: `https://wa.me/6281234567890?text=Konfirmasi%20${ref}`,
      },
    };
  }
}
