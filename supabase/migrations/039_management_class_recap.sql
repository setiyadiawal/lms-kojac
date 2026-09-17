-- CLASSROOM PHASE 3 — MANAGEMENT CLASS & TEACHING REPORT RECAP
-- Read-only management recap. No table/data mutation is introduced.
-- Phase 2 migration 038 is already live and must not be replayed.

create or replace function public.get_management_class_recap(
  p_report_period text default 'month',
  p_program_id uuid default null,
  p_class_id uuid default null,
  p_teacher_id uuid default null,
  p_class_status text default null,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_period text := lower(btrim(coalesce(p_report_period, 'month')));
  v_status text := nullif(lower(btrim(coalesce(p_class_status, ''))), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_today date := (clock_timestamp() at time zone 'Asia/Jakarta')::date;
  v_month_start date := date_trunc('month', (clock_timestamp() at time zone 'Asia/Jakarta'))::date;
  v_month_end date := (date_trunc('month', (clock_timestamp() at time zone 'Asia/Jakarta')) + interval '1 month')::date;
  v_period_start date;
  v_period_end date;
  v_result jsonb;
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

  if not private.classroom_is_management() then
    raise exception 'management_access_required';
  end if;

  if v_period not in ('month','30d','3m','all') then
    raise exception 'invalid_report_period';
  end if;

  if v_status is not null and v_status not in ('planned','active','completed','cancelled') then
    raise exception 'invalid_class_status';
  end if;

  if v_period = 'month' then
    v_period_start := v_month_start;
    v_period_end := v_month_end;
  elsif v_period = '30d' then
    v_period_start := v_today - 29;
    v_period_end := v_today + 1;
  elsif v_period = '3m' then
    v_period_start := (v_today - interval '3 months')::date;
    v_period_end := v_today + 1;
  else
    v_period_start := null;
    v_period_end := null;
  end if;

  with
  student_agg as (
    select
      e.class_id,
      count(distinct e.user_id) filter (where e.status = 'active')::integer as active_count,
      count(distinct e.user_id) filter (where e.status = 'paused')::integer as paused_count
    from public.class_enrollments e
    group by e.class_id
  ),
  report_scope as (
    select r.*
    from public.teaching_reports r
    where (v_period_start is null or r.report_date >= v_period_start)
      and (v_period_end is null or r.report_date < v_period_end)
  ),
  report_agg as (
    select r.class_id, count(*)::integer as report_count
    from report_scope r
    group by r.class_id
  ),
  last_report as (
    select distinct on (r.class_id)
      r.class_id,
      r.report_date,
      r.teacher_id,
      r.teacher_name_snapshot
    from report_scope r
    order by r.class_id, r.report_date desc, r.starts_at desc, r.created_at desc, r.id desc
  ),
  active_substitute_rows as (
    select
      a.class_id,
      a.id as assignment_id,
      a.teacher_id,
      coalesce(
        nullif(btrim(tp.full_name), ''),
        nullif(btrim(tp.nickname), ''),
        a.teacher_name_snapshot
      ) as teacher_name,
      a.starts_on,
      a.ends_on
    from public.class_teacher_assignments a
    join public.classes c on c.id = a.class_id
    left join public.profiles tp on tp.user_id = a.teacher_id
    where a.assignment_type = 'substitute'
      and a.is_active = true
      and a.teacher_id is not null
      and a.starts_on <= v_today
      and a.ends_on >= v_today
      and c.status in ('planned','active')
  ),
  active_substitute_agg as (
    select
      s.class_id,
      jsonb_agg(
        jsonb_build_object(
          'assignment_id', s.assignment_id,
          'teacher_id', s.teacher_id,
          'teacher_name', s.teacher_name,
          'starts_on', s.starts_on,
          'ends_on', s.ends_on
        )
        order by s.starts_on, s.ends_on, s.teacher_name
      ) as substitutes
    from active_substitute_rows s
    group by s.class_id
  ),
  filtered_classes as (
    select
      c.id as class_id,
      c.program_id,
      pr.code as program_code,
      pr.name as program_name,
      c.code as class_code,
      c.name as class_name,
      c.status::text as class_status,
      c.teacher_id as primary_teacher_id,
      coalesce(
        nullif(btrim(pt.full_name), ''),
        nullif(btrim(pt.nickname), ''),
        'Belum ditentukan'
      ) as primary_teacher_name,
      c.starts_on,
      c.ends_on,
      coalesce(sa.active_count, 0) as student_active_count,
      coalesce(sa.paused_count, 0) as student_paused_count,
      coalesce(ra.report_count, 0) as report_count,
      lr.report_date as last_report_date,
      lr.teacher_id as last_report_teacher_id,
      lr.teacher_name_snapshot as last_report_teacher_name,
      coalesce(asa.substitutes, '[]'::jsonb) as active_substitutes,
      c.created_at
    from public.classes c
    left join public.programs pr on pr.id = c.program_id
    left join public.profiles pt on pt.user_id = c.teacher_id
    left join student_agg sa on sa.class_id = c.id
    left join report_agg ra on ra.class_id = c.id
    left join last_report lr on lr.class_id = c.id
    left join active_substitute_agg asa on asa.class_id = c.id
    where (p_program_id is null or c.program_id = p_program_id)
      and (p_class_id is null or c.id = p_class_id)
      and (v_status is null or c.status::text = v_status)
      and (
        p_teacher_id is null
        or c.teacher_id = p_teacher_id
        or exists (
          select 1
          from active_substitute_rows ats
          where ats.class_id = c.id
            and ats.teacher_id = p_teacher_id
        )
      )
      and (
        v_search is null
        or c.name ilike '%' || v_search || '%'
        or coalesce(c.code, '') ilike '%' || v_search || '%'
      )
  ),
  summary as (
    select
      (select count(*)::integer from public.classes c where c.status = 'active') as active_class_count,
      (
        select count(distinct e.user_id)::integer
        from public.class_enrollments e
        join public.classes c on c.id = e.class_id
        where c.status = 'active'
          and e.status = 'active'
      ) as active_student_count,
      (
        select count(*)::integer
        from public.teaching_reports r
        where r.report_date >= v_month_start
          and r.report_date < v_month_end
      ) as reports_this_month,
      (
        select count(distinct teacher_id)::integer
        from (
          select c.teacher_id
          from public.classes c
          where c.status = 'active'
            and c.teacher_id is not null
          union
          select a.teacher_id
          from public.class_teacher_assignments a
          join public.classes c on c.id = a.class_id
          where c.status = 'active'
            and a.assignment_type = 'substitute'
            and a.is_active = true
            and a.teacher_id is not null
            and a.starts_on <= v_today
            and a.ends_on >= v_today
        ) active_teachers
      ) as active_teacher_count
  ),
  program_options as (
    select coalesce(jsonb_agg(item order by item->>'name'), '[]'::jsonb) as value
    from (
      select distinct jsonb_build_object(
        'id', pr.id,
        'code', pr.code,
        'name', pr.name
      ) as item
      from public.classes c
      join public.programs pr on pr.id = c.program_id
    ) x
  ),
  class_options as (
    select coalesce(jsonb_agg(item order by item->>'name'), '[]'::jsonb) as value
    from (
      select jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'name', c.name,
        'program_id', c.program_id
      ) as item
      from public.classes c
    ) x
  ),
  teacher_options_source as (
    select
      c.teacher_id as teacher_id,
      coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.nickname), ''), 'Pengajar KOJAC') as teacher_name
    from public.classes c
    join public.profiles p on p.user_id = c.teacher_id
    where c.teacher_id is not null
    union
    select
      s.teacher_id,
      s.teacher_name
    from active_substitute_rows s
  ),
  teacher_options as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('id', teacher_id, 'name', teacher_name)
        order by teacher_name
      ),
      '[]'::jsonb
    ) as value
    from (
      select teacher_id, max(teacher_name) as teacher_name
      from teacher_options_source
      group by teacher_id
    ) t
  ),
  row_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'class_id', f.class_id,
          'program_id', f.program_id,
          'program_code', f.program_code,
          'program_name', f.program_name,
          'class_code', f.class_code,
          'class_name', f.class_name,
          'class_status', f.class_status,
          'primary_teacher_id', f.primary_teacher_id,
          'primary_teacher_name', f.primary_teacher_name,
          'starts_on', f.starts_on,
          'ends_on', f.ends_on,
          'student_active_count', f.student_active_count,
          'student_paused_count', f.student_paused_count,
          'report_count', f.report_count,
          'last_report_date', f.last_report_date,
          'last_report_teacher_id', f.last_report_teacher_id,
          'last_report_teacher_name', f.last_report_teacher_name,
          'active_substitutes', f.active_substitutes
        )
        order by
          case f.class_status
            when 'active' then 1
            when 'planned' then 2
            when 'completed' then 3
            when 'cancelled' then 4
            else 5
          end,
          f.starts_on desc nulls last,
          f.created_at desc
      ),
      '[]'::jsonb
    ) as value
    from filtered_classes f
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'active_class_count', s.active_class_count,
      'active_student_count', s.active_student_count,
      'reports_this_month', s.reports_this_month,
      'active_teacher_count', s.active_teacher_count
    ),
    'period', jsonb_build_object(
      'key', v_period,
      'start_date', v_period_start,
      'end_date_exclusive', v_period_end
    ),
    'rows', rp.value,
    'filters', jsonb_build_object(
      'programs', po.value,
      'classes', co.value,
      'teachers', t.value
    )
  )
  into v_result
  from summary s
  cross join row_payload rp
  cross join program_options po
  cross join class_options co
  cross join teacher_options t;

  return v_result;
end
$$;

revoke all on function public.get_management_class_recap(text,uuid,uuid,uuid,text,text) from public;
revoke execute on function public.get_management_class_recap(text,uuid,uuid,uuid,text,text) from anon;
grant execute on function public.get_management_class_recap(text,uuid,uuid,uuid,text,text) to authenticated;
