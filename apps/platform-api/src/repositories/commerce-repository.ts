import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, count } from 'drizzle-orm';
import { commerceOrders, CommerceOrderRow, NewCommerceOrderRow } from '../db/schema/commerce-orders';
import { paymentRecords, PaymentRecordRow, NewPaymentRecordRow } from '../db/schema/payment-records';
import { platformFeeEntries, PlatformFeeEntryRow, NewPlatformFeeEntryRow } from '../db/schema/platform-fee-entries';
import { contacts } from '../db/schema/contacts';
import { programs } from '../db/schema/programs';

export interface CommerceRepository {
  createOrder(data: NewCommerceOrderRow): Promise<CommerceOrderRow>;
  getOrderById(orderId: string): Promise<CommerceOrderRow | null>;
  getOrderByReference(reference: string): Promise<CommerceOrderRow | null>;
  listOrders(
    organizationId: string,
    filter?: { status?: string; limit?: number; offset?: number }
  ): Promise<{
    orders: Array<{
      order: CommerceOrderRow;
      buyerName: string;
      buyerPhone: string;
      buyerEmail: string | null;
      programTitle: string;
      paymentStatus: string | null;
      paymentMethod: string | null;
      platformFee: number;
    }>;
    total: number;
  }>;
  updateOrderStatus(
    orderId: string,
    status: string,
    extra?: Partial<Omit<CommerceOrderRow, 'id' | 'createdAt'>>
  ): Promise<CommerceOrderRow>;
  createPaymentRecord(data: NewPaymentRecordRow): Promise<PaymentRecordRow>;
  getPaymentRecordByProviderId(providerPaymentId: string): Promise<PaymentRecordRow | null>;
  updatePaymentRecordStatus(
    id: string,
    status: string,
    extra?: Partial<Omit<PaymentRecordRow, 'id' | 'createdAt'>>
  ): Promise<PaymentRecordRow>;
  createPlatformFeeEntry(data: NewPlatformFeeEntryRow): Promise<PlatformFeeEntryRow>;
  getPlatformFeeByOrderId(orderId: string): Promise<PlatformFeeEntryRow | null>;
  updatePlatformFeeStatus(
    orderId: string,
    status: string,
    extra?: Partial<Omit<PlatformFeeEntryRow, 'id' | 'createdAt'>>
  ): Promise<PlatformFeeEntryRow | null>;
}

export function createCommerceRepository(db: NodePgDatabase): CommerceRepository {
  return {
    async createOrder(data: NewCommerceOrderRow): Promise<CommerceOrderRow> {
      const [order] = await db.insert(commerceOrders).values(data).returning();
      return order;
    },

    async getOrderById(orderId: string): Promise<CommerceOrderRow | null> {
      const [order] = await db
        .select()
        .from(commerceOrders)
        .where(eq(commerceOrders.id, orderId))
        .limit(1);
      return order || null;
    },

    async getOrderByReference(reference: string): Promise<CommerceOrderRow | null> {
      const [order] = await db
        .select()
        .from(commerceOrders)
        .where(eq(commerceOrders.reference, reference))
        .limit(1);
      return order || null;
    },

    async listOrders(
      organizationId: string,
      filter?: { status?: string; limit?: number; offset?: number }
    ) {
      const limit = Math.min(filter?.limit ?? 50, 100);
      const offset = filter?.offset ?? 0;

      const whereConditions = [eq(commerceOrders.organizationId, organizationId)];
      if (filter?.status) {
        whereConditions.push(eq(commerceOrders.status, filter.status));
      }
      const combinedWhere = and(...whereConditions);

      const [totalResult] = await db
        .select({ value: count() })
        .from(commerceOrders)
        .where(combinedWhere);

      const rows = await db
        .select({
          order: commerceOrders,
          buyerName: contacts.name,
          buyerPhone: contacts.phoneE164,
          buyerEmail: contacts.email,
          programTitle: programs.title,
          paymentStatus: paymentRecords.status,
          paymentMethod: paymentRecords.paymentMethod,
          platformFeeAmount: platformFeeEntries.amount,
        })
        .from(commerceOrders)
        .innerJoin(contacts, eq(commerceOrders.contactId, contacts.id))
        .innerJoin(programs, eq(commerceOrders.programId, programs.id))
        .leftJoin(paymentRecords, eq(commerceOrders.paymentRecordId, paymentRecords.id))
        .leftJoin(platformFeeEntries, eq(commerceOrders.id, platformFeeEntries.orderId))
        .where(combinedWhere)
        .orderBy(desc(commerceOrders.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        orders: rows.map((r) => ({
          order: r.order,
          buyerName: r.buyerName,
          buyerPhone: r.buyerPhone,
          buyerEmail: r.buyerEmail,
          programTitle: r.programTitle,
          paymentStatus: r.paymentStatus,
          paymentMethod: r.paymentMethod,
          platformFee: r.platformFeeAmount ?? 3000,
        })),
        total: Number(totalResult?.value ?? 0),
      };
    },

    async updateOrderStatus(
      orderId: string,
      status: string,
      extra?: Partial<Omit<CommerceOrderRow, 'id' | 'createdAt'>>
    ): Promise<CommerceOrderRow> {
      const [updated] = await db
        .update(commerceOrders)
        .set({
          status,
          ...extra,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(commerceOrders.id, orderId))
        .returning();
      return updated;
    },

    async createPaymentRecord(data: NewPaymentRecordRow): Promise<PaymentRecordRow> {
      const [rec] = await db.insert(paymentRecords).values(data).returning();
      return rec;
    },

    async getPaymentRecordByProviderId(providerPaymentId: string): Promise<PaymentRecordRow | null> {
      const [rec] = await db
        .select()
        .from(paymentRecords)
        .where(eq(paymentRecords.providerPaymentId, providerPaymentId))
        .limit(1);
      return rec || null;
    },

    async updatePaymentRecordStatus(
      id: string,
      status: string,
      extra?: Partial<Omit<PaymentRecordRow, 'id' | 'createdAt'>>
    ): Promise<PaymentRecordRow> {
      const [updated] = await db
        .update(paymentRecords)
        .set({
          status,
          ...extra,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentRecords.id, id))
        .returning();
      return updated;
    },

    async createPlatformFeeEntry(data: NewPlatformFeeEntryRow): Promise<PlatformFeeEntryRow> {
      const [fee] = await db
        .insert(platformFeeEntries)
        .values(data)
        .onConflictDoNothing({ target: platformFeeEntries.idempotencyKey })
        .returning();

      if (fee) return fee;

      const [existing] = await db
        .select()
        .from(platformFeeEntries)
        .where(eq(platformFeeEntries.idempotencyKey, data.idempotencyKey))
        .limit(1);
      return existing;
    },

    async getPlatformFeeByOrderId(orderId: string): Promise<PlatformFeeEntryRow | null> {
      const [fee] = await db
        .select()
        .from(platformFeeEntries)
        .where(eq(platformFeeEntries.orderId, orderId))
        .limit(1);
      return fee || null;
    },

    async updatePlatformFeeStatus(
      orderId: string,
      status: string,
      extra?: Partial<Omit<PlatformFeeEntryRow, 'id' | 'createdAt'>>
    ): Promise<PlatformFeeEntryRow | null> {
      const [updated] = await db
        .update(platformFeeEntries)
        .set({
          status,
          ...extra,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(platformFeeEntries.orderId, orderId))
        .returning();
      return updated || null;
    },
  };
}
