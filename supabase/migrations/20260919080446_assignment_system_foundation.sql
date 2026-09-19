-- KOJAC LMS v1.1 — Assignment System Foundation
-- Production migration version: 20260919080446
-- Already applied to production through Supabase migration mechanism.

create table private.class_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  instructions text not null default '',
  due_at timestamptz,
  status text not null default 'draft',
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_assignments_title_check check (char_length(btrim(title)) between 1 and 160),
  constraint class_assignments_instructions_check check (char_length(instructions) <= 10000),
  constraint class_assignments_status_check check (status in ('draft','published','closed'))
);

create index class_assignments_class_id_idx on private.class_assignments(class_id);
create index class_assignments_created_by_idx on private.class_assignments(created_by);
create index class_assignments_due_at_idx on private.class_assignments(due_at);

alter table private.class_assignments enable row level security;
revoke all on private.class_assignments from public, anon, authenticated;

create table private.assignment_submissions (
  assignment_id uuid not null references private.class_assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  answer_text text not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  score smallint,
  feedback text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  primary key (assignment_id, student_id),
  constraint assignment_submissions_answer_check check (char_length(btrim(answer_text)) between 1 and 20000),
  constraint assignment_submissions_score_check check (score is null or score between 0 and 100),
  constraint assignment_submissions_feedback_check check (feedback is null or char_length(feedback) <= 10000)
);

create index assignment_submissions_student_id_idx on private.assignment_submissions(student_id);
create index assignment_submissions_submitted_at_idx on private.assignment_submissions(submitted_at);
create index assignment_submissions_reviewed_by_idx on private.assignment_submissions(reviewed_by);

alter table private.assignment_submissions enable row level security;
revoke all on private.assignment_submissions from public, anon, authenticated;

