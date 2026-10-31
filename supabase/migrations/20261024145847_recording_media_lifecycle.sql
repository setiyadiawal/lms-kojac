-- KOJAC LMS — Phase 3E.1 media lifecycle foundation.
-- Local implementation only. Do not apply to production until separately approved.

create table if not exists private.recording_media_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid,
  class_id uuid not null,
  object_key text not null,
  reason text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  not_before timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recording_media_cleanup_jobs_reason_check
    check (reason in ('replace_old_media','delete_recording_media','candidate_cleanup')),
  constraint recording_media_cleanup_jobs_status_check
    check (status in ('pending','completed')),
  constraint recording_media_cleanup_jobs_attempt_count_check
    check (attempt_count >= 0),
  constraint recording_media_cleanup_jobs_object_key_check
    check (
      octet_length(object_key) between 1 and 1024
      and object_key = btrim(object_key)
      and object_key ~ '^recordings/[0-9A-Fa-f-]{36}/source-[0-9A-Fa-f-]{36}[.]mp4$'
    ),
  constraint recording_media_cleanup_jobs_completed_state_check
    check (
      (status = 'completed' and completed_at is not null)
      or (status = 'pending' and completed_at is null)
    )
);

create unique index if not exists recording_media_cleanup_jobs_object_key_uidx
  on private.recording_media_cleanup_jobs(object_key);

create index if not exists recording_media_cleanup_jobs_pending_idx
  on private.recording_media_cleanup_jobs(status, not_before, created_at)
  where status = 'pending';

alter table private.recording_media_cleanup_jobs enable row level security;

revoke all on table private.recording_media_cleanup_jobs from public;
revoke all on table private.recording_media_cleanup_jobs from anon;
revoke all on table private.recording_media_cleanup_jobs from authenticated;
revoke all on table private.recording_media_cleanup_jobs from service_role;

create or replace function private.recording_media_object_key_valid(
  p_recording_id uuid,
  p_object_key text
)
returns boolean
language sql
immutable
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select p_recording_id is not null
    and p_object_key is not null
    and p_object_key ~ (
      '^recordings/' || p_recording_id::text ||
      '/source-[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}[.]mp4$'
    )
$function$;

