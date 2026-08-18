-- Milestone B6.1 — PromotorFlow Public Booking & Availability Database Grants
-- Table: availability_rules (CRUD = 4 privileges)
-- Total runtime capabilities: 94 + 4 = 98

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.availability_rules TO promotor_runtime;
