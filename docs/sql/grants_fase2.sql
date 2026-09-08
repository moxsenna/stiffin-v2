-- ============================================================
-- Fase 2 Ralivo — Runtime role grants (least privilege)
-- ============================================================
-- Purpose: grant the application runtime role access to
-- the Fase 2 tables introduced by migrations 0015 (OTP) + 0016 (sertifikat).
-- This file contains ROLE NAMES ONLY.
-- Never add credentials or connection strings here.
--
-- Roles:
--   owner            : migration/owner authority (DDL). Never used at runtime.
--                      Neon: neondb_owner. CI/local: postgres.
--   promotor_runtime : application runtime role used by the Worker via Hyperdrive.
--
-- Run this AS the owner role AFTER migrations 0015 + 0016 applied:
--   Neon:  psql "$OWNER_DATABASE_URL" \
--            -v ON_ERROR_STOP=1 \
--            -f docs/sql/grants_fase2.sql
-- ============================================================

-- OTP challenges: challenge dibuat, dikonsumsi, kedaluwarsa (UPDATE),
-- dibersihkan scheduler (DELETE)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.learner_otp_challenges TO promotor_runtime;
-- Certificates: terbit sekali, baca publik (tidak ada UPDATE/DELETE runtime)
GRANT SELECT, INSERT ON TABLE public.certificates TO promotor_runtime;
-- Tabel pendukung yang dibaca/ditulis alur Fase 2 tapi belum punya GRANT runtime:
-- enrollments (contactFinder OTP, findOwnedEnrollment + listByContact sertifikat)
GRANT SELECT ON TABLE public.enrollments TO promotor_runtime;
-- learner_sessions (createSessionForContact saat verify OTP sukses)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.learner_sessions TO promotor_runtime;
-- programs (snapshot programTitle saat terbit sertifikat)
GRANT SELECT ON TABLE public.programs TO promotor_runtime;
-- workspace_profiles (snapshot promoterName saat terbit sertifikat)
GRANT SELECT ON TABLE public.workspace_profiles TO promotor_runtime;
