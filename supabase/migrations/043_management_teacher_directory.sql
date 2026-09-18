-- KOJAC LMS — Management Phase 2A
-- Teacher Management: Directory + Teacher 360 read-only.
-- Candidate only. DO NOT APPLY before review.
-- No new table. No teacher/account/class/report mutation.

create or replace function public.get_management_teachers(
  p_role text default null,
  p_account_status text default null,
  p_teaching_status text default null,
  p_program_id uuid default null,
  p_class_id uuid default null,
  p_search text default null,
  p_sort text default 'name_asc',
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
  v_role text := nullif(lower(btrim(coalesce(p_role, ''))), '');
  v_account_status text := nullif(lower(btrim(coalesce(p_account_status, ''))), '');
  v_teaching_status text := nullif(lower(btrim(coalesce(p_teaching_status, ''))), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort text := coalesce(nullif(lower(btrim(coalesce(p_sort, ''))), ''), 'name_asc');
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := case when p_page_size in (25, 50, 100) then p_page_size else 25 end;
  v_offset integer;
  v_today date := (current_timestamp at time zone 'Asia/Jakarta')::date;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not private.classroom_is_management() then
    raise exception 'management_access_required';
  end if;

  if v_role is not null
    and v_role not in ('umum','siswa','pengajar','staff','administrator','manager','co_founder','founder') then
    raise exception 'invalid_teacher_role';
  end if;

  if v_account_status is not null
    and v_account_status not in ('active','pending','blocked') then
    raise exception 'invalid_account_status';
  end if;

  if v_teaching_status is not null
    and v_teaching_status not in ('teaching','no_active') then
    raise exception 'invalid_teaching_status';
  end if;

  if v_sort not in ('name_asc','name_desc','activity_desc','class_count_desc') then
    raise exception 'invalid_teacher_sort';
  end if;

  v_offset := (v_page - 1) * v_page_size;

  with
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
      'primary'::text as relationship,
      null::uuid as assignment_id,
      null::date as assignment_starts_on,
      null::date as assignment_ends_on,
      1 as priority
    from public.classes c
    where c.teacher_id is not null
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
    where a.teacher_id is not null
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
  current_student_agg as (
    select
      cr.teacher_id,
      count(distinct e.user_id) filter (where e.status = 'active')::integer as active_student_count
    from current_relationships cr
    left join public.class_enrollments e on e.class_id = cr.class_id
    group by cr.teacher_id
  ),
  report_agg as (
    select
      r.teacher_id,
      count(*)::integer as report_count
    from public.teaching_reports r
    where r.teacher_id is not null
    group by r.teacher_id
  ),
  last_report as (
    select distinct on (r.teacher_id)
      r.teacher_id,
      r.report_date,
      r.updated_at
    from public.teaching_reports r
    where r.teacher_id is not null
    order by
      r.teacher_id,
      r.report_date desc,
      r.updated_at desc,
      r.created_at desc,
      r.id desc
  ),
  teacher_base as (
    select
      tm.teacher_id,
      p.full_name,
      p.nickname,
      ur.role::text as role,
      case
        when p.is_blocked then 'blocked'
        when not p.is_approved then 'pending'
        else 'active'
      end as account_status,
      coalesce(csa.active_student_count, 0) as active_student_count,
      coalesce(ra.report_count, 0) as report_count,
      lr.report_date as last_report_date,
      lr.updated_at as last_report_updated_at,
      coalesce((
        select count(*)::integer
        from current_relationships cr
        where cr.teacher_id = tm.teacher_id
      ), 0) as current_class_count,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'class_id', c.id,
            'class_code', c.code,
            'class_name', c.name,
            'program_id', pr.id,
            'program_code', pr.code,
            'program_name', pr.name,
            'class_status', c.status,
            'relationship', cr.relationship
          )
          order by
            case c.status when 'active' then 1 when 'planned' then 2 else 3 end,
            c.starts_on desc nulls last,
            c.name
        )
        from current_relationships cr
        join public.classes c on c.id = cr.class_id
        left join public.programs pr on pr.id = c.program_id
        where cr.teacher_id = tm.teacher_id
      ), '[]'::jsonb) as current_classes
    from teacher_members tm
    join public.profiles p on p.user_id = tm.teacher_id
    left join public.user_roles ur on ur.user_id = tm.teacher_id
    left join current_student_agg csa on csa.teacher_id = tm.teacher_id
    left join report_agg ra on ra.teacher_id = tm.teacher_id
    left join last_report lr on lr.teacher_id = tm.teacher_id
  ),
  filtered_teachers as (
    select tb.*
    from teacher_base tb
    where (v_role is null or tb.role = v_role)
      and (v_account_status is null or tb.account_status = v_account_status)
      and (
        v_teaching_status is null
        or (v_teaching_status = 'teaching' and tb.current_class_count > 0)
        or (v_teaching_status = 'no_active' and tb.current_class_count = 0)
      )
      and (
        p_program_id is null
        or exists (
          select 1
          from current_relationships cr
          join public.classes c on c.id = cr.class_id
          where cr.teacher_id = tb.teacher_id
            and c.program_id = p_program_id
        )
      )
      and (
        p_class_id is null
        or exists (
          select 1
          from current_relationships cr
          where cr.teacher_id = tb.teacher_id
            and cr.class_id = p_class_id
        )
      )
      and (
        v_search is null
        or coalesce(tb.full_name, '') ilike '%' || v_search || '%'
        or coalesce(tb.nickname, '') ilike '%' || v_search || '%'
        or exists (
          select 1
          from current_relationships cr
          join public.classes c on c.id = cr.class_id
          where cr.teacher_id = tb.teacher_id
            and (
              coalesce(c.code, '') ilike '%' || v_search || '%'
              or c.name ilike '%' || v_search || '%'
            )
        )
      )
  ),
  paged_teachers as (
    select ft.*
    from filtered_teachers ft
    order by
      case when v_sort = 'name_asc'
        then lower(coalesce(ft.full_name, ft.nickname, '')) end asc nulls last,
      case when v_sort = 'name_desc'
        then lower(coalesce(ft.full_name, ft.nickname, '')) end desc nulls last,
      case when v_sort = 'activity_desc'
        then ft.last_report_date end desc nulls last,
      case when v_sort = 'activity_desc'
        then ft.last_report_updated_at end desc nulls last,
      case when v_sort = 'class_count_desc'
        then ft.current_class_count end desc nulls last,
      lower(coalesce(ft.full_name, ft.nickname, '')) asc,
      ft.teacher_id
    offset v_offset
    limit v_page_size
  ),
  summary_payload as (
    select jsonb_build_object(
      'total_teachers', count(*)::integer,
      'active_account_teachers', count(*) filter (where account_status = 'active')::integer,
      'currently_teaching', count(*) filter (where current_class_count > 0)::integer,
      'without_active_class', count(*) filter (where current_class_count = 0)::integer
    ) as summary
    from teacher_base
  ),
  pagination_payload as (
    select
      count(*)::integer as total_rows,
      case
        when count(*) = 0 then 0
        else ceil(count(*)::numeric / v_page_size)::integer
      end as total_pages
    from filtered_teachers
  ),
  row_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'teacher_id', pt.teacher_id,
          'full_name', pt.full_name,
          'nickname', pt.nickname,
          'role', pt.role,
          'account_status', pt.account_status,
          'teaching_status', case
            when pt.current_class_count > 0 then 'teaching'
            else 'no_active'
          end,
          'current_class_count', pt.current_class_count,
          'active_student_count', pt.active_student_count,
          'report_count', pt.report_count,
          'last_report_date', pt.last_report_date,
          'last_report_updated_at', pt.last_report_updated_at,
          'current_classes', pt.current_classes
        )
        order by
          case when v_sort = 'name_asc'
            then lower(coalesce(pt.full_name, pt.nickname, '')) end asc nulls last,
          case when v_sort = 'name_desc'
            then lower(coalesce(pt.full_name, pt.nickname, '')) end desc nulls last,
          case when v_sort = 'activity_desc'
            then pt.last_report_date end desc nulls last,
          case when v_sort = 'activity_desc'
            then pt.last_report_updated_at end desc nulls last,
          case when v_sort = 'class_count_desc'
            then pt.current_class_count end desc nulls last,
          lower(coalesce(pt.full_name, pt.nickname, '')) asc,
          pt.teacher_id
      ),
      '[]'::jsonb
    ) as rows
    from paged_teachers pt
  ),
  role_options as (
    select coalesce(
      jsonb_agg(jsonb_build_object('value', x.role) order by x.role),
      '[]'::jsonb
    ) as items
    from (
      select distinct role
      from teacher_base
      where role is not null
    ) x
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
      select distinct pr.id, pr.code, pr.name
      from current_relationships cr
      join public.classes c on c.id = cr.class_id
      join public.programs pr on pr.id = c.program_id
    ) x
  ),
  class_options as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'code', x.code,
          'name', x.name,
          'program_id', x.program_id
        )
        order by x.name
      ),
      '[]'::jsonb
    ) as items
    from (
      select distinct c.id, c.code, c.name, c.program_id
      from current_relationships cr
      join public.classes c on c.id = cr.class_id
    ) x
  )
  select jsonb_build_object(
    'summary', sp.summary,
    'rows', rp.rows,
    'filters', jsonb_build_object(
      'roles', ro.items,
      'programs', po.items,
      'classes', co.items
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
  cross join role_options ro
  cross join program_options po
  cross join class_options co;

  return v_result;
end
$$;

revoke all
on function public.get_management_teachers(text,text,text,uuid,uuid,text,text,integer,integer)
from public;

revoke all
on function public.get_management_teachers(text,text,text,uuid,uuid,text,text,integer,integer)
from anon;

grant execute
on function public.get_management_teachers(text,text,text,uuid,uuid,text,text,integer,integer)
to authenticated;


create or replace function public.get_management_teacher_detail(p_teacher_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_today date := (current_timestamp at time zone 'Asia/Jakarta')::date;
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
  active_student_stats as (
    select
      count(distinct e.user_id) filter (where e.status = 'active')::integer as active_student_count
    from current_relationships cr
    left join public.class_enrollments e on e.class_id = cr.class_id
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
    'recent_reports', rhp.items
  )
  into v_result
  from public.profiles p
  left join public.user_roles ur on ur.user_id = p.user_id
  cross join current_classes_payload ccp
  cross join history_payload hp
  cross join report_stats rs
  cross join active_student_stats ass
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
