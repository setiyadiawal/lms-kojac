-- KOJAC LMS v1.1 — Photo-only Assignment submissions
-- Production migration version: 20260919082118
-- Already applied to production.

alter table private.assignment_submissions
  drop constraint assignment_submissions_answer_check;

alter table private.assignment_submissions
  add constraint assignment_submissions_answer_check
  check (char_length(answer_text) <= 20000);

create or replace function private.submit_my_assignment(
  p_assignment_id uuid,
  p_answer_text text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $$
declare
  v_class_id uuid;
  v_status text;
  v_answer text := btrim(coalesce(p_answer_text, ''));
  v_has_photo boolean;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text = 'siswa'
  ) then
    raise exception 'student_access_required';
  end if;

  select class_id, status into v_class_id, v_status
  from private.class_assignments
  where id = p_assignment_id;

  if v_class_id is null then raise exception 'assignment_not_found'; end if;
  if v_status <> 'published' then raise exception 'assignment_not_open'; end if;

  if not exists (
    select 1
    from public.class_enrollments e
    where e.class_id = v_class_id
      and e.user_id = auth.uid()
      and e.status <> 'cancelled'
  ) then
    raise exception 'student_assignment_access_denied';
  end if;

  if char_length(v_answer) > 20000 then
    raise exception 'assignment_answer_invalid';
  end if;

  select exists (
    select 1
    from storage.objects o
    where o.bucket_id='assignment-images'
      and o.name like auth.uid()::text || '/' || p_assignment_id::text || '/%'
      and coalesce(o.is_delete_marker,false)=false
  ) into v_has_photo;

  if v_answer = '' and not v_has_photo then
    raise exception 'assignment_answer_or_photo_required';
  end if;

  insert into private.assignment_submissions (
    assignment_id, student_id, answer_text, submitted_at, updated_at,
    score, feedback, reviewed_at, reviewed_by
  )
  values (
    p_assignment_id, auth.uid(), v_answer, now(), now(),
    null, null, null, null
  )
  on conflict (assignment_id, student_id)
  do update set
    answer_text = excluded.answer_text,
    submitted_at = now(),
    updated_at = now(),
    score = null,
    feedback = null,
    reviewed_at = null,
    reviewed_by = null;
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
  v_photo_count integer;
  v_answer text;
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

  select s.answer_text into v_answer
  from private.assignment_submissions s
  where s.assignment_id=v_assignment_id
    and s.student_id=auth.uid();

  if found and btrim(coalesce(v_answer,''))='' then
    select count(*) into v_photo_count
    from storage.objects o
    where o.bucket_id='assignment-images'
      and o.name like auth.uid()::text || '/' || v_assignment_id::text || '/%'
      and coalesce(o.is_delete_marker,false)=false;

    if v_photo_count <= 1 then
      return false;
    end if;
  end if;

  return true;
end
$$;
