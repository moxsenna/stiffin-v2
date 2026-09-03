import {
  TALIRA_PLANS,
  CommerceOrder,
  OrderItemSummary,
  PublicPaidCheckoutRequest,
  PublicPaidCheckoutResponse,
  PublicOrderStatusResponse,
  CreateSubscriptionCheckoutRequest,
  CreateSubscriptionCheckoutResponse,
} from '@promotor/contracts';
import { generateOrderReference, normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { DomainError } from '../../core/errors';
import { CommerceRepository } from '../../repositories/commerce-repository';
import { SubscriptionRepository } from '../../repositories/subscription-repository';
import { PlanAccessService } from '../billing/plan-access-service';
import { PaycoreClient, PaycoreWebhookEvent } from '../paycore/paycore-client';
import { ProgramRepository } from '../../repositories/program-repository';
import { ContactRepository } from '../../repositories/contact-repository';
import { OrganizationRepository } from '../../repositories/organization-repository';
import { EnrollmentService } from '../class/enrollment-service';
import { LearningEventRepository } from '../../repositories/learning-event-repository';

export interface CommerceServiceDependencies {
  commerceRepo: CommerceRepository;
  subscriptionRepo: SubscriptionRepository;
  planAccessService: PlanAccessService;
  paycoreClient: PaycoreClient;
  programRepo: ProgramRepository;
  contactRepo: ContactRepository;
  orgRepo: OrganizationRepository;
  enrollmentService: EnrollmentService;
  learningEventRepo: LearningEventRepository;
  clock?: () => Date;
}

export interface CommerceService {
  createProgramCheckout(
    slug: string,
    programSlug: string,
    input: PublicPaidCheckoutRequest
  ): Promise<PublicPaidCheckoutResponse>;

  getOrderStatusByReference(
    slug: string,
    programSlug: string,
    reference: string
  ): Promise<PublicOrderStatusResponse>;

  createSubscriptionCheckout(
    organizationId: string,
    input: CreateSubscriptionCheckoutRequest,
    user: { id: string; name?: string | null; email?: string | null; phone?: string | null }
  ): Promise<CreateSubscriptionCheckoutResponse>;

  handlePaycoreWebhook(
    rawBody: string,
    timestampHeader?: string | null,
    signatureHeader?: string | null
  ): Promise<{ status: string; type?: string; orderId?: string }>;

  listOrders(
    organizationId: string,
    query: { status?: string; limit?: number; offset?: number }
  ): Promise<{ orders: OrderItemSummary[]; total: number }>;

  getOrderById(organizationId: string, orderId: string): Promise<CommerceOrder | null>;

  rejectOrder(
    organizationId: string,
    orderId: string,
    userId: string,
    reason: string
  ): Promise<CommerceOrder>;

  approveOrder(
    organizationId: string,
    orderId: string,
    userId: string
  ): Promise<CommerceOrder>;
}

export function createCommerceService(deps: CommerceServiceDependencies): CommerceService {
  const clock = deps.clock ?? (() => new Date());

  return {
    async createProgramCheckout(
      slug: string,
      programSlug: string,
      input: PublicPaidCheckoutRequest
    ): Promise<PublicPaidCheckoutResponse> {
      const org = await deps.orgRepo.findBySlug(slug.trim());
      if (!org) {
        throw new DomainError('NOT_FOUND', 'Organisasi promotor tidak ditemukan');
      }

      const program = await deps.programRepo.findBySlug({ organizationId: org.id }, programSlug.trim());
      if (!program) {
        throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
      }

      if (program.status !== 'published') {
        throw new DomainError('FORBIDDEN', 'Program edukasi belum dipublikasikan');
      }
      if (program.accessType !== 'public') {
        throw new DomainError('FORBIDDEN', 'Program ini tidak dibuka untuk pembelian publik');
      }
      if (program.pricing !== 'one_time' || program.priceAmount <= 0) {
        throw new DomainError('VALIDATION_ERROR', 'Program ini tidak memiliki harga berbayar valid');
      }

      // Enforce organization plan allows paid programs
      await deps.planAccessService.assertCanUsePaidPrograms(org.id);

      // Match or create buyer contact
      const contact = await deps.contactRepo.matchOrCreate({
        context: { organizationId: org.id },
        phoneRaw: input.phone.trim(),
        name: input.name.trim(),
        email: input.email?.trim() || undefined,
      });

      const reference = generateOrderReference('TLR');
      const nowIso = clock().toISOString();

      // Create pending commerce order
      const order = await deps.commerceRepo.createOrder({
        organizationId: org.id,
        programId: program.id,
        contactId: contact.id,
        reference,
        sourceChannel: input.sourceChannel || 'STOREFRONT',
        paymentMode: 'PAYCORE',
        amount: program.priceAmount,
        currency: 'IDR',
        status: 'PENDING',
      });

      // Call Paycore create order
      const paycoreOrder = await deps.paycoreClient.createOrder({
        externalOrderId: order.reference,
        productKey: `PROGRAM_${program.id}`,
        description: `Kelas: ${program.title}`,
        amount: program.priceAmount,
        currency: 'IDR',
        customer: {
          name: contact.name,
          email: contact.email || undefined,
          phone: contact.phoneE164,
        },
        returnUrl: input.returnUrl,
        fulfillmentData: {
          type: 'PROGRAM_PURCHASE',
          organizationId: org.id,
          programId: program.id,
          contactId: contact.id,
          orderId: order.id,
          orderReference: order.reference,
        },
        idempotencyKey: `talira:checkout:${order.id}`,
      });

      // Create initial payment record
      const paymentRecord = await deps.commerceRepo.createPaymentRecord({
        organizationId: org.id,
        orderId: order.id,
        provider: 'PAYCORE',
        providerPaymentId: paycoreOrder.order_id,
        providerReference: order.reference,
        grossAmount: program.priceAmount,
        currency: 'IDR',
        status: 'PENDING',
      });

      // Link payment record in order
      await deps.commerceRepo.updateOrderStatus(order.id, 'PENDING', {
        paymentRecordId: paymentRecord.id,
      });

      return {
        orderId: order.id,
        reference: order.reference,
        amount: order.amount,
        currency: 'IDR',
        checkoutUrl: paycoreOrder.checkout_url,
        providerOrderId: paycoreOrder.order_id,
        expiresAt: paycoreOrder.expires_at,
      };
    },

    async getOrderStatusByReference(
      slug: string,
      programSlug: string,
      reference: string
    ): Promise<PublicOrderStatusResponse> {
      const org = await deps.orgRepo.findBySlug(slug.trim());
      if (!org) throw new DomainError('NOT_FOUND', 'Organisasi tidak ditemukan');

      const program = await deps.programRepo.findBySlug({ organizationId: org.id }, programSlug.trim());
      if (!program) throw new DomainError('NOT_FOUND', 'Program tidak ditemukan');

      const order = await deps.commerceRepo.getOrderByReference(reference.trim());
      if (!order || order.organizationId !== org.id || order.programId !== program.id) {
        throw new DomainError('NOT_FOUND', 'Pesanan tidak ditemukan');
      }

      let checkoutUrl: string | null = null;
      if (order.status === 'PENDING' && order.paymentRecordId) {
        // Can re-read checkout url if needed
      }

      return {
        orderId: order.id,
        reference: order.reference,
        programTitle: program.title,
        amount: order.amount,
        currency: 'IDR',
        status: order.status as any,
        checkoutUrl,
        paidAt: order.paidAt,
        hasAccess: order.status === 'PAID' || order.status === 'APPROVED',
        accessToken: null,
      };
    },

    async createSubscriptionCheckout(
      organizationId: string,
      input: CreateSubscriptionCheckoutRequest,
      user: { id: string; name?: string | null; email?: string | null; phone?: string | null }
    ): Promise<CreateSubscriptionCheckoutResponse> {
      const plan = TALIRA_PLANS.SOLO;
      const amount = input.billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
      const externalOrderId = generateOrderReference('SUB');

      const paycoreOrder = await deps.paycoreClient.createOrder({
        externalOrderId,
        productKey: `TALIRA_SOLO_${input.billingCycle}`,
        description: `Langganan Talira Solo (${input.billingCycle === 'YEARLY' ? '1 Tahun' : '1 Bulan'})`,
        amount,
        currency: 'IDR',
        customer: {
          name: user.name || 'Promotor Owner',
          email: user.email || undefined,
          phone: user.phone || '+6281200000000',
        },
        returnUrl: input.returnUrl,
        fulfillmentData: {
          type: 'SUBSCRIPTION_PURCHASE',
          organizationId,
          planCode: 'SOLO',
          billingCycle: input.billingCycle,
        },
        idempotencyKey: `talira:sub:${organizationId}:${externalOrderId}`,
      });

      return {
        checkoutUrl: paycoreOrder.checkout_url,
        orderId: paycoreOrder.order_id,
        externalOrderId,
        amount,
        currency: 'IDR',
        planCode: 'SOLO',
        billingCycle: input.billingCycle,
      };
    },

    async handlePaycoreWebhook(
      rawBody: string,
      timestampHeader?: string | null,
      signatureHeader?: string | null
    ): Promise<{ status: string; type?: string; orderId?: string }> {
      const verified = deps.paycoreClient.verifyWebhook(rawBody, timestampHeader, signatureHeader);
      if (!verified) {
        throw new DomainError('UNAUTHORIZED', 'Invalid Paycore webhook signature or expired timestamp');
      }

      const event: PaycoreWebhookEvent = JSON.parse(rawBody);
      if (event.event_type !== 'payment.succeeded') {
        return { status: 'ignored' };
      }

      const { data } = event;
      const fulfillment = data.fulfillment_data || {};

      // 1. Handle Subscription Purchase
      if (fulfillment.type === 'SUBSCRIPTION_PURCHASE') {
        const organizationId = fulfillment.organizationId as string;
        const billingCycle = (fulfillment.billingCycle as string) || 'MONTHLY';
        const now = clock();
        const periodStart = now.toISOString();

        const periodEndDate = new Date(now.getTime());
        if (billingCycle === 'YEARLY') {
          periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
        } else {
          periodEndDate.setMonth(periodEndDate.getMonth() + 1);
        }
        const periodEnd = periodEndDate.toISOString();

        await deps.subscriptionRepo.updateSubscription(organizationId, {
          planCode: 'SOLO',
          status: 'ACTIVE',
          billingCycle,
          provider: 'PAYCORE',
          providerSubscriptionId: data.order_id,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          graceEndsAt: null,
          cancelAtPeriodEnd: false,
        });

        return { status: 'processed', type: 'subscription' };
      }

      // 2. Handle Paid Program Purchase
      const reference = data.external_order_id;
      let order = await deps.commerceRepo.getOrderByReference(reference);
      if (!order && fulfillment.orderId) {
        order = await deps.commerceRepo.getOrderById(fulfillment.orderId as string);
      }

      if (!order) {
        return { status: 'error', type: 'order_not_found' };
      }

      // Idempotency: If order already PAID and has enrollment, return immediately
      if (order.status === 'PAID' && order.enrollmentId) {
        return { status: 'already_processed', type: 'program_purchase', orderId: order.id };
      }

      const nowIso = clock().toISOString();

      // Update payment record to SUCCESS
      const existingPayRec = await deps.commerceRepo.getPaymentRecordByProviderId(data.order_id);
      if (existingPayRec) {
        await deps.commerceRepo.updatePaymentRecordStatus(existingPayRec.id, 'SUCCESS', {
          paymentMethod: data.provider || null,
        });
      }

      // Create Enrollment idempotently
      const enrollment = await deps.enrollmentService.enrollContact({
        organizationId: order.organizationId,
        programId: order.programId,
        contactId: order.contactId,
      });

      // Update Commerce Order to PAID and link enrollment
      await deps.commerceRepo.updateOrderStatus(order.id, 'PAID', {
        paidAt: data.paid_at || nowIso,
        enrollmentId: enrollment.id,
      });

      // Emit learner.enrolled event exactly once (guaranteed by enrollmentId check)
      await deps.learningEventRepo.create({
        organizationId: order.organizationId,
        enrollmentId: enrollment.id,
        contactId: order.contactId,
        eventType: 'learner.enrolled',
        payload: {
          programId: order.programId,
          orderId: order.id,
          orderReference: order.reference,
          sourceChannel: order.sourceChannel,
          amount: order.amount,
        },
        occurredAt: data.paid_at || nowIso,
      });

      // Create Platform Fee Entry (Rp3.000 flat, 0% percentage) exactly once!
      await deps.commerceRepo.createPlatformFeeEntry({
        organizationId: order.organizationId,
        orderId: order.id,
        feeType: 'PAID_LEARNER_TRANSACTION',
        amount: 3000,
        currency: 'IDR',
        status: 'BILLABLE',
        idempotencyKey: `talira:fee:${order.id}`,
      });

      return { status: 'processed', type: 'program_purchase', orderId: order.id };
    },

    async listOrders(
      organizationId: string,
      query: { status?: string; limit?: number; offset?: number }
    ) {
      const result = await deps.commerceRepo.listOrders(organizationId, query);
      const items: OrderItemSummary[] = result.orders.map((r) => ({
        id: r.order.id,
        reference: r.order.reference,
        buyerName: r.buyerName,
        buyerPhone: r.buyerPhone,
        buyerEmail: r.buyerEmail,
        programId: r.order.programId,
        programTitle: r.programTitle,
        amount: r.order.amount,
        currency: 'IDR' as const,
        sourceChannel: r.order.sourceChannel as any,
        paymentMode: r.order.paymentMode as any,
        status: r.order.status as any,
        paymentStatus: r.paymentStatus as any,
        paymentMethod: r.paymentMethod,
        platformFee: r.platformFee,
        enrollmentId: r.order.enrollmentId,
        createdAt: r.order.createdAt,
        paidAt: r.order.paidAt,
        approvedAt: r.order.approvedAt,
      }));

      return { orders: items, total: result.total };
    },

    async getOrderById(organizationId: string, orderId: string): Promise<CommerceOrder | null> {
      const order = await deps.commerceRepo.getOrderById(orderId);
      if (!order || order.organizationId !== organizationId) return null;
      return order as any;
    },

    async rejectOrder(
      organizationId: string,
      orderId: string,
      userId: string,
      reason: string
    ): Promise<CommerceOrder> {
      const order = await deps.commerceRepo.getOrderById(orderId);
      if (!order || order.organizationId !== organizationId) {
        throw new DomainError('NOT_FOUND', 'Pesanan tidak ditemukan');
      }
      if (order.status === 'PAID' || order.status === 'APPROVED') {
        throw new DomainError('CONFLICT', 'Pesanan yang sudah dibayar atau disetujui tidak dapat ditolak');
      }

      const nowIso = clock().toISOString();
      const updated = await deps.commerceRepo.updateOrderStatus(orderId, 'REJECTED', {
        rejectedAt: nowIso,
        rejectedByUserId: userId,
        rejectionReason: reason.trim(),
      });
      return updated as any;
    },

    async approveOrder(
      organizationId: string,
      orderId: string,
      userId: string
    ): Promise<CommerceOrder> {
      const order = await deps.commerceRepo.getOrderById(orderId);
      if (!order || order.organizationId !== organizationId) {
        throw new DomainError('NOT_FOUND', 'Pesanan tidak ditemukan');
      }
      if (order.status === 'APPROVED' || order.status === 'PAID') {
        return order as any;
      }

      const nowIso = clock().toISOString();

      // Create enrollment idempotently
      const enrollment = await deps.enrollmentService.enrollContact({
        organizationId: order.organizationId,
        programId: order.programId,
        contactId: order.contactId,
      });

      // Emit event
      await deps.learningEventRepo.create({
        organizationId: order.organizationId,
        enrollmentId: enrollment.id,
        contactId: order.contactId,
        eventType: 'learner.enrolled',
        payload: {
          programId: order.programId,
          orderId: order.id,
          orderReference: order.reference,
          sourceChannel: order.sourceChannel,
          approvedByUserId: userId,
        },
        occurredAt: nowIso,
      });

      // Create Platform Fee Entry
      await deps.commerceRepo.createPlatformFeeEntry({
        organizationId: order.organizationId,
        orderId: order.id,
        feeType: 'PAID_LEARNER_TRANSACTION',
        amount: 3000,
        currency: 'IDR',
        status: 'BILLABLE',
        idempotencyKey: `talira:fee:${order.id}`,
      });

      const updated = await deps.commerceRepo.updateOrderStatus(orderId, 'APPROVED', {
        approvedAt: nowIso,
        approvedByUserId: userId,
        enrollmentId: enrollment.id,
      });

      return updated as any;
    },
  };
}
