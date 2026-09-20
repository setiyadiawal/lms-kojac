-- KOJAC LMS v1.3 — Security Hardening Phase 2
-- Production migration version: 20260920082932
-- Direct clients only read audit logs through RLS.
-- Writes are produced by guarded SECURITY DEFINER RPCs.

revoke insert, update, delete on table public.admin_audit_logs from authenticated;
