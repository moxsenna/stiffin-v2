import { eq, and, sql, inArray, desc, asc, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  programs,
  modules,
  lessons,
  lessonAttachments,
  programPresentations,
  organizations,
  ProgramRow,
  NewProgramRow,
  ModuleRow,
  NewModuleRow,
  LessonRow,
  NewLessonRow,
  LessonAttachmentRow,
  NewLessonAttachmentRow,
  ProgramPresentationRow,
  NewProgramPresentationRow,
} from '../db/schema';
import type { OrganizationContext } from '../core/organization-context';
import type { Program, Module, Lesson, LessonAttachment, ProgramPublicPresentation } from '@promotor/contracts';

export interface ProgramRepository {
  list(ctx: OrganizationContext, opts?: { includeArchived?: boolean }): Promise<Program[]>;
  findById(ctx: OrganizationContext, id: string): Promise<Program | null>;
  findBySlug(ctx: OrganizationContext, slug: string): Promise<Program | null>;
  countBySlug(ctx: OrganizationContext, slug: string): Promise<number>;
  create(
    ctx: OrganizationContext,
    programInput: Omit<NewProgramRow, 'organizationId'>,
    presentationInput?: Partial<NewProgramPresentationRow>
  ): Promise<Program>;
  update(ctx: OrganizationContext, id: string, patch: Partial<ProgramRow>): Promise<Program | null>;
  deleteProgram(ctx: OrganizationContext, programId: string): Promise<void>;
  setStatus(ctx: OrganizationContext, id: string, status: string, publishedAt?: string | null): Promise<Program | null>;
  getPresentation(ctx: OrganizationContext, programId: string): Promise<ProgramPublicPresentation | null>;
  updatePresentation(
    ctx: OrganizationContext,
    programId: string,
    patch: Partial<NewProgramPresentationRow>
  ): Promise<ProgramPublicPresentation | null>;
  addModule(ctx: OrganizationContext, programId: string, title: string): Promise<Program>;
  updateModule(ctx: OrganizationContext, programId: string, moduleId: string, title: string): Promise<Program>;
  deleteModule(ctx: OrganizationContext, programId: string, moduleId: string): Promise<Program>;
  reorderModules(ctx: OrganizationContext, programId: string, orderedModuleIds: string[]): Promise<Program>;
  addLesson(
    ctx: OrganizationContext,
    programId: string,
    moduleId: string,
    input: { title: string; videoProvider?: string | null; videoUrl?: string | null; videoExternalId?: string | null }
  ): Promise<Program>;
  saveLesson(
    ctx: OrganizationContext,
    programId: string,
    moduleId: string,
    lessonId: string,
    lessonPatch: Partial<LessonRow>,
    attachments?: Array<Omit<NewLessonAttachmentRow, 'lessonId'>>
  ): Promise<Program>;
  deleteLesson(ctx: OrganizationContext, programId: string, moduleId: string, lessonId: string): Promise<Program>;
  reorderLessons(
    ctx: OrganizationContext,
    programId: string,
    moduleId: string,
    orderedLessonIds: string[]
  ): Promise<Program>;
}

