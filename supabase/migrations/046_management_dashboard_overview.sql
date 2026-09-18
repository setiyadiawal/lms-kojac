-- KOJAC LMS — Management Phase 4A
-- Management Dashboard — Operational Overview.
-- Candidate only. DO NOT APPLY before review.
-- Read-only aggregate. No new table/cache/trigger/index. No INSERT/UPDATE/DELETE.

create or replace function public.get_management_dashboard_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_today date := (current_timestamp at time zone 'Asia/Jakarta')::date;
  v_month_start date := date_trunc('month', current_timestamp at time zone 'Asia/Jakarta')::date;
  v_next_month date := (date_trunc('month', current_timestamp at time zone 'Asia/Jakarta') + interval '1 month')::date;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not private.classroom_is_management() then
    raise exception 'management_access_required';
  end if;

  with
  student_base as (
    select
      p.user_id as student_id,
      bool_or(e.status = 'active') as has_active,
      bool_or(e.status = 'paused') as has_paused,
      bool_or(e.status = 'completed') as has_completed
    from public.user_roles ur
    join public.profiles p on p.user_id = ur.user_id
    left join public.class_enrollments e on e.user_id = p.user_id
    where ur.role::text = 'siswa'
    group by p.user_id
  ),
  student_status_rows as (
    select
      sb.student_id,
      case
        when coalesce(sb.has_active, false) then 'active'
        when not coalesce(sb.has_paused, false)
          and coalesce(sb.has_completed, false) then 'alumni'
        else 'inactive'
      end as academic_status
    from student_base sb
  ),
  student_status_agg as (
    select
      count(*)::integer as total_students,
      count(*) filter (where academic_status = 'active')::integer as active_students,
      count(*) filter (where academic_status = 'active')::integer as status_active,
      count(*) filter (where academic_status = 'alumni')::integer as status_alumni,
      count(*) filter (where academic_status = 'inactive')::integer as status_inactive
    from student_status_rows
  ),
  teacher_members as (
    select ur.user_id as teacher_id
    from public.user_roles ur
    where ur.role::text = 'pengajar'

    union

    select c.teacher_id
    from public.classes c
    where c.teacher_id is not null

    union

    select a.teacher_id
    from public.class_teacher_assignments a
    where a.teacher_id is not null
  ),
  current_relationship_rows as (
    select
      c.teacher_id,
      c.id as class_id,
      1 as priority
    from public.classes c
    where c.teacher_id is not null
      and c.status = 'active'

    union all

    select
      a.teacher_id,
      a.class_id,
      2
    from public.class_teacher_assignments a
    join public.classes c on c.id = a.class_id
    where a.teacher_id is not null
      and a.assignment_type = 'substitute'
      and a.is_active
      and v_today between a.starts_on and a.ends_on
      and c.status in ('planned', 'active')
  ),
  current_relationships as (
    select distinct on (cr.teacher_id, cr.class_id)
      cr.teacher_id,
      cr.class_id
    from current_relationship_rows cr
    order by cr.teacher_id, cr.class_id, cr.priority
  ),
  teacher_agg as (
    select
      (
        select count(*)::integer
        from teacher_members tm
        join public.profiles p on p.user_id = tm.teacher_id
      ) as operational_teachers,
      (
        select count(distinct cr.teacher_id)::integer
        from current_relationships cr
        join public.profiles p on p.user_id = cr.teacher_id
      ) as currently_teaching
  ),
  class_student_agg as (
    select
      e.class_id,
      count(distinct e.user_id) filter (where e.status = 'active')::integer as active_student_count
    from public.class_enrollments e
    group by e.class_id
  ),
  class_report_agg as (
    select
      r.class_id,
      max(r.report_date) as last_report_date
    from public.teaching_reports r
    group by r.class_id
  ),
  class_agg as (
    select
      count(*) filter (where c.status = 'active')::integer as active_classes,
      count(*) filter (
        where c.status = 'active'
          and c.teacher_id is null
      )::integer as active_classes_without_primary_teacher
    from public.classes c
  ),
  report_agg as (
    select
      count(*) filter (
        where r.report_date >= v_month_start
          and r.report_date < v_next_month
      )::integer as reports_current_month
    from public.teaching_reports r
  ),
  feedback_base as (
    select
      case
        when f.status = 'dibaca' then 'diproses'
        else f.status
      end as normalized_status
    from public.user_feedback f
  ),
  feedback_agg as (
    select
      count(*)::integer as total_feedback,
      count(*) filter (where normalized_status = 'baru')::integer as new_feedback,
      count(*) filter (where normalized_status = 'diproses')::integer as processing_feedback,
      count(*) filter (where normalized_status = 'selesai')::integer as completed_feedback
    from feedback_base
  ),
  account_agg as (
    select
      count(*) filter (
        where not p.is_approved
          and not p.is_blocked
      )::integer as pending_approval_accounts,
      count(*) filter (where p.is_blocked)::integer as blocked_accounts
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.user_id
  ),
  active_class_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'class_id', x.class_id,
          'program_id', x.program_id,
          'program_code', x.program_code,
          'program_name', x.program_name,
          'class_code', x.class_code,
          'class_name', x.class_name,
          'primary_teacher_id', x.primary_teacher_id,
          'primary_teacher_name', x.primary_teacher_name,
          'active_student_count', x.active_student_count,
          'last_report_date', x.last_report_date,
          'starts_on', x.starts_on,
          'ends_on', x.ends_on
        )
        order by
          x.starts_on desc nulls last,
          x.created_at desc,
          x.class_name
      ),
      '[]'::jsonb
    ) as items
    from (
      select
        c.id as class_id,
        c.program_id,
        pr.code as program_code,
        pr.name as program_name,
        c.code as class_code,
        c.name as class_name,
        c.teacher_id as primary_teacher_id,
        coalesce(
          nullif(btrim(tp.full_name), ''),
          nullif(btrim(tp.nickname), ''),
          case
            when c.teacher_id is null then 'Belum ditentukan'
            else 'Pengajar KOJAC'
          end
        ) as primary_teacher_name,
        coalesce(csa.active_student_count, 0) as active_student_count,
        cra.last_report_date,
        c.starts_on,
        c.ends_on,
        c.created_at
      from public.classes c
      left join public.programs pr on pr.id = c.program_id
      left join public.profiles tp on tp.user_id = c.teacher_id
      left join class_student_agg csa on csa.class_id = c.id
      left join class_report_agg cra on cra.class_id = c.id
      where c.status = 'active'
      order by
        c.starts_on desc nulls last,
        c.created_at desc,
        c.name
      limit 8
    ) x
  ),
  recent_report_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'report_id', x.report_id,
          'class_id', x.class_id,
          'class_code', x.class_code,
          'class_name', x.class_name,
          'program_name', x.program_name,
          'teacher_id', x.teacher_id,
          'teacher_name_snapshot', x.teacher_name_snapshot,
          'report_date', x.report_date,
          'material_preview', x.material_preview,
          'updated_at', x.updated_at
        )
        order by
          x.report_date desc,
          x.updated_at desc,
          x.report_id desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select
        r.id as report_id,
        r.class_id,
        c.code as class_code,
        c.name as class_name,
        pr.name as program_name,
        r.teacher_id,
        r.teacher_name_snapshot,
        r.report_date,
        left(
          regexp_replace(r.material_summary, E'[\n\r]+', ' ', 'g'),
          180
        ) as material_preview,
        r.updated_at
      from public.teaching_reports r
      join public.classes c on c.id = r.class_id
      left join public.programs pr on pr.id = c.program_id
      order by
        r.report_date desc,
        r.updated_at desc,
        r.id desc
      limit 5
    ) x
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total_students', ssa.total_students,
      'active_students', ssa.active_students,
      'operational_teachers', ta.operational_teachers,
      'active_classes', ca.active_classes,
      'reports_current_month', ra.reports_current_month,
      'new_feedback', fa.new_feedback
    ),
    'student_status', jsonb_build_object(
      'active', ssa.status_active,
      'alumni', ssa.status_alumni,
      'inactive', ssa.status_inactive
    ),
    'feedback_status', jsonb_build_object(
      'total', fa.total_feedback,
      'baru', fa.new_feedback,
      'diproses', fa.processing_feedback,
      'selesai', fa.completed_feedback
    ),
    'operational_status', jsonb_build_object(
      'pending_approval_accounts', aa.pending_approval_accounts,
      'blocked_accounts', aa.blocked_accounts,
      'active_classes_without_primary_teacher', ca.active_classes_without_primary_teacher,
      'currently_teaching', ta.currently_teaching
    ),
    'active_classes', acp.items,
    'recent_reports', rrp.items,
    'generated_at', current_timestamp
  )
  into v_result
  from student_status_agg ssa
  cross join teacher_agg ta
  cross join class_agg ca
  cross join report_agg ra
  cross join feedback_agg fa
  cross join account_agg aa
  cross join active_class_payload acp
  cross join recent_report_payload rrp;

  return v_result;
end
$$;

revoke all
on function public.get_management_dashboard_overview()
from public;

revoke all
on function public.get_management_dashboard_overview()
from anon;

grant execute
on function public.get_management_dashboard_overview()
to authenticated;
