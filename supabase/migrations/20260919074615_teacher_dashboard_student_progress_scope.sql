-- KOJAC LMS v1.1 — Teacher Dashboard student progress scope
-- Production migration version: 20260919074615
-- Already applied to production through Supabase migration mechanism.

create or replace function private.get_scoped_class_student_progress(p_class_id uuid)
returns table (
  student_id uuid,
  full_name text,
  nickname text,
  enrollment_status text,
  joined_at timestamptz,
  overall_percent integer,
  modules_active integer,
  hiragana_percent integer,
  katakana_percent integer,
  vocabulary_percent integer,
  kanji_percent integer,
  grammar_percent integer,
  reading_percent integer,
  listening_percent integer,
  last_learning_activity timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

  select ur.role
  into v_actor_role
  from public.user_roles ur
  where ur.user_id = v_actor;

  if v_actor_role is null
    or v_actor_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teaching_access_required';
  end if;

  if not exists (
    select 1
    from public.classes c
    where c.id = p_class_id
  ) then
    raise exception 'class_not_found';
  end if;

  if not private.classroom_can_teach_class(p_class_id, null) then
    raise exception 'teacher_class_access_denied';
  end if;

  return query
  select
    e.user_id,
    p.full_name,
    p.nickname,
    e.status::text,
    e.joined_at,
    round((
      s.hiragana_percent
      + s.katakana_percent
      + s.vocabulary_percent
      + s.kanji_percent
      + s.grammar_percent
      + r.reading_percent
      + l.listening_percent
    ) / 7.0)::integer as overall_percent,
    (
      (case when s.hiragana_started > 0 then 1 else 0 end)
      + (case when s.katakana_started > 0 then 1 else 0 end)
      + (case when s.vocabulary_started > 0 then 1 else 0 end)
      + (case when s.kanji_started > 0 then 1 else 0 end)
      + (case when s.grammar_started > 0 then 1 else 0 end)
      + (case when r.reading_completed > 0 then 1 else 0 end)
      + (case when l.listening_completed > 0 then 1 else 0 end)
    )::integer as modules_active,
    s.hiragana_percent,
    s.katakana_percent,
    s.vocabulary_percent,
    s.kanji_percent,
    s.grammar_percent,
    r.reading_percent,
    l.listening_percent,
    (
      select max(v.ts)
      from (
        values
          (s.last_activity),
          (r.last_activity),
          (l.last_activity)
      ) as v(ts)
    ) as last_learning_activity
  from public.class_enrollments e
  join public.profiles p
    on p.user_id = e.user_id
  cross join lateral (
    select
      coalesce(round(avg(coalesce(rp.mastery_score, 0))
        filter (where li.item_type = 'hiragana')), 0)::integer as hiragana_percent,
      coalesce(round(avg(coalesce(rp.mastery_score, 0))
        filter (where li.item_type = 'katakana')), 0)::integer as katakana_percent,
      coalesce(round(avg(coalesce(rp.mastery_score, 0))
        filter (where li.item_type = 'vocabulary')), 0)::integer as vocabulary_percent,
      coalesce(round(avg(coalesce(rp.mastery_score, 0))
        filter (where li.item_type = 'kanji')), 0)::integer as kanji_percent,
      coalesce(round(avg(coalesce(rp.mastery_score, 0))
        filter (where li.item_type = 'grammar')), 0)::integer as grammar_percent,

      count(*) filter (
        where li.item_type = 'hiragana'
          and (
            rp.last_reviewed_at is not null
            or coalesce(rp.correct_count, 0) > 0
            or coalesce(rp.wrong_count, 0) > 0
          )
      )::integer as hiragana_started,

      count(*) filter (
        where li.item_type = 'katakana'
          and (
            rp.last_reviewed_at is not null
            or coalesce(rp.correct_count, 0) > 0
            or coalesce(rp.wrong_count, 0) > 0
          )
      )::integer as katakana_started,

      count(*) filter (
        where li.item_type = 'vocabulary'
          and (
            rp.last_reviewed_at is not null
            or coalesce(rp.correct_count, 0) > 0
            or coalesce(rp.wrong_count, 0) > 0
          )
      )::integer as vocabulary_started,

      count(*) filter (
        where li.item_type = 'kanji'
          and (
            rp.last_reviewed_at is not null
            or coalesce(rp.correct_count, 0) > 0
            or coalesce(rp.wrong_count, 0) > 0
          )
      )::integer as kanji_started,

      count(*) filter (
        where li.item_type = 'grammar'
          and (
            rp.last_reviewed_at is not null
            or coalesce(rp.correct_count, 0) > 0
            or coalesce(rp.wrong_count, 0) > 0
          )
      )::integer as grammar_started,

      max(rp.last_reviewed_at) as last_activity
    from public.learning_items li
    left join public.review_progress rp
      on rp.item_id = li.id
     and rp.user_id = e.user_id
    where li.is_published = true
      and li.item_type in (
        'hiragana',
        'katakana',
        'vocabulary',
        'kanji',
        'grammar'
      )
  ) s
  cross join lateral (
    select
      count(*) filter (
        where rp.completed
          and rp.attempts > 0
      )::integer as reading_completed,

      case
        when 176 > 0 then round(
          100.0 * (
            count(*) filter (
              where rp.completed
                and rp.attempts > 0
                and rp.best_score >= 80
            )
            + greatest(
                count(*) filter (
                  where rp.completed
                    and rp.attempts > 0
                )
                - count(*) filter (
                  where rp.completed
                    and rp.attempts > 0
                    and rp.best_score >= 80
                ),
                0
              ) * 0.5
          ) / 176
        )::integer
        else 0
      end as reading_percent,

      max(coalesce(rp.last_completed_at, rp.updated_at))
        filter (
          where rp.completed
            and rp.attempts > 0
        ) as last_activity
    from public.reading_progress rp
    where rp.user_id = e.user_id
  ) r
  cross join lateral (
    select
      count(*) filter (
        where lp.completed
      )::integer as listening_completed,

      case
        when 175 > 0 then round(
          100.0
          * count(*) filter (where lp.completed)
          / 175
        )::integer
        else 0
      end as listening_percent,

      max(coalesce(lp.last_completed_at, lp.updated_at))
        filter (where lp.completed) as last_activity
    from public.listening_progress lp
    where lp.user_id = e.user_id
  ) l
  where e.class_id = p_class_id
    and e.status <> 'cancelled'
  order by
    case e.status
      when 'active' then 1
      when 'paused' then 2
      when 'completed' then 3
      else 4
    end,
    p.full_name nulls last,
    e.joined_at desc;
end
$$;

revoke all
on function private.get_scoped_class_student_progress(uuid)
from public;

revoke execute
on function private.get_scoped_class_student_progress(uuid)
from anon;

grant execute
on function private.get_scoped_class_student_progress(uuid)
to authenticated;

create or replace function public.get_my_class_student_progress(p_class_id uuid)
returns table (
  student_id uuid,
  full_name text,
  nickname text,
  enrollment_status text,
  joined_at timestamptz,
  overall_percent integer,
  modules_active integer,
  hiragana_percent integer,
  katakana_percent integer,
  vocabulary_percent integer,
  kanji_percent integer,
  grammar_percent integer,
  reading_percent integer,
  listening_percent integer,
  last_learning_activity timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select *
  from private.get_scoped_class_student_progress(p_class_id)
$$;

revoke all
on function public.get_my_class_student_progress(uuid)
from public;

revoke execute
on function public.get_my_class_student_progress(uuid)
from anon;

grant execute
on function public.get_my_class_student_progress(uuid)
to authenticated;
