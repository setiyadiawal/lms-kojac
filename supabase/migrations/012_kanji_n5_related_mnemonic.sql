-- KOJAC LMS — Kanji N5 learning aids (incremental)
-- Adds curated structural relations and pedagogical mnemonics without changing schema.
-- Mnemonics are explicitly learning aids, not etymology claims.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.learning_items
  where item_type = 'kanji'
    and jlpt_level = 'N5'
    and reading is null;

  if v_count < 90 then
    raise exception 'KOJAC Kanji learning aids preflight failed: expected at least 90 N5 Kanji rows, found %', v_count;
  end if;
end $$;

with aids(prompt, related_kanji, mnemonic) as (
  values
    ('日', '[{"kanji":"時","relation":"same_radical","note":"Keduanya menggunakan radikal 日 dan berkaitan dengan waktu."},{"kanji":"明","relation":"shared_component","note":"明 memakai 日 sebagai salah satu komponen visual.","meaning":"terang","level":"N4"},{"kanji":"目","relation":"similar_shape","note":"Bentuk kotaknya mirip; perhatikan jumlah garis di bagian dalam."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan bentuk 「日」 sebagai matahari sederhana. Hubungkan matahari dengan pergantian hari."}'::jsonb),
    ('月', '[{"kanji":"明","relation":"shared_component","note":"明 memakai 月 sebagai salah satu komponen visual.","meaning":"terang","level":"N4"},{"kanji":"日","relation":"concept_related","note":"Matahari dan bulan sama-sama menjadi penanda waktu yang sangat dasar."},{"kanji":"年","relation":"concept_related","note":"Keduanya dipakai saat membicarakan satuan waktu."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan bulan sabit yang disederhanakan menjadi 「月」. Kaitkan bentuk ini dengan bulan di langit dan bulan kalender."}'::jsonb),
    ('人', '[{"kanji":"入","relation":"similar_shape","note":"Keduanya hanya dua goresan dan mudah tertukar; perhatikan arah bukaan goresannya."},{"kanji":"休","relation":"shared_component","note":"休 memakai bentuk orang 亻, varian dari 人, di sisi kiri."},{"kanji":"何","relation":"shared_component","note":"何 juga memakai bentuk orang 亻 di sisi kiri."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan dua kaki seseorang yang sedang berdiri atau berjalan. Bentuk 「人」 menjadi jangkar untuk arti orang."}'::jsonb),
    ('学', '[{"kanji":"字","relation":"same_radical","note":"学 dan 字 sama-sama dikelompokkan pada radikal 子 dalam kamus Kanji Jepang."},{"kanji":"子","relation":"same_radical","note":"子 menjadi bagian penting di bawah bentuk 学."},{"kanji":"校","relation":"concept_related","note":"学 dan 校 sering muncul bersama dalam 学校 (sekolah)."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"子","meaning":"anak, bagian bawah"}],"tip":"Cara mudah mengingat: lihat 子 di bagian bawah lalu bayangkan seorang anak sedang belajar. Ini mnemonic belajar, bukan penjelasan asal bentuk lengkap 学."}'::jsonb),
    ('生', '[{"kanji":"学","relation":"concept_related","note":"Bersama membentuk 学生 (siswa / mahasiswa)."},{"kanji":"人","relation":"concept_related","note":"Keduanya dekat dengan konsep manusia dan kehidupan."},{"kanji":"子","relation":"concept_related","note":"Anak dan kelahiran sama-sama berkaitan dengan kehidupan."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan tunas baru yang tumbuh ke atas dari tanah. Gunakan gambaran tumbuh itu untuk mengingat arti hidup atau lahir."}'::jsonb),
    ('休', '[{"kanji":"人","relation":"shared_component","note":"Bagian kiri 亻 adalah bentuk varian dari 人."},{"kanji":"木","relation":"shared_component","note":"Bagian kanan 休 adalah 木."},{"kanji":"何","relation":"shared_component","note":"休 dan 何 sama-sama memiliki komponen 亻 di sisi kiri."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"亻","meaning":"orang"},{"symbol":"木","meaning":"pohon"}],"tip":"Cara mudah mengingat: bayangkan seseorang (亻) bersandar di pohon (木) untuk beristirahat."}'::jsonb),
    ('木', '[{"kanji":"本","relation":"same_radical","note":"本 menggunakan 木 sebagai bentuk dasar dan termasuk kelompok radikal 木."},{"kanji":"校","relation":"same_radical","note":"校 memakai 木 sebagai radikal di sisi kiri."},{"kanji":"休","relation":"shared_component","note":"休 memiliki 木 sebagai komponen di sisi kanan."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan batang pohon dengan cabang dan akar yang menyebar. Bentuk itu membantu mengingat arti pohon atau kayu."}'::jsonb),
    ('本', '[{"kanji":"木","relation":"same_radical","note":"Bentuk 本 dibangun di atas bentuk 木 dan termasuk kelompok radikal 木."},{"kanji":"校","relation":"same_radical","note":"Keduanya berada dalam kelompok radikal 木."},{"kanji":"休","relation":"shared_component","note":"休 memiliki 木 sebagai komponen visual."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"木","meaning":"pohon"}],"tip":"Cara mudah mengingat: lihat 木 sebagai pohon, lalu perhatikan garis tambahan dekat bagian bawah. Bayangkan garis itu menandai pangkal atau dasar."}'::jsonb),
    ('校', '[{"kanji":"木","relation":"same_radical","note":"校 memakai radikal 木 di sisi kiri."},{"kanji":"本","relation":"same_radical","note":"本 dan 校 sama-sama berada dalam kelompok radikal 木."},{"kanji":"学","relation":"concept_related","note":"学 dan 校 bertemu dalam 学校 (sekolah)."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"木","meaning":"pohon, komponen kiri"}],"tip":"Cara mudah mengingat: jadikan 木 di sisi kiri sebagai tanda visual, lalu hubungkan 校 dengan 学校 yang sudah familiar sebagai sekolah."}'::jsonb),
    ('字', '[{"kanji":"学","relation":"same_radical","note":"字 dan 学 berada dalam kelompok radikal 子."},{"kanji":"子","relation":"same_radical","note":"子 terlihat jelas sebagai bagian bawah 字."},{"kanji":"文","relation":"concept_related","note":"文 dan 字 sama-sama berkaitan dengan tulisan dan karakter."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"宀","meaning":"atap"},{"symbol":"子","meaning":"anak"}],"tip":"Cara mudah mengingat: lihat 子 di bawah atap 宀. Gunakan gambar sederhana anak di bawah atap sebagai mnemonic untuk mengingat bentuk 字."}'::jsonb),
    ('語', '[{"kanji":"話","relation":"same_radical","note":"語 dan 話 sama-sama memakai radikal 言."},{"kanji":"読","relation":"same_radical","note":"語 dan 読 sama-sama memakai radikal 言."},{"kanji":"文","relation":"concept_related","note":"Keduanya berkaitan dengan bahasa dan tulisan."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"言","meaning":"kata / ucapan"}],"tip":"Cara mudah mengingat: fokus pada 言 di sisi kiri sebagai tanda tentang kata atau ucapan. Dari sana hubungkan 語 dengan bahasa dan kata."}'::jsonb),
    ('話', '[{"kanji":"語","relation":"same_radical","note":"話 dan 語 sama-sama memakai radikal 言."},{"kanji":"読","relation":"same_radical","note":"話 dan 読 sama-sama memakai radikal 言."},{"kanji":"聞","relation":"concept_related","note":"Berbicara dan mendengar adalah pasangan aktivitas komunikasi."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"言","meaning":"kata / ucapan"}],"tip":"Cara mudah mengingat: lihat 言 di kiri dan pikirkan ucapan. Hubungkan bentuk 話 dengan kegiatan berbicara atau bercerita."}'::jsonb),
    ('読', '[{"kanji":"語","relation":"same_radical","note":"読 dan 語 sama-sama memakai radikal 言."},{"kanji":"話","relation":"same_radical","note":"読 dan 話 sama-sama memakai radikal 言."},{"kanji":"書","relation":"concept_related","note":"Membaca dan menulis adalah pasangan aktivitas literasi."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"言","meaning":"kata / bahasa"}],"tip":"Cara mudah mengingat: jadikan 言 di kiri sebagai petunjuk bahwa ada hubungan dengan kata dan bahasa, lalu kaitkan 読 dengan kegiatan membaca."}'::jsonb),
    ('電', '[{"kanji":"雨","relation":"shared_component","note":"Komponen 雨 terlihat jelas di bagian atas 電."},{"kanji":"気","relation":"concept_related","note":"Bersama membentuk 電気 (listrik)."},{"kanji":"話","relation":"concept_related","note":"Bersama membentuk 電話 (telepon)."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"雨","meaning":"hujan, bagian atas"}],"tip":"Cara mudah mengingat: lihat 雨 di atas lalu bayangkan kilat listrik muncul dari awan hujan. Gunakan gambar itu untuk mengingat 電."}'::jsonb),
    ('見', '[{"kanji":"目","relation":"shared_component","note":"Bagian atas 見 memakai bentuk 目."},{"kanji":"聞","relation":"concept_related","note":"Melihat dan mendengar adalah dua cara utama menerima informasi."},{"kanji":"人","relation":"concept_related","note":"Kaitkan melihat dengan orang yang menggunakan inderanya."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"目","meaning":"mata"}],"tip":"Cara mudah mengingat: temukan 目 sebagai mata di dalam 見. Gunakan mata itu sebagai jangkar visual untuk arti melihat."}'::jsonb),
    ('聞', '[{"kanji":"耳","relation":"shared_component","note":"耳 terlihat di bagian dalam 聞."},{"kanji":"見","relation":"concept_related","note":"Mendengar dan melihat adalah dua cara menerima informasi."},{"kanji":"話","relation":"concept_related","note":"Mendengar dan berbicara sering berpasangan dalam komunikasi."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"門","meaning":"gerbang, bingkai luar"},{"symbol":"耳","meaning":"telinga"}],"tip":"Cara mudah mengingat: bayangkan telinga 耳 berada di dalam gerbang 門 dan sedang mendengarkan suara dari luar."}'::jsonb),
    ('食', '[{"kanji":"飲","relation":"shared_component","note":"飲 memakai bentuk 食 sebagai komponen di sisi kiri."},{"kanji":"買","relation":"concept_related","note":"Makanan sering menjadi salah satu hal yang dibeli."},{"kanji":"休","relation":"concept_related","note":"Makan dan istirahat sama-sama aktivitas dasar sehari-hari."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: kaitkan bentuk 食 dengan waktu makan. Gunakan kosakata 食べる sebagai jangkar agar bentuk dan arti tersimpan bersama."}'::jsonb),
    ('飲', '[{"kanji":"食","relation":"shared_component","note":"Bagian kiri 飲 berasal dari bentuk 食."},{"kanji":"話","relation":"concept_related","note":"Keduanya adalah aktivitas sehari-hari yang sering dipelajari sebagai kata kerja dasar."},{"kanji":"買","relation":"concept_related","note":"Minuman juga sering muncul dalam konteks membeli."}]'::jsonb, '{"kind":"learning_mnemonic","components":[{"symbol":"食","meaning":"makan / makanan, komponen kiri"}],"tip":"Cara mudah mengingat: lihat bentuk 食 di sisi kiri sebagai petunjuk aktivitas makan-minum, lalu hubungkan 飲 dengan minum."}'::jsonb),
    ('入', '[{"kanji":"人","relation":"similar_shape","note":"Keduanya hanya dua goresan dan mudah tertukar; perhatikan arah bukaan goresannya."},{"kanji":"出","relation":"concept_related","note":"入 dan 出 adalah pasangan masuk dan keluar."},{"kanji":"口","relation":"concept_related","note":"Bersama membentuk 入口 (pintu masuk)."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan dua garis yang mengarah masuk ke satu titik. Gunakan gerakan masuk itu untuk mengingat 入."}'::jsonb),
    ('出', '[{"kanji":"入","relation":"concept_related","note":"出 dan 入 adalah pasangan keluar dan masuk."},{"kanji":"口","relation":"concept_related","note":"Bersama membentuk 出口 (pintu keluar)."},{"kanji":"行","relation":"concept_related","note":"Keluar dan pergi sering muncul dalam konteks pergerakan."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan sesuatu muncul keluar dari batas. Kaitkan bentuk 出 dengan kata 出口 agar arti keluar mudah diingat."}'::jsonb),
    ('口', '[{"kanji":"日","relation":"similar_shape","note":"Keduanya berbentuk kotak; 日 memiliki garis tambahan di bagian dalam."},{"kanji":"目","relation":"similar_shape","note":"Keduanya berbentuk kotak; 目 memiliki dua garis di bagian dalam."},{"kanji":"入","relation":"concept_related","note":"Bersama membentuk 入口 (pintu masuk)."},{"kanji":"出","relation":"concept_related","note":"Bersama membentuk 出口 (pintu keluar)."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan sebuah mulut berbentuk kotak yang terbuka. Bentuk sederhana ini menjadi jangkar untuk arti mulut."}'::jsonb),
    ('目', '[{"kanji":"日","relation":"similar_shape","note":"Bentuknya mirip; 目 memiliki satu garis dalam lebih banyak daripada 日."},{"kanji":"口","relation":"similar_shape","note":"Keduanya berbentuk kotak; 目 memiliki dua garis di bagian dalam."},{"kanji":"見","relation":"shared_component","note":"目 menjadi komponen visual utama di bagian atas 見."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan bentuk 「目」 sebagai mata yang disederhanakan. Dua garis di dalam membantu membedakannya dari 日 dan 口."}'::jsonb),
    ('大', '[{"kanji":"天","relation":"similar_shape","note":"天 terlihat seperti 大 dengan satu garis tambahan di bagian atas."},{"kanji":"小","relation":"concept_related","note":"大 dan 小 adalah pasangan besar dan kecil."},{"kanji":"高","relation":"concept_related","note":"Besar dan tinggi sama-sama menggambarkan ukuran."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan seseorang merentangkan tangan dan kaki selebar mungkin untuk menunjukkan sesuatu yang besar."}'::jsonb),
    ('小', '[{"kanji":"少","relation":"similar_shape","note":"少 mirip 小 dengan tambahan goresan; perhatikan bentuk atasnya."},{"kanji":"大","relation":"concept_related","note":"小 dan 大 adalah pasangan kecil dan besar."},{"kanji":"多","relation":"concept_related","note":"Kecil dan banyak sering dibandingkan saat belajar ukuran dan jumlah."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan tiga bagian kecil yang tersebar. Gunakan gambaran kecil-kecil itu untuk mengingat 小."}'::jsonb),
    ('少', '[{"kanji":"小","relation":"similar_shape","note":"少 sangat dekat bentuknya dengan 小, tetapi memiliki tambahan goresan."},{"kanji":"多","relation":"concept_related","note":"少 dan 多 adalah pasangan sedikit dan banyak."},{"kanji":"大","relation":"concept_related","note":"Gunakan kelompok perbandingan ukuran dan jumlah untuk memperkuat ingatan."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: lihat kemiripan 少 dengan 小, lalu bayangkan hanya ada sedikit tambahan. Hubungkan itu dengan arti sedikit."}'::jsonb),
    ('上', '[{"kanji":"下","relation":"concept_related","note":"上 dan 下 adalah pasangan atas dan bawah."},{"kanji":"中","relation":"concept_related","note":"Atas, tengah, dan bawah membentuk satu kelompok posisi."},{"kanji":"外","relation":"concept_related","note":"Keduanya membantu menjelaskan posisi atau arah."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: lihat garis pendek berada di atas garis dasar. Posisi itu langsung mengingatkan arti atas."}'::jsonb),
    ('下', '[{"kanji":"上","relation":"concept_related","note":"下 dan 上 adalah pasangan bawah dan atas."},{"kanji":"中","relation":"concept_related","note":"Atas, tengah, dan bawah membentuk satu kelompok posisi."},{"kanji":"外","relation":"concept_related","note":"Keduanya membantu menjelaskan posisi atau arah."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: lihat tanda kecil berada di bawah garis dasar. Posisi itu membantu mengingat arti bawah."}'::jsonb),
    ('左', '[{"kanji":"右","relation":"concept_related","note":"左 dan 右 adalah pasangan kiri dan kanan."},{"kanji":"東","relation":"concept_related","note":"Keduanya digunakan untuk menunjukkan arah."},{"kanji":"西","relation":"concept_related","note":"Keduanya digunakan untuk menunjukkan arah."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: pelajari 左 selalu berpasangan dengan 右. Bandingkan keduanya berdampingan agar bagian bawahnya tidak tertukar."}'::jsonb),
    ('右', '[{"kanji":"左","relation":"concept_related","note":"右 dan 左 adalah pasangan kanan dan kiri."},{"kanji":"東","relation":"concept_related","note":"Keduanya digunakan untuk menunjukkan arah."},{"kanji":"西","relation":"concept_related","note":"Keduanya digunakan untuk menunjukkan arah."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: pelajari 右 selalu berpasangan dengan 左. Perhatikan 口 di bagian bawah 右 sebagai pembeda visual."}'::jsonb),
    ('前', '[{"kanji":"後","relation":"concept_related","note":"前 dan 後 adalah pasangan sebelum/depan dan setelah/belakang."},{"kanji":"今","relation":"concept_related","note":"Ketiganya sering dipakai untuk membicarakan urutan waktu."},{"kanji":"時","relation":"concept_related","note":"Keduanya berkaitan dengan posisi dalam waktu."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: kaitkan 前 dengan sesuatu yang berada di depan atau terjadi lebih dulu. Gunakan 午前 sebagai jangkar kosakata."}'::jsonb),
    ('後', '[{"kanji":"前","relation":"concept_related","note":"後 dan 前 adalah pasangan setelah/belakang dan sebelum/depan."},{"kanji":"今","relation":"concept_related","note":"Ketiganya sering dipakai untuk membicarakan urutan waktu."},{"kanji":"時","relation":"concept_related","note":"Keduanya berkaitan dengan posisi dalam waktu."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: kaitkan 後 dengan sesuatu yang datang setelah atau berada di belakang. Gunakan 午後 sebagai jangkar kosakata."}'::jsonb),
    ('新', '[{"kanji":"古","relation":"concept_related","note":"新 dan 古 adalah pasangan baru dan lama."},{"kanji":"今","relation":"concept_related","note":"Hal baru sering dikaitkan dengan masa sekarang."},{"kanji":"来","relation":"concept_related","note":"Keduanya dapat membantu membangun gambaran tentang hal yang datang atau baru."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: hubungkan 新 dengan 新しい yang sangat umum. Ucapkan atarashii sambil melihat bentuknya untuk memperkuat arti baru."}'::jsonb),
    ('古', '[{"kanji":"新","relation":"concept_related","note":"古 dan 新 adalah pasangan lama dan baru."},{"kanji":"年","relation":"concept_related","note":"Sesuatu menjadi tua atau lama seiring waktu."},{"kanji":"本","relation":"concept_related","note":"Buku lama adalah gambaran sederhana untuk mengingat 古い."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan sebuah benda tua yang sudah dipakai lama. Kaitkan bentuk 古 langsung dengan kata 古い."}'::jsonb),
    ('多', '[{"kanji":"少","relation":"concept_related","note":"多 dan 少 adalah pasangan banyak dan sedikit."},{"kanji":"大","relation":"concept_related","note":"Keduanya dapat dipakai saat membandingkan jumlah atau skala."},{"kanji":"小","relation":"concept_related","note":"Gunakan kelompok perbandingan untuk memperkuat arti."}]'::jsonb, '{"kind":"learning_mnemonic","components":[],"tip":"Cara mudah mengingat: bayangkan bentuk yang bertumpuk sebagai jumlah yang semakin banyak. Hubungkan 多 dengan 多い."}'::jsonb)
)
update public.learning_items as li
set extra = coalesce(li.extra, '{}'::jsonb)
  || jsonb_build_object(
    'related_kanji', aids.related_kanji,
    'mnemonic', aids.mnemonic,
    'learning_aids_dataset', 'N5-learning-aids-v1'
  )
