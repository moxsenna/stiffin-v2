import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, asc, sql } from 'drizzle-orm';
import {
  organizationBankAccounts,
  OrganizationBankAccountRow,
  organizationPaymentSettings,
  OrganizationPaymentSettingsRow,
} from '../db/schema';
import {
  OrganizationBankAccount,
  OrganizationPaymentSettings,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from '@promotor/contracts';

async function ensureTables(db: NodePgDatabase) {
  try {
    await db.execute(sql`ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "bank_transfer_enabled" boolean DEFAULT false NOT NULL`);
    await db.execute(sql`ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "whatsapp_enabled" boolean DEFAULT false NOT NULL`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "organization_bank_accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "bank_name" text NOT NULL,
        "account_number" text NOT NULL,
        "account_holder_name" text NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "organization_payment_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "sales_whatsapp_number" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "program_purchase_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "program_id" uuid NOT NULL,
        "contact_id" uuid NOT NULL,
        "purchase_reference" text NOT NULL,
        "purchase_method" text NOT NULL,
        "status" text DEFAULT 'PENDING' NOT NULL,
        "price_amount" integer DEFAULT 0 NOT NULL,
        "currency" text DEFAULT 'IDR' NOT NULL,
        "buyer_name" text NOT NULL,
        "buyer_phone" text NOT NULL,
        "buyer_note" text,
        "bank_account_id" uuid,
        "approved_at" timestamp with time zone,
        "approved_by_user_id" uuid,
        "rejected_at" timestamp with time zone,
        "rejected_by_user_id" uuid,
        "rejection_reason" text,
        "enrollment_id" uuid,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
  } catch (err: any) {
    console.error('[ensureTables error]:', err?.message || err);
  }
}

export interface PaymentSettingsRepository {
  getPaymentSettings(organizationId: string): Promise<OrganizationPaymentSettings>;
  updateSalesWhatsAppNumber(organizationId: string, salesWhatsAppNumber: string | null): Promise<OrganizationPaymentSettings>;
  getBankAccounts(organizationId: string): Promise<OrganizationBankAccount[]>;
  getActiveBankAccounts(organizationId: string): Promise<OrganizationBankAccount[]>;
  createBankAccount(organizationId: string, input: CreateBankAccountRequest): Promise<OrganizationBankAccount>;
  updateBankAccount(organizationId: string, id: string, input: UpdateBankAccountRequest): Promise<OrganizationBankAccount | null>;
  deleteBankAccount(organizationId: string, id: string): Promise<boolean>;
}

export function createPaymentSettingsRepository(db: NodePgDatabase): PaymentSettingsRepository {
  return {
    async getBankAccounts(organizationId: string): Promise<OrganizationBankAccount[]> {
      try {
        await ensureTables(db);
        const rows = await db
          .select()
          .from(organizationBankAccounts)
          .where(eq(organizationBankAccounts.organizationId, organizationId))
          .orderBy(asc(organizationBankAccounts.sortOrder), asc(organizationBankAccounts.createdAt));

        return rows.map((r) => ({
          id: r.id,
          organizationId: r.organizationId,
          bankName: r.bankName,
          accountNumber: r.accountNumber,
          accountHolderName: r.accountHolderName,
          isActive: r.isActive,
          sortOrder: r.sortOrder,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      } catch (err: any) {
        console.error('getBankAccounts fallback:', err?.message || err);
        return [];
      }
    },

    async getActiveBankAccounts(organizationId: string): Promise<OrganizationBankAccount[]> {
      try {
        await ensureTables(db);
        const rows = await db
          .select()
          .from(organizationBankAccounts)
          .where(
            and(
              eq(organizationBankAccounts.organizationId, organizationId),
              eq(organizationBankAccounts.isActive, true)
            )
          )
          .orderBy(asc(organizationBankAccounts.sortOrder), asc(organizationBankAccounts.createdAt));

        return rows.map((r) => ({
          id: r.id,
          organizationId: r.organizationId,
          bankName: r.bankName,
          accountNumber: r.accountNumber,
          accountHolderName: r.accountHolderName,
          isActive: r.isActive,
          sortOrder: r.sortOrder,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      } catch (err: any) {
        console.error('getActiveBankAccounts fallback:', err?.message || err);
        return [];
      }
    },

    async getPaymentSettings(organizationId: string): Promise<OrganizationPaymentSettings> {
      try {
        await ensureTables(db);
        const settingsRows = await db
          .select()
          .from(organizationPaymentSettings)
          .where(eq(organizationPaymentSettings.organizationId, organizationId));

        const bankAccounts = await this.getBankAccounts(organizationId);

        const settings = settingsRows[0];
        return {
          id: settings?.id,
          organizationId,
          salesWhatsAppNumber: settings?.salesWhatsAppNumber ?? null,
          bankAccounts,
          createdAt: settings?.createdAt,
          updatedAt: settings?.updatedAt,
        };
      } catch (err: any) {
        console.error('getPaymentSettings fallback:', err?.message || err);
        return {
          organizationId,
          salesWhatsAppNumber: null,
          bankAccounts: [],
        };
      }
    },

    async updateSalesWhatsAppNumber(
      organizationId: string,
      salesWhatsAppNumber: string | null
    ): Promise<OrganizationPaymentSettings> {
      await ensureTables(db);
      const existing = await db
        .select()
        .from(organizationPaymentSettings)
        .where(eq(organizationPaymentSettings.organizationId, organizationId));

      if (existing.length > 0) {
        await db
          .update(organizationPaymentSettings)
          .set({
            salesWhatsAppNumber,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(organizationPaymentSettings.organizationId, organizationId));
      } else {
        await db.insert(organizationPaymentSettings).values({
          organizationId,
          salesWhatsAppNumber,
        });
      }

      return this.getPaymentSettings(organizationId);
    },

    async createBankAccount(
      organizationId: string,
      input: CreateBankAccountRequest
    ): Promise<OrganizationBankAccount> {
      await ensureTables(db);
      const rows = await db
        .insert(organizationBankAccounts)
        .values({
          organizationId,
          bankName: input.bankName.trim(),
          accountNumber: input.accountNumber.trim(),
          accountHolderName: input.accountHolderName.trim(),
          isActive: input.isActive ?? true,
          sortOrder: 0,
        })
        .returning();

      const r = rows[0];
      return {
        id: r.id,
        organizationId: r.organizationId,
        bankName: r.bankName,
        accountNumber: r.accountNumber,
        accountHolderName: r.accountHolderName,
        isActive: r.isActive,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    },

    async updateBankAccount(
      organizationId: string,
      id: string,
      input: UpdateBankAccountRequest
    ): Promise<OrganizationBankAccount | null> {
      const updates: Partial<OrganizationBankAccountRow> = {
        updatedAt: new Date().toISOString(),
      };
      if (input.bankName !== undefined) updates.bankName = input.bankName.trim();
      if (input.accountNumber !== undefined) updates.accountNumber = input.accountNumber.trim();
      if (input.accountHolderName !== undefined) updates.accountHolderName = input.accountHolderName.trim();
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

      const rows = await db
        .update(organizationBankAccounts)
        .set(updates)
        .where(
          and(
            eq(organizationBankAccounts.id, id),
            eq(organizationBankAccounts.organizationId, organizationId)
          )
        )
        .returning();

      const r = rows[0];
      if (!r) return null;

      return {
        id: r.id,
        organizationId: r.organizationId,
        bankName: r.bankName,
        accountNumber: r.accountNumber,
        accountHolderName: r.accountHolderName,
        isActive: r.isActive,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    },

    async deleteBankAccount(organizationId: string, id: string): Promise<boolean> {
      const res = await db
        .delete(organizationBankAccounts)
        .where(
          and(
            eq(organizationBankAccounts.id, id),
            eq(organizationBankAccounts.organizationId, organizationId)
          )
        )
        .returning({ id: organizationBankAccounts.id });

      return res.length > 0;
    },
  };
}
