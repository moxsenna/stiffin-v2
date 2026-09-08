import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCommerceService } from '../services/commerce/commerce-service';
import {
  CreatePriceVariantRequestSchema,
  UpdatePriceVariantRequestSchema,
  ProgramPriceVariantSchema,
  PublicPaidCheckoutRequestSchema,
} from '@promotor/contracts';

describe('B7 — Price Variants Contracts & Schemas', () => {
  it('validates CreatePriceVariantRequestSchema correctly', () => {
    const valid = {
      label: 'Paket Komplit',
      description: 'Termasuk sesi tanya jawab 1-on-1',
      priceAmount: 450000,
      isDefault: true,
      sortOrder: 1,
    };
    const parsed = CreatePriceVariantRequestSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.label, 'Paket Komplit');
      assert.equal(parsed.data.priceAmount, 450000);
      assert.equal(parsed.data.isDefault, true);
    }
  });

  it('rejects invalid inputs on CreatePriceVariantRequestSchema', () => {
    // empty label
    const invalidLabel = CreatePriceVariantRequestSchema.safeParse({
      label: '',
      priceAmount: 100000,
    });
    assert.equal(invalidLabel.success, false);

    // negative price
    const invalidPrice = CreatePriceVariantRequestSchema.safeParse({
      label: 'Paket Minus',
      priceAmount: -5000,
    });
    assert.equal(invalidPrice.success, false);
  });

  it('validates UpdatePriceVariantRequestSchema partial updates', () => {
    const partial = UpdatePriceVariantRequestSchema.safeParse({
      priceAmount: 550000,
    });
    assert.equal(partial.success, true);
    if (partial.success) {
      assert.equal(partial.data.priceAmount, 550000);
      assert.equal(partial.data.label, undefined);
    }
  });

  it('validates ProgramPriceVariantSchema', () => {
    const variant = {
      id: 'a0000000-0000-4000-8000-000000000001',
      programId: 'b0000000-0000-4000-8000-000000000002',
      label: 'Reguler',
      description: null,
      priceAmount: 150000,
      isDefault: false,
      sortOrder: 0,
      createdAt: '2026-09-08T10:00:00.000Z',
      updatedAt: '2026-09-08T10:00:00.000Z',
    };
    const parsed = ProgramPriceVariantSchema.safeParse(variant);
    assert.equal(parsed.success, true);
  });

  it('validates PublicPaidCheckoutRequestSchema with optional variantId', () => {
    const withVariant = {
      name: 'Budi Santoso',
      phone: '+6281234567890',
      email: 'budi@example.com',
      sourceChannel: 'STOREFRONT',
      variantId: 'a0000000-0000-4000-8000-000000000001',
    };
    const parsed = PublicPaidCheckoutRequestSchema.safeParse(withVariant);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal((parsed.data as any).variantId, 'a0000000-0000-4000-8000-000000000001');
    }

    const invalidVariant = {
      name: 'Budi Santoso',
      phone: '+6281234567890',
      variantId: 'not-a-uuid',
    };
    const parsedInvalid = PublicPaidCheckoutRequestSchema.safeParse(invalidVariant);
    assert.equal(parsedInvalid.success, false);
  });
});

