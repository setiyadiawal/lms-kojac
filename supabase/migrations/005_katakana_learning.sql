-- KOJAC LMS — Katakana learning module
-- Incremental migration untuk project yang SUDAH memiliki Foundation + Hiragana stabil.
-- Aman untuk dijalankan ulang (idempotent).
--
-- PENTING:
-- - TIDAK membuat tabel baru.
-- - TIDAK mengubah / menonaktifkan RLS.
-- - TIDAK mengubah record_hiragana_review().
-- - TIDAK menghapus / mereset data atau progress Hiragana.
-- - Katakana memakai learning_items + review_progress existing dengan UUID item terpisah.

begin;

-- Fail-fast: migration ini hanya boleh berjalan di schema KOJAC yang sudah lengkap.
-- Jika Foundation/Hiragana belum siap atau RLS existing tidak aktif, batalkan seluruh migration.
do $preflight$
declare
  v_learning_items_rls boolean;
  v_review_progress_rls boolean;
  v_hiragana_count integer;
begin
  if to_regclass('public.learning_items') is null then
    raise exception 'KOJAC preflight: public.learning_items belum ada. Jalankan migration Foundation yang benar terlebih dahulu; jangan membuat tabel baru dari migration Katakana.';
  end if;

  if to_regclass('public.review_progress') is null then
    raise exception 'KOJAC preflight: public.review_progress belum ada. Jalankan migration Foundation yang benar terlebih dahulu.';
  end if;

  if to_regprocedure('public.record_hiragana_review(uuid,smallint)') is null then
    raise exception 'KOJAC preflight: record_hiragana_review(uuid, smallint) belum tersedia. Selesaikan migration Hiragana stabil terlebih dahulu.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'review_progress'
      and column_name = 'correct_count'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'review_progress'
      and column_name = 'wrong_count'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'review_progress'
      and column_name = 'mastery_score'
  ) then
    raise exception 'KOJAC preflight: kolom progress Hiragana belum lengkap (correct_count/wrong_count/mastery_score). Jangan lanjutkan migration Katakana.';
  end if;

  select c.relrowsecurity
  into v_learning_items_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'learning_items'
    and c.relkind = 'r';

  select c.relrowsecurity
  into v_review_progress_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'review_progress'
    and c.relkind = 'r';

  if coalesce(v_learning_items_rls, false) = false then
    raise exception 'KOJAC preflight: RLS public.learning_items tidak aktif. Migration dibatalkan agar security Hiragana tidak diubah secara diam-diam.';
  end if;

  if coalesce(v_review_progress_rls, false) = false then
    raise exception 'KOJAC preflight: RLS public.review_progress tidak aktif. Migration dibatalkan agar security progress tidak diubah secara diam-diam.';
  end if;

  select count(*)
  into v_hiragana_count
  from public.learning_items
  where item_type = 'hiragana'
    and is_published = true;

  if v_hiragana_count <> 104 then
    raise exception 'KOJAC preflight: dataset Hiragana published harus 104 item, ditemukan % item. Katakana tidak dibuat dari baseline yang tidak lengkap.', v_hiragana_count;
  end if;
end
$preflight$;

-- RPC review khusus item Katakana.
-- Nama tetap record_learning_review karena client Katakana sudah memakai endpoint ini,
-- tetapi guard item_type dibuat ketat agar tidak mengubah jalur review Hiragana yang stabil.
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
      and li.item_type = 'katakana'
      and li.is_published = true
  ) then
    raise exception 'published katakana item not found';
  end if;

  -- Sama seperti hotfix Hiragana stabil: row dibuat idempotent lalu dikunci,
  -- sehingga review pertama yang bersamaan tidak menghasilkan race condition.
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

-- Dataset Katakana berasal dari 104 learning item Hiragana existing.
-- Hanya karakter prompt yang dikonversi; reading, variant, group dan sort_order
-- menggunakan metadata kurikulum yang sama. UUID Katakana tetap dibuat terpisah.
with source_katakana as (
  select
    translate(
      li.prompt,
      'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょ',
      'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポャュョ'
    ) as prompt,
    li.reading,
    li.extra
  from public.learning_items as li
  where li.item_type = 'hiragana'
    and li.is_published = true
), updated_existing as (
  update public.learning_items as existing
  set jlpt_level = 'kana',
      extra = source.extra,
      is_published = true
  from source_katakana as source
  where existing.item_type = 'katakana'
    and existing.prompt = source.prompt
    and coalesce(existing.reading, '') = coalesce(source.reading, '')
  returning existing.id
)
insert into public.learning_items (
  item_type, jlpt_level, prompt, reading, extra, is_published
)
select
  'katakana', 'kana', source.prompt, source.reading, source.extra, true
from source_katakana as source
where not exists (
  select 1
  from public.learning_items as existing
  where existing.item_type = 'katakana'
    and existing.prompt = source.prompt
    and coalesce(existing.reading, '') = coalesce(source.reading, '')
);

-- Post-validation: jika dataset hasil konversi tidak persis seperti yang diharapkan,
-- transaction gagal sehingga tidak ada perubahan parsial yang tertinggal.
do $validate$
declare
  v_total integer;
  v_basic integer;
  v_dakuten integer;
  v_handakuten integer;
  v_yoon integer;
begin
  select
    count(*),
    count(*) filter (where extra->>'variant' = 'basic'),
    count(*) filter (where extra->>'variant' = 'dakuten'),
    count(*) filter (where extra->>'variant' = 'handakuten'),
    count(*) filter (where extra->>'variant' = 'yoon')
  into v_total, v_basic, v_dakuten, v_handakuten, v_yoon
  from public.learning_items
  where item_type = 'katakana'
    and is_published = true;

  if v_total <> 104 or v_basic <> 46 or v_dakuten <> 20 or v_handakuten <> 5 or v_yoon <> 33 then
    raise exception 'KOJAC validation: dataset Katakana tidak valid. total=% basic=% dakuten=% handakuten=% yoon=%',
      v_total, v_basic, v_dakuten, v_handakuten, v_yoon;
  end if;

  if not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ア' and reading='a' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='キ' and reading='ki' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='シ' and reading='shi' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ツ' and reading='tsu' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ソ' and reading='so' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ン' and reading='n' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ガ' and reading='ga' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ジ' and reading='ji' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ヅ' and reading='zu' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ブ' and reading='bu' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='パ' and reading='pa' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ピ' and reading='pi' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='プ' and reading='pu' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='キャ' and reading='kya' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='シュ' and reading='shu' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='チョ' and reading='cho' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ギュ' and reading='gyu' and is_published=true)
     or not exists (select 1 from public.learning_items where item_type='katakana' and prompt='ピョ' and reading='pyo' and is_published=true)
  then
    raise exception 'KOJAC validation: mapping karakter Katakana penting tidak sesuai. Migration dibatalkan.';
  end if;
end
$validate$;

commit;
