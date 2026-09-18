-- KOJAC LMS — Management Phase 1B
-- Student 360 Detail + Academic History + LMS Progress.
-- Candidate only. DO NOT APPLY before review.
-- Read-only: no new table, no progress mutation, no academic mutation.
-- Extends existing get_management_student_detail(uuid) additively.

create or replace function public.get_management_student_detail(p_student_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not private.classroom_is_management() then
    raise exception 'management_access_required';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p_student_id
      and ur.role::text = 'siswa'
  ) then
    raise exception 'student_not_found';
  end if;

  with
  enrollment_flags as (
    select
      bool_or(e.status = 'active') as has_active,
      bool_or(e.status = 'paused') as has_paused,
      bool_or(e.status = 'completed') as has_completed,
      min(e.joined_at) as first_joined_at
    from public.class_enrollments e
    where e.user_id = p_student_id
  ),
  student_context as (
    select
      p.user_id,
      p.full_name,
      p.nickname,
      p.is_approved,
      p.is_blocked,
      ef.first_joined_at,
      case
        when coalesce(ef.has_active, false) then 'active'
        when not coalesce(ef.has_paused, false)
          and coalesce(ef.has_completed, false) then 'alumni'
        else 'inactive'
      end as academic_status,
      case
        when p.is_blocked then 'blocked'
        when not p.is_approved then 'pending'
        else 'active'
      end as account_status
    from public.profiles p
    cross join enrollment_flags ef
    where p.user_id = p_student_id
  ),
  published_learning as (
    select li.id, li.item_type
    from public.learning_items li
    where li.is_published = true
      and li.item_type in ('hiragana', 'katakana', 'vocabulary', 'kanji', 'grammar')
  ),
  learning_stats as (
    select
      pl.item_type,
      count(*)::integer as total,
      count(*) filter (
        where case
          when pl.item_type in ('hiragana', 'katakana') then
            coalesce(rp.correct_count, 0) + coalesce(rp.wrong_count, 0) > 0
          else
            rp.last_reviewed_at is not null
            or coalesce(rp.repetitions, 0) > 0
            or coalesce(rp.correct_count, 0) > 0
            or coalesce(rp.wrong_count, 0) > 0
        end
      )::integer as reviewed,
      count(*) filter (
        where coalesce(rp.mastery_score, 0) >= 80
      )::integer as mastered,
      max(rp.last_reviewed_at) as last_activity
    from published_learning pl
    left join public.review_progress rp
      on rp.item_id = pl.id
     and rp.user_id = p_student_id
    group by pl.item_type
  ),
  reading_stats as (
    select
      count(*) filter (
        where rp.completed
          and rp.attempts > 0
      )::integer as attempted,
      count(*) filter (
        where rp.completed
          and rp.attempts > 0
          and rp.best_score >= 80
      )::integer as mastered,
      count(*) filter (
        where rp.completed
          and rp.attempts > 0
          and rp.best_score < 80
          and rp.latest_score < 60
      )::integer as repeat_count,
      max(coalesce(rp.last_completed_at, rp.updated_at)) filter (
        where rp.completed
          and rp.attempts > 0
      ) as last_activity
    from public.reading_progress rp
    where rp.user_id = p_student_id
  ),
  listening_stats as (
    select
      count(*) filter (
        where lp.attempt_count > 0
      )::integer as attempted,
      count(*) filter (
        where lp.completed
      )::integer as completed,
      count(*) filter (
        where lp.best_score >= 80
      )::integer as mastered,
      max(coalesce(lp.last_completed_at, lp.updated_at)) filter (
        where lp.completed
      ) as last_activity
    from public.listening_progress lp
    where lp.user_id = p_student_id
  ),
  last_learning as (
    select max(v.ts) as last_learning_activity
    from (
      select max(ls.last_activity) as ts
      from learning_stats ls
      union all
      select rs.last_activity
      from reading_stats rs
      union all
      select lss.last_activity
      from listening_stats lss
    ) v
  )
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'student_id', sc.user_id,
      'full_name', sc.full_name,
      'nickname', sc.nickname
    ),
    'academic_status', sc.academic_status,
    'account_status', sc.account_status,
    'first_joined_at', sc.first_joined_at,
    'current_classes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'class_id', c.id,
          'class_code', c.code,
          'class_name', c.name,
          'class_status', c.status,
          'program_id', pr.id,
          'program_code', pr.code,
          'program_name', pr.name,
          'teacher_id', c.teacher_id,
          'teacher_name', coalesce(
            nullif(btrim(tp.full_name), ''),
            nullif(btrim(tp.nickname), ''),
            'Belum ditentukan'
          ),
          'enrollment_status', e.status,
          'joined_at', e.joined_at,
          'completed_at', e.completed_at
        )
        order by
          case e.status
            when 'active' then 1
            when 'paused' then 2
            else 3
          end,
          e.joined_at desc,
          c.name
      )
      from public.class_enrollments e
      join public.classes c on c.id = e.class_id
      left join public.programs pr on pr.id = c.program_id
      left join public.profiles tp on tp.user_id = c.teacher_id
      where e.user_id = p_student_id
        and e.status in ('active', 'paused')
    ), '[]'::jsonb),
    'class_history', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'class_id', c.id,
          'class_code', c.code,
          'class_name', c.name,
          'class_status', c.status,
          'program_id', pr.id,
          'program_code', pr.code,
          'program_name', pr.name,
          'teacher_id', c.teacher_id,
          'teacher_name', coalesce(
            nullif(btrim(tp.full_name), ''),
            nullif(btrim(tp.nickname), ''),
            'Belum ditentukan'
          ),
          'enrollment_status', e.status,
          'joined_at', e.joined_at,
          'completed_at', e.completed_at
        )
        order by
          case e.status
            when 'active' then 1
            when 'paused' then 2
            when 'completed' then 3
            when 'cancelled' then 4
            else 5
          end,
          coalesce(e.completed_at, e.joined_at) desc,
          c.name
      )
      from public.class_enrollments e
      join public.classes c on c.id = e.class_id
      left join public.programs pr on pr.id = c.program_id
      left join public.profiles tp on tp.user_id = c.teacher_id
      where e.user_id = p_student_id
    ), '[]'::jsonb),
    'learning_progress', jsonb_build_object(
      'hiragana', (
        select jsonb_build_object(
          'reviewed', ls.reviewed,
          'mastered', ls.mastered,
          'total', ls.total,
          'last_activity', ls.last_activity
        )
        from learning_stats ls
        where ls.item_type = 'hiragana'
      ),
      'katakana', (
        select jsonb_build_object(
          'reviewed', ls.reviewed,
          'mastered', ls.mastered,
          'total', ls.total,
          'last_activity', ls.last_activity
        )
        from learning_stats ls
        where ls.item_type = 'katakana'
      ),
      'vocabulary', (
        select jsonb_build_object(
          'reviewed', ls.reviewed,
          'mastered', ls.mastered,
          'total', ls.total,
          'last_activity', ls.last_activity
        )
        from learning_stats ls
        where ls.item_type = 'vocabulary'
      ),
      'kanji', (
        select jsonb_build_object(
          'reviewed', ls.reviewed,
          'mastered', ls.mastered,
          'total', ls.total,
          'last_activity', ls.last_activity
        )
        from learning_stats ls
        where ls.item_type = 'kanji'
      ),
      'grammar', (
        select jsonb_build_object(
          'reviewed', ls.reviewed,
          'mastered', ls.mastered,
          'total', ls.total,
          'last_activity', ls.last_activity
        )
        from learning_stats ls
        where ls.item_type = 'grammar'
      ),
      'reading', (
        select jsonb_build_object(
          'attempted', rs.attempted,
          'mastered', rs.mastered,
          'repeat', rs.repeat_count,
          'total', null,
          'last_activity', rs.last_activity
        )
        from reading_stats rs
      ),
      'listening', (
        select jsonb_build_object(
          'attempted', lss.attempted,
          'completed', lss.completed,
          'mastered', lss.mastered,
          'total', null,
          'last_activity', lss.last_activity
        )
        from listening_stats lss
      ),
      'last_learning_activity', ll.last_learning_activity
    )
  )
  into v_result
  from student_context sc
  cross join last_learning ll;

  if v_result is null then
    raise exception 'student_not_found';
  end if;

  return v_result;
end
$$;

revoke all on function public.get_management_student_detail(uuid) from public;
revoke all on function public.get_management_student_detail(uuid) from anon;
grant execute on function public.get_management_student_detail(uuid) to authenticated;
