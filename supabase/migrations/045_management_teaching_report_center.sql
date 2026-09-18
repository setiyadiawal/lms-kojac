-- KOJAC LMS — Management Phase 3A
-- Central Teaching Report Center — read-only.
-- Candidate only. DO NOT APPLY before review.
-- No new table. No direct table grants. No INSERT/UPDATE/DELETE.

create or replace function public.get_management_teaching_reports(
  p_period text default 'current_month',
  p_program_id uuid default null,
  p_class_id uuid default null,
  p_teacher_id uuid default null,
  p_search text default null,
  p_sort text default 'newest',
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_period text := coalesce(nullif(lower(btrim(coalesce(p_period, ''))), ''), 'current_month');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort text := coalesce(nullif(lower(btrim(coalesce(p_sort, ''))), ''), 'newest');
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := case when p_page_size in (25, 50, 100) then p_page_size else 25 end;
  v_offset integer;
  v_month_start date := date_trunc('month', current_timestamp at time zone 'Asia/Jakarta')::date;
  v_next_month date := (date_trunc('month', current_timestamp at time zone 'Asia/Jakarta') + interval '1 month')::date;
  v_start_date date;
  v_end_date date;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not private.classroom_is_management() then
    raise exception 'management_access_required';
  end if;

  if v_period not in ('current_month', 'previous_month', 'last_3_months', 'all') then
    raise exception 'invalid_report_period';
  end if;

  if v_sort not in ('newest', 'oldest') then
    raise exception 'invalid_report_sort';
  end if;

  case v_period
    when 'current_month' then
      v_start_date := v_month_start;
      v_end_date := v_next_month;
    when 'previous_month' then
      v_start_date := (v_month_start - interval '1 month')::date;
      v_end_date := v_month_start;
    when 'last_3_months' then
      v_start_date := (v_month_start - interval '2 months')::date;
      v_end_date := v_next_month;
    else
      v_start_date := null;
      v_end_date := null;
  end case;

  v_offset := (v_page - 1) * v_page_size;

  with
  base_reports as (
    select
      r.id as report_id,
      r.class_id,
      c.code as class_code,
      c.name as class_name,
      c.program_id,
      pr.code as program_code,
      pr.name as program_name,
      r.teacher_id,
      r.teacher_name_snapshot,
      r.report_date,
      r.starts_at,
      r.ends_at,
      case
        when r.starts_at is not null
          and r.ends_at is not null
          and r.ends_at >= r.starts_at
        then floor(extract(epoch from (r.ends_at - r.starts_at)) / 60)::integer
        else 0
      end as recorded_minutes,
      r.material_summary,
      r.assignment_summary,
      r.next_plan,
      r.evaluation_notes,
      r.created_at,
      r.updated_at
    from public.teaching_reports r
    join public.classes c on c.id = r.class_id
    left join public.programs pr on pr.id = c.program_id
  ),
  filtered_reports as (
    select br.*
    from base_reports br
    where (v_start_date is null or br.report_date >= v_start_date)
      and (v_end_date is null or br.report_date < v_end_date)
      and (p_program_id is null or br.program_id = p_program_id)
      and (p_class_id is null or br.class_id = p_class_id)
      and (p_teacher_id is null or br.teacher_id = p_teacher_id)
      and (
        v_search is null
        or br.material_summary ilike '%' || v_search || '%'
        or br.assignment_summary ilike '%' || v_search || '%'
        or br.next_plan ilike '%' || v_search || '%'
        or coalesce(br.evaluation_notes, '') ilike '%' || v_search || '%'
        or br.class_name ilike '%' || v_search || '%'
        or coalesce(br.class_code, '') ilike '%' || v_search || '%'
        or br.teacher_name_snapshot ilike '%' || v_search || '%'
      )
  ),
  summary_payload as (
    select jsonb_build_object(
      'total_reports', count(*)::integer,
      'reports_current_month', count(*) filter (
        where fr.report_date >= v_month_start
          and fr.report_date < v_next_month
      )::integer,
      'classes_with_reports', count(distinct fr.class_id)::integer,
      'teachers_reporting', count(distinct fr.teacher_id) filter (
        where fr.teacher_id is not null
      )::integer,
      'recorded_minutes_current_month', coalesce(sum(fr.recorded_minutes) filter (
        where fr.report_date >= v_month_start
          and fr.report_date < v_next_month
      ), 0)::integer
    ) as summary
    from filtered_reports fr
  ),
  pagination_payload as (
    select
      count(*)::integer as total_rows,
      case
        when count(*) = 0 then 0
        else ceil(count(*)::numeric / v_page_size)::integer
      end as total_pages
    from filtered_reports
  ),
  paged_reports as (
    select fr.*
    from filtered_reports fr
    order by
      case when v_sort = 'newest' then fr.report_date end desc nulls last,
      case when v_sort = 'newest' then fr.updated_at end desc nulls last,
      case when v_sort = 'newest' then fr.report_id end desc nulls last,
      case when v_sort = 'oldest' then fr.report_date end asc nulls last,
      case when v_sort = 'oldest' then fr.updated_at end asc nulls last,
      case when v_sort = 'oldest' then fr.report_id end asc nulls last
    offset v_offset
    limit v_page_size
  ),
  row_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'report_id', pr.report_id,
          'class_id', pr.class_id,
          'class_code', pr.class_code,
          'class_name', pr.class_name,
          'program_id', pr.program_id,
          'program_code', pr.program_code,
          'program_name', pr.program_name,
          'teacher_id', pr.teacher_id,
          'teacher_name_snapshot', pr.teacher_name_snapshot,
          'report_date', pr.report_date,
          'starts_at', pr.starts_at,
          'ends_at', pr.ends_at,
          'recorded_minutes', pr.recorded_minutes,
          'material_preview', left(regexp_replace(pr.material_summary, E'[\n\r]+', ' ', 'g'), 180),
          'updated_at', pr.updated_at
        )
        order by
          case when v_sort = 'newest' then pr.report_date end desc nulls last,
          case when v_sort = 'newest' then pr.updated_at end desc nulls last,
          case when v_sort = 'newest' then pr.report_id end desc nulls last,
          case when v_sort = 'oldest' then pr.report_date end asc nulls last,
          case when v_sort = 'oldest' then pr.updated_at end asc nulls last,
          case when v_sort = 'oldest' then pr.report_id end asc nulls last
      ),
      '[]'::jsonb
    ) as rows
    from paged_reports pr
  ),
  program_options as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('id', x.id, 'code', x.code, 'name', x.name)
        order by x.name
      ),
      '[]'::jsonb
    ) as items
    from (
      select distinct p.id, p.code, p.name
      from public.programs p
      join public.classes c on c.program_id = p.id
    ) x
  ),
  class_options as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'code', c.code,
          'name', c.name,
          'program_id', c.program_id
        )
        order by c.name
      ),
      '[]'::jsonb
    ) as items
    from public.classes c
  ),
  teacher_options as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', x.teacher_id,
          'name', x.teacher_name_snapshot
        )
        order by lower(x.teacher_name_snapshot), x.teacher_id
      ),
      '[]'::jsonb
    ) as items
    from (
      select distinct on (r.teacher_id)
        r.teacher_id,
        r.teacher_name_snapshot
      from public.teaching_reports r
      where r.teacher_id is not null
      order by
        r.teacher_id,
        r.report_date desc,
        r.updated_at desc,
        r.id desc
    ) x
  )
  select jsonb_build_object(
    'has_any_report', exists(select 1 from public.teaching_reports),
    'summary', sp.summary,
    'rows', rp.rows,
    'filters', jsonb_build_object(
      'programs', po.items,
      'classes', co.items,
      'teachers', tch.items
    ),
    'period', jsonb_build_object(
      'key', v_period,
      'start_date', v_start_date,
      'end_date_exclusive', v_end_date,
      'current_month_start', v_month_start,
      'next_month_start', v_next_month
    ),
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total_rows', pp.total_rows,
      'total_pages', pp.total_pages
    )
  )
  into v_result
  from summary_payload sp
  cross join pagination_payload pp
  cross join row_payload rp
  cross join program_options po
  cross join class_options co
  cross join teacher_options tch;

  return v_result;
