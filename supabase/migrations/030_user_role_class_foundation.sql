-- USER SYSTEM PHASE 2A — ROLE & CLASS FOUNDATION
-- Adds staff/manager roles, preserves safe public signup, introduces programs,
-- extends existing classes/enrollments, and replaces rank-based RLS where the
-- new hierarchy could otherwise grant Staff unintended academic permissions.

-- ---------------------------------------------------------------------------
-- 1. Global role enum
-- ---------------------------------------------------------------------------
alter type public.app_role add value if not exists 'staff' after 'pengajar';
alter type public.app_role add value if not exists 'manager' after 'administrator';

-- ---------------------------------------------------------------------------
-- 2. Role hierarchy helper
-- Use text comparisons so this migration can safely define dependent objects
-- in the same transaction that adds the enum values.
-- ---------------------------------------------------------------------------
create or replace function public.role_rank(p_role public.app_role)
returns integer
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case p_role::text
    when 'umum' then 0
    when 'siswa' then 1
    when 'pengajar' then 2
    when 'staff' then 3
    when 'administrator' then 4
    when 'manager' then 5
    when 'co_founder' then 6
    when 'founder' then 7
  end
$$;

-- ---------------------------------------------------------------------------
-- 3. Role assignment policy
-- Public signup remains controlled separately by handle_new_user(), which only
-- accepts siswa and falls back every other requested value to umum.
-- ---------------------------------------------------------------------------
create or replace function public.set_user_role(
  p_target_user uuid,
  p_new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_target_role public.app_role;
  v_actor_role_text text;
  v_new_role_text text;
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;

  if p_new_role is null then
    raise exception 'new role required';
  end if;

  select role into v_actor_role
  from public.user_roles
  where user_id = v_actor;

  select role into v_target_role
  from public.user_roles
  where user_id = p_target_user;

  if v_actor_role is null then
    raise exception 'role not found';
  end if;

  if p_target_user = v_actor then
    raise exception 'self role change is not allowed';
  end if;

  v_actor_role_text := v_actor_role::text;
  v_new_role_text := p_new_role::text;

  if v_actor_role_text = 'administrator' then
    if v_new_role_text not in ('umum','siswa','pengajar','staff') then
      raise exception 'administrator may assign at most staff';
    end if;
  elsif v_actor_role_text = 'manager' then
    if v_new_role_text not in ('umum','siswa','pengajar','staff','administrator') then
      raise exception 'manager may assign at most administrator';
    end if;
  elsif v_actor_role_text = 'co_founder' then
    if v_new_role_text not in ('umum','siswa','pengajar','staff','administrator','manager') then
      raise exception 'co-founder may assign at most manager';
    end if;
  elsif v_actor_role_text = 'founder' then
    null;
  else
    raise exception 'insufficient permission';
  end if;

  if v_actor_role_text <> 'founder'
    and public.role_rank(coalesce(v_target_role, 'umum'::public.app_role)) >= public.role_rank(v_actor_role) then
    raise exception 'cannot modify equal or higher role';
  end if;

  insert into public.user_roles(user_id, role, updated_by, updated_at)
  values(p_target_user, p_new_role, v_actor, now())
  on conflict(user_id) do update
    set role = excluded.role,
        updated_by = v_actor,
        updated_at = now();

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values(v_actor, 'set_user_role', p_target_user, jsonb_build_object('new_role', p_new_role));
end
$$;

revoke all on function public.set_user_role(uuid, public.app_role) from public;
revoke execute on function public.set_user_role(uuid, public.app_role) from anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Approval policy
-- Manager joins the existing approval hierarchy. Email verification remains
-- mandatory. Approval never mutates the target's global role.
-- ---------------------------------------------------------------------------
create or replace function public.set_user_approval(
  p_target_user uuid,
  p_approved boolean,
  p_blocked boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_target_role public.app_role;
  v_target_email_confirmed_at timestamptz;
  v_updated_rows integer := 0;
begin
  select role into v_actor_role
  from public.user_roles
  where user_id = v_actor;

  select role into v_target_role
  from public.user_roles
  where user_id = p_target_user;

  if v_actor is null
    or v_actor_role is null
    or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient permission';
  end if;

  if p_target_user = v_actor then
    raise exception 'self approval change is not allowed';
  end if;

  if v_actor_role::text <> 'founder'
    and public.role_rank(coalesce(v_target_role, 'umum'::public.app_role)) >= public.role_rank(v_actor_role) then
    raise exception 'cannot change approval for equal or higher role';
  end if;

  if p_approved and not p_blocked then
    select email_confirmed_at into v_target_email_confirmed_at
    from auth.users
    where id = p_target_user;

    if not found then
      raise exception 'target_user_not_found';
    end if;

    if v_target_email_confirmed_at is null then
      raise exception 'email_not_verified';
    end if;
  end if;

  update public.profiles
  set
    is_approved = p_approved,
    is_blocked = p_blocked,
    approved_by = case
      when p_approved and approved_at is null then v_actor
      else approved_by
    end,
    approved_at = case
      when p_approved then coalesce(approved_at, now())
      else approved_at
    end,
    updated_at = now()
  where user_id = p_target_user;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then
    raise exception 'target_profile_not_found';
  end if;

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values(
    v_actor,
    'set_user_approval',
    p_target_user,
    jsonb_build_object('approved', p_approved, 'blocked', p_blocked)
  );
end
$$;

revoke all on function public.set_user_approval(uuid, boolean, boolean) from public;
revoke execute on function public.set_user_approval(uuid, boolean, boolean) from anon;
grant execute on function public.set_user_approval(uuid, boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Secure Admin User Management list
-- ---------------------------------------------------------------------------
create or replace function public.list_admin_users()
returns table (
  user_id uuid,
  full_name text,
  is_approved boolean,
  is_blocked boolean,
  role public.app_role,
  email_verified boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  select actor_role.role into v_actor_role
  from public.user_roles actor_role
  where actor_role.user_id = v_actor;

  if v_actor is null
    or v_actor_role is null
    or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;

  return query
  select
    profile.user_id,
    profile.full_name,
    profile.is_approved,
    profile.is_blocked,
    account_role.role,
    (auth_user.email_confirmed_at is not null) as email_verified
  from public.profiles profile
  join public.user_roles account_role
    on account_role.user_id = profile.user_id
  join auth.users auth_user
    on auth_user.id = profile.user_id
  order by profile.created_at desc;
end
$$;

revoke all on function public.list_admin_users() from public;
revoke execute on function public.list_admin_users() from anon;
grant execute on function public.list_admin_users() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Program foundation
-- ---------------------------------------------------------------------------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.programs enable row level security;

revoke all on public.programs from anon;
revoke all on public.programs from authenticated;
grant select, insert, update, delete on public.programs to authenticated;

create policy programs_read_active
on public.programs
for select
to authenticated
using (is_active);

create policy programs_manage
on public.programs
for all
to authenticated
using (public.current_app_role()::text in ('administrator','manager','co_founder','founder'))
with check (public.current_app_role()::text in ('administrator','manager','co_founder','founder'));

-- ---------------------------------------------------------------------------
-- 7. Extend existing classes and enrollments
-- ---------------------------------------------------------------------------
alter table public.classes
  add column program_id uuid references public.programs(id) on delete set null,
  add column code text,
  add column status text not null default 'planned'
    check (status in ('planned','active','completed','cancelled'));

create unique index classes_code_unique
  on public.classes(code)
  where code is not null;

create index idx_classes_program_id on public.classes(program_id);
create index idx_classes_teacher_id on public.classes(teacher_id);
create index idx_classes_status on public.classes(status);

alter table public.class_enrollments
  add column completed_at timestamptz;

-- Helper used only by enrollment RLS to avoid recursive policies between
-- classes and class_enrollments. It binds authorization to auth.uid() and the
-- caller's actual global role; Staff does not become a teacher automatically.
create or replace function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder')
    and exists (
      select 1
      from public.classes c
      where c.id = p_class_id
        and c.teacher_id = auth.uid()
    )
$$;

revoke all on function public.is_class_teacher(uuid) from public;
revoke execute on function public.is_class_teacher(uuid) from anon;
grant execute on function public.is_class_teacher(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. RLS hardening for the expanded role model
-- Replace numeric rank-based policies where Staff would otherwise inherit
-- Pengajar/management permissions merely because its hierarchy rank is higher.
-- ---------------------------------------------------------------------------

drop policy if exists profiles_read_self_or_staff on public.profiles;
create policy profiles_read_self_or_staff
on public.profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder')
);

drop policy if exists roles_read_self_or_staff on public.user_roles;
create policy roles_read_self_or_staff
on public.user_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder')
);

drop policy if exists audit_read_admin on public.admin_audit_logs;
create policy audit_read_admin
on public.admin_audit_logs
for select
to authenticated
using (public.current_app_role()::text in ('administrator','manager','co_founder','founder'));

drop policy if exists courses_read_published on public.courses;
create policy courses_read_published
on public.courses
for select
to authenticated
using (
  is_published
  or public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder')
);

drop policy if exists courses_manage_staff on public.courses;
create policy courses_manage_staff
on public.courses
for all
to authenticated
using (public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder'))
with check (public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder'));

drop policy if exists modules_read_if_course on public.course_modules;
create policy modules_read_if_course
on public.course_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_id
      and (
        c.is_published
        or public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder')
      )
  )
);

drop policy if exists modules_manage_staff on public.course_modules;
create policy modules_manage_staff
on public.course_modules
for all
to authenticated
using (public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder'))
with check (public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder'));

drop policy if exists lessons_read_published on public.lessons;
create policy lessons_read_published
on public.lessons
for select
to authenticated
using (
  is_published
  or public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder')
);

drop policy if exists lessons_manage_staff on public.lessons;
create policy lessons_manage_staff
on public.lessons
for all
to authenticated
using (public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder'))
with check (public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder'));

drop policy if exists items_read_published on public.learning_items;
create policy items_read_published
on public.learning_items
for select
to authenticated
using (
  is_published
  or public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder')
);

drop policy if exists items_manage_staff on public.learning_items;
create policy items_manage_staff
on public.learning_items
for all
to authenticated
using (public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder'))
with check (public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder'));

drop policy if exists progress_staff_read on public.lesson_progress;
create policy progress_staff_read
on public.lesson_progress
for select
to authenticated
using (public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder'));

drop policy if exists classes_read_member_or_staff on public.classes;
create policy classes_read_member_or_staff
on public.classes
for select
to authenticated
using (
  (
    teacher_id = auth.uid()
    and public.current_app_role()::text in ('pengajar','administrator','manager','co_founder','founder')
  )
  or public.current_app_role()::text in ('administrator','manager','co_founder','founder')
  or exists (
    select 1
    from public.class_enrollments e
    where e.class_id = classes.id
      and e.user_id = auth.uid()
  )
);

drop policy if exists classes_manage_admin on public.classes;
create policy classes_manage_admin
on public.classes
for all
to authenticated
using (public.current_app_role()::text in ('administrator','manager','co_founder','founder'))
with check (public.current_app_role()::text in ('administrator','manager','co_founder','founder'));

drop policy if exists enrollments_read_self_or_staff on public.class_enrollments;
create policy enrollments_read_self_or_staff
on public.class_enrollments
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_app_role()::text in ('administrator','manager','co_founder','founder')
  or public.is_class_teacher(class_id)
);

drop policy if exists enrollments_manage_staff on public.class_enrollments;
create policy enrollments_manage_staff
on public.class_enrollments
for all
to authenticated
using (public.current_app_role()::text in ('administrator','manager','co_founder','founder'))
with check (public.current_app_role()::text in ('administrator','manager','co_founder','founder'));
