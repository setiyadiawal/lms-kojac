-- KOJAC LMS — Management Phase 2B
-- Teacher Workload & Teaching Activity (read-only)
-- Candidate only. DO NOT APPLY before review.
-- Extends get_management_teacher_detail(uuid) additively.
-- No new table. No INSERT/UPDATE/DELETE.

create or replace function public.get_management_teacher_detail(p_teacher_id uuid)
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

  if not (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = p_teacher_id
        and ur.role::text = 'pengajar'
    )
    or exists (
      select 1
      from public.classes c
      where c.teacher_id = p_teacher_id
    )
    or exists (
      select 1
      from public.class_teacher_assignments a
      where a.teacher_id = p_teacher_id
    )
  ) then
    raise exception 'teacher_not_found';
  end if;

  with
  current_relationship_rows as (
    select
      c.teacher_id,
      c.id as class_id,
      'primary'::text as relationship,
      null::uuid as assignment_id,
      null::date as assignment_starts_on,
      null::date as assignment_ends_on,
      1 as priority
    from public.classes c
    where c.teacher_id = p_teacher_id
      and c.status = 'active'

    union all

    select
      a.teacher_id,
      a.class_id,
      'substitute'::text,
      a.id,
      a.starts_on,
      a.ends_on,
      2
    from public.class_teacher_assignments a
    join public.classes c on c.id = a.class_id
    where a.teacher_id = p_teacher_id
      and a.assignment_type = 'substitute'
      and a.is_active
      and v_today between a.starts_on and a.ends_on
      and c.status in ('planned','active')
  ),
  current_relationships as (
    select distinct on (cr.teacher_id, cr.class_id)
      cr.teacher_id,
      cr.class_id,
      cr.relationship,
      cr.assignment_id,
      cr.assignment_starts_on,
      cr.assignment_ends_on
    from current_relationship_rows cr
    order by
      cr.teacher_id,
      cr.class_id,
      cr.priority,
      cr.assignment_starts_on desc nulls last,
      cr.assignment_id
  ),
  current_classes_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'class_id', c.id,
          'class_code', c.code,
          'class_name', c.name,
          'class_status', c.status,
          'program_id', pr.id,
          'program_code', pr.code,
          'program_name', pr.name,
          'relationship', cr.relationship,
          'student_active_count', (
            select count(distinct e.user_id)::integer
            from public.class_enrollments e
            where e.class_id = c.id
              and e.status = 'active'
          ),
          'class_starts_on', c.starts_on,
          'class_ends_on', c.ends_on,
          'assignment_starts_on', cr.assignment_starts_on,
          'assignment_ends_on', cr.assignment_ends_on
        )
        order by
          case c.status when 'active' then 1 when 'planned' then 2 else 3 end,
          c.starts_on desc nulls last,
          c.name
      ),
      '[]'::jsonb
    ) as items
    from current_relationships cr
    join public.classes c on c.id = cr.class_id
    left join public.programs pr on pr.id = c.program_id
  ),
  primary_history as (
    select
      c.id as class_id,
      c.code as class_code,
      c.name as class_name,
      c.status as class_status,
      pr.id as program_id,
      pr.code as program_code,
      pr.name as program_name,
      'primary'::text as relationship,
      null::uuid as assignment_id,
      c.starts_on as relationship_starts_on,
      c.ends_on as relationship_ends_on,
      null::boolean as assignment_is_active,
      case
        when c.status = 'planned' then 'planned'
        when c.status in ('completed','cancelled') then 'historical'
        else 'other'
      end as history_state,
      coalesce(c.ends_on, c.starts_on, c.created_at::date) as sort_date
    from public.classes c
    left join public.programs pr on pr.id = c.program_id
    where c.teacher_id = p_teacher_id
      and c.status <> 'active'
  ),
  substitute_history as (
    select
      c.id as class_id,
      c.code as class_code,
      c.name as class_name,
      c.status as class_status,
      pr.id as program_id,
      pr.code as program_code,
      pr.name as program_name,
      'substitute'::text as relationship,
      a.id as assignment_id,
      a.starts_on as relationship_starts_on,
      a.ends_on as relationship_ends_on,
      a.is_active as assignment_is_active,
      case
        when a.starts_on > v_today then 'upcoming'
        when a.ends_on < v_today then 'historical'
        when not a.is_active then 'inactive'
        when c.status not in ('planned','active') then 'historical'
        else 'other'
      end as history_state,
      a.ends_on as sort_date
    from public.class_teacher_assignments a
    join public.classes c on c.id = a.class_id
    left join public.programs pr on pr.id = c.program_id
    where a.teacher_id = p_teacher_id
      and not exists (
        select 1
        from current_relationships cr
        where cr.assignment_id = a.id
      )
  ),
  history_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'class_id', h.class_id,
          'class_code', h.class_code,
          'class_name', h.class_name,
          'class_status', h.class_status,
          'program_id', h.program_id,
          'program_code', h.program_code,
          'program_name', h.program_name,
          'relationship', h.relationship,
          'assignment_id', h.assignment_id,
          'relationship_starts_on', h.relationship_starts_on,
          'relationship_ends_on', h.relationship_ends_on,
          'assignment_is_active', h.assignment_is_active,
          'history_state', h.history_state
        )
        order by h.sort_date desc nulls last, h.class_name
      ),
      '[]'::jsonb
    ) as items
    from (
      select * from primary_history
      union all
      select * from substitute_history
    ) h
  ),
  report_stats as (
    select
      count(*)::integer as report_count,
      max(r.report_date) as last_report_date
    from public.teaching_reports r
    where r.teacher_id = p_teacher_id
  ),
  current_month_reports as (
    select
      r.id,
      r.class_id,
      r.report_date,
      r.updated_at,
      case
        when r.starts_at is not null
          and r.ends_at is not null
          and r.ends_at >= r.starts_at
        then floor(extract(epoch from (r.ends_at - r.starts_at)) / 60)::integer
        else 0
      end as recorded_minutes
    from public.teaching_reports r
    where r.teacher_id = p_teacher_id
      and r.report_date >= v_month_start
      and r.report_date < v_next_month
  ),
  current_month_report_agg as (
    select
      count(*)::integer as reports_current_month,
      coalesce(sum(cmr.recorded_minutes), 0)::integer as reported_minutes_current_month,
      max(cmr.report_date) as last_report_date
    from current_month_reports cmr
  ),
  current_month_report_by_class as (
    select
      cmr.class_id,
      count(*)::integer as reports_current_month,
      coalesce(sum(cmr.recorded_minutes), 0)::integer as reported_minutes_current_month
    from current_month_reports cmr
    group by cmr.class_id
  ),
  report_by_class as (
    select
      r.class_id,
      max(r.report_date) as last_report_date
    from public.teaching_reports r
    where r.teacher_id = p_teacher_id
    group by r.class_id
  ),
  active_student_stats as (
    select
      count(distinct e.user_id) filter (where e.status = 'active')::integer as active_student_count
    from current_relationships cr
    left join public.class_enrollments e on e.class_id = cr.class_id
  ),
  workload_payload as (
    select jsonb_build_object(
      'primary_class_count', (
        select count(*)::integer
        from current_relationships cr
        where cr.relationship = 'primary'
      ),
      'substitute_class_count', (
        select count(*)::integer
        from current_relationships cr
        where cr.relationship = 'substitute'
      ),
      'current_class_count', (
        select count(*)::integer
        from current_relationships
      ),
      'active_student_count', ass.active_student_count,
      'reports_current_month', cmra.reports_current_month,
      'reported_minutes_current_month', cmra.reported_minutes_current_month,
      'last_report_date', rs.last_report_date,
      'month_start', v_month_start,
      'next_month_start', v_next_month,
      'classes', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'class_id', c.id,
            'class_code', c.code,
            'class_name', c.name,
            'program_id', pr.id,
            'program_code', pr.code,
            'program_name', pr.name,
            'relationship', cr.relationship,
            'active_student_count', (
              select count(distinct e.user_id)::integer
              from public.class_enrollments e
              where e.class_id = c.id
                and e.status = 'active'
            ),
            'reports_current_month', coalesce(cmrc.reports_current_month, 0),
            'reported_minutes_current_month', coalesce(cmrc.reported_minutes_current_month, 0),
            'last_report_date', rbca.last_report_date,
            'class_starts_on', c.starts_on,
            'class_ends_on', c.ends_on,
            'assignment_starts_on', cr.assignment_starts_on,
            'assignment_ends_on', cr.assignment_ends_on
          )
          order by
            case cr.relationship when 'primary' then 1 else 2 end,
            c.starts_on desc nulls last,
            c.name
        )
        from current_relationships cr
        join public.classes c on c.id = cr.class_id
        left join public.programs pr on pr.id = c.program_id
        left join current_month_report_by_class cmrc on cmrc.class_id = c.id
        left join report_by_class rbca on rbca.class_id = c.id
      ), '[]'::jsonb)
    ) as workload
    from active_student_stats ass
    cross join current_month_report_agg cmra
    cross join report_stats rs
  ),
  report_history_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'report_id', x.id,
          'class_id', x.class_id,
          'class_code', x.class_code,
          'class_name', x.class_name,
          'program_name', x.program_name,
          'teacher_name_snapshot', x.teacher_name_snapshot,
          'report_date', x.report_date,
          'material_summary', x.material_summary,
          'updated_at', x.updated_at
        )
        order by x.report_date desc, x.updated_at desc, x.id desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select
        r.id,
        r.class_id,
        c.code as class_code,
        c.name as class_name,
        pr.name as program_name,
        r.teacher_name_snapshot,
        r.report_date,
        r.material_summary,
        r.updated_at,
        r.created_at
      from public.teaching_reports r
      join public.classes c on c.id = r.class_id
      left join public.programs pr on pr.id = c.program_id
      where r.teacher_id = p_teacher_id
      order by
        r.report_date desc,
        r.updated_at desc,
        r.created_at desc,
        r.id desc
      limit 10
    ) x
  )
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'teacher_id', p.user_id,
      'full_name', p.full_name,
      'nickname', p.nickname
    ),
    'role', ur.role::text,
    'account_status', case
      when p.is_blocked then 'blocked'
      when not p.is_approved then 'pending'
      else 'active'
    end,
    'teaching_status', case
      when (select count(*) from current_relationships) > 0 then 'teaching'
      else 'no_active'
    end,
    'current_class_count', (select count(*)::integer from current_relationships),
    'active_student_count', ass.active_student_count,
    'report_count', rs.report_count,
    'last_report_date', rs.last_report_date,
    'current_classes', ccp.items,
    'history', hp.items,
    'recent_reports', rhp.items,
    'workload', wp.workload
  )
  into v_result
  from public.profiles p
  left join public.user_roles ur on ur.user_id = p.user_id
  cross join current_classes_payload ccp
  cross join history_payload hp
  cross join report_stats rs
  cross join active_student_stats ass
  cross join workload_payload wp
  cross join report_history_payload rhp
  where p.user_id = p_teacher_id;

  if v_result is null then
    raise exception 'teacher_not_found';
  end if;

  return v_result;
end
$$;

revoke all
on function public.get_management_teacher_detail(uuid)
from public;

revoke all
on function public.get_management_teacher_detail(uuid)
from anon;

grant execute
on function public.get_management_teacher_detail(uuid)
to authenticated;