describe('B7 — Commerce Checkout with Price Variants', () => {
  const mockOrg = {
    id: 'org-commerce-1',
    slug: 'demo-promotor',
    name: 'Demo Promotor',
  };

  const mockProgram = {
    id: 'prog-paid-1',
    organizationId: 'org-commerce-1',
    programSlug: 'kelas-bicara',
    title: 'Kelas Bicara',
    status: 'published',
    accessType: 'public',
    pricing: 'one_time',
    priceAmount: 149000,
  };

  function setupCommerceService(variantFixture?: any) {
    let createdOrder: any = null;
    let paycoreOrderPayload: any = null;

    const mockPriceVariantRepo: any = {
      findByIdAndProgram: async (orgId: string, progId: string, varId: string) => {
        if (variantFixture && variantFixture.id === varId) {
          return variantFixture;
        }
        return null;
      },
    };

    const service = createCommerceService({
      commerceRepo: {
        createOrder: async (data: any) => {
          createdOrder = { id: 'order-uuid-1', ...data };
          return createdOrder;
        },
        createPaymentRecord: async (data: any) => ({
          id: 'payrec-uuid-1',
          ...data,
        }),
        updateOrderStatus: async (id: string, status: string, extra?: any) => {
          if (createdOrder) {
            createdOrder.status = status;
            Object.assign(createdOrder, extra);
          }
          return createdOrder;
        },
      } as any,
      subscriptionRepo: {} as any,
      planAccessService: {
        assertCanUsePaidPrograms: async () => {},
      } as any,
      paycoreClient: {
        createOrder: async (payload: any) => {
          paycoreOrderPayload = payload;
          return {
            order_id: 'paycore-order-1',
            external_order_id: payload.externalOrderId,
            checkout_url: 'https://pay.example.com/pay',
            expires_at: '2026-09-08T12:00:00.000Z',
          };
        },
      } as any,
      programRepo: {
        findBySlug: async () => mockProgram,
      } as any,
      priceVariantRepo: mockPriceVariantRepo,
      contactRepo: {
        matchOrCreate: async () => ({
          id: 'contact-1',
          name: 'Budi Santoso',
          phoneE164: '+6281234567890',
        }),
      } as any,
      orgRepo: {
        findBySlug: async () => mockOrg,
      } as any,
      enrollmentService: {} as any,
      learningEventRepo: {} as any,
      appEnv: 'production',
      allowedReturnHosts: ['example.com'],
    });

    return {
      service,
      getCreatedOrder: () => createdOrder,
      getPaycoreOrderPayload: () => paycoreOrderPayload,
    };
  }

  it('checkout without variantId uses standard program price', async () => {
    const { service, getCreatedOrder, getPaycoreOrderPayload } = setupCommerceService();

    const res = await service.createProgramCheckout('demo-promotor', 'kelas-bicara', {
      name: 'Budi Santoso',
      phone: '+6281234567890',
      returnUrl: 'https://example.com/thankyou',
      sourceChannel: 'STOREFRONT',
    });

    assert.equal(res.amount, 149000);
    assert.equal(getCreatedOrder().amount, 149000);
    assert.equal(getCreatedOrder().metadata, null);
    assert.equal(getPaycoreOrderPayload().amount, 149000);
    assert.equal(getPaycoreOrderPayload().description, 'Kelas: Kelas Bicara');
  });

  it('checkout with valid variantId uses variant price and attaches metadata', async () => {
    const validVariant = {
      id: 'a0000000-0000-4000-8000-000000000001',
      programId: 'prog-paid-1',
      label: 'Kelas + Konsultasi 1-on-1',
      priceAmount: 499000,
    };
    const { service, getCreatedOrder, getPaycoreOrderPayload } = setupCommerceService(validVariant);

    const res = await service.createProgramCheckout('demo-promotor', 'kelas-bicara', {
      name: 'Budi Santoso',
      phone: '+6281234567890',
      returnUrl: 'https://example.com/thankyou',
      sourceChannel: 'STOREFRONT',
      variantId: 'a0000000-0000-4000-8000-000000000001',
    });

    assert.equal(res.amount, 499000);
    assert.equal(getCreatedOrder().amount, 499000);
    assert.ok(getCreatedOrder().metadata);
    const parsedMeta = JSON.parse(getCreatedOrder().metadata);
    assert.equal(parsedMeta.variantId, 'a0000000-0000-4000-8000-000000000001');
    assert.equal(parsedMeta.variantLabel, 'Kelas + Konsultasi 1-on-1');

    assert.equal(getPaycoreOrderPayload().amount, 499000);
    assert.equal(getPaycoreOrderPayload().description, 'Kelas: Kelas Bicara (Kelas + Konsultasi 1-on-1)');
    assert.equal(getPaycoreOrderPayload().fulfillmentData.variantId, 'a0000000-0000-4000-8000-000000000001');
  });

  it('checkout with variantId belonging to another program or not found throws VARIANT_NOT_FOUND', async () => {
    const foreignVariant = {
      id: 'a0000000-0000-4000-8000-000000000002',
      programId: 'another-program-id',
      label: 'Other Class Variant',
      priceAmount: 299000,
    };
    const { service } = setupCommerceService(foreignVariant);

    await assert.rejects(
      async () => {
        await service.createProgramCheckout('demo-promotor', 'kelas-bicara', {
          name: 'Budi Santoso',
          phone: '+6281234567890',
          returnUrl: 'https://example.com/thankyou',
          sourceChannel: 'STOREFRONT',
          variantId: 'a0000000-0000-4000-8000-000000000002',
        });
      },
      (err: any) => {
        assert.equal(err.code, 'VARIANT_NOT_FOUND');
        return true;
      }
    );

    // Completely unknown variantId
    await assert.rejects(
      async () => {
        await service.createProgramCheckout('demo-promotor', 'kelas-bicara', {
          name: 'Budi Santoso',
          phone: '+6281234567890',
          returnUrl: 'https://example.com/thankyou',
          sourceChannel: 'STOREFRONT',
          variantId: 'a0000000-0000-4000-8000-000000000099',
        });
      },
      (err: any) => {
        assert.equal(err.code, 'VARIANT_NOT_FOUND');
        return true;
      }
    );
  });
});
