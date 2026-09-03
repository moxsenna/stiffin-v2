import { PromotorClassContentApiClient } from '@promotor/api-client';
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
import { PaymentRepositoryPort } from '@/modules/payments/ports';

export class HttpPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly client: PromotorClassContentApiClient) {}

  async getPaymentSettings(): Promise<{ settings: OrganizationPaymentSettings }> {
    return this.client.getPaymentSettings();
  }

  async updatePaymentSettings(data: UpdatePaymentSettingsRequest): Promise<{ settings: OrganizationPaymentSettings }> {
    return this.client.updatePaymentSettings(data);
  }

  async createBankAccount(data: CreateBankAccountRequest): Promise<{ bankAccount: OrganizationBankAccount }> {
    return this.client.createBankAccount(data);
  }

  async updateBankAccount(id: string, data: UpdateBankAccountRequest): Promise<{ bankAccount: OrganizationBankAccount }> {
    return this.client.updateBankAccount(id, data);
  }

  async deleteBankAccount(id: string): Promise<{ success: boolean }> {
    return this.client.deleteBankAccount(id);
  }

  async getPublicPaymentInfo(workspaceSlug: string): Promise<PublicPaymentInfo> {
    return this.client.getPublicPaymentInfo(workspaceSlug);
  }

  async createPublicPurchaseRequest(
    workspaceSlug: string,
    programSlug: string,
    data: CreatePublicPurchaseRequest
  ): Promise<CreatePublicPurchaseResponse> {
    return this.client.createPublicPurchaseRequest(workspaceSlug, programSlug, data);
  }
}
