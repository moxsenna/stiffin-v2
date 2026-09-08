import type { DbHandle } from '../../db/client';
import { createCouponRepository, type CouponRepository } from '../../repositories/coupon-repository';
import type { PromoCoupon, CreateCouponRequest, UpdateCouponRequest } from '@promotor/contracts';

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export interface CouponServiceDependencies {
  clock?: () => Date;
  couponRepo?: CouponRepository;
}

export function createCouponService(db: DbHandle, deps: CouponServiceDependencies = {}) {
  const getNow = deps.clock ?? (() => new Date());
  const repo = deps.couponRepo ?? createCouponRepository(db);

  const compute = (coupon: PromoCoupon, listPrice: number) => {
    const discount =
      coupon.discountType === 'PERCENT'
        ? Math.floor((listPrice * coupon.discountValue) / 100)
        : coupon.discountValue;
    const discountAmount = Math.max(0, Math.min(discount, listPrice));
    return {
      discountAmount,
      finalAmount: listPrice - discountAmount,
    };
  };

  return {
    compute,

    validateForProgram(input: {
      coupon: PromoCoupon | null | undefined;
      programId: string;
      listPrice: number;
      now?: Date;
    }): CouponValidationResult {
      const now = input.now ?? getNow();
      const invalid = (message: string): CouponValidationResult => ({
        valid: false,
        discountAmount: 0,
        finalAmount: input.listPrice,
        message,
      });

      if (!input.coupon || !input.coupon.isActive) {
        return invalid('Kode kupon tidak aktif atau tidak ditemukan');
      }

      if (input.coupon.programId && input.coupon.programId !== input.programId) {
        return invalid('Kode kupon tidak berlaku untuk program ini');
      }

      if (input.coupon.expiresAt && new Date(input.coupon.expiresAt).getTime() < now.getTime()) {
        return invalid('Kode kupon sudah kedaluwarsa');
      }

      if (input.coupon.maxRedemptions != null && input.coupon.usedCount >= input.coupon.maxRedemptions) {
        return invalid('Kuota kode kupon sudah habis');
      }

      const { discountAmount, finalAmount } = compute(input.coupon, input.listPrice);
      return {
        valid: true,
        discountAmount,
        finalAmount,
        message: `Kode ${input.coupon.code} berhasil diterapkan`,
      };
    },

    async findByCode(organizationId: string, code: string) {
      return repo.findByCode(organizationId, code);
    },

    async findByCodeAndOrgSlug(orgSlug: string, code: string) {
      return repo.findByCodeAndOrgSlug(orgSlug, code);
    },

    async list(organizationId: string) {
      return repo.list(organizationId);
    },

    async findById(organizationId: string, id: string) {
      return repo.findById(organizationId, id);
    },

    async create(organizationId: string, input: CreateCouponRequest) {
      return repo.create({
        organizationId,
        code: input.code.trim().toUpperCase(),
        discountType: input.discountType,
        discountValue: input.discountValue,
        programId: input.programId ?? null,
        maxRedemptions: input.maxRedemptions ?? null,
        expiresAt: input.expiresAt ?? null,
        usedCount: 0,
        isActive: true,
      });
    },

    async update(organizationId: string, id: string, patch: UpdateCouponRequest) {
      return repo.update(organizationId, id, patch);
    },

    async incrementUsedCount(organizationId: string, id: string) {
      return repo.incrementUsedCount(organizationId, id);
    },

    async incrementUsedCountByCode(organizationId: string, code: string) {
      return repo.incrementUsedCountByCode(organizationId, code);
    },
  };
}

export type CouponService = ReturnType<typeof createCouponService>;
