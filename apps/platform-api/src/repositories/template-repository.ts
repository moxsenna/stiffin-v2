import { eq, and, asc } from 'drizzle-orm';
import { messageTemplates, MessageTemplateRow, NewMessageTemplateRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';
import type { DbHandle } from '../db/client';

export type CreateMessageTemplateInput = Omit<NewMessageTemplateRow, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;
export type UpdateMessageTemplatePatch = Partial<Omit<NewMessageTemplateRow, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>;

export interface TemplateRepository {
  listActive(ctx: OrganizationContext, category?: string): Promise<MessageTemplateRow[]>;
  findById(ctx: OrganizationContext, id: string): Promise<MessageTemplateRow | null>;
  create(ctx: OrganizationContext, input: CreateMessageTemplateInput): Promise<MessageTemplateRow>;
  update(ctx: OrganizationContext, id: string, patch: UpdateMessageTemplatePatch): Promise<MessageTemplateRow | null>;
}

export function createTemplateRepository(db: DbHandle): TemplateRepository {
  return {
    async listActive(ctx, category) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const conditions = [
        eq(messageTemplates.organizationId, ctx.organizationId),
        eq(messageTemplates.isActive, true),
      ];
      if (category) {
        conditions.push(eq(messageTemplates.category, category));
      }
      return db
        .select()
        .from(messageTemplates)
        .where(and(...conditions))
        .orderBy(asc(messageTemplates.title));
    },

    async findById(ctx, id) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.organizationId, ctx.organizationId),
            eq(messageTemplates.id, id)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async create(ctx, input) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const now = new Date().toISOString();
      const rows = await db
        .insert(messageTemplates)
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
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      const rows = await db
        .update(messageTemplates)
        .set({
          ...patch,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(messageTemplates.organizationId, ctx.organizationId),
            eq(messageTemplates.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    },
  };
}
