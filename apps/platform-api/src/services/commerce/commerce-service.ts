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

export const MANUAL_BANK_ENABLED = false;

export interface ValidateReturnUrlOptions {
  expectedHost?: string;
  appEnv?: string;
  allowedExtraHosts?: string[];
}

/**
 * Exact first-party and Talira-controlled hostnames/domains.
 * Generic public multi-tenant suffixes like 'workers.dev' and 'pages.dev'
 * MUST NEVER appear here to prevent arbitrary third-party deployments (e.g. attacker.pages.dev)
 * from being accepted as trusted return destinations.
 */
const TALIRA_CONTROLLED_DOMAINS = [
  'stiffin.id',
  'promotor.id',
  'talira.id',
  'ralivo.id',
  'ralivo.com',
  'appvibe.biz.id',
  'moxsenna.workers.dev',
];

export function isAllowedReturnHost(host: string, options?: ValidateReturnUrlOptions): boolean {
  const normalizedHost = host.toLowerCase().trim();
  const isLocal = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1';

  if (isLocal) {
    // In production, localhost/127.0.0.1 is strictly forbidden
    return options?.appEnv !== 'production';
  }

  // If caller provided an expectedHost, it MUST match expectedHost (case-insensitive)
  if (options?.expectedHost) {
    return normalizedHost === options.expectedHost.toLowerCase().trim();
  }

  // Explicit extra allowed hosts from server-side config
  if (options?.allowedExtraHosts?.some((h) => normalizedHost === h.toLowerCase().trim())) {
    return true;
  }

  // Exact match or subdomain of Talira-controlled domains
  for (const domain of TALIRA_CONTROLLED_DOMAINS) {
    if (normalizedHost === domain || normalizedHost.endsWith('.' + domain)) {
      return true;
    }
  }

  // Generic workers.dev, pages.dev, or arbitrary host -> strictly rejected
  return false;
}

export function validateReturnUrl(
  returnUrl: string | undefined,
  options?: ValidateReturnUrlOptions | string
): string | undefined {
  if (!returnUrl) return undefined;
  const opts: ValidateReturnUrlOptions =
    typeof options === 'string' ? { expectedHost: options } : options || {};

  try {
    const trimmed = returnUrl.trim();
    if (trimmed.includes('\\') || trimmed.startsWith('//')) {
      throw new DomainError('VALIDATION_ERROR', 'Format returnUrl tidak valid');
    }
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new DomainError('VALIDATION_ERROR', 'Protokol returnUrl harus HTTP atau HTTPS');
    }

    if (!isAllowedReturnHost(parsed.hostname, opts)) {
      throw new DomainError('VALIDATION_ERROR', 'Domain returnUrl tidak diizinkan');
    }

    return parsed.toString();
  } catch (err: any) {
    if (err instanceof DomainError) throw err;
    throw new DomainError('VALIDATION_ERROR', 'Format returnUrl tidak valid');
  }
}

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
  appUuid?: string;
  appEnv?: string;
  allowedReturnHosts?: string[];
}

export interface ClaimOrderAccessResult {
  success: boolean;
  accessToken: string;
  contactId: string;
  organizationId: string;
  programId: string;
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

  claimOrderAccess(
    slug: string,
    programSlug: string,
    reference: string,
    phone: string
  ): Promise<ClaimOrderAccessResult>;

  createSubscriptionCheckout(
    organizationId: string,
    input: CreateSubscriptionCheckoutRequest,
    user: { id: string; name?: string | null; email?: string | null; phone?: string | null }
  ): Promise<CreateSubscriptionCheckoutResponse>;

  handlePaycoreWebhook(
    rawBody: string,
    timestampHeader?: string | null,
    signatureHeader?: string | null
  ): Promise<{ status: string; type?: string; orderId?: string; duplicate?: boolean; reason?: string }>;

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

      // Validate returnUrl strictly
      const sanitizedReturnUrl = validateReturnUrl(input.returnUrl, {
        appEnv: deps.appEnv,
        allowedExtraHosts: deps.allowedReturnHosts,
      });

