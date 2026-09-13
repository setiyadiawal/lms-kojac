-- PR-2D: fix PL/pgSQL ambiguity in Listening completion upsert.
-- Preserves the existing RPC contract, progress rows, auth model, and idempotency semantics.

begin;

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
  on conflict on constraint listening_progress_pkey do update
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
