CREATE TABLE "program_price_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"label" varchar(120) NOT NULL,
	"description" text,
	"price_amount" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_price_variants_label_not_empty" CHECK (char_length("program_price_variants"."label") > 0),
	CONSTRAINT "program_price_variants_price_amount_non_negative" CHECK ("program_price_variants"."price_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "program_price_variants" ADD CONSTRAINT "program_price_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_price_variants" ADD CONSTRAINT "program_price_variants_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_price_variants_org_prog_idx" ON "program_price_variants" USING btree ("organization_id","program_id");