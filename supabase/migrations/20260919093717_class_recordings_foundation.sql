-- KOJAC LMS v1.2 — Class Recordings Foundation
-- Production migration version: 20260919093717
-- Already applied to production.

create table private.class_recordings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  drive_file_id text not null,
  recorded_at timestamptz not null,
  duration_minutes integer,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_recordings_title_check check (char_length(btrim(title)) between 1 and 160),
  constraint class_recordings_description_check check (char_length(description) <= 5000),
  constraint class_recordings_drive_file_id_check check (
    drive_file_id ~ '^[A-Za-z0-9_-]{10,200}$'
  ),
  constraint class_recordings_duration_check check (
    duration_minutes is null or duration_minutes between 1 and 1440
  )
);

create index class_recordings_class_recorded_idx
on private.class_recordings(class_id, recorded_at desc);

alter table private.class_recordings enable row level security;
revoke all on private.class_recordings from public, anon, authenticated;

create or replace function private.get_my_class_recordings()
returns table(
  recording_id uuid,
  class_id uuid,
  class_name text,
  class_code text,
  title text,
  description text,
  drive_file_id text,
  recorded_at timestamptz,
  duration_minutes integer
)
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  if not exists(
    select 1 from public.user_roles ur
    where ur.user_id=auth.uid() and ur.role::text='siswa'
  ) then
    raise exception 'student_access_required';
  end if;

  return query
  select
    r.id,
    c.id,
    c.name,
    c.code,
    r.title,
    r.description,
    r.drive_file_id,
    r.recorded_at,
    r.duration_minutes
  from public.class_enrollments e
  join public.classes c on c.id=e.class_id
  join private.class_recordings r on r.class_id=e.class_id
  where e.user_id=auth.uid()
    and e.status::text <> 'cancelled'
    and r.is_published
  order by r.recorded_at desc, r.created_at desc;
end
$$;

