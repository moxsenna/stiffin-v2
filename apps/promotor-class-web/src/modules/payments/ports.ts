import {
  OrganizationPaymentSettings,
  OrganizationBankAccount,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
  UpdatePaymentSettingsRequest,
  PublicPaymentInfo,
  CreatePublicPurchaseRequest,
  CreatePublicPurchaseResponse,
} from '@promotor/contracts';

export interface PaymentRepositoryPort {
  getPaymentSettings(): Promise<{ settings: OrganizationPaymentSettings }>;
  updatePaymentSettings(data: UpdatePaymentSettingsRequest): Promise<{ settings: OrganizationPaymentSettings }>;
  createBankAccount(data: CreateBankAccountRequest): Promise<{ bankAccount: OrganizationBankAccount }>;
  updateBankAccount(id: string, data: UpdateBankAccountRequest): Promise<{ bankAccount: OrganizationBankAccount }>;
  deleteBankAccount(id: string): Promise<{ success: boolean }>;
  getPublicPaymentInfo(workspaceSlug: string): Promise<PublicPaymentInfo>;
  createPublicPurchaseRequest(
    workspaceSlug: string,
    programSlug: string,
    data: CreatePublicPurchaseRequest
  ): Promise<CreatePublicPurchaseResponse>;
}