create or replace function private.enqueue_recording_media_cleanup(
  p_recording_id uuid,
  p_class_id uuid,
  p_object_key text,
  p_reason text,
  p_not_before timestamptz
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_id uuid;
  v_not_before timestamptz := coalesce(p_not_before, now());
begin
  if p_class_id is null then
    raise exception 'recording_cleanup_class_required';
  end if;

  if p_reason not in ('replace_old_media','delete_recording_media','candidate_cleanup') then
    raise exception 'recording_cleanup_reason_invalid';
  end if;

  if not private.recording_media_object_key_valid(p_recording_id, p_object_key) then
    raise exception 'recording_cleanup_object_key_invalid';
  end if;

  insert into private.recording_media_cleanup_jobs as existing(
    recording_id,
    class_id,
    object_key,
    reason,
    status,
    attempt_count,
    last_error,
    not_before,
    completed_at,
    created_at,
    updated_at
  ) values (
    p_recording_id,
    p_class_id,
    p_object_key,
    p_reason,
    'pending',
    0,
    null,
    v_not_before,
    null,
    now(),
    now()
  )
  on conflict (object_key) do update
  set
    recording_id = excluded.recording_id,
    class_id = excluded.class_id,
    reason = case
      when existing.reason = 'replace_old_media'
        or excluded.reason = 'replace_old_media'
        then 'replace_old_media'
      when existing.reason = 'delete_recording_media'
        or excluded.reason = 'delete_recording_media'
        then 'delete_recording_media'
      else 'candidate_cleanup'
    end,
    status = 'pending',
    completed_at = null,
    last_error = null,
    not_before = greatest(
      existing.not_before,
      excluded.not_before
    ),
    updated_at = now()
  returning existing.id into v_id;

  return v_id;
end
$function$;

create or replace function private.get_class_recording_lifecycle_context(
  p_recording_id uuid
)
returns table(
  recording_id uuid,
  class_id uuid,
  is_published boolean,
  has_drive_source boolean,
  has_media_source boolean,
  media_mime_type text,
  media_size_bytes bigint,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_record private.class_recordings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select * into v_record
  from private.class_recordings r
  where r.id = p_recording_id;

  if v_record.id is null then
    raise exception 'recording_not_found';
  end if;

  if not private.recording_can_manage_class(v_record.class_id) then
    raise exception 'recording_manage_access_denied';
  end if;

  return query
  select
    v_record.id,
    v_record.class_id,
    v_record.is_published,
    v_record.drive_file_id is not null,
    v_record.media_object_key is not null,
    v_record.media_mime_type,
    v_record.media_size_bytes,
    v_record.updated_at;
end
$function$;

create or replace function public.get_class_recording_lifecycle_context(
  p_recording_id uuid
)
returns table(
  recording_id uuid,
  class_id uuid,
  is_published boolean,
  has_drive_source boolean,
  has_media_source boolean,
  media_mime_type text,
  media_size_bytes bigint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select *
  from private.get_class_recording_lifecycle_context(p_recording_id)
$function$;

revoke execute on function public.get_class_recording_lifecycle_context(uuid) from public;
revoke execute on function public.get_class_recording_lifecycle_context(uuid) from anon;
revoke execute on function public.get_class_recording_lifecycle_context(uuid) from service_role;
grant execute on function public.get_class_recording_lifecycle_context(uuid) to authenticated;

create or replace function private.is_recording_media_object_authoritative_verified(
  p_object_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if p_object_key is null
     or p_object_key !~ '^recordings/[0-9A-Fa-f-]{36}/source-[0-9A-Fa-f-]{36}[.]mp4$' then
    raise exception 'recording_media_object_key_invalid';
  end if;

  return exists (
    select 1
    from private.class_recordings r
    where r.media_object_key = p_object_key
  );
end
$function$;

create or replace function public.is_recording_media_object_authoritative_verified(
  p_object_key text
)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select private.is_recording_media_object_authoritative_verified(p_object_key)
$function$;

revoke execute on function public.is_recording_media_object_authoritative_verified(text) from public;
revoke execute on function public.is_recording_media_object_authoritative_verified(text) from anon;
revoke execute on function public.is_recording_media_object_authoritative_verified(text) from authenticated;
grant execute on function public.is_recording_media_object_authoritative_verified(text) to service_role;

create or replace function private.commit_class_recording_media_replacement_verified(
  p_recording_id uuid,
  p_expected_updated_at timestamptz,
  p_expected_has_drive_source boolean,
  p_expected_has_media_source boolean,
  p_new_media_object_key text,
  p_new_media_mime_type text,
  p_new_media_size_bytes bigint
)
returns table(
  cleanup_job_id uuid,
  cleanup_not_before timestamptz,
  already_committed boolean
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_record private.class_recordings%rowtype;
  v_old_media_object_key text;
  v_cleanup_id uuid;
  v_cleanup_not_before timestamptz;
begin
  select * into v_record
  from private.class_recordings r
  where r.id = p_recording_id
  for update;

  if v_record.id is null then
    raise exception 'recording_not_found';
  end if;

  if v_record.is_published then
    raise exception 'recording_must_be_unpublished_for_replace';
  end if;

  if p_new_media_mime_type <> 'video/mp4' then
    raise exception 'recording_media_mime_type_invalid';
  end if;

  if p_new_media_size_bytes is null or p_new_media_size_bytes <= 0 then
    raise exception 'recording_media_size_invalid';
  end if;

  if not private.recording_media_object_key_valid(
    p_recording_id,
    p_new_media_object_key
  ) then
    raise exception 'recording_media_object_key_invalid';
  end if;

  -- Idempotent retry after a successful verified swap.
  if v_record.media_object_key = p_new_media_object_key then
    if v_record.media_mime_type = p_new_media_mime_type
       and v_record.media_size_bytes = p_new_media_size_bytes then
      select j.id, j.not_before
      into v_cleanup_id, v_cleanup_not_before
      from private.recording_media_cleanup_jobs j
      where j.recording_id = p_recording_id
        and j.reason = 'replace_old_media'
        and j.object_key <> p_new_media_object_key
      order by j.updated_at desc, j.created_at desc
      limit 1;

      return query
      select v_cleanup_id, v_cleanup_not_before, true;
      return;
    end if;

    raise exception 'recording_attached_media_metadata_mismatch';
  end if;

  if v_record.drive_file_id is null and v_record.media_object_key is null then
    raise exception 'recording_source_required_for_replace';
  end if;

  if p_expected_updated_at is null
     or p_expected_has_drive_source is null
     or p_expected_has_media_source is null then
    raise exception 'recording_replace_expected_state_required';
  end if;

  if v_record.updated_at is distinct from p_expected_updated_at
     or (v_record.drive_file_id is not null) is distinct from p_expected_has_drive_source
     or (v_record.media_object_key is not null) is distinct from p_expected_has_media_source then
    raise exception 'recording_replace_state_changed';
  end if;

  v_old_media_object_key := v_record.media_object_key;

  update private.class_recordings
  set
    media_object_key = p_new_media_object_key,
    media_mime_type = p_new_media_mime_type,
    media_size_bytes = p_new_media_size_bytes,
    updated_at = now()
  where id = p_recording_id;

  if v_old_media_object_key is not null
     and v_old_media_object_key <> p_new_media_object_key then
    v_cleanup_not_before := now() + interval '7 hours';
    v_cleanup_id := private.enqueue_recording_media_cleanup(
      p_recording_id,
      v_record.class_id,
      v_old_media_object_key,
      'replace_old_media',
      v_cleanup_not_before
    );
  end if;

  return query
  select v_cleanup_id, v_cleanup_not_before, false;
end
$function$;

create or replace function public.commit_class_recording_media_replacement_verified(
  p_recording_id uuid,
  p_expected_updated_at timestamptz,
  p_expected_has_drive_source boolean,
  p_expected_has_media_source boolean,
  p_new_media_object_key text,
  p_new_media_mime_type text,
  p_new_media_size_bytes bigint
)
returns table(
  cleanup_job_id uuid,
  cleanup_not_before timestamptz,
  already_committed boolean
)
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select *
  from private.commit_class_recording_media_replacement_verified(
    p_recording_id,
    p_expected_updated_at,
    p_expected_has_drive_source,
    p_expected_has_media_source,
    p_new_media_object_key,
    p_new_media_mime_type,
    p_new_media_size_bytes
  )
$function$;

revoke execute on function public.commit_class_recording_media_replacement_verified(uuid,timestamptz,boolean,boolean,text,text,bigint) from public;
revoke execute on function public.commit_class_recording_media_replacement_verified(uuid,timestamptz,boolean,boolean,text,text,bigint) from anon;
revoke execute on function public.commit_class_recording_media_replacement_verified(uuid,timestamptz,boolean,boolean,text,text,bigint) from authenticated;
grant execute on function public.commit_class_recording_media_replacement_verified(uuid,timestamptz,boolean,boolean,text,text,bigint) to service_role;

create or replace function private.delete_class_recording_lifecycle_verified(
  p_recording_id uuid,
  p_expected_updated_at timestamptz,
  p_expected_has_drive_source boolean,
  p_expected_has_media_source boolean
)
returns table(
  cleanup_job_id uuid,
  cleanup_required boolean,
  source_type text
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_record private.class_recordings%rowtype;
  v_cleanup_id uuid;
  v_source_type text;
begin
  select * into v_record
  from private.class_recordings r
  where r.id = p_recording_id
  for update;

  if v_record.id is null then
    raise exception 'recording_not_found';
  end if;

  if v_record.is_published then
    raise exception 'recording_must_be_unpublished_for_delete';
  end if;

  if p_expected_updated_at is null
     or p_expected_has_drive_source is null
     or p_expected_has_media_source is null then
    raise exception 'recording_delete_expected_state_required';
  end if;

  if v_record.updated_at is distinct from p_expected_updated_at
     or (v_record.drive_file_id is not null) is distinct from p_expected_has_drive_source
     or (v_record.media_object_key is not null) is distinct from p_expected_has_media_source then
    raise exception 'recording_delete_state_changed';
  end if;

  v_source_type := case
    when v_record.media_object_key is not null then
      case when v_record.drive_file_id is not null then 'dual' else 'r2' end
    when v_record.drive_file_id is not null then 'drive'
    else 'draft'
  end;

  if v_record.media_object_key is not null then
    v_cleanup_id := private.enqueue_recording_media_cleanup(
      v_record.id,
      v_record.class_id,
      v_record.media_object_key,
      'delete_recording_media',
      now()
    );
  end if;

  delete from private.class_recordings r
  where r.id = p_recording_id;

  return query
  select v_cleanup_id, v_cleanup_id is not null, v_source_type;
end
$function$;

create or replace function public.delete_class_recording_lifecycle_verified(
  p_recording_id uuid,
  p_expected_updated_at timestamptz,
  p_expected_has_drive_source boolean,
  p_expected_has_media_source boolean
)
returns table(
  cleanup_job_id uuid,
  cleanup_required boolean,
  source_type text
)
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select *
  from private.delete_class_recording_lifecycle_verified(
    p_recording_id,
    p_expected_updated_at,
    p_expected_has_drive_source,
    p_expected_has_media_source
  )
$function$;

revoke execute on function public.delete_class_recording_lifecycle_verified(uuid,timestamptz,boolean,boolean) from public;
revoke execute on function public.delete_class_recording_lifecycle_verified(uuid,timestamptz,boolean,boolean) from anon;
revoke execute on function public.delete_class_recording_lifecycle_verified(uuid,timestamptz,boolean,boolean) from authenticated;
grant execute on function public.delete_class_recording_lifecycle_verified(uuid,timestamptz,boolean,boolean) to service_role;

create or replace function private.authorize_recording_media_cleanup(
  p_cleanup_job_id uuid
)
returns table(
  cleanup_job_id uuid,
  class_id uuid,
  reason text,
  status text,
  attempt_count integer,
  not_before timestamptz,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_job private.recording_media_cleanup_jobs%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select * into v_job
  from private.recording_media_cleanup_jobs j
  where j.id = p_cleanup_job_id;

  if v_job.id is null then
    raise exception 'recording_cleanup_job_not_found';
  end if;

  if not private.recording_can_manage_class(v_job.class_id) then
    raise exception 'recording_manage_access_denied';
  end if;

  return query
  select
    v_job.id,
    v_job.class_id,
    v_job.reason,
    v_job.status,
    v_job.attempt_count,
    v_job.not_before,
    v_job.completed_at;
end
$function$;

create or replace function public.authorize_recording_media_cleanup(
  p_cleanup_job_id uuid
)
returns table(
  cleanup_job_id uuid,
  class_id uuid,
  reason text,
  status text,
  attempt_count integer,
  not_before timestamptz,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select *
  from private.authorize_recording_media_cleanup(p_cleanup_job_id)
$function$;

revoke execute on function public.authorize_recording_media_cleanup(uuid) from public;
revoke execute on function public.authorize_recording_media_cleanup(uuid) from anon;
revoke execute on function public.authorize_recording_media_cleanup(uuid) from service_role;
grant execute on function public.authorize_recording_media_cleanup(uuid) to authenticated;


create or replace function private.get_due_recording_media_cleanup_jobs(
  p_limit integer default 5
)
returns table(
  cleanup_job_id uuid
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 20));
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  return query
  select j.id
  from private.recording_media_cleanup_jobs j
  where j.status = 'pending'
    and j.not_before <= now()
    and private.recording_can_manage_class(j.class_id)
  order by j.not_before asc, j.created_at asc
  limit v_limit;
end
$function$;

create or replace function public.get_due_recording_media_cleanup_jobs(
  p_limit integer default 5
)
returns table(
  cleanup_job_id uuid
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select *
  from private.get_due_recording_media_cleanup_jobs(p_limit)
$function$;

revoke execute on function public.get_due_recording_media_cleanup_jobs(integer) from public;
revoke execute on function public.get_due_recording_media_cleanup_jobs(integer) from anon;
revoke execute on function public.get_due_recording_media_cleanup_jobs(integer) from service_role;
grant execute on function public.get_due_recording_media_cleanup_jobs(integer) to authenticated;

create or replace function private.enqueue_recording_media_candidate_cleanup(
  p_recording_id uuid,
  p_class_id uuid,
  p_object_key text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if not private.recording_media_object_key_valid(p_recording_id, p_object_key) then
    raise exception 'recording_cleanup_object_key_invalid';
  end if;

  if exists (
    select 1
    from private.class_recordings r
    where r.media_object_key = p_object_key
  ) then
    raise exception 'recording_cleanup_object_authoritative';
  end if;

  if not exists (
    select 1
    from public.classes c
    where c.id = p_class_id
  ) then
    raise exception 'class_not_found';
  end if;

  return private.enqueue_recording_media_cleanup(
    p_recording_id,
    p_class_id,
    p_object_key,
    'candidate_cleanup',
    now()
  );
end
$function$;

create or replace function public.enqueue_recording_media_candidate_cleanup(
  p_recording_id uuid,
  p_class_id uuid,
  p_object_key text
)
returns uuid
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select private.enqueue_recording_media_candidate_cleanup(
    p_recording_id,
    p_class_id,
    p_object_key
  )
$function$;

revoke execute on function public.enqueue_recording_media_candidate_cleanup(uuid,uuid,text) from public;
revoke execute on function public.enqueue_recording_media_candidate_cleanup(uuid,uuid,text) from anon;
revoke execute on function public.enqueue_recording_media_candidate_cleanup(uuid,uuid,text) from authenticated;
grant execute on function public.enqueue_recording_media_candidate_cleanup(uuid,uuid,text) to service_role;

create or replace function private.claim_recording_media_cleanup(
  p_cleanup_job_id uuid
)
returns table(
  cleanup_job_id uuid,
  object_key text,
  reason text,
  attempt_count integer
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_job private.recording_media_cleanup_jobs%rowtype;
begin
  select * into v_job
  from private.recording_media_cleanup_jobs j
  where j.id = p_cleanup_job_id
  for update;

  if v_job.id is null then
    raise exception 'recording_cleanup_job_not_found';
  end if;

  if v_job.status = 'completed' then
    return query
    select v_job.id, null::text, v_job.reason, v_job.attempt_count;
    return;
  end if;

  if v_job.not_before > now() then
    raise exception 'recording_cleanup_not_ready';
  end if;

  if exists (
    select 1
    from private.class_recordings r
    where r.media_object_key = v_job.object_key
  ) then
    raise exception 'recording_cleanup_object_authoritative';
  end if;

  update private.recording_media_cleanup_jobs j
  set
    attempt_count = j.attempt_count + 1,
    last_error = null,
    not_before = now() + interval '5 minutes',
    updated_at = now()
  where j.id = v_job.id
  returning j.attempt_count into v_job.attempt_count;

  return query
  select v_job.id, v_job.object_key, v_job.reason, v_job.attempt_count;
end
$function$;

create or replace function public.claim_recording_media_cleanup(
  p_cleanup_job_id uuid
)
returns table(
  cleanup_job_id uuid,
  object_key text,
  reason text,
  attempt_count integer
)
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select *
  from private.claim_recording_media_cleanup(p_cleanup_job_id)
$function$;

revoke execute on function public.claim_recording_media_cleanup(uuid) from public;
revoke execute on function public.claim_recording_media_cleanup(uuid) from anon;
revoke execute on function public.claim_recording_media_cleanup(uuid) from authenticated;
grant execute on function public.claim_recording_media_cleanup(uuid) to service_role;

create or replace function private.complete_recording_media_cleanup(
  p_cleanup_job_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  update private.recording_media_cleanup_jobs j
  set
    status = 'completed',
    completed_at = coalesce(j.completed_at, now()),
    last_error = null,
    updated_at = now()
  where j.id = p_cleanup_job_id;

  if not found then
    raise exception 'recording_cleanup_job_not_found';
  end if;
end
$function$;

create or replace function public.complete_recording_media_cleanup(
  p_cleanup_job_id uuid
)
returns void
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select private.complete_recording_media_cleanup(p_cleanup_job_id)
$function$;

revoke execute on function public.complete_recording_media_cleanup(uuid) from public;
revoke execute on function public.complete_recording_media_cleanup(uuid) from anon;
revoke execute on function public.complete_recording_media_cleanup(uuid) from authenticated;
grant execute on function public.complete_recording_media_cleanup(uuid) to service_role;

create or replace function private.fail_recording_media_cleanup(
  p_cleanup_job_id uuid,
  p_last_error text
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  update private.recording_media_cleanup_jobs j
  set
    status = 'pending',
    completed_at = null,
    last_error = left(coalesce(nullif(btrim(p_last_error), ''), 'cleanup_failed'), 1000),
    not_before = now() + interval '5 minutes',
    updated_at = now()
  where j.id = p_cleanup_job_id;

  if not found then
    raise exception 'recording_cleanup_job_not_found';
  end if;
end
$function$;

create or replace function public.fail_recording_media_cleanup(
  p_cleanup_job_id uuid,
  p_last_error text
)
returns void
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select private.fail_recording_media_cleanup(p_cleanup_job_id, p_last_error)
$function$;

revoke execute on function public.fail_recording_media_cleanup(uuid,text) from public;
revoke execute on function public.fail_recording_media_cleanup(uuid,text) from anon;
revoke execute on function public.fail_recording_media_cleanup(uuid,text) from authenticated;
grant execute on function public.fail_recording_media_cleanup(uuid,text) to service_role;

-- Harden the legacy DB-only delete path. It remains available for compatibility,
-- but can no longer bypass the Phase 3E publication/authorization policy and
-- still refuses R2-backed rows because external cleanup is required.
create or replace function private.delete_class_recording(
  p_recording_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_record private.class_recordings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select * into v_record
  from private.class_recordings r
  where r.id = p_recording_id
  for update;

  if v_record.id is null then
    raise exception 'recording_not_found';
  end if;

  if not private.recording_can_manage_class(v_record.class_id) then
    raise exception 'recording_manage_access_denied';
  end if;

  if v_record.is_published then
    raise exception 'recording_must_be_unpublished_for_delete';
  end if;

  if v_record.media_object_key is not null then
    raise exception 'recording_r2_delete_requires_media_cleanup';
  end if;

  delete from private.class_recordings r
  where r.id = p_recording_id;
end
$function$;

revoke execute on function private.recording_media_object_key_valid(uuid,text) from public, anon, authenticated, service_role;
revoke execute on function private.enqueue_recording_media_cleanup(uuid,uuid,text,text,timestamptz) from public, anon, authenticated, service_role;
revoke execute on function private.get_class_recording_lifecycle_context(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.is_recording_media_object_authoritative_verified(text) from public, anon, authenticated, service_role;
revoke execute on function private.commit_class_recording_media_replacement_verified(uuid,timestamptz,boolean,boolean,text,text,bigint) from public, anon, authenticated, service_role;
revoke execute on function private.delete_class_recording_lifecycle_verified(uuid,timestamptz,boolean,boolean) from public, anon, authenticated, service_role;
revoke execute on function private.authorize_recording_media_cleanup(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.get_due_recording_media_cleanup_jobs(integer) from public, anon, authenticated, service_role;
revoke execute on function private.enqueue_recording_media_candidate_cleanup(uuid,uuid,text) from public, anon, authenticated, service_role;
revoke execute on function private.claim_recording_media_cleanup(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.complete_recording_media_cleanup(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.fail_recording_media_cleanup(uuid,text) from public, anon, authenticated, service_role;
