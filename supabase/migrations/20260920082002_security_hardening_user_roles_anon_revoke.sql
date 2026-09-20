-- KOJAC LMS v1.3 — Security Hardening
-- Production migration version: 20260920082002
-- Defense in depth: unauthenticated users do not need direct access to user_roles.

revoke select, references on table public.user_roles from anon;
