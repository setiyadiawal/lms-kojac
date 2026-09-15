-- USER SYSTEM PHASE 2D — TEACHING WORKSPACE FOUNDATION / KELAS MENGAJAR
-- Read-only RPCs. Teaching access is relationship-based through classes.teacher_id.
-- No caller-supplied teacher/user identity is accepted.

create or replace function public.get_my_teaching_classes()
returns table (
  class_id uuid,
  class_code text,
  class_name text,
  class_status text,
  starts_on date,
  ends_on date,
  program_code text,
  program_name text,
  student_count_active integer,
  student_count_paused integer,
  student_count_total_current integer
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

  return query
  select
    c.id as class_id,
    c.code as class_code,
    c.name as class_name,
    c.status::text as class_status,
    c.starts_on,
    c.ends_on,
    pr.code as program_code,
    pr.name as program_name,
    count(e.user_id) filter (where e.status = 'active')::integer as student_count_active,
    count(e.user_id) filter (where e.status = 'paused')::integer as student_count_paused,
    count(e.user_id) filter (where e.status in ('active','paused'))::integer as student_count_total_current
  from public.classes c
  left join public.programs pr on pr.id = c.program_id
  left join public.class_enrollments e on e.class_id = c.id
  where c.teacher_id = v_actor
  group by c.id, c.code, c.name, c.status, c.starts_on, c.ends_on, c.created_at, pr.code, pr.name
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

  -- Ownership is checked server-side. A class ID alone never grants visibility.
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
    e.user_id,
    p.full_name,
    p.nickname,
    e.status::text as enrollment_status,
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
