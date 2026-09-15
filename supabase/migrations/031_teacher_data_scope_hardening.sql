-- USER SYSTEM PHASE 2A.1 — TEACHER DATA SCOPE HARDENING
-- Restricts Pengajar visibility to their own profile/role and students enrolled
-- in classes they teach. Staff receives no automatic academic visibility.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.teacher_can_view_user(p_target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.user_roles caller_role
      where caller_role.user_id = auth.uid()
        and caller_role.role::text = 'pengajar'
    )
    and exists (
      select 1
      from public.user_roles target_role
      where target_role.user_id = p_target_user
        and target_role.role::text = 'siswa'
    )
    and exists (
      select 1
      from public.classes c
      join public.class_enrollments e on e.class_id = c.id
      where c.teacher_id = auth.uid()
        and e.user_id = p_target_user
        and e.status <> 'cancelled'
    )
$$;

revoke all on function private.teacher_can_view_user(uuid) from public;
revoke execute on function private.teacher_can_view_user(uuid) from anon;
grant execute on function private.teacher_can_view_user(uuid) to authenticated;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (select ur.role from public.user_roles ur where ur.user_id = auth.uid()),
    'umum'::public.app_role
  )
$$;

drop policy if exists profiles_read_self_or_staff on public.profiles;
create policy profiles_read_self_or_staff
on public.profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.current_app_role()::text in ('administrator','manager','co_founder','founder')
  or private.teacher_can_view_user(user_id)
);

drop policy if exists roles_read_self_or_staff on public.user_roles;
create policy roles_read_self_or_staff
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.current_app_role()::text in ('administrator','manager','co_founder','founder')
  or private.teacher_can_view_user(user_id)
);

drop policy if exists progress_staff_read on public.lesson_progress;
create policy progress_staff_read
on public.lesson_progress
for select
to authenticated
using (
  public.current_app_role()::text in ('administrator','manager','co_founder','founder')
  or private.teacher_can_view_user(user_id)
);
