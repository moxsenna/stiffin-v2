import { eq, and, sql, isNull, asc, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  organizations,
  programs,
  modules,
  lessons,
  programPresentations,
  workspaceProfiles,
} from '../db/schema';
import type {
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
  PublicProgramSummary,
  PublicModulePreview,
  PublicLessonPreview,
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

  async function loadPublicProgramSummary(orgSlug: string, progRow: any): Promise<PublicProgramSummary> {
    const programId = progRow.id;

    // Get module IDs and count
    const moduleRows = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.programId, programId));

    const moduleIds = moduleRows.map((m) => m.id);
    let totalLessonsCount = 0;

    if (moduleIds.length > 0) {
      const [lessonCountRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(lessons)
        .where(inArray(lessons.moduleId, moduleIds));
      totalLessonsCount = lessonCountRes?.count ?? 0;
    }

    return {
      id: progRow.id,
      workspaceSlug: orgSlug,
      programSlug: progRow.slug,
      title: progRow.title,
      subtitle: progRow.subtitle ?? undefined,
      description: progRow.description ?? undefined,
      programType: progRow.programType as any,
      accessType: progRow.accessType as any,
      pricing: progRow.pricing as any,
      priceAmount: progRow.priceAmount,
      publishedAt: progRow.publishedAt ?? undefined,
      totalModulesCount: moduleRows.length,
      totalLessonsCount,
    };
  }

  async function loadPublicProgramDetailData(orgSlug: string, progRow: any): Promise<PublicProgramSummary & { modules: PublicModulePreview[] }> {
    const programId = progRow.id;

    // Only select preview metadata: id, title, order
    const moduleRows = await db
      .select({
        id: modules.id,
        title: modules.title,
        order: modules.order,
      })
      .from(modules)
      .where(eq(modules.programId, programId))
      .orderBy(asc(modules.order));

    const moduleIds = moduleRows.map((m) => m.id);
    const lessonsByModule = new Map<string, PublicLessonPreview[]>();

    let totalLessonsCount = 0;

    if (moduleIds.length > 0) {
      // Secure projection: strictly select preview fields and boolean indicators only.
      // NEVER leak text_content, video_url, video_external_id, reflection_prompt, reflection_options, cta_config, or attachments!
      const lessonRows = await db
        .select({
          id: lessons.id,
          moduleId: lessons.moduleId,
          title: lessons.title,
          order: lessons.order,
          hasVideo: sql<boolean>`(${lessons.videoUrl} IS NOT NULL OR ${lessons.videoExternalId} IS NOT NULL)`,
          hasReflection: sql<boolean>`(${lessons.reflectionType} IS NOT NULL AND ${lessons.reflectionPrompt} IS NOT NULL)`,
        })
        .from(lessons)
        .where(inArray(lessons.moduleId, moduleIds))
        .orderBy(asc(lessons.order));

      totalLessonsCount = lessonRows.length;

      for (const les of lessonRows) {
        const list = lessonsByModule.get(les.moduleId) ?? [];
        list.push({
          id: les.id,
          title: les.title,
          order: les.order,
          hasVideo: les.hasVideo,
          hasReflection: les.hasReflection,
        });
        lessonsByModule.set(les.moduleId, list);
      }
    }

    const previewModules: PublicModulePreview[] = moduleRows.map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      lessons: lessonsByModule.get(m.id) ?? [],
    }));

    return {
      id: progRow.id,
      workspaceSlug: orgSlug,
      programSlug: progRow.slug,
      title: progRow.title,
      subtitle: progRow.subtitle ?? undefined,
      description: progRow.description ?? undefined,
      programType: progRow.programType as any,
      accessType: progRow.accessType as any,
      pricing: progRow.pricing as any,
      priceAmount: progRow.priceAmount,
      publishedAt: progRow.publishedAt ?? undefined,
      totalModulesCount: moduleRows.length,
      totalLessonsCount,
      modules: previewModules,
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
        const progSummary = await loadPublicProgramSummary(org.slug, r.program);
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
          program: progSummary,
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

      const progDetail = await loadPublicProgramDetailData(org.slug, row.program);
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
        program: progDetail,
        presentation: presentationMapped,
        promoter: promoterProfile,
        isRegistrationAllowed: reg.isAllowed,
        registrationStatusNotice: reg.notice,
      };
    },
  };
}
