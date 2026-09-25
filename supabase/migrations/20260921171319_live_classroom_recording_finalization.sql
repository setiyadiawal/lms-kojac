-- KOJAC LIVE — RECORDING FINALIZATION
-- Production version: 20260921171319
-- ALREADY APPLIED TO PRODUCTION. DO NOT REPLAY MANUALLY.

create table private.live_recording_jobs (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references private.live_class_sessions(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  provider text not null default 'jaas',
  provider_room_name text not null,
  provider_meeting_session_id text,
  provider_recording_session_id text,
  status text not null default 'recording'
    check (status in ('recording','processing','ready','imported','failed')),
  started_at timestamptz,
  ended_at timestamptz,
  uploaded_at timestamptz,
  source_url text,
  source_url_expires_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  initiator_id text,
  is_shared boolean,
  imported_recording_id uuid references private.class_recordings(id) on delete set null,
  last_event_timestamp bigint,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_recording_jobs_provider_check
    check (char_length(btrim(provider)) between 1 and 40),
  constraint live_recording_jobs_room_check
    check (char_length(btrim(provider_room_name)) between 1 and 240),
  constraint live_recording_jobs_source_url_check
    check (source_url is null or char_length(source_url) <= 6000),
  constraint live_recording_jobs_error_check
    check (error_message is null or char_length(error_message) <= 2000)
);

create index live_recording_jobs_class_created_idx
  on private.live_recording_jobs(class_id, created_at desc);

create index live_recording_jobs_session_created_idx
  on private.live_recording_jobs(live_session_id, created_at desc);

create index live_recording_jobs_room_idx
  on private.live_recording_jobs(provider, provider_room_name, created_at desc);

create unique index live_recording_jobs_provider_recording_uidx
  on private.live_recording_jobs(provider, provider_recording_session_id)
  where provider_recording_session_id is not null;

create table private.jaas_webhook_events (
  idempotency_key text primary key,
  event_type text not null,
  event_timestamp bigint,
  received_at timestamptz not null default now(),
  constraint jaas_webhook_events_key_check
    check (char_length(btrim(idempotency_key)) between 1 and 200),
  constraint jaas_webhook_events_type_check
    check (char_length(btrim(event_type)) between 1 and 100)
);

create index jaas_webhook_events_received_idx
  on private.jaas_webhook_events(received_at desc);

alter table private.live_recording_jobs enable row level security;
alter table private.jaas_webhook_events enable row level security;

revoke all on table private.live_recording_jobs from public, anon, authenticated;
revoke all on table private.jaas_webhook_events from public, anon, authenticated;

create or replace function public.get_live_recording_jobs(
  p_class_id uuid,
  p_limit integer default 20
)
returns table (
  job_id uuid,
  live_session_id uuid,
  class_id uuid,
  status text,
  provider text,
  provider_recording_session_id text,
  started_at timestamptz,
  ended_at timestamptz,
  uploaded_at timestamptz,
  source_url text,
  source_url_expires_at timestamptz,
  duration_seconds integer,
  imported_recording_id uuid,
  error_message text
)
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit,20),100));
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.live_classroom_can_moderate_class(p_class_id) then
    raise exception 'teacher_class_access_denied';
  end if;

  return query
  select
    j.id,
    j.live_session_id,
    j.class_id,
    case
      when j.status='ready'
        and j.source_url_expires_at is not null
        and j.source_url_expires_at <= now()
      then 'expired'
      else j.status
    end,
    j.provider,
    j.provider_recording_session_id,
    j.started_at,
    j.ended_at,
    j.uploaded_at,
    case
      when j.status='ready'
        and (j.source_url_expires_at is null or j.source_url_expires_at > now())
      then j.source_url
      else null
    end,
    j.source_url_expires_at,
    j.duration_seconds,
    j.imported_recording_id,
    j.error_message
  from private.live_recording_jobs j
  where j.class_id=p_class_id
  order by j.created_at desc
  limit v_limit;
end
$$;

create or replace function public.create_class_recording_from_live_job(
  p_job_id uuid,
  p_title text,
  p_description text,
  p_drive_file_id text,
  p_is_published boolean default true
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_job private.live_recording_jobs%rowtype;
  v_id uuid;
  v_title text := btrim(coalesce(p_title,''));
  v_description text := coalesce(p_description,'');
  v_duration_minutes integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into v_job
  from private.live_recording_jobs
  where id=p_job_id
  for update;

  if not found then raise exception 'live_recording_job_not_found'; end if;
  if not private.live_classroom_can_moderate_class(v_job.class_id) then
    raise exception 'teacher_class_access_denied';
  end if;

  if v_job.imported_recording_id is not null then
    return v_job.imported_recording_id;
  end if;

  if v_job.status not in ('ready','processing') then
    raise exception 'live_recording_not_ready';
  end if;

  if char_length(v_title) not between 1 and 160 then
    raise exception 'recording_title_invalid';
  end if;
  if char_length(v_description) > 5000 then
    raise exception 'recording_description_too_long';
  end if;
  if coalesce(p_drive_file_id,'') !~ '^[A-Za-z0-9_-]{10,200}$' then
    raise exception 'recording_drive_file_id_invalid';
  end if;

  v_duration_minutes := case
    when v_job.duration_seconds is null or v_job.duration_seconds <= 0 then null
    else greatest(1, ceil(v_job.duration_seconds / 60.0)::integer)
  end;

  insert into private.class_recordings(
    class_id,
    created_by,
    title,
    description,
    drive_file_id,
    recorded_at,
    duration_minutes,
    is_published
  )
  values(
    v_job.class_id,
    auth.uid(),
    v_title,
    v_description,
    p_drive_file_id,
    coalesce(v_job.started_at, v_job.created_at),
    v_duration_minutes,
    coalesce(p_is_published,true)
  )
  returning id into v_id;

  update private.live_recording_jobs
  set
    status='imported',
    imported_recording_id=v_id,
    source_url=null,
    updated_at=now()
  where id=p_job_id;

  return v_id;
end
$$;

revoke all on function public.get_live_recording_jobs(uuid,integer) from public,anon;
grant execute on function public.get_live_recording_jobs(uuid,integer) to authenticated;

revoke all on function public.create_class_recording_from_live_job(uuid,text,text,text,boolean) from public,anon;
grant execute on function public.create_class_recording_from_live_job(uuid,text,text,text,boolean) to authenticated;
