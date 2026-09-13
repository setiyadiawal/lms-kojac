-- KOJAC LMS v2 Foundation
-- Prinsip: frontend bukan boundary keamanan. Field administratif hanya dapat diubah melalui RPC terotorisasi.

create extension if not exists pgcrypto;

create type public.app_role as enum ('umum','siswa','pengajar','administrator','co_founder','founder');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  locale text not null default 'id' check (locale in ('id','en','ja')),
  timezone text not null default 'Asia/Jakarta',
  is_approved boolean not null default false,
  is_blocked boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'umum',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  target_user_id uuid references auth.users(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  jlpt_level text check (jlpt_level in ('kana','N5','N4','N3','N2','N1')),
  description text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  unique(course_id, sort_order)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  lesson_type text not null check (lesson_type in ('kana','vocabulary','kanji','grammar','reading','listening','quiz','exam','general')),
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(module_id, sort_order)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  teacher_id uuid references auth.users(id),
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.class_enrollments (
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','paused','cancelled')),
  joined_at timestamptz not null default now(),
  primary key(class_id,user_id)
);

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  score numeric(5,2),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id, lesson_id)
);

create table public.learning_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('hiragana','katakana','vocabulary','kanji')),
  jlpt_level text,
  prompt text not null,
  reading text,
  meaning_id text,
  meaning_en text,
  extra jsonb not null default '{}'::jsonb,
  is_published boolean not null default false
);

create unique index learning_items_unique_key on public.learning_items(item_type, prompt, coalesce(reading,''));

create table public.review_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.learning_items(id) on delete cascade,
  repetitions integer not null default 0 check (repetitions >= 0),
  interval_days integer not null default 0 check (interval_days >= 0),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor between 1.30 and 3.50),
  due_at timestamptz not null default now(),
  last_rating smallint check (last_rating between 0 and 3),
  last_reviewed_at timestamptz,
  primary key(user_id,item_id)
);

-- Helper aman: hanya membaca role pemanggil. search_path dikunci.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.user_roles where user_id = auth.uid()), 'umum'::public.app_role)
$$;

create or replace function public.role_rank(p_role public.app_role)
returns integer language sql immutable as $$
select case p_role
  when 'umum' then 0 when 'siswa' then 1 when 'pengajar' then 2
  when 'administrator' then 3 when 'co_founder' then 4 when 'founder' then 5 end
$$;

-- RPC role dengan validasi server-side. Self-promotion dilarang.
create or replace function public.set_user_role(p_target_user uuid, p_new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_target_role public.app_role;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  select role into v_actor_role from public.user_roles where user_id = v_actor;
  select role into v_target_role from public.user_roles where user_id = p_target_user;
  if v_actor_role is null then raise exception 'role not found'; end if;
  if p_target_user = v_actor then raise exception 'self role change is not allowed'; end if;

  if v_actor_role = 'administrator' and public.role_rank(p_new_role) > 2 then
    raise exception 'administrator may assign at most pengajar';
  elsif v_actor_role = 'co_founder' and public.role_rank(p_new_role) > 3 then
    raise exception 'co-founder may assign at most administrator';
  elsif v_actor_role not in ('administrator','co_founder','founder') then
    raise exception 'insufficient permission';
  end if;

  if v_actor_role <> 'founder' and public.role_rank(coalesce(v_target_role,'umum')) >= public.role_rank(v_actor_role) then
    raise exception 'cannot modify equal or higher role';
  end if;

  insert into public.user_roles(user_id,role,updated_by,updated_at)
  values(p_target_user,p_new_role,v_actor,now())
  on conflict(user_id) do update set role=excluded.role, updated_by=v_actor, updated_at=now();

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'set_user_role',p_target_user,jsonb_build_object('new_role',p_new_role));
end $$;

