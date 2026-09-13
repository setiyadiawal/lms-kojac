-- KOJAC LMS — Vocabulary SRS + Mastery
-- Incremental migration untuk project existing yang sudah memiliki Hiragana/Katakana stabil.
--
-- Tujuan:
-- - REUSE public.review_progress existing.
-- - REUSE algoritma SRS public.record_learning_review() existing.
-- - Memperluas RPC generik agar menerima published Vocabulary tanpa mengubah jalur Hiragana.
-- - Tidak membuat tabel progress baru.
-- - Tidak mengubah RLS.
-- - Tidak mengubah data learning_items / review_progress existing.
--
-- Catatan:
-- KOJAC existing memakai review_progress.due_at sebagai waktu review berikutnya.
-- Karena itu migration ini TIDAK membuat kolom next_review_at duplikat.

begin;

-- Fail-fast: hanya lanjut jika baseline progress KOJAC masih lengkap dan aman.
do $preflight$
declare
  v_learning_items_rls boolean;
  v_review_progress_rls boolean;
begin
  if to_regclass('public.learning_items') is null then
    raise exception 'KOJAC preflight: public.learning_items belum tersedia.';
  end if;

  if to_regclass('public.review_progress') is null then
    raise exception 'KOJAC preflight: public.review_progress belum tersedia.';
  end if;

  if to_regprocedure('public.record_hiragana_review(uuid,smallint)') is null then
    raise exception 'KOJAC preflight: record_hiragana_review(uuid, smallint) belum tersedia. Hiragana stabil harus tetap utuh.';
  end if;

  if to_regprocedure('public.record_learning_review(uuid,smallint)') is null then
    raise exception 'KOJAC preflight: record_learning_review(uuid, smallint) belum tersedia. Jalankan migration Katakana stabil terlebih dahulu.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='review_progress' and column_name='correct_count'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='review_progress' and column_name='wrong_count'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='review_progress' and column_name='mastery_score'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='review_progress' and column_name='due_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='review_progress' and column_name='last_reviewed_at'
  ) then
    raise exception 'KOJAC preflight: struktur review_progress belum lengkap.';
  end if;

  select c.relrowsecurity
  into v_learning_items_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname='public' and c.relname='learning_items' and c.relkind='r';

  select c.relrowsecurity
  into v_review_progress_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname='public' and c.relname='review_progress' and c.relkind='r';

  if coalesce(v_learning_items_rls, false) = false then
    raise exception 'KOJAC preflight: RLS public.learning_items tidak aktif. Migration dibatalkan.';
  end if;

  if coalesce(v_review_progress_rls, false) = false then
    raise exception 'KOJAC preflight: RLS public.review_progress tidak aktif. Migration dibatalkan.';
  end if;

  if not exists (
    select 1 from public.learning_items
    where item_type='vocabulary' and is_published=true
  ) then
    raise exception 'KOJAC preflight: belum ada published Vocabulary. Migration dibatalkan agar baseline diperiksa dulu.';
  end if;
end
$preflight$;

-- Backward-compatible extension dari RPC Katakana existing.
-- Signature tetap sama sehingga client Katakana tidak perlu berubah.
-- Guard hanya diperluas dari Katakana menjadi Katakana + Vocabulary.
-- Hiragana tetap menggunakan record_hiragana_review() yang tidak disentuh.
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

  -- Idempotent row creation + row lock: mempertahankan reliability hotfix KOJAC.
  insert into public.review_progress (
    user_id, item_id, repetitions, interval_days, ease_factor, due_at,
    last_rating, last_reviewed_at, correct_count, wrong_count, mastery_score
  ) values (
    v_user, p_item_id, 0, 0, 2.50, now(), null, null, 0, 0, 0
  )
  on conflict (user_id, item_id) do nothing;

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

revoke all on function public.record_learning_review(uuid, smallint) from public, anon;
grant execute on function public.record_learning_review(uuid, smallint) to authenticated;

-- Post-check struktur/security yang tidak boleh berubah.
do $validate$
declare
  v_review_progress_rls boolean;
begin
  if to_regprocedure('public.record_hiragana_review(uuid,smallint)') is null then
    raise exception 'KOJAC validation: RPC Hiragana hilang. Transaction dibatalkan.';
  end if;

  if to_regprocedure('public.record_learning_review(uuid,smallint)') is null then
    raise exception 'KOJAC validation: RPC learning review tidak tersedia. Transaction dibatalkan.';
  end if;

  select c.relrowsecurity
  into v_review_progress_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname='public' and c.relname='review_progress' and c.relkind='r';

  if coalesce(v_review_progress_rls, false) = false then
    raise exception 'KOJAC validation: RLS review_progress berubah/nonaktif. Transaction dibatalkan.';
  end if;
end
$validate$;

commit;

-- Verifikasi manual setelah migration berhasil:
-- 1) Login ke aplikasi, beri rating Flashcard Vocabulary atau jawab satu soal Quiz.
-- 2) Jalankan query read-only yang akan diberikan pada panduan implementasi.
