import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';
import { createTemplateRepository } from '../repositories/template-repository';

export interface CreateTemplateInput {
  title: string;
  category: string;
  templateText: string;
  isActive?: boolean;
}

export interface UpdateTemplatePatch {
  title?: string;
  category?: string;
  templateText?: string;
  isActive?: boolean;
}

export interface ListTemplatesOptions {
  category?: string;
}

export interface TemplateServiceDependencies {
  templates?: typeof createTemplateRepository;
}

export function createTemplateService(
  db: DbHandle,
  dependencies: TemplateServiceDependencies = {}
) {
  return {
    async listTemplates(ctx: OrganizationContext, opts: ListTemplatesOptions = {}) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const repo = (dependencies.templates ?? createTemplateRepository)(db);
      return repo.listActive(ctx, opts.category);
    },

    async getTemplate(ctx: OrganizationContext, id: string) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const repo = (dependencies.templates ?? createTemplateRepository)(db);
      const template = await repo.findById(ctx, id);
      if (!template) {
        throw new DomainError('NOT_FOUND', 'Message template not found');
      }
      return template;
    },

    async createTemplate(ctx: OrganizationContext, input: CreateTemplateInput) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      if (!input.title || input.title.trim().length === 0) {
        throw new DomainError('VALIDATION_ERROR', 'Template title cannot be empty');
      }

      if (!input.templateText || input.templateText.trim().length === 0) {
        throw new DomainError('VALIDATION_ERROR', 'Template text cannot be empty');
      }

      const repo = (dependencies.templates ?? createTemplateRepository)(db);
      return repo.create(ctx, {
        title: input.title.trim(),
        category: input.category,
        templateText: input.templateText,
        isActive: input.isActive ?? true,
      });
    },

    async updateTemplate(ctx: OrganizationContext, id: string, patch: UpdateTemplatePatch) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const repo = (dependencies.templates ?? createTemplateRepository)(db);
      const updated = await repo.update(ctx, id, patch);
      if (!updated) {
        throw new DomainError('NOT_FOUND', 'Message template not found');
      }
      return updated;
    },
  };
}