      // Match or create buyer contact
      const contact = await deps.contactRepo.matchOrCreate({
        context: { organizationId: org.id },
        phoneRaw: input.phone.trim(),
        name: input.name.trim(),
        email: input.email?.trim() || undefined,
      });

      const reference = generateOrderReference('TLR');

      // 1. Persist local expected checkout truth BEFORE external gateway call
      const order = await deps.commerceRepo.createOrder({
        organizationId: org.id,
        orderType: 'PROGRAM_PURCHASE',
        programId: program.id,
        contactId: contact.id,
        reference,
        sourceChannel: input.sourceChannel || 'STOREFRONT',
        paymentMode: 'PAYCORE',
        amount: program.priceAmount, // Server authoritative IDR amount
        currency: 'IDR',
        status: 'PENDING',
      });

      // 2. Call Paycore create order with fail-recovery
      let paycoreOrder;
      try {
        paycoreOrder = await deps.paycoreClient.createOrder({
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
          returnUrl: sanitizedReturnUrl,
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
      } catch (err: any) {
        // Mark order as FAILED to prevent orphan dangling PENDING orders
        await deps.commerceRepo.updateOrderStatus(order.id, 'FAILED').catch(() => {});
        throw new DomainError('PAYMENT_GATEWAY_ERROR', 'Gagal membuat sesi pembayaran gateway. Silakan coba sesaat lagi.');
      }

      // 3. Persist provider payment record
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

      // Link provider order ID and payment record in order
      await deps.commerceRepo.updateOrderStatus(order.id, 'PENDING', {
        providerOrderId: paycoreOrder.order_id,
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

      const hasAccess = order.status === 'PAID' || order.status === 'APPROVED';

      return {
        orderId: order.id,
        reference: order.reference,
        programTitle: program.title,
        amount: order.amount,
        currency: 'IDR',
        status: order.status as any,
        checkoutUrl: null, // Never leak unverified redirect URLs
        paidAt: order.paidAt,
        hasAccess,
        accessToken: null, // Never expose raw access token on unauthenticated query
      };
    },

    async claimOrderAccess(
      slug: string,
      programSlug: string,
      reference: string,
      phone: string
    ): Promise<ClaimOrderAccessResult> {
      const org = await deps.orgRepo.findBySlug(slug.trim());
      if (!org) throw new DomainError('NOT_FOUND', 'Organisasi tidak ditemukan');

      const program = await deps.programRepo.findBySlug({ organizationId: org.id }, programSlug.trim());
      if (!program) throw new DomainError('NOT_FOUND', 'Program tidak ditemukan');

      const order = await deps.commerceRepo.getOrderByReference(reference.trim());
      if (!order || order.organizationId !== org.id || order.programId !== program.id) {
        throw new DomainError('NOT_FOUND', 'Pesanan tidak ditemukan');
      }

      if (order.status !== 'PAID' && order.status !== 'APPROVED') {
        throw new DomainError('PAYMENT_REQUIRED', 'Pesanan belum lunas. Selesaikan pembayaran terlebih dahulu.');
      }

      if (!order.contactId) {
        throw new DomainError('INVALID_STATE', 'Data kontak pemesan tidak ditemukan pada pesanan');
      }

      const contact = await deps.contactRepo.findById({ organizationId: org.id }, order.contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Kontak pemesan tidak ditemukan');
      }

      // Verify phone ownership
      const normalizedInputPhone = normalizePhone(phone.trim());
      if (normalizedInputPhone !== contact.phoneE164) {
        throw new DomainError('UNAUTHORIZED', 'Nomor telepon tidak cocok dengan nomor pemesan');
      }

      // Issue access token via canonical domain service
      const accessResult = await deps.enrollmentService.enrollContactAndIssueAccess({
        organizationId: org.id,
        programId: program.id,
        contactId: contact.id,
      });

      return {
        success: true,
        accessToken: accessResult.accessToken,
        contactId: contact.id,
        organizationId: org.id,
        programId: program.id,
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
      const sanitizedReturnUrl = validateReturnUrl(input.returnUrl, {
        appEnv: deps.appEnv,
        allowedExtraHosts: deps.allowedReturnHosts,
      });

      // Validate operator contact: phone is optional in Paycore schema; do not fabricate fake numbers
      const customerPhone = user.phone?.trim() ? normalizePhone(user.phone.trim()) : undefined;

      // 1. Persist local expected subscription checkout truth BEFORE external gateway call
      const order = await deps.commerceRepo.createOrder({
        organizationId,
        orderType: 'SUBSCRIPTION_PURCHASE',
        reference: externalOrderId,
        sourceChannel: 'OPERATOR',
        paymentMode: 'PAYCORE',
        amount, // Canonical plan amount
        currency: 'IDR',
        status: 'PENDING',
        metadata: JSON.stringify({
          planCode: 'SOLO',
          billingCycle: input.billingCycle,
          userId: user.id,
        }),
      });

      // 2. Call Paycore create order with fail-recovery
      let paycoreOrder;
      try {
        paycoreOrder = await deps.paycoreClient.createOrder({
          externalOrderId,
          productKey: `TALIRA_SOLO_${input.billingCycle}`,
          description: `Langganan Ralivo Solo (${input.billingCycle === 'YEARLY' ? '1 Tahun' : '1 Bulan'})`,
          amount,
          currency: 'IDR',
          customer: {
            name: user.name || 'Promotor Owner',
            email: user.email || undefined,
            phone: customerPhone,
          },
          returnUrl: sanitizedReturnUrl,
          fulfillmentData: {
            type: 'SUBSCRIPTION_PURCHASE',
            organizationId,
            orderId: order.id,
            planCode: 'SOLO',
            billingCycle: input.billingCycle,
          },
          idempotencyKey: `talira:sub:${organizationId}:${externalOrderId}`,
        });
      } catch (err: any) {
        await deps.commerceRepo.updateOrderStatus(order.id, 'FAILED').catch(() => {});
        throw new DomainError('PAYMENT_GATEWAY_ERROR', 'Gagal membuat sesi pembayaran langganan. Silakan coba lagi.');
      }

      // 3. Link provider order ID
      await deps.commerceRepo.updateOrderStatus(order.id, 'PENDING', {
        providerOrderId: paycoreOrder.order_id,
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
    ): Promise<{ status: string; type?: string; orderId?: string; duplicate?: boolean; reason?: string }> {
      // 1. Cryptographic signature & timestamp freshness verification
      const verified = deps.paycoreClient.verifyWebhook(rawBody, timestampHeader, signatureHeader);
      if (!verified) {
        throw new DomainError('UNAUTHORIZED', 'Invalid Paycore webhook signature or expired timestamp');
      }

      const event: PaycoreWebhookEvent = JSON.parse(rawBody);
      const { data } = event;

      // 2. Paycore App Identity Verification
      if (deps.appUuid && data.app_id && data.app_id !== deps.appUuid) {
        return { status: 'reconciliation_failed', reason: 'app_uuid_mismatch' };
      }

      // 3. Durable Webhook Receipt & Idempotency Check
      const receipt = await deps.commerceRepo.recordWebhookEvent({
        provider: 'PAYCORE',
        providerEventId: event.event_id,
        eventType: event.event_type,
        processingResult: 'PROCESSING',
      });

      if (!receipt.isNew) {
        if (receipt.event?.processingResult === 'SUCCESS' || receipt.event?.processingResult === 'DUPLICATE') {
          return { status: 'processed', duplicate: true, type: receipt.event.eventType };
        }
      }

      // 4. Filter supported event type
      if (event.event_type !== 'payment.succeeded') {
        await deps.commerceRepo.updateWebhookEventResult('PAYCORE', event.event_id, 'FAILED', 'Non-success event ignored');
        return { status: 'ignored' };
      }

      // 5. Strict Local Checkout Resolution
      let order = await deps.commerceRepo.getOrderByReference(data.external_order_id);
      if (!order && data.order_id) {
        order = await deps.commerceRepo.getOrderByProviderOrderId(data.order_id);
      }

      if (!order) {
        await deps.commerceRepo.updateWebhookEventResult('PAYCORE', event.event_id, 'RECONCILIATION_FAILED', 'Order not found');
        return { status: 'reconciliation_failed', reason: 'order_not_found' };
      }

      // 6. Strict Field Reconciliation
      if (order.providerOrderId && order.providerOrderId !== data.order_id) {
        await deps.commerceRepo.updateWebhookEventResult('PAYCORE', event.event_id, 'RECONCILIATION_FAILED', 'Provider order ID mismatch');
        return { status: 'reconciliation_failed', reason: 'provider_order_id_mismatch' };
      }

      if (order.reference !== data.external_order_id) {
        await deps.commerceRepo.updateWebhookEventResult('PAYCORE', event.event_id, 'RECONCILIATION_FAILED', 'External reference mismatch');
        return { status: 'reconciliation_failed', reason: 'reference_mismatch' };
      }

      if (typeof data.amount !== 'number' || data.amount !== order.amount) {
        await deps.commerceRepo.updateWebhookEventResult('PAYCORE', event.event_id, 'RECONCILIATION_FAILED', 'Amount mismatch');
        return { status: 'reconciliation_failed', reason: 'amount_mismatch' };
      }

      if (data.currency !== 'IDR' || order.currency !== 'IDR') {
        await deps.commerceRepo.updateWebhookEventResult('PAYCORE', event.event_id, 'RECONCILIATION_FAILED', 'Currency mismatch');
        return { status: 'reconciliation_failed', reason: 'currency_mismatch' };
      }

      const nowIso = clock().toISOString();

      // ==========================================
      // Case A: Subscription Purchase Fulfillment
      // ==========================================
      if (order.orderType === 'SUBSCRIPTION_PURCHASE') {
        let billingCycle = 'MONTHLY';
        try {
          if (order.metadata) {
            const meta = JSON.parse(order.metadata);
            if (meta.billingCycle === 'YEARLY') billingCycle = 'YEARLY';
          }
        } catch {}

        // Deterministic period derivation: Replay MUST NEVER shift or extend period
        const existingSub = await deps.subscriptionRepo.getSubscription(order.organizationId);
        let periodStart: string;
        let periodEnd: string;

        if (existingSub.planCode === 'SOLO' && existingSub.currentPeriodStart && existingSub.currentPeriodEnd) {
          // Keep existing canonical period if active
          periodStart = existingSub.currentPeriodStart;
          periodEnd = existingSub.currentPeriodEnd;
        } else {
          const now = clock();
          periodStart = order.paidAt || now.toISOString();
          const periodEndDate = new Date(new Date(periodStart).getTime());
          if (billingCycle === 'YEARLY') {
            periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
          } else {
            periodEndDate.setMonth(periodEndDate.getMonth() + 1);
          }
          periodEnd = periodEndDate.toISOString();
        }

        await deps.subscriptionRepo.updateSubscription(order.organizationId, {
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

        await deps.commerceRepo.updateOrderStatus(order.id, 'PAID', {
          paidAt: data.paid_at || nowIso,
          providerOrderId: data.order_id,
        });

        await deps.commerceRepo.updateWebhookEventResult('PAYCORE', event.event_id, 'SUCCESS');
        return { status: 'processed', type: 'subscription', orderId: order.id };
      }

      // ==========================================
      // Case B: Paid Program Purchase Fulfillment
      // ==========================================
      if (!order.programId || !order.contactId) {
        await deps.commerceRepo.updateWebhookEventResult('PAYCORE', event.event_id, 'RECONCILIATION_FAILED', 'Program or contact missing on order');
        return { status: 'reconciliation_failed', reason: 'incomplete_order_data' };
      }

      // Update payment record
      const existingPayRec = await deps.commerceRepo.getPaymentRecordByProviderId(data.order_id);
      if (existingPayRec) {
        await deps.commerceRepo.updatePaymentRecordStatus(existingPayRec.id, 'SUCCESS', {
          paymentMethod: data.provider || null,
        });
      }

      // Canonical race-safe enrollment and access issuance (SOLE owner of learner.enrolled)
      const enrollmentResult = await deps.enrollmentService.enrollContactAndIssueAccess({
        organizationId: order.organizationId,
        programId: order.programId,
        contactId: order.contactId,
      });

      // Update Commerce Order to PAID and link enrollment
      await deps.commerceRepo.updateOrderStatus(order.id, 'PAID', {
        paidAt: data.paid_at || nowIso,
        enrollmentId: enrollmentResult.enrollment.id,
        providerOrderId: data.order_id,
      });

      // Record Platform Fee Entry (flat Rp3.000, 0% percentage fee, strictly idempotent)
      await deps.commerceRepo.createPlatformFeeEntry({
        organizationId: order.organizationId,
        orderId: order.id,
        feeType: 'PAID_LEARNER_TRANSACTION',
        amount: 3000,
        currency: 'IDR',
        status: 'BILLABLE',
        idempotencyKey: `talira:fee:${order.id}`,
      });

      await deps.commerceRepo.updateWebhookEventResult('PAYCORE', event.event_id, 'SUCCESS');
      return { status: 'processed', type: 'program_purchase', orderId: order.id };
    },

    async listOrders(
      organizationId: string,
      query: { status?: string; limit?: number; offset?: number }
    ): Promise<{ orders: OrderItemSummary[]; total: number }> {
      const result = await deps.commerceRepo.listOrders(organizationId, query);

      const items: OrderItemSummary[] = result.orders.map((r) => ({
        id: r.order.id,
        reference: r.order.reference,
        buyerName: r.buyerName,
        buyerPhone: r.buyerPhone,
        buyerEmail: r.buyerEmail,
        programId: r.order.programId || '00000000-0000-0000-0000-000000000000',
        programTitle: r.programTitle,
        amount: r.order.amount,
        currency: 'IDR',
        sourceChannel: r.order.sourceChannel as any,
        paymentMode: r.order.paymentMode as any,
        status: r.order.status as any,
        paymentStatus: r.paymentStatus as any,
        paymentMethod: r.paymentMethod,
        platformFee: r.platformFee, // Canonical ledger truth from platform_fee_entries
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

      // P0-4: PAYCORE orders MUST NEVER be manually approved!
      if (order.paymentMode === 'PAYCORE') {
        throw new DomainError(
          'FORBIDDEN',
          'Pesanan online Paycore tidak dapat disetujui secara manual. Pembayaran harus diselesaikan melalui gateway pembayaran.'
        );
      }

      // P0-4: MANUAL_BANK orders can ONLY be approved if the capability is enabled
      if (order.paymentMode === 'MANUAL_BANK') {
        if (!MANUAL_BANK_ENABLED) {
          throw new DomainError(
            'FEATURE_DISABLED',
            'Metode pembayaran transfer bank manual saat ini dinonaktifkan (HELD).'
          );
        }
      }

      if (order.status === 'APPROVED' || order.status === 'PAID') {
        return order as any;
      }

      if (!order.programId || !order.contactId) {
        throw new DomainError('INVALID_STATE', 'Data program atau kontak tidak lengkap pada pesanan');
      }

      // Create enrollment race-safely via domain service (single owner of learner.enrolled)
      const enrollmentResult = await deps.enrollmentService.enrollContactAndIssueAccess({
        organizationId: order.organizationId,
        programId: order.programId,
        contactId: order.contactId,
      });

      // Record Platform Fee Entry
      await deps.commerceRepo.createPlatformFeeEntry({
        organizationId: order.organizationId,
        orderId: order.id,
        feeType: 'PAID_LEARNER_TRANSACTION',
        amount: 3000,
        currency: 'IDR',
        status: 'BILLABLE',
        idempotencyKey: `talira:fee:${order.id}`,
      });

      const nowIso = clock().toISOString();
      const updated = await deps.commerceRepo.updateOrderStatus(orderId, 'APPROVED', {
        approvedAt: nowIso,
        approvedByUserId: userId,
        enrollmentId: enrollmentResult.enrollment.id,
      });

      return updated as any;
    },
  };
}
