import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  organizationMembers,
  NewOrganizationMemberRow,
  OrganizationMemberRow,
  OrganizationRole,
} from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';

export interface AddMemberInput {
  context: OrganizationContext;
  userId: string;
  role?: OrganizationRole;
}

export interface MembershipRepository {
  addMember(input: AddMemberInput): Promise<OrganizationMemberRow>;
  findByUserAndOrg(context: OrganizationContext, userId: string): Promise<OrganizationMemberRow | null>;
  listByOrg(context: OrganizationContext): Promise<OrganizationMemberRow[]>;
  updateRole(input: AddMemberInput): Promise<OrganizationMemberRow | null>;
  removeMember(context: OrganizationContext, userId: string): Promise<void>;
}

/**
 * Membership repository. Tenant-scoped: every method requires
 * OrganizationContext. There is deliberately NO cross-tenant "listByUser"
 * method here — B2 may introduce an explicitly privileged auth/system-scoped
 * query (e.g. listMembershipsForAuthenticatedUserSystemScope) behind the
 * auth boundary if needed.
 */

export function createMembershipRepository(db: NodePgDatabase): MembershipRepository {
  return {
    async addMember(input) {
      if (!isOrganizationContext(input.context)) {
        throw new Error('Tenant context is required');
      }
      const row: NewOrganizationMemberRow = {
        organizationId: input.context.organizationId,
        userId: input.userId,
        role: input.role ?? 'member',
      };
      const [inserted] = await db.insert(organizationMembers).values(row).returning();
      return inserted;
    },

    async findByUserAndOrg(context, userId) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      const rows = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, context.organizationId),
            eq(organizationMembers.userId, userId)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async listByOrg(context) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      return db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, context.organizationId));
    },

    async updateRole(input) {
      if (!isOrganizationContext(input.context)) {
        throw new Error('Tenant context is required');
      }
      if (!input.role) return null;
      const rows = await db
        .update(organizationMembers)
        .set({ role: input.role, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(organizationMembers.organizationId, input.context.organizationId),
            eq(organizationMembers.userId, input.userId)
          )
        )
        .returning();
      return rows[0] ?? null;
    },

    async removeMember(context, userId) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      await db
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, context.organizationId),
            eq(organizationMembers.userId, userId)
          )
        );
    },
  };
}
