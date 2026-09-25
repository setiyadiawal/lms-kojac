-- KOJAC LIVE CLASSROOM — PHASE 2.2
-- Student self attendance history.
-- Production migration version: 20260921163953
-- Already applied to production. DO NOT replay manually on production.

create or replace function public.get_my_live_class_attendance_history(
  p_class_id uuid,
  p_limit integer default 20
)
returns table (
  session_id uuid,
  session_started_at timestamptz,
  session_ended_at timestamptz,
  session_status text,
  first_joined_at timestamptz,
  last_seen_at timestamptz,
  left_at timestamptz,
  duration_seconds integer,
  join_count integer,
  was_late boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
  v_now timestamptz := statement_timestamp();
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select ur.role::text
  into v_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_role <> 'siswa' then
    raise exception 'student_access_required';
  end if;

  if not exists (
    select 1
    from public.class_enrollments e
    where e.class_id = p_class_id
      and e.user_id = v_actor
  ) then
    raise exception 'student_class_history_access_denied';
  end if;

  return query
  select
    s.id,
    s.started_at,
    s.ended_at,
    s.status,
    a.first_joined_at,
    a.last_seen_at,
    a.left_at,
    (
      a.total_seconds
      + case
          when s.status = 'active' and a.left_at is null then
            least(
              30,
              greatest(
                0,
                floor(extract(epoch from (v_now - a.last_seen_at)))::integer
              )
            )
          else 0
        end
    )::integer,
    a.join_count,
    a.was_late
  from private.live_class_attendance a
  join private.live_class_sessions s on s.id = a.session_id
  where s.class_id = p_class_id
    and a.user_id = v_actor
  order by s.started_at desc
  limit v_limit;
end
$$;

revoke all on function public.get_my_live_class_attendance_history(uuid, integer) from public, anon;
grant execute on function public.get_my_live_class_attendance_history(uuid, integer) to authenticated;
