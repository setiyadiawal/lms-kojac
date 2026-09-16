-- CLASSROOM PHASE 2 — STUDENT DETAIL + SUBSTITUTE TEACHER + MANAGEMENT OVERVIEW
-- CANDIDATE MIGRATION ONLY. DO NOT APPLY BEFORE REVIEW.
-- Primary teacher remains public.classes.teacher_id.

-- ---------------------------------------------------------------------------
-- 1. Temporary substitute-teacher assignments
-- ---------------------------------------------------------------------------
create table public.class_teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  teacher_id uuid null,
  teacher_name_snapshot text not null,
  assignment_type text not null default 'substitute',
  starts_on date not null,
  ends_on date not null,
  note text null,
  is_active boolean not null default true,
  assigned_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_teacher_assignments_class_id_fkey
    foreign key (class_id) references public.classes(id) on delete cascade,
  constraint class_teacher_assignments_teacher_id_fkey
    foreign key (teacher_id) references auth.users(id) on delete set null,
  constraint class_teacher_assignments_assigned_by_fkey
    foreign key (assigned_by) references auth.users(id) on delete set null,
  constraint class_teacher_assignments_type_check
    check (assignment_type = 'substitute'),
  constraint class_teacher_assignments_date_check
    check (ends_on >= starts_on),
  constraint class_teacher_assignments_note_check
    check (note is null or char_length(note) <= 1000)
);

create unique index class_teacher_assignments_active_exact_uidx
  on public.class_teacher_assignments(class_id, teacher_id, assignment_type, starts_on, ends_on)
  where is_active;

create index class_teacher_assignments_class_range_idx
  on public.class_teacher_assignments(class_id, starts_on, ends_on)
  where is_active;

create index class_teacher_assignments_teacher_range_idx
  on public.class_teacher_assignments(teacher_id, starts_on, ends_on)
  where is_active;

alter table public.class_teacher_assignments enable row level security;

-- This table is intentionally RPC-only. It does not rely on Data API table exposure.
revoke all on table public.class_teacher_assignments from public;
revoke all on table public.class_teacher_assignments from anon;
revoke all on table public.class_teacher_assignments from authenticated;

-- ---------------------------------------------------------------------------
-- 2. Server-authoritative capability helpers
-- ---------------------------------------------------------------------------
create or replace function private.classroom_is_management()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text in ('administrator','manager','co_founder','founder')
    )
$$;

create or replace function private.classroom_can_teach_class(
  p_class_id uuid,
  p_on_date date default null
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text in ('pengajar','administrator','manager','co_founder','founder')
    )
    and (
      exists (
        select 1
        from public.classes c
        where c.id = p_class_id
          and c.teacher_id = auth.uid()
      )
      or exists (
        select 1
        from public.class_teacher_assignments a
        where a.class_id = p_class_id
          and a.teacher_id = auth.uid()
          and a.assignment_type = 'substitute'
          and a.is_active
          and coalesce(p_on_date, (current_timestamp at time zone 'Asia/Jakarta')::date)
              between a.starts_on and a.ends_on
      )
    )
$$;

revoke all on function private.classroom_is_management() from public;
revoke all on function private.classroom_is_management() from anon;
revoke all on function private.classroom_is_management() from authenticated;
revoke all on function private.classroom_can_teach_class(uuid,date) from public;
revoke all on function private.classroom_can_teach_class(uuid,date) from anon;
revoke all on function private.classroom_can_teach_class(uuid,date) from authenticated;

-- Preserve the public helper signature already used by RLS, but make substitute
-- access server-authoritative through the private capability helper.
create or replace function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.classroom_can_teach_class(p_class_id, null)
$$;

revoke all on function public.is_class_teacher(uuid) from public;
revoke execute on function public.is_class_teacher(uuid) from anon;
grant execute on function public.is_class_teacher(uuid) to authenticated;

