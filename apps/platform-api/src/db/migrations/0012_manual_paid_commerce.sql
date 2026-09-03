-- Migration 0012: Manual Paid Program Commerce
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "bank_transfer_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "whatsapp_enabled" boolean DEFAULT false NOT NULL;

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
	CONSTRAINT "bank_name_not_empty" CHECK (char_length("bank_name") > 0),
	CONSTRAINT "account_number_not_empty" CHECK (char_length("account_number") > 0),
	CONSTRAINT "account_holder_not_empty" CHECK (char_length("account_holder_name") > 0)
);

DO $$ BEGIN
 ALTER TABLE "organization_bank_accounts" ADD CONSTRAINT "organization_bank_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_org_bank_accounts_org_active" ON "organization_bank_accounts" USING btree ("organization_id","is_active");

CREATE TABLE IF NOT EXISTS "organization_payment_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sales_whatsapp_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_whatsapp_e164_check" CHECK ("sales_whatsapp_number" IS NULL OR "sales_whatsapp_number" ~ '^\+[1-9][0-9]{1,14}$')
);

DO $$ BEGIN
 ALTER TABLE "organization_payment_settings" ADD CONSTRAINT "organization_payment_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "org_payment_settings_org_unique" ON "organization_payment_settings" USING btree ("organization_id");

CREATE TABLE IF NOT EXISTS "program_purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"purchase_reference" text NOT NULL,
	"purchase_method" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"price_amount" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"buyer_note" text,
	"bank_account_id" uuid,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" uuid,
	"rejected_at" timestamp with time zone,
	"rejected_by_user_id" uuid,
	"rejection_reason" text,
	"enrollment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_requests_method_check" CHECK ("purchase_method" IN ('BANK_TRANSFER', 'WHATSAPP')),
	CONSTRAINT "purchase_requests_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')),
	CONSTRAINT "purchase_requests_price_non_negative" CHECK ("price_amount" >= 0),
	CONSTRAINT "purchase_requests_currency_check" CHECK ("currency" = 'IDR'),
	CONSTRAINT "purchase_requests_buyer_name_not_empty" CHECK (char_length("buyer_name") > 0),
	CONSTRAINT "purchase_requests_phone_format" CHECK ("buyer_phone" ~ '^\+[1-9][0-9]{1,14}$')
);

DO $$ BEGIN
 ALTER TABLE "program_purchase_requests" ADD CONSTRAINT "program_purchase_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "program_purchase_requests" ADD CONSTRAINT "program_purchase_requests_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "program_purchase_requests" ADD CONSTRAINT "program_purchase_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "program_purchase_requests" ADD CONSTRAINT "program_purchase_requests_bank_account_id_organization_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "organization_bank_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "program_purchase_requests" ADD CONSTRAINT "program_purchase_requests_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "program_purchase_requests" ADD CONSTRAINT "program_purchase_requests_rejected_by_user_id_users_id_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "program_purchase_requests" ADD CONSTRAINT "program_purchase_requests_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "program_purchase_requests_ref_unique" ON "program_purchase_requests" USING btree ("purchase_reference");
CREATE INDEX IF NOT EXISTS "idx_purchase_requests_org_status" ON "program_purchase_requests" USING btree ("organization_id","status");
CREATE INDEX IF NOT EXISTS "idx_purchase_requests_org_program" ON "program_purchase_requests" USING btree ("organization_id","program_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_requests_org_contact" ON "program_purchase_requests" USING btree ("organization_id","contact_id");
