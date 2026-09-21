-- KOJAC LIVE CLASSROOM — PHASE 2
-- Session lifecycle + attendance foundation
-- Production migration version: 20260921161152
-- Already applied to production through the Supabase migration API.
-- DO NOT replay manually on production.

create table private.live_class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  provider text not null default 'jaas',
  provider_room_name text not null,
  status text not null default 'active'
    check (status in ('active','ended')),
  started_by uuid,
  started_by_name_snapshot text not null,
  started_at timestamptz not null default now(),
  ended_by uuid,
  ended_by_name_snapshot text,
  ended_at timestamptz,
  late_grace_minutes smallint not null default 10
    check (late_grace_minutes between 0 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_class_sessions_provider_check
    check (char_length(btrim(provider)) between 1 and 40),
  constraint live_class_sessions_room_check
    check (char_length(btrim(provider_room_name)) between 1 and 240),
  constraint live_class_sessions_end_check
    check (
      (status = 'active' and ended_at is null)
      or
      (status = 'ended' and ended_at is not null and ended_at >= started_at)
    )
);

create unique index live_class_sessions_one_active_per_class_idx
  on private.live_class_sessions(class_id)
  where status = 'active';

create unique index live_class_sessions_provider_room_uidx
  on private.live_class_sessions(provider, provider_room_name);

create index live_class_sessions_class_started_idx
  on private.live_class_sessions(class_id, started_at desc);

create table private.live_class_attendance (
  session_id uuid not null references private.live_class_sessions(id) on delete cascade,
  user_id uuid not null,
  role_snapshot text not null,
  display_name_snapshot text not null,
  first_joined_at timestamptz not null,
  last_joined_at timestamptz not null,
  last_seen_at timestamptz not null,
  left_at timestamptz,
  total_seconds integer not null default 0 check (total_seconds >= 0),
  join_count integer not null default 1 check (join_count >= 1),
  was_late boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id),
  constraint live_class_attendance_role_check
    check (char_length(btrim(role_snapshot)) between 1 and 40),
  constraint live_class_attendance_name_check
    check (char_length(btrim(display_name_snapshot)) between 1 and 200)
);

create index live_class_attendance_session_idx
  on private.live_class_attendance(session_id, first_joined_at);

alter table private.live_class_sessions enable row level security;
alter table private.live_class_attendance enable row level security;

revoke all on table private.live_class_sessions from public, anon, authenticated;
revoke all on table private.live_class_attendance from public, anon, authenticated;

create or replace function private.live_classroom_can_moderate_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select auth.uid() is not null
    and (
      exists (
        select 1
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role::text in ('administrator','manager','co_founder','founder')
      )
      or private.classroom_can_teach_class(p_class_id, null)
    )
$$;

create or replace function private.live_classroom_can_join_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select auth.uid() is not null
    and (
      private.live_classroom_can_moderate_class(p_class_id)
      or exists (
        select 1
        from public.class_enrollments e
        join public.user_roles ur on ur.user_id = e.user_id
        where e.class_id = p_class_id
          and e.user_id = auth.uid()
          and e.status::text = 'active'
          and ur.role::text = 'siswa'
      )
    )
$$;

revoke all on function private.live_classroom_can_moderate_class(uuid) from public, anon, authenticated;
revoke all on function private.live_classroom_can_join_class(uuid) from public, anon, authenticated;

