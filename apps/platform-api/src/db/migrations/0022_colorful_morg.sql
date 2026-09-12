CREATE TABLE "bridge_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event" text NOT NULL,
	"meta" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridge_dismissals" (
	"organization_id" uuid NOT NULL,
	"surface" text NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bridge_dismissals_organization_id_surface_pk" PRIMARY KEY("organization_id","surface")
);
--> statement-breakpoint
ALTER TABLE "bridge_metrics" ADD CONSTRAINT "bridge_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridge_dismissals" ADD CONSTRAINT "bridge_dismissals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bridge_metrics_org_event" ON "bridge_metrics" USING btree ("organization_id","event","created_at");