create or replace function public.get_manageable_class_recordings(
  p_class_id uuid
)
returns table(
  recording_id uuid,
  class_id uuid,
  class_code text,
  class_name text,
  program_name text,
  title text,
  description text,
  created_by uuid,
  uploader_display_name text,
  recorded_at timestamptz,
  duration_minutes integer,
  is_published boolean,
  has_drive_source boolean,
  has_media_source boolean,
  media_mime_type text,
  media_size_bytes bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not private.recording_can_manage_class(p_class_id) then
    raise exception 'recording_manage_access_denied';
  end if;

  return query
  select
    r.id,
    r.class_id,
    c.code,
    c.name,
    pr.name,
    r.title,
    r.description,
    r.created_by,
    case
      when r.created_by is null then null
      else coalesce(
        nullif(btrim(up.full_name), ''),
        nullif(btrim(up.nickname), ''),
        'Pengguna KOJAC'
      )
    end,
    r.recorded_at,
    r.duration_minutes,
    r.is_published,
    r.drive_file_id is not null,
    r.media_object_key is not null,
    r.media_mime_type,
    r.media_size_bytes,
    r.created_at,
    r.updated_at
  from private.class_recordings r
  join public.classes c on c.id = r.class_id
  left join public.programs pr on pr.id = c.program_id
  left join public.profiles up on up.user_id = r.created_by
  where r.class_id = p_class_id
  order by r.recorded_at desc, r.created_at desc;
end
$function$;

revoke execute on function public.get_manageable_class_recordings(uuid) from PUBLIC;
revoke execute on function public.get_manageable_class_recordings(uuid) from anon;
revoke execute on function public.get_manageable_class_recordings(uuid) from service_role;
grant execute on function public.get_manageable_class_recordings(uuid) to authenticated;
