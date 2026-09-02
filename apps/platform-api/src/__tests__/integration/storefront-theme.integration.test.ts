import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { sql, eq } from 'drizzle-orm';
import {
  applyMigrationsAsOwner,
  TEST_DATABASE_URL,
  withIntegrationDb,
  withOwnerSql,
} from './test-env';
import {
  organizations,
  users,
  productEntitlements,
  workspaceProfiles,
  storefrontThemes,
} from '../../db/schema';
import { createStorefrontThemeService } from '../../services/class/storefront-theme-service';
import { createPublicContentRepository } from '../../repositories/public-content-repository';
import { createPublicContentService } from '../../services/public-content-service';
import { createApp } from '../../app';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';
import { TALIRA_DEFAULT_STOREFRONT_THEME, STYLE_PRESET_TOKENS } from '@promotor/contracts';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'theme-integration-test-secret-0123456789',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

async function signInCookie(auth: ReturnType<typeof createAuth>, email: string) {
  const res = await auth.handler(
    new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    })
  );
  return res.headers.get('set-cookie') ?? '';
}

describe('Storefront Brand Customization — Integration Tests', { skip: !enabled }, () => {
  before(async () => {
    if (!enabled) return;
    await applyMigrationsAsOwner();
  });

  it('1. Service provides default theme when no custom theme is stored in DB', async () => {
    await withIntegrationDb(async (db) => {
      const orgId = crypto.randomUUID();
      await db.insert(organizations).values({
        id: orgId,
        name: 'Coach Budi Academy',
        slug: `coach-budi-${Date.now()}`,
      });

      await db.insert(workspaceProfiles).values({
        organizationId: orgId,
        displayName: 'Coach Budi',
        tagline: 'Life & Career Coach',
      });

      const service = createStorefrontThemeService(db as any);
      const theme = await service.getThemeByOrg(orgId);

      assert.equal(theme.brandName, 'Coach Budi');
      assert.equal(theme.primaryColor, TALIRA_DEFAULT_STOREFRONT_THEME.primaryColor);
      assert.equal(theme.accentColor, TALIRA_DEFAULT_STOREFRONT_THEME.accentColor);
      assert.equal(theme.stylePreset, 'MODERNIST');
    });
  });

  it('2. Updates and persists tenant theme in DB', async () => {
    await withIntegrationDb(async (db) => {
      const orgId = crypto.randomUUID();
      await db.insert(organizations).values({
        id: orgId,
        name: 'Studio Rina',
        slug: `studio-rina-${Date.now()}`,
      });

      await db.insert(workspaceProfiles).values({
        organizationId: orgId,
        displayName: 'Rina Studio',
      });

      const service = createStorefrontThemeService(db as any);
      const updated = await service.updateTheme(orgId, {
        brandName: 'Rina Learning Studio',
        tagline: 'Edukasi Karakter Remaja',
        logoUrl: 'https://example.com/logo-rina.png',
        primaryColor: '#1e293b',
        accentColor: '#e11d48',
        backgroundColor: '#f8fafc',
        surfaceColor: '#ffffff',
        textColor: '#0f172a',
        mutedTextColor: '#64748b',
        stylePreset: 'SOFT',
        fontPreset: 'MANROPE',
        radiusPreset: 'ROUNDED',
        buttonPreset: 'SOFT',
        layoutPreset: 'GRID',
        heroAlignment: 'CENTER',
      });

      assert.equal(updated.brandName, 'Rina Learning Studio');
      assert.equal(updated.primaryColor, '#1e293b');
      assert.equal(updated.stylePreset, 'SOFT');
      assert.equal(updated.radiusPreset, 'ROUNDED');

      // Verify row persisted
      const [row] = await db
        .select()
        .from(storefrontThemes)
        .where(eq(storefrontThemes.organizationId, orgId));

      assert.ok(row);
      assert.equal(row.brandName, 'Rina Learning Studio');
      assert.equal(row.accentColor, '#e11d48');
    });
  });

  it('3. Strict Tenant Isolation: Org A custom theme does not leak to Org B', async () => {
    await withIntegrationDb(async (db) => {
      const orgAId = crypto.randomUUID();
      const orgBId = crypto.randomUUID();
      const slugA = `org-a-${Date.now()}`;
      const slugB = `org-b-${Date.now()}`;

      await db.insert(organizations).values([
        { id: orgAId, name: 'Org A Studio', slug: slugA },
        { id: orgBId, name: 'Org B Academy', slug: slugB },
      ]);

      await db.insert(workspaceProfiles).values([
        { organizationId: orgAId, displayName: 'Org A Brand' },
        { organizationId: orgBId, displayName: 'Org B Brand' },
      ]);

      const service = createStorefrontThemeService(db as any);

      // Org A customizes theme to EDITORIAL + LORA + #1c1917
      await service.updateTheme(orgAId, {
        brandName: 'Custom Org A Brand',
        tagline: 'Org A Tagline',
        logoUrl: 'https://example.com/logo-a.png',
        ...STYLE_PRESET_TOKENS.EDITORIAL,
      });

      // Org B does not customize theme
      const themeB = await service.getThemeByOrg(orgBId);
      assert.equal(themeB.brandName, 'Org B Brand');
      assert.equal(themeB.stylePreset, 'MODERNIST'); // Org B remains default
      assert.notEqual(themeB.stylePreset, 'EDITORIAL');

      // Public profile endpoint verifies isolation
      const publicRepo = createPublicContentRepository(db as any);
      const publicProfileA = await publicRepo.getPublicWorkspaceProfile(slugA);
      const publicProfileB = await publicRepo.getPublicWorkspaceProfile(slugB);

      assert.equal(publicProfileA?.theme?.brandName, 'Custom Org A Brand');
      assert.equal(publicProfileA?.theme?.stylePreset, 'EDITORIAL');

      assert.equal(publicProfileB?.theme?.brandName, 'Org B Brand');
      assert.equal(publicProfileB?.theme?.stylePreset, 'MODERNIST');
    });
  });

  it('4. Reset theme restores canonical default tokens while preserving brand name', async () => {
    await withIntegrationDb(async (db) => {
      const orgId = crypto.randomUUID();
      await db.insert(organizations).values({
        id: orgId,
        name: 'Reset Test Org',
        slug: `reset-org-${Date.now()}`,
      });

      await db.insert(workspaceProfiles).values({
        organizationId: orgId,
        displayName: 'Reset Target Brand',
      });

      const service = createStorefrontThemeService(db as any);
      // Change to soft
      await service.updateTheme(orgId, {
        brandName: 'Temporary Name',
        ...STYLE_PRESET_TOKENS.SOFT,
        logoUrl: null,
        tagline: null,
      });

      // Reset
      const resetTheme = await service.resetTheme(orgId);
      assert.equal(resetTheme.brandName, 'Reset Target Brand');
      assert.equal(resetTheme.stylePreset, 'MODERNIST');
      assert.equal(resetTheme.primaryColor, TALIRA_DEFAULT_STOREFRONT_THEME.primaryColor);
      assert.equal(resetTheme.radiusPreset, 'SHARP');
    });
  });
});
