import {
  CreateProgramRequestSchema,
  UpdateProgramRequestSchema,
  UpdateProgramPresentationRequestSchema,
  UpdateWorkspaceProfileRequestSchema,
  CreateModuleRequestSchema,
  UpdateModuleRequestSchema,
  ReorderModulesRequestSchema,
  CreateLessonRequestSchema,
  UpsertLessonRequestSchema,
  ReorderLessonsRequestSchema,
  CreateProgramRequest,
  UpdateProgramRequest,
  UpdateProgramPresentationRequest,
  UpdateWorkspaceProfileRequest,
  UpsertLessonRequest,
  Program,
  PublicWorkspaceProfile,
  ProgramPublicPresentation,
} from '@promotor/contracts';
import { DomainError } from '../core/errors';
import type { OrganizationContext } from '../core/organization-context';
import type { ProgramRepository } from '../repositories/program-repository';
import type { WorkspaceProfileRepository } from '../repositories/workspace-profile-repository';
import { slugifyTitle } from './program/slug';
import { parseYoutubeUrl } from './program/youtube';

export interface ProgramService {
  listPrograms(ctx: OrganizationContext, opts?: { includeArchived?: boolean }): Promise<Program[]>;
  getProgram(ctx: OrganizationContext, id: string): Promise<Program>;
  createProgram(ctx: OrganizationContext, cmd: CreateProgramRequest): Promise<Program>;
  updateProgram(ctx: OrganizationContext, id: string, patch: UpdateProgramRequest): Promise<Program>;
  publishProgram(ctx: OrganizationContext, id: string): Promise<Program>;
  unpublishProgram(ctx: OrganizationContext, id: string): Promise<Program>;
  archiveProgram(ctx: OrganizationContext, id: string): Promise<Program>;
  restoreProgram(ctx: OrganizationContext, id: string): Promise<Program>;

  addModule(ctx: OrganizationContext, programId: string, title: string): Promise<Program>;
  updateModule(ctx: OrganizationContext, programId: string, moduleId: string, title: string): Promise<Program>;
  deleteModule(ctx: OrganizationContext, programId: string, moduleId: string): Promise<Program>;
  reorderModules(ctx: OrganizationContext, programId: string, orderedModuleIds: string[]): Promise<Program>;

  addLesson(ctx: OrganizationContext, programId: string, moduleId: string, title: string, videoUrl?: string): Promise<Program>;
  saveLesson(
    ctx: OrganizationContext,
    programId: string,
    moduleId: string,
    lessonId: string,
    lesson: UpsertLessonRequest
  ): Promise<Program>;
  deleteLesson(ctx: OrganizationContext, programId: string, moduleId: string, lessonId: string): Promise<Program>;
  reorderLessons(
    ctx: OrganizationContext,
    programId: string,
    moduleId: string,
    orderedLessonIds: string[]
  ): Promise<Program>;

  getProgramPresentation(ctx: OrganizationContext, programId: string): Promise<ProgramPublicPresentation>;
  updateProgramPresentation(
    ctx: OrganizationContext,
    programId: string,
    patch: UpdateProgramPresentationRequest
  ): Promise<ProgramPublicPresentation>;

  getWorkspaceProfile(ctx: OrganizationContext): Promise<PublicWorkspaceProfile>;
  updateWorkspaceProfile(
    ctx: OrganizationContext,
    patch: UpdateWorkspaceProfileRequest
  ): Promise<PublicWorkspaceProfile>;
}

