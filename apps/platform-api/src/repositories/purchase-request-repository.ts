import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, sql } from 'drizzle-orm';
import { integrationOutbox } from '../db/schema/integration-outbox';
import { ProgramPurchaseRequest, PurchaseMethod, PurchaseStatus } from '@promotor/contracts';

const DESTINATION = 'COMMERCE_PURCHASE_REQUEST';

export interface CreatePurchaseRequestInput {
  organizationId: string;
  programId: string;
  programTitle?: string;
  programSlug?: string;
  contactId: string;
  purchaseReference: string;
  purchaseMethod: PurchaseMethod;
  priceAmount: number;
  currency?: 'IDR';
  buyerName: string;
  buyerPhone: string;
  buyerNote?: string | null;
  bankAccountId?: string | null;
  bankAccountDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  } | null;
}

export interface PurchaseRequestRepository {
  create(input: CreatePurchaseRequestInput): Promise<ProgramPurchaseRequest>;
  findById(organizationId: string, id: string): Promise<ProgramPurchaseRequest | null>;
  findByReference(reference: string): Promise<ProgramPurchaseRequest | null>;
  listByOrg(
    organizationId: string,
    filter?: { status?: PurchaseStatus; method?: PurchaseMethod }
  ): Promise<ProgramPurchaseRequest[]>;
  approve(
    organizationId: string,
    id: string,
    approvedByUserId: string,
    enrollmentId: string
  ): Promise<ProgramPurchaseRequest | null>;
  reject(
    organizationId: string,
    id: string,
    rejectedByUserId: string,
    reason?: string | null
  ): Promise<ProgramPurchaseRequest | null>;
}

export function createPurchaseRequestRepository(db: NodePgDatabase): PurchaseRequestRepository {
  return {
    async create(input: CreatePurchaseRequestInput): Promise<ProgramPurchaseRequest> {
      const nowIso = new Date().toISOString();
      const id = crypto.randomUUID();

      const item: ProgramPurchaseRequest = {
        id,
        organizationId: input.organizationId,
        programId: input.programId,
        programTitle: input.programTitle,
        programSlug: input.programSlug,
        contactId: input.contactId,
        purchaseReference: input.purchaseReference,
        purchaseMethod: input.purchaseMethod,
        status: 'PENDING',
        priceAmount: input.priceAmount,
        currency: input.currency || 'IDR',
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone,
        buyerNote: input.buyerNote ?? null,
        bankAccountId: input.bankAccountId ?? null,
        bankAccountDetails: input.bankAccountDetails ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      try {
        await db.insert(integrationOutbox).values({
          id,
          organizationId: input.organizationId,
          destination: DESTINATION,
          operation: input.purchaseMethod,
          idempotencyKey: input.purchaseReference,
          payloadJson: item,
          status: 'PENDING',
          attemptCount: 0,
        });
      } catch (err: any) {
        console.error('purchaseRequestRepo.create outbox insert failed:', err?.message || err);
      }

      return item;
    },

    async findById(organizationId: string, id: string): Promise<ProgramPurchaseRequest | null> {
      try {
        const rows = await db
          .select()
          .from(integrationOutbox)
          .where(
            and(
              eq(integrationOutbox.organizationId, organizationId),
              eq(integrationOutbox.destination, DESTINATION),
              eq(integrationOutbox.id, id)
            )
          );

        if (!rows[0]) return null;
        return rows[0].payloadJson as ProgramPurchaseRequest;
      } catch (err: any) {
        console.error('purchaseRequestRepo.findById error:', err?.message || err);
        return null;
      }
    },

    async findByReference(reference: string): Promise<ProgramPurchaseRequest | null> {
      try {
        const rows = await db
          .select()
          .from(integrationOutbox)
          .where(
            and(
              eq(integrationOutbox.destination, DESTINATION),
              eq(integrationOutbox.idempotencyKey, reference)
            )
          );

        if (!rows[0]) return null;
        return rows[0].payloadJson as ProgramPurchaseRequest;
      } catch (err: any) {
        console.error('purchaseRequestRepo.findByReference error:', err?.message || err);
        return null;
      }
    },

    async listByOrg(
      organizationId: string,
      filter?: { status?: PurchaseStatus; method?: PurchaseMethod }
    ): Promise<ProgramPurchaseRequest[]> {
      try {
        const rows = await db
          .select()
          .from(integrationOutbox)
          .where(
            and(
              eq(integrationOutbox.organizationId, organizationId),
              eq(integrationOutbox.destination, DESTINATION)
            )
          )
          .orderBy(desc(integrationOutbox.createdAt));

        let items = rows.map((r) => r.payloadJson as ProgramPurchaseRequest);
        if (filter?.status) {
          items = items.filter((it) => it.status === filter.status);
        }
        if (filter?.method) {
          items = items.filter((it) => it.purchaseMethod === filter.method);
        }
        return items;
      } catch (err: any) {
        console.error('purchaseRequestRepo.listByOrg error:', err?.message || err);
        return [];
      }
    },

    async approve(
      organizationId: string,
      id: string,
      approvedByUserId: string,
      enrollmentId: string
    ): Promise<ProgramPurchaseRequest | null> {
      const existing = await this.findById(organizationId, id);
      if (!existing) return null;

      const nowIso = new Date().toISOString();
      const updatedItem: ProgramPurchaseRequest = {
        ...existing,
        status: 'APPROVED',
        approvedAt: nowIso,
        approvedByUserId,
        enrollmentId,
        updatedAt: nowIso,
      };

      try {
        await db
          .update(integrationOutbox)
          .set({
            status: 'COMPLETED',
            processedAt: sql`now()`,
            payloadJson: updatedItem,
          })
          .where(
            and(
              eq(integrationOutbox.organizationId, organizationId),
              eq(integrationOutbox.destination, DESTINATION),
              eq(integrationOutbox.id, id)
            )
          );
      } catch (err: any) {
        console.error('purchaseRequestRepo.approve error:', err?.message || err);
      }

      return updatedItem;
    },

    async reject(
      organizationId: string,
      id: string,
      rejectedByUserId: string,
      reason?: string | null
    ): Promise<ProgramPurchaseRequest | null> {
      const existing = await this.findById(organizationId, id);
      if (!existing) return null;

      const nowIso = new Date().toISOString();
      const updatedItem: ProgramPurchaseRequest = {
        ...existing,
        status: 'REJECTED',
        rejectedAt: nowIso,
        rejectedByUserId,
        rejectionReason: reason ?? null,
        updatedAt: nowIso,
      };

      try {
        await db
          .update(integrationOutbox)
          .set({
            status: 'FAILED',
            processedAt: sql`now()`,
            payloadJson: updatedItem,
          })
          .where(
            and(
              eq(integrationOutbox.organizationId, organizationId),
              eq(integrationOutbox.destination, DESTINATION),
              eq(integrationOutbox.id, id)
            )
          );
      } catch (err: any) {
        console.error('purchaseRequestRepo.reject error:', err?.message || err);
      }

      return updatedItem;
    },
  };
}