-- RPC approval. User tidak pernah update is_approved/is_blocked secara langsung.
create or replace function public.set_user_approval(p_target_user uuid, p_approved boolean, p_blocked boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_target_role public.app_role;
begin
  select role into v_actor_role from public.user_roles where user_id=v_actor;
  select role into v_target_role from public.user_roles where user_id=p_target_user;
  if v_actor is null or v_actor_role not in ('administrator','co_founder','founder') then
    raise exception 'insufficient permission';
  end if;
  if p_target_user=v_actor then raise exception 'self approval change is not allowed'; end if;
  if v_actor_role <> 'founder' and public.role_rank(coalesce(v_target_role,'umum')) >= public.role_rank(v_actor_role) then
    raise exception 'cannot change approval for equal or higher role';
  end if;

  update public.profiles set
    is_approved=p_approved,
    is_blocked=p_blocked,
    approved_by=case when p_approved then v_actor else approved_by end,
    approved_at=case when p_approved then now() else approved_at end,
    updated_at=now()
  where user_id=p_target_user;

  if p_approved then
    update public.user_roles set role='siswa', updated_by=v_actor, updated_at=now()
    where user_id=p_target_user and role='umum';
  end if;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'set_user_approval',p_target_user,jsonb_build_object('approved',p_approved,'blocked',p_blocked));
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(user_id,full_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.user_roles(user_id,role) values(new.id,'umum');
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Privilege lockdown: authenticated user hanya boleh mengubah kolom profil non-administratif.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, bio, locale, timezone) on public.profiles to authenticated;

revoke insert, update, delete on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

revoke all on function public.set_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
revoke all on function public.set_user_approval(uuid, boolean, boolean) from public, anon;
grant execute on function public.set_user_approval(uuid, boolean, boolean) to authenticated;
revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- Explicit table privileges. RLS tetap menjadi boundary akses per-baris.
grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.course_modules to authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.class_enrollments to authenticated;
grant select, insert, update, delete on public.lesson_progress to authenticated;
grant select, insert, update, delete on public.learning_items to authenticated;
grant select, insert, update, delete on public.review_progress to authenticated;
grant select on public.admin_audit_logs to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.learning_items enable row level security;
alter table public.review_progress enable row level security;

create policy profiles_read_self_or_staff on public.profiles for select to authenticated
using (user_id=auth.uid() or public.role_rank(public.current_app_role()) >= 2);
create policy profiles_update_self on public.profiles for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy roles_read_self_or_staff on public.user_roles for select to authenticated
using (user_id=auth.uid() or public.role_rank(public.current_app_role()) >= 2);

create policy audit_read_admin on public.admin_audit_logs for select to authenticated
using (public.role_rank(public.current_app_role()) >= 3);

create policy courses_read_published on public.courses for select to authenticated
using (is_published or public.role_rank(public.current_app_role()) >= 2);
create policy courses_manage_staff on public.courses for all to authenticated
using (public.role_rank(public.current_app_role()) >= 2)
with check (public.role_rank(public.current_app_role()) >= 2);

create policy modules_read_if_course on public.course_modules for select to authenticated
using (exists(select 1 from public.courses c where c.id=course_id and (c.is_published or public.role_rank(public.current_app_role())>=2)));
create policy modules_manage_staff on public.course_modules for all to authenticated
using (public.role_rank(public.current_app_role())>=2) with check (public.role_rank(public.current_app_role())>=2);

create policy lessons_read_published on public.lessons for select to authenticated
using (is_published or public.role_rank(public.current_app_role())>=2);
create policy lessons_manage_staff on public.lessons for all to authenticated
using (public.role_rank(public.current_app_role())>=2) with check (public.role_rank(public.current_app_role())>=2);

create policy classes_read_member_or_staff on public.classes for select to authenticated
using (teacher_id=auth.uid() or public.role_rank(public.current_app_role())>=2 or exists(select 1 from public.class_enrollments e where e.class_id=id and e.user_id=auth.uid()));
create policy classes_manage_admin on public.classes for all to authenticated
using (public.role_rank(public.current_app_role())>=3) with check (public.role_rank(public.current_app_role())>=3);

create policy enrollments_read_self_or_staff on public.class_enrollments for select to authenticated
using (user_id=auth.uid() or public.role_rank(public.current_app_role())>=2);
create policy enrollments_manage_staff on public.class_enrollments for all to authenticated
using (public.role_rank(public.current_app_role())>=2) with check (public.role_rank(public.current_app_role())>=2);

create policy progress_own_rows on public.lesson_progress for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy progress_staff_read on public.lesson_progress for select to authenticated
using (public.role_rank(public.current_app_role())>=2);

create policy items_read_published on public.learning_items for select to authenticated
using (is_published or public.role_rank(public.current_app_role())>=2);
create policy items_manage_staff on public.learning_items for all to authenticated
using (public.role_rank(public.current_app_role())>=2) with check (public.role_rank(public.current_app_role())>=2);

create policy review_own_rows on public.review_progress for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Indeks penting
create index idx_lessons_module on public.lessons(module_id,sort_order);
create index idx_modules_course on public.course_modules(course_id,sort_order);
create index idx_review_due on public.review_progress(user_id,due_at);
create index idx_enrollments_user on public.class_enrollments(user_id,status);
