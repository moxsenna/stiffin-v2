// apps/platform-api/src/repositories/bank-account-repository.ts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, asc, eq } from 'drizzle-orm';
import { organizationBankAccounts } from '../db/schema/organization-bank-accounts';

export function createBankAccountRepository(db: NodePgDatabase) {
  return {
    async list(organizationId: string) {
      return await db
        .select()
        .from(organizationBankAccounts)
        .where(eq(organizationBankAccounts.organizationId, organizationId))
        .orderBy(asc(organizationBankAccounts.sortOrder));
    },

    async create(organizationId: string, data: { bankName: string; accountNumber: string; accountHolderName: string }) {
      const [row] = await db
        .insert(organizationBankAccounts)
        .values({ organizationId, ...data })
        .returning();
      return row;
    },

    async update(organizationId: string, id: string, patch: { bankName?: string; accountNumber?: string; accountHolderName?: string; isActive?: boolean }) {
      const [row] = await db
        .update(organizationBankAccounts)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(and(eq(organizationBankAccounts.id, id), eq(organizationBankAccounts.organizationId, organizationId)))
        .returning();
      return row ?? null;
    },

    async remove(organizationId: string, id: string) {
      const [row] = await db
        .delete(organizationBankAccounts)
        .where(and(eq(organizationBankAccounts.id, id), eq(organizationBankAccounts.organizationId, organizationId)))
        .returning();
      return row ?? null;
    },
  };
}

export type BankAccountRepository = ReturnType<typeof createBankAccountRepository>;