export function createProgramRepository(db: NodePgDatabase): ProgramRepository {
  async function loadFullProgram(ctx: OrganizationContext, programId: string): Promise<Program | null> {
    const [progRow] = await db
      .select({
        program: programs,
        orgSlug: organizations.slug,
        presentation: programPresentations,
      })
      .from(programs)
      .innerJoin(organizations, eq(programs.organizationId, organizations.id))
      .leftJoin(programPresentations, eq(programs.id, programPresentations.programId))
      .where(and(eq(programs.id, programId), eq(programs.organizationId, ctx.organizationId)));

    if (!progRow) return null;

    const moduleRows = await db
      .select()
      .from(modules)
      .where(eq(modules.programId, programId))
      .orderBy(asc(modules.order));

    const moduleIds = moduleRows.map((m) => m.id);
    let lessonRows: LessonRow[] = [];
    let attachmentRows: LessonAttachmentRow[] = [];

    if (moduleIds.length > 0) {
      lessonRows = await db
        .select()
        .from(lessons)
        .where(inArray(lessons.moduleId, moduleIds))
        .orderBy(asc(lessons.order));

      const lessonIds = lessonRows.map((l) => l.id);
      if (lessonIds.length > 0) {
        attachmentRows = await db
          .select()
          .from(lessonAttachments)
          .where(inArray(lessonAttachments.lessonId, lessonIds))
          .orderBy(asc(lessonAttachments.order));
      }
    }

    const attachmentsByLesson = new Map<string, LessonAttachment[]>();
    for (const att of attachmentRows) {
      const list = attachmentsByLesson.get(att.lessonId) ?? [];
      list.push({
        id: att.id,
        name: att.name,
        url: att.url,
        sizeFormatted: att.sizeFormatted ?? undefined,
        kind: att.kind as 'image' | 'download',
        order: att.order,
      });
      attachmentsByLesson.set(att.lessonId, list);
    }

    const lessonsByModule = new Map<string, Lesson[]>();
    for (const les of lessonRows) {
      const list = lessonsByModule.get(les.moduleId) ?? [];
      list.push({
        id: les.id,
        moduleId: les.moduleId,
        title: les.title,
        order: les.order,
        textContent: les.textContent ?? undefined,
        videoProvider: les.videoProvider as 'youtube' | undefined,
        videoYoutubeUrl: les.videoUrl ?? undefined,
        videoExternalId: les.videoExternalId ?? undefined,
        attachments: attachmentsByLesson.get(les.id) ?? [],
        hasReflection: !!(les.reflectionType && les.reflectionPrompt),
        reflectionType: les.reflectionType as any,
        reflectionPrompt: les.reflectionPrompt ?? undefined,
        reflectionOptions: les.reflectionOptions ?? undefined,
        hasCta: !!(les.ctaType && les.ctaLabel),
        ctaType: les.ctaType as any,
        ctaLabel: les.ctaLabel ?? undefined,
        ctaTargetProgramId: les.ctaTargetProgramId ?? undefined,
        ctaConfig: les.ctaConfig ?? undefined,
      });
      lessonsByModule.set(les.moduleId, list);
    }

    const fullModules: Module[] = moduleRows.map((m) => ({
      id: m.id,
      programId: m.programId,
      title: m.title,
      order: m.order,
      lessons: lessonsByModule.get(m.id) ?? [],
    }));

    const pres = progRow.presentation;
    const presentationMapped: ProgramPublicPresentation | null = pres
      ? {
          coverVariant: pres.coverVariant as any,
          featured: pres.featured,
          imageUrl: pres.imageUrl ?? undefined,
          heroEyebrow: pres.heroEyebrow ?? undefined,
          shortOutcome: pres.shortOutcome ?? undefined,
          durationLabel: pres.durationLabel ?? undefined,
          learningOutcomes: pres.learningOutcomes ?? [],
        }
      : null;

    return {
      id: progRow.program.id,
      organizationId: progRow.program.organizationId,
      workspaceSlug: progRow.orgSlug,
      programSlug: progRow.program.slug,
      title: progRow.program.title,
      subtitle: progRow.program.subtitle ?? undefined,
      description: progRow.program.description ?? undefined,
      programType: progRow.program.programType as any,
      accessType: progRow.program.accessType as any,
      status: progRow.program.status as any,
      pricing: progRow.program.pricing as any,
      priceAmount: progRow.program.priceAmount,
      publishedAt: progRow.program.publishedAt ?? undefined,
      presentation: presentationMapped,
      modules: fullModules,
      createdAt: progRow.program.createdAt,
      updatedAt: progRow.program.updatedAt,
    };
  }

  return {
    async list(ctx, opts) {
      const conditions = [eq(programs.organizationId, ctx.organizationId)];
      if (!opts?.includeArchived) {
        conditions.push(sql`${programs.status} <> 'archived'`);
      }

      const rows = await db
        .select({
          program: programs,
          orgSlug: organizations.slug,
          presentation: programPresentations,
        })
        .from(programs)
        .innerJoin(organizations, eq(programs.organizationId, organizations.id))
        .leftJoin(programPresentations, eq(programs.id, programPresentations.programId))
        .where(and(...conditions))
        .orderBy(desc(programs.createdAt));

      if (rows.length === 0) return [];

      // For listing, load module counts / structure
      const progs: Program[] = [];
      for (const r of rows) {
        const full = await loadFullProgram(ctx, r.program.id);
        if (full) progs.push(full);
      }
      return progs;
    },

    async findById(ctx, id) {
      return loadFullProgram(ctx, id);
    },

    async findBySlug(ctx, slug) {
      const [row] = await db
        .select({ id: programs.id })
        .from(programs)
        .where(and(eq(programs.organizationId, ctx.organizationId), eq(programs.slug, slug)));
      if (!row) return null;
      return loadFullProgram(ctx, row.id);
    },

    async countBySlug(ctx, slug) {
      const [res] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(programs)
        .where(and(eq(programs.organizationId, ctx.organizationId), sql`${programs.slug} LIKE ${slug + '%'}`));
      return res?.count ?? 0;
    },

    async create(ctx, programInput, presentationInput) {
      return db.transaction(async (tx) => {
        const [createdProgram] = await tx
          .insert(programs)
          .values({
            ...programInput,
            organizationId: ctx.organizationId,
          })
          .returning();

        await tx.insert(programPresentations).values({
          programId: createdProgram.id,
          coverVariant: presentationInput?.coverVariant ?? 'cover-a',
          featured: presentationInput?.featured ?? false,
          imageUrl: presentationInput?.imageUrl ?? null,
          heroEyebrow: presentationInput?.heroEyebrow ?? null,
          shortOutcome: presentationInput?.shortOutcome ?? null,
          durationLabel: presentationInput?.durationLabel ?? null,
          learningOutcomes: presentationInput?.learningOutcomes ?? [],
        });

        // Create initial starter module + lesson
        const [starterMod] = await tx
          .insert(modules)
          .values({
            programId: createdProgram.id,
            title: 'Modul 1: Pengenalan',
            order: 1,
          })
          .returning();

        const [starterLesson] = await tx
          .insert(lessons)
          .values({
            moduleId: starterMod.id,
            title: 'Pelajaran 1: Selamat Datang',
            order: 1,
            textContent: 'Selamat datang di program ini. Silakan ikuti materi dengan seksama.',
          })
          .returning();

        const [org] = await tx.select().from(organizations).where(eq(organizations.id, ctx.organizationId));

        return {
          id: createdProgram.id,
          organizationId: createdProgram.organizationId,
          workspaceSlug: org.slug,
          programSlug: createdProgram.slug,
          title: createdProgram.title,
          subtitle: createdProgram.subtitle ?? undefined,
          description: createdProgram.description ?? undefined,
          programType: createdProgram.programType as any,
          accessType: createdProgram.accessType as any,
          status: createdProgram.status as any,
          pricing: createdProgram.pricing as any,
          priceAmount: createdProgram.priceAmount,
          publishedAt: createdProgram.publishedAt ?? undefined,
          presentation: {
            coverVariant: (presentationInput?.coverVariant ?? 'cover-a') as any,
            featured: presentationInput?.featured ?? false,
            imageUrl: presentationInput?.imageUrl ?? undefined,
            heroEyebrow: presentationInput?.heroEyebrow ?? undefined,
            shortOutcome: presentationInput?.shortOutcome ?? undefined,
            durationLabel: presentationInput?.durationLabel ?? undefined,
            learningOutcomes: presentationInput?.learningOutcomes ?? [],
          },
          modules: [
            {
              id: starterMod.id,
              programId: starterMod.programId,
              title: starterMod.title,
              order: starterMod.order,
              lessons: [
                {
                  id: starterLesson.id,
                  moduleId: starterMod.id,
                  title: 'Pelajaran 1: Selamat Datang',
                  order: 1,
                  textContent: 'Selamat datang di program ini. Silakan ikuti materi dengan seksama.',
                  attachments: [],
                },
              ],
            },
          ],
          createdAt: createdProgram.createdAt,
          updatedAt: createdProgram.updatedAt,
        };
      });
    },

    async update(ctx, id, patch) {
      const [updated] = await db
        .update(programs)
        .set({ ...patch, updatedAt: sql`now()` })
        .where(and(eq(programs.id, id), eq(programs.organizationId, ctx.organizationId)))
        .returning();

      if (!updated) return null;
      return loadFullProgram(ctx, id);
    },

    async setStatus(ctx, id, status, publishedAt) {
      const patch: Partial<ProgramRow> = {
        status,
        updatedAt: sql`now()` as any,
      };
      if (publishedAt !== undefined) {
        patch.publishedAt = publishedAt;
      }
      const [updated] = await db
        .update(programs)
        .set(patch)
        .where(and(eq(programs.id, id), eq(programs.organizationId, ctx.organizationId)))
        .returning();

      if (!updated) return null;
      return loadFullProgram(ctx, id);
    },

    async getPresentation(ctx, programId) {
      const prog = await loadFullProgram(ctx, programId);
      return prog?.presentation ?? null;
    },

    async updatePresentation(ctx, programId, patch) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) return null;

      const [updated] = await db
        .insert(programPresentations)
        .values({
          programId,
          coverVariant: patch.coverVariant ?? 'cover-a',
          featured: patch.featured ?? false,
          imageUrl: patch.imageUrl ?? null,
          heroEyebrow: patch.heroEyebrow ?? null,
          shortOutcome: patch.shortOutcome ?? null,
          durationLabel: patch.durationLabel ?? null,
          learningOutcomes: patch.learningOutcomes ?? [],
        })
        .onConflictDoUpdate({
          target: programPresentations.programId,
          set: {
            ...patch,
            updatedAt: sql`now()`,
          },
        })
        .returning();

      return {
        coverVariant: updated.coverVariant as any,
        featured: updated.featured,
        imageUrl: updated.imageUrl ?? undefined,
        heroEyebrow: updated.heroEyebrow ?? undefined,
        shortOutcome: updated.shortOutcome ?? undefined,
        durationLabel: updated.durationLabel ?? undefined,
        learningOutcomes: updated.learningOutcomes ?? [],
      };
    },

    async addModule(ctx, programId, title) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) throw new Error('Program not found');

      const nextOrder = prog.modules.length + 1;
      await db.insert(modules).values({
        programId,
        title,
        order: nextOrder,
      });

      const updated = await loadFullProgram(ctx, programId);
      return updated!;
    },

    async updateModule(ctx, programId, moduleId, title) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) throw new Error('Program not found');

      await db
        .update(modules)
        .set({ title, updatedAt: sql`now()` })
        .where(and(eq(modules.id, moduleId), eq(modules.programId, programId)));

      const updated = await loadFullProgram(ctx, programId);
      return updated!;
    },

    async deleteModule(ctx, programId, moduleId) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) throw new Error('Program not found');

      await db.transaction(async (tx) => {
        await tx.delete(modules).where(and(eq(modules.id, moduleId), eq(modules.programId, programId)));

        // Re-sequence remaining modules
        const remaining = await tx
          .select()
          .from(modules)
          .where(eq(modules.programId, programId))
          .orderBy(asc(modules.order));

        for (let i = 0; i < remaining.length; i++) {
          await tx
            .update(modules)
            .set({ order: i + 10000 })
            .where(eq(modules.id, remaining[i].id));
        }
        for (let i = 0; i < remaining.length; i++) {
          await tx
            .update(modules)
            .set({ order: i + 1 })
            .where(eq(modules.id, remaining[i].id));
        }
      });

      const updated = await loadFullProgram(ctx, programId);
      return updated!;
    },

    async reorderModules(ctx, programId, orderedModuleIds) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) throw new Error('Program not found');

      await db.transaction(async (tx) => {
        // Two-phase reorder: shift with high offset, then assign 1..N
        for (let i = 0; i < orderedModuleIds.length; i++) {
          await tx
            .update(modules)
            .set({ order: i + 10000 })
            .where(and(eq(modules.id, orderedModuleIds[i]), eq(modules.programId, programId)));
        }
        for (let i = 0; i < orderedModuleIds.length; i++) {
          await tx
            .update(modules)
            .set({ order: i + 1 })
            .where(and(eq(modules.id, orderedModuleIds[i]), eq(modules.programId, programId)));
        }
      });

      const updated = await loadFullProgram(ctx, programId);
      return updated!;
    },

    async addLesson(ctx, programId, moduleId, input) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) throw new Error('Program not found');

      const targetMod = prog.modules.find((m) => m.id === moduleId);
      if (!targetMod) throw new Error('Module not found');

      const nextOrder = targetMod.lessons.length + 1;
      await db.insert(lessons).values({
        moduleId,
        title: input.title,
        order: nextOrder,
        videoProvider: input.videoProvider ?? null,
        videoUrl: input.videoUrl ?? null,
        videoExternalId: input.videoExternalId ?? null,
      });

      const updated = await loadFullProgram(ctx, programId);
      return updated!;
    },

    async saveLesson(ctx, programId, moduleId, lessonId, lessonPatch, attachments) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) throw new Error('Program not found');

      await db.transaction(async (tx) => {
        const updateValues: Record<string, any> = { updatedAt: sql`now()` };
        for (const [key, val] of Object.entries(lessonPatch)) {
          if (val !== undefined) {
            updateValues[key] = val;
          }
        }
        await tx
          .update(lessons)
          .set(updateValues)
          .where(and(eq(lessons.id, lessonId), eq(lessons.moduleId, moduleId)));

        if (attachments !== undefined) {
          await tx.delete(lessonAttachments).where(eq(lessonAttachments.lessonId, lessonId));
          if (attachments.length > 0) {
            await tx.insert(lessonAttachments).values(
              attachments.map((att, idx) => ({
                lessonId,
                name: att.name,
                url: att.url,
                sizeFormatted: att.sizeFormatted ?? null,
                kind: att.kind,
                order: att.order ?? idx + 1,
              }))
            );
          }
        }
      });

      const updated = await loadFullProgram(ctx, programId);
      return updated!;
    },

    async deleteLesson(ctx, programId, moduleId, lessonId) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) throw new Error('Program not found');

      await db.transaction(async (tx) => {
        await tx.delete(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.moduleId, moduleId)));

        const remaining = await tx
          .select()
          .from(lessons)
          .where(eq(lessons.moduleId, moduleId))
          .orderBy(asc(lessons.order));

        for (let i = 0; i < remaining.length; i++) {
          await tx
            .update(lessons)
            .set({ order: i + 10000 })
            .where(eq(lessons.id, remaining[i].id));
        }
        for (let i = 0; i < remaining.length; i++) {
          await tx
            .update(lessons)
            .set({ order: i + 1 })
            .where(eq(lessons.id, remaining[i].id));
        }
      });

      const updated = await loadFullProgram(ctx, programId);
      return updated!;
    },

    async reorderLessons(ctx, programId, moduleId, orderedLessonIds) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) throw new Error('Program not found');

      await db.transaction(async (tx) => {
        for (let i = 0; i < orderedLessonIds.length; i++) {
          await tx
            .update(lessons)
            .set({ order: i + 10000 })
            .where(and(eq(lessons.id, orderedLessonIds[i]), eq(lessons.moduleId, moduleId)));
        }
        for (let i = 0; i < orderedLessonIds.length; i++) {
          await tx
            .update(lessons)
            .set({ order: i + 1 })
            .where(and(eq(lessons.id, orderedLessonIds[i]), eq(lessons.moduleId, moduleId)));
        }
      });

      const updated = await loadFullProgram(ctx, programId);
      return updated!;
    },

    async deleteProgram(ctx, programId) {
      const prog = await loadFullProgram(ctx, programId);
      if (!prog) throw new Error('Program not found');

      await db
        .delete(programs)
        .where(and(eq(programs.id, programId), eq(programs.organizationId, ctx.organizationId)));
    },
  };
}
