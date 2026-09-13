-- KOJAC LMS — Vocabulary jenis / kelas kata
-- Incremental migration setelah 006_vocabulary_chapter_1.sql.
--
-- Menambahkan metadata extra.jenis pada 80 Vocabulary Bab 1 existing.
-- Nilai yang digunakan KOJAC:
--   KB, KK, KS-i, KS-na, UNG
--
-- AMAN:
-- - Tidak membuat / menghapus tabel.
-- - Tidak mengubah RLS.
-- - Tidak mengubah Kanji, Kana, Romaji, arti, kategori, Bab, atau urutan.
-- - Tidak menyentuh review_progress, Hiragana, atau Katakana.
-- - Hanya menambah / memperbarui key JSON extra.jenis pada dataset Vocabulary Bab 1.

begin;

-- Fail-fast: pastikan dataset Bab 1 yang akan diklasifikasikan adalah baseline 80 item.
do $preflight$
declare
  v_total integer;
  v_learning_items_rls boolean;
begin
  if to_regclass('public.learning_items') is null then
    raise exception 'KOJAC preflight: public.learning_items belum ada. Jangan jalankan Foundation ulang.';
  end if;

  select c.relrowsecurity
  into v_learning_items_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'learning_items'
    and c.relkind = 'r';

  if coalesce(v_learning_items_rls, false) = false then
    raise exception 'KOJAC preflight: RLS public.learning_items tidak aktif. Migration dibatalkan.';
  end if;

  select count(*)
  into v_total
  from public.learning_items
  where item_type = 'vocabulary'
    and is_published = true
    and extra->>'chapter_number' = '1'
    and extra->>'dataset' = 'vocabulary_chapter_1';

  if v_total <> 80 then
    raise exception 'KOJAC preflight: Vocabulary Bab 1 dataset vocabulary_chapter_1 harus tepat 80 item, ditemukan %.', v_total;
  end if;
end
$preflight$;

with jenis_map(sort_order, jenis) as (
  values
    (1, 'KB'),
    (2, 'KB'),
    (3, 'KB'),
    (4, 'KB'),
    (5, 'KB'),
    (6, 'KB'),
    (7, 'KB'),
    (8, 'KB'),
    (9, 'KB'),
    (10, 'KB'),
    (11, 'KB'),
    (12, 'KB'),
    (13, 'KB'),
    (14, 'KB'),
    (15, 'KB'),
    (16, 'KB'),
    (17, 'KB'),
    (18, 'KB'),
    (19, 'KB'),
    (20, 'KB'),
    (21, 'KB'),
    (22, 'KB'),
    (23, 'KB'),
    (24, 'KB'),
    (25, 'KB'),
    (26, 'KB'),
    (27, 'KB'),
    (28, 'KB'),
    (29, 'KB'),
    (30, 'KB'),
    (31, 'KB'),
    (32, 'KB'),
    (33, 'KB'),
    (34, 'KB'),
    (35, 'KB'),
    (36, 'KB'),
    (37, 'KB'),
    (38, 'KB'),
    (39, 'KB'),
    (40, 'KB'),
    (41, 'KB'),
    (42, 'KB'),
    (43, 'KB'),
    (44, 'KB'),
    (45, 'KB'),
    (46, 'KB'),
    (47, 'KB'),
    (48, 'KB'),
    (49, 'KB'),
    (50, 'KB'),
    (51, 'KB'),
    (52, 'KB'),
    (53, 'KB'),
    (54, 'KB'),
    (55, 'KB'),
    (56, 'KB'),
    (57, 'KB'),
    (58, 'KB'),
    (59, 'KB'),
    (60, 'KB'),
    (61, 'KB'),
    (62, 'KB'),
    (63, 'KB'),
    (64, 'KB'),
    (65, 'KB'),
    (66, 'KB'),
    (67, 'KB'),
    (68, 'KB'),
    (69, 'KB'),
    (70, 'UNG'),
    (71, 'UNG'),
    (72, 'UNG'),
    (73, 'KK'),
    (74, 'UNG'),
    (75, 'UNG'),
    (76, 'UNG'),
    (77, 'UNG'),
    (78, 'UNG'),
    (79, 'UNG'),
    (80, 'KK')
)
update public.learning_items as li
set extra = jsonb_set(li.extra, '{jenis}', to_jsonb(jm.jenis::text), true)
from jenis_map as jm
where li.item_type = 'vocabulary'
  and li.is_published = true
  and li.extra->>'chapter_number' = '1'
  and li.extra->>'dataset' = 'vocabulary_chapter_1'
  and (li.extra->>'sort_order')::integer = jm.sort_order;

