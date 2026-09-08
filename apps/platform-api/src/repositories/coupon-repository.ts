import { eq, and, desc, sql } from 'drizzle-orm';
import type { DbHandle } from '../db/client';
import {
  promoCoupons,
  type PromoCouponRow,
  type NewPromoCouponRow,
} from '../db/schema/promo-coupons';
import { organizations } from '../db/schema/organizations';
import type { PromoCoupon, PromoCouponDiscountType } from '@promotor/contracts';

export interface CouponRepository {
  findByCode(organizationId: string, code: string): Promise<PromoCoupon | null>;
  findByCodeAndOrgSlug(
    orgSlug: string,
    code: string
  ): Promise<{ coupon: PromoCoupon; organizationId: string } | null>;
  list(organizationId: string): Promise<PromoCoupon[]>;
  findById(organizationId: string, id: string): Promise<PromoCoupon | null>;
  create(data: Omit<NewPromoCouponRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromoCoupon>;
  update(
    organizationId: string,
    id: string,
    patch: Partial<Omit<NewPromoCouponRow, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PromoCoupon | null>;
  incrementUsedCount(organizationId: string, id: string): Promise<void>;
  incrementUsedCountByCode(organizationId: string, code: string): Promise<void>;
}

function toDto(row: PromoCouponRow): PromoCoupon {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    discountType: row.discountType as PromoCouponDiscountType,
    discountValue: row.discountValue,
    programId: row.programId ?? null,
    maxRedemptions: row.maxRedemptions ?? null,
    usedCount: row.usedCount,
    expiresAt: row.expiresAt ? (typeof row.expiresAt === 'string' ? row.expiresAt : new Date(row.expiresAt).toISOString()) : null,
    isActive: row.isActive,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date(row.createdAt).toISOString(),
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date(row.updatedAt).toISOString(),
  };
}

export function createCouponRepository(db: DbHandle): CouponRepository {
  return {
    async findByCode(organizationId: string, code: string): Promise<PromoCoupon | null> {
      const rows = await db
        .select()
        .from(promoCoupons)
        .where(
          and(
            eq(promoCoupons.organizationId, organizationId),
            eq(promoCoupons.code, code.trim().toUpperCase())
          )
        )
        .limit(1);

      return rows[0] ? toDto(rows[0]) : null;
    },

    async findByCodeAndOrgSlug(
      orgSlug: string,
      code: string
    ): Promise<{ coupon: PromoCoupon; organizationId: string } | null> {
      const rows = await db
        .select({
          coupon: promoCoupons,
          organizationId: organizations.id,
        })
        .from(promoCoupons)
        .innerJoin(organizations, eq(promoCoupons.organizationId, organizations.id))
        .where(
          and(
            eq(organizations.slug, orgSlug.trim().toLowerCase()),
            eq(promoCoupons.code, code.trim().toUpperCase())
          )
        )
        .limit(1);

      if (!rows[0]) return null;
      return {
        coupon: toDto(rows[0].coupon),
        organizationId: rows[0].organizationId,
      };
    },

    async list(organizationId: string): Promise<PromoCoupon[]> {
      const rows = await db
        .select()
        .from(promoCoupons)
        .where(eq(promoCoupons.organizationId, organizationId))
        .orderBy(desc(promoCoupons.createdAt));

      return rows.map(toDto);
    },

    async findById(organizationId: string, id: string): Promise<PromoCoupon | null> {
      const rows = await db
        .select()
        .from(promoCoupons)
        .where(and(eq(promoCoupons.organizationId, organizationId), eq(promoCoupons.id, id)))
        .limit(1);

      return rows[0] ? toDto(rows[0]) : null;
    },

    async create(data: Omit<NewPromoCouponRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromoCoupon> {
      const [inserted] = await db
        .insert(promoCoupons)
        .values({
          ...data,
          code: data.code.trim().toUpperCase(),
        })
        .returning();

      return toDto(inserted);
    },

    async update(
      organizationId: string,
      id: string,
      patch: Partial<Omit<NewPromoCouponRow, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>
    ): Promise<PromoCoupon | null> {
      const [updated] = await db
        .update(promoCoupons)
        .set({
          ...patch,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(promoCoupons.organizationId, organizationId), eq(promoCoupons.id, id)))
        .returning();

      return updated ? toDto(updated) : null;
    },

    async incrementUsedCount(organizationId: string, id: string): Promise<void> {
      await db
        .update(promoCoupons)
        .set({
          usedCount: sql`${promoCoupons.usedCount} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(promoCoupons.organizationId, organizationId), eq(promoCoupons.id, id)));
    },

    async incrementUsedCountByCode(organizationId: string, code: string): Promise<void> {
      await db
        .update(promoCoupons)
        .set({
          usedCount: sql`${promoCoupons.usedCount} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(promoCoupons.organizationId, organizationId),
            eq(promoCoupons.code, code.trim().toUpperCase())
          )
        );
    },
  };
}