create or replace function private.create_class_assignment(
  p_class_id uuid,
  p_title text,
  p_instructions text,
  p_due_at timestamptz default null,
  p_status text default 'published'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_id uuid;
  v_status text := lower(btrim(coalesce(p_status, 'published')));
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.classroom_can_teach_class(p_class_id, null) then raise exception 'teacher_class_access_denied'; end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160 then raise exception 'assignment_title_invalid'; end if;
  if char_length(coalesce(p_instructions, '')) > 10000 then raise exception 'assignment_instructions_too_long'; end if;
  if v_status not in ('draft','published') then raise exception 'assignment_status_invalid'; end if;

  insert into private.class_assignments (
    class_id, created_by, title, instructions, due_at, status, published_at
  )
  values (
    p_class_id, auth.uid(), btrim(p_title), coalesce(p_instructions, ''), p_due_at, v_status,
    case when v_status = 'published' then now() else null end
  )
  returning id into v_id;

  return v_id;
end
$$;

create or replace function private.update_class_assignment(
  p_assignment_id uuid,
  p_title text,
  p_instructions text,
  p_due_at timestamptz,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_class_id uuid;
  v_old_status text;
  v_status text := lower(btrim(coalesce(p_status, '')));
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select class_id, status into v_class_id, v_old_status
  from private.class_assignments
  where id = p_assignment_id;

  if v_class_id is null then raise exception 'assignment_not_found'; end if;
  if not private.classroom_can_teach_class(v_class_id, null) then raise exception 'teacher_class_access_denied'; end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160 then raise exception 'assignment_title_invalid'; end if;
  if char_length(coalesce(p_instructions, '')) > 10000 then raise exception 'assignment_instructions_too_long'; end if;
  if v_status not in ('draft','published','closed') then raise exception 'assignment_status_invalid'; end if;

  update private.class_assignments
  set
    title = btrim(p_title),
    instructions = coalesce(p_instructions, ''),
    due_at = p_due_at,
    status = v_status,
    published_at = case when v_status = 'published' and published_at is null then now() else published_at end,
    closed_at = case
      when v_status = 'closed' and v_old_status <> 'closed' then now()
      when v_status <> 'closed' then null
      else closed_at
    end,
    updated_at = now()
  where id = p_assignment_id;
end
$$;

create or replace function private.get_my_class_assignments(p_class_id uuid)
returns table (
  assignment_id uuid,
  title text,
  instructions text,
  due_at timestamptz,
  assignment_status text,
  created_at timestamptz,
  updated_at timestamptz,
  student_count integer,
  submission_count integer,
  reviewed_count integer,
  late_count integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.classroom_can_teach_class(p_class_id, null) then raise exception 'teacher_class_access_denied'; end if;

  return query
  select
    a.id, a.title, a.instructions, a.due_at, a.status, a.created_at, a.updated_at,
    count(distinct e.user_id) filter (where e.status <> 'cancelled')::integer,
    count(distinct s.student_id)::integer,
    count(distinct s.student_id) filter (where s.reviewed_at is not null)::integer,
    count(distinct s.student_id) filter (where a.due_at is not null and s.submitted_at > a.due_at)::integer
  from private.class_assignments a
  left join public.class_enrollments e
    on e.class_id = a.class_id
   and e.status <> 'cancelled'
  left join private.assignment_submissions s
    on s.assignment_id = a.id
   and s.student_id = e.user_id
  where a.class_id = p_class_id
  group by a.id, a.title, a.instructions, a.due_at, a.status, a.created_at, a.updated_at
  order by case a.status when 'published' then 1 when 'draft' then 2 else 3 end,
           a.due_at nulls last,
           a.created_at desc;
end
$$;

create or replace function private.get_assignment_submissions(p_assignment_id uuid)
returns table (
  student_id uuid,
  full_name text,
  nickname text,
  enrollment_status text,
  submission_status text,
  answer_text text,
  submitted_at timestamptz,
  is_late boolean,
  score smallint,
  feedback text,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_class_id uuid;
  v_due_at timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select class_id, due_at into v_class_id, v_due_at
  from private.class_assignments
  where id = p_assignment_id;

  if v_class_id is null then raise exception 'assignment_not_found'; end if;
  if not private.classroom_can_teach_class(v_class_id, null) then raise exception 'teacher_class_access_denied'; end if;

  return query
  select
    e.user_id, p.full_name, p.nickname, e.status::text,
    case
      when s.assignment_id is null then 'not_submitted'
      when s.reviewed_at is not null then 'reviewed'
      else 'submitted'
    end,
    s.answer_text, s.submitted_at,
    coalesce(v_due_at is not null and s.submitted_at > v_due_at, false),
    s.score, s.feedback, s.reviewed_at
  from public.class_enrollments e
  join public.profiles p on p.user_id = e.user_id
  left join private.assignment_submissions s
    on s.assignment_id = p_assignment_id
   and s.student_id = e.user_id
  where e.class_id = v_class_id
    and e.status <> 'cancelled'
  order by case when s.assignment_id is null then 2 else 1 end,
           p.full_name nulls last,
           e.joined_at;
end
$$;

create or replace function private.get_my_assignments()
returns table (
  assignment_id uuid,
  class_id uuid,
  class_name text,
  class_code text,
  title text,
  instructions text,
  due_at timestamptz,
  assignment_status text,
  created_at timestamptz,
  submission_status text,
  answer_text text,
  submitted_at timestamptz,
  is_late boolean,
  score smallint,
  feedback text,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text = 'siswa'
  ) then
    raise exception 'student_access_required';
  end if;

  return query
  select
    a.id, c.id, c.name, c.code, a.title, a.instructions, a.due_at, a.status, a.created_at,
    case
      when s.assignment_id is null then 'not_submitted'
      when s.reviewed_at is not null then 'reviewed'
      else 'submitted'
    end,
    s.answer_text, s.submitted_at,
    coalesce(a.due_at is not null and s.submitted_at > a.due_at, false),
    s.score, s.feedback, s.reviewed_at
  from public.class_enrollments e
  join public.classes c on c.id = e.class_id
  join private.class_assignments a on a.class_id = e.class_id
  left join private.assignment_submissions s
    on s.assignment_id = a.id
   and s.student_id = auth.uid()
  where e.user_id = auth.uid()
    and e.status <> 'cancelled'
    and a.status in ('published','closed')
  order by case
      when a.status = 'published' and s.assignment_id is null then 1
      when a.status = 'published' then 2
      else 3
    end,
    a.due_at nulls last,
    a.created_at desc;
end
$$;

create or replace function private.submit_my_assignment(
  p_assignment_id uuid,
  p_answer_text text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_class_id uuid;
  v_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  if not exists (
    select 1 from public.user_roles ur
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
    select 1 from public.class_enrollments e
    where e.class_id = v_class_id
      and e.user_id = auth.uid()
      and e.status <> 'cancelled'
  ) then
    raise exception 'student_assignment_access_denied';
  end if;

  if char_length(btrim(coalesce(p_answer_text, ''))) not between 1 and 20000 then
    raise exception 'assignment_answer_invalid';
  end if;

  insert into private.assignment_submissions (
    assignment_id, student_id, answer_text, submitted_at, updated_at,
    score, feedback, reviewed_at, reviewed_by
  )
  values (
    p_assignment_id, auth.uid(), btrim(p_answer_text), now(), now(),
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

create or replace function private.review_assignment_submission(
  p_assignment_id uuid,
  p_student_id uuid,
  p_score smallint,
  p_feedback text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_class_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select class_id into v_class_id
  from private.class_assignments
  where id = p_assignment_id;

  if v_class_id is null then raise exception 'assignment_not_found'; end if;
  if not private.classroom_can_teach_class(v_class_id, null) then raise exception 'teacher_class_access_denied'; end if;
  if p_score is null or p_score < 0 or p_score > 100 then raise exception 'assignment_score_invalid'; end if;
  if char_length(coalesce(p_feedback, '')) > 10000 then raise exception 'assignment_feedback_too_long'; end if;

  if not exists (
    select 1 from public.class_enrollments e
    where e.class_id = v_class_id
      and e.user_id = p_student_id
      and e.status <> 'cancelled'
  ) then
    raise exception 'student_not_in_class';
  end if;

  update private.assignment_submissions
  set
    score = p_score,
    feedback = nullif(btrim(coalesce(p_feedback, '')), ''),
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  where assignment_id = p_assignment_id
    and student_id = p_student_id;

  if not found then raise exception 'submission_not_found'; end if;
end
$$;

create or replace function public.create_class_assignment(
  p_class_id uuid,
  p_title text,
  p_instructions text,
  p_due_at timestamptz default null,
  p_status text default 'published'
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $$ select private.create_class_assignment(p_class_id,p_title,p_instructions,p_due_at,p_status) $$;

create or replace function public.update_class_assignment(
  p_assignment_id uuid,
  p_title text,
  p_instructions text,
  p_due_at timestamptz,
  p_status text
)
returns void
language sql
security invoker
set search_path = pg_catalog, public, private
as $$ select private.update_class_assignment(p_assignment_id,p_title,p_instructions,p_due_at,p_status) $$;

create or replace function public.get_my_class_assignments(p_class_id uuid)
returns table (
  assignment_id uuid,
  title text,
  instructions text,
  due_at timestamptz,
  assignment_status text,
  created_at timestamptz,
  updated_at timestamptz,
  student_count integer,
  submission_count integer,
  reviewed_count integer,
  late_count integer
)
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select * from private.get_my_class_assignments(p_class_id) $$;

create or replace function public.get_assignment_submissions(p_assignment_id uuid)
returns table (
  student_id uuid,
  full_name text,
  nickname text,
  enrollment_status text,
  submission_status text,
  answer_text text,
  submitted_at timestamptz,
  is_late boolean,
  score smallint,
  feedback text,
  reviewed_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select * from private.get_assignment_submissions(p_assignment_id) $$;

create or replace function public.get_my_assignments()
returns table (
  assignment_id uuid,
  class_id uuid,
  class_name text,
  class_code text,
  title text,
  instructions text,
  due_at timestamptz,
  assignment_status text,
  created_at timestamptz,
  submission_status text,
  answer_text text,
  submitted_at timestamptz,
  is_late boolean,
  score smallint,
  feedback text,
  reviewed_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select * from private.get_my_assignments() $$;

create or replace function public.submit_my_assignment(
  p_assignment_id uuid,
  p_answer_text text
)
returns void
language sql
security invoker
set search_path = pg_catalog, public, private
as $$ select private.submit_my_assignment(p_assignment_id,p_answer_text) $$;

create or replace function public.review_assignment_submission(
  p_assignment_id uuid,
  p_student_id uuid,
  p_score smallint,
  p_feedback text default null
)
returns void
language sql
security invoker
set search_path = pg_catalog, public, private
as $$ select private.review_assignment_submission(p_assignment_id,p_student_id,p_score,p_feedback) $$;

revoke all on function private.create_class_assignment(uuid,text,text,timestamptz,text) from public, anon;
revoke all on function private.update_class_assignment(uuid,text,text,timestamptz,text) from public, anon;
revoke all on function private.get_my_class_assignments(uuid) from public, anon;
revoke all on function private.get_assignment_submissions(uuid) from public, anon;
revoke all on function private.get_my_assignments() from public, anon;
revoke all on function private.submit_my_assignment(uuid,text) from public, anon;
revoke all on function private.review_assignment_submission(uuid,uuid,smallint,text) from public, anon;

grant execute on function private.create_class_assignment(uuid,text,text,timestamptz,text) to authenticated;
grant execute on function private.update_class_assignment(uuid,text,text,timestamptz,text) to authenticated;
grant execute on function private.get_my_class_assignments(uuid) to authenticated;
grant execute on function private.get_assignment_submissions(uuid) to authenticated;
grant execute on function private.get_my_assignments() to authenticated;
grant execute on function private.submit_my_assignment(uuid,text) to authenticated;
grant execute on function private.review_assignment_submission(uuid,uuid,smallint,text) to authenticated;

revoke all on function public.create_class_assignment(uuid,text,text,timestamptz,text) from public, anon;
revoke all on function public.update_class_assignment(uuid,text,text,timestamptz,text) from public, anon;
revoke all on function public.get_my_class_assignments(uuid) from public, anon;
revoke all on function public.get_assignment_submissions(uuid) from public, anon;
revoke all on function public.get_my_assignments() from public, anon;
revoke all on function public.submit_my_assignment(uuid,text) from public, anon;
revoke all on function public.review_assignment_submission(uuid,uuid,smallint,text) from public, anon;

grant execute on function public.create_class_assignment(uuid,text,text,timestamptz,text) to authenticated;
grant execute on function public.update_class_assignment(uuid,text,text,timestamptz,text) to authenticated;
grant execute on function public.get_my_class_assignments(uuid) to authenticated;
grant execute on function public.get_assignment_submissions(uuid) to authenticated;
grant execute on function public.get_my_assignments() to authenticated;
grant execute on function public.submit_my_assignment(uuid,text) to authenticated;
grant execute on function public.review_assignment_submission(uuid,uuid,smallint,text) to authenticated;
