-- USER SYSTEM PHASE 2C — STUDENT / KELAS SAYA
-- Read-only RPC for the currently authenticated student.
-- No user_id parameter is accepted; auth.uid() is always the identity source.

create or replace function public.get_my_classes()
returns table (
  enrollment_status text,
  joined_at timestamptz,
  completed_at timestamptz,
  class_id uuid,
  class_code text,
  class_name text,
  class_status text,
  starts_on date,
  ends_on date,
  program_code text,
  program_name text,
  teacher_name text
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

  if v_actor_role is null or v_actor_role::text <> 'siswa' then
    raise exception 'student_access_required';
  end if;

  return query
  select
    e.status::text as enrollment_status,
    e.joined_at,
    e.completed_at,
    c.id as class_id,
    c.code as class_code,
    c.name as class_name,
    c.status::text as class_status,
    c.starts_on,
    c.ends_on,
    pr.code as program_code,
    pr.name as program_name,
    tp.full_name as teacher_name
  from public.class_enrollments e
  join public.classes c on c.id = e.class_id
  left join public.programs pr on pr.id = c.program_id
  left join public.profiles tp on tp.user_id = c.teacher_id
  where e.user_id = v_actor
  order by
    case e.status
      when 'active' then 1
      when 'paused' then 2
      when 'completed' then 3
      when 'cancelled' then 4
      else 5
    end,
    e.joined_at desc,
    c.created_at desc;
end
$$;

revoke all on function public.get_my_classes() from public;
revoke execute on function public.get_my_classes() from anon;
grant execute on function public.get_my_classes() to authenticated;
