import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import {
  PublicPaidCheckoutRequestSchema,
  CreateSubscriptionCheckoutRequestSchema,
  ListOrdersQuerySchema,
  RejectOrderRequestSchema,
} from '@promotor/contracts';
import { createCommerceRepository } from '../repositories/commerce-repository';
import { createSubscriptionRepository } from '../repositories/subscription-repository';
import { createPlanAccessService } from '../services/billing/plan-access-service';
import { createPaycoreClient } from '../services/paycore/paycore-client';
import { createCommerceService } from '../services/commerce/commerce-service';
import { createProgramRepository } from '../repositories/program-repository';
import { createContactRepository } from '../repositories/contact-repository';
import { createOrganizationRepository } from '../repositories/organization-repository';
import { createEnrollmentService } from '../services/class/enrollment-service';
import { createLearningEventRepository } from '../repositories/learning-event-repository';
import { createEntitlementRepository } from '../repositories/entitlement-repository';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';

function getCommerceServices(c: any) {
  const db = c.get('db');
  const env = c.env || {};

  const commerceRepo = createCommerceRepository(db);
  const subscriptionRepo = createSubscriptionRepository(db);
  const planAccessService = createPlanAccessService(subscriptionRepo);

  const paycoreClient = createPaycoreClient({
    baseUrl: env.PAYCORE_BASE_URL || 'http://localhost:8787',
    appUuid: env.PAYCORE_APP_UUID || '00000000-0000-0000-0000-000000000000',
    keyId: env.PAYCORE_KEY_ID || 'key_default',
    appSecret: env.PAYCORE_APP_SECRET || 'secret_default',
    webhookSecret: env.PAYCORE_WEBHOOK_SECRET || 'whsec_default',
  });

  const programRepo = createProgramRepository(db);
  const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
  const orgRepo = createOrganizationRepository(db);
  const enrollmentService = createEnrollmentService(db);
  const learningEventRepo = createLearningEventRepository(db);

  const commerceService = createCommerceService({
    commerceRepo,
    subscriptionRepo,
    planAccessService,
    paycoreClient,
    programRepo,
    contactRepo,
    orgRepo,
    enrollmentService,
    learningEventRepo,
  });

  return {
    commerceRepo,
    subscriptionRepo,
    planAccessService,
    paycoreClient,
    commerceService,
  };
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
  // 2. Public Paid Checkout & Order Status
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
    return c.json(planAccess, 200);
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
}
