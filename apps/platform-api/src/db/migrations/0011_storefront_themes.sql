-- Migration 0011: Storefront Themes (Tenant-Scoped Brand Customization)
CREATE TABLE IF NOT EXISTS "storefront_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"brand_name" text NOT NULL,
	"tagline" text,
	"logo_url" text,
	"primary_color" text DEFAULT '#201e1d' NOT NULL,
	"accent_color" text DEFAULT '#ec3013' NOT NULL,
	"background_color" text DEFAULT '#f3f2f2' NOT NULL,
	"surface_color" text DEFAULT '#ffffff' NOT NULL,
	"text_color" text DEFAULT '#201e1d' NOT NULL,
	"muted_text_color" text DEFAULT '#5a5954' NOT NULL,
	"style_preset" text DEFAULT 'MODERNIST' NOT NULL,
	"font_preset" text DEFAULT 'ARCHIVO' NOT NULL,
	"radius_preset" text DEFAULT 'SHARP' NOT NULL,
	"button_preset" text DEFAULT 'SOLID' NOT NULL,
	"layout_preset" text DEFAULT 'LIST' NOT NULL,
	"hero_alignment" text DEFAULT 'LEFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storefront_themes_brand_name_not_empty" CHECK (char_length("brand_name") > 0),
	CONSTRAINT "storefront_themes_primary_color_hex" CHECK ("primary_color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "storefront_themes_accent_color_hex" CHECK ("accent_color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "storefront_themes_background_color_hex" CHECK ("background_color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "storefront_themes_surface_color_hex" CHECK ("surface_color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "storefront_themes_text_color_hex" CHECK ("text_color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "storefront_themes_muted_text_color_hex" CHECK ("muted_text_color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "storefront_themes_style_preset_enum" CHECK ("style_preset" IN ('MODERNIST', 'SOFT', 'MINIMAL', 'EDITORIAL')),
	CONSTRAINT "storefront_themes_font_preset_enum" CHECK ("font_preset" IN ('ARCHIVO', 'INTER', 'MANROPE', 'LORA')),
	CONSTRAINT "storefront_themes_radius_preset_enum" CHECK ("radius_preset" IN ('SHARP', 'SOFT', 'ROUNDED')),
	CONSTRAINT "storefront_themes_button_preset_enum" CHECK ("button_preset" IN ('SOLID', 'OUTLINE', 'SOFT')),
	CONSTRAINT "storefront_themes_layout_preset_enum" CHECK ("layout_preset" IN ('LIST', 'GRID')),
	CONSTRAINT "storefront_themes_hero_alignment_enum" CHECK ("hero_alignment" IN ('LEFT', 'CENTER'))
);

DO $$ BEGIN
 ALTER TABLE "storefront_themes" ADD CONSTRAINT "storefront_themes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_themes_organization_id_unique" ON "storefront_themes" USING btree ("organization_id");
