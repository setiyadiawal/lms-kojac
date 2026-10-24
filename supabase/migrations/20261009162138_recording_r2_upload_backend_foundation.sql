-- KOJAC Recording Upload & Management — Phase 3B.1 backend foundation
-- LOCAL IMPLEMENTATION ONLY.
-- DO NOT auto-apply. Review before any production migration/deployment.

-- ---------------------------------------------------------------------------
-- 1. Allow R2-only drafts/recordings while preserving legacy Drive rows.
-- ---------------------------------------------------------------------------
alter table private.class_recordings
  alter column drive_file_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='private.class_recordings'::regclass
      and conname='class_recordings_published_source_required_check'
  ) then
    alter table private.class_recordings
      add constraint class_recordings_published_source_required_check check (
        not is_published
        or media_object_key is not null
        or drive_file_id is not null
      );
  end if;
end
$$;

create unique index if not exists class_recordings_media_object_key_uidx
  on private.class_recordings(media_object_key)
  where media_object_key is not null;

-- ---------------------------------------------------------------------------
-- 1A. Harden legacy Drive-era mutation RPCs for R2-backed recordings.
--     Preserve the existing authorization and Drive-only behavior.
-- ---------------------------------------------------------------------------
create or replace function private.update_class_recording(
  p_recording_id uuid,
  p_title text,
  p_description text,
  p_drive_file_id text,
  p_recorded_at timestamptz,
  p_duration_minutes integer,
  p_is_published boolean
)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_class_id uuid;
  v_media_object_key text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select class_id, media_object_key
  into v_class_id, v_media_object_key
  from private.class_recordings
  where id=p_recording_id
  for update;

  if v_class_id is null then raise exception 'recording_not_found'; end if;
  if not private.classroom_can_teach_class(v_class_id,null) then
    raise exception 'teacher_class_access_denied';
  end if;

  if v_media_object_key is not null then
    raise exception 'recording_r2_update_requires_metadata_rpc';
  end if;

  if char_length(btrim(coalesce(p_title,''))) not between 1 and 160 then
    raise exception 'recording_title_invalid';
  end if;
  if char_length(coalesce(p_description,'')) > 5000 then
    raise exception 'recording_description_too_long';
  end if;
  if coalesce(p_drive_file_id,'') !~ '^[A-Za-z0-9_-]{10,200}$' then
    raise exception 'recording_drive_file_id_invalid';
  end if;
  if p_recorded_at is null then raise exception 'recording_date_required'; end if;
  if p_duration_minutes is not null and (p_duration_minutes < 1 or p_duration_minutes > 1440) then
    raise exception 'recording_duration_invalid';
  end if;

  update private.class_recordings
  set
    title=btrim(p_title),
    description=coalesce(p_description,''),
    drive_file_id=p_drive_file_id,
    recorded_at=p_recorded_at,
    duration_minutes=p_duration_minutes,
    is_published=coalesce(p_is_published,false),
    updated_at=now()
  where id=p_recording_id;
end
$$;

create or replace function private.delete_class_recording(p_recording_id uuid)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_class_id uuid;
  v_media_object_key text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select class_id, media_object_key
  into v_class_id, v_media_object_key
  from private.class_recordings
  where id=p_recording_id
  for update;

  if v_class_id is null then raise exception 'recording_not_found'; end if;
  if not private.classroom_can_teach_class(v_class_id,null) then
    raise exception 'teacher_class_access_denied';
  end if;

  if v_media_object_key is not null then
    raise exception 'recording_r2_delete_requires_media_cleanup';
  end if;

  delete from private.class_recordings where id=p_recording_id;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Dedicated recording-management authorization.
--    Do not weaken generic classroom authorization.
-- ---------------------------------------------------------------------------
create or replace function private.recording_can_manage_class(
  p_class_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=pg_catalog,public,private
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.classes c
      where c.id=p_class_id
    )
    and (
      private.classroom_is_management()
      or private.classroom_can_teach_class(p_class_id,null)
    )
$$;

