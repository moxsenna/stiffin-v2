import { eq, and, inArray, asc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { services, ServiceRow, NewServiceRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';

export type CreateServiceInput = Omit<NewServiceRow, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;
export type UpdateServicePatch = Partial<Omit<NewServiceRow, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>;

export interface ServiceRepository {
  listActive(ctx: OrganizationContext): Promise<ServiceRow[]>;
  listByIds(ctx: OrganizationContext, ids: string[]): Promise<ServiceRow[]>;
  findById(ctx: OrganizationContext, id: string): Promise<ServiceRow | null>;
  create(ctx: OrganizationContext, input: CreateServiceInput): Promise<ServiceRow>;
  update(ctx: OrganizationContext, id: string, patch: UpdateServicePatch): Promise<ServiceRow | null>;
}

export function createServiceRepository(db: NodePgDatabase<any> | any): ServiceRepository {
  return {
    async listActive(ctx) {
      if (!isOrganizationContext(ctx)) {
        throw new Error('Tenant context is required');
      }
      return db
        .select()
        .from(services)
        .where(
          and(
            eq(services.organizationId, ctx.organizationId),
            eq(services.isActive, true)
          )
        )
        .orderBy(asc(services.name));
    },

    async listByIds(ctx, ids) {
      if (!isOrganizationContext(ctx)) {
        throw new Error('Tenant context is required');
      }
      if (ids.length === 0) return [];
      return db
        .select()
        .from(services)
        .where(
          and(
            eq(services.organizationId, ctx.organizationId),
            inArray(services.id, ids)
          )
        )
        .orderBy(asc(services.name));
    },

    async findById(ctx, id) {
      if (!isOrganizationContext(ctx)) {
        throw new Error('Tenant context is required');
      }
      const rows = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.organizationId, ctx.organizationId),
            eq(services.id, id)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async create(ctx, input) {
      if (!isOrganizationContext(ctx)) {
        throw new Error('Tenant context is required');
      }
      const now = new Date().toISOString();
      const rows = await db
        .insert(services)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return rows[0];
    },

    async update(ctx, id, patch) {
      if (!isOrganizationContext(ctx)) {
        throw new Error('Tenant context is required');
      }
      const rows = await db
        .update(services)
        .set({
          ...patch,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(services.organizationId, ctx.organizationId),
            eq(services.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    },
  };
}
