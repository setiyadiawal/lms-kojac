-- KOJAC LMS v1.3 — Security Hardening Phase 2
-- Production migration version: 20260920082815
-- Remove the final unnecessary anonymous privilege (including TRIGGER)
-- from public.user_roles.

revoke all privileges on table public.user_roles from anon;
