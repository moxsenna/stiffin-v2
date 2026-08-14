import { eq, and, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { organizations, NewOrganizationRow, OrganizationRow } from '../db/schema';
import { isValidIanaTimezone, DEFAULT_ORGANIZATION_TIMEZONE } from '@promotor/platform-core';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  timezone?: string;
}

export interface OrganizationRepository {
  create(input: CreateOrganizationInput): Promise<OrganizationRow>;
  findById(id: string): Promise<OrganizationRow | null>;
  findByIdIncludingDeleted(id: string): Promise<OrganizationRow | null>;
  findBySlug(slug: string): Promise<OrganizationRow | null>;
  softDelete(id: string): Promise<void>;
}

export function createOrganizationRepository(db: NodePgDatabase): OrganizationRepository {
  return {
    async create(input) {
      const timezone = input.timezone?.trim() || DEFAULT_ORGANIZATION_TIMEZONE;
      if (!isValidIanaTimezone(timezone)) {
        throw new Error(`Invalid IANA timezone: "${input.timezone}"`);
      }
      const row: NewOrganizationRow = {
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
        timezone,
      };
      const [inserted] = await db.insert(organizations).values(row).returning();
      return inserted;
    },

    async findById(id) {
      const rows = await db
        .select()
        .from(organizations)
        .where(and(eq(organizations.id, id), isNull(organizations.deletedAt)))
        .limit(1);
      return rows[0] ?? null;
    },

    async findByIdIncludingDeleted(id) {
      const rows = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async findBySlug(slug) {
      const rows = await db
        .select()
        .from(organizations)
        .where(and(eq(organizations.slug, slug), isNull(organizations.deletedAt)))
        .limit(1);
      return rows[0] ?? null;
    },

    async softDelete(id) {
      await db
        .update(organizations)
        .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(organizations.id, id));
    },
  };
}
