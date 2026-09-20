-- KOJAC LMS v1.3 — Security Hardening Phase 2
-- Production migration version: 20260920082857
-- Remove anonymous access to the current audit-log sequence and prevent
-- future tables/sequences owned by postgres in public from auto-granting to anon.
-- Authenticated defaults are intentionally left unchanged.

revoke all privileges on sequence public.admin_audit_logs_id_seq from anon;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon;
