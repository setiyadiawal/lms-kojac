-- KOJAC LMS — Vocabulary Bab 1
-- Phase 1A: data Vocabulary + metadata Bab
-- Dataset original KOJAC, disusun untuk topik awal: perkenalan, identitas, pekerjaan,
-- negara/kebangsaan, bahasa, kontak, kata tanya, usia, dan ungkapan dasar.
--
-- AMAN:
-- - Incremental: tidak mengubah migration lama.
-- - Tidak membuat / menghapus tabel.
-- - Tidak mengubah RLS.
-- - Tidak menyentuh Hiragana, Katakana, atau review_progress.
-- - Aman dijalankan ulang: unique index existing mencegah duplikasi item yang sama.
--
-- Target akhir:
-- - 80 Vocabulary published pada Bab 1.
-- - UI Kosakata akan membentuk card Bab 1 otomatis dari extra.chapter_number.

begin;

-- Fail-fast: pastikan baseline KOJAC yang dibutuhkan masih tersedia.
do $preflight$
declare
  v_learning_items_rls boolean;
begin
  if to_regclass('public.learning_items') is null then
    raise exception 'KOJAC preflight: public.learning_items belum ada. Jangan jalankan Foundation ulang; periksa baseline project terlebih dahulu.';
  end if;

  select c.relrowsecurity
  into v_learning_items_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'learning_items'
    and c.relkind = 'r';

  if coalesce(v_learning_items_rls, false) = false then
    raise exception 'KOJAC preflight: RLS public.learning_items tidak aktif. Migration dibatalkan agar security existing tidak diubah.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.learning_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%vocabulary%'
  ) then
    raise exception 'KOJAC preflight: learning_items belum mengizinkan item_type vocabulary. Jangan ubah schema secara manual sebelum audit.';
  end if;
end
$preflight$;

