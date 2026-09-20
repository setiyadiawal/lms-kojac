-- KOJAC LMS v1.4 — Central Progress Phase 2
-- Production migration version: 20260920090922
-- IMPORTANT: this exact migration has already been applied to production.
-- Read-only authenticated progress detail RPC.

create or replace function public.get_student_progress_detail()
returns jsonb
language sql
stable
security invoker
set search_path to pg_catalog, public
as $function$
with me as (
  select auth.uid() as user_id
),
srs_items as (
  select
    li.id,
    li.item_type,
    li.jlpt_level,
    li.prompt,
    li.reading,
    li.meaning_id,
    coalesce(rp.mastery_score, 0) as mastery_score,
    rp.due_at,
    rp.last_reviewed_at,
    case
      when rp.last_reviewed_at is not null
        or coalesce(rp.correct_count, 0) > 0
        or coalesce(rp.wrong_count, 0) > 0
      then true else false
    end as started
  from public.learning_items li
  left join public.review_progress rp
    on rp.item_id = li.id
   and rp.user_id = (select user_id from me)
  where li.is_published = true
    and li.item_type in ('hiragana','katakana','vocabulary','kanji','grammar')
),
level_rows as (
  select
    jlpt_level,
    count(*)::int as total,
    count(*) filter (where started)::int as started,
    count(*) filter (where mastery_score >= 80)::int as mastered,
    coalesce(round(avg(mastery_score)), 0)::int as average_mastery
  from srs_items
  where jlpt_level in ('N5','N4')
    and item_type in ('vocabulary','kanji','grammar')
  group by jlpt_level
),
level_json as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'level', jlpt_level,
        'total', total,
        'started', started,
        'mastered', mastered,
        'average_mastery', average_mastery
      )
      order by case jlpt_level when 'N5' then 1 when 'N4' then 2 else 9 end
    ),
    '[]'::jsonb
  ) as data
  from level_rows
),
review_summary_rows as (
  select
    item_type as module_key,
    count(*) filter (
      where due_at is not null
        and due_at <= now()
        and started
    )::int as due_count,
    count(*) filter (
      where started
        and mastery_score < 60
    )::int as weak_count
  from srs_items
  group by item_type
),
review_summary_json as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'module_key', module_key,
        'due_count', due_count,
        'weak_count', weak_count
      )
      order by module_key
    ),
    '[]'::jsonb
  ) as data
  from review_summary_rows
),
priority_rows as (
  select
    item_type as module_key,
    prompt as title,
    reading,
    meaning_id,
    mastery_score,
    due_at
  from srs_items
  where started
    and due_at is not null
    and due_at <= now()
  order by mastery_score asc, due_at asc nulls last, prompt
  limit 8
),
priority_json as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'module_key', module_key,
        'title', title,
        'reading', reading,
        'meaning', meaning_id,
        'mastery_score', mastery_score,
        'due_at', due_at
      )
    ),
    '[]'::jsonb
  ) as data
  from priority_rows
),
activity_union as (
  select
    si.item_type as module_key,
    'review'::text as activity_type,
    si.prompt as title,
    coalesce(nullif(si.meaning_id,''), nullif(si.reading,''), 'Review SRS') as detail,
    si.mastery_score::int as metric,
    si.last_reviewed_at as occurred_at
  from srs_items si
  where si.last_reviewed_at is not null

  union all

  select
    'reading'::text,
    'completion'::text,
    coalesce(nullif(rp.reading_title,''), rp.reading_id),
    'Skor terbaik ' || rp.best_score::text || '%',
    rp.best_score::int,
    coalesce(rp.last_completed_at, rp.updated_at)
  from public.reading_progress rp
  where rp.user_id = (select user_id from me)
    and rp.completed = true

  union all

  select
    'listening'::text,
    'completion'::text,
    'Listening Bab ' || lp.chapter_number::text,
    'Skor terbaik ' || lp.best_score::text || '%',
    lp.best_score::int,
    coalesce(lp.last_completed_at, lp.updated_at)
  from public.listening_progress lp
  where lp.user_id = (select user_id from me)
    and lp.completed = true
),
activity_rows as (
  select *
  from activity_union
  where occurred_at is not null
  order by occurred_at desc
  limit 12
),
activity_json as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'module_key', module_key,
        'activity_type', activity_type,
        'title', title,
        'detail', detail,
        'metric', metric,
        'occurred_at', occurred_at
      )
    ),
    '[]'::jsonb
  ) as data
  from activity_rows
),
overall as (
  select
    count(*)::int as total,
    count(*) filter (where started)::int as started,
    count(*) filter (where mastery_score >= 80)::int as mastered,
    coalesce(round(avg(mastery_score)), 0)::int as average_mastery,
    count(*) filter (
      where due_at is not null
        and due_at <= now()
        and started
    )::int as due_now
  from srs_items
)
select jsonb_build_object(
  'srs_overall', jsonb_build_object(
    'total', overall.total,
    'started', overall.started,
    'mastered', overall.mastered,
    'average_mastery', overall.average_mastery,
    'due_now', overall.due_now
  ),
  'jlpt_levels', (select data from level_json),
  'review_summary', (select data from review_summary_json),
  'review_priorities', (select data from priority_json),
  'recent_activity', (select data from activity_json)
)
from overall;
$function$;

revoke all on function public.get_student_progress_detail() from public, anon;
grant execute on function public.get_student_progress_detail() to authenticated;
