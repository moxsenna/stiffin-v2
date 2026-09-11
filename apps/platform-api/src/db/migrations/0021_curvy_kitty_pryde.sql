CREATE TABLE "payout_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"total_net" integer DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"bank_account_id" uuid,
	"dest_bank_name" text,
	"dest_account_number" text,
	"dest_holder_name" text,
	"proof_url" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_batches_status_check" CHECK ("payout_batches"."status" IN ('DRAFT', 'PROCESSING', 'PAID', 'FAILED')),
	CONSTRAINT "payout_batches_total_net_check" CHECK ("payout_batches"."total_net" >= 0),
	CONSTRAINT "payout_batches_order_count_check" CHECK ("payout_batches"."order_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payout_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"net_amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_items_net_non_negative" CHECK ("payout_items"."net_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_bank_account_id_organization_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."organization_bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_batch_id_payout_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."payout_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payout_batches_org_idx" ON "payout_batches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payout_batches_org_status_idx" ON "payout_batches" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_items_order_unique" ON "payout_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payout_items_batch_idx" ON "payout_items" USING btree ("batch_id");