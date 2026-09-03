import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createCommerceService } from '../services/commerce/commerce-service';
import { DomainError } from '../core/errors';
import { buildPaycoreWebhookSignature } from '../services/paycore/paycore-client';

describe('Talira Commercial Engine — CommerceService & Webhook Engine', () => {
  const webhookSecret = 'whsec_test_secret_key';

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
        paymentRecCreated = { id: 'payrec-123', ...data };
        return paymentRecCreated;
      },
      updateOrderStatus: async () => ({}),
    };
    const mockPaycoreClient: any = {
      createOrder: async (input: any) => {
        paycoreInput = input;
        return {
          order_id: 'NAR-2026-ORDER1',
          external_order_id: input.externalOrderId,
          payment_status: 'pending',
          fulfillment_status: 'pending',
          provider: 'duitku',
          provider_variant: 'pop',
          payment_method: null,
          checkout_url: 'https://sandbox.duitku.com/pop/checkout',
          expires_at: '2026-09-04T00:00:00.000Z',
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

    assert.strictEqual(res.amount, 149000);
    assert.strictEqual(res.currency, 'IDR');
    assert.strictEqual(res.checkoutUrl, 'https://sandbox.duitku.com/pop/checkout');
    assert.strictEqual(paycoreInput.amount, 149000, 'Must pass server authoritative amount to Paycore');
    assert.strictEqual(orderCreated.status, 'PENDING');
  });

  it('handlePaycoreWebhook for program purchase activates enrollment and creates flat Rp3.000 platform fee', async () => {
    let enrolledContact = false;
    let eventCreated: any = null;
    let feeCreated: any = null;
    let orderStatusUpdated = false;

    const mockOrder: any = {
      id: 'order-123',
      organizationId: 'org-commerce-1',
      programId: 'prog-paid-1',
      contactId: 'contact-buyer-1',
      reference: 'TLR-8F4K2Q',
      amount: 149000,
      currency: 'IDR',
      sourceChannel: 'STOREFRONT',
      paymentMode: 'PAYCORE',
      status: 'PENDING',
      enrollmentId: null,
    };

    const mockCommerceRepo: any = {
      getOrderByReference: async (ref: string) => (ref === 'TLR-8F4K2Q' ? mockOrder : null),
      getOrderById: async () => mockOrder,
      getPaymentRecordByProviderId: async () => ({ id: 'payrec-1', status: 'PENDING' }),
      updatePaymentRecordStatus: async () => ({}),
      updateOrderStatus: async (_id: string, status: string, extra: any) => {
        orderStatusUpdated = true;
        mockOrder.status = status;
        mockOrder.enrollmentId = extra?.enrollmentId || mockOrder.enrollmentId;
        return mockOrder;
      },
      createPlatformFeeEntry: async (entry: any) => {
        feeCreated = entry;
        return entry;
      },
    };

    const mockEnrollmentService: any = {
      enrollContact: async () => {
        enrolledContact = true;
        return { id: 'enr-buyer-1' };
      },
    };

    const mockLearningEventRepo: any = {
      create: async (evt: any) => {
        eventCreated = evt;
        return evt;
      },
    };

    const mockPaycoreClient: any = {
      verifyWebhook: () => true,
    };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: {} as any,
      paycoreClient: mockPaycoreClient,
      programRepo: {} as any,
      contactRepo: {} as any,
      orgRepo: {} as any,
      enrollmentService: mockEnrollmentService,
      learningEventRepo: mockLearningEventRepo,
    });

    const timestamp = new Date().toISOString();
    const webhookPayload = JSON.stringify({
      event_id: 'evt_paid_123',
      event_type: 'payment.succeeded',
      occurred_at: timestamp,
      data: {
        order_id: 'NAR-2026-ORDER1',
        external_order_id: 'TLR-8F4K2Q',
        app_id: 'talira',
        provider: 'duitku',
        amount: 149000,
        currency: 'IDR',
        paid_at: timestamp,
        fulfillment_data: {
          type: 'PROGRAM_PURCHASE',
          orderId: 'order-123',
        },
      },
    });

    const result = await service.handlePaycoreWebhook(webhookPayload, timestamp, 'sha256=mock');
    assert.strictEqual(result.status, 'processed');
    assert.strictEqual(result.type, 'program_purchase');

    assert.strictEqual(enrolledContact, true, 'Contact must be enrolled in program');
    assert.strictEqual(orderStatusUpdated, true, 'Order status must be updated to PAID');
    assert.strictEqual(eventCreated?.eventType, 'learner.enrolled');
    assert.strictEqual(feeCreated?.amount, 3000, 'Platform fee must be flat Rp3.000');
    assert.strictEqual(feeCreated?.currency, 'IDR');
    assert.strictEqual(feeCreated?.status, 'BILLABLE');
  });

  it('handlePaycoreWebhook is strictly idempotent across 5 duplicate deliveries', async () => {
    let enrollCount = 0;
    let eventCount = 0;
    let feeCount = 0;

    const mockOrder: any = {
      id: 'order-123',
      organizationId: 'org-commerce-1',
      programId: 'prog-paid-1',
      contactId: 'contact-buyer-1',
      reference: 'TLR-8F4K2Q',
      amount: 149000,
      currency: 'IDR',
      sourceChannel: 'STOREFRONT',
      paymentMode: 'PAYCORE',
      status: 'PENDING',
      enrollmentId: null,
    };

    const mockCommerceRepo: any = {
      getOrderByReference: async () => mockOrder,
      getPaymentRecordByProviderId: async () => null,
      updatePaymentRecordStatus: async () => ({}),
      updateOrderStatus: async (_id: string, status: string, extra: any) => {
        mockOrder.status = status;
        if (extra?.enrollmentId) mockOrder.enrollmentId = extra.enrollmentId;
        return mockOrder;
      },
      createPlatformFeeEntry: async () => {
        feeCount++;
        return {};
      },
    };

    const mockEnrollmentService: any = {
      enrollContact: async () => {
        enrollCount++;
        return { id: 'enr-buyer-1' };
      },
    };

    const mockLearningEventRepo: any = {
      create: async () => {
        eventCount++;
      },
    };

    const mockPaycoreClient: any = {
      verifyWebhook: () => true,
    };

    const service = createCommerceService({
      commerceRepo: mockCommerceRepo,
      subscriptionRepo: {} as any,
      planAccessService: {} as any,
      paycoreClient: mockPaycoreClient,
      programRepo: {} as any,
      contactRepo: {} as any,
      orgRepo: {} as any,
      enrollmentService: mockEnrollmentService,
      learningEventRepo: mockLearningEventRepo,
    });

    const timestamp = new Date().toISOString();
    const webhookPayload = JSON.stringify({
      event_id: 'evt_paid_123',
      event_type: 'payment.succeeded',
      occurred_at: timestamp,
      data: {
        order_id: 'NAR-2026-ORDER1',
        external_order_id: 'TLR-8F4K2Q',
        amount: 149000,
        currency: 'IDR',
        paid_at: timestamp,
        fulfillment_data: { type: 'PROGRAM_PURCHASE' },
      },
    });

    // Replay 5 times
    for (let i = 0; i < 5; i++) {
      await service.handlePaycoreWebhook(webhookPayload, timestamp, 'sha256=mock');
    }

    assert.strictEqual(enrollCount, 1, 'Must enroll exactly once');
    assert.strictEqual(eventCount, 1, 'Must emit learner.enrolled exactly once');
    assert.strictEqual(feeCount, 1, 'Must create platform fee entry exactly once');
  });

  it('handlePaycoreWebhook for subscription purchase upgrades organization to SOLO plan', async () => {
    let updatedSub: any = null;

    const mockSubscriptionRepo: any = {
      updateSubscription: async (_orgId: string, data: any) => {
        updatedSub = data;
        return data;
      },
    };

    const mockPaycoreClient: any = {
      verifyWebhook: () => true,
    };

    const service = createCommerceService({
      commerceRepo: {} as any,
      subscriptionRepo: mockSubscriptionRepo,
      planAccessService: {} as any,
      paycoreClient: mockPaycoreClient,
      programRepo: {} as any,
      contactRepo: {} as any,
      orgRepo: {} as any,
      enrollmentService: {} as any,
      learningEventRepo: {} as any,
    });

    const timestamp = new Date().toISOString();
    const webhookPayload = JSON.stringify({
      event_id: 'evt_sub_123',
      event_type: 'payment.succeeded',
      occurred_at: timestamp,
      data: {
        order_id: 'NAR-SUB-999',
        external_order_id: 'SUB-ABCD12',
        amount: 149000,
        currency: 'IDR',
        paid_at: timestamp,
        fulfillment_data: {
          type: 'SUBSCRIPTION_PURCHASE',
          organizationId: 'org-commerce-1',
          planCode: 'SOLO',
          billingCycle: 'MONTHLY',
        },
      },
    });

    const res = await service.handlePaycoreWebhook(webhookPayload, timestamp, 'sha256=mock');
    assert.strictEqual(res.status, 'processed');
    assert.strictEqual(res.type, 'subscription');

    assert.strictEqual(updatedSub.planCode, 'SOLO');
    assert.strictEqual(updatedSub.status, 'ACTIVE');
    assert.strictEqual(updatedSub.billingCycle, 'MONTHLY');
    assert.strictEqual(updatedSub.provider, 'PAYCORE');
    assert.ok(updatedSub.currentPeriodStart);
    assert.ok(updatedSub.currentPeriodEnd);
  });
});
