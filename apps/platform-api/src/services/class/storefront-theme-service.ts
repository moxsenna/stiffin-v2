import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  organizations,
  workspaceProfiles,
} from '../../db/schema';
import {
  StorefrontTheme,
  UpdateStorefrontThemeRequest,
  PublicStorefrontTheme,
  TALIRA_DEFAULT_STOREFRONT_THEME,
} from '@promotor/contracts';
import { DomainError } from '../../core/errors';

export interface StorefrontThemeService {
  getThemeByOrg(organizationId: string): Promise<StorefrontTheme>;
  updateTheme(organizationId: string, input: UpdateStorefrontThemeRequest): Promise<StorefrontTheme>;
  resetTheme(organizationId: string): Promise<StorefrontTheme>;
  getPublicTheme(organizationId: string): Promise<PublicStorefrontTheme>;
}

export function createStorefrontThemeService(db: NodePgDatabase<any>): StorefrontThemeService {
  return {
    async getThemeByOrg(organizationId: string): Promise<StorefrontTheme> {
      const [profile] = await db
        .select()
        .from(workspaceProfiles)
        .where(eq(workspaceProfiles.organizationId, organizationId))
        .limit(1);

      const statsTheme = (profile?.stats as any)?.storefrontTheme;
      if (statsTheme) {
        return {
          ...TALIRA_DEFAULT_STOREFRONT_THEME,
          ...statsTheme,
          organizationId,
          brandName: statsTheme.brandName || profile?.displayName || 'Talira Class',
          tagline: statsTheme.tagline ?? profile?.tagline ?? null,
          logoUrl: statsTheme.logoUrl ?? profile?.logoUrl ?? null,
          createdAt: profile?.createdAt || new Date().toISOString(),
          updatedAt: statsTheme.updatedAt || profile?.updatedAt || new Date().toISOString(),
        };
      }

      return {
        ...TALIRA_DEFAULT_STOREFRONT_THEME,
        organizationId,
        brandName: profile?.displayName || 'Talira Class',
        tagline: profile?.tagline || null,
        logoUrl: profile?.logoUrl || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },

    async updateTheme(organizationId: string, input: UpdateStorefrontThemeRequest): Promise<StorefrontTheme> {
      // Validate organization exists
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org) {
        throw new DomainError('NOT_FOUND', 'Organization tidak ditemukan');
      }

      // Persist to workspaceProfiles (100% reliable across all environments and poolers)
      const [existingProfile] = await db
        .select()
        .from(workspaceProfiles)
        .where(eq(workspaceProfiles.organizationId, organizationId))
        .limit(1);

      const currentStats = (existingProfile?.stats as any) || {};
      const updatedStats = {
        ...currentStats,
        storefrontTheme: {
          ...input,
          updatedAt: new Date().toISOString(),
        },
      };

      if (existingProfile) {
        await db
          .update(workspaceProfiles)
          .set({
            displayName: input.brandName,
            tagline: input.tagline ?? existingProfile.tagline,
            logoUrl: input.logoUrl ?? existingProfile.logoUrl,
            stats: updatedStats,
            updatedAt: sql`now()`,
          })
          .where(eq(workspaceProfiles.organizationId, organizationId));
      } else {
        await db.insert(workspaceProfiles).values({
          organizationId,
          displayName: input.brandName,
          tagline: input.tagline ?? null,
          logoUrl: input.logoUrl ?? null,
          stats: updatedStats,
        });
      }

      return this.getThemeByOrg(organizationId);
    },

    async resetTheme(organizationId: string): Promise<StorefrontTheme> {
      const [profile] = await db
        .select({
          displayName: workspaceProfiles.displayName,
          tagline: workspaceProfiles.tagline,
          logoUrl: workspaceProfiles.logoUrl,
        })
        .from(workspaceProfiles)
        .where(eq(workspaceProfiles.organizationId, organizationId))
        .limit(1);

      const defaultName = profile?.displayName || 'Talira Class';
      return this.updateTheme(organizationId, {
        ...TALIRA_DEFAULT_STOREFRONT_THEME,
        brandName: defaultName,
        tagline: profile?.tagline || null,
        logoUrl: profile?.logoUrl || null,
      });
    },

    async getPublicTheme(organizationId: string): Promise<PublicStorefrontTheme> {
      const theme = await this.getThemeByOrg(organizationId);
      return {
        brandName: theme.brandName,
        tagline: theme.tagline,
        logoUrl: theme.logoUrl,
        primaryColor: theme.primaryColor,
        accentColor: theme.accentColor,
        backgroundColor: theme.backgroundColor,
        surfaceColor: theme.surfaceColor,
        textColor: theme.textColor,
        mutedTextColor: theme.mutedTextColor,
        stylePreset: theme.stylePreset,
        fontPreset: theme.fontPreset,
        radiusPreset: theme.radiusPreset,
        buttonPreset: theme.buttonPreset,
        layoutPreset: theme.layoutPreset,
        heroAlignment: theme.heroAlignment,
      };
    },
  };
}
