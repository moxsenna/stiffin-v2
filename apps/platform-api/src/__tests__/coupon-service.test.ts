import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCouponService } from '../services/commerce/coupon-service';

const now = new Date('2026-09-08T10:00:00.000Z');

function makeDeps(couponFixture: any = null) {
  const mockRepo = {
    async findByCode(_orgId: string, code: string) {
      if (couponFixture && couponFixture.code === code) return couponFixture;
      return null;
    },
    async list(_orgId: string) {
      return couponFixture ? [couponFixture] : [];
    },
    async create(data: any) {
      return { id: 'coupon-uuid-1', ...data, usedCount: 0, createdAt: now.toISOString(), updatedAt: now.toISOString() };
    },
    async update(_orgId: string, id: string, patch: any) {
      return { ...couponFixture, ...patch, id };
    },
    async incrementUsedCount(_orgId: string, _id: string) {
      if (couponFixture) couponFixture.usedCount += 1;
      return couponFixture;
    },
  };
  return {
    couponRepo: mockRepo,
    clock: () => now,
  };
}

const BASE_COUPON = {
  id: 'c0000000-0000-4000-8000-000000000001',
  organizationId: 'o0000000-0000-4000-8000-000000000001',
  code: 'HEMAT50',
  discountType: 'FIXED' as const,
  discountValue: 50000,
  programId: null,
  maxRedemptions: null,
  usedCount: 0,
  expiresAt: null,
  isActive: true,
};

describe('B8 — coupon-service.validateForProgram', () => {
  it('kupon FIXED menghitung diskon dan final amount dengan benar', () => {
    const deps = makeDeps(BASE_COUPON);
    const service = createCouponService({} as any, deps);
    const result = service.validateForProgram({
      coupon: BASE_COUPON,
      programId: 'p0000000-0000-4000-8000-000000000001',
      listPrice: 249000,
      now,
    });
    assert.deepEqual(result, {
      valid: true,
      discountAmount: 50000,
      finalAmount: 199000,
      message: 'Kode HEMAT50 berhasil diterapkan',
    });
  });

  it('kupon PERCENT menghitung potongan persentase dan membulatkan ke bawah', () => {
    const percentCoupon = {
      ...BASE_COUPON,
      code: 'DISKON30',
      discountType: 'PERCENT' as const,
      discountValue: 30,
    };
    const deps = makeDeps(percentCoupon);
    const service = createCouponService({} as any, deps);
    const result = service.validateForProgram({
      coupon: percentCoupon,
      programId: 'p0000000-0000-4000-8000-000000000001',
      listPrice: 299000,
      now,
    });
    // 30% dari 299.000 = 89.700
    assert.equal(result.valid, true);
    assert.equal(result.discountAmount, 89700);
    assert.equal(result.finalAmount, 209300);
  });

  it('kupon PERCENT 100% menghasilkan finalAmount 0 (gratis)', () => {
    const freeCoupon = {
      ...BASE_COUPON,
      code: 'GRATIS100',
      discountType: 'PERCENT' as const,
      discountValue: 100,
    };
    const deps = makeDeps(freeCoupon);
    const service = createCouponService({} as any, deps);
    const result = service.validateForProgram({
      coupon: freeCoupon,
      programId: 'p0000000-0000-4000-8000-000000000001',
      listPrice: 150000,
      now,
    });
    assert.equal(result.valid, true);
    assert.equal(result.discountAmount, 150000);
    assert.equal(result.finalAmount, 0);
  });

  it('diskon FIXED lebih besar dari harga menghasilkan finalAmount 0 (tidak pernah negatif)', () => {
    const bigCoupon = {
      ...BASE_COUPON,
      discountValue: 500000,
    };
    const deps = makeDeps(bigCoupon);
    const service = createCouponService({} as any, deps);
    const result = service.validateForProgram({
      coupon: bigCoupon,
      programId: 'p0000000-0000-4000-8000-000000000001',
      listPrice: 149000,
      now,
    });
    assert.equal(result.valid, true);
    assert.equal(result.discountAmount, 149000);
    assert.equal(result.finalAmount, 0);
  });

  it('kupon non-aktif ditolak', () => {
    const deps = makeDeps();
    const service = createCouponService({} as any, deps);
    const result = service.validateForProgram({
      coupon: { ...BASE_COUPON, isActive: false },
      programId: 'p0000000-0000-4000-8000-000000000001',
      listPrice: 200000,
      now,
    });
    assert.equal(result.valid, false);
    assert.equal(result.discountAmount, 0);
    assert.equal(result.finalAmount, 200000);
    assert.match(result.message, /tidak aktif/i);
  });

  it('kupon kedaluwarsa ditolak', () => {
    const deps = makeDeps();
    const service = createCouponService({} as any, deps);
    const result = service.validateForProgram({
      coupon: { ...BASE_COUPON, expiresAt: '2026-09-01T00:00:00.000Z' },
      programId: 'p0000000-0000-4000-8000-000000000001',
      listPrice: 200000,
      now,
    });
    assert.equal(result.valid, false);
    assert.match(result.message, /kedaluwarsa/i);
  });

  it('kupon yang kuotanya habis ditolak', () => {
    const deps = makeDeps();
    const service = createCouponService({} as any, deps);
    const result = service.validateForProgram({
      coupon: { ...BASE_COUPON, maxRedemptions: 10, usedCount: 10 },
      programId: 'p0000000-0000-4000-8000-000000000001',
      listPrice: 200000,
      now,
    });
    assert.equal(result.valid, false);
    assert.match(result.message, /habis/i);
  });

  it('kupon khusus program lain ditolak', () => {
    const deps = makeDeps();
    const service = createCouponService({} as any, deps);
    const result = service.validateForProgram({
      coupon: { ...BASE_COUPON, programId: 'p0000000-0000-4000-8000-000000000099' },
      programId: 'p0000000-0000-4000-8000-000000000001',
      listPrice: 200000,
      now,
    });
    assert.equal(result.valid, false);
    assert.match(result.message, /tidak berlaku/i);
  });
});
