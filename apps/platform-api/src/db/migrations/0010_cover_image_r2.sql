-- Migration 0010: R2 Cover Image for Programs (Presigned Direct Upload, Public, 2MB)
-- Adds cover image fields to programs for promotor-uploaded covers via R2 presigned PUT

ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "cover_image_url" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "cover_image_key" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "cover_image_mime" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "cover_image_size" integer;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "cover_image_uploaded_at" timestamp with time zone;

-- Ensure mime is one of allowed if present
ALTER TABLE "programs" DROP CONSTRAINT IF EXISTS "programs_cover_image_mime_check";
ALTER TABLE "programs" ADD CONSTRAINT "programs_cover_image_mime_check" CHECK ("cover_image_mime" IS NULL OR "cover_image_mime" IN ('image/jpeg', 'image/png', 'image/webp'));

-- Size 2MB cap (2097152) enforced in API, DB check as safety
ALTER TABLE "programs" DROP CONSTRAINT IF EXISTS "programs_cover_image_size_check";
ALTER TABLE "programs" ADD CONSTRAINT "programs_cover_image_size_check" CHECK ("cover_image_size" IS NULL OR ("cover_image_size" > 0 AND "cover_image_size" <= 2097152));

CREATE INDEX IF NOT EXISTS "programs_cover_image_key_idx" ON "programs" USING btree ("cover_image_key");