with source_words (
  sort_order,
  prompt,
  reading,
  romaji,
  meaning_id,
  category
) as (
  values
  (1, '私', 'わたし', 'watashi', 'saya', 'Orang'),
  (2, 'あなた', 'あなた', 'anata', 'kamu / Anda', 'Orang'),
  (3, 'あの人', 'あのひと', 'ano hito', 'orang itu', 'Orang'),
  (4, 'あの方', 'あのかた', 'ano kata', 'orang itu (sopan)', 'Orang'),
  (5, '皆さん', 'みなさん', 'minasan', 'semuanya / hadirin', 'Orang'),
  (6, '先生', 'せんせい', 'sensei', 'guru / pengajar (sebutan)', 'Pekerjaan'),
  (7, '教師', 'きょうし', 'kyoushi', 'guru / pengajar (profesi)', 'Pekerjaan'),
  (8, '学生', 'がくせい', 'gakusei', 'pelajar / mahasiswa', 'Pekerjaan'),
  (9, '会社員', 'かいしゃいん', 'kaishain', 'pegawai perusahaan', 'Pekerjaan'),
  (10, '社員', 'しゃいん', 'shain', 'pegawai / karyawan perusahaan', 'Pekerjaan'),
  (11, '銀行員', 'ぎんこういん', 'ginkouin', 'pegawai bank', 'Pekerjaan'),
  (12, '医者', 'いしゃ', 'isha', 'dokter', 'Pekerjaan'),
  (13, '研究者', 'けんきゅうしゃ', 'kenkyuusha', 'peneliti', 'Pekerjaan'),
  (14, 'エンジニア', 'エンジニア', 'enjinia', 'insinyur / engineer', 'Pekerjaan'),
  (15, '大学生', 'だいがくせい', 'daigakusei', 'mahasiswa', 'Pekerjaan'),
  (16, '高校生', 'こうこうせい', 'koukousei', 'siswa SMA', 'Pekerjaan'),
  (17, '留学生', 'りゅうがくせい', 'ryuugakusei', 'pelajar / mahasiswa asing', 'Pekerjaan'),
  (18, '主婦', 'しゅふ', 'shufu', 'ibu rumah tangga', 'Pekerjaan'),
  (19, '会社', 'かいしゃ', 'kaisha', 'perusahaan', 'Tempat'),
  (20, '銀行', 'ぎんこう', 'ginkou', 'bank', 'Tempat'),
  (21, '病院', 'びょういん', 'byouin', 'rumah sakit', 'Tempat'),
  (22, '研究所', 'けんきゅうじょ', 'kenkyuujo', 'lembaga / pusat penelitian', 'Tempat'),
  (23, '大学', 'だいがく', 'daigaku', 'universitas', 'Tempat'),
  (24, '学校', 'がっこう', 'gakkou', 'sekolah', 'Tempat'),
  (25, '国', 'くに', 'kuni', 'negara', 'Negara'),
  (26, '日本', 'にほん', 'nihon', 'Jepang', 'Negara'),
  (27, 'インドネシア', 'インドネシア', 'indoneshia', 'Indonesia', 'Negara'),
  (28, 'アメリカ', 'アメリカ', 'amerika', 'Amerika Serikat', 'Negara'),
  (29, 'イギリス', 'イギリス', 'igirisu', 'Inggris', 'Negara'),
  (30, '中国', 'ちゅうごく', 'chuugoku', 'Tiongkok / China', 'Negara'),
  (31, '韓国', 'かんこく', 'kankoku', 'Korea Selatan', 'Negara'),
  (32, 'タイ', 'タイ', 'tai', 'Thailand', 'Negara'),
  (33, 'フィリピン', 'フィリピン', 'firipin', 'Filipina', 'Negara'),
  (34, 'ドイツ', 'ドイツ', 'doitsu', 'Jerman', 'Negara'),
  (35, 'フランス', 'フランス', 'furansu', 'Prancis', 'Negara'),
  (36, 'ブラジル', 'ブラジル', 'burajiru', 'Brasil', 'Negara'),
  (37, '日本人', 'にほんじん', 'nihonjin', 'orang Jepang', 'Kebangsaan'),
  (38, 'インドネシア人', 'インドネシアじん', 'indoneshiajin', 'orang Indonesia', 'Kebangsaan'),
  (39, 'アメリカ人', 'アメリカじん', 'amerikajin', 'orang Amerika', 'Kebangsaan'),
  (40, '中国人', 'ちゅうごくじん', 'chuugokujin', 'orang Tiongkok / China', 'Kebangsaan'),
  (41, '韓国人', 'かんこくじん', 'kankokujin', 'orang Korea', 'Kebangsaan'),
  (42, '日本語', 'にほんご', 'nihongo', 'bahasa Jepang', 'Bahasa'),
  (43, '英語', 'えいご', 'eigo', 'bahasa Inggris', 'Bahasa'),
  (44, 'インドネシア語', 'インドネシアご', 'indoneshiago', 'bahasa Indonesia', 'Bahasa'),
  (45, '中国語', 'ちゅうごくご', 'chuugokugo', 'bahasa Mandarin / Tionghoa', 'Bahasa'),
  (46, '韓国語', 'かんこくご', 'kankokugo', 'bahasa Korea', 'Bahasa'),
  (47, '名前', 'なまえ', 'namae', 'nama', 'Identitas'),
  (48, 'お名前', 'おなまえ', 'onamae', 'nama (sopan)', 'Identitas'),
  (49, '出身', 'しゅっしん', 'shusshin', 'asal / daerah asal', 'Identitas'),
  (50, '仕事', 'しごと', 'shigoto', 'pekerjaan', 'Identitas'),
  (51, '職業', 'しょくぎょう', 'shokugyou', 'profesi / pekerjaan', 'Identitas'),
  (52, '専門', 'せんもん', 'senmon', 'bidang keahlian / jurusan', 'Identitas'),
  (53, '友達', 'ともだち', 'tomodachi', 'teman', 'Hubungan'),
  (54, '家族', 'かぞく', 'kazoku', 'keluarga', 'Hubungan'),
  (55, '同僚', 'どうりょう', 'douryou', 'rekan kerja', 'Hubungan'),
  (56, 'クラス', 'クラス', 'kurasu', 'kelas', 'Sekolah'),
  (57, 'クラスメート', 'クラスメート', 'kurasumeeto', 'teman sekelas', 'Sekolah'),
  (58, '電話', 'でんわ', 'denwa', 'telepon', 'Kontak'),
  (59, '電話番号', 'でんわばんご', 'denwabangou', 'nomor telepon', 'Kontak'),
  (60, '住所', 'じゅうしょ', 'juusho', 'alamat', 'Kontak'),
  (61, 'メール', 'メール', 'meeru', 'email', 'Kontak'),
  (62, '名刺', 'めいし', 'meishi', 'kartu nama', 'Kontak'),
  (63, '学生証', 'がくせいしょう', 'gakuseishou', 'kartu pelajar / kartu mahasiswa', 'Sekolah'),
  (64, '何', 'なん', 'nan', 'apa', 'Kata tanya'),
  (65, '誰', 'だれ', 'dare', 'siapa', 'Kata tanya'),
  (66, 'どなた', 'どなた', 'donata', 'siapa (sopan)', 'Kata tanya'),
  (67, '何歳', 'なんさい', 'nansai', 'umur berapa', 'Usia'),
  (68, 'おいくつ', 'おいくつ', 'oikutsu', 'berapa usia (sopan)', 'Usia'),
  (69, '歳', 'さい', 'sai', 'tahun (penghitung umur)', 'Usia'),
  (70, '初めまして', 'はじめまして', 'hajimemashite', 'salam kenal', 'Ungkapan'),
  (71, 'どうぞ', 'どうぞ', 'douzo', 'silakan', 'Ungkapan'),
  (72, 'よろしく', 'よろしく', 'yoroshiku', 'mohon bantuannya / salam baik', 'Ungkapan'),
  (73, 'お願いします', 'おねがいします', 'onegaishimasu', 'mohon / tolong', 'Ungkapan'),
  (74, 'よろしくお願いします', 'よろしくおねがいします', 'yoroshiku onegaishimasu', 'mohon kerja samanya / senang berkenalan', 'Ungkapan'),
  (75, 'こちらこそ', 'こちらこそ', 'kochirakoso', 'saya juga / justru saya yang berterima kasih', 'Ungkapan'),
  (76, '失礼ですが', 'しつれいですが', 'shitsurei desu ga', 'maaf, tetapi... (sopan)', 'Ungkapan'),
  (77, 'はい', 'はい', 'hai', 'ya', 'Ungkapan'),
  (78, 'いいえ', 'いいえ', 'iie', 'tidak', 'Ungkapan'),
  (79, 'そうです', 'そうです', 'sou desu', 'benar / begitu', 'Ungkapan'),
  (80, '違います', 'ちがいます', 'chigaimasu', 'bukan / tidak benar', 'Ungkapan')
)
insert into public.learning_items (
  item_type,
  jlpt_level,
  prompt,
  reading,
  meaning_id,
  meaning_en,
  extra,
  is_published
)
select
  'vocabulary',
  'N5',
  source.prompt,
  source.reading,
  source.meaning_id,
  null,
  jsonb_build_object(
    'chapter_number', 1,
    'chapter_title', 'Perkenalan & Identitas',
    'sort_order', source.sort_order,
    'romaji', source.romaji,
    'category', source.category,
    'curriculum', 'KOJAC',
    'dataset', 'vocabulary_chapter_1'
  ),
  true
