-- KOJAC Recording Media Source — R2 foundation
-- DO NOT auto-apply. Review and apply manually after R2 configuration is ready.

alter table private.class_recordings
  add column if not exists media_object_key text,
  add column if not exists media_mime_type text,
  add column if not exists media_size_bytes bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='private.class_recordings'::regclass
      and conname='class_recordings_media_object_key_check'
  ) then
    alter table private.class_recordings
      add constraint class_recordings_media_object_key_check check (
        media_object_key is null
        or (
          octet_length(media_object_key) between 1 and 1024
          and media_object_key = btrim(media_object_key)
          and media_object_key !~ '^/'
          and media_object_key !~ '/$'
          and position('//' in media_object_key)=0
          and media_object_key !~ '(^|/)\.\.?(/|$)'
          and media_object_key !~ '[\\\r\n]'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid='private.class_recordings'::regclass
      and conname='class_recordings_media_mime_type_check'
  ) then
    alter table private.class_recordings
      add constraint class_recordings_media_mime_type_check check (
        media_mime_type is null
        or media_mime_type ~ '^video/[A-Za-z0-9.+_-]{1,80}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid='private.class_recordings'::regclass
      and conname='class_recordings_media_size_bytes_check'
  ) then
    alter table private.class_recordings
      add constraint class_recordings_media_size_bytes_check check (
        media_size_bytes is null or media_size_bytes > 0
      );
  end if;
end
$$;

create or replace function private.get_recording_playback_locator(
  p_recording_id uuid
)
returns table(
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
  v_role text;
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

  select ur.role::text into v_role
  from public.user_roles ur
  where ur.user_id=auth.uid();

  if v_role='siswa' then
    if not v_record.is_published or not exists(
      select 1
      from public.class_enrollments e
      where e.user_id=auth.uid()
        and e.class_id=v_record.class_id
        and e.status::text <> 'cancelled'
    ) then
      raise exception 'recording_access_denied';
    end if;
  elsif not private.classroom_can_teach_class(v_record.class_id,null) then
    raise exception 'recording_access_denied';
  end if;

  if v_record.media_object_key is null then
    return;
  end if;

  return query
  select
    v_record.media_object_key,
    v_record.media_mime_type,
    v_record.media_size_bytes;
end
$$;

create or replace function public.get_recording_playback_locator(
  p_recording_id uuid
)
returns table(
  media_object_key text,
  media_mime_type text,
  media_size_bytes bigint
)
language sql
stable
security invoker
set search_path=pg_catalog,public,private
as $$
  select * from private.get_recording_playback_locator(p_recording_id)
$$;

create or replace function private.set_class_recording_media_object(
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

  if not private.classroom_can_teach_class(v_class_id,null) then
    raise exception 'teacher_class_access_denied';
  end if;

  if coalesce(btrim(p_media_object_key),'')='' then
    raise exception 'recording_media_object_key_required';
  end if;

  if coalesce(p_media_mime_type,'') !~ '^video/[A-Za-z0-9.+_-]{1,80}$' then
    raise exception 'recording_media_mime_type_invalid';
  end if;

  if p_media_size_bytes is null or p_media_size_bytes <= 0 then
    raise exception 'recording_media_size_invalid';
  end if;

  update private.class_recordings
  set
    media_object_key=btrim(p_media_object_key),
    media_mime_type=p_media_mime_type,
    media_size_bytes=p_media_size_bytes,
    updated_at=now()
  where id=p_recording_id;
end
$$;

create or replace function public.set_class_recording_media_object(
  p_recording_id uuid,
  p_media_object_key text,
  p_media_mime_type text,
  p_media_size_bytes bigint
)
returns void
language sql
security invoker
set search_path=pg_catalog,public,private
as $$
  select private.set_class_recording_media_object(
    p_recording_id,
    p_media_object_key,
    p_media_mime_type,
    p_media_size_bytes
  )
$$;

revoke all on function private.get_recording_playback_locator(uuid) from public,anon;
revoke all on function private.set_class_recording_media_object(uuid,text,text,bigint) from public,anon;
revoke all on function public.get_recording_playback_locator(uuid) from public,anon;
revoke all on function public.set_class_recording_media_object(uuid,text,text,bigint) from public,anon;

grant execute on function private.get_recording_playback_locator(uuid) to authenticated;
grant execute on function private.set_class_recording_media_object(uuid,text,text,bigint) to authenticated;
grant execute on function public.get_recording_playback_locator(uuid) to authenticated;
grant execute on function public.set_class_recording_media_object(uuid,text,text,bigint) to authenticated;
