-- CLASSROOM PHASE 1 — LAPORAN BELAJAR MENGAJAR
-- One report represents one completed teaching activity.
-- No per-student attendance model is introduced in this phase.

create table public.teaching_reports (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  teacher_id uuid null,
  teacher_name_snapshot text not null,
  report_date date not null,
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  material_summary text not null,
  assignment_summary text not null,
  next_plan text not null,
  evaluation_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_reports_class_id_fkey
    foreign key (class_id) references public.classes(id) on delete restrict,
  constraint teaching_reports_teacher_id_fkey
    foreign key (teacher_id) references auth.users(id) on delete set null,
  constraint teaching_reports_time_order_check
    check (ends_at > starts_at),
  constraint teaching_reports_material_check
    check (char_length(btrim(material_summary)) between 1 and 10000),
  constraint teaching_reports_assignment_check
    check (char_length(btrim(assignment_summary)) between 1 and 10000),
  constraint teaching_reports_next_plan_check
    check (char_length(btrim(next_plan)) between 1 and 10000),
  constraint teaching_reports_evaluation_check
    check (evaluation_notes is null or char_length(evaluation_notes) <= 10000)
);

create index teaching_reports_class_date_idx
  on public.teaching_reports(class_id, report_date desc, starts_at desc);

create index teaching_reports_teacher_idx
  on public.teaching_reports(teacher_id)
  where teacher_id is not null;

alter table public.teaching_reports enable row level security;

-- All app access is intentionally routed through the scoped RPCs below.
revoke all on table public.teaching_reports from public;
revoke all on table public.teaching_reports from anon;
revoke all on table public.teaching_reports from authenticated;

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
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_class_status text;
  v_teacher_name text;
  v_material text := btrim(coalesce(p_material_summary, ''));
  v_assignment text := btrim(coalesce(p_assignment_summary, ''));
  v_next_plan text := btrim(coalesce(p_next_plan, ''));
  v_evaluation text := nullif(btrim(coalesce(p_evaluation_notes, '')), '');
  v_today date := (clock_timestamp() at time zone 'Asia/Jakarta')::date;
  v_report_id uuid;
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

  select ur.role into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  select c.status into v_class_status
  from public.classes c
  where c.id = p_class_id
    and c.teacher_id = v_actor;

  if not found then
    raise exception 'teacher_class_access_denied';
  end if;

  if v_class_status <> 'active' then
    raise exception 'class_not_active_for_report';
  end if;

  if p_report_date is null then
    raise exception 'report_date_required';
  end if;
  if p_report_date > v_today then
    raise exception 'report_date_future';
  end if;

  if p_starts_at is null or p_ends_at is null then
    raise exception 'report_time_required';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'invalid_report_time';
  end if;

  if v_material = '' then
    raise exception 'material_required';
  end if;
  if v_assignment = '' then
    raise exception 'assignment_required';
  end if;
  if v_next_plan = '' then
    raise exception 'next_plan_required';
  end if;
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
    class_id,
    teacher_id,
    teacher_name_snapshot,
    report_date,
    starts_at,
    ends_at,
    material_summary,
    assignment_summary,
    next_plan,
    evaluation_notes
  ) values (
    p_class_id,
    v_actor,
    v_teacher_name,
    p_report_date,
    p_starts_at,
    p_ends_at,
    v_material,
    v_assignment,
    v_next_plan,
    v_evaluation
  )
  returning id into v_report_id;

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values (
    v_actor,
    'create_teaching_report',
    v_actor,
    jsonb_build_object(
      'report_id', v_report_id,
      'class_id', p_class_id,
      'report_date', p_report_date
    )
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
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_before public.teaching_reports%rowtype;
  v_after public.teaching_reports%rowtype;
  v_material text := btrim(coalesce(p_material_summary, ''));
  v_assignment text := btrim(coalesce(p_assignment_summary, ''));
  v_next_plan text := btrim(coalesce(p_next_plan, ''));
  v_evaluation text := nullif(btrim(coalesce(p_evaluation_notes, '')), '');
  v_today date := (clock_timestamp() at time zone 'Asia/Jakarta')::date;
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

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

  if not found then
    raise exception 'teaching_report_not_found';
  end if;

  if v_before.teacher_id is distinct from v_actor then
    raise exception 'teaching_report_access_denied';
  end if;

  if p_report_date is null then
    raise exception 'report_date_required';
  end if;
  if p_report_date > v_today then
    raise exception 'report_date_future';
  end if;

  if p_starts_at is null or p_ends_at is null then
    raise exception 'report_time_required';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'invalid_report_time';
  end if;

  if v_material = '' then
    raise exception 'material_required';
  end if;
  if v_assignment = '' then
    raise exception 'assignment_required';
  end if;
  if v_next_plan = '' then
    raise exception 'next_plan_required';
  end if;
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
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

  select ur.role into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  if not exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.teacher_id = v_actor
  ) then
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
    and r.teacher_id = v_actor
  order by r.report_date desc, r.starts_at desc, r.created_at desc;
end
$$;

revoke all on function public.get_my_teaching_reports(uuid) from public;
revoke execute on function public.get_my_teaching_reports(uuid) from anon;
grant execute on function public.get_my_teaching_reports(uuid) to authenticated;

create or replace function public.get_class_teaching_reports(p_class_id uuid)
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
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

  select ur.role into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'management_access_required';
  end if;

  if not exists (select 1 from public.classes c where c.id = p_class_id) then
    raise exception 'class_not_found';
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

revoke all on function public.get_class_teaching_reports(uuid) from public;
revoke execute on function public.get_class_teaching_reports(uuid) from anon;
grant execute on function public.get_class_teaching_reports(uuid) to authenticated;