create or replace function private.get_teaching_class_recordings(p_class_id uuid)
returns table(
  recording_id uuid,
  class_id uuid,
  class_name text,
  class_code text,
  title text,
  description text,
  drive_file_id text,
  recorded_at timestamptz,
  duration_minutes integer,
  is_published boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.classroom_can_teach_class(p_class_id,null) then
    raise exception 'teacher_class_access_denied';
  end if;

  return query
  select
    r.id,c.id,c.name,c.code,r.title,r.description,r.drive_file_id,
    r.recorded_at,r.duration_minutes,r.is_published,r.created_at,r.updated_at
  from private.class_recordings r
  join public.classes c on c.id=r.class_id
  where r.class_id=p_class_id
  order by r.recorded_at desc,r.created_at desc;
end
$$;

create or replace function private.create_class_recording(
  p_class_id uuid,
  p_title text,
  p_description text,
  p_drive_file_id text,
  p_recorded_at timestamptz,
  p_duration_minutes integer default null,
  p_is_published boolean default true
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.classroom_can_teach_class(p_class_id,null) then
    raise exception 'teacher_class_access_denied';
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

  insert into private.class_recordings(
    class_id,created_by,title,description,drive_file_id,recorded_at,
    duration_minutes,is_published
  )
  values(
    p_class_id,auth.uid(),btrim(p_title),coalesce(p_description,''),
    p_drive_file_id,p_recorded_at,p_duration_minutes,coalesce(p_is_published,true)
  )
  returning id into v_id;

  return v_id;
end
$$;

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
declare v_class_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select class_id into v_class_id
  from private.class_recordings
  where id=p_recording_id;

  if v_class_id is null then raise exception 'recording_not_found'; end if;
  if not private.classroom_can_teach_class(v_class_id,null) then
    raise exception 'teacher_class_access_denied';
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
declare v_class_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select class_id into v_class_id
  from private.class_recordings
  where id=p_recording_id;

  if v_class_id is null then raise exception 'recording_not_found'; end if;
  if not private.classroom_can_teach_class(v_class_id,null) then
    raise exception 'teacher_class_access_denied';
  end if;

  delete from private.class_recordings where id=p_recording_id;
end
$$;

create or replace function public.get_my_class_recordings()
returns table(
  recording_id uuid,
  class_id uuid,
  class_name text,
  class_code text,
  title text,
  description text,
  drive_file_id text,
  recorded_at timestamptz,
  duration_minutes integer
)
language sql
stable
security invoker
set search_path=pg_catalog,public,private
as $$ select * from private.get_my_class_recordings() $$;

create or replace function public.get_teaching_class_recordings(p_class_id uuid)
returns table(
  recording_id uuid,
  class_id uuid,
  class_name text,
  class_code text,
  title text,
  description text,
  drive_file_id text,
  recorded_at timestamptz,
  duration_minutes integer,
  is_published boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path=pg_catalog,public,private
as $$ select * from private.get_teaching_class_recordings(p_class_id) $$;

create or replace function public.create_class_recording(
  p_class_id uuid,
  p_title text,
  p_description text,
  p_drive_file_id text,
  p_recorded_at timestamptz,
  p_duration_minutes integer default null,
  p_is_published boolean default true
)
returns uuid
language sql
security invoker
set search_path=pg_catalog,public,private
as $$ select private.create_class_recording(
  p_class_id,p_title,p_description,p_drive_file_id,p_recorded_at,
  p_duration_minutes,p_is_published
) $$;

create or replace function public.update_class_recording(
  p_recording_id uuid,
  p_title text,
  p_description text,
  p_drive_file_id text,
  p_recorded_at timestamptz,
  p_duration_minutes integer,
  p_is_published boolean
)
returns void
language sql
security invoker
set search_path=pg_catalog,public,private
as $$ select private.update_class_recording(
  p_recording_id,p_title,p_description,p_drive_file_id,p_recorded_at,
  p_duration_minutes,p_is_published
) $$;

create or replace function public.delete_class_recording(p_recording_id uuid)
returns void
language sql
security invoker
set search_path=pg_catalog,public,private
as $$ select private.delete_class_recording(p_recording_id) $$;

revoke all on function private.get_my_class_recordings() from public,anon;
revoke all on function private.get_teaching_class_recordings(uuid) from public,anon;
revoke all on function private.create_class_recording(uuid,text,text,text,timestamptz,integer,boolean) from public,anon;
revoke all on function private.update_class_recording(uuid,text,text,text,timestamptz,integer,boolean) from public,anon;
revoke all on function private.delete_class_recording(uuid) from public,anon;

grant execute on function private.get_my_class_recordings() to authenticated;
grant execute on function private.get_teaching_class_recordings(uuid) to authenticated;
grant execute on function private.create_class_recording(uuid,text,text,text,timestamptz,integer,boolean) to authenticated;
grant execute on function private.update_class_recording(uuid,text,text,text,timestamptz,integer,boolean) to authenticated;
grant execute on function private.delete_class_recording(uuid) to authenticated;

revoke all on function public.get_my_class_recordings() from public,anon;
revoke all on function public.get_teaching_class_recordings(uuid) from public,anon;
revoke all on function public.create_class_recording(uuid,text,text,text,timestamptz,integer,boolean) from public,anon;
revoke all on function public.update_class_recording(uuid,text,text,text,timestamptz,integer,boolean) from public,anon;
revoke all on function public.delete_class_recording(uuid) from public,anon;

grant execute on function public.get_my_class_recordings() to authenticated;
grant execute on function public.get_teaching_class_recordings(uuid) to authenticated;
grant execute on function public.create_class_recording(uuid,text,text,text,timestamptz,integer,boolean) to authenticated;
grant execute on function public.update_class_recording(uuid,text,text,text,timestamptz,integer,boolean) to authenticated;
grant execute on function public.delete_class_recording(uuid) to authenticated;
