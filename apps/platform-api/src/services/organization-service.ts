import { z } from 'zod';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createOrganizationRepository } from '../repositories/organization-repository';
import { organizations, productEntitlements } from '../db/schema';
import { DomainError } from '../core/errors';
import { DEFAULT_ORGANIZATION_TIMEZONE, isValidIanaTimezone } from '@promotor/platform-core';

const CreateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name cannot be empty').max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with optional hyphens')
    .max(100),
  timezone: z.string().max(100).optional(),
});

const SoftDeleteOrganizationSchema = z.object({
  id: z.string().uuid('organization id must be a UUID'),
});

export interface CreateOrganizationCommand {
  name: string;
  slug: string;
  timezone?: string;
}

export function createOrganizationService(db: NodePgDatabase) {
  const repo = createOrganizationRepository(db);

  return {
    /**
     * Canonical organization creation path. Provisions the organization AND
     * its product_entitlements row (promotor_class=false, promotor_flow=false)
     * in ONE transaction, so a newly created org always has exactly one
     * entitlement row. A missing row elsewhere is still interpreted as
     * deny-all (defense in depth). B2 must preserve this invariant when
     * Better Auth creates organizations.
     */
    async createOrganization(command: CreateOrganizationCommand) {
      const parsed = CreateOrganizationSchema.safeParse(command);
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      const timezone = parsed.data.timezone ?? DEFAULT_ORGANIZATION_TIMEZONE;
      if (!isValidIanaTimezone(timezone)) {
        throw new DomainError('VALIDATION_ERROR', `Invalid IANA timezone: "${timezone}"`);
      }

      try {
        return await db.transaction(async (tx) => {
          const [org] = await tx
            .insert(organizations)
            .values({
              name: parsed.data.name.trim(),
              slug: parsed.data.slug.trim().toLowerCase(),
              timezone,
            })
            .returning();
          await tx.insert(productEntitlements).values({
            organizationId: org.id,
            promotorClass: false,
            promotorFlow: false,
          });
          return org;
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new DomainError('CONFLICT', `Organization slug already exists: "${parsed.data.slug}"`);
        }
        throw err;
      }
    },

    async getOrganization(id: string) {
      const parsed = SoftDeleteOrganizationSchema.safeParse({ id });
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      const org = await repo.findById(id);
      if (!org) throw new DomainError('NOT_FOUND', 'Organization not found');
      return org;
    },

    async softDeleteOrganization(id: string) {
      const parsed = SoftDeleteOrganizationSchema.safeParse({ id });
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      const existing = await repo.findById(id);
      if (!existing) throw new DomainError('NOT_FOUND', 'Organization not found');
      await repo.softDelete(id);
    },
  };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { code?: string }).code === 'string' &&
    (err as { code: string }).code === '23505'
  );
}
