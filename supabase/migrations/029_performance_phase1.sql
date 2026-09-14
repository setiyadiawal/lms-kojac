-- KOJAC LMS PERFORMANCE PHASE 1
-- Reduce Vocabulary round-trips and Dashboard over-fetching without changing content/progress semantics.

create index if not exists idx_learning_items_vocabulary_chapter_published
  on public.learning_items (((extra->>'chapter_number')::integer))
  where item_type = 'vocabulary'
    and is_published = true
    and jsonb_typeof(extra->'chapter_number') = 'number';

create or replace function public.get_vocabulary_chapter_summaries()
returns table (
  chapter_number integer,
  chapter_title text,
  total integer,
  started integer,
  mastered integer,
  due integer,
  accuracy integer,
  average_mastery integer
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with base as (
    select
      (li.extra->>'chapter_number')::integer as chapter_number,
      coalesce(nullif(btrim(li.extra->>'chapter_title'), ''), 'Bab ' || (li.extra->>'chapter_number')) as chapter_title,
      rp.repetitions,
      rp.last_reviewed_at,
      rp.correct_count,
      rp.wrong_count,
      rp.mastery_score,
      rp.due_at
    from public.learning_items li
    left join public.review_progress rp
      on rp.item_id = li.id
    where li.item_type = 'vocabulary'
      and li.is_published = true
      and jsonb_typeof(li.extra->'chapter_number') = 'number'
  ), aggregated as (
    select
      chapter_number,
      min(chapter_title) as chapter_title,
      count(*)::integer as total,
      count(*) filter (
        where last_reviewed_at is not null
           or coalesce(repetitions, 0) > 0
           or coalesce(correct_count, 0) > 0
           or coalesce(wrong_count, 0) > 0
      )::integer as started,
      count(*) filter (where coalesce(mastery_score, 0) >= 80)::integer as mastered,
      count(*) filter (
        where (
          last_reviewed_at is not null
          or coalesce(repetitions, 0) > 0
          or coalesce(correct_count, 0) > 0
          or coalesce(wrong_count, 0) > 0
        )
        and due_at <= now()
      )::integer as due,
      coalesce(
        round(
          100.0 * sum(coalesce(correct_count, 0))
          / nullif(sum(coalesce(correct_count, 0) + coalesce(wrong_count, 0)), 0)
        ),
        0
      )::integer as accuracy,
      coalesce(round(avg(coalesce(mastery_score, 0))), 0)::integer as average_mastery
    from base
    group by chapter_number
  )
  select
    chapter_number,
    chapter_title,
    total,
    started,
    mastered,
    due,
    accuracy,
    average_mastery
  from aggregated
  order by chapter_number;
$$;

revoke all on function public.get_vocabulary_chapter_summaries() from public;
revoke execute on function public.get_vocabulary_chapter_summaries() from anon;
grant execute on function public.get_vocabulary_chapter_summaries() to authenticated;

create or replace function public.get_vocabulary_chapter_items(p_chapter_number integer)
returns table (
  id uuid,
  prompt text,
  reading text,
  meaning_id text,
  extra jsonb,
  progress_item_id uuid,
  repetitions integer,
  interval_days integer,
  ease_factor numeric,
  due_at timestamptz,
  last_rating smallint,
  last_reviewed_at timestamptz,
  correct_count integer,
  wrong_count integer,
  mastery_score integer
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    li.id,
    li.prompt,
    li.reading,
    li.meaning_id,
    li.extra,
    rp.item_id as progress_item_id,
    rp.repetitions,
    rp.interval_days,
    rp.ease_factor,
    rp.due_at,
    rp.last_rating,
    rp.last_reviewed_at,
    rp.correct_count,
    rp.wrong_count,
    rp.mastery_score
  from public.learning_items li
  left join public.review_progress rp
    on rp.item_id = li.id
  where li.item_type = 'vocabulary'
    and li.is_published = true
    and jsonb_typeof(li.extra->'chapter_number') = 'number'
    and (li.extra->>'chapter_number')::integer = p_chapter_number
  order by
    case
      when jsonb_typeof(li.extra->'sort_order') = 'number'
        then (li.extra->>'sort_order')::integer
      else 9999
    end,
    li.prompt;
$$;

revoke all on function public.get_vocabulary_chapter_items(integer) from public;
revoke execute on function public.get_vocabulary_chapter_items(integer) from anon;
grant execute on function public.get_vocabulary_chapter_items(integer) to authenticated;

create or replace function public.get_student_dashboard_summary()
returns table (
  module_key text,
  total integer,
  started integer,
  mastered integer,
  average_mastery integer,
  completed integer,
  average_accuracy integer,
  progress_percent integer,
  mastery_percent integer,
  latest_activity timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with srs as (
    select
      li.item_type as module_key,
      count(*)::integer as total,
      count(*) filter (
        where rp.last_reviewed_at is not null
           or coalesce(rp.correct_count, 0) > 0
           or coalesce(rp.wrong_count, 0) > 0
      )::integer as started,
      count(*) filter (where coalesce(rp.mastery_score, 0) >= 80)::integer as mastered,
      coalesce(round(avg(coalesce(rp.mastery_score, 0))), 0)::integer as average_mastery,
      max(rp.last_reviewed_at) as latest_activity
    from public.learning_items li
    left join public.review_progress rp
      on rp.item_id = li.id
    where li.is_published = true
      and li.item_type in ('hiragana', 'katakana', 'vocabulary', 'kanji', 'grammar')
    group by li.item_type
  ), reading as (
    select
      count(*) filter (where completed and attempts > 0)::integer as completed,
      count(*) filter (where completed and attempts > 0 and best_score >= 80)::integer as mastered,
      coalesce(round(avg(latest_score) filter (where completed and attempts > 0)), 0)::integer as average_accuracy,
      max(updated_at) as latest_activity
    from public.reading_progress
  ), listening as (
    select
      count(*) filter (where completed)::integer as completed,
      count(*) filter (where best_score >= 80)::integer as mastered,
      coalesce(sum(best_score), 0)::integer as mastery_total,
      max(updated_at) as latest_activity
    from public.listening_progress
  )
  select
    srs.module_key,
    srs.total,
    srs.started,
    srs.mastered,
    srs.average_mastery,
    0::integer as completed,
    0::integer as average_accuracy,
    srs.average_mastery as progress_percent,
    srs.average_mastery as mastery_percent,
    srs.latest_activity
  from srs

  union all

  select
    'reading'::text,
    176::integer,
    reading.completed,
    reading.mastered,
    0::integer,
    reading.completed,
    reading.average_accuracy,
    case
      when 176 > 0 then round(
        100.0 * (
          reading.mastered + greatest(reading.completed - reading.mastered, 0) * 0.5
        ) / 176
      )::integer
      else 0
    end,
    0::integer,
    reading.latest_activity
  from reading

  union all

  select
    'listening'::text,
    175::integer,
    listening.completed,
    listening.mastered,
    0::integer,
    listening.completed,
    0::integer,
    case when 175 > 0 then round(100.0 * listening.completed / 175)::integer else 0 end,
    case when 175 > 0 then round(1.0 * listening.mastery_total / 175)::integer else 0 end,
    listening.latest_activity
  from listening;
$$;

revoke all on function public.get_student_dashboard_summary() from public;
revoke execute on function public.get_student_dashboard_summary() from anon;
grant execute on function public.get_student_dashboard_summary() to authenticated;
