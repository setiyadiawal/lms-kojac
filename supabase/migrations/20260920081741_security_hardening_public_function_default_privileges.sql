-- KOJAC LMS v1.3 — Security Hardening
-- Production migration version: 20260920081741
-- Prevent future public-schema functions owned by postgres from being auto-exposed
-- to anon/authenticated. Existing function grants are intentionally unchanged.

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;
