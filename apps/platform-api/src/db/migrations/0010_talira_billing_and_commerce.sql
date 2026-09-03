CREATE TABLE IF NOT EXISTS "organization_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_code" text DEFAULT 'FREE' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"billing_cycle" text DEFAULT 'NONE' NOT NULL,
	"provider" text DEFAULT 'NONE' NOT NULL,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"grace_ends_at" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_subscriptions_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade,
	CONSTRAINT "org_subscriptions_plan_check" CHECK ("plan_code" IN ('FREE', 'SOLO', 'STUDIO')),
	CONSTRAINT "org_subscriptions_status_check" CHECK ("status" IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'CANCELED')),
	CONSTRAINT "org_subscriptions_cycle_check" CHECK ("billing_cycle" IN ('MONTHLY', 'YEARLY', 'NONE')),
	CONSTRAINT "org_subscriptions_provider_check" CHECK ("provider" IN ('NONE', 'PAYCORE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "org_subscriptions_org_unique" ON "organization_subscriptions" ("organization_id");
CREATE INDEX IF NOT EXISTS "org_subscriptions_plan_idx" ON "organization_subscriptions" ("plan_code");
CREATE INDEX IF NOT EXISTS "org_subscriptions_status_idx" ON "organization_subscriptions" ("status");

CREATE TABLE IF NOT EXISTS "commerce_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_type" text DEFAULT 'PROGRAM_PURCHASE' NOT NULL,
	"program_id" uuid,
	"contact_id" uuid,
	"reference" text NOT NULL,
	"provider_order_id" text,
	"source_channel" text DEFAULT 'STOREFRONT' NOT NULL,
	"payment_mode" text DEFAULT 'PAYCORE' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"payment_record_id" uuid,
	"enrollment_id" uuid,
	"metadata" text,
	"paid_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" uuid,
	"rejected_at" timestamp with time zone,
	"rejected_by_user_id" uuid,
	"rejection_reason" text,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_orders_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade,
	CONSTRAINT "commerce_orders_program_fk" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE cascade,
	CONSTRAINT "commerce_orders_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE cascade,
	CONSTRAINT "commerce_orders_enrollment_fk" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE set null,
	CONSTRAINT "commerce_orders_approved_by_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE set null,
	CONSTRAINT "commerce_orders_rejected_by_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("id") ON DELETE set null,
	CONSTRAINT "commerce_orders_amount_non_negative" CHECK ("amount" >= 0),
	CONSTRAINT "commerce_orders_currency_idr" CHECK ("currency" = 'IDR'),
	CONSTRAINT "commerce_orders_order_type_check" CHECK ("order_type" IN ('PROGRAM_PURCHASE', 'SUBSCRIPTION_PURCHASE')),
	CONSTRAINT "commerce_orders_source_channel_check" CHECK ("source_channel" IN ('STOREFRONT', 'WHATSAPP', 'OPERATOR')),
	CONSTRAINT "commerce_orders_payment_mode_check" CHECK ("payment_mode" IN ('PAYCORE', 'MANUAL_BANK')),
	CONSTRAINT "commerce_orders_status_check" CHECK ("status" IN ('PENDING', 'PAID', 'APPROVED', 'REJECTED', 'EXPIRED', 'REFUNDED', 'FAILED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_reference_unique" ON "commerce_orders" ("reference");
CREATE INDEX IF NOT EXISTS "commerce_orders_provider_order_idx" ON "commerce_orders" ("provider_order_id");
CREATE INDEX IF NOT EXISTS "commerce_orders_org_idx" ON "commerce_orders" ("organization_id");
CREATE INDEX IF NOT EXISTS "commerce_orders_org_status_idx" ON "commerce_orders" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "commerce_orders_program_idx" ON "commerce_orders" ("program_id");
CREATE INDEX IF NOT EXISTS "commerce_orders_contact_idx" ON "commerce_orders" ("contact_id");

CREATE TABLE IF NOT EXISTS "payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text DEFAULT 'PAYCORE' NOT NULL,
	"provider_payment_id" text,
	"provider_reference" text,
	"payment_method" text,
	"gross_amount" integer NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"processor_fee" integer,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"raw_metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_records_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade,
	CONSTRAINT "payment_records_order_fk" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE cascade,
	CONSTRAINT "payment_records_amount_positive" CHECK ("gross_amount" > 0),
	CONSTRAINT "payment_records_currency_idr" CHECK ("currency" = 'IDR'),
	CONSTRAINT "payment_records_provider_check" CHECK ("provider" IN ('PAYCORE', 'MANUAL_BANK')),
	CONSTRAINT "payment_records_status_check" CHECK ("status" IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED'))
);

CREATE INDEX IF NOT EXISTS "payment_records_order_idx" ON "payment_records" ("order_id");
CREATE INDEX IF NOT EXISTS "payment_records_org_idx" ON "payment_records" ("organization_id");
CREATE INDEX IF NOT EXISTS "payment_records_provider_id_idx" ON "payment_records" ("provider_payment_id");
CREATE INDEX IF NOT EXISTS "payment_records_status_idx" ON "payment_records" ("status");

CREATE TABLE IF NOT EXISTS "platform_fee_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"fee_type" text DEFAULT 'PAID_LEARNER_TRANSACTION' NOT NULL,
	"amount" integer DEFAULT 3000 NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"status" text DEFAULT 'BILLABLE' NOT NULL,
	"provider_charge_id" text,
	"billed_at" timestamp with time zone,
	"reversed_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_fee_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade,
	CONSTRAINT "platform_fee_order_fk" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE cascade,
	CONSTRAINT "platform_fee_amount_flat_3000" CHECK ("amount" = 3000),
	CONSTRAINT "platform_fee_currency_idr" CHECK ("currency" = 'IDR'),
	CONSTRAINT "platform_fee_type_check" CHECK ("fee_type" = 'PAID_LEARNER_TRANSACTION'),
	CONSTRAINT "platform_fee_status_check" CHECK ("status" IN ('PENDING', 'BILLABLE', 'BILLED', 'REVERSED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_fee_idempotency_unique" ON "platform_fee_entries" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "platform_fee_org_idx" ON "platform_fee_entries" ("organization_id");
CREATE INDEX IF NOT EXISTS "platform_fee_order_idx" ON "platform_fee_entries" ("order_id");
CREATE INDEX IF NOT EXISTS "platform_fee_status_idx" ON "platform_fee_entries" ("status");

CREATE TABLE IF NOT EXISTS "organization_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_holder_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_bank_accounts_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "org_bank_accounts_org_idx" ON "organization_bank_accounts" ("organization_id");

CREATE TABLE IF NOT EXISTS "provider_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_result" text DEFAULT 'PROCESSING' NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_webhook_events_provider_check" CHECK ("provider" IN ('PAYCORE')),
	CONSTRAINT "provider_webhook_events_result_check" CHECK ("processing_result" IN ('PROCESSING', 'SUCCESS', 'DUPLICATE', 'FAILED', 'RECONCILIATION_FAILED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_webhook_events_provider_event_unique" ON "provider_webhook_events" ("provider", "provider_event_id");
CREATE INDEX IF NOT EXISTS "provider_webhook_events_result_idx" ON "provider_webhook_events" ("processing_result");

