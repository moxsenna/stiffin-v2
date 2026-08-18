CREATE TABLE IF NOT EXISTS "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"status" text DEFAULT 'ENROLLED' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"intent_score" integer DEFAULT 0 NOT NULL,
	"intent_label" text DEFAULT 'COLD' NOT NULL,
	"learning_status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_status_check" CHECK ("status" IN ('ENROLLED', 'STARTED', 'COMPLETED', 'CANCELLED')),
	CONSTRAINT "enrollments_progress_percent_check" CHECK ("progress_percent" >= 0 AND "progress_percent" <= 100),
	CONSTRAINT "enrollments_intent_score_check" CHECK ("intent_score" >= 0 AND "intent_score" <= 100),
	CONSTRAINT "enrollments_intent_label_check" CHECK ("intent_label" IN ('COLD', 'WARM', 'HOT')),
	CONSTRAINT "enrollments_learning_status_check" CHECK ("learning_status" IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'AT_RISK'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learner_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_access_tokens" ADD CONSTRAINT "learner_access_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_access_tokens" ADD CONSTRAINT "learner_access_tokens_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_org_program_contact_unique" ON "enrollments" USING btree ("organization_id","program_id","contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enrollments_org_contact" ON "enrollments" USING btree ("organization_id","contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enrollments_org_program" ON "enrollments" USING btree ("organization_id","program_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learner_access_tokens_token_hash_unique" ON "learner_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learner_access_tokens_lookup" ON "learner_access_tokens" USING btree ("token_hash","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learner_access_tokens_org_contact" ON "learner_access_tokens" USING btree ("organization_id","contact_id");
