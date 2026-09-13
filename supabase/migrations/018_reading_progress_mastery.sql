-- KOJAC LMS - Reading Progress / Mastery (incremental)
-- Reading tidak memakai SRS klasik. Satu row summary per user + canonical reading_id.

begin;

create table if not exists public.reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id text not null,
  reading_title text not null,
  attempts integer not null default 0 check (attempts >= 0),
  completed boolean not null default false,
  latest_score smallint not null default 0 check (latest_score between 0 and 100),
  best_score smallint not null default 0 check (best_score between 0 and 100),
  latest_correct_count integer not null default 0 check (latest_correct_count >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  first_completed_at timestamptz,
  last_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  last_session_id text not null,
  primary key (user_id, reading_id),
  check (length(btrim(reading_id)) > 0),
  check (length(btrim(last_session_id)) > 0),
  check (latest_correct_count <= total_questions)
);

revoke all on public.reading_progress from public, anon;
grant select on public.reading_progress to authenticated;
alter table public.reading_progress enable row level security;

drop policy if exists reading_progress_own_rows on public.reading_progress;
create policy reading_progress_own_rows
on public.reading_progress
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists idx_reading_progress_user_completed
  on public.reading_progress(user_id, last_completed_at desc);

create or replace function public.record_reading_completion(
  p_reading_id text,
  p_reading_title text,
  p_correct_count integer,
  p_total_questions integer,
  p_session_id text
)
returns table (
  reading_id text,
  reading_title text,
  attempts integer,
  completed boolean,
  latest_score smallint,
  best_score smallint,
  latest_correct_count integer,
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
  v_reading_id text := btrim(coalesce(p_reading_id, ''));
  v_reading_title text := btrim(coalesce(p_reading_title, ''));
  v_score smallint;
  v_session_id text := btrim(coalesce(p_session_id, ''));
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_reading_id = '' then
    raise exception 'reading_id wajib diisi';
  end if;

  if v_reading_title = '' then
    raise exception 'reading_title wajib diisi';
  end if;

  if v_session_id = '' then
    raise exception 'session_id wajib diisi';
  end if;

  if p_total_questions is null or p_total_questions <= 0 then
    raise exception 'total_questions harus lebih dari 0';
  end if;

  if p_correct_count is null or p_correct_count < 0 or p_correct_count > p_total_questions then
    raise exception 'correct_count tidak valid';
  end if;

  v_score := round((p_correct_count::numeric / p_total_questions::numeric) * 100)::smallint;

  insert into public.reading_progress as rp (
    user_id,
    reading_id,
    reading_title,
    attempts,
    completed,
    latest_score,
    best_score,
    latest_correct_count,
    total_questions,
    first_completed_at,
    last_completed_at,
    updated_at,
    last_session_id
  ) values (
    v_user_id,
    v_reading_id,
    v_reading_title,
    1,
    true,
    v_score,
    v_score,
    p_correct_count,
    p_total_questions,
    v_now,
    v_now,
    v_now,
    v_session_id
  )
  on conflict (user_id, reading_id) do update
  set
    reading_title = excluded.reading_title,
    attempts = case when rp.last_session_id = excluded.last_session_id then rp.attempts else rp.attempts + 1 end,
    completed = true,
    latest_score = case when rp.last_session_id = excluded.last_session_id then rp.latest_score else excluded.latest_score end,
    best_score = case when rp.last_session_id = excluded.last_session_id then rp.best_score else greatest(rp.best_score, excluded.latest_score) end,
    latest_correct_count = case when rp.last_session_id = excluded.last_session_id then rp.latest_correct_count else excluded.latest_correct_count end,
    total_questions = case when rp.last_session_id = excluded.last_session_id then rp.total_questions else excluded.total_questions end,
    first_completed_at = coalesce(rp.first_completed_at, excluded.first_completed_at),
    last_completed_at = case when rp.last_session_id = excluded.last_session_id then rp.last_completed_at else excluded.last_completed_at end,
    updated_at = case when rp.last_session_id = excluded.last_session_id then rp.updated_at else excluded.updated_at end,
    last_session_id = excluded.last_session_id;

  return query
  select
    saved.reading_id,
    saved.reading_title,
    saved.attempts,
    saved.completed,
    saved.latest_score,
    saved.best_score,
    saved.latest_correct_count,
    saved.total_questions,
    saved.first_completed_at,
    saved.last_completed_at,
    saved.updated_at
  from public.reading_progress as saved
  where saved.user_id = v_user_id
    and saved.reading_id = v_reading_id;
end;
$$;

revoke all on function public.record_reading_completion(text, text, integer, integer, text) from public, anon;
grant execute on function public.record_reading_completion(text, text, integer, integer, text) to authenticated;

commit;
