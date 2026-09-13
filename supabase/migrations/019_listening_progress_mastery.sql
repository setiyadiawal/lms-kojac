-- KOJAC LMS - Listening Progress / Simple Mastery (incremental)
-- Listening tidak memakai SRS klasik. Satu row summary per user + canonical listening_id.

begin;

create table if not exists public.listening_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  listening_id text not null,
  chapter_number smallint not null check (chapter_number between 1 and 35),
  completed boolean not null default false,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  latest_score smallint not null default 0 check (latest_score between 0 and 100),
  best_score smallint not null default 0 check (best_score between 0 and 100),
  latest_correct integer not null default 0 check (latest_correct >= 0),
  latest_wrong integer not null default 0 check (latest_wrong >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  first_completed_at timestamptz,
  last_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  last_session_id text not null,
  primary key (user_id, listening_id),
  check (length(btrim(listening_id)) > 0),
  check (length(btrim(last_session_id)) > 0),
  check (latest_correct <= total_questions),
  check (latest_wrong <= total_questions),
  check (latest_correct + latest_wrong = total_questions)
);

revoke all on public.listening_progress from public, anon, authenticated;
grant select on public.listening_progress to authenticated;
alter table public.listening_progress enable row level security;

drop policy if exists listening_progress_own_rows on public.listening_progress;
create policy listening_progress_own_rows
on public.listening_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists idx_listening_progress_user_completed
  on public.listening_progress(user_id, last_completed_at desc);

create or replace function public.record_listening_completion(
  p_listening_id text,
  p_chapter_number integer,
  p_score integer,
  p_correct integer,
  p_wrong integer,
  p_total_questions integer,
  p_session_id text
)
returns table (
  listening_id text,
  chapter_number smallint,
  completed boolean,
  attempt_count integer,
  latest_score smallint,
  best_score smallint,
  latest_correct integer,
  latest_wrong integer,
  total_questions integer,
  first_completed_at timestamptz,
  last_completed_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_listening_id text := btrim(coalesce(p_listening_id, ''));
  v_session_id text := btrim(coalesce(p_session_id, ''));
  v_score smallint;
  v_expected_score smallint;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_listening_id = '' then
    raise exception 'listening_id wajib diisi';
  end if;

  if v_session_id = '' then
    raise exception 'session_id wajib diisi';
  end if;

  if p_chapter_number is null or p_chapter_number < 1 or p_chapter_number > 35 then
    raise exception 'chapter_number tidak valid';
  end if;

  if p_total_questions is null or p_total_questions <= 0 then
    raise exception 'total_questions harus lebih dari 0';
  end if;

  if p_correct is null or p_correct < 0 or p_correct > p_total_questions then
    raise exception 'correct tidak valid';
  end if;

  if p_wrong is null or p_wrong < 0 or p_wrong > p_total_questions then
    raise exception 'wrong tidak valid';
  end if;

  if p_correct + p_wrong <> p_total_questions then
    raise exception 'correct + wrong harus sama dengan total_questions';
  end if;

  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'score tidak valid';
  end if;

  v_expected_score := round((p_correct::numeric / p_total_questions::numeric) * 100)::smallint;
  if p_score <> v_expected_score then
    raise exception 'score tidak sesuai correct/total_questions';
  end if;
  v_score := p_score::smallint;

  insert into public.listening_progress as lp (
    user_id,
    listening_id,
    chapter_number,
    completed,
    attempt_count,
    latest_score,
    best_score,
    latest_correct,
    latest_wrong,
    total_questions,
    first_completed_at,
    last_completed_at,
    updated_at,
    last_session_id
  ) values (
    v_user_id,
    v_listening_id,
    p_chapter_number::smallint,
    true,
    1,
    v_score,
    v_score,
    p_correct,
    p_wrong,
    p_total_questions,
    v_now,
    v_now,
    v_now,
    v_session_id
  )
  on conflict (user_id, listening_id) do update
  set
    chapter_number = case when lp.last_session_id = excluded.last_session_id then lp.chapter_number else excluded.chapter_number end,
    completed = true,
    attempt_count = case when lp.last_session_id = excluded.last_session_id then lp.attempt_count else lp.attempt_count + 1 end,
    latest_score = case when lp.last_session_id = excluded.last_session_id then lp.latest_score else excluded.latest_score end,
    best_score = case when lp.last_session_id = excluded.last_session_id then lp.best_score else greatest(lp.best_score, excluded.latest_score) end,
    latest_correct = case when lp.last_session_id = excluded.last_session_id then lp.latest_correct else excluded.latest_correct end,
    latest_wrong = case when lp.last_session_id = excluded.last_session_id then lp.latest_wrong else excluded.latest_wrong end,
    total_questions = case when lp.last_session_id = excluded.last_session_id then lp.total_questions else excluded.total_questions end,
    first_completed_at = coalesce(lp.first_completed_at, excluded.first_completed_at),
    last_completed_at = case when lp.last_session_id = excluded.last_session_id then lp.last_completed_at else excluded.last_completed_at end,
    updated_at = case when lp.last_session_id = excluded.last_session_id then lp.updated_at else excluded.updated_at end,
    last_session_id = excluded.last_session_id;

  return query
  select
    saved.listening_id,
    saved.chapter_number,
    saved.completed,
    saved.attempt_count,
    saved.latest_score,
    saved.best_score,
    saved.latest_correct,
    saved.latest_wrong,
    saved.total_questions,
    saved.first_completed_at,
    saved.last_completed_at,
    saved.updated_at
  from public.listening_progress as saved
  where saved.user_id = v_user_id
    and saved.listening_id = v_listening_id;
end;
$$;

revoke all on function public.record_listening_completion(text, integer, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.record_listening_completion(text, integer, integer, integer, integer, integer, text) to authenticated;

commit;
