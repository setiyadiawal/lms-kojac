-- KOJAC LMS — Fix record_learning_review() ambiguous item_id
-- Incremental migration setelah 008_vocabulary_srs_mastery.sql.
--
-- Root cause:
-- RETURNS TABLE membuat nama output `item_id` menjadi variable PL/pgSQL implisit.
-- Pada `ON CONFLICT (user_id, item_id)`, identifier `item_id` dapat dibaca sebagai
-- output variable PL/pgSQL atau column review_progress.item_id, sehingga PostgreSQL
-- melempar: column reference "item_id" is ambiguous.
--
-- Fix:
-- - Signature RPC tetap public.record_learning_review(uuid, smallint).
-- - Parameter p_item_id / p_rating tetap sama (frontend Katakana + Vocabulary aman).
-- - Formula SRS/mastery/interval TIDAK diubah.
-- - INSERT idempotent memakai primary-key constraint secara eksplisit sehingga
--   tidak ada lagi identifier item_id ambigu di conflict target.
-- - RLS, auth.uid(), SECURITY DEFINER, search_path, grants tetap dipertahankan.
-- - Tidak mengubah atau menghapus data review_progress existing.

begin;

-- Fail fast bila baseline database tidak sesuai dengan project KOJAC yang sudah stabil.
do $preflight$
declare
  v_rls_enabled boolean;
begin
  if to_regclass('public.review_progress') is null then
    raise exception 'KOJAC preflight: public.review_progress tidak ditemukan.';
  end if;

  if to_regclass('public.learning_items') is null then
    raise exception 'KOJAC preflight: public.learning_items tidak ditemukan.';
  end if;

  if to_regprocedure('public.record_learning_review(uuid,smallint)') is null then
    raise exception 'KOJAC preflight: record_learning_review(uuid, smallint) tidak ditemukan.';
  end if;

  if to_regprocedure('public.record_hiragana_review(uuid,smallint)') is null then
    raise exception 'KOJAC preflight: record_hiragana_review(uuid, smallint) tidak ditemukan. Hiragana harus tetap utuh.';
  end if;

  if not exists (
    select 1
    from pg_constraint as c
    where c.conrelid = 'public.review_progress'::regclass
      and c.contype = 'p'
      and c.conname = 'review_progress_pkey'
  ) then
    raise exception 'KOJAC preflight: primary key review_progress_pkey tidak ditemukan.';
  end if;

  select c.relrowsecurity
  into v_rls_enabled
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'review_progress'
    and c.relkind = 'r';

  if coalesce(v_rls_enabled, false) = false then
    raise exception 'KOJAC preflight: RLS review_progress tidak aktif. Migration dibatalkan.';
  end if;
end
$preflight$;

create or replace function public.record_learning_review(
  p_item_id uuid,
  p_rating smallint
)
returns table(
  item_id uuid,
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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.review_progress%rowtype;
  v_new_repetitions integer;
  v_new_interval integer;
  v_new_ease numeric(4,2);
  v_new_mastery integer;
  v_new_due timestamptz;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  if p_rating is null or p_rating < 0 or p_rating > 3 then
    raise exception 'rating must be between 0 and 3';
  end if;

  if not exists (
    select 1
    from public.learning_items as li
    where li.id = p_item_id
      and li.item_type in ('katakana', 'vocabulary')
      and li.is_published = true
  ) then
    raise exception 'published Katakana/Vocabulary item not found';
  end if;

  -- Pastikan row progress tersedia. Perbaikan ambiguity ada di conflict clause ini:
  -- gunakan nama constraint, bukan `ON CONFLICT (user_id, item_id)`.
  insert into public.review_progress (
    user_id, item_id, repetitions, interval_days, ease_factor, due_at,
    last_rating, last_reviewed_at, correct_count, wrong_count, mastery_score
  ) values (
    v_user, p_item_id, 0, 0, 2.50, now(), null, null, 0, 0, 0
  )
  on conflict on constraint review_progress_pkey do nothing;

  -- Semua column reference dalam expression memakai alias table eksplisit.
  select rp.*
  into strict v_row
  from public.review_progress as rp
  where rp.user_id = v_user
    and rp.item_id = p_item_id
  for update;

  v_new_ease := greatest(
    1.30,
    least(
      3.50,
      v_row.ease_factor + case p_rating
        when 0 then -0.20
        when 1 then -0.10
        when 3 then 0.10
        else 0
      end
    )
  );

  v_new_repetitions := case
    when p_rating = 0 then 0
    else v_row.repetitions + 1
  end;

  v_new_interval := case
    when p_rating = 0 then 0
    when p_rating = 1 then 1
    when p_rating = 2 and v_row.repetitions = 0 then 1
    when p_rating = 2 and v_row.repetitions = 1 then 3
    when p_rating = 2 then greatest(1, round(greatest(v_row.interval_days, 1) * v_new_ease)::integer)
    when p_rating = 3 and v_row.repetitions = 0 then 4
    else greatest(2, round(greatest(v_row.interval_days, 1) * v_new_ease * 1.30)::integer)
  end;

  v_new_mastery := least(
    100,
    greatest(
      0,
      v_row.mastery_score + case p_rating
        when 0 then -15
        when 1 then 5
        when 2 then 12
        else 18
      end
    )
  );

  v_new_due := case
    when p_rating = 0 then now() + interval '10 minutes'
    else now() + make_interval(days => v_new_interval)
  end;

  update public.review_progress as rp
  set repetitions = v_new_repetitions,
      interval_days = v_new_interval,
      ease_factor = v_new_ease,
      due_at = v_new_due,
      last_rating = p_rating,
      last_reviewed_at = now(),
      correct_count = rp.correct_count + case when p_rating >= 2 then 1 else 0 end,
      wrong_count = rp.wrong_count + case when p_rating < 2 then 1 else 0 end,
      mastery_score = v_new_mastery
  where rp.user_id = v_user
    and rp.item_id = p_item_id
  returning rp.* into v_row;

  return query
  select
    v_row.item_id,
    v_row.repetitions,
    v_row.interval_days,
    v_row.ease_factor,
    v_row.due_at,
    v_row.last_rating,
    v_row.last_reviewed_at,
    v_row.correct_count,
    v_row.wrong_count,
    v_row.mastery_score;
end;
$$;

-- Pertahankan permission existing.
revoke all on function public.record_learning_review(uuid, smallint) from public, anon;
grant execute on function public.record_learning_review(uuid, smallint) to authenticated;

-- Post-check security contract setelah CREATE OR REPLACE.
do $validate$
declare
  v_security_definer boolean;
  v_search_path_ok boolean;
  v_rls_enabled boolean;
begin
  select p.prosecdef,
         coalesce('search_path=public' = any(p.proconfig), false)
  into v_security_definer, v_search_path_ok
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'record_learning_review'
    and p.proargtypes = '2950 21'::oidvector;

  if coalesce(v_security_definer, false) = false then
    raise exception 'KOJAC validation: SECURITY DEFINER record_learning_review tidak aktif.';
  end if;

  if coalesce(v_search_path_ok, false) = false then
    raise exception 'KOJAC validation: search_path record_learning_review berubah.';
  end if;

  select c.relrowsecurity
  into v_rls_enabled
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'review_progress'
    and c.relkind = 'r';

  if coalesce(v_rls_enabled, false) = false then
    raise exception 'KOJAC validation: RLS review_progress berubah/nonaktif.';
  end if;

  if to_regprocedure('public.record_hiragana_review(uuid,smallint)') is null then
    raise exception 'KOJAC validation: RPC Hiragana tidak tersedia.';
  end if;
end
$validate$;

commit;