create or replace function private.teacher_can_view_user(p_target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.user_roles target_role
      where target_role.user_id = p_target_user
        and target_role.role::text = 'siswa'
    )
    and exists (
      select 1
      from public.class_enrollments e
      where e.user_id = p_target_user
        and e.status <> 'cancelled'
        and private.classroom_can_teach_class(e.class_id, null)
    )
$$;

-- Existing profile policy calls this function internally; do not expose it as an RPC.
revoke all on function private.teacher_can_view_user(uuid) from public;
revoke all on function private.teacher_can_view_user(uuid) from anon;
grant execute on function private.teacher_can_view_user(uuid) to authenticated;

-- Substitute teachers must be able to read the class row itself while assigned.
drop policy if exists classes_read_member_or_staff on public.classes;
create policy classes_read_member_or_staff
on public.classes
for select
to authenticated
using (
  public.is_class_teacher(id)
  or public.current_app_role()::text in ('administrator','manager','co_founder','founder')
  or exists (
    select 1
    from public.class_enrollments e
    where e.class_id = classes.id
      and e.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 3. Teacher workspace — assigned classes and students
-- ---------------------------------------------------------------------------
-- Return shape gains primary-teacher identity, so recreate the existing RPC explicitly.
drop function public.get_my_teaching_classes();

create function public.get_my_teaching_classes()
returns table (
  class_id uuid,
  class_code text,
  class_name text,
  class_status text,
  starts_on date,
  ends_on date,
  program_code text,
  program_name text,
  primary_teacher_id uuid,
  primary_teacher_name text,
  student_count_active integer,
  student_count_paused integer,
  student_count_total_current integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select ur.role into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  return query
  select
    c.id,
    c.code,
    c.name,
    c.status::text,
    c.starts_on,
    c.ends_on,
    pr.code,
    pr.name,
    c.teacher_id,
    coalesce(nullif(btrim(tp.full_name), ''), nullif(btrim(tp.nickname), ''), 'Belum ditentukan'),
    count(e.user_id) filter (where e.status = 'active')::integer,
    count(e.user_id) filter (where e.status = 'paused')::integer,
    count(e.user_id) filter (where e.status in ('active','paused'))::integer
  from public.classes c
  left join public.programs pr on pr.id = c.program_id
  left join public.profiles tp on tp.user_id = c.teacher_id
  left join public.class_enrollments e on e.class_id = c.id
  where private.classroom_can_teach_class(c.id, null)
  group by c.id, c.code, c.name, c.status, c.teacher_id, c.starts_on, c.ends_on, c.created_at, pr.code, pr.name, tp.full_name, tp.nickname
  order by
    case c.status
      when 'active' then 1
      when 'planned' then 2
      when 'completed' then 3
      when 'cancelled' then 4
      else 5
    end,
    c.starts_on desc nulls last,
    c.created_at desc;
end
$$;

revoke all on function public.get_my_teaching_classes() from public;
revoke execute on function public.get_my_teaching_classes() from anon;
grant execute on function public.get_my_teaching_classes() to authenticated;

create or replace function public.get_my_class_students(p_class_id uuid)
returns table (
  user_id uuid,
  full_name text,
  nickname text,
  enrollment_status text,
  joined_at timestamptz,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select ur.role into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  if not exists (select 1 from public.classes c where c.id = p_class_id) then
    raise exception 'class_not_found';
  end if;

  if not private.classroom_is_management()
    and not private.classroom_can_teach_class(p_class_id, null) then
    raise exception 'teacher_class_access_denied';
  end if;

  return query
  select
    e.user_id,
    p.full_name,
    p.nickname,
    e.status::text,
    e.joined_at,
    e.completed_at
  from public.class_enrollments e
  join public.profiles p on p.user_id = e.user_id
  where e.class_id = p_class_id
  order by
    case e.status
      when 'active' then 1
      when 'paused' then 2
      when 'completed' then 3
      when 'cancelled' then 4
      else 5
    end,
    e.joined_at desc,
    p.full_name nulls last;
end
$$;

revoke all on function public.get_my_class_students(uuid) from public;
revoke execute on function public.get_my_class_students(uuid) from anon;
grant execute on function public.get_my_class_students(uuid) to authenticated;

create or replace function public.get_class_student_detail(
  p_class_id uuid,
  p_student_id uuid
)
returns table (
  student_id uuid,
  full_name text,
  nickname text,
  program_id uuid,
  program_code text,
  program_name text,
  class_id uuid,
  class_code text,
  class_name text,
  enrollment_status text,
  joined_at timestamptz,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select ur.role into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  if not exists (select 1 from public.classes c where c.id = p_class_id) then
    raise exception 'class_not_found';
  end if;

  if not private.classroom_is_management()
    and not private.classroom_can_teach_class(p_class_id, null) then
    raise exception 'teacher_class_access_denied';
  end if;

  if not exists (
    select 1
    from public.class_enrollments e
    where e.class_id = p_class_id
      and e.user_id = p_student_id
  ) then
    raise exception 'student_not_in_class';
  end if;

  return query
  select
    p.user_id,
    p.full_name,
    p.nickname,
    pr.id,
    pr.code,
    pr.name,
    c.id,
    c.code,
    c.name,
    e.status::text,
    e.joined_at,
    e.completed_at
  from public.class_enrollments e
  join public.profiles p on p.user_id = e.user_id
  join public.classes c on c.id = e.class_id
  left join public.programs pr on pr.id = c.program_id
  where e.class_id = p_class_id
    and e.user_id = p_student_id;
end
$$;

revoke all on function public.get_class_student_detail(uuid,uuid) from public;
revoke execute on function public.get_class_student_detail(uuid,uuid) from anon;
grant execute on function public.get_class_student_detail(uuid,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Management all-class read overview
-- ---------------------------------------------------------------------------
create or replace function public.get_management_classes_overview()
returns table (
  class_id uuid,
  class_code text,
  class_name text,
  class_status text,
  program_name text,
  program_code text,
  primary_teacher_id uuid,
  primary_teacher_name text,
  starts_on date,
  ends_on date,
  student_active_count integer,
  student_paused_count integer,
  report_count integer,
  last_report_date date
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.classroom_is_management() then raise exception 'management_access_required'; end if;

  return query
  select
    c.id,
    c.code,
    c.name,
    c.status::text,
    pr.name,
    pr.code,
    c.teacher_id,
    coalesce(nullif(btrim(tp.full_name), ''), nullif(btrim(tp.nickname), ''), 'Belum ditentukan'),
    c.starts_on,
    c.ends_on,
    count(distinct e.user_id) filter (where e.status = 'active')::integer,
    count(distinct e.user_id) filter (where e.status = 'paused')::integer,
    count(distinct r.id)::integer,
    max(r.report_date)
  from public.classes c
  left join public.programs pr on pr.id = c.program_id
  left join public.profiles tp on tp.user_id = c.teacher_id
  left join public.class_enrollments e on e.class_id = c.id
  left join public.teaching_reports r on r.class_id = c.id
  group by c.id, c.code, c.name, c.status, pr.name, pr.code, c.teacher_id,
           tp.full_name, tp.nickname, c.starts_on, c.ends_on, c.created_at
  order by
    case c.status
      when 'active' then 1
      when 'planned' then 2
      when 'completed' then 3
      when 'cancelled' then 4
      else 5
    end,
    c.starts_on desc nulls last,
    c.created_at desc;
end
$$;

revoke all on function public.get_management_classes_overview() from public;
revoke execute on function public.get_management_classes_overview() from anon;
grant execute on function public.get_management_classes_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Management substitute-assignment RPCs
-- ---------------------------------------------------------------------------
create or replace function public.get_class_teacher_assignments(p_class_id uuid)
returns table (
  assignment_id uuid,
  class_id uuid,
  teacher_id uuid,
  teacher_name text,
  assignment_type text,
  starts_on date,
  ends_on date,
  note text,
  is_active boolean,
  assigned_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.classroom_is_management() then raise exception 'management_access_required'; end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id) then raise exception 'class_not_found'; end if;

  return query
  select
    a.id,
    a.class_id,
    a.teacher_id,
    coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.nickname), ''), a.teacher_name_snapshot),
    a.assignment_type,
    a.starts_on,
    a.ends_on,
    a.note,
    a.is_active,
    a.assigned_by,
    a.created_at,
    a.updated_at
  from public.class_teacher_assignments a
  left join public.profiles p on p.user_id = a.teacher_id
  where a.class_id = p_class_id
  order by a.is_active desc, a.starts_on desc, a.created_at desc;
end
$$;

create or replace function public.create_class_teacher_assignment(
  p_class_id uuid,
  p_teacher_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_teacher_role public.app_role;
  v_primary_teacher uuid;
  v_class_status text;
  v_class_starts_on date;
  v_class_ends_on date;
  v_teacher_name text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_assignment_id uuid;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.classroom_is_management() then raise exception 'management_access_required'; end if;

  select c.teacher_id, c.status::text, c.starts_on, c.ends_on
  into v_primary_teacher, v_class_status, v_class_starts_on, v_class_ends_on
  from public.classes c
  where c.id = p_class_id;
  if not found then raise exception 'class_not_found'; end if;

  if v_class_status not in ('planned','active') then
    raise exception 'class_not_open_for_substitute';
  end if;

  if p_teacher_id is null then raise exception 'teacher_required'; end if;
  if p_starts_on is null or p_ends_on is null then raise exception 'assignment_dates_required'; end if;
  if p_ends_on < p_starts_on then raise exception 'invalid_assignment_dates'; end if;
  if v_class_starts_on is not null and p_starts_on < v_class_starts_on then
    raise exception 'assignment_outside_class_period';
  end if;
  if v_class_ends_on is not null and p_ends_on > v_class_ends_on then
    raise exception 'assignment_outside_class_period';
  end if;
  if char_length(coalesce(v_note, '')) > 1000 then raise exception 'assignment_note_too_long'; end if;
  if v_primary_teacher is not null and v_primary_teacher = p_teacher_id then
    raise exception 'teacher_already_primary';
  end if;

  select ur.role,
         coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.nickname), ''), 'Pengajar KOJAC')
  into v_teacher_role, v_teacher_name
  from public.user_roles ur
  left join public.profiles p on p.user_id = ur.user_id
  where ur.user_id = p_teacher_id;

  if v_teacher_role is null
    or v_teacher_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teacher_not_eligible';
  end if;

  if exists (
    select 1
    from public.class_teacher_assignments a
    where a.class_id = p_class_id
      and a.teacher_id = p_teacher_id
      and a.assignment_type = 'substitute'
      and a.is_active
      and daterange(a.starts_on, a.ends_on, '[]') && daterange(p_starts_on, p_ends_on, '[]')
  ) then
    raise exception 'substitute_assignment_overlap';
  end if;

  insert into public.class_teacher_assignments(
    class_id, teacher_id, teacher_name_snapshot, assignment_type, starts_on, ends_on, note, is_active, assigned_by
  ) values (
    p_class_id, p_teacher_id, v_teacher_name, 'substitute', p_starts_on, p_ends_on, v_note, true, v_actor
  )
  returning id into v_assignment_id;

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values (
    v_actor,
    'create_class_teacher_assignment',
    p_teacher_id,
    jsonb_build_object(
      'assignment_id', v_assignment_id,
      'class_id', p_class_id,
      'starts_on', p_starts_on,
      'ends_on', p_ends_on,
      'note', v_note
    )
  );

  return v_assignment_id;
end
$$;

create or replace function public.deactivate_class_teacher_assignment(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_before public.class_teacher_assignments%rowtype;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.classroom_is_management() then raise exception 'management_access_required'; end if;

  select * into v_before
  from public.class_teacher_assignments a
  where a.id = p_assignment_id
  for update;

  if not found then raise exception 'teacher_assignment_not_found'; end if;

  update public.class_teacher_assignments
  set is_active = false,
      updated_at = now()
  where id = p_assignment_id;

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values (
    v_actor,
    'deactivate_class_teacher_assignment',
    v_before.teacher_id,
    jsonb_build_object(
      'assignment_id', p_assignment_id,
      'class_id', v_before.class_id,
      'starts_on', v_before.starts_on,
      'ends_on', v_before.ends_on
    )
  );
end
$$;

revoke all on function public.get_class_teacher_assignments(uuid) from public;
revoke execute on function public.get_class_teacher_assignments(uuid) from anon;
grant execute on function public.get_class_teacher_assignments(uuid) to authenticated;
revoke all on function public.create_class_teacher_assignment(uuid,uuid,date,date,text) from public;
revoke execute on function public.create_class_teacher_assignment(uuid,uuid,date,date,text) from anon;
grant execute on function public.create_class_teacher_assignment(uuid,uuid,date,date,text) to authenticated;
revoke all on function public.deactivate_class_teacher_assignment(uuid) from public;
revoke execute on function public.deactivate_class_teacher_assignment(uuid) from anon;
grant execute on function public.deactivate_class_teacher_assignment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Teaching reports — class-history read + assignment-date write protection
-- ---------------------------------------------------------------------------
create or replace function public.get_my_teaching_reports(p_class_id uuid)
returns table (
  report_id uuid,
  class_id uuid,
  teacher_id uuid,
  teacher_name text,
  report_date date,
  starts_at time without time zone,
  ends_at time without time zone,
  material_summary text,
  assignment_summary text,
  next_plan text,
  evaluation_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select ur.role into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  if not exists (select 1 from public.classes c where c.id = p_class_id) then
    raise exception 'class_not_found';
  end if;

  if not private.classroom_can_teach_class(p_class_id, null) then
    raise exception 'teacher_class_access_denied';
  end if;

  return query
  select
    r.id,
    r.class_id,
    r.teacher_id,
    r.teacher_name_snapshot,
    r.report_date,
    r.starts_at,
    r.ends_at,
    r.material_summary,
    r.assignment_summary,
    r.next_plan,
    r.evaluation_notes,
    r.created_at,
    r.updated_at
  from public.teaching_reports r
  where r.class_id = p_class_id
  order by r.report_date desc, r.starts_at desc, r.created_at desc;
end
$$;

revoke all on function public.get_my_teaching_reports(uuid) from public;
revoke execute on function public.get_my_teaching_reports(uuid) from anon;
grant execute on function public.get_my_teaching_reports(uuid) to authenticated;

create or replace function public.create_teaching_report(
  p_class_id uuid,
  p_report_date date,
  p_starts_at time without time zone,
  p_ends_at time without time zone,
  p_material_summary text,
  p_assignment_summary text,
  p_next_plan text,
  p_evaluation_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_class_status text;
  v_primary_teacher uuid;
  v_teacher_name text;
  v_material text := btrim(coalesce(p_material_summary, ''));
  v_assignment text := btrim(coalesce(p_assignment_summary, ''));
  v_next_plan text := btrim(coalesce(p_next_plan, ''));
  v_evaluation text := nullif(btrim(coalesce(p_evaluation_notes, '')), '');
  v_today date := (clock_timestamp() at time zone 'Asia/Jakarta')::date;
  v_report_id uuid;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select ur.role into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  if p_report_date is null then raise exception 'report_date_required'; end if;
  if p_report_date > v_today then raise exception 'report_date_future'; end if;

  select c.status, c.teacher_id
  into v_class_status, v_primary_teacher
  from public.classes c
  where c.id = p_class_id;

  if not found then raise exception 'class_not_found'; end if;
  if v_class_status <> 'active' then raise exception 'class_not_active_for_report'; end if;

  if v_primary_teacher is distinct from v_actor
    and not private.classroom_can_teach_class(p_class_id, p_report_date) then
    if exists (
      select 1
      from public.class_teacher_assignments a
      where a.class_id = p_class_id
        and a.teacher_id = v_actor
        and a.assignment_type = 'substitute'
        and a.is_active
    ) then
      raise exception 'substitute_report_date_outside_assignment';
    end if;
    raise exception 'teacher_class_access_denied';
  end if;

  if p_starts_at is null or p_ends_at is null then raise exception 'report_time_required'; end if;
  if p_ends_at <= p_starts_at then raise exception 'invalid_report_time'; end if;
  if v_material = '' then raise exception 'material_required'; end if;
  if v_assignment = '' then raise exception 'assignment_required'; end if;
  if v_next_plan = '' then raise exception 'next_plan_required'; end if;
  if char_length(v_material) > 10000
    or char_length(v_assignment) > 10000
    or char_length(v_next_plan) > 10000
    or char_length(coalesce(v_evaluation, '')) > 10000 then
    raise exception 'report_text_too_long';
  end if;

  select coalesce(
    nullif(btrim(p.full_name), ''),
    nullif(btrim(p.nickname), ''),
    'Pengajar KOJAC'
  ) into v_teacher_name
  from public.profiles p
  where p.user_id = v_actor;

  v_teacher_name := coalesce(v_teacher_name, 'Pengajar KOJAC');

  insert into public.teaching_reports(
    class_id, teacher_id, teacher_name_snapshot, report_date, starts_at, ends_at,
    material_summary, assignment_summary, next_plan, evaluation_notes
  ) values (
    p_class_id, v_actor, v_teacher_name, p_report_date, p_starts_at, p_ends_at,
    v_material, v_assignment, v_next_plan, v_evaluation
  )
  returning id into v_report_id;

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values (
    v_actor,
    'create_teaching_report',
    v_actor,
    jsonb_build_object('report_id', v_report_id, 'class_id', p_class_id, 'report_date', p_report_date)
  );

  return v_report_id;
end
$$;

revoke all on function public.create_teaching_report(uuid,date,time without time zone,time without time zone,text,text,text,text) from public;
revoke execute on function public.create_teaching_report(uuid,date,time without time zone,time without time zone,text,text,text,text) from anon;
grant execute on function public.create_teaching_report(uuid,date,time without time zone,time without time zone,text,text,text,text) to authenticated;

create or replace function public.update_teaching_report(
  p_report_id uuid,
  p_report_date date,
  p_starts_at time without time zone,
  p_ends_at time without time zone,
  p_material_summary text,
  p_assignment_summary text,
  p_next_plan text,
  p_evaluation_notes text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_before public.teaching_reports%rowtype;
  v_after public.teaching_reports%rowtype;
  v_primary_teacher uuid;
  v_material text := btrim(coalesce(p_material_summary, ''));
  v_assignment text := btrim(coalesce(p_assignment_summary, ''));
  v_next_plan text := btrim(coalesce(p_next_plan, ''));
  v_evaluation text := nullif(btrim(coalesce(p_evaluation_notes, '')), '');
  v_today date := (clock_timestamp() at time zone 'Asia/Jakarta')::date;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select ur.role into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  select * into v_before
  from public.teaching_reports r
  where r.id = p_report_id
  for update;

  if not found then raise exception 'teaching_report_not_found'; end if;
  if v_before.teacher_id is distinct from v_actor then raise exception 'teaching_report_access_denied'; end if;

  if p_report_date is null then raise exception 'report_date_required'; end if;
  if p_report_date > v_today then raise exception 'report_date_future'; end if;

  select c.teacher_id into v_primary_teacher
  from public.classes c
  where c.id = v_before.class_id;

  if not found then raise exception 'class_not_found'; end if;

  if v_primary_teacher is distinct from v_actor
    and not private.classroom_can_teach_class(v_before.class_id, p_report_date) then
    if exists (
      select 1
      from public.class_teacher_assignments a
      where a.class_id = v_before.class_id
        and a.teacher_id = v_actor
        and a.assignment_type = 'substitute'
        and a.is_active
    ) then
      raise exception 'substitute_report_date_outside_assignment';
    end if;
    raise exception 'teacher_class_access_denied';
  end if;

  if p_starts_at is null or p_ends_at is null then raise exception 'report_time_required'; end if;
  if p_ends_at <= p_starts_at then raise exception 'invalid_report_time'; end if;
  if v_material = '' then raise exception 'material_required'; end if;
  if v_assignment = '' then raise exception 'assignment_required'; end if;
  if v_next_plan = '' then raise exception 'next_plan_required'; end if;
  if char_length(v_material) > 10000
    or char_length(v_assignment) > 10000
    or char_length(v_next_plan) > 10000
    or char_length(coalesce(v_evaluation, '')) > 10000 then
    raise exception 'report_text_too_long';
  end if;

  update public.teaching_reports
  set report_date = p_report_date,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      material_summary = v_material,
      assignment_summary = v_assignment,
      next_plan = v_next_plan,
      evaluation_notes = v_evaluation,
      updated_at = now()
  where id = p_report_id
  returning * into v_after;

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values (
    v_actor,
    'update_teaching_report',
    v_actor,
    jsonb_build_object(
      'report_id', p_report_id,
      'class_id', v_before.class_id,
      'report_date', p_report_date,
      'before', jsonb_build_object(
        'report_date', v_before.report_date,
        'starts_at', v_before.starts_at,
        'ends_at', v_before.ends_at,
        'material_length', char_length(v_before.material_summary),
        'assignment_length', char_length(v_before.assignment_summary),
        'next_plan_length', char_length(v_before.next_plan),
        'evaluation_length', char_length(coalesce(v_before.evaluation_notes, ''))
      ),
      'after', jsonb_build_object(
        'report_date', v_after.report_date,
        'starts_at', v_after.starts_at,
        'ends_at', v_after.ends_at,
        'material_length', char_length(v_after.material_summary),
        'assignment_length', char_length(v_after.assignment_summary),
        'next_plan_length', char_length(v_after.next_plan),
        'evaluation_length', char_length(coalesce(v_after.evaluation_notes, ''))
      )
    )
  );
end
$$;

revoke all on function public.update_teaching_report(uuid,date,time without time zone,time without time zone,text,text,text,text) from public;
revoke execute on function public.update_teaching_report(uuid,date,time without time zone,time without time zone,text,text,text,text) from anon;
grant execute on function public.update_teaching_report(uuid,date,time without time zone,time without time zone,text,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Class primary-teacher integrity
-- ---------------------------------------------------------------------------
create or replace function public.update_class(
  p_class_id uuid,
  p_program_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_teacher_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_teacher_role public.app_role;
  v_code text := nullif(btrim(coalesce(p_code, '')), '');
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_before public.classes%rowtype;
  v_after public.classes%rowtype;
  v_today date := (current_timestamp at time zone 'Asia/Jakarta')::date;
begin
  select role into v_actor_role from public.user_roles where user_id=v_actor;
  if v_actor is null or v_actor_role is null
    or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;
  if v_name = '' then raise exception 'class_name_required'; end if;
  if v_status not in ('planned','active','completed','cancelled') then raise exception 'invalid_class_status'; end if;
  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then raise exception 'invalid_class_dates'; end if;
  if not exists(select 1 from public.programs where id=p_program_id) then raise exception 'program_not_found'; end if;

  select role into v_teacher_role from public.user_roles where user_id=p_teacher_id;
  if v_teacher_role is null
    or v_teacher_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teacher_not_eligible';
  end if;

  select * into v_before from public.classes where id=p_class_id;
  if not found then raise exception 'class_not_found'; end if;

  if exists (
    select 1
    from public.class_teacher_assignments a
    where a.class_id = p_class_id
      and a.teacher_id = p_teacher_id
      and a.is_active
      and a.ends_on >= v_today
  ) then
    raise exception 'teacher_has_substitute_assignment';
  end if;

  begin
    update public.classes
    set program_id=p_program_id,
        code=v_code,
        name=v_name,
        description=v_description,
        teacher_id=p_teacher_id,
        starts_on=p_starts_on,
        ends_on=p_ends_on,
        status=v_status,
        is_active=(v_status in ('planned','active'))
    where id=p_class_id
    returning * into v_after;
  exception
    when unique_violation then raise exception 'class_code_exists';
  end;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'update_class',null,jsonb_build_object(
    'class_id',p_class_id,
    'before',to_jsonb(v_before),
    'after',to_jsonb(v_after)
  ));
end
$$;

revoke all on function public.update_class(uuid,uuid,text,text,text,uuid,date,date,text) from public;
revoke execute on function public.update_class(uuid,uuid,text,text,text,uuid,date,date,text) from anon;
grant execute on function public.update_class(uuid,uuid,text,text,text,uuid,date,date,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Preserve active-role integrity for substitute assignments
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
  v_today date := (clock_timestamp() at time zone 'Asia/Jakarta')::date;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if p_new_role is null then raise exception 'new role required'; end if;

  select role into v_actor_role from public.user_roles where user_id = v_actor;
  select role into v_target_role from public.user_roles where user_id = p_target_user;

  if v_actor_role is null then raise exception 'role not found'; end if;
  if v_target_role is null then raise exception 'target_user_not_found'; end if;
  if p_target_user = v_actor then raise exception 'self role change is not allowed'; end if;

  v_actor_role_text := v_actor_role::text;
  v_new_role_text := p_new_role::text;

  if v_new_role_text = 'staff' then raise exception 'staff_role_inactive'; end if;

  if v_actor_role_text = 'administrator' then
    if v_new_role_text not in ('umum','siswa','pengajar') then raise exception 'administrator may assign at most pengajar'; end if;
  elsif v_actor_role_text = 'manager' then
    if v_new_role_text not in ('umum','siswa','pengajar','administrator') then raise exception 'manager may assign at most administrator'; end if;
  elsif v_actor_role_text = 'co_founder' then
    if v_new_role_text not in ('umum','siswa','pengajar','administrator','manager') then raise exception 'co-founder may assign at most manager'; end if;
  elsif v_actor_role_text = 'founder' then
    null;
  else
    raise exception 'insufficient permission';
  end if;

  if v_actor_role_text <> 'founder'
    and public.role_rank(v_target_role) >= public.role_rank(v_actor_role) then
    raise exception 'cannot modify equal or higher role';
  end if;

  if v_target_role::text = 'siswa'
    and v_new_role_text <> 'siswa'
    and exists (
      select 1
      from public.class_enrollments e
      where e.user_id = p_target_user
        and e.status in ('active','paused')
    ) then
    raise exception 'active_student_enrollments_exist';
  end if;

  if v_new_role_text not in ('pengajar','administrator','manager','co_founder','founder')
    and (
      exists (
        select 1
        from public.classes c
        where c.teacher_id = p_target_user
          and c.status in ('planned','active')
      )
      or exists (
        select 1
        from public.class_teacher_assignments a
        where a.teacher_id = p_target_user
          and a.is_active
          and a.ends_on >= v_today
      )
    ) then
    raise exception 'active_teaching_assignments_exist';
  end if;

  update public.user_roles
  set role = p_new_role,
      updated_by = v_actor,
      updated_at = now()
  where user_id = p_target_user;

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values (
    v_actor,
    'set_user_role',
    p_target_user,
    jsonb_build_object('previous_role', v_target_role, 'new_role', p_new_role)
  );
end
$$;

revoke all on function public.set_user_role(uuid, public.app_role) from public;
revoke execute on function public.set_user_role(uuid, public.app_role) from anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
