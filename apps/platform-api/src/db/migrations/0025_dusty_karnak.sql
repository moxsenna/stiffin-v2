CREATE TABLE "whatsapp_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"device_token" text NOT NULL,
	"phone_e164" text,
	"status" text DEFAULT 'needs_pairing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_devices_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_inbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid,
	"wa_message_id" text NOT NULL,
	"chat_jid" text NOT NULL,
	"phone_e164" text NOT NULL,
	"is_group" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"raw_payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	CONSTRAINT "whatsapp_inbox_wa_message_id_unique" UNIQUE("wa_message_id")
);
--> statement-breakpoint
ALTER TABLE "whatsapp_devices" ADD CONSTRAINT "whatsapp_devices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_inbox" ADD CONSTRAINT "whatsapp_inbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_inbox" ADD CONSTRAINT "whatsapp_inbox_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_devices_device_id_idx" ON "whatsapp_devices" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "whatsapp_inbox_org_received_idx" ON "whatsapp_inbox" USING btree ("organization_id","received_at");--> statement-breakpoint
CREATE INDEX "whatsapp_inbox_contact_idx" ON "whatsapp_inbox" USING btree ("contact_id");