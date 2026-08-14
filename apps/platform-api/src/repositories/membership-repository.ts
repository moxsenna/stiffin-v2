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
  listByUser(userId: string): Promise<OrganizationMemberRow[]>;
  listByOrg(context: OrganizationContext): Promise<OrganizationMemberRow[]>;
  updateRole(input: AddMemberInput): Promise<OrganizationMemberRow | null>;
  removeMember(context: OrganizationContext, userId: string): Promise<void>;
}

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

    async listByUser(userId) {
      return db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
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
