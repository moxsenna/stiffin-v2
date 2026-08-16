CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"program_type" text NOT NULL,
	"access_type" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"pricing" text DEFAULT 'free' NOT NULL,
	"price_amount" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programs_title_not_empty" CHECK (char_length("programs"."title") > 0),
	CONSTRAINT "programs_slug_format" CHECK ("programs"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "programs_type_check" CHECK ("programs"."program_type" IN ('lead_magnet', 'aftersales', 'paid', 'private')),
	CONSTRAINT "programs_access_type_check" CHECK ("programs"."access_type" IN ('public', 'private', 'manual')),
	CONSTRAINT "programs_status_check" CHECK ("programs"."status" IN ('draft', 'published', 'archived')),
	CONSTRAINT "programs_pricing_check" CHECK ("programs"."pricing" IN ('free', 'one_time')),
	CONSTRAINT "programs_price_amount_non_negative" CHECK ("programs"."price_amount" >= 0),
	CONSTRAINT "programs_pricing_amount_invariant" CHECK (("programs"."pricing" = 'free' AND "programs"."price_amount" = 0) OR ("programs"."pricing" = 'one_time' AND "programs"."price_amount" > 0)),
	CONSTRAINT "programs_type_invariants" CHECK (("programs"."program_type" = 'lead_magnet' AND "programs"."access_type" = 'public' AND "programs"."pricing" = 'free') OR ("programs"."program_type" = 'aftersales' AND "programs"."access_type" = 'manual' AND "programs"."pricing" = 'free') OR ("programs"."program_type" = 'paid' AND "programs"."pricing" = 'one_time') OR ("programs"."program_type" = 'private' AND "programs"."access_type" = 'private'))
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_title_not_empty" CHECK (char_length("modules"."title") > 0),
	CONSTRAINT "modules_order_positive" CHECK ("modules"."order" > 0)
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"text_content" text,
	"video_provider" text,
	"video_url" text,
	"video_external_id" text,
	"reflection_type" text,
	"reflection_prompt" text,
	"reflection_options" jsonb,
	"cta_type" text,
	"cta_label" text,
	"cta_target_program_id" uuid,
	"cta_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_title_not_empty" CHECK (char_length("lessons"."title") > 0),
	CONSTRAINT "lessons_order_positive" CHECK ("lessons"."order" > 0),
	CONSTRAINT "lessons_video_provider_check" CHECK ("lessons"."video_provider" IS NULL OR "lessons"."video_provider" IN ('youtube')),
	CONSTRAINT "lessons_video_external_id_format" CHECK ("lessons"."video_external_id" IS NULL OR "lessons"."video_external_id" ~ '^[A-Za-z0-9_-]{11}$'),
	CONSTRAINT "lessons_reflection_type_check" CHECK ("lessons"."reflection_type" IS NULL OR "lessons"."reflection_type" IN ('long_text', 'single_select', 'multi_select')),
	CONSTRAINT "lessons_cta_type_check" CHECK ("lessons"."cta_type" IS NULL OR "lessons"."cta_type" IN ('WHATSAPP', 'FLOW_BOOKING', 'EXTERNAL', 'ENROLL_PROGRAM'))
);
--> statement-breakpoint
CREATE TABLE "lesson_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"size_formatted" text,
	"order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_attachments_kind_check" CHECK ("lesson_attachments"."kind" IN ('image', 'download')),
	CONSTRAINT "lesson_attachments_name_not_empty" CHECK (char_length("lesson_attachments"."name") > 0),
	CONSTRAINT "lesson_attachments_url_not_empty" CHECK (char_length("lesson_attachments"."url") > 0),
	CONSTRAINT "lesson_attachments_order_positive" CHECK ("lesson_attachments"."order" > 0)
);
--> statement-breakpoint
CREATE TABLE "program_presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"cover_variant" text DEFAULT 'cover-a' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"hero_eyebrow" text,
	"short_outcome" text,
	"duration_label" text,
	"learning_outcomes" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_presentations_cover_variant_check" CHECK ("program_presentations"."cover_variant" IN ('cover-a', 'cover-b', 'cover-c'))
);
--> statement-breakpoint
CREATE TABLE "workspace_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"tagline" text,
	"headline" text,
	"bio" text,
	"city" text,
	"role_label" text,
	"whatsapp_phone_e164" text,
	"avatar_url" text,
	"logo_url" text,
	"hero_program_id" uuid,
	"stats" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_profiles_display_name_not_empty" CHECK (char_length("workspace_profiles"."display_name") > 0),
	CONSTRAINT "workspace_profiles_phone_format" CHECK ("workspace_profiles"."whatsapp_phone_e164" IS NULL OR "workspace_profiles"."whatsapp_phone_e164" ~ '^\+[1-9][0-9]{1,14}$')
);
--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_cta_target_program_id_programs_id_fk" FOREIGN KEY ("cta_target_program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_attachments" ADD CONSTRAINT "lesson_attachments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_presentations" ADD CONSTRAINT "program_presentations_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_profiles" ADD CONSTRAINT "workspace_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_profiles" ADD CONSTRAINT "workspace_profiles_hero_program_id_programs_id_fk" FOREIGN KEY ("hero_program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "programs_org_slug_unique" ON "programs" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "programs_org_status_idx" ON "programs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "programs_org_type_idx" ON "programs" USING btree ("organization_id","program_type");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_program_order_unique" ON "modules" USING btree ("program_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_module_order_unique" ON "lessons" USING btree ("module_id","order");--> statement-breakpoint
CREATE INDEX "lesson_attachments_lesson_id_idx" ON "lesson_attachments" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_presentations_program_id_unique" ON "program_presentations" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_profiles_organization_id_unique" ON "workspace_profiles" USING btree ("organization_id");