from aids
where li.item_type = 'kanji'
  and li.jlpt_level = 'N5'
  and li.reading is null
  and li.prompt = aids.prompt;

-- Validation: curated core Kanji must have valid relation + mnemonic metadata.
do $$
declare
  v_expected integer := 34;
  v_updated integer;
  v_invalid integer;
  v_self_relations integer;
begin
  select count(*) into v_updated
  from public.learning_items
  where item_type = 'kanji'
    and jlpt_level = 'N5'
    and reading is null
    and prompt in ('日','月','人','学','生','休','木','本','校','字','語','話','読','電','見','聞','食','飲','入','出','口','目','大','小','少','上','下','左','右','前','後','新','古','多')
    and jsonb_typeof(extra->'related_kanji') = 'array'
    and jsonb_array_length(extra->'related_kanji') >= 1
    and jsonb_typeof(extra->'mnemonic') = 'object'
    and coalesce(extra->'mnemonic'->>'tip', '') <> '';

  if v_updated <> v_expected then
    raise exception 'KOJAC Kanji learning aids validation failed: expected % curated rows, found %', v_expected, v_updated;
  end if;

  select count(*) into v_invalid
  from public.learning_items as li
  cross join lateral jsonb_array_elements(li.extra->'related_kanji') as rel
  where li.item_type = 'kanji'
    and li.jlpt_level = 'N5'
    and li.reading is null
    and li.prompt in ('日','月','人','学','生','休','木','本','校','字','語','話','読','電','見','聞','食','飲','入','出','口','目','大','小','少','上','下','左','右','前','後','新','古','多')
    and (
      coalesce(rel->>'kanji', '') = ''
      or coalesce(rel->>'note', '') = ''
      or coalesce(rel->>'relation', '') not in ('same_radical','similar_shape','shared_component','concept_related')
    );

  if v_invalid <> 0 then
    raise exception 'KOJAC Kanji learning aids validation failed: % invalid related Kanji entries', v_invalid;
  end if;

  select count(*) into v_self_relations
  from public.learning_items as li
  cross join lateral jsonb_array_elements(li.extra->'related_kanji') as rel
  where li.item_type = 'kanji'
    and li.jlpt_level = 'N5'
    and li.reading is null
    and li.prompt in ('日','月','人','学','生','休','木','本','校','字','語','話','読','電','見','聞','食','飲','入','出','口','目','大','小','少','上','下','左','右','前','後','新','古','多')
    and rel->>'kanji' = li.prompt;

  if v_self_relations <> 0 then
    raise exception 'KOJAC Kanji learning aids validation failed: self-relations found';
  end if;
end $$;

commit;
