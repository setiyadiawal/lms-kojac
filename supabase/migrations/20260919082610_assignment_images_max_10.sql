-- KOJAC LMS v1.1 — Assignment images max 10
-- Production migration version: 20260919082610
-- Already applied to production.

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
    select count(*) < 10
    from storage.objects o
    where o.bucket_id='assignment-images'
      and o.name like auth.uid()::text || '/' || v_assignment_id::text || '/%'
      and coalesce(o.is_delete_marker,false)=false
  );
end
$$;
