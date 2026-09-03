import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createCommerceService,
  validateReturnUrl,
  MANUAL_BANK_ENABLED,
} from '../services/commerce/commerce-service';
import { DomainError } from '../core/errors';

describe('Talira Commercial Engine — CommerceService & Webhook Engine', () => {
  const configuredAppUuid = '11111111-2222-3333-4444-555555555555';

  const mockOrg = {
    id: 'org-commerce-1',
    slug: 'demo-promotor',
    name: 'Demo Promotor Org',
    timezone: 'Asia/Jakarta',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const mockPaidProgram = {
    id: 'prog-paid-1',
    organizationId: 'org-commerce-1',
    workspaceSlug: 'demo-promotor',
    programSlug: 'kelas-bicara-berbayar',
    title: 'Kelas Bicara Berbayar',
    subtitle: 'Paid speaking class',
    description: 'Deskripsi',
    programType: 'paid' as const,
    accessType: 'public' as const,
    status: 'published' as const,
    pricing: 'one_time' as const,
    priceAmount: 149000,
    modules: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  function createMockRepoState() {
    const webhookEvents: Map<string, any> = new Map();
    let feeCount = 0;
    let enrollCount = 0;

    const mockCommerceRepo: any = {
      recordWebhookEvent: async (ev: any) => {
        const key = `${ev.provider}:${ev.providerEventId}`;
        if (webhookEvents.has(key)) {
          return { isNew: false, event: webhookEvents.get(key) };
        }
        const saved = { ...ev, processedAt: null };
        webhookEvents.set(key, saved);
        return { isNew: true, event: saved };
      },
      updateWebhookEventResult: async (provider: string, id: string, res: string) => {
        const key = `${provider}:${id}`;
        const existing = webhookEvents.get(key);
        if (existing) {
          existing.processingResult = res;
        }
      },
      createOrder: async (data: any) => ({
        id: `order-${Date.now()}`,
        ...data,
      }),
      getOrderById: async () => null,
      getOrderByReference: async () => null,
      getOrderByProviderOrderId: async () => null,
      updateOrderStatus: async (_id: string, _status: string, extra?: any) => ({ ...extra }),
      createPaymentRecord: async (data: any) => ({ id: 'payrec-1', ...data }),
      getPaymentRecordByProviderId: async () => ({ id: 'payrec-1', status: 'PENDING' }),
      updatePaymentRecordStatus: async () => ({}),
      createPlatformFeeEntry: async (entry: any) => {
        feeCount++;
        return entry;
      },
      listOrders: async () => ({ orders: [], total: 0 }),
    };

    const mockEnrollmentService: any = {
      enrollContactAndIssueAccess: async () => {
        enrollCount++;
        return {
          enrollment: { id: 'enr-buyer-1' },
          accessToken: 'test-token-12345',
          isNewEnrollment: true,
        };
      },
    };

    return { mockCommerceRepo, mockEnrollmentService, getFeeCount: () => feeCount, getEnrollCount: () => enrollCount };
  }

  it('createProgramCheckout blocks organizations on FREE plan from selling paid programs', async () => {
    const mockOrgRepo: any = {
      findBySlug: async () => mockOrg,
    };
    const mockProgramRepo: any = {
      findBySlug: async () => mockPaidProgram,
    };
    const mockPlanAccessService: any = {
      assertCanUsePaidPrograms: async () => {
        throw new DomainError('FEATURE_REQUIRES_UPGRADE', 'Fitur kelas berbayar membutuhkan paket Solo');
      },
    };

    const service = createCommerceService({
      commerceRepo: {} as any,
      subscriptionRepo: {} as any,
      planAccessService: mockPlanAccessService,
      paycoreClient: {} as any,
      programRepo: mockProgramRepo,
      contactRepo: {} as any,
      orgRepo: mockOrgRepo,
      enrollmentService: {} as any,
      learningEventRepo: {} as any,
    });

    await assert.rejects(
      async () =>
        service.createProgramCheckout('demo-promotor', 'kelas-bicara-berbayar', {
          name: 'Calon Pembeli',
          phone: '081234567890',
          sourceChannel: 'STOREFRONT',
        }),
      (err: any) => {
        assert.ok(err instanceof DomainError);
        assert.strictEqual(err.code, 'FEATURE_REQUIRES_UPGRADE');
        return true;
      }
    );
  });

  it('createProgramCheckout creates pending order and calls Paycore with server-authoritative price', async () => {
    let orderCreated: any = null;
    let paymentRecCreated: any = null;
    let paycoreInput: any = null;

    const mockOrgRepo: any = {
      findBySlug: async () => mockOrg,
    };
    const mockProgramRepo: any = {
      findBySlug: async () => mockPaidProgram,
    };
    const mockPlanAccessService: any = {
      assertCanUsePaidPrograms: async () => {},
    };
    const mockContactRepo: any = {
      matchOrCreate: async () => ({
        id: 'contact-buyer-1',
        organizationId: 'org-commerce-1',
        name: 'Budi Pembeli',
        phoneE164: '+6281234567890',
        email: 'budi@example.com',
      }),
    };
    const mockCommerceRepo: any = {
      createOrder: async (data: any) => {
        orderCreated = { id: 'order-123', ...data };
        return orderCreated;
      },
      createPaymentRecord: async (data: any) => {
        paymentRecCreated = { id: 'payrec-1', ...data };
        return paymentRecCreated;
      },
      updateOrderStatus: async () => orderCreated,
    };

    const mockPaycoreClient: any = {
      createOrder: async (input: any) => {
        paycoreInput = input;
        return {
          order_id: 'NAR-2026-ORDER1',
          external_order_id: input.externalOrderId,
          payment_status: 'PENDING',
          fulfillment_status: 'UNFULFILLED',
          provider: 'duitku',
          provider_variant: 'pop',
          payment_method: null,
          checkout_url: 'https://paycore.test/checkout/123',
          expires_at: '2026-09-02T00:00:00.000Z',
        };
      },
    };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: mockPlanAccessService,
      paycoreClient: mockPaycoreClient,
      programRepo: mockProgramRepo,
      contactRepo: mockContactRepo,
      orgRepo: mockOrgRepo,
      enrollmentService: {} as any,
      learningEventRepo: {} as any,
    });

    const res = await service.createProgramCheckout('demo-promotor', 'kelas-bicara-berbayar', {
      name: 'Budi Pembeli',
      phone: '081234567890',
      email: 'budi@example.com',
      sourceChannel: 'STOREFRONT',
    });

    assert.strictEqual(res.orderId, 'order-123');
    assert.strictEqual(res.amount, 149000);
    assert.strictEqual(res.checkoutUrl, 'https://paycore.test/checkout/123');
    assert.strictEqual(paycoreInput.amount, 149000, 'Must pass server authoritative amount to Paycore');
    assert.strictEqual(orderCreated.status, 'PENDING');
  });

  it('createProgramCheckout marks order as FAILED when Paycore throws', async () => {
    let orderUpdatedStatus: string | null = null;
    const mockOrgRepo: any = { findBySlug: async () => mockOrg };
    const mockProgramRepo: any = { findBySlug: async () => mockPaidProgram };
    const mockPlanAccessService: any = { assertCanUsePaidPrograms: async () => {} };
    const mockContactRepo: any = {
      matchOrCreate: async () => ({
        id: 'c1',
        organizationId: mockOrg.id,
        name: 'User',
        phoneE164: '+6281234567890',
      }),
    };
    const mockCommerceRepo: any = {
      createOrder: async (data: any) => ({ id: 'order-fail', ...data }),
      updateOrderStatus: async (_id: string, status: string) => {
        orderUpdatedStatus = status;
      },
    };
    const mockPaycoreClient: any = {
      createOrder: async () => {
        throw new Error('Paycore upstream timeout');
      },
    };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: mockPlanAccessService,
      paycoreClient: mockPaycoreClient,
      programRepo: mockProgramRepo,
      contactRepo: mockContactRepo,
      orgRepo: mockOrgRepo,
      enrollmentService: {} as any,
      learningEventRepo: {} as any,
    });

    await assert.rejects(
      async () =>
        service.createProgramCheckout('demo-promotor', 'kelas-bicara-berbayar', {
          name: 'User',
          phone: '081234567890',
          sourceChannel: 'STOREFRONT',
        }),
      (err: any) => {
        assert.ok(err instanceof DomainError);
        assert.strictEqual(err.code, 'PAYMENT_GATEWAY_ERROR');
        return true;
      }
    );

    assert.strictEqual(orderUpdatedStatus, 'FAILED', 'Order must be transitioned to FAILED on gateway error');
  });

  it('handlePaycoreWebhook for program purchase activates enrollment and creates flat Rp3.000 platform fee', async () => {
    const { mockCommerceRepo, mockEnrollmentService, getFeeCount, getEnrollCount } = createMockRepoState();

    const mockOrder: any = {
      id: 'order-123',
      organizationId: 'org-commerce-1',
      orderType: 'PROGRAM_PURCHASE',
      programId: 'prog-paid-1',
      contactId: 'contact-buyer-1',
      reference: 'TLR-8F4K2Q',
      amount: 149000,
      currency: 'IDR',
      sourceChannel: 'STOREFRONT',
      paymentMode: 'PAYCORE',
      status: 'PENDING',
      providerOrderId: 'NAR-2026-ORDER1',
      enrollmentId: null,
    };

    mockCommerceRepo.getOrderByReference = async () => mockOrder;
    mockCommerceRepo.getOrderByProviderOrderId = async () => mockOrder;

    const mockPaycoreClient: any = { verifyWebhook: () => true };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: {} as any,
      paycoreClient: mockPaycoreClient,
      programRepo: {} as any,
      contactRepo: {} as any,
      orgRepo: {} as any,
      enrollmentService: mockEnrollmentService,
      learningEventRepo: {} as any,
      appUuid: configuredAppUuid,
    });

    const timestamp = new Date().toISOString();
    const webhookPayload = JSON.stringify({
      event_id: 'evt_paid_123',
      event_type: 'payment.succeeded',
      occurred_at: timestamp,
      data: {
        order_id: 'NAR-2026-ORDER1',
        external_order_id: 'TLR-8F4K2Q',
        app_id: configuredAppUuid,
        provider: 'duitku',
        amount: 149000,
        currency: 'IDR',
        paid_at: timestamp,
      },
    });

    const result = await service.handlePaycoreWebhook(webhookPayload, timestamp, 'sha256=mock');
    assert.strictEqual(result.status, 'processed');
    assert.strictEqual(result.type, 'program_purchase');

    assert.strictEqual(getEnrollCount(), 1, 'Must invoke enrollment domain service');
    assert.strictEqual(getFeeCount(), 1, 'Must create platform fee entry');
  });

  it('handlePaycoreWebhook is strictly idempotent across 10 duplicate deliveries', async () => {
    const { mockCommerceRepo, mockEnrollmentService, getFeeCount, getEnrollCount } = createMockRepoState();

    const mockOrder: any = {
      id: 'order-123',
      organizationId: 'org-commerce-1',
      orderType: 'PROGRAM_PURCHASE',
      programId: 'prog-paid-1',
      contactId: 'contact-buyer-1',
      reference: 'TLR-8F4K2Q',
      amount: 149000,
      currency: 'IDR',
      sourceChannel: 'STOREFRONT',
      paymentMode: 'PAYCORE',
      status: 'PENDING',
      providerOrderId: 'NAR-2026-ORDER1',
      enrollmentId: null,
    };

    mockCommerceRepo.getOrderByReference = async () => mockOrder;
    mockCommerceRepo.getOrderByProviderOrderId = async () => mockOrder;
    mockCommerceRepo.updateOrderStatus = async (_id: string, status: string, extra: any) => {
      mockOrder.status = status;
      if (extra?.enrollmentId) mockOrder.enrollmentId = extra.enrollmentId;
      return mockOrder;
    };

    const mockPaycoreClient: any = { verifyWebhook: () => true };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: {} as any,
      paycoreClient: mockPaycoreClient,
      programRepo: {} as any,
      contactRepo: {} as any,
      orgRepo: {} as any,
      enrollmentService: mockEnrollmentService,
      learningEventRepo: {} as any,
      appUuid: configuredAppUuid,
    });

    const timestamp = new Date().toISOString();
    const webhookPayload = JSON.stringify({
      event_id: 'evt_paid_replay_10x',
      event_type: 'payment.succeeded',
      occurred_at: timestamp,
      data: {
        order_id: 'NAR-2026-ORDER1',
        external_order_id: 'TLR-8F4K2Q',
        app_id: configuredAppUuid,
        amount: 149000,
        currency: 'IDR',
        paid_at: timestamp,
      },
    });

    // Replay 10 times consecutively
    for (let i = 0; i < 10; i++) {
      const res = await service.handlePaycoreWebhook(webhookPayload, timestamp, 'sha256=mock');
      assert.strictEqual(res.status, 'processed');
    }

    assert.strictEqual(getEnrollCount(), 1, 'Must enroll exactly once across 10 deliveries');
    assert.strictEqual(getFeeCount(), 1, 'Must create platform fee exactly once across 10 deliveries');
  });

  it('handlePaycoreWebhook reconciles amount and currency strictly (rejects tampering)', async () => {
    const { mockCommerceRepo, mockEnrollmentService } = createMockRepoState();

    const mockOrder: any = {
      id: 'order-123',
      organizationId: 'org-commerce-1',
      orderType: 'PROGRAM_PURCHASE',
      programId: 'prog-paid-1',
      contactId: 'contact-buyer-1',
      reference: 'TLR-8F4K2Q',
      amount: 149000, // Real expected amount
      currency: 'IDR',
      status: 'PENDING',
      providerOrderId: 'NAR-123',
    };

    mockCommerceRepo.getOrderByReference = async () => mockOrder;
    const mockPaycoreClient: any = { verifyWebhook: () => true };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: {} as any,
      paycoreClient: mockPaycoreClient,
      programRepo: {} as any,
      contactRepo: {} as any,
      orgRepo: {} as any,
      enrollmentService: mockEnrollmentService,
      learningEventRepo: {} as any,
      appUuid: configuredAppUuid,
    });

    const timestamp = new Date().toISOString();

    // Mismatched amount payload
    const tamperedAmountPayload = JSON.stringify({
      event_id: 'evt_tampered_1',
      event_type: 'payment.succeeded',
      occurred_at: timestamp,
      data: {
        order_id: 'NAR-123',
        external_order_id: 'TLR-8F4K2Q',
        app_id: configuredAppUuid,
        amount: 1000, // Attacker manipulated amount
        currency: 'IDR',
      },
    });

    const res1 = await service.handlePaycoreWebhook(tamperedAmountPayload, timestamp, 'sha256=mock');
    assert.strictEqual(res1.status, 'reconciliation_failed');
    assert.strictEqual(res1.reason, 'amount_mismatch');

    // Mismatched currency payload
    const tamperedCurrencyPayload = JSON.stringify({
      event_id: 'evt_tampered_2',
      event_type: 'payment.succeeded',
      occurred_at: timestamp,
      data: {
        order_id: 'NAR-123',
        external_order_id: 'TLR-8F4K2Q',
        app_id: configuredAppUuid,
        amount: 149000,
        currency: 'USD',
      },
    });

    const res2 = await service.handlePaycoreWebhook(tamperedCurrencyPayload, timestamp, 'sha256=mock');
    assert.strictEqual(res2.status, 'reconciliation_failed');
    assert.strictEqual(res2.reason, 'currency_mismatch');
  });

  it('handlePaycoreWebhook for subscription replay 10 times NEVER extends or shifts period', async () => {
    const { mockCommerceRepo } = createMockRepoState();

    const mockSubOrder: any = {
      id: 'order-sub-1',
      organizationId: 'org-commerce-1',
      orderType: 'SUBSCRIPTION_PURCHASE',
      reference: 'SUB-ABCD12',
      amount: 149000,
      currency: 'IDR',
      status: 'PENDING',
      providerOrderId: 'NAR-SUB-999',
      metadata: JSON.stringify({ planCode: 'SOLO', billingCycle: 'MONTHLY' }),
    };

    mockCommerceRepo.getOrderByReference = async () => mockSubOrder;
    mockCommerceRepo.getOrderByProviderOrderId = async () => mockSubOrder;

    let subRecord: any = {
      planCode: 'FREE',
      status: 'ACTIVE',
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };

    const mockSubscriptionRepo: any = {
      getSubscription: async () => subRecord,
      updateSubscription: async (_orgId: string, data: any) => {
        subRecord = { ...subRecord, ...data };
        return subRecord;
      },
    };

    const mockPaycoreClient: any = { verifyWebhook: () => true };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: mockSubscriptionRepo,
      planAccessService: {} as any,
      paycoreClient: mockPaycoreClient,
      programRepo: {} as any,
      contactRepo: {} as any,
      orgRepo: {} as any,
      enrollmentService: {} as any,
      learningEventRepo: {} as any,
      appUuid: configuredAppUuid,
    });

    const timestamp = new Date().toISOString();
    const webhookPayload = JSON.stringify({
      event_id: 'evt_sub_replay_10x',
      event_type: 'payment.succeeded',
      occurred_at: timestamp,
      data: {
        order_id: 'NAR-SUB-999',
        external_order_id: 'SUB-ABCD12',
        app_id: configuredAppUuid,
        amount: 149000,
        currency: 'IDR',
        paid_at: timestamp,
      },
    });

    // Delivery 1: sets initial period
    const res1 = await service.handlePaycoreWebhook(webhookPayload, timestamp, 'sha256=mock');
    assert.strictEqual(res1.status, 'processed');
    const initialStart = subRecord.currentPeriodStart;
    const initialEnd = subRecord.currentPeriodEnd;
    assert.ok(initialStart);
    assert.ok(initialEnd);

    // Deliver 9 more times
    for (let i = 0; i < 9; i++) {
      await service.handlePaycoreWebhook(webhookPayload, timestamp, 'sha256=mock');
      assert.strictEqual(subRecord.currentPeriodStart, initialStart, 'currentPeriodStart must remain invariant on replay');
      assert.strictEqual(subRecord.currentPeriodEnd, initialEnd, 'currentPeriodEnd must remain invariant on replay');
    }
  });

  it('approveOrder rejects PAYCORE order with FORBIDDEN (P0-4 invariant)', async () => {
    const mockOrder: any = {
      id: 'order-paycore-pending',
      organizationId: 'org-commerce-1',
      paymentMode: 'PAYCORE',
      status: 'PENDING',
    };

    const mockCommerceRepo: any = {
      getOrderById: async () => mockOrder,
    };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: {} as any,
      paycoreClient: {} as any,
      programRepo: {} as any,
      contactRepo: {} as any,
      orgRepo: {} as any,
      enrollmentService: {} as any,
      learningEventRepo: {} as any,
    });

    await assert.rejects(
      async () => service.approveOrder('org-commerce-1', 'order-paycore-pending', 'user-admin'),
      (err: any) => {
        assert.ok(err instanceof DomainError);
        assert.strictEqual(err.code, 'FORBIDDEN');
        assert.match(err.message, /tidak dapat disetujui secara manual/);
        return true;
      }
    );
  });

  it('approveOrder rejects MANUAL_BANK when MANUAL_BANK_ENABLED is false (HELD)', async () => {
    assert.strictEqual(MANUAL_BANK_ENABLED, false, 'MANUAL_BANK_ENABLED must be false (HELD)');

    const mockOrder: any = {
      id: 'order-bank-pending',
      organizationId: 'org-commerce-1',
      paymentMode: 'MANUAL_BANK',
      status: 'PENDING',
    };

    const mockCommerceRepo: any = {
      getOrderById: async () => mockOrder,
    };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: {} as any,
      paycoreClient: {} as any,
      programRepo: {} as any,
      contactRepo: {} as any,
      orgRepo: {} as any,
      enrollmentService: {} as any,
      learningEventRepo: {} as any,
    });

    await assert.rejects(
      async () => service.approveOrder('org-commerce-1', 'order-bank-pending', 'user-admin'),
      (err: any) => {
        assert.ok(err instanceof DomainError);
        assert.strictEqual(err.code, 'FEATURE_DISABLED');
        assert.match(err.message, /saat ini dinonaktifkan/);
        return true;
      }
    );
  });

  it('claimOrderAccess verifies phone ownership and returns access token', async () => {
    const mockOrder: any = {
      id: 'order-paid',
      organizationId: 'org-commerce-1',
      programId: 'prog-paid-1',
      contactId: 'contact-buyer-1',
      reference: 'TLR-VALID1',
      status: 'PAID',
    };

    const mockContact: any = {
      id: 'contact-buyer-1',
      phoneE164: '+6281234567890',
    };

    const mockCommerceRepo: any = {
      getOrderByReference: async () => mockOrder,
    };
    const mockContactRepo: any = {
      findById: async () => mockContact,
    };
    const mockOrgRepo: any = { findBySlug: async () => mockOrg };
    const mockProgramRepo: any = { findBySlug: async () => mockPaidProgram };
    const mockEnrollmentService: any = {
      enrollContactAndIssueAccess: async () => ({
        enrollment: { id: 'enr-1' },
        accessToken: 'fresh-secret-token-xyz',
        isNewEnrollment: false,
      }),
    };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: {} as any,
      paycoreClient: {} as any,
      programRepo: mockProgramRepo,
      contactRepo: mockContactRepo,
      orgRepo: mockOrgRepo,
      enrollmentService: mockEnrollmentService,
      learningEventRepo: {} as any,
    });

    // Claim with matching phone
    const res = await service.claimOrderAccess('demo-promotor', 'kelas-bicara-berbayar', 'TLR-VALID1', '081234567890');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.accessToken, 'fresh-secret-token-xyz');

    // Claim with incorrect phone -> rejected
    await assert.rejects(
      async () =>
        service.claimOrderAccess('demo-promotor', 'kelas-bicara-berbayar', 'TLR-VALID1', '089999999999'),
      (err: any) => {
        assert.ok(err instanceof DomainError);
        assert.strictEqual(err.code, 'UNAUTHORIZED');
        return true;
      }
    );
  });

  it('validateReturnUrl sanitizes safe URLs and rejects dangerous ones', () => {
    assert.strictEqual(validateReturnUrl(undefined), undefined);
    assert.strictEqual(
      validateReturnUrl('https://promotor.id/order/status'),
      'https://promotor.id/order/status'
    );
    assert.strictEqual(
      validateReturnUrl('https://stiffin-promotor-class.moxsenna.workers.dev/p/demo/pesanan/123'),
      'https://stiffin-promotor-class.moxsenna.workers.dev/p/demo/pesanan/123'
    );
    assert.strictEqual(
      validateReturnUrl('http://localhost:3000/orders/TLR-123'),
      'http://localhost:3000/orders/TLR-123'
    );
    assert.throws(() => validateReturnUrl('javascript:alert(1)'), /Protokol returnUrl harus HTTP atau HTTPS/);
    assert.throws(() => validateReturnUrl('data:text/html,evil'), /Protokol returnUrl harus HTTP atau HTTPS/);
    assert.throws(() => validateReturnUrl('https://evil.com\\@good.com'), /Format returnUrl tidak valid/);
    assert.throws(() => validateReturnUrl('//evil.com'), /Format returnUrl tidak valid/);
    assert.throws(
      () => validateReturnUrl('https://malicious-phishing-site.com/steal-creds'),
      /Domain returnUrl tidak diizinkan/
    );
    assert.throws(
      () => validateReturnUrl('https://other.promotor.id/return', 'expected.promotor.id'),
      /Domain returnUrl tidak diizinkan/
    );
  });
});
