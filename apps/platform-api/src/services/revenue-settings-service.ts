import { eq } from 'drizzle-orm';
import { organizations } from '../db/schema/organizations';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';
import type { DbHandle } from '../db/client';

const METADATA_KEY = 'flowCommissionPercent';

function parseCommissionPercent(raw: string | null | undefined): number {
  if (!raw) return 0;
  try {
    const meta = JSON.parse(raw) as Record<string, unknown>;
    const v = meta[METADATA_KEY];
    if (typeof v !== 'number' || !Number.isInteger(v)) return 0;
    return Math.max(0, Math.min(100, v));
  } catch {
    return 0;
  }
}

export function createRevenueSettingsService(db: DbHandle) {
  return {
    async get(ctx: OrganizationContext): Promise<{ commissionPercent: number }> {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .select({ metadata: organizations.metadata })
        .from(organizations)
        .where(eq(organizations.id, ctx.organizationId))
        .limit(1);
      if (!rows[0]) {
        throw new DomainError('NOT_FOUND', 'Organization not found');
      }
      return { commissionPercent: parseCommissionPercent(rows[0].metadata) };
    },

    async update(
      ctx: OrganizationContext,
      commissionPercent: number
    ): Promise<{ commissionPercent: number }> {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .select({ metadata: organizations.metadata })
        .from(organizations)
        .where(eq(organizations.id, ctx.organizationId))
        .limit(1);
      if (!rows[0]) {
        throw new DomainError('NOT_FOUND', 'Organization not found');
      }
      let meta: Record<string, unknown> = {};
      try {
        meta = rows[0].metadata ? (JSON.parse(rows[0].metadata) as Record<string, unknown>) : {};
      } catch {
        meta = {};
      }
      meta[METADATA_KEY] = commissionPercent;
      const next = JSON.stringify(meta);
      await db
        .update(organizations)
        .set({ metadata: next, updatedAt: new Date().toISOString() })
        .where(eq(organizations.id, ctx.organizationId));
      return { commissionPercent };
    },
  };
}
