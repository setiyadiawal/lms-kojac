-- KOJAC LMS v1.3 — Security Hardening Phase 2
-- Production migration version: 20260920082712
-- Remove legacy direct table privileges from the anonymous role.
-- RLS policies on these tables are authenticated-only.

revoke all privileges on table public.admin_audit_logs from anon;
revoke all privileges on table public.class_enrollments from anon;
revoke all privileges on table public.classes from anon;
revoke all privileges on table public.course_modules from anon;
revoke all privileges on table public.courses from anon;
revoke all privileges on table public.learning_items from anon;
revoke all privileges on table public.lesson_progress from anon;
revoke all privileges on table public.lessons from anon;
revoke all privileges on table public.review_progress from anon;
