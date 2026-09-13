-- KOJAC LMS — Grammar SRS + Mastery
-- Migration 017: mendaftarkan seluruh Bunpō canonical ke learning_items
-- dan memperluas RPC generic record_learning_review() agar menerima item_type grammar.
--
-- Prinsip:
-- - REUSE public.learning_items + public.review_progress existing.
-- - REUSE formula SRS/mastery existing tanpa perubahan.
-- - Satu Bunpō = satu learning item berdasarkan extra.pattern_id canonical.
-- - Tidak membuat grammar_progress / grammar_mastery / tabel progress baru.
-- - Tidak mengubah data Vocabulary/Kanji/Hiragana/Katakana existing.
-- - Hiragana tetap memakai public.record_hiragana_review(uuid, smallint).

begin;

do $preflight$
declare
  v_learning_items_rls boolean;
  v_review_progress_rls boolean;
  v_item_type_constraint text;
begin
  if to_regclass('public.learning_items') is null then
    raise exception 'KOJAC preflight: public.learning_items tidak ditemukan.';
  end if;

  if to_regclass('public.review_progress') is null then
    raise exception 'KOJAC preflight: public.review_progress tidak ditemukan.';
  end if;

  if to_regprocedure('public.record_learning_review(uuid,smallint)') is null then
    raise exception 'KOJAC preflight: record_learning_review(uuid, smallint) tidak ditemukan.';
  end if;

  if to_regprocedure('public.record_hiragana_review(uuid,smallint)') is null then
    raise exception 'KOJAC preflight: record_hiragana_review(uuid, smallint) tidak ditemukan.';
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
    raise exception 'KOJAC preflight: RLS learning_items tidak aktif.';
  end if;

  if coalesce(v_review_progress_rls, false) = false then
    raise exception 'KOJAC preflight: RLS review_progress tidak aktif.';
  end if;

  select c.conname
  into v_item_type_constraint
  from pg_constraint as c
  where c.conrelid = 'public.learning_items'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%item_type%'
  order by c.conname
  limit 1;

  if v_item_type_constraint is null then
    raise exception 'KOJAC preflight: check constraint learning_items.item_type tidak ditemukan.';
  end if;
end
$preflight$;

-- Extend check constraint secara incremental. Semua tipe existing tetap diizinkan.
do $extend_item_type$
declare
  v_item_type_constraint text;
begin
  select c.conname
  into v_item_type_constraint
  from pg_constraint as c
  where c.conrelid = 'public.learning_items'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%item_type%'
  order by c.conname
  limit 1;

  execute format('alter table public.learning_items drop constraint %I', v_item_type_constraint);
end
$extend_item_type$;

alter table public.learning_items
  add constraint learning_items_item_type_check
  check (item_type in ('hiragana','katakana','vocabulary','kanji','grammar'));

-- Stable canonical identity untuk Grammar. Prompt boleh berubah tanpa membuat item baru.
create unique index if not exists learning_items_grammar_pattern_id_uidx
  on public.learning_items ((extra ->> 'pattern_id'))
  where item_type = 'grammar';

