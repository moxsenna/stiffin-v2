import { pgTable, uuid, text, timestamp, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const storefrontThemes = pgTable(
  'storefront_themes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    brandName: text('brand_name').notNull(),
    tagline: text('tagline'),
    logoUrl: text('logo_url'),
    primaryColor: text('primary_color').notNull().default('#201e1d'),
    accentColor: text('accent_color').notNull().default('#ec3013'),
    backgroundColor: text('background_color').notNull().default('#f3f2f2'),
    surfaceColor: text('surface_color').notNull().default('#ffffff'),
    textColor: text('text_color').notNull().default('#201e1d'),
    mutedTextColor: text('muted_text_color').notNull().default('#5a5954'),
    stylePreset: text('style_preset').notNull().default('MODERNIST'),
    fontPreset: text('font_preset').notNull().default('ARCHIVO'),
    radiusPreset: text('radius_preset').notNull().default('SHARP'),
    buttonPreset: text('button_preset').notNull().default('SOLID'),
    layoutPreset: text('layout_preset').notNull().default('LIST'),
    heroAlignment: text('hero_alignment').notNull().default('LEFT'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('storefront_themes_organization_id_unique').on(t.organizationId),
    check('storefront_themes_brand_name_not_empty', sql`char_length(${t.brandName}) > 0`),
    check('storefront_themes_primary_color_hex', sql`${t.primaryColor} ~ '^#[0-9a-fA-F]{6}$'`),
    check('storefront_themes_accent_color_hex', sql`${t.accentColor} ~ '^#[0-9a-fA-F]{6}$'`),
    check('storefront_themes_background_color_hex', sql`${t.backgroundColor} ~ '^#[0-9a-fA-F]{6}$'`),
    check('storefront_themes_surface_color_hex', sql`${t.surfaceColor} ~ '^#[0-9a-fA-F]{6}$'`),
    check('storefront_themes_text_color_hex', sql`${t.textColor} ~ '^#[0-9a-fA-F]{6}$'`),
    check('storefront_themes_muted_text_color_hex', sql`${t.mutedTextColor} ~ '^#[0-9a-fA-F]{6}$'`),
    check('storefront_themes_style_preset_enum', sql`${t.stylePreset} IN ('MODERNIST', 'SOFT', 'MINIMAL', 'EDITORIAL')`),
    check('storefront_themes_font_preset_enum', sql`${t.fontPreset} IN ('ARCHIVO', 'INTER', 'MANROPE', 'LORA')`),
    check('storefront_themes_radius_preset_enum', sql`${t.radiusPreset} IN ('SHARP', 'SOFT', 'ROUNDED')`),
    check('storefront_themes_button_preset_enum', sql`${t.buttonPreset} IN ('SOLID', 'OUTLINE', 'SOFT')`),
    check('storefront_themes_layout_preset_enum', sql`${t.layoutPreset} IN ('LIST', 'GRID')`),
    check('storefront_themes_hero_alignment_enum', sql`${t.heroAlignment} IN ('LEFT', 'CENTER')`),
  ]
);

export type StorefrontThemeRow = typeof storefrontThemes.$inferSelect;
export type NewStorefrontThemeRow = typeof storefrontThemes.$inferInsert;
