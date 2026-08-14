import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { productEntitlements, ProductEntitlementRow, NewProductEntitlementRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';

export interface UpsertEntitlementsInput {
  context: OrganizationContext;
  promotorClass: boolean;
  promotorFlow: boolean;
}

export interface EntitlementRepository {
  getForOrg(context: OrganizationContext): Promise<ProductEntitlementRow | null>;
  upsert(input: UpsertEntitlementsInput): Promise<ProductEntitlementRow>;
  setEnabled(context: OrganizationContext, product: 'promotorClass' | 'promotorFlow', enabled: boolean): Promise<ProductEntitlementRow | null>;
}

/**
 * Product entitlements answer "which products may this organization use?"
 * It is intentionally separate from organization membership and integration
 * health (BACKEND_STACK_DECISION §10-11).
 */
export function createEntitlementRepository(db: NodePgDatabase): EntitlementRepository {
  return {
    async getForOrg(context) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      const rows = await db
        .select()
        .from(productEntitlements)
        .where(eq(productEntitlements.organizationId, context.organizationId))
        .limit(1);
      return rows[0] ?? null;
    },

    async upsert(input) {
      if (!isOrganizationContext(input.context)) {
        throw new Error('Tenant context is required');
      }
      const row: NewProductEntitlementRow = {
        organizationId: input.context.organizationId,
        promotorClass: input.promotorClass,
        promotorFlow: input.promotorFlow,
      };
      const upserted = await db
        .insert(productEntitlements)
        .values(row)
        .onConflictDoUpdate({
          target: productEntitlements.organizationId,
          set: {
            promotorClass: input.promotorClass,
            promotorFlow: input.promotorFlow,
            updatedAt: new Date().toISOString(),
          },
        })
        .returning();
      return upserted[0];
    },

    async setEnabled(context, product, enabled) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      const rows = await db
        .update(productEntitlements)
        .set({
          ...(product === 'promotorClass' ? { promotorClass: enabled } : { promotorFlow: enabled }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(productEntitlements.organizationId, context.organizationId))
        .returning();
      return rows[0] ?? null;
    },
  };
}