from source_words as source
on conflict do nothing;

-- Validasi akhir. Jika hasil Bab 1 tidak tepat 80 item published,
-- seluruh transaction dibatalkan agar tidak meninggalkan data parsial.
do $validate$
declare
  v_total integer;
  v_min_order integer;
  v_max_order integer;
  v_distinct_order integer;
begin
  select
    count(*),
    min((extra->>'sort_order')::integer),
    max((extra->>'sort_order')::integer),
    count(distinct (extra->>'sort_order')::integer)
  into
    v_total,
    v_min_order,
    v_max_order,
    v_distinct_order
  from public.learning_items
  where item_type = 'vocabulary'
    and is_published = true
    and extra->>'chapter_number' = '1';

  if v_total <> 80
     or v_min_order <> 1
     or v_max_order <> 80
     or v_distinct_order <> 80 then
    raise exception
      'KOJAC validation: Vocabulary Bab 1 harus tepat 80 item dengan urutan 1-80. Ditemukan total=%, min_order=%, max_order=%, distinct_order=%',
      v_total, v_min_order, v_max_order, v_distinct_order;
  end if;

  if not exists (
    select 1 from public.learning_items
    where item_type='vocabulary'
      and prompt='私'
      and reading='わたし'
      and meaning_id='saya'
      and extra->>'chapter_number'='1'
      and extra->>'sort_order'='1'
      and is_published=true
  ) or not exists (
    select 1 from public.learning_items
    where item_type='vocabulary'
      and prompt='学生'
      and reading='がくせい'
      and extra->>'chapter_number'='1'
      and is_published=true
  ) or not exists (
    select 1 from public.learning_items
    where item_type='vocabulary'
      and prompt='インドネシア'
      and reading='インドネシア'
      and extra->>'chapter_number'='1'
      and is_published=true
  ) or not exists (
    select 1 from public.learning_items
    where item_type='vocabulary'
      and prompt='よろしくお願いします'
      and reading='よろしくおねがいします'
      and extra->>'chapter_number'='1'
      and is_published=true
  ) then
    raise exception 'KOJAC validation: item penting Vocabulary Bab 1 tidak ditemukan atau metadata tidak sesuai.';
  end if;
end
$validate$;

commit;

-- Verifikasi opsional setelah Run:
-- select
--   extra->>'chapter_number' as bab,
--   count(*) as total
-- from public.learning_items
-- where item_type='vocabulary' and is_published=true
-- group by extra->>'chapter_number'
-- order by (extra->>'chapter_number')::integer;
