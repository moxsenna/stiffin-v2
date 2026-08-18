-- Migration 0007: V0.1 Release Hardening & Session Security
-- Additive migration for Learner Sessions, Integration Outbox, Schema Enrichment, and Canonical Events

-- 1. Lessons: add is_required flag (default true)
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "is_required" boolean DEFAULT true NOT NULL;

-- 2. Learner Sessions: persistent HttpOnly cookie-backed sessions for public learners
CREATE TABLE IF NOT EXISTS "learner_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "learner_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "learner_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "learner_sessions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "idx_learner_sessions_org_contact" ON "learner_sessions" USING btree ("organization_id", "contact_id");
CREATE INDEX IF NOT EXISTS "idx_learner_sessions_token_hash" ON "learner_sessions" USING btree ("token_hash");

-- 3. Integration Outbox: durable transactional cross-product event & action queue
CREATE TABLE IF NOT EXISTS "integration_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"destination" text NOT NULL,
	"operation" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "integration_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "integration_outbox_status_check" CHECK ("status" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_outbox_dest_idempotency_unique" ON "integration_outbox" USING btree ("destination", "idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_integration_outbox_org_status_next" ON "integration_outbox" USING btree ("organization_id", "status", "next_attempt_at");

-- 4. Learning Signals: Schema Enrichment
ALTER TABLE "learning_signals" ADD COLUMN IF NOT EXISTS "program_id" uuid REFERENCES "public"."programs"("id") ON DELETE cascade;
ALTER TABLE "learning_signals" ADD COLUMN IF NOT EXISTS "source_event_id" uuid REFERENCES "public"."learning_events"("id") ON DELETE set null;
ALTER TABLE "learning_signals" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'HIGH_LEARNING_INTENT' NOT NULL;
ALTER TABLE "learning_signals" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 50 NOT NULL;
ALTER TABLE "learning_signals" ADD COLUMN IF NOT EXISTS "recommended_action_type" text;
ALTER TABLE "learning_signals" ADD COLUMN IF NOT EXISTS "recommended_action_reason" text;
ALTER TABLE "learning_signals" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
ALTER TABLE "learning_signals" ALTER COLUMN "enrollment_id" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_learning_signals_org_contact" ON "learning_signals" USING btree ("organization_id", "contact_id");

-- 5. Learning Events: Canonical Event Vocabulary Constraint
ALTER TABLE "learning_events" DROP CONSTRAINT IF EXISTS "learning_events_event_type_check";
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_event_type_check" CHECK (
	"event_type" IN (
		'learner.registered',
		'learner.enrolled',
		'lesson.started',
		'lesson.completed',
		'reflection.submitted',
		'program.progress_50',
		'program.progress_80',
		'program.completed',
		'cta.viewed',
		'cta.clicked',
		'learner.inactive',
		'LESSON_COMPLETED',
		'REFLECTION_SUBMITTED',
		'CTA_CLICKED',
		'PROGRAM_COMPLETED'
	)
);
