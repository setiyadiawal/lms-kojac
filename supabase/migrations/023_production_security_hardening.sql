-- KOJAC LMS PR-3 — minimal production security hardening
-- Scope:
-- 1) prevent direct client execution of auth trigger function
-- 2) pin role_rank() search_path without changing semantics
-- 3) make Reading progress SELECT-own + RPC-write only

begin;

-- handle_new_user() is invoked by auth.users trigger only.
-- Keep the function and trigger intact, but remove unnecessary API execution.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- role_rank() only depends on its enum argument and CASE expression.
-- Pin a safe search_path to remove mutable-search-path exposure.
alter function public.role_rank(public.app_role)
  set search_path = pg_catalog, public;

-- Reading frontend reads directly, but all writes go through
-- public.record_reading_completion(...), which is SECURITY DEFINER and uses auth.uid().
-- Match the hardened Listening architecture: direct SELECT only for authenticated clients.
revoke all privileges on table public.reading_progress from anon, authenticated;
grant select on table public.reading_progress to authenticated;

drop policy if exists reading_progress_own_rows on public.reading_progress;
create policy reading_progress_own_rows
on public.reading_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

commit;