export function createProgramService(
  programRepo: ProgramRepository,
  profileRepo: WorkspaceProfileRepository
): ProgramService {
  function validatePriceAndTypeInvariants(
    programType: string,
    accessType: string,
    pricing: string,
    priceAmount: number
  ) {
    if (pricing === 'free' && priceAmount !== 0) {
      throw new DomainError('VALIDATION_ERROR', 'Free programs must have priceAmount = 0');
    }
    if (pricing === 'one_time' && priceAmount <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'One-time priced programs must have priceAmount > 0');
    }

    if (programType === 'lead_magnet') {
      if (accessType !== 'public' || pricing !== 'free' || priceAmount !== 0) {
        throw new DomainError(
          'VALIDATION_ERROR',
          'Lead magnet programs must be public and free with priceAmount = 0'
        );
      }
    } else if (programType === 'aftersales') {
      if (accessType !== 'manual' || pricing !== 'free' || priceAmount !== 0) {
        throw new DomainError(
          'VALIDATION_ERROR',
          'Aftersales programs must have manual access and free pricing'
        );
      }
    } else if (programType === 'paid') {
      if (pricing !== 'one_time' || priceAmount <= 0) {
        throw new DomainError(
          'VALIDATION_ERROR',
          'Paid programs must have one_time pricing with priceAmount > 0'
        );
      }
    } else if (programType === 'private') {
      if (accessType !== 'private') {
        throw new DomainError('VALIDATION_ERROR', 'Private programs must have private access');
      }
    }
  }

  return {
    async listPrograms(ctx, opts) {
      return programRepo.list(ctx, opts);
    },

    async getProgram(ctx, id) {
      const prog = await programRepo.findById(ctx, id);
      if (!prog) {
        throw new DomainError('NOT_FOUND', 'Program not found');
      }
      return prog;
    },

    async createProgram(ctx, cmd) {
      const parsed = CreateProgramRequestSchema.safeParse(cmd);
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      const data = parsed.data;

      let accessType: 'public' | 'private' | 'manual' = 'public';
      let pricing: 'free' | 'one_time' = 'free';
      let priceAmount = data.priceAmount ?? 0;

      if (data.programType === 'lead_magnet') {
        accessType = 'public';
        pricing = 'free';
        priceAmount = 0;
      } else if (data.programType === 'aftersales') {
        accessType = 'manual';
        pricing = 'free';
        priceAmount = 0;
      } else if (data.programType === 'paid') {
        accessType = 'public';
        pricing = 'one_time';
        if (priceAmount <= 0) {
          throw new DomainError('VALIDATION_ERROR', 'Paid program requires priceAmount > 0');
        }
      } else if (data.programType === 'private') {
        accessType = 'private';
        if (priceAmount > 0) {
          pricing = 'one_time';
        } else {
          pricing = 'free';
          priceAmount = 0;
        }
      }

      validatePriceAndTypeInvariants(data.programType, accessType, pricing, priceAmount);

      const baseSlug = slugifyTitle(data.title);
      let slug = baseSlug;
      const count = await programRepo.countBySlug(ctx, baseSlug);
      if (count > 0) {
        slug = `${baseSlug}-${count + 1}`;
      }

      return programRepo.create(
        ctx,
        {
          slug,
          title: data.title,
          subtitle: data.subtitle ?? null,
          description: data.description ?? null,
          programType: data.programType,
          accessType,
          status: 'draft',
          pricing,
          priceAmount,
        },
        {
          coverVariant: data.coverVariant ?? 'cover-a',
          imageUrl: data.imageUrl ?? null,
          heroEyebrow: data.heroEyebrow ?? null,
          durationLabel: data.durationLabel ?? null,
          learningOutcomes: data.outcomes ?? [],
        }
      );
    },

    async updateProgram(ctx, id, patch) {
      const parsed = UpdateProgramRequestSchema.safeParse(patch);
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      const prog = await this.getProgram(ctx, id);

      const effectiveType = parsed.data.programType ?? prog.programType;
      const effectiveAccess = parsed.data.accessType ?? prog.accessType;
      const effectivePricing = parsed.data.pricing ?? prog.pricing;
      const effectiveAmount = parsed.data.priceAmount !== undefined ? parsed.data.priceAmount : prog.priceAmount;

      validatePriceAndTypeInvariants(effectiveType, effectiveAccess, effectivePricing, effectiveAmount);

      const updated = await programRepo.update(ctx, id, {
        title: parsed.data.title,
        subtitle: parsed.data.subtitle ?? undefined,
        description: parsed.data.description ?? undefined,
        programType: parsed.data.programType,
        accessType: parsed.data.accessType,
        pricing: parsed.data.pricing,
        priceAmount: parsed.data.priceAmount,
      });

      if (!updated) throw new DomainError('NOT_FOUND', 'Program not found');
      return updated;
    },

    async publishProgram(ctx, id) {
      const prog = await this.getProgram(ctx, id);

      if (!prog.title || prog.title.trim().length === 0) {
        throw new DomainError('VALIDATION_ERROR', 'Program title is required to publish');
      }

      if (prog.programType !== 'private') {
        const totalLessons = prog.modules.reduce((sum, m) => sum + m.lessons.length, 0);
        if (prog.modules.length === 0 || totalLessons === 0) {
          throw new DomainError(
            'VALIDATION_ERROR',
            'Non-private program must have at least one module and one lesson to publish'
          );
        }
      }

      const publishedAt = prog.publishedAt ?? new Date().toISOString();
      const updated = await programRepo.setStatus(ctx, id, 'published', publishedAt);
      return updated!;
    },

    async unpublishProgram(ctx, id) {
      await this.getProgram(ctx, id);
      const updated = await programRepo.setStatus(ctx, id, 'draft', null);
      return updated!;
    },

    async archiveProgram(ctx, id) {
      await this.getProgram(ctx, id);
      const updated = await programRepo.setStatus(ctx, id, 'archived');
      return updated!;
    },

    async restoreProgram(ctx, id) {
      await this.getProgram(ctx, id);
      const updated = await programRepo.setStatus(ctx, id, 'draft');
      return updated!;
    },

    async addModule(ctx, programId, title) {
      const parsed = CreateModuleRequestSchema.safeParse({ title });
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      return programRepo.addModule(ctx, programId, parsed.data.title);
    },

    async updateModule(ctx, programId, moduleId, title) {
      const parsed = UpdateModuleRequestSchema.safeParse({ title });
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      return programRepo.updateModule(ctx, programId, moduleId, parsed.data.title);
    },

    async deleteModule(ctx, programId, moduleId) {
      const prog = await this.getProgram(ctx, programId);
      if (prog.status !== 'draft') {
        throw new DomainError(
          'CONTENT_DELETE_FORBIDDEN',
          'Cannot delete module from published or archived program. Unpublish first.'
        );
      }
      return programRepo.deleteModule(ctx, programId, moduleId);
    },

    async reorderModules(ctx, programId, orderedModuleIds) {
      const parsed = ReorderModulesRequestSchema.safeParse({ orderedModuleIds });
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      return programRepo.reorderModules(ctx, programId, parsed.data.orderedModuleIds);
    },

    async addLesson(ctx, programId, moduleId, title, videoUrl) {
      const parsed = CreateLessonRequestSchema.safeParse({ title, videoUrl });
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      let videoProvider: string | null = null;
      let parsedUrl: string | null = null;
      let videoExternalId: string | null = null;

      if (parsed.data.videoUrl) {
        const yt = parseYoutubeUrl(parsed.data.videoUrl);
        if (!yt) {
          throw new DomainError('INVALID_YOUTUBE_URL', 'Invalid YouTube URL provided');
        }
        videoProvider = yt.provider;
        parsedUrl = yt.url;
        videoExternalId = yt.externalId;
      }

      return programRepo.addLesson(ctx, programId, moduleId, {
        title: parsed.data.title,
        videoProvider,
        videoUrl: parsedUrl,
        videoExternalId,
      });
    },

    async saveLesson(ctx, programId, moduleId, lessonId, lessonInput) {
      const parsed = UpsertLessonRequestSchema.safeParse(lessonInput);
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      const data = parsed.data;

      // Video validation
      let videoProvider = data.videoProvider ?? null;
      let videoUrl = data.videoUrl ?? null;
      let videoExternalId = data.videoExternalId ?? null;

      if (data.videoUrl) {
        const yt = parseYoutubeUrl(data.videoUrl);
        if (!yt) {
          throw new DomainError('INVALID_YOUTUBE_URL', 'Invalid YouTube URL');
        }
        videoProvider = 'youtube';
        videoUrl = yt.url;
        videoExternalId = yt.externalId;
      } else if (videoProvider || videoExternalId) {
        if (!videoProvider || !videoUrl || !videoExternalId) {
          throw new DomainError('VALIDATION_ERROR', 'Video provider, url, and externalId must all be set together');
        }
      }

      // Reflection validation
      if (data.reflectionType || data.reflectionPrompt) {
        if (!data.reflectionType || !data.reflectionPrompt) {
          throw new DomainError('VALIDATION_ERROR', 'Reflection type and prompt must be set together');
        }
        if (data.reflectionType === 'long_text') {
          if (data.reflectionOptions && data.reflectionOptions.length > 0) {
            throw new DomainError('VALIDATION_ERROR', 'Long text reflection cannot have options');
          }
        } else if (data.reflectionType === 'single_select' || data.reflectionType === 'multi_select') {
          if (!data.reflectionOptions || data.reflectionOptions.length < 2) {
            throw new DomainError('VALIDATION_ERROR', 'Select reflection requires at least 2 options');
          }
          const seenIds = new Set<string>();
          for (const opt of data.reflectionOptions) {
            if (!opt.id || !opt.label) {
              throw new DomainError('VALIDATION_ERROR', 'Option must have id and label');
            }
            if (seenIds.has(opt.id)) {
              throw new DomainError('VALIDATION_ERROR', `Duplicate option ID: ${opt.id}`);
            }
            seenIds.add(opt.id);
          }
        }
      }

      // CTA validation
      if (data.ctaType || data.ctaLabel) {
        if (!data.ctaType || !data.ctaLabel) {
          throw new DomainError('VALIDATION_ERROR', 'CTA type and label must be set together');
        }
        if (data.ctaType === 'ENROLL_PROGRAM') {
          if (!data.ctaTargetProgramId) {
            throw new DomainError('VALIDATION_ERROR', 'ENROLL_PROGRAM CTA requires target program ID');
          }
          // Tenant validation: target must belong to same organization
          const target = await programRepo.findById(ctx, data.ctaTargetProgramId);
          if (!target) {
            throw new DomainError('VALIDATION_ERROR', 'Target program not found in this organization');
          }
        } else if (data.ctaType === 'EXTERNAL') {
          const url = (data.ctaConfig as any)?.url;
          if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
            throw new DomainError('VALIDATION_ERROR', 'EXTERNAL CTA requires valid http/https URL in config');
          }
        }
      }

      // Composite content check: at least one component
      const hasText = !!data.textContent && data.textContent.trim().length > 0;
      const hasVideo = !!videoProvider && !!videoUrl && !!videoExternalId;
      const hasAttachments = !!data.attachments && data.attachments.length > 0;
      const hasReflection = !!data.reflectionType && !!data.reflectionPrompt;
      const hasCta = !!data.ctaType && !!data.ctaLabel;

      if (!hasText && !hasVideo && !hasAttachments && !hasReflection && !hasCta) {
        throw new DomainError(
          'VALIDATION_ERROR',
          'Lesson must contain at least one content component (text, video, attachment, reflection, or CTA)'
        );
      }

      return programRepo.saveLesson(
        ctx,
        programId,
        moduleId,
        lessonId,
        {
          title: data.title,
          order: data.order,
          textContent: data.textContent ?? null,
          videoProvider,
          videoUrl,
          videoExternalId,
          reflectionType: data.reflectionType ?? null,
          reflectionPrompt: data.reflectionPrompt ?? null,
          reflectionOptions: data.reflectionOptions ?? null,
          ctaType: data.ctaType ?? null,
          ctaLabel: data.ctaLabel ?? null,
          ctaTargetProgramId: data.ctaTargetProgramId ?? null,
          ctaConfig: data.ctaConfig ?? null,
        },
        data.attachments as any
      );
    },

    async deleteLesson(ctx, programId, moduleId, lessonId) {
      const prog = await this.getProgram(ctx, programId);
      if (prog.status !== 'draft') {
        throw new DomainError(
          'CONTENT_DELETE_FORBIDDEN',
          'Cannot delete lesson from published or archived program. Unpublish first.'
        );
      }
      return programRepo.deleteLesson(ctx, programId, moduleId, lessonId);
    },

    async reorderLessons(ctx, programId, moduleId, orderedLessonIds) {
      const parsed = ReorderLessonsRequestSchema.safeParse({ orderedLessonIds });
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      return programRepo.reorderLessons(ctx, programId, moduleId, parsed.data.orderedLessonIds);
    },

    async getProgramPresentation(ctx, programId) {
      await this.getProgram(ctx, programId);
      const pres = await programRepo.getPresentation(ctx, programId);
      if (!pres) {
        throw new DomainError('NOT_FOUND', 'Program presentation not found');
      }
      return pres;
    },

    async updateProgramPresentation(ctx, programId, patch) {
      const parsed = UpdateProgramPresentationRequestSchema.safeParse(patch);
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      await this.getProgram(ctx, programId);
      const updated = await programRepo.updatePresentation(ctx, programId, {
        coverVariant: parsed.data.coverVariant,
        featured: parsed.data.featured,
        imageUrl: parsed.data.imageUrl ?? undefined,
        heroEyebrow: parsed.data.heroEyebrow ?? undefined,
        shortOutcome: parsed.data.shortOutcome ?? undefined,
        durationLabel: parsed.data.durationLabel ?? undefined,
        learningOutcomes: parsed.data.learningOutcomes,
      });
      return updated!;
    },

    async getWorkspaceProfile(ctx) {
      return profileRepo.getProfile(ctx);
    },

    async updateWorkspaceProfile(ctx, patch) {
      const parsed = UpdateWorkspaceProfileRequestSchema.safeParse(patch);
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }
      return profileRepo.updateProfile(ctx, {
        displayName: parsed.data.displayName,
        tagline: parsed.data.tagline ?? undefined,
        headline: parsed.data.headline ?? undefined,
        bio: parsed.data.bio ?? undefined,
        city: parsed.data.city ?? undefined,
        roleLabel: parsed.data.roleLabel ?? undefined,
        heroProgramId: parsed.data.heroProgramId ?? undefined,
        whatsappPhoneE164: parsed.data.whatsappPhoneE164 ?? undefined,
        avatarUrl: parsed.data.avatarUrl ?? undefined,
        logoUrl: parsed.data.logoUrl ?? undefined,
        stats: parsed.data.stats,
      });
    },
  };
}
