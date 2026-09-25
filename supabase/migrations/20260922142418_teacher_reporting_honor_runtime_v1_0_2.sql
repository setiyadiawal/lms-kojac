create or replace function private.guard_approved_teaching_report()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_role public.app_role;
  v_is_management boolean := false;
  v_content_changed boolean;
begin
  select role into v_role
  from public.user_roles
  where user_id=auth.uid();

  v_is_management := v_role is not null
    and v_role::text in ('administrator','manager','co_founder','founder');

  v_content_changed :=
    new.class_id is distinct from old.class_id
    or new.teacher_id is distinct from old.teacher_id
    or new.report_date is distinct from old.report_date
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
    or new.material_summary is distinct from old.material_summary
    or new.assignment_summary is distinct from old.assignment_summary
    or new.next_plan is distinct from old.next_plan
    or new.evaluation_notes is distinct from old.evaluation_notes;

  if old.review_status='approved' and v_content_changed and not v_is_management then
    raise exception 'approved_report_locked';
  end if;

  if old.review_status='revision' and v_content_changed and not v_is_management then
    new.review_status := 'submitted';
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;

  return new;
end
$$;

create or replace function public.get_my_teaching_reports_v2(p_class_id uuid)
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
  review_status text,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.app_role;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select role into v_role from public.user_roles where user_id=v_actor;
  if v_role is null
    or v_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  if not exists (select 1 from public.classes where id=p_class_id) then
    raise exception 'class_not_found';
  end if;

  if not private.classroom_can_teach_class(p_class_id,null) then
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
    r.review_status,
    r.review_note,
    r.reviewed_at,
    r.created_at,
    r.updated_at
  from public.teaching_reports r
  where r.class_id=p_class_id
  order by r.report_date desc,r.starts_at desc,r.created_at desc;
end
$$;

revoke all on function public.get_my_teaching_reports_v2(uuid) from public,anon;
grant execute on function public.get_my_teaching_reports_v2(uuid) to authenticated;

revoke all on function private.teacher_payroll_is_management() from public,anon,authenticated;
revoke all on function private.recalculate_teacher_payroll(uuid) from public,anon,authenticated;
revoke all on function private.guard_approved_teaching_report() from public,anon,authenticated;
