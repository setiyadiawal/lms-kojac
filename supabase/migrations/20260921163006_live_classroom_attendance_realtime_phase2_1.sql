-- KOJAC LIVE CLASSROOM — PHASE 2.1
-- Faster attendance presence / online state.
-- Production migration version: 20260921163006
-- Already applied to production. DO NOT replay manually on production.

create or replace function public.get_live_class_attendance(p_session_id uuid)
returns table (
  user_id uuid,
  display_name text,
  role text,
  first_joined_at timestamptz,
  last_seen_at timestamptz,
  left_at timestamptz,
  duration_seconds integer,
  join_count integer,
  was_late boolean,
  is_connected boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_class_id uuid;
  v_now timestamptz := statement_timestamp();
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select s.class_id into v_class_id
  from private.live_class_sessions s
  where s.id = p_session_id;

  if not found then raise exception 'live_session_not_found'; end if;
  if not private.live_classroom_can_moderate_class(v_class_id) then
    raise exception 'teacher_class_access_denied';
  end if;

  return query
  select
    a.user_id,
    a.display_name_snapshot,
    a.role_snapshot,
    a.first_joined_at,
    a.last_seen_at,
    a.left_at,
    (
      a.total_seconds
      + case
          when a.left_at is null then
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
    a.was_late,
    (
      a.left_at is null
      and a.last_seen_at >= v_now - interval '40 seconds'
    )
  from private.live_class_attendance a
  where a.session_id = p_session_id
  order by
    case when a.role_snapshot = 'siswa' then 1 else 0 end,
    a.first_joined_at,
    a.display_name_snapshot;
end
$$;

revoke all on function public.get_live_class_attendance(uuid) from public, anon;
grant execute on function public.get_live_class_attendance(uuid) to authenticated;
