-- KOJAC LIVE — RECORDING INBOX
-- Production version: 20260921171339
-- ALREADY APPLIED TO PRODUCTION. DO NOT REPLAY MANUALLY.

create or replace function public.get_my_live_recording_jobs(
  p_limit integer default 30
)
returns table (
  job_id uuid,
  live_session_id uuid,
  class_id uuid,
  class_name text,
  class_code text,
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
  v_limit integer := greatest(1, least(coalesce(p_limit,30),100));
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  return query
  select
    j.id,
    j.live_session_id,
    j.class_id,
    c.name,
    c.code,
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
  join public.classes c on c.id=j.class_id
  where private.live_classroom_can_moderate_class(j.class_id)
  order by j.created_at desc
  limit v_limit;
end
$$;

revoke all on function public.get_my_live_recording_jobs(integer) from public,anon;
grant execute on function public.get_my_live_recording_jobs(integer) to authenticated;
