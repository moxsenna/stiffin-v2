import { eq, and, sql, isNull, asc, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  organizations,
  programs,
  modules,
  lessons,
  lessonAttachments,
  programPresentations,
  workspaceProfiles,
  LessonRow,
  LessonAttachmentRow,
} from '../db/schema';
import type {
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
  Program,
  Module,
  Lesson,
  LessonAttachment,
  ProgramPublicPresentation,
} from '@promotor/contracts';

export interface PublicContentRepository {
  getPublicWorkspaceProfile(workspaceSlug: string): Promise<PublicWorkspaceProfile | null>;
  getPublicProgramCatalog(workspaceSlug: string): Promise<PublicProgramCatalogItem[]>;
  getPublicProgramDetail(workspaceSlug: string, programSlug: string): Promise<PublicProgramDetail | null>;
}

export function createPublicContentRepository(db: NodePgDatabase): PublicContentRepository {
  async function resolveActiveOrg(workspaceSlug: string) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.slug, workspaceSlug), isNull(organizations.deletedAt)));
    return org ?? null;
  }

  function computeRegistrationNotice(program: {
    programType: string;
    accessType: string;
    pricing: string;
  }): { isAllowed: boolean; notice?: string } {
    if (program.programType === 'lead_magnet' && program.accessType === 'public' && program.pricing === 'free') {
      return { isAllowed: true };
    }
    if (program.programType === 'aftersales') {
      return { isAllowed: false, notice: 'Program ini khusus alumni/klien sesi STIFIn.' };
    }
    if (program.programType === 'paid') {
      return { isAllowed: false, notice: 'Pendaftaran berbayar melalui promotor.' };
    }
    if (program.programType === 'challenge') {
      return { isAllowed: false, notice: 'Pendaftaran periode terbatas.' };
    }
    return { isAllowed: false, notice: 'Pendaftaran langsung tidak tersedia.' };
  }

  async function loadFullProgramData(orgId: string, orgSlug: string, progRow: any): Promise<Program> {
    const programId = progRow.id;
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

    return {
      id: progRow.id,
      organizationId: orgId,
      workspaceSlug: orgSlug,
      programSlug: progRow.slug,
      title: progRow.title,
      subtitle: progRow.subtitle ?? undefined,
      description: progRow.description ?? undefined,
      programType: progRow.programType as any,
      accessType: progRow.accessType as any,
      status: progRow.status as any,
      pricing: progRow.pricing as any,
      priceAmount: progRow.priceAmount,
      publishedAt: progRow.publishedAt ?? undefined,
      modules: fullModules,
      createdAt: progRow.createdAt,
      updatedAt: progRow.updatedAt,
    };
  }

  return {
    async getPublicWorkspaceProfile(workspaceSlug) {
      const org = await resolveActiveOrg(workspaceSlug);
      if (!org) return null;

      let [profileRow] = await db
        .select()
        .from(workspaceProfiles)
        .where(eq(workspaceProfiles.organizationId, org.id));

      if (!profileRow) {
        // Return computed default for active org
        profileRow = {
          id: 'default',
          organizationId: org.id,
          displayName: org.name,
          headline: 'Promotor Resmi STIFIn',
          tagline: 'Membantu keluarga memahami potensi genetik anak',
          bio: 'Praktisi dan konsultan STIFIn berpengalaman dalam pemetaan potensi dan bakat.',
          city: 'Jakarta',
          roleLabel: 'Licensed Promotor',
          whatsappPhoneE164: null,
          avatarUrl: null,
          logoUrl: null,
          heroProgramId: null,
          stats: {
            familiesHelped: '100+',
            location: 'Jakarta',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const [publishedCountRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(programs)
        .where(
          and(
            eq(programs.organizationId, org.id),
            eq(programs.status, 'published'),
            sql`${programs.programType} <> 'private'`,
            sql`${programs.accessType} <> 'private'`
          )
        );

      return {
        workspaceSlug: org.slug,
        displayName: profileRow.displayName,
        tagline: profileRow.tagline ?? undefined,
        headline: profileRow.headline ?? undefined,
        bio: profileRow.bio ?? undefined,
        city: profileRow.city ?? undefined,
        roleLabel: profileRow.roleLabel ?? undefined,
        heroProgramId: profileRow.heroProgramId ?? null,
        whatsappPhoneE164: profileRow.whatsappPhoneE164 ?? undefined,
        avatarUrl: profileRow.avatarUrl ?? undefined,
        logoUrl: profileRow.logoUrl ?? undefined,
        stats: {
          familiesHelped: profileRow.stats.familiesHelped,
          location: profileRow.stats.location,
          programCount: publishedCountRes?.count ?? 0,
        },
      };
    },

    async getPublicProgramCatalog(workspaceSlug) {
      const org = await resolveActiveOrg(workspaceSlug);
      if (!org) return [];

      const rows = await db
        .select({
          program: programs,
          presentation: programPresentations,
        })
        .from(programs)
        .leftJoin(programPresentations, eq(programs.id, programPresentations.programId))
        .where(
          and(
            eq(programs.organizationId, org.id),
            eq(programs.status, 'published'),
            sql`${programs.programType} <> 'private'`,
            sql`${programs.accessType} <> 'private'`
          )
        )
        .orderBy(asc(programs.title));

      const catalog: PublicProgramCatalogItem[] = [];
      for (const r of rows) {
        const fullProg = await loadFullProgramData(org.id, org.slug, r.program);
        const pres = r.presentation;
        const presentationMapped: ProgramPublicPresentation = {
          coverVariant: (pres?.coverVariant as any) ?? 'cover-a',
          featured: pres?.featured ?? false,
          imageUrl: pres?.imageUrl ?? undefined,
          heroEyebrow: pres?.heroEyebrow ?? undefined,
          shortOutcome: pres?.shortOutcome ?? undefined,
          durationLabel: pres?.durationLabel ?? undefined,
          learningOutcomes: pres?.learningOutcomes ?? [],
        };
        const reg = computeRegistrationNotice(r.program);

        catalog.push({
          program: fullProg,
          presentation: presentationMapped,
          isRegistrationAllowed: reg.isAllowed,
          registrationStatusNotice: reg.notice,
        });
      }

      return catalog;
    },

    async getPublicProgramDetail(workspaceSlug, programSlug) {
      const org = await resolveActiveOrg(workspaceSlug);
      if (!org) return null;

      const [row] = await db
        .select({
          program: programs,
          presentation: programPresentations,
        })
        .from(programs)
        .leftJoin(programPresentations, eq(programs.id, programPresentations.programId))
        .where(
          and(
            eq(programs.organizationId, org.id),
            eq(programs.slug, programSlug),
            eq(programs.status, 'published'),
            sql`${programs.programType} <> 'private'`,
            sql`${programs.accessType} <> 'private'`
          )
        );

      if (!row) return null;

      const fullProg = await loadFullProgramData(org.id, org.slug, row.program);
      const pres = row.presentation;
      const presentationMapped: ProgramPublicPresentation = {
        coverVariant: (pres?.coverVariant as any) ?? 'cover-a',
        featured: pres?.featured ?? false,
        imageUrl: pres?.imageUrl ?? undefined,
        heroEyebrow: pres?.heroEyebrow ?? undefined,
        shortOutcome: pres?.shortOutcome ?? undefined,
        durationLabel: pres?.durationLabel ?? undefined,
        learningOutcomes: pres?.learningOutcomes ?? [],
      };

      const promoterProfile = (await this.getPublicWorkspaceProfile(workspaceSlug))!;
      const reg = computeRegistrationNotice(row.program);

      return {
        program: fullProg,
        presentation: presentationMapped,
        promoter: promoterProfile,
        isRegistrationAllowed: reg.isAllowed,
        registrationStatusNotice: reg.notice,
      };
    },
  };
}
