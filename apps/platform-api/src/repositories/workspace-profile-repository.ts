import { eq, and, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { workspaceProfiles, organizations, programs, WorkspaceProfileRow, NewWorkspaceProfileRow } from '../db/schema';
import type { OrganizationContext } from '../core/organization-context';
import type { PublicWorkspaceProfile } from '@promotor/contracts';

export interface WorkspaceProfileRepository {
  getProfile(ctx: OrganizationContext): Promise<PublicWorkspaceProfile>;
  updateProfile(
    ctx: OrganizationContext,
    patch: Partial<NewWorkspaceProfileRow>
  ): Promise<PublicWorkspaceProfile>;
}

export function createWorkspaceProfileRepository(db: NodePgDatabase): WorkspaceProfileRepository {
  async function loadProfile(ctx: OrganizationContext): Promise<PublicWorkspaceProfile> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId));

    if (!org) {
      throw new Error('Organization not found');
    }

    let [profileRow] = await db
      .select()
      .from(workspaceProfiles)
      .where(eq(workspaceProfiles.organizationId, ctx.organizationId));

    if (!profileRow) {
      // Upsert default profile
      [profileRow] = await db
        .insert(workspaceProfiles)
        .values({
          organizationId: ctx.organizationId,
          displayName: org.name,
          headline: 'Promotor Resmi STIFIn',
          tagline: 'Membantu keluarga memahami potensi genetik anak',
          bio: 'Praktisi dan konsultan STIFIn berpengalaman dalam pemetaan potensi dan bakat.',
          city: 'Jakarta',
          roleLabel: 'Licensed Promotor',
          stats: {
            familiesHelped: '100+',
            location: 'Jakarta',
          },
        })
        .returning();
    }

    const [publishedCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(programs)
      .where(
        and(
          eq(programs.organizationId, ctx.organizationId),
          eq(programs.status, 'published'),
          sql`${programs.programType} <> 'private'`,
          sql`${programs.accessType} <> 'private'`
        )
      );

    const programCount = publishedCountRes?.count ?? 0;

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
        programCount,
      },
    };
  }

  return {
    async getProfile(ctx) {
      return loadProfile(ctx);
    },

    async updateProfile(ctx, patch) {
      await db
        .insert(workspaceProfiles)
        .values({
          ...patch,
          organizationId: ctx.organizationId,
          displayName: patch.displayName ?? 'Promotor Workspace',
        })
        .onConflictDoUpdate({
          target: workspaceProfiles.organizationId,
          set: {
            ...patch,
            updatedAt: sql`now()`,
          },
        });

      return loadProfile(ctx);
    },
  };
}