-- Validasi akhir: semua 80 item wajib punya jenis valid, tanpa mengubah metadata lain.
do $validate$
declare
  v_total integer;
  v_missing integer;
  v_invalid integer;
  v_kb integer;
  v_kk integer;
  v_ksi integer;
  v_ksna integer;
  v_ung integer;
begin
  select
    count(*),
    count(*) filter (where coalesce(extra->>'jenis', '') = ''),
    count(*) filter (where coalesce(extra->>'jenis', '') not in ('KB','KK','KS-i','KS-na','UNG')),
    count(*) filter (where extra->>'jenis' = 'KB'),
    count(*) filter (where extra->>'jenis' = 'KK'),
    count(*) filter (where extra->>'jenis' = 'KS-i'),
    count(*) filter (where extra->>'jenis' = 'KS-na'),
    count(*) filter (where extra->>'jenis' = 'UNG')
  into v_total, v_missing, v_invalid, v_kb, v_kk, v_ksi, v_ksna, v_ung
  from public.learning_items
  where item_type = 'vocabulary'
    and is_published = true
    and extra->>'chapter_number' = '1'
    and extra->>'dataset' = 'vocabulary_chapter_1';

  if v_total <> 80 or v_missing <> 0 or v_invalid <> 0 then
    raise exception 'KOJAC validation: jenis Vocabulary Bab 1 tidak lengkap/valid. total=%, kosong=%, invalid=%',
      v_total, v_missing, v_invalid;
  end if;

  -- Baseline klasifikasi Bab 1 saat ini: 69 KB, 2 KK, 0 KS-i, 0 KS-na, 9 UNG.
  if v_kb <> 69 or v_kk <> 2 or v_ksi <> 0 or v_ksna <> 0 or v_ung <> 9 then
    raise exception 'KOJAC validation: distribusi jenis Bab 1 tidak sesuai. KB=%, KK=%, KS-i=%, KS-na=%, UNG=%',
      v_kb, v_kk, v_ksi, v_ksna, v_ung;
  end if;

  -- Beberapa pemeriksaan representatif agar jenis dan kategori tidak tertukar.
  if not exists (
    select 1 from public.learning_items
    where item_type='vocabulary' and prompt='国' and reading='くに'
      and extra->>'jenis'='KB' and extra->>'category'='Negara'
      and extra->>'chapter_number'='1' and is_published=true
  ) or not exists (
    select 1 from public.learning_items
    where item_type='vocabulary' and prompt='お願いします' and reading='おねがいします'
      and extra->>'jenis'='KK' and extra->>'category'='Ungkapan'
      and extra->>'chapter_number'='1' and is_published=true
  ) or not exists (
    select 1 from public.learning_items
    where item_type='vocabulary' and prompt='はい' and reading='はい'
      and extra->>'jenis'='UNG' and extra->>'category'='Ungkapan'
      and extra->>'chapter_number'='1' and is_published=true
  ) or not exists (
    select 1 from public.learning_items
    where item_type='vocabulary' and prompt='違います' and reading='ちがいます'
      and extra->>'jenis'='KK' and extra->>'category'='Ungkapan'
      and extra->>'chapter_number'='1' and is_published=true
  ) then
    raise exception 'KOJAC validation: klasifikasi representatif Vocabulary Bab 1 tidak sesuai.';
  end if;
end
$validate$;

commit;

-- Verifikasi opsional setelah Run:
-- select extra->>'jenis' as jenis, count(*) as total
-- from public.learning_items
-- where item_type='vocabulary' and is_published=true
--   and extra->>'chapter_number'='1'
-- group by extra->>'jenis'
-- order by extra->>'jenis';
