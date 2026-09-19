-- KOJAC LMS v1.1 — Assignment submission images
-- Production migration version: 20260919081948
-- Already applied to production.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'assignment-images',
  'assignment-images',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.assignment_photo_can_insert(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private,storage
as $$
declare
  v_student_text text := split_part(coalesce(p_name,''),'/',1);
  v_assignment_text text := split_part(coalesce(p_name,''),'/',2);
  v_assignment_id uuid;
begin
  if auth.uid() is null then return false; end if;
  if v_student_text <> auth.uid()::text then return false; end if;
  if v_assignment_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;

  v_assignment_id := v_assignment_text::uuid;

  if not exists (
    select 1
    from private.class_assignments a
    join public.class_enrollments e
      on e.class_id=a.class_id
     and e.user_id=auth.uid()
     and e.status<>'cancelled'
    where a.id=v_assignment_id
      and a.status='published'
  ) then return false; end if;

  return (
    select count(*) < 5
    from storage.objects o
    where o.bucket_id='assignment-images'
      and o.name like auth.uid()::text || '/' || v_assignment_id::text || '/%'
      and coalesce(o.is_delete_marker,false)=false
  );
end
$$;

create or replace function private.assignment_photo_can_select(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private,storage
as $$
declare
  v_student_text text := split_part(coalesce(p_name,''),'/',1);
  v_assignment_text text := split_part(coalesce(p_name,''),'/',2);
  v_student_id uuid;
  v_assignment_id uuid;
  v_class_id uuid;
begin
  if auth.uid() is null then return false; end if;
  if v_student_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;
  if v_assignment_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;

  v_student_id := v_student_text::uuid;
  v_assignment_id := v_assignment_text::uuid;

  select a.class_id into v_class_id
  from private.class_assignments a
  where a.id=v_assignment_id;

  if v_class_id is null then return false; end if;

  if v_student_id=auth.uid() and exists (
    select 1
    from public.class_enrollments e
    where e.class_id=v_class_id
      and e.user_id=auth.uid()
      and e.status<>'cancelled'
  ) then return true; end if;

  return private.classroom_can_teach_class(v_class_id,null);
end
$$;

create or replace function private.assignment_photo_can_delete(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private,storage
as $$
declare
  v_student_text text := split_part(coalesce(p_name,''),'/',1);
  v_assignment_text text := split_part(coalesce(p_name,''),'/',2);
  v_assignment_id uuid;
begin
  if auth.uid() is null then return false; end if;
  if v_student_text <> auth.uid()::text then return false; end if;
  if v_assignment_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;

  v_assignment_id := v_assignment_text::uuid;

  return exists (
    select 1
    from private.class_assignments a
    join public.class_enrollments e
      on e.class_id=a.class_id
     and e.user_id=auth.uid()
     and e.status<>'cancelled'
    where a.id=v_assignment_id
      and a.status='published'
  );
end
$$;

revoke all on function private.assignment_photo_can_insert(text) from public,anon;
revoke all on function private.assignment_photo_can_select(text) from public,anon;
revoke all on function private.assignment_photo_can_delete(text) from public,anon;

grant execute on function private.assignment_photo_can_insert(text) to authenticated;
grant execute on function private.assignment_photo_can_select(text) to authenticated;
grant execute on function private.assignment_photo_can_delete(text) to authenticated;

drop policy if exists "assignment images insert" on storage.objects;
drop policy if exists "assignment images select" on storage.objects;
drop policy if exists "assignment images delete" on storage.objects;

create policy "assignment images insert"
on storage.objects for insert to authenticated
with check (
  bucket_id='assignment-images'
  and private.assignment_photo_can_insert(name)
);

create policy "assignment images select"
on storage.objects for select to authenticated
using (
  bucket_id='assignment-images'
  and private.assignment_photo_can_select(name)
);

create policy "assignment images delete"
on storage.objects for delete to authenticated
using (
  bucket_id='assignment-images'
  and private.assignment_photo_can_delete(name)
);
