-- KOJAC LMS v1.1 — Teacher sees photos only after submission
-- Production migration version: 20260919082148
-- Already applied to production.

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
    select 1 from public.class_enrollments e
    where e.class_id=v_class_id
      and e.user_id=auth.uid()
      and e.status<>'cancelled'
  ) then return true; end if;

  return private.classroom_can_teach_class(v_class_id,null)
    and exists (
      select 1
      from private.assignment_submissions s
      where s.assignment_id=v_assignment_id
        and s.student_id=v_student_id
    );
end
$$;