end
$$;

revoke all
on function public.get_management_teaching_reports(text, uuid, uuid, uuid, text, text, integer, integer)
from public;

revoke all
on function public.get_management_teaching_reports(text, uuid, uuid, uuid, text, text, integer, integer)
from anon;

grant execute
on function public.get_management_teaching_reports(text, uuid, uuid, uuid, text, text, integer, integer)
to authenticated;

create or replace function public.get_management_teaching_report_detail(p_report_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not private.classroom_is_management() then
    raise exception 'management_access_required';
  end if;

  select jsonb_build_object(
    'report_id', r.id,
    'class_id', r.class_id,
    'class_code', c.code,
    'class_name', c.name,
    'program_id', c.program_id,
    'program_code', pr.code,
    'program_name', pr.name,
    'teacher_id', r.teacher_id,
    'teacher_name_snapshot', r.teacher_name_snapshot,
    'report_date', r.report_date,
    'starts_at', r.starts_at,
    'ends_at', r.ends_at,
    'recorded_minutes', case
      when r.starts_at is not null
        and r.ends_at is not null
        and r.ends_at >= r.starts_at
      then floor(extract(epoch from (r.ends_at - r.starts_at)) / 60)::integer
      else 0
    end,
    'material_summary', r.material_summary,
    'assignment_summary', r.assignment_summary,
    'next_plan', r.next_plan,
    'evaluation_notes', r.evaluation_notes,
    'created_at', r.created_at,
    'updated_at', r.updated_at
  )
  into v_result
  from public.teaching_reports r
  join public.classes c on c.id = r.class_id
  left join public.programs pr on pr.id = c.program_id
  where r.id = p_report_id;

  if v_result is null then
    raise exception 'report_not_found';
  end if;

  return v_result;
end
$$;

revoke all
on function public.get_management_teaching_report_detail(uuid)
from public;

revoke all
on function public.get_management_teaching_report_detail(uuid)
from anon;

grant execute
on function public.get_management_teaching_report_detail(uuid)
to authenticated;
