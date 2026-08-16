CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"price_amount" integer DEFAULT 0 NOT NULL,
	"deposit_amount" integer,
	"duration_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_name_not_empty" CHECK (char_length("services"."name") > 0),
	CONSTRAINT "services_category_check" CHECK ("services"."category" IN ('ASSESSMENT', 'SESSION', 'PROGRAM', 'OTHER')),
	CONSTRAINT "services_price_amount_non_negative" CHECK ("services"."price_amount" >= 0),
	CONSTRAINT "services_deposit_amount_non_negative" CHECK ("services"."deposit_amount" IS NULL OR "services"."deposit_amount" >= 0),
	CONSTRAINT "services_duration_minutes_positive" CHECK ("services"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"location_type" text NOT NULL,
	"location_text" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"payment_status" text DEFAULT 'UNPAID' NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_amount_non_negative" CHECK ("bookings"."amount" >= 0),
	CONSTRAINT "bookings_end_after_start" CHECK ("bookings"."end_at" IS NULL OR "bookings"."end_at" > "bookings"."start_at"),
	CONSTRAINT "bookings_location_type_check" CHECK ("bookings"."location_type" IN ('HOME_VISIT', 'ON_SITE', 'ONLINE')),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
	CONSTRAINT "bookings_payment_status_check" CHECK ("bookings"."payment_status" IN ('UNPAID', 'PAID', 'WAIVED')),
	CONSTRAINT "bookings_completed_at_status_invariant" CHECK (("bookings"."status" = 'COMPLETED') = ("bookings"."completed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "next_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"booking_id" uuid,
	"action_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone NOT NULL,
	"priority" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"source" text DEFAULT 'PROMOTORFLOW' NOT NULL,
	"source_event_id" text,
	"source_signal_id" text,
	"idempotency_key" text,
	"context_json" jsonb DEFAULT '{}' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "next_actions_title_not_empty" CHECK (char_length("next_actions"."title") > 0),
	CONSTRAINT "next_actions_type_check" CHECK ("next_actions"."action_type" IN ('CONTACT_LEAD', 'FOLLOW_UP', 'REMIND_PAYMENT', 'CONFIRM_BOOKING', 'REMIND_BOOKING', 'AFTERCARE', 'MANUAL')),
	CONSTRAINT "next_actions_priority_range" CHECK ("next_actions"."priority" BETWEEN 1 AND 100),
	CONSTRAINT "next_actions_status_check" CHECK ("next_actions"."status" IN ('PENDING', 'COMPLETED', 'SKIPPED', 'CANCELLED')),
	CONSTRAINT "next_actions_source_check" CHECK ("next_actions"."source" IN ('PROMOTORFLOW', 'PROMOTORCLASS', 'MANUAL')),
	CONSTRAINT "next_actions_completed_at_status_invariant" CHECK (("next_actions"."status" = 'COMPLETED') = ("next_actions"."completed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"booking_id" uuid,
	"event_type" text NOT NULL,
	"actor_user_id" uuid,
	"metadata_json" jsonb DEFAULT '{}' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_event_type_check" CHECK ("activities"."event_type" IN ('CONTACT_CREATED', 'CONTACT_UPDATED', 'STAGE_CHANGED', 'WHATSAPP_OPENED', 'WHATSAPP_SENT', 'ACTION_CREATED', 'ACTION_COMPLETED', 'ACTION_RESCHEDULED', 'ACTION_SKIPPED', 'ACTION_CANCELLED', 'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED', 'BOOKING_NO_SHOW', 'BOOKING_COMPLETED', 'PAYMENT_MARKED', 'AFTERCARE_CREATED', 'AFTERCARE_COMPLETED', 'ASSESSMENT_STATUS_CHANGED', 'CLASS_SIGNAL'))
);
--> statement-breakpoint
CREATE TABLE "contact_flow_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"stage" text DEFAULT 'NEW' NOT NULL,
	"classification" text DEFAULT 'PROSPECT' NOT NULL,
	"interest" text,
	"lost_reason" text,
	"source_channel" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_flow_states_stage_check" CHECK ("contact_flow_states"."stage" IN ('NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'BOOKED', 'COMPLETED', 'LOST')),
	CONSTRAINT "contact_flow_states_classification_check" CHECK ("contact_flow_states"."classification" IN ('PROSPECT', 'CLIENT')),
	CONSTRAINT "contact_flow_states_lost_reason_invariant" CHECK (("contact_flow_states"."stage" = 'LOST' AND "contact_flow_states"."lost_reason" IS NOT NULL) OR ("contact_flow_states"."stage" <> 'LOST' AND "contact_flow_states"."lost_reason" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "aftercare_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"outcome" text,
	"outcome_notes" text,
	"recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aftercare_records_status_check" CHECK ("aftercare_records"."status" IN ('PENDING', 'COMPLETED')),
	CONSTRAINT "aftercare_records_outcome_check" CHECK ("aftercare_records"."outcome" IS NULL OR "aftercare_records"."outcome" IN ('NO_NEED', 'HAS_QUESTION', 'INTERESTED_NEXT_SESSION', 'CONTACT_LATER')),
	CONSTRAINT "aftercare_records_completed_outcome_invariant" CHECK (("aftercare_records"."status" = 'COMPLETED') = ("aftercare_records"."outcome" IS NOT NULL)),
	CONSTRAINT "aftercare_records_completed_recorded_at_invariant" CHECK (("aftercare_records"."status" = 'COMPLETED') = ("aftercare_records"."recorded_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "contact_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"source_booking_id" uuid,
	"assessed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_assessments_status_check" CHECK ("contact_assessments"."status" IN ('NOT_STARTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'UNKNOWN'))
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"template_text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_templates_title_not_empty" CHECK (char_length("message_templates"."title") > 0),
	CONSTRAINT "message_templates_category_check" CHECK ("message_templates"."category" IN ('CONTACT_LEAD', 'FOLLOW_UP', 'CONFIRM_BOOKING', 'REMIND_PAYMENT', 'REMIND_BOOKING', 'AFTERCARE'))
);
--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_actions" ADD CONSTRAINT "next_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_actions" ADD CONSTRAINT "next_actions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_actions" ADD CONSTRAINT "next_actions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_flow_states" ADD CONSTRAINT "contact_flow_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_flow_states" ADD CONSTRAINT "contact_flow_states_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aftercare_records" ADD CONSTRAINT "aftercare_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aftercare_records" ADD CONSTRAINT "aftercare_records_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aftercare_records" ADD CONSTRAINT "aftercare_records_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_assessments" ADD CONSTRAINT "contact_assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_assessments" ADD CONSTRAINT "contact_assessments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_assessments" ADD CONSTRAINT "contact_assessments_source_booking_id_bookings_id_fk" FOREIGN KEY ("source_booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "services_org_active_idx" ON "services" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_org_idempotency_unique" ON "bookings" USING btree ("organization_id","idempotency_key") WHERE "bookings"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "bookings_org_start_idx" ON "bookings" USING btree ("organization_id","start_at");--> statement-breakpoint
CREATE INDEX "bookings_org_status_start_idx" ON "bookings" USING btree ("organization_id","status","start_at");--> statement-breakpoint
CREATE INDEX "bookings_contact_start_idx" ON "bookings" USING btree ("contact_id","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "next_actions_org_source_idempotency_unique" ON "next_actions" USING btree ("organization_id","source","idempotency_key") WHERE "next_actions"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "next_actions_org_status_due_idx" ON "next_actions" USING btree ("organization_id","status","due_at");--> statement-breakpoint
CREATE INDEX "next_actions_org_contact_status_idx" ON "next_actions" USING btree ("organization_id","contact_id","status");--> statement-breakpoint
CREATE INDEX "next_actions_booking_idx" ON "next_actions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "activities_org_contact_occurred_idx" ON "activities" USING btree ("organization_id","contact_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activities_org_occurred_idx" ON "activities" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_flow_states_contact_unique" ON "contact_flow_states" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_flow_states_org_stage_idx" ON "contact_flow_states" USING btree ("organization_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "aftercare_records_org_booking_unique" ON "aftercare_records" USING btree ("organization_id","booking_id");--> statement-breakpoint
CREATE INDEX "aftercare_records_org_status_scheduled_idx" ON "aftercare_records" USING btree ("organization_id","status","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_assessments_contact_unique" ON "contact_assessments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_assessments_org_status_idx" ON "contact_assessments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "message_templates_org_category_active_idx" ON "message_templates" USING btree ("organization_id","category","is_active");