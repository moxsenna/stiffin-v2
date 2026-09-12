import { Hono } from 'hono';
import { z } from 'zod';
import { sql, eq } from 'drizzle-orm';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import {
  PublicPaidCheckoutRequestSchema,
  CreateSubscriptionCheckoutRequestSchema,
  ListOrdersQuerySchema,
  RejectOrderRequestSchema,
  CreatePayoutBatchRequestSchema,
  MarkPayoutPaidRequestSchema,
  CreateBankAccountRequestSchema,
  UpdateBankAccountRequestSchema,
} from '@promotor/contracts';
import { createCommerceRepository } from '../repositories/commerce-repository';
import { createSubscriptionRepository } from '../repositories/subscription-repository';
import { createPlanAccessService } from '../services/billing/plan-access-service';
import { createPaycoreClient, validatePaycoreConfig } from '../services/paycore/paycore-client';
import { createCommerceService, MANUAL_BANK_ENABLED } from '../services/commerce/commerce-service';
import { createProgramRepository } from '../repositories/program-repository';
import { createContactRepository } from '../repositories/contact-repository';
import { createOrganizationRepository } from '../repositories/organization-repository';
import { createEnrollmentService } from '../services/class/enrollment-service';
import { createLearningEventRepository } from '../repositories/learning-event-repository';
import { createPriceVariantRepository } from '../repositories/price-variant-repository';
import { createCouponService } from '../services/commerce/coupon-service';
import { createEntitlementRepository } from '../repositories/entitlement-repository';
import { createPayoutRepository } from '../repositories/payout-repository';
import { createBankAccountRepository } from '../repositories/bank-account-repository';
import { createPayoutService } from '../services/payout/payout-service';
import { calcNetAmount } from '../services/payout/payout-math';
import { createIntegrationOutboxService } from '../services/integration/integration-outbox-service';
import { commerceOrders } from '../db/schema/commerce-orders';
import { programs } from '../db/schema/programs';
import { contacts } from '../db/schema/contacts';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';

function getCommerceServices(c: any) {
  const db = c.get('db');
  const env = c.env || {};
  const appEnv = env.APP_ENV || 'production';

  const paycoreConfig = validatePaycoreConfig(env, appEnv);
  const paycoreClient = createPaycoreClient(paycoreConfig);

  const commerceRepo = createCommerceRepository(db);
  const subscriptionRepo = createSubscriptionRepository(db);
  const planAccessService = createPlanAccessService(subscriptionRepo);

  const programRepo = createProgramRepository(db);
  const priceVariantRepo = createPriceVariantRepository(db);
  const couponService = createCouponService(db);
  const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
  const orgRepo = createOrganizationRepository(db);
  const enrollmentService = createEnrollmentService(db);
  const learningEventRepo = createLearningEventRepository(db);

  const emitOrderPaid = async (input: {
    organizationId: string;
    orderId: string;
    contactId: string | null;
    amount: number;
    programTitle: string | null;
    buyerName: string | null;
  }) => {
    const ent = await createEntitlementRepository(db).getForOrg({ organizationId: input.organizationId });
    if (!ent?.promotorFlow) return; // gating entitlemen: tanpa Flow, event tidak diproses
    const outbox = createIntegrationOutboxService(db);
    const nowIso = new Date().toISOString();
    const idempotencyKey = `promotorclass:order-paid:${input.orderId}`;

    let programTitle = input.programTitle;
    let buyerName = input.buyerName;
    try {
      const [row] = await db
        .select({ title: programs.title, buyer: contacts.name })
        .from(commerceOrders)
        .leftJoin(programs, eq(commerceOrders.programId, programs.id))
        .leftJoin(contacts, eq(commerceOrders.contactId, contacts.id))
        .where(eq(commerceOrders.id, input.orderId))
        .limit(1);
      programTitle = programTitle ?? row?.title ?? null;
      buyerName = buyerName ?? row?.buyer ?? null;
    } catch {
      // fallback judul generik bila lookup gagal
    }

    const title = `Sambut ${buyerName || 'peserta baru'} yang baru lunas ${programTitle || 'program'}`;
    await outbox.enqueue({
      organizationId: input.organizationId,
      destination: 'PROMOTORFLOW',
      operation: 'CREATE_NEXT_ACTION',
      idempotencyKey,
      payloadJson: {
        organizationId: input.organizationId,
        contactId: input.contactId,
        source: 'PROMOTORCLASS',
        sourceEventId: input.orderId,
        actionType: 'FOLLOW_UP',
        title,
        reason: 'Peserta baru melunasi program — kirim panduan mulai',
        dueAt: nowIso,
        context: { orderId: input.orderId, amount: input.amount, programTitle },
        idempotencyKey,
      },
    });
    await outbox.enqueue({
      organizationId: input.organizationId,
      destination: 'PROMOTORFLOW',
      operation: 'APPEND_ACTIVITY',
      idempotencyKey: `act_${idempotencyKey}`,
      payloadJson: {
        organizationId: input.organizationId,
        contactId: input.contactId,
        source: 'PROMOTORCLASS',
        sourceEventId: input.orderId,
        eventType: 'ORDER_PAID',
        summary: title,
        context: { orderId: input.orderId, amount: input.amount },
        idempotencyKey: `act_${idempotencyKey}`,
      },
    });
    await outbox.processPending({ limit: 10 }).catch(() => null);
  };

  const commerceService = createCommerceService({
    commerceRepo,
    subscriptionRepo,
    planAccessService,
    paycoreClient,
    programRepo,
    priceVariantRepo,
    couponService,
    contactRepo,
    orgRepo,
    enrollmentService,
    learningEventRepo,
    emitOrderPaid,
    appUuid: paycoreConfig.appUuid,
    appEnv,
  });

  return {
    commerceRepo,
    subscriptionRepo,
    planAccessService,
    paycoreClient,
    commerceService,
  };
}

