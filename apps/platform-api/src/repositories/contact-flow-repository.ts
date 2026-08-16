import { eq, and, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { contactFlowStates, contacts, ContactFlowStateRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';

export type DbHandle = NodePgDatabase<any> | PgTransaction<any, any, any>;

export interface UpdateLifecycleStateInput {
  stage: string;
  lostReason?: string | null;
  promoteToClient?: boolean;
}

export interface UpdateFlowProfilePatch {
  sourceChannel?: string | null;
  notes?: string | null;
  interest?: string | null;
}

export interface ContactFlowRepository {
  getOrCreate(ctx: OrganizationContext, contactId: string): Promise<ContactFlowStateRow | null>;
  updateLifecycleState(
    ctx: OrganizationContext,
    contactId: string,
    input: UpdateLifecycleStateInput
  ): Promise<ContactFlowStateRow | null>;
  updateProfile(
    ctx: OrganizationContext,
    contactId: string,
    patch: UpdateFlowProfilePatch
  ): Promise<ContactFlowStateRow | null>;
  findById(ctx: OrganizationContext, contactId: string): Promise<ContactFlowStateRow | null>;
}

export function createContactFlowRepository(db: DbHandle): ContactFlowRepository {
  return {
    async getOrCreate(ctx, contactId) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      // Atomic conditional insert: only inserts if contact belongs to current tenant and is active (deleted_at IS NULL)
      await db.execute(sql`
        INSERT INTO contact_flow_states (id, organization_id, contact_id, stage, classification, created_at, updated_at)
        SELECT gen_random_uuid(), c.organization_id, c.id, 'NEW', 'PROSPECT', now(), now()
        FROM contacts c
        WHERE c.id = ${contactId} AND c.organization_id = ${ctx.organizationId} AND c.deleted_at IS NULL
        ON CONFLICT (contact_id) DO NOTHING;
      `);

      // Read back the row ensuring active tenant contact join
      const rows = await db
        .select({ flowState: contactFlowStates })
        .from(contactFlowStates)
        .innerJoin(contacts, eq(contactFlowStates.contactId, contacts.id))
        .where(
          and(
            eq(contactFlowStates.organizationId, ctx.organizationId),
            eq(contactFlowStates.contactId, contactId),
            eq(contacts.organizationId, ctx.organizationId),
            isNull(contacts.deletedAt)
          )
        )
        .limit(1);

      return rows[0]?.flowState ?? null;
    },

    async updateLifecycleState(ctx, contactId, input) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      // Verify contact is active and belongs to tenant
      const activeContact = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.id, contactId),
            eq(contacts.organizationId, ctx.organizationId),
            isNull(contacts.deletedAt)
          )
        )
        .limit(1);

      if (!activeContact[0]) {
        return null;
      }

      const patch: {
        stage: string;
        lostReason: string | null;
        updatedAt: string;
        classification?: string;
      } = {
        stage: input.stage,
        lostReason: input.stage === 'LOST' ? (input.lostReason ?? null) : null,
        updatedAt: new Date().toISOString(),
      };

      // Classification is NEVER a normal input; promoteToClient=true may only move classification to CLIENT
      if (input.promoteToClient === true) {
        patch.classification = 'CLIENT';
      }

      const rows = await db
        .update(contactFlowStates)
        .set(patch)
        .where(
          and(
            eq(contactFlowStates.organizationId, ctx.organizationId),
            eq(contactFlowStates.contactId, contactId)
          )
        )
        .returning();

      return rows[0] ?? null;
    },

    async updateProfile(ctx, contactId, patch) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      // Verify contact is active and belongs to tenant
      const activeContact = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.id, contactId),
            eq(contacts.organizationId, ctx.organizationId),
            isNull(contacts.deletedAt)
          )
        )
        .limit(1);

      if (!activeContact[0]) {
        return null;
      }

      const updateData: {
        updatedAt: string;
        sourceChannel?: string | null;
        notes?: string | null;
        interest?: string | null;
      } = {
        updatedAt: new Date().toISOString(),
      };
      if (patch.sourceChannel !== undefined) updateData.sourceChannel = patch.sourceChannel;
      if (patch.notes !== undefined) updateData.notes = patch.notes;
      if (patch.interest !== undefined) updateData.interest = patch.interest;

      const rows = await db
        .update(contactFlowStates)
        .set(updateData)
        .where(
          and(
            eq(contactFlowStates.organizationId, ctx.organizationId),
            eq(contactFlowStates.contactId, contactId)
          )
        )
        .returning();

      return rows[0] ?? null;
    },

    async findById(ctx, contactId) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const rows = await db
        .select({ flowState: contactFlowStates })
        .from(contactFlowStates)
        .innerJoin(contacts, eq(contactFlowStates.contactId, contacts.id))
        .where(
          and(
            eq(contactFlowStates.organizationId, ctx.organizationId),
            eq(contactFlowStates.contactId, contactId),
            eq(contacts.organizationId, ctx.organizationId),
            isNull(contacts.deletedAt)
          )
        )
        .limit(1);

      return rows[0]?.flowState ?? null;
    },
  };
}
