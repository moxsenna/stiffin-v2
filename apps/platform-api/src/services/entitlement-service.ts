import { z } from 'zod';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createEntitlementRepository } from '../repositories/entitlement-repository';
import { DomainError } from '../core/errors';
import type { OrganizationContext } from '../core/organization-context';
import type { ProductEntitlements } from '@promotor/contracts';

const UpsertEntitlementsSchema = z.object({
  promotorClass: z.boolean(),
  promotorFlow: z.boolean(),
});

export interface UpsertEntitlementsCommand {
  context: OrganizationContext;
  promotorClass: boolean;
  promotorFlow: boolean;
}

export function createEntitlementService(db: NodePgDatabase) {
  const repo = createEntitlementRepository(db);

  return {
    async getEntitlements(context: OrganizationContext): Promise<ProductEntitlements> {
      const row = await repo.getForOrg(context);
      return {
        promotorClass: row?.promotorClass ?? false,
        promotorFlow: row?.promotorFlow ?? false,
      };
    },

    async upsertEntitlements(command: UpsertEntitlementsCommand) {
      const parsed = UpsertEntitlementsSchema.safeParse({
        promotorClass: command.promotorClass,
        promotorFlow: command.promotorFlow,
      });
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      const row = await repo.upsert({
        context: command.context,
        promotorClass: parsed.data.promotorClass,
        promotorFlow: parsed.data.promotorFlow,
      });
      return { promotorClass: row.promotorClass, promotorFlow: row.promotorFlow };
    },
  };
}