function getPayoutServices(c: any) {
  const db = c.get('db');
  const commerceRepo = createCommerceRepository(db);
  const payoutRepo = createPayoutRepository(db);
  const bankRepo = createBankAccountRepository(db);
  const payoutService = createPayoutService({ payoutRepo, commerceRepo });
  return { commerceRepo, payoutRepo, bankRepo, payoutService };
}

function requireOrgId(c: any): string {
  const authCtx = c.get('authContext');
  if (!authCtx?.organization) {
    throw new DomainError('UNAUTHORIZED', 'Autentikasi organisasi dibutuhkan');
  }
  return authCtx.organization.organizationId as string;
}

export function registerCommerceRoutes(app: Hono<AppEnv>) {
  // ==========================================
  // 1. Paycore Inbound Webhook Endpoint
  // Strict HMAC signature verification, idempotent
  // ==========================================
  app.post('/api/v1/webhooks/paycore', async (c) => {
    c.header('Cache-Control', 'no-store');
    const rawBody = await c.req.text();
    const timestampHeader = c.req.header('x-paycore-event-timestamp') || c.req.header('X-PayCore-Event-Timestamp');
    const signatureHeader = c.req.header('x-paycore-event-signature') || c.req.header('X-PayCore-Event-Signature');

    const { commerceService } = getCommerceServices(c);
    const result = await commerceService.handlePaycoreWebhook(rawBody, timestampHeader, signatureHeader);
    return c.json(result, 200);
  });

  // ==========================================
  // 2. Public Paid Checkout, Order Status & Claim Access
  // ==========================================
  app.post('/api/v1/public/:slug/programs/:programSlug/checkout', async (c) => {
    c.header('Cache-Control', 'no-store');
    const slug = c.req.param('slug');
    const programSlug = c.req.param('programSlug');

    const rawJson = await c.req.json();
    const parseResult = PublicPaidCheckoutRequestSchema.safeParse(rawJson);
    if (!parseResult.success) {
      throw new DomainError('VALIDATION_ERROR', 'Data checkout tidak valid', {
        errors: parseResult.error.flatten(),
      });
    }

    const { commerceService } = getCommerceServices(c);
    const result = await commerceService.createProgramCheckout(slug, programSlug, parseResult.data);
    return c.json(result, 201);
  });

  app.get('/api/v1/public/:slug/programs/:programSlug/orders/:reference', async (c) => {
    c.header('Cache-Control', 'no-store');
    const slug = c.req.param('slug');
    const programSlug = c.req.param('programSlug');
    const reference = c.req.param('reference');

    const { commerceService } = getCommerceServices(c);
    const result = await commerceService.getOrderStatusByReference(slug, programSlug, reference);
    return c.json(result, 200);
  });

  app.post('/api/v1/public/:slug/programs/:programSlug/orders/:reference/claim-access', async (c) => {
    c.header('Cache-Control', 'no-store');
    const slug = c.req.param('slug');
    const programSlug = c.req.param('programSlug');
    const reference = c.req.param('reference');

    const rawJson = await c.req.json();
    const phone = typeof rawJson?.phone === 'string' ? rawJson.phone : '';
    if (!phone.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Nomor WhatsApp pemesan wajib diisi');
    }

    const { commerceService } = getCommerceServices(c);
    const result = await commerceService.claimOrderAccess(slug, programSlug, reference, phone);

    // Set learner session cookie
    const isProduction = (c.env as any)?.APP_ENV === 'production';
    const isStaging = (c.env as any)?.APP_ENV === 'staging';
    const cookieParts = [
      `learner_session=${encodeURIComponent(result.accessToken)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=2592000', // 30 days
    ];
    if (isProduction || isStaging) {
      cookieParts.push('Secure');
    }
    c.header('Set-Cookie', cookieParts.join('; '));

    return c.json({
      success: true,
      accessToken: result.accessToken,
      contactId: result.contactId,
      organizationId: result.organizationId,
      programId: result.programId,
    }, 200);
  });

  // Public quote for promo coupon
  app.get('/api/v1/public/:slug/programs/:programSlug/coupons/:code', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const slug = c.req.param('slug');
    const programSlug = c.req.param('programSlug');
    const code = c.req.param('code');

    const couponService = createCouponService(db);
    const orgRepo = createOrganizationRepository(db);
    const programRepo = createProgramRepository(db);

    const org = await orgRepo.findBySlug(slug.trim());
    if (!org) {
      return c.json({ valid: false, message: 'Organisasi tidak ditemukan', discountAmount: 0, finalAmount: 0 }, 200);
    }

    const program = await programRepo.findBySlug({ organizationId: org.id }, programSlug.trim());
    if (!program || program.status !== 'published') {
      return c.json({ valid: false, message: 'Program tidak ditemukan atau belum dipublikasikan', discountAmount: 0, finalAmount: 0 }, 200);
    }

    const coupon = await couponService.findByCode(org.id, code);
    if (!coupon) {
      return c.json({ valid: false, message: 'Kode kupon tidak ditemukan', discountAmount: 0, finalAmount: program.priceAmount }, 200);
    }

    const quote = couponService.validateForProgram({
      coupon,
      programId: program.id,
      listPrice: program.priceAmount,
    });

    return c.json(quote, 200);
  });

  // ==========================================
  // 3. Billing & Plan Access Endpoints
  // Authenticated Organization Owner / Admin
  // ==========================================
  app.get('/api/v1/billing/plan', async (c) => {
    c.header('Cache-Control', 'no-store');
    const authCtx = c.get('authContext');
    if (!authCtx?.organization) {
      throw new DomainError('UNAUTHORIZED', 'Organisasi tidak teridentifikasi');
    }
    const orgId = authCtx.organization.organizationId;
    const { planAccessService } = getCommerceServices(c);
    const planAccess = await planAccessService.getPlanAccess(orgId);
    const db = c.get('db');
    const ent = await createEntitlementRepository(db).getForOrg({ organizationId: orgId });
    return c.json(
      {
        ...planAccess,
        features: {
          promotorClass: !!ent?.promotorClass,
          promotorFlow: !!ent?.promotorFlow,
        },
      },
      200
    );
  });

  app.post('/api/v1/billing/subscription/checkout', async (c) => {
    c.header('Cache-Control', 'no-store');
    const authCtx = c.get('authContext');
    if (!authCtx?.organization || !authCtx?.user) {
      throw new DomainError('UNAUTHORIZED', 'Autentikasi dibutuhkan');
    }
    const orgId = authCtx.organization.organizationId;

    const rawJson = await c.req.json();
    const parseResult = CreateSubscriptionCheckoutRequestSchema.safeParse(rawJson);
    if (!parseResult.success) {
      throw new DomainError('VALIDATION_ERROR', 'Permintaan upgrade paket tidak valid', {
        errors: parseResult.error.flatten(),
      });
    }

    const { commerceService } = getCommerceServices(c);
    const result = await commerceService.createSubscriptionCheckout(orgId, parseResult.data, {
      id: authCtx.user.id,
      name: authCtx.user.name,
      email: authCtx.user.email,
    });
    return c.json(result, 201);
  });

  // ==========================================
  // 4. PromotorClass Orders Management
  // Authenticated PromotorClass Dashboard
  // ==========================================
  app.get('/api/v1/class/orders', async (c) => {
    c.header('Cache-Control', 'no-store');
    const authCtx = c.get('authContext');
    if (!authCtx?.organization) {
      throw new DomainError('UNAUTHORIZED', 'Autentikasi organisasi dibutuhkan');
    }
    const orgId = authCtx.organization.organizationId;

    // Verify PromotorClass entitlement
    const db = c.get('db');
    const entitlementRepo = createEntitlementRepository(db);
    const ent = await entitlementRepo.getForOrg({ organizationId: orgId });
    if (!ent?.promotorClass) {
      throw new DomainError('FORBIDDEN', 'Organisasi tidak memiliki akses ke fitur PromotorClass');
    }

    const queryRaw = {
      status: c.req.query('status') || undefined,
      payoutStatus: c.req.query('payoutStatus') || undefined,
      limit: c.req.query('limit') || undefined,
      offset: c.req.query('offset') || undefined,
    };
    const parsedQuery = ListOrdersQuerySchema.parse(queryRaw);

    const { commerceService } = getCommerceServices(c);
    const result = await commerceService.listOrders(orgId, parsedQuery);
    return c.json(result, 200);
  });

  app.get('/api/v1/class/orders/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const authCtx = c.get('authContext');
    if (!authCtx?.organization) {
      throw new DomainError('UNAUTHORIZED', 'Autentikasi organisasi dibutuhkan');
    }
    const orgId = authCtx.organization.organizationId;
    const id = c.req.param('id');

    const { commerceService } = getCommerceServices(c);
    const order = await commerceService.getOrderById(orgId, id);
    if (!order) throw new DomainError('NOT_FOUND', 'Pesanan tidak ditemukan');
    return c.json({ order }, 200);
  });

  app.post('/api/v1/class/orders/:id/reject', async (c) => {
    c.header('Cache-Control', 'no-store');
    const authCtx = c.get('authContext');
    if (!authCtx?.organization || !authCtx?.user) {
      throw new DomainError('UNAUTHORIZED', 'Autentikasi dibutuhkan');
    }
    const orgId = authCtx.organization.organizationId;
    const id = c.req.param('id');

    const rawJson = await c.req.json();
    const parseResult = RejectOrderRequestSchema.safeParse(rawJson);
    if (!parseResult.success) {
      throw new DomainError('VALIDATION_ERROR', 'Alasan penolakan tidak valid', {
        errors: parseResult.error.flatten(),
      });
    }

    const { commerceService } = getCommerceServices(c);
    const order = await commerceService.rejectOrder(orgId, id, authCtx.user.id, parseResult.data.reason);
    return c.json({ order }, 200);
  });

  app.post('/api/v1/class/orders/:id/approve', async (c) => {
    c.header('Cache-Control', 'no-store');
    const authCtx = c.get('authContext');
    if (!authCtx?.organization || !authCtx?.user) {
      throw new DomainError('UNAUTHORIZED', 'Autentikasi dibutuhkan');
    }
    const orgId = authCtx.organization.organizationId;
    const id = c.req.param('id');

    const { commerceService } = getCommerceServices(c);
    const order = await commerceService.approveOrder(orgId, id, authCtx.user.id);
    return c.json({ order }, 200);
  });

  app.get('/api/v1/class/orders/summary', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const db = c.get('db');
    const res = await db.execute(
      sql`SELECT
        COALESCE(SUM(o.amount), 0) AS "gross",
        COALESCE(SUM(COALESCE(pr.processor_fee, 0)), 0) AS "processor",
        COALESCE(SUM(CASE WHEN fe.status IN ('BILLABLE', 'BILLED') THEN 3000 ELSE 0 END), 0) AS "platform",
        COUNT(*) AS "count"
      FROM commerce_orders o
      LEFT JOIN payment_records pr ON pr.id = o.payment_record_id
      LEFT JOIN platform_fee_entries fe ON fe.order_id = o.id
      WHERE o.organization_id = ${orgId}
        AND o.order_type = 'PROGRAM_PURCHASE'
        AND o.status IN ('PAID', 'APPROVED')`
    );
    const row: any = res.rows?.[0] ?? {};
    const gross = Number(row.gross ?? 0);
    const processor = Number(row.processor ?? 0);
    const platform = Number(row.platform ?? 0);
    return c.json({
      summary: {
        grossAmount: gross,
        processorFeeTotal: processor,
        platformFeeTotal: platform,
        netTotal: gross - processor - platform,
        paidCount: Number(row.count ?? 0),
      },
    }, 200);
  });

  app.get('/api/v1/class/orders/available', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutRepo } = getPayoutServices(c);
    const limit = Math.min(Number(c.req.query('limit') || 100), 100);
    const rows = await payoutRepo.listAvailableOrders(orgId, limit);
    return c.json({
      orders: rows.map((r) => ({
        id: r.order.id,
        reference: r.order.reference,
        amount: r.order.amount,
        status: r.order.status,
        processorFee: r.processorFee,
        netAmount: calcNetAmount(r.order.amount, r.processorFee),
        payoutStatus: 'AVAILABLE' as const,
        paidAt: r.order.paidAt,
        createdAt: r.order.createdAt,
      })),
    }, 200);
  });

  app.get('/api/v1/class/payouts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutRepo } = getPayoutServices(c);
    const batches = await payoutRepo.listBatches(orgId);
    return c.json({ batches }, 200);
  });

  app.post('/api/v1/class/payouts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = CreatePayoutBatchRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { payoutService } = getPayoutServices(c);
    const { batch, items } = await payoutService.createBatch({
      organizationId: orgId,
      orderIds: parsed.data.orderIds,
      bankAccountId: parsed.data.bankAccountId,
    });
    return c.json({ batch, items }, 201);
  });

  app.get('/api/v1/class/payouts/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutRepo } = getPayoutServices(c);
    const batch = await payoutRepo.getBatchById(orgId, c.req.param('id'));
    if (!batch) throw new DomainError('NOT_FOUND', 'Batch pencairan tidak ditemukan');
    const items = await payoutRepo.listBatchItems(batch.id);
    return c.json({ batch, items }, 200);
  });

  app.post('/api/v1/class/payouts/:id/submit', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutService } = getPayoutServices(c);
    const batch = await payoutService.submitBatch({ organizationId: orgId, batchId: c.req.param('id') });
    return c.json({ batch }, 200);
  });

  app.post('/api/v1/class/payouts/:id/mark-paid', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = MarkPayoutPaidRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { payoutService } = getPayoutServices(c);
    const batch = await payoutService.markPaid({ organizationId: orgId, batchId: c.req.param('id'), proofUrl: parsed.data.proofUrl });
    return c.json({ batch }, 200);
  });

  app.post('/api/v1/class/payouts/:id/fail', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { payoutService } = getPayoutServices(c);
    const batch = await payoutService.markFailed({ organizationId: orgId, batchId: c.req.param('id') });
    return c.json({ batch }, 200);
  });

  app.get('/api/v1/class/bank-accounts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { bankRepo } = getPayoutServices(c);
    const accounts = await bankRepo.list(orgId);
    return c.json({ accounts }, 200);
  });

  app.post('/api/v1/class/bank-accounts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = CreateBankAccountRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { bankRepo } = getPayoutServices(c);
    const account = await bankRepo.create(orgId, parsed.data);
    return c.json({ account }, 201);
  });

  app.patch('/api/v1/class/bank-accounts/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = UpdateBankAccountRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { bankRepo } = getPayoutServices(c);
    const account = await bankRepo.update(orgId, c.req.param('id'), parsed.data);
    if (!account) throw new DomainError('NOT_FOUND', 'Rekening tidak ditemukan');
    return c.json({ account }, 200);
  });

  app.delete('/api/v1/class/bank-accounts/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const orgId = requireOrgId(c);
    const { bankRepo } = getPayoutServices(c);
    const account = await bankRepo.remove(orgId, c.req.param('id'));
    if (!account) throw new DomainError('NOT_FOUND', 'Rekening tidak ditemukan');
    return c.json({ success: true }, 200);
  });
}