revoke all on function private.recording_can_manage_class(uuid) from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- 3. R2 draft lifecycle RPCs.
-- ---------------------------------------------------------------------------
create or replace function private.create_class_recording_draft(
  p_class_id uuid,
  p_title text,
  p_description text,
  p_recorded_at timestamptz,
  p_duration_minutes integer default null
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not private.recording_can_manage_class(p_class_id) then
    raise exception 'recording_manage_access_denied';
  end if;

  if char_length(btrim(coalesce(p_title,''))) not between 1 and 160 then
    raise exception 'recording_title_invalid';
  end if;

  if char_length(coalesce(p_description,'')) > 5000 then
    raise exception 'recording_description_too_long';
  end if;

  if p_recorded_at is null then
    raise exception 'recording_date_required';
  end if;

  if p_duration_minutes is not null
     and (p_duration_minutes < 1 or p_duration_minutes > 1440) then
    raise exception 'recording_duration_invalid';
  end if;

  insert into private.class_recordings(
    class_id,
    created_by,
    title,
    description,
    drive_file_id,
    recorded_at,
    duration_minutes,
    is_published,
    media_object_key,
    media_mime_type,
    media_size_bytes
  )
  values(
    p_class_id,
    auth.uid(),
    btrim(p_title),
    coalesce(p_description,''),
    null,
    p_recorded_at,
    p_duration_minutes,
    false,
    null,
    null,
    null
  )
  returning id into v_id;

  return v_id;
end
$$;

create or replace function public.create_class_recording_draft(
  p_class_id uuid,
  p_title text,
  p_description text,
  p_recorded_at timestamptz,
  p_duration_minutes integer default null
)
returns uuid
language sql
security definer
set search_path=pg_catalog,public,private
as $$
  select private.create_class_recording_draft(
    p_class_id,
    p_title,
    p_description,
    p_recorded_at,
    p_duration_minutes
  )
$$;

create or replace function private.update_class_recording_metadata(
  p_recording_id uuid,
  p_title text,
  p_description text,
  p_recorded_at timestamptz,
  p_duration_minutes integer
)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_class_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select class_id into v_class_id
  from private.class_recordings
  where id=p_recording_id;

  if v_class_id is null then
    raise exception 'recording_not_found';
  end if;

  if not private.recording_can_manage_class(v_class_id) then
    raise exception 'recording_manage_access_denied';
  end if;

  if char_length(btrim(coalesce(p_title,''))) not between 1 and 160 then
    raise exception 'recording_title_invalid';
  end if;

  if char_length(coalesce(p_description,'')) > 5000 then
    raise exception 'recording_description_too_long';
  end if;

  if p_recorded_at is null then
    raise exception 'recording_date_required';
  end if;

  if p_duration_minutes is not null
     and (p_duration_minutes < 1 or p_duration_minutes > 1440) then
    raise exception 'recording_duration_invalid';
  end if;

  update private.class_recordings
  set
    title=btrim(p_title),
    description=coalesce(p_description,''),
    recorded_at=p_recorded_at,
    duration_minutes=p_duration_minutes,
    updated_at=now()
  where id=p_recording_id;
end
$$;

create or replace function public.update_class_recording_metadata(
  p_recording_id uuid,
  p_title text,
  p_description text,
  p_recorded_at timestamptz,
  p_duration_minutes integer
)
returns void
language sql
security definer
set search_path=pg_catalog,public,private
as $$
  select private.update_class_recording_metadata(
    p_recording_id,
    p_title,
    p_description,
    p_recorded_at,
    p_duration_minutes
  )
$$;

create or replace function private.set_class_recording_published(
  p_recording_id uuid,
  p_is_published boolean
)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_record private.class_recordings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select * into v_record
  from private.class_recordings
  where id=p_recording_id
  for update;

  if v_record.id is null then
    raise exception 'recording_not_found';
  end if;

  if not private.recording_can_manage_class(v_record.class_id) then
    raise exception 'recording_manage_access_denied';
  end if;

  if p_is_published is null then
    raise exception 'recording_publish_state_required';
  end if;

  if p_is_published
     and v_record.drive_file_id is null
     and v_record.media_object_key is null then
    raise exception 'recording_source_required_before_publish';
  end if;

  update private.class_recordings
  set
    is_published=p_is_published,
    updated_at=now()
  where id=p_recording_id;
end
$$;

create or replace function public.set_class_recording_published(
  p_recording_id uuid,
  p_is_published boolean
)
returns void
language sql
security definer
set search_path=pg_catalog,public,private
as $$
  select private.set_class_recording_published(
    p_recording_id,
    p_is_published
  )
$$;

-- Caller-bound upload authorization/context used by the Edge orchestrator.
create or replace function private.get_class_recording_upload_context(
  p_recording_id uuid
)
returns table(
  recording_id uuid,
  class_id uuid,
  is_published boolean,
  has_drive_source boolean,
  has_media_source boolean,
  media_object_key text,
  media_mime_type text,
  media_size_bytes bigint
)
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_record private.class_recordings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select * into v_record
  from private.class_recordings
  where id=p_recording_id;

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
    v_record.media_object_key,
    v_record.media_mime_type,
    v_record.media_size_bytes;
end
$$;

create or replace function public.get_class_recording_upload_context(
  p_recording_id uuid
)
returns table(
  recording_id uuid,
  class_id uuid,
  is_published boolean,
  has_drive_source boolean,
  has_media_source boolean,
  media_object_key text,
  media_mime_type text,
  media_size_bytes bigint
)
language sql
stable
security definer
set search_path=pg_catalog,public,private
as $$
  select * from private.get_class_recording_upload_context(p_recording_id)
$$;

-- ---------------------------------------------------------------------------
-- 4. Trusted verified media attachment.
--    Browser callers must not be able to assign media_object_key directly.
-- ---------------------------------------------------------------------------
create or replace function private.attach_class_recording_media_verified(
  p_recording_id uuid,
  p_media_object_key text,
  p_media_mime_type text,
  p_media_size_bytes bigint
)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_record private.class_recordings%rowtype;
  v_expected_prefix text;
begin
  select * into v_record
  from private.class_recordings
  where id=p_recording_id
  for update;

  if v_record.id is null then
    raise exception 'recording_not_found';
  end if;

  if v_record.is_published then
    raise exception 'recording_must_be_unpublished_for_media_attach';
  end if;

  if v_record.drive_file_id is not null then
    raise exception 'recording_drive_source_already_exists';
  end if;

  if p_media_mime_type <> 'video/mp4' then
    raise exception 'recording_media_mime_type_invalid';
  end if;

  if p_media_size_bytes is null or p_media_size_bytes <= 0 then
    raise exception 'recording_media_size_invalid';
  end if;

  v_expected_prefix := 'recordings/' || p_recording_id::text || '/source-';

  if p_media_object_key is null
     or left(p_media_object_key,char_length(v_expected_prefix)) <> v_expected_prefix
     or p_media_object_key !~ (
       '^recordings/' || p_recording_id::text ||
       '/source-[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}[.]mp4$'
     ) then
    raise exception 'recording_media_object_key_invalid';
  end if;

  -- Idempotent retry for the exact same verified object.
  if v_record.media_object_key is not null then
    if v_record.media_object_key=p_media_object_key
       and v_record.media_mime_type=p_media_mime_type
       and v_record.media_size_bytes=p_media_size_bytes then
      return;
    end if;

    raise exception 'recording_media_already_attached';
  end if;

  update private.class_recordings
  set
    media_object_key=p_media_object_key,
    media_mime_type=p_media_mime_type,
    media_size_bytes=p_media_size_bytes,
    updated_at=now()
  where id=p_recording_id;
end
$$;

create or replace function public.attach_class_recording_media_verified(
  p_recording_id uuid,
  p_media_object_key text,
  p_media_mime_type text,
  p_media_size_bytes bigint
)
returns void
language sql
security definer
set search_path=pg_catalog,public,private
as $$
  select private.attach_class_recording_media_verified(
    p_recording_id,
    p_media_object_key,
    p_media_mime_type,
    p_media_size_bytes
  )
$$;

-- Supersede the old authenticated media-object setter. It was suitable for the
-- playback foundation but must not remain browser-callable for direct uploads.
revoke execute on function private.set_class_recording_media_object(uuid,text,text,bigint) from authenticated;
revoke execute on function public.set_class_recording_media_object(uuid,text,text,bigint) from authenticated;

-- ---------------------------------------------------------------------------
-- 5. Privileges.
-- ---------------------------------------------------------------------------
revoke all on function private.create_class_recording_draft(uuid,text,text,timestamptz,integer) from public,anon,authenticated;
revoke all on function private.update_class_recording_metadata(uuid,text,text,timestamptz,integer) from public,anon,authenticated;
revoke all on function private.set_class_recording_published(uuid,boolean) from public,anon,authenticated;
revoke all on function private.get_class_recording_upload_context(uuid) from public,anon,authenticated;
revoke all on function private.attach_class_recording_media_verified(uuid,text,text,bigint) from public,anon,authenticated;

revoke all on function public.create_class_recording_draft(uuid,text,text,timestamptz,integer) from public,anon;
revoke all on function public.update_class_recording_metadata(uuid,text,text,timestamptz,integer) from public,anon;
revoke all on function public.set_class_recording_published(uuid,boolean) from public,anon;
revoke all on function public.get_class_recording_upload_context(uuid) from public,anon;
revoke all on function public.attach_class_recording_media_verified(uuid,text,text,bigint) from public,anon,authenticated;

grant execute on function public.create_class_recording_draft(uuid,text,text,timestamptz,integer) to authenticated;
grant execute on function public.update_class_recording_metadata(uuid,text,text,timestamptz,integer) to authenticated;
grant execute on function public.set_class_recording_published(uuid,boolean) to authenticated;
grant execute on function public.get_class_recording_upload_context(uuid) to authenticated;

grant execute on function public.attach_class_recording_media_verified(uuid,text,text,bigint) to service_role;
