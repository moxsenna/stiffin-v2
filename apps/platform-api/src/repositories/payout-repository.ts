// apps/platform-api/src/repositories/payout-repository.ts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { payoutBatches, type PayoutBatchRow } from '../db/schema/payout-batches';
import { payoutItems } from '../db/schema/payout-items';
import { commerceOrders } from '../db/schema/commerce-orders';
import { paymentRecords } from '../db/schema/payment-records';
import { organizationBankAccounts } from '../db/schema/organization-bank-accounts';

export interface AvailableOrderRow {
  order: typeof commerceOrders.$inferSelect;
  processorFee: number | null;
}

export function createPayoutRepository(db: NodePgDatabase) {
  return {
    async findBankById(organizationId: string, bankAccountId: string) {
      const [row] = await db
        .select()
        .from(organizationBankAccounts)
        .where(
          and(
            eq(organizationBankAccounts.id, bankAccountId),
            eq(organizationBankAccounts.organizationId, organizationId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async findAvailableOrdersByIds(organizationId: string, orderIds: string[]): Promise<AvailableOrderRow[]> {
      if (orderIds.length === 0) return [];
      const rows = await db
        .select({ order: commerceOrders, processorFee: paymentRecords.processorFee })
        .from(commerceOrders)
        .leftJoin(payoutItems, eq(payoutItems.orderId, commerceOrders.id))
        .leftJoin(paymentRecords, eq(paymentRecords.id, commerceOrders.paymentRecordId))
        .where(
          and(
            eq(commerceOrders.organizationId, organizationId),
            inArray(commerceOrders.id, orderIds),
            inArray(commerceOrders.status, ['PAID', 'APPROVED']),
            eq(commerceOrders.orderType, 'PROGRAM_PURCHASE'),
            isNull(payoutItems.orderId)
          )
        );
      return rows.map((r) => ({ order: r.order, processorFee: r.processorFee }));
    },

    async listAvailableOrders(organizationId: string, limit = 100) {
      const rows = await db
        .select({ order: commerceOrders, processorFee: paymentRecords.processorFee })
        .from(commerceOrders)
        .leftJoin(payoutItems, eq(payoutItems.orderId, commerceOrders.id))
        .leftJoin(paymentRecords, eq(paymentRecords.id, commerceOrders.paymentRecordId))
        .where(
          and(
            eq(commerceOrders.organizationId, organizationId),
            inArray(commerceOrders.status, ['PAID', 'APPROVED']),
            eq(commerceOrders.orderType, 'PROGRAM_PURCHASE'),
            isNull(payoutItems.orderId)
          )
        )
        .orderBy(desc(commerceOrders.paidAt))
        .limit(Math.min(limit, 100));
      return rows;
    },

    async getItemByOrderId(orderId: string) {
      const [row] = await db.select().from(payoutItems).where(eq(payoutItems.orderId, orderId)).limit(1);
      return row ?? null;
    },

    async createBatchWithItems(
      batch: typeof payoutBatches.$inferInsert,
      items: Array<{ orderId: string; netAmount: number }>
    ) {
      return await db.transaction(async (tx) => {
        const [created] = await tx.insert(payoutBatches).values(batch).returning();
        const inserted =
          items.length > 0
            ? await tx.insert(payoutItems).values(items.map((i) => ({ ...i, batchId: created.id }))).returning()
            : [];
        return { batch: created, items: inserted };
      });
    },

    async getBatchById(organizationId: string, batchId: string): Promise<PayoutBatchRow | null> {
      const [row] = await db
        .select()
        .from(payoutBatches)
        .where(and(eq(payoutBatches.id, batchId), eq(payoutBatches.organizationId, organizationId)))
        .limit(1);
      return row ?? null;
    },

    async listBatches(organizationId: string, limit = 50) {
      return await db
        .select()
        .from(payoutBatches)
        .where(eq(payoutBatches.organizationId, organizationId))
        .orderBy(desc(payoutBatches.createdAt))
        .limit(Math.min(limit, 100));
    },

    async listBatchItems(batchId: string) {
      return await db.select().from(payoutItems).where(eq(payoutItems.batchId, batchId));
    },

    async listBatchOrderIds(batchId: string): Promise<string[]> {
      const rows = await db
        .select({ orderId: payoutItems.orderId })
        .from(payoutItems)
        .where(eq(payoutItems.batchId, batchId));
      return rows.map((r) => r.orderId);
    },

    async updateBatch(batchId: string, patch: Partial<PayoutBatchRow>) {
      const [updated] = await db
        .update(payoutBatches)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(eq(payoutBatches.id, batchId))
        .returning();
      return updated;
    },

    async countBatches(): Promise<number> {
      const [row] = await db.select({ v: sql<number>`count(*)` }).from(payoutBatches);
      return Number(row?.v ?? 0);
    },
  };
}

export type PayoutRepository = ReturnType<typeof createPayoutRepository>;