create or replace function public.get_live_classroom_state(p_class_id uuid)
returns table (
  class_id uuid,
  class_name text,
  class_code text,
  can_moderate boolean,
  session_id uuid,
  session_status text,
  provider text,
  provider_room_name text,
  started_at timestamptz,
  started_by_name text,
  late_grace_minutes smallint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_class public.classes%rowtype;
  v_session private.live_class_sessions%rowtype;
  v_can_moderate boolean;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select c.* into v_class
  from public.classes c
  where c.id = p_class_id;

  if not found then raise exception 'class_not_found'; end if;

  if not private.live_classroom_can_join_class(p_class_id) then
    raise exception 'live_classroom_access_denied';
  end if;

  v_can_moderate := private.live_classroom_can_moderate_class(p_class_id);

  select s.* into v_session
  from private.live_class_sessions s
  where s.class_id = p_class_id
    and s.status = 'active'
  order by s.started_at desc
  limit 1;

  return query
  select
    v_class.id,
    v_class.name,
    v_class.code,
    v_can_moderate,
    v_session.id,
    v_session.status,
    v_session.provider,
    v_session.provider_room_name,
    v_session.started_at,
    v_session.started_by_name_snapshot,
    v_session.late_grace_minutes;
end
$$;

create or replace function public.start_live_class_session(p_class_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_class_status text;
  v_session_id uuid;
  v_display_name text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.live_classroom_can_moderate_class(p_class_id) then
    raise exception 'teacher_class_access_denied';
  end if;

  select c.status
  into v_class_status
  from public.classes c
  where c.id = p_class_id
  for update;

  if not found then raise exception 'class_not_found'; end if;
  if v_class_status <> 'active' then raise exception 'class_not_active_for_live'; end if;

  select s.id into v_session_id
  from private.live_class_sessions s
  where s.class_id = p_class_id
    and s.status = 'active'
  order by s.started_at desc
  limit 1;

  if v_session_id is not null then
    return v_session_id;
  end if;

  select coalesce(
    nullif(btrim(p.nickname), ''),
    nullif(btrim(p.full_name), ''),
    'Pengajar KOJAC'
  )
  into v_display_name
  from public.profiles p
  where p.user_id = v_actor;

  v_display_name := coalesce(v_display_name, 'Pengajar KOJAC');
  v_session_id := gen_random_uuid();

  insert into private.live_class_sessions(
    id,
    class_id,
    provider,
    provider_room_name,
    started_by,
    started_by_name_snapshot
  )
  values(
    v_session_id,
    p_class_id,
    'jaas',
    'kojac_' || replace(p_class_id::text, '-', '') || '_' || replace(v_session_id::text, '-', ''),
    v_actor,
    v_display_name
  );

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values (
    v_actor,
    'start_live_class_session',
    v_actor,
    jsonb_build_object('class_id', p_class_id, 'session_id', v_session_id)
  );

  return v_session_id;
end
$$;

create or replace function public.end_live_class_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_class_id uuid;
  v_status text;
  v_now timestamptz := clock_timestamp();
  v_display_name text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select s.class_id, s.status
  into v_class_id, v_status
  from private.live_class_sessions s
  where s.id = p_session_id
  for update;

  if not found then raise exception 'live_session_not_found'; end if;
  if not private.live_classroom_can_moderate_class(v_class_id) then
    raise exception 'teacher_class_access_denied';
  end if;
  if v_status = 'ended' then return; end if;

  select coalesce(
    nullif(btrim(p.nickname), ''),
    nullif(btrim(p.full_name), ''),
    'Pengajar KOJAC'
  )
  into v_display_name
  from public.profiles p
  where p.user_id = v_actor;

  v_display_name := coalesce(v_display_name, 'Pengajar KOJAC');

  update private.live_class_attendance a
  set
    total_seconds = a.total_seconds
      + least(
          90,
          greatest(
            0,
            floor(extract(epoch from (v_now - a.last_seen_at)))::integer
          )
        ),
    last_seen_at = v_now,
    left_at = v_now,
    updated_at = v_now
  where a.session_id = p_session_id
    and a.left_at is null;

  update private.live_class_sessions
  set
    status = 'ended',
    ended_by = v_actor,
    ended_by_name_snapshot = v_display_name,
    ended_at = v_now,
    updated_at = v_now
  where id = p_session_id;

  insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
  values (
    v_actor,
    'end_live_class_session',
    v_actor,
    jsonb_build_object('class_id', v_class_id, 'session_id', p_session_id)
  );
end
$$;

create or replace function public.join_live_class_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_session private.live_class_sessions%rowtype;
  v_role text;
  v_display_name text;
  v_now timestamptz := clock_timestamp();
  v_existing private.live_class_attendance%rowtype;
  v_late boolean;
  v_delta integer := 0;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  select s.* into v_session
  from private.live_class_sessions s
  where s.id = p_session_id
  for update;

  if not found then raise exception 'live_session_not_found'; end if;
  if v_session.status <> 'active' then raise exception 'live_session_not_active'; end if;
  if not private.live_classroom_can_join_class(v_session.class_id) then
    raise exception 'live_classroom_access_denied';
  end if;

  select ur.role::text into v_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_role is null then raise exception 'role_not_found'; end if;

  select coalesce(
    nullif(btrim(p.nickname), ''),
    nullif(btrim(p.full_name), ''),
    'Pengguna KOJAC'
  )
  into v_display_name
  from public.profiles p
  where p.user_id = v_actor;

  v_display_name := coalesce(v_display_name, 'Pengguna KOJAC');
  v_late := v_role = 'siswa'
    and v_now > v_session.started_at + make_interval(mins => v_session.late_grace_minutes);

  select a.* into v_existing
  from private.live_class_attendance a
  where a.session_id = p_session_id
    and a.user_id = v_actor
  for update;

  if not found then
    insert into private.live_class_attendance(
      session_id,
      user_id,
      role_snapshot,
      display_name_snapshot,
      first_joined_at,
      last_joined_at,
      last_seen_at,
      was_late
    )
    values(
      p_session_id,
      v_actor,
      v_role,
      v_display_name,
      v_now,
      v_now,
      v_now,
      v_late
    );
    return;
  end if;

  if v_existing.left_at is null
    and v_existing.last_seen_at >= v_now - interval '120 seconds' then
    update private.live_class_attendance
    set
      last_seen_at = v_now,
      display_name_snapshot = v_display_name,
      role_snapshot = v_role,
      updated_at = v_now
    where session_id = p_session_id
      and user_id = v_actor;
    return;
  end if;

  if v_existing.left_at is null then
    v_delta := least(
      90,
      greatest(
        0,
        floor(extract(epoch from (v_now - v_existing.last_seen_at)))::integer
      )
    );
  end if;

  update private.live_class_attendance
  set
    role_snapshot = v_role,
    display_name_snapshot = v_display_name,
    last_joined_at = v_now,
    last_seen_at = v_now,
    left_at = null,
    total_seconds = total_seconds + v_delta,
    join_count = join_count + 1,
    updated_at = v_now
  where session_id = p_session_id
    and user_id = v_actor;
end
$$;

create or replace function public.heartbeat_live_class_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_updated integer := 0;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;

  update private.live_class_attendance a
  set
    total_seconds = a.total_seconds
      + least(
          90,
          greatest(
            0,
            floor(extract(epoch from (v_now - a.last_seen_at)))::integer
          )
        ),
    last_seen_at = v_now,
    updated_at = v_now
  where a.session_id = p_session_id
    and a.user_id = v_actor
    and a.left_at is null
    and exists (
      select 1
      from private.live_class_sessions s
      where s.id = a.session_id
        and s.status = 'active'
    );

  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'attendance_not_active'; end if;
end
$$;

create or replace function public.leave_live_class_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_actor is null then return; end if;

  update private.live_class_attendance a
  set
    total_seconds = a.total_seconds
      + least(
          90,
          greatest(
            0,
            floor(extract(epoch from (v_now - a.last_seen_at)))::integer
          )
        ),
    last_seen_at = v_now,
    left_at = v_now,
    updated_at = v_now
  where a.session_id = p_session_id
    and a.user_id = v_actor
    and a.left_at is null;
end
$$;

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
              90,
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
      and a.last_seen_at >= v_now - interval '120 seconds'
    )
  from private.live_class_attendance a
  where a.session_id = p_session_id
  order by
    case when a.role_snapshot = 'siswa' then 1 else 0 end,
    a.first_joined_at,
    a.display_name_snapshot;
end
$$;

create or replace function public.get_live_class_session_history(
  p_class_id uuid,
  p_limit integer default 10
)
returns table (
  session_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  status text,
  started_by_name text,
  participant_count integer,
  student_count integer,
  late_student_count integer,
  total_student_minutes integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.live_classroom_can_moderate_class(p_class_id) then
    raise exception 'teacher_class_access_denied';
  end if;

  return query
  select
    s.id,
    s.started_at,
    s.ended_at,
    s.status,
    s.started_by_name_snapshot,
    count(a.user_id)::integer,
    count(a.user_id) filter (where a.role_snapshot = 'siswa')::integer,
    count(a.user_id) filter (where a.role_snapshot = 'siswa' and a.was_late)::integer,
    coalesce(
      floor(
        sum(
          case
            when a.role_snapshot = 'siswa' then a.total_seconds
            else 0
          end
        ) / 60.0
      ),
      0
    )::integer
  from private.live_class_sessions s
  left join private.live_class_attendance a on a.session_id = s.id
  where s.class_id = p_class_id
  group by s.id
  order by s.started_at desc
  limit v_limit;
end
$$;

revoke all on function public.get_live_classroom_state(uuid) from public, anon;
revoke all on function public.start_live_class_session(uuid) from public, anon;
revoke all on function public.end_live_class_session(uuid) from public, anon;
revoke all on function public.join_live_class_session(uuid) from public, anon;
revoke all on function public.heartbeat_live_class_session(uuid) from public, anon;
revoke all on function public.leave_live_class_session(uuid) from public, anon;
revoke all on function public.get_live_class_attendance(uuid) from public, anon;
revoke all on function public.get_live_class_session_history(uuid, integer) from public, anon;

grant execute on function public.get_live_classroom_state(uuid) to authenticated;
grant execute on function public.start_live_class_session(uuid) to authenticated;
grant execute on function public.end_live_class_session(uuid) to authenticated;
grant execute on function public.join_live_class_session(uuid) to authenticated;
grant execute on function public.heartbeat_live_class_session(uuid) to authenticated;
grant execute on function public.leave_live_class_session(uuid) to authenticated;
grant execute on function public.get_live_class_attendance(uuid) to authenticated;
grant execute on function public.get_live_class_session_history(uuid, integer) to authenticated;