with grammar_seed(pattern_id, chapter_number, sort_order, jlpt_level, prompt, meaning_id) as (
values
  ('ch1-desu', 1, 1, 'N5', '～は～です', 'A adalah B'),
  ('ch1-desuka', 1, 2, 'N5', '～は～ですか', 'Apakah A adalah B?'),
  ('ch1-dewaarimasen', 1, 3, 'N5', '～は～ではありません', 'A bukan B'),
  ('ch1-mo', 1, 4, 'N5', '～も', 'juga / pun'),
  ('ch1-no', 1, 5, 'N5', 'KB1 の KB2', 'KB2 milik/berkaitan dengan KB1'),
  ('ch1-nan', 1, 6, 'N5', 'なん／何', 'apa'),
  ('ch1-dare', 1, 7, 'N5', 'だれ／誰', 'siapa'),
  ('ch1-donata', 1, 8, 'N5', 'どなた', 'siapa (lebih sopan)'),
  ('ch2-kore-sore-are', 2, 1, 'N5', 'これ・それ・あれ', 'ini / itu / itu di sana'),
  ('ch2-kono-sono-ano', 2, 2, 'N5', 'この・その・あの + KB', 'KB ini / KB itu / KB itu di sana'),
  ('ch2-soudesu', 2, 3, 'N5', 'そうです', 'Benar / Ya, begitu'),
  ('ch2-soudewaarimasen', 2, 4, 'N5', 'そうではありません', 'Tidak, bukan begitu'),
  ('ch2-soudesuka', 2, 5, 'N5', 'そうですか', 'Oh, begitu? / Begitu ya'),
  ('ch2-nanno', 2, 6, 'N5', 'なんの + KB', 'KB apa / tentang apa / jenis apa'),
  ('ch2-dareno', 2, 7, 'N5', 'だれの + KB', 'KB milik siapa'),
  ('ch3-dore', 3, 1, 'N5', 'どれ', 'yang mana (berdiri sendiri)'),
  ('ch3-dono', 3, 2, 'N5', 'どの + KB', 'KB yang mana'),
  ('ch3-koko-soko-asoko', 3, 3, 'N5', 'ここ・そこ・あそこ', 'di sini / di situ / di sana'),
  ('ch3-doko', 3, 4, 'N5', 'どこ', 'di mana'),
  ('ch3-kochira-sochira-achira', 3, 5, 'N5', 'こちら・そちら・あちら', 'sebelah sini / situ / sana; bentuk sopan'),
  ('ch3-dochira', 3, 6, 'N5', 'どちら', 'yang mana / sebelah mana / di mana (lebih sopan)'),
  ('ch3-ikura', 3, 7, 'N5', 'いくら', 'berapa harganya'),
  ('ch4-time-ni', 4, 1, 'N5', 'Waktu + に + KK', 'melakukan kegiatan pada waktu tertentu'),
  ('ch4-verb-masu', 4, 2, 'N5', '～ます', 'melakukan / akan melakukan (sopan)'),
  ('ch4-verb-masen', 4, 3, 'N5', '～ません', 'tidak melakukan (sopan)'),
  ('ch4-verb-mashita', 4, 4, 'N5', '～ました', 'telah melakukan (sopan)'),
  ('ch4-verb-masendeshita', 4, 5, 'N5', '～ませんでした', 'tidak melakukan (lampau, sopan)'),
  ('ch5-e-movement', 5, 1, 'N5', 'Tempat + へ + 行きます／来ます／帰ります', 'pergi / datang / pulang ke suatu tempat'),
  ('ch5-transport-de', 5, 2, 'N5', 'Kendaraan + で + 行きます', 'pergi dengan kendaraan / sarana'),
  ('ch5-person-to', 5, 3, 'N5', 'Orang + と + KK', 'melakukan kegiatan bersama seseorang'),
  ('ch5-kara-made', 5, 4, 'N5', '～から～まで', 'dari ... sampai ...'),
  ('ch6-object-o', 6, 1, 'N5', 'KB + を + KK', 'melakukan tindakan terhadap objek'),
  ('ch6-place-de', 6, 2, 'N5', 'Tempat + で + KK', 'melakukan kegiatan di suatu tempat'),
  ('ch6-masenka', 6, 3, 'N5', '～ませんか', 'maukah ...? / mengajak dengan sopan'),
  ('ch6-mashou', 6, 4, 'N5', '～ましょう', 'mari ...'),
  ('ch7-tool-de', 7, 1, 'N5', 'Alat / bahasa + で + KK', 'melakukan sesuatu dengan alat / bahasa tertentu'),
  ('ch7-ageru', 7, 2, 'N5', 'A は B に KB を あげます', 'A memberikan benda kepada B'),
  ('ch7-morau', 7, 3, 'N5', 'A は B に／から KB を もらいます', 'A menerima benda dari B'),
  ('ch7-mou-mashita', 7, 4, 'N5', 'もう～ました', 'sudah ...'),
  ('ch8-i-positive', 8, 1, 'N5', 'KS-i + です', 'menyatakan sifat dengan kata sifat い'),
  ('ch8-i-negative', 8, 2, 'N5', 'KS-i → ～くないです', 'tidak ... (kata sifat い)'),
  ('ch8-na-positive', 8, 3, 'N5', 'KS-na + です', 'menyatakan sifat dengan kata sifat な'),
  ('ch8-na-negative', 8, 4, 'N5', 'KS-na + ではありません', 'tidak ... (kata sifat な)'),
  ('ch8-totemo-amari', 8, 5, 'N5', 'とても／あまり～ません', 'sangat / tidak terlalu ...'),
  ('ch9-suki-kirai', 9, 1, 'N5', '～が好きです／嫌いです', 'suka / tidak suka ...'),
  ('ch9-jouzu-heta', 9, 2, 'N5', '～が上手です／下手です', 'pandai / kurang pandai ...'),
  ('ch9-wakaru', 9, 3, 'N5', '～がわかります', 'mengerti / memahami ...'),
  ('ch9-reason-kara', 9, 4, 'N5', '～から、～', 'karena ..., maka ...'),
  ('ch10-arimasu', 10, 1, 'N5', '～があります', 'ada ... (benda / hal tidak bernyawa)'),
  ('ch10-imasu', 10, 2, 'N5', '～がいます', 'ada ... (orang / hewan)'),
  ('ch10-location-ni', 10, 3, 'N5', 'KB は Tempat に あります／います', 'A berada di ...'),
  ('ch10-position', 10, 4, 'N5', '上・下・前・後ろ・隣・中・外・近く', 'menyatakan posisi / letak'),
  ('ch11-counter', 11, 1, 'N5', 'Jumlah + kata bantu bilangan', 'menyatakan jumlah benda/orang dengan counter'),
  ('ch11-duration', 11, 2, 'N5', 'Durasi + KK', 'melakukan kegiatan selama ...'),
  ('ch11-frequency', 11, 3, 'N5', 'Periode + に + 回数', 'melakukan ... sebanyak ... kali dalam suatu periode'),
  ('ch11-gurai', 11, 4, 'N5', '～ぐらい／くらい', 'sekitar / kira-kira ...'),
  ('ch12-i-past', 12, 1, 'N5', 'KS-i → ～かったです', '... pada masa lalu (KS-i)'),
  ('ch12-i-past-negative', 12, 2, 'N5', 'KS-i → ～くなかったです', 'tidak ... pada masa lalu (KS-i)'),
  ('ch12-na-past', 12, 3, 'N5', 'KS-na / KB + でした', '... pada masa lalu'),
  ('ch12-na-past-negative', 12, 4, 'N5', 'KS-na / KB + ではありませんでした', 'bukan / tidak ... pada masa lalu'),
  ('ch12-yori', 12, 5, 'N5', 'A は B より～です', 'A lebih ... daripada B'),
  ('ch12-dochiraga', 12, 6, 'N5', 'A と B と どちらが～ですか', 'antara A dan B, mana yang lebih ...?'),
  ('ch12-ichiban', 12, 7, 'N5', '～の中で～が一番～です', '... paling ... di antara ...'),
  ('ch13-hoshii', 13, 1, 'N5', 'KB がほしいです', 'ingin benda ...'),
  ('ch13-tai', 13, 2, 'N5', '～たいです', 'ingin melakukan ...'),
  ('ch13-takunai', 13, 3, 'N5', '～たくないです', 'tidak ingin melakukan ...'),
  ('ch13-purpose-ni', 13, 4, 'N5', 'KK stem + に行きます／来ます／帰ります', 'pergi / datang / pulang untuk melakukan ...'),
  ('ch14-tekudasai', 14, 1, 'N5', '～てください', 'tolong lakukan ...'),
  ('ch14-teiru-progress', 14, 2, 'N5', '～ています（sedang berlangsung）', 'sedang melakukan ...'),
  ('ch14-mashouka', 14, 3, 'N5', '～ましょうか', 'bagaimana kalau saya ...? / boleh saya bantu ...?'),
  ('ch14-tekara', 14, 4, 'N5', '～てから', 'setelah melakukan ..., kemudian ...'),
  ('ch15-temoii', 15, 1, 'N5', '～てもいいです', 'boleh melakukan ...'),
  ('ch15-tewaikenai', 15, 2, 'N5', '～てはいけません', 'tidak boleh melakukan ...'),
  ('ch15-teiru-state', 15, 3, 'N5', '～ています（keadaan / kebiasaan）', 'berada dalam keadaan ... / biasa melakukan ...'),
  ('ch16-te-sequence', 16, 1, 'N5', 'KK1 て、KK2', 'melakukan A lalu B'),
  ('ch16-i-kute', 16, 2, 'N5', 'KS-i → ～くて', '... dan ... (menghubungkan KS-i)'),
  ('ch16-na-de', 16, 3, 'N5', 'KS-na / KB + で', '... dan ... (menghubungkan KS-na / KB)'),
  ('ch16-soshite-sorekara', 16, 4, 'N5', 'そして／それから', 'dan / kemudian'),
  ('ch17-naidekudasai', 17, 1, 'N5', '～ないでください', 'tolong jangan ...'),
  ('ch17-nakereba', 17, 2, 'N5', '～なければなりません', 'harus melakukan ...'),
  ('ch17-nakutemoii', 17, 3, 'N5', '～なくてもいいです', 'tidak harus ... / tidak perlu ...'),
  ('ch17-made-ni', 17, 4, 'N5', '～までに', 'paling lambat sebelum / pada batas waktu ...'),
  ('ch18-koto-ga-dekiru', 18, 1, 'N5', '～ことができます', 'bisa / mampu melakukan ...'),
  ('ch18-hobby-koto', 18, 2, 'N5', '趣味は～ことです', 'hobi saya adalah melakukan ...'),
  ('ch18-mae-ni', 18, 3, 'N5', '～前に', 'sebelum melakukan ...'),
  ('ch19-ta-koto-ga-aru', 19, 1, 'N5', '～たことがあります', 'pernah melakukan ...'),
  ('ch19-tari-tari', 19, 2, 'N5', '～たり～たりします', 'melakukan hal-hal seperti ... dan ...'),
  ('ch19-naru', 19, 3, 'N5', '～くなります／～になります', 'menjadi ... / berubah menjadi ...'),
  ('ch19-mada', 19, 4, 'N5', 'まだ～ていません', 'belum melakukan ...'),
  ('ch20-plain-verb', 20, 1, 'N5', 'KK bentuk biasa', 'bentuk nonformal kata kerja'),
  ('ch20-plain-adj', 20, 2, 'N5', 'KS-i / KS-na bentuk biasa', 'bentuk nonformal kata sifat'),
  ('ch20-plain-noun', 20, 3, 'N5', 'KB + だ／じゃない／だった／じゃなかった', 'bentuk biasa predikat kata benda'),
  ('ch20-kedo', 20, 4, 'N5', '～けど／けれど', 'tetapi / meskipun / ... sih'),
  ('ch21-to-omoimasu', 21, 1, 'N4', '～と思います', 'saya pikir / menurut saya ...'),
  ('ch21-to-iimasu', 21, 2, 'N4', '～と言います', 'mengatakan bahwa ...'),
  ('ch21-deshou', 21, 3, 'N4', '～でしょう', 'mungkin / tampaknya / bukan?'),
  ('ch21-kamoshirenai', 21, 4, 'N4', '～かもしれません', 'mungkin ...'),
  ('ch22-verb-relative', 22, 1, 'N4', 'KK bentuk biasa + KB', 'kata benda yang diterangkan oleh kegiatan/keadaan'),
  ('ch22-adj-relative', 22, 2, 'N4', 'KS-i / KS-na + KB', 'kata benda yang diterangkan oleh sifat'),
  ('ch22-noun-na-relative', 22, 3, 'N4', 'KB + の + KB／KS-na + な + KB', 'menerangkan kata benda dengan nomina atau KS-na'),
  ('ch22-toiu-noun', 22, 4, 'N4', '～という + KB', 'yang disebut / bernama ...'),
  ('ch23-toki', 23, 1, 'N4', '～とき', 'ketika / saat ...'),
  ('ch23-to-condition', 23, 2, 'N4', '～と（kondisi otomatis）', 'jika / ketika A, selalu B'),
  ('ch23-ta-atode', 23, 3, 'N4', '～たあとで', 'setelah melakukan ...'),
  ('ch23-made', 23, 4, 'N4', '～まで', 'sampai suatu tindakan / keadaan berakhir'),
  ('ch24-teageru', 24, 1, 'N4', '～てあげます', 'melakukan sesuatu untuk orang lain'),
  ('ch24-temorau', 24, 2, 'N4', '～てもらいます', 'menerima bantuan melakukan ...'),
  ('ch24-tekureru', 24, 3, 'N4', '～てくれます', 'seseorang melakukan sesuatu untuk saya / pihak saya'),
  ('ch24-tekudasaru', 24, 4, 'N4', '～てくださいます', 'orang yang dihormati melakukan sesuatu untuk saya'),
  ('ch25-tara', 25, 1, 'N4', '～たら', 'kalau / jika / setelah ...'),
  ('ch25-temo', 25, 2, 'N4', '～ても', 'meskipun / walaupun ...'),
  ('ch25-nara', 25, 3, 'N4', '～なら', 'kalau memang ... / jika soal ...'),
  ('ch25-ba', 25, 4, 'N4', '～ば', 'jika / apabila ...'),
  ('ch26-ndesu', 26, 1, 'N4', '～んです／～のです', 'memberi penjelasan / latar belakang'),
  ('ch26-teitadakemasenka', 26, 2, 'N4', '～ていただけませんか', 'bisakah Anda ...? (sangat sopan)'),
  ('ch26-tara-iidesuka', 26, 3, 'N4', '～たらいいですか', 'sebaiknya bagaimana / apa yang harus dilakukan?'),
  ('ch26-doushite-ndesu', 26, 4, 'N4', 'どうして～んですか', 'mengapa ...? (meminta penjelasan)'),
  ('ch27-potential', 27, 1, 'N4', '可能形（bentuk potensial）', 'bisa melakukan ...'),
  ('ch27-mieru-kikoeru', 27, 2, 'N4', '見えます／聞こえます', 'terlihat / terdengar secara alami'),
  ('ch27-shika-nai', 27, 3, 'N4', '～しか～ない', 'hanya ... saja (dan tidak ada selain itu)'),
  ('ch27-dake', 27, 4, 'N4', '～だけ', 'hanya ...'),
  ('ch28-nagara', 28, 1, 'N4', '～ながら', 'sambil melakukan ...'),
  ('ch28-shi', 28, 2, 'N4', '～し、～し', '... dan ...; selain itu ...'),
  ('ch28-node', 28, 3, 'N4', '～ので', 'karena ...'),
  ('ch28-tameni', 28, 4, 'N4', '～ために（tujuan）', 'untuk / demi ...'),
  ('ch29-teiru-result', 29, 1, 'N4', '～ています（keadaan hasil）', 'berada dalam keadaan hasil dari suatu perubahan'),
  ('ch29-teshimau', 29, 2, 'N4', '～てしまいます', 'selesai sepenuhnya / terlanjur ...'),
  ('ch29-tearu', 29, 3, 'N4', '～てあります', 'sudah dilakukan dan keadaannya dipertahankan'),
  ('ch29-teoku', 29, 4, 'N4', '～ておきます', 'melakukan ... sebelumnya sebagai persiapan'),
  ('ch30-volitional', 30, 1, 'N4', '意向形（bentuk volisional）', 'ayo / akan ... (bentuk biasa)'),
  ('ch30-volitional-toomou', 30, 2, 'N4', '～ようと思います', 'berniat / berpikir akan ...'),
  ('ch30-tsumori', 30, 3, 'N4', '～つもりです', 'bermaksud / berniat ...'),
  ('ch30-yotei', 30, 4, 'N4', '～予定です', 'dijadwalkan / direncanakan ...'),
  ('ch30-you-ni-naru', 30, 5, 'N4', '～ようになります', 'menjadi bisa / mulai terbiasa ...'),
  ('ch30-you-ni-suru', 31, 1, 'N4', '～ようにします', 'berusaha / membiasakan diri untuk ...'),
  ('ch31-houga-ii', 31, 2, 'N4', '～ほうがいいです', 'sebaiknya ...'),
  ('ch31-hazu', 31, 3, 'N4', '～はずです', 'seharusnya / semestinya ...'),
  ('ch31-koto-ni-suru', 31, 4, 'N4', '～ことにします', 'memutuskan untuk ...'),
  ('ch31-koto-ni-naru', 31, 5, 'N4', '～ことになります', 'diputuskan / menjadi ketentuan bahwa ...'),
  ('ch32-sou-hearsay', 32, 1, 'N4', '～そうです（katanya）', 'katanya / saya dengar ...'),
  ('ch32-sou-appearance', 32, 2, 'N4', '～そうです（kelihatannya）', 'kelihatannya / tampaknya akan ...'),
  ('ch32-youdesu', 32, 3, 'N4', '～ようです', 'sepertinya / tampaknya ...'),
  ('ch32-to-itteimashita', 32, 4, 'N4', '～と言っていました', 'dia mengatakan bahwa ...'),
  ('ch32-toiu-imi', 32, 5, 'N4', '～という意味です', 'artinya ... / berarti ...'),
  ('ch33-baai', 33, 2, 'N4', '～場合（は）', 'dalam hal / apabila ...'),
  ('ch33-noni', 33, 3, 'N4', '～のに', 'meskipun / padahal ...'),
  ('ch33-tatoe-temo', 33, 4, 'N4', 'たとえ～ても', 'walaupun sekalipun ...'),
  ('ch34-toorini', 34, 1, 'N4', '～とおりに', 'sesuai / seperti ...'),
  ('ch34-naide', 34, 2, 'N4', '～ないで', 'tanpa melakukan ...'),
  ('ch34-temiru', 34, 3, 'N4', '～てみます', 'mencoba melakukan ...'),
  ('ch34-yasui-nikui', 34, 4, 'N4', '～やすい／～にくい', 'mudah / sulit untuk dilakukan'),
  ('ch34-sugiru', 34, 5, 'N4', '～すぎます', 'terlalu ...'),
  ('ch35-tokoro', 35, 1, 'N4', '～ところです', 'baru akan / sedang / baru saja melakukan'),
  ('ch35-ta-bakari', 35, 2, 'N4', '～たばかりです', 'baru saja melakukan ...'),
  ('ch35-teiku', 35, 3, 'N4', '～ていきます', 'terus berubah / bergerak dari sekarang ke depan'),
  ('ch35-tekuru', 35, 4, 'N4', '～てきます', 'perubahan yang berlangsung sampai sekarang / datang setelah melakukan'),
  ('ch35-passive', 35, 5, 'N4', '受身形（bentuk pasif）', 'dikenai / dilakukan oleh ...')
)
insert into public.learning_items as li (
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
  'grammar',
  seed.jlpt_level,
  seed.prompt,
  null,
  seed.meaning_id,
  null,
  jsonb_build_object(
    'pattern_id', seed.pattern_id,
    'chapter_number', seed.chapter_number,
    'sort_order', seed.sort_order,
    'curriculum', 'KOJAC Grammar Core',
    'dataset', 'Grammar-v1'
  ),
  true
from grammar_seed as seed
on conflict ((extra ->> 'pattern_id')) where item_type = 'grammar'
do update set
  jlpt_level = excluded.jlpt_level,
  prompt = excluded.prompt,
  meaning_id = excluded.meaning_id,
  extra = excluded.extra,
  is_published = true;

-- Extend guard RPC generic saja. Formula interval/ease/mastery tetap byte-equivalent.
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

  -- Backward-compatible guard: hanya perluas jenis item yang boleh memakai
  -- engine generic existing. Hiragana tetap berada pada RPC terpisah.
  if not exists (
    select 1
    from public.learning_items as li
    where li.id = p_item_id
      and li.item_type in ('katakana', 'vocabulary', 'kanji', 'grammar')
      and li.is_published = true
  ) then
    raise exception 'published Katakana/Vocabulary/Kanji/Grammar item not found';
  end if;

  insert into public.review_progress (
    user_id, item_id, repetitions, interval_days, ease_factor, due_at,
    last_rating, last_reviewed_at, correct_count, wrong_count, mastery_score
  ) values (
    v_user, p_item_id, 0, 0, 2.50, now(), null, null, 0, 0, 0
  )
  on conflict on constraint review_progress_pkey do nothing;

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


-- Permission contract tetap sama dengan migration 009.
revoke all on function public.record_learning_review(uuid, smallint) from public, anon;
grant execute on function public.record_learning_review(uuid, smallint) to authenticated;

-- Post-check: security boundary dan RPC stabil lain harus tetap utuh.
do $validate$
declare
  v_security_definer boolean;
  v_search_path_ok boolean;
  v_review_progress_rls boolean;
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
  into v_review_progress_rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'review_progress'
    and c.relkind = 'r';

  if coalesce(v_review_progress_rls, false) = false then
    raise exception 'KOJAC validation: RLS review_progress berubah/nonaktif.';
  end if;

  if to_regprocedure('public.record_hiragana_review(uuid,smallint)') is null then
    raise exception 'KOJAC validation: RPC Hiragana tidak tersedia.';
  end if;
end
$validate$;



-- Validation khusus Grammar mapping.
do $validate_grammar$
declare
  v_count integer;
  v_distinct_pattern_ids integer;
begin
  select count(*),
         count(distinct li.extra ->> 'pattern_id')
  into v_count, v_distinct_pattern_ids
  from public.learning_items as li
  where li.item_type = 'grammar'
    and li.is_published = true
    and li.extra ->> 'dataset' = 'Grammar-v1';

  if v_count <> 157 or v_distinct_pattern_ids <> 157 then
    raise exception 'KOJAC validation: mapping Grammar tidak lengkap. Expected 157, got % rows / % pattern IDs.',
      v_count, v_distinct_pattern_ids;
  end if;

  if not exists (
    select 1
    from pg_constraint as c
    where c.conrelid = 'public.learning_items'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%grammar%'
  ) then
    raise exception 'KOJAC validation: item_type grammar belum diizinkan.';
  end if;
end
$validate_grammar$;

commit;
