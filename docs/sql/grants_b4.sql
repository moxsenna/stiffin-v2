-- Least-privilege runtime grants for B4 (PromotorClass Registration & Enrollment)
-- Applied to the runtime role used by Platform API workers / servers.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "enrollments" TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "learner_access_tokens" TO promotor_runtime;
