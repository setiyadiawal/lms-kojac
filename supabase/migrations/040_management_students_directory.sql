-- KOJAC LMS — Management Phase 1A
-- Student Management: read-only directory + academic detail foundation.
-- Candidate only. DO NOT APPLY before review.
-- No table/schema data model changes; only management-only RPCs.

create or replace function public.get_management_students(
  p_student_status text default null,
  p_program_id uuid default null,
  p_class_id uuid default null,
  p_teacher_id uuid default null,
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
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := case when p_page_size in (25, 50, 100) then p_page_size else 25 end;
  v_offset integer;
  v_status text := nullif(btrim(coalesce(p_student_status, '')), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort text := coalesce(nullif(btrim(coalesce(p_sort, '')), ''), 'name_asc');
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not private.classroom_is_management() then
    raise exception 'management_access_required';
  end if;

  if v_status is not null and v_status not in ('active', 'inactive', 'alumni') then
    raise exception 'invalid_student_status';
  end if;

  if v_sort not in ('name_asc', 'name_desc', 'joined_desc') then
    raise exception 'invalid_student_sort';
  end if;

  v_offset := (v_page - 1) * v_page_size;

  with student_base as (
    select
      p.user_id as student_id,
      p.full_name,
      p.nickname,
      p.is_approved,
      p.is_blocked,
      p.created_at as profile_created_at,
      bool_or(e.status = 'active') as has_active,
      bool_or(e.status = 'paused') as has_paused,
      bool_or(e.status = 'completed') as has_completed,
      min(e.joined_at) as first_enrollment_joined_at,
      count(distinct e.class_id)::integer as class_history_count
    from public.user_roles ur
    join public.profiles p on p.user_id = ur.user_id
    left join public.class_enrollments e on e.user_id = p.user_id
    where ur.role::text = 'siswa'
    group by p.user_id, p.full_name, p.nickname, p.is_approved, p.is_blocked, p.created_at
  ),
  derived_students as (
    select
      sb.*,
      case
        when coalesce(sb.has_active, false) then 'active'
        when not coalesce(sb.has_paused, false) and coalesce(sb.has_completed, false) then 'alumni'
        else 'inactive'
      end as academic_status,
      coalesce(sb.first_enrollment_joined_at, sb.profile_created_at) as joined_at,
      case
        when sb.is_blocked then 'blocked'
        when not sb.is_approved then 'pending'
        else 'active'
      end as account_status
    from student_base sb
  ),
  filtered_students as (
    select ds.*
    from derived_students ds
    where (v_status is null or ds.academic_status = v_status)
      and (
        p_program_id is null
        or exists (
          select 1
          from public.class_enrollments fe
          join public.classes fc on fc.id = fe.class_id
          where fe.user_id = ds.student_id
            and fc.program_id = p_program_id
        )
      )
      and (
        p_class_id is null
        or exists (
          select 1
          from public.class_enrollments fe
          where fe.user_id = ds.student_id
            and fe.class_id = p_class_id
        )
      )
      and (
        p_teacher_id is null
        or exists (
          select 1
          from public.class_enrollments fe
          join public.classes fc on fc.id = fe.class_id
          where fe.user_id = ds.student_id
            and fc.teacher_id = p_teacher_id
        )
      )
      and (
        v_search is null
        or coalesce(ds.full_name, '') ilike '%' || v_search || '%'
        or coalesce(ds.nickname, '') ilike '%' || v_search || '%'
        or exists (
          select 1
          from public.class_enrollments se
          join public.classes sc on sc.id = se.class_id
          where se.user_id = ds.student_id
            and (
              coalesce(sc.code, '') ilike '%' || v_search || '%'
              or sc.name ilike '%' || v_search || '%'
            )
        )
      )
  ),
  paged_students as (
    select fs.*
    from filtered_students fs
    order by
      case when v_sort = 'name_asc' then lower(coalesce(fs.full_name, fs.nickname, '')) end asc nulls last,
      case when v_sort = 'name_desc' then lower(coalesce(fs.full_name, fs.nickname, '')) end desc nulls last,
      case when v_sort = 'joined_desc' then fs.joined_at end desc nulls last,
      lower(coalesce(fs.full_name, fs.nickname, '')) asc,
      fs.student_id
    offset v_offset
    limit v_page_size
  ),
  row_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'student_id', ps.student_id,
          'full_name', ps.full_name,
          'nickname', ps.nickname,
          'academic_status', ps.academic_status,
          'account_status', ps.account_status,
          'joined_at', ps.joined_at,
          'class_history_count', ps.class_history_count,
          'active_classes', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'class_id', c.id,
                'class_code', c.code,
                'class_name', c.name,
                'program_id', pr.id,
                'program_code', pr.code,
                'program_name', pr.name,
                'teacher_id', c.teacher_id,
                'teacher_name', coalesce(nullif(btrim(tp.full_name), ''), nullif(btrim(tp.nickname), ''), 'Belum ditentukan'),
                'enrollment_status', e.status,
                'joined_at', e.joined_at
              )
              order by e.joined_at asc, c.name asc
            )
            from public.class_enrollments e
            join public.classes c on c.id = e.class_id
            left join public.programs pr on pr.id = c.program_id
            left join public.profiles tp on tp.user_id = c.teacher_id
            where e.user_id = ps.student_id
              and e.status = 'active'
          ), '[]'::jsonb)
        )
        order by
          case when v_sort = 'name_asc' then lower(coalesce(ps.full_name, ps.nickname, '')) end asc nulls last,
          case when v_sort = 'name_desc' then lower(coalesce(ps.full_name, ps.nickname, '')) end desc nulls last,
          case when v_sort = 'joined_desc' then ps.joined_at end desc nulls last,
          lower(coalesce(ps.full_name, ps.nickname, '')) asc,
          ps.student_id
      ),
      '[]'::jsonb
    ) as rows
    from paged_students ps
  ),
  summary_payload as (
    select jsonb_build_object(
      'total_students', count(*)::integer,
      'active_students', count(*) filter (where academic_status = 'active')::integer,
      'inactive_students', count(*) filter (where academic_status = 'inactive')::integer,
      'alumni_students', count(*) filter (where academic_status = 'alumni')::integer
    ) as summary
    from derived_students
  ),
  pagination_payload as (
    select
      count(*)::integer as total_rows,
      case
        when count(*) = 0 then 0
        else ceil(count(*)::numeric / v_page_size)::integer
      end as total_pages
    from filtered_students
  ),
  program_options as (
    select coalesce(jsonb_agg(
      jsonb_build_object('id', pr.id, 'code', pr.code, 'name', pr.name)
      order by pr.name asc
    ), '[]'::jsonb) as items
    from public.programs pr
  ),
  class_options as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'name', c.name,
        'program_id', c.program_id
      ) order by c.name asc
    ), '[]'::jsonb) as items
    from public.classes c
  ),
  teacher_options_source as (
    select distinct
      c.teacher_id as id,
      coalesce(nullif(btrim(tp.full_name), ''), nullif(btrim(tp.nickname), ''), 'Pengajar KOJAC') as name
    from public.classes c
    join public.profiles tp on tp.user_id = c.teacher_id
    where c.teacher_id is not null
  ),
  teacher_options as (
    select coalesce(jsonb_agg(
      jsonb_build_object('id', tos.id, 'name', tos.name)
      order by tos.name asc
    ), '[]'::jsonb) as items
    from teacher_options_source tos
  )
  select jsonb_build_object(
    'summary', sp.summary,
    'rows', rp.rows,
    'filters', jsonb_build_object(
      'programs', po.items,
      'classes', co.items,
      'teachers', teo.items
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
  cross join row_payload rp
  cross join pagination_payload pp
  cross join program_options po
  cross join class_options co
  cross join teacher_options teo;

  return v_result;
end
$$;

revoke all on function public.get_management_students(text, uuid, uuid, uuid, text, text, integer, integer) from public;
revoke all on function public.get_management_students(text, uuid, uuid, uuid, text, text, integer, integer) from anon;
grant execute on function public.get_management_students(text, uuid, uuid, uuid, text, text, integer, integer) to authenticated;

create or replace function public.get_management_student_detail(p_student_id uuid)
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

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p_student_id
      and ur.role::text = 'siswa'
  ) then
    raise exception 'student_not_found';
  end if;

  with enrollment_flags as (
    select
      bool_or(e.status = 'active') as has_active,
      bool_or(e.status = 'paused') as has_paused,
      bool_or(e.status = 'completed') as has_completed
    from public.class_enrollments e
    where e.user_id = p_student_id
  ),
  student_context as (
    select
      p.user_id,
      p.full_name,
      p.nickname,
      p.is_approved,
      p.is_blocked,
      case
        when coalesce(ef.has_active, false) then 'active'
        when not coalesce(ef.has_paused, false) and coalesce(ef.has_completed, false) then 'alumni'
        else 'inactive'
      end as academic_status,
      case
        when p.is_blocked then 'blocked'
        when not p.is_approved then 'pending'
        else 'active'
      end as account_status
    from public.profiles p
    cross join enrollment_flags ef
    where p.user_id = p_student_id
  )
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'student_id', sc.user_id,
      'full_name', sc.full_name,
      'nickname', sc.nickname
    ),
    'academic_status', sc.academic_status,
    'account_status', sc.account_status,
    'current_classes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'class_id', c.id,
          'class_code', c.code,
          'class_name', c.name,
          'class_status', c.status,
          'program_id', pr.id,
          'program_code', pr.code,
          'program_name', pr.name,
          'teacher_id', c.teacher_id,
          'teacher_name', coalesce(nullif(btrim(tp.full_name), ''), nullif(btrim(tp.nickname), ''), 'Belum ditentukan'),
          'enrollment_status', e.status,
          'joined_at', e.joined_at,
          'completed_at', e.completed_at
        ) order by e.joined_at desc
      )
      from public.class_enrollments e
      join public.classes c on c.id = e.class_id
      left join public.programs pr on pr.id = c.program_id
      left join public.profiles tp on tp.user_id = c.teacher_id
      where e.user_id = p_student_id
        and e.status = 'active'
    ), '[]'::jsonb),
    'class_history', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'class_id', c.id,
          'class_code', c.code,
          'class_name', c.name,
          'class_status', c.status,
          'program_id', pr.id,
          'program_code', pr.code,
          'program_name', pr.name,
          'teacher_id', c.teacher_id,
          'teacher_name', coalesce(nullif(btrim(tp.full_name), ''), nullif(btrim(tp.nickname), ''), 'Belum ditentukan'),
          'enrollment_status', e.status,
          'joined_at', e.joined_at,
          'completed_at', e.completed_at
        ) order by e.joined_at desc
      )
      from public.class_enrollments e
      join public.classes c on c.id = e.class_id
      left join public.programs pr on pr.id = c.program_id
      left join public.profiles tp on tp.user_id = c.teacher_id
      where e.user_id = p_student_id
        and e.status <> 'active'
    ), '[]'::jsonb)
  )
  into v_result
  from student_context sc;

  if v_result is null then
    raise exception 'student_not_found';
  end if;

  return v_result;
end
$$;

revoke all on function public.get_management_student_detail(uuid) from public;
revoke all on function public.get_management_student_detail(uuid) from anon;
grant execute on function public.get_management_student_detail(uuid) to authenticated;
