-- KOJAC LMS v1.3 — Security Hardening Phase 3
-- Production migration version: 20260920083933
-- The helper is only needed by authenticated/internal authorization paths.

revoke execute on function public.role_rank(public.app_role) from anon, public;
