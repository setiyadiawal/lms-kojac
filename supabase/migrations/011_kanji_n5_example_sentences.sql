-- KOJAC LMS — Kanji Detail Enhancements
-- Migration 011: add curated N5 example sentences to existing Kanji metadata.
-- Incremental only. Does not alter schema, RLS, review_progress, Vocabulary, Hiragana, or Katakana.
-- Sentences are original KOJAC learning examples intended for beginner-level practice.

with sentence_data(prompt, sentences) as (
values
  ('一', '[{"japanese":"りんごを一つ買います。","reading":"りんごを ひとつ かいます。","meaning":"Saya membeli satu buah apel."},{"japanese":"教室に学生が一人います。","reading":"きょうしつに がくせいが ひとり います。","meaning":"Ada satu siswa di kelas."}]'::jsonb),
  ('二', '[{"japanese":"りんごを二つ買います。","reading":"りんごを ふたつ かいます。","meaning":"Saya membeli dua buah apel."},{"japanese":"兄弟が二人います。","reading":"きょうだいが ふたり います。","meaning":"Saya mempunyai dua saudara."}]'::jsonb),
  ('三', '[{"japanese":"みかんを三つ食べます。","reading":"みかんを みっつ たべます。","meaning":"Saya makan tiga buah jeruk."},{"japanese":"学生が三人来ます。","reading":"がくせいが さんにん きます。","meaning":"Tiga siswa akan datang."}]'::jsonb),
  ('四', '[{"japanese":"たまごを四つ買います。","reading":"たまごを よっつ かいます。","meaning":"Saya membeli empat butir telur."},{"japanese":"家族は四人です。","reading":"かぞくは よにんです。","meaning":"Keluarga saya terdiri dari empat orang."}]'::jsonb),
  ('五', '[{"japanese":"りんごを五つください。","reading":"りんごを いつつ ください。","meaning":"Tolong beri saya lima buah apel."},{"japanese":"学生が五人います。","reading":"がくせいが ごにん います。","meaning":"Ada lima siswa."}]'::jsonb),
  ('六', '[{"japanese":"パンを六つ買います。","reading":"ぱんを むっつ かいます。","meaning":"Saya membeli enam buah roti."},{"japanese":"学生が六人います。","reading":"がくせいが ろくにん います。","meaning":"Ada enam siswa."}]'::jsonb),
  ('七', '[{"japanese":"りんごを七つ買います。","reading":"りんごを ななつ かいます。","meaning":"Saya membeli tujuh buah apel."},{"japanese":"七人で行きます。","reading":"しちにんで いきます。","meaning":"Kami pergi bertujuh."}]'::jsonb),
  ('八', '[{"japanese":"みかんを八つ買います。","reading":"みかんを やっつ かいます。","meaning":"Saya membeli delapan buah jeruk."},{"japanese":"学生が八人います。","reading":"がくせいが はちにん います。","meaning":"Ada delapan siswa."}]'::jsonb),
  ('九', '[{"japanese":"りんごを九つ買います。","reading":"りんごを ここのつ かいます。","meaning":"Saya membeli sembilan buah apel."},{"japanese":"学生が九人います。","reading":"がくせいが きゅうにん います。","meaning":"Ada sembilan siswa."}]'::jsonb),
  ('十', '[{"japanese":"十時に寝ます。","reading":"じゅうじに ねます。","meaning":"Saya tidur pukul sepuluh."},{"japanese":"学生が十人います。","reading":"がくせいが じゅうにん います。","meaning":"Ada sepuluh siswa."}]'::jsonb),
  ('百', '[{"japanese":"このペンは百円です。","reading":"この ぺんは ひゃくえんです。","meaning":"Pulpen ini seharga seratus yen."},{"japanese":"学生が百人います。","reading":"がくせいが ひゃくにん います。","meaning":"Ada seratus siswa."}]'::jsonb),
  ('千', '[{"japanese":"この本は千円です。","reading":"この ほんは せんえんです。","meaning":"Buku ini seharga seribu yen."},{"japanese":"千円をください。","reading":"せんえんを ください。","meaning":"Tolong berikan seribu yen."}]'::jsonb),
  ('万', '[{"japanese":"このかばんは一万円です。","reading":"この かばんは いちまんえんです。","meaning":"Tas ini seharga sepuluh ribu yen."},{"japanese":"一万円あります。","reading":"いちまんえん あります。","meaning":"Ada sepuluh ribu yen."}]'::jsonb),
  ('円', '[{"japanese":"この水は百円です。","reading":"この みずは ひゃくえんです。","meaning":"Air ini seharga seratus yen."},{"japanese":"五百円を払います。","reading":"ごひゃくえんを はらいます。","meaning":"Saya membayar lima ratus yen."}]'::jsonb),
  ('日', '[{"japanese":"日曜日は休みです。","reading":"にちようびは やすみです。","meaning":"Hari Minggu adalah hari libur."},{"japanese":"来年、日本へ行きます。","reading":"らいねん、にほんへ いきます。","meaning":"Tahun depan saya pergi ke Jepang."}]'::jsonb),
  ('月', '[{"japanese":"月曜日に学校へ行きます。","reading":"げつようびに がっこうへ いきます。","meaning":"Saya pergi ke sekolah pada hari Senin."},{"japanese":"今月はテストがあります。","reading":"こんげつは てすとが あります。","meaning":"Bulan ini ada ujian."}]'::jsonb),
  ('火', '[{"japanese":"火曜日に日本語を勉強します。","reading":"かようびに にほんごを べんきょうします。","meaning":"Saya belajar bahasa Jepang pada hari Selasa."},{"japanese":"火はとても熱いです。","reading":"ひは とても あついです。","meaning":"Api sangat panas."}]'::jsonb),
  ('水', '[{"japanese":"毎朝、水を飲みます。","reading":"まいあさ、みずを のみます。","meaning":"Saya minum air setiap pagi."},{"japanese":"水曜日は学校へ行きます。","reading":"すいようびは がっこうへ いきます。","meaning":"Pada hari Rabu saya pergi ke sekolah."}]'::jsonb),
  ('木', '[{"japanese":"公園に大きい木があります。","reading":"こうえんに おおきい きが あります。","meaning":"Ada pohon besar di taman."},{"japanese":"木曜日に日本語を勉強します。","reading":"もくようびに にほんごを べんきょうします。","meaning":"Saya belajar bahasa Jepang pada hari Kamis."}]'::jsonb),
  ('金', '[{"japanese":"今、お金がありません。","reading":"いま、おかねが ありません。","meaning":"Sekarang saya tidak punya uang."},{"japanese":"金曜日に友だちと会います。","reading":"きんようびに ともだちと あいます。","meaning":"Saya bertemu teman pada hari Jumat."}]'::jsonb),
  ('土', '[{"japanese":"土曜日は休みです。","reading":"どようびは やすみです。","meaning":"Hari Sabtu adalah hari libur."},{"japanese":"土の上に花があります。","reading":"つちの うえに はなが あります。","meaning":"Ada bunga di atas tanah."}]'::jsonb),
  ('年', '[{"japanese":"今年は日本へ行きます。","reading":"ことしは にほんへ いきます。","meaning":"Tahun ini saya pergi ke Jepang."},{"japanese":"来年も日本語を勉強します。","reading":"らいねんも にほんごを べんきょうします。","meaning":"Tahun depan saya juga akan belajar bahasa Jepang."}]'::jsonb),
  ('時', '[{"japanese":"毎朝七時に起きます。","reading":"まいあさ しちじに おきます。","meaning":"Saya bangun pukul tujuh setiap pagi."},{"japanese":"一時間、日本語を勉強します。","reading":"いちじかん、にほんごを べんきょうします。","meaning":"Saya belajar bahasa Jepang selama satu jam."}]'::jsonb),
  ('分', '[{"japanese":"駅まで五分です。","reading":"えきまで ごふんです。","meaning":"Ke stasiun membutuhkan lima menit."},{"japanese":"日本語が少し分かります。","reading":"にほんごが すこし わかります。","meaning":"Saya sedikit mengerti bahasa Jepang."}]'::jsonb),
  ('半', '[{"japanese":"今は一時半です。","reading":"いまは いちじはんです。","meaning":"Sekarang pukul setengah dua."},{"japanese":"りんごを半分食べます。","reading":"りんごを はんぶん たべます。","meaning":"Saya makan setengah buah apel."}]'::jsonb),
  ('今', '[{"japanese":"今、学校にいます。","reading":"いま、がっこうに います。","meaning":"Sekarang saya berada di sekolah."},{"japanese":"今月はテストがあります。","reading":"こんげつは てすとが あります。","meaning":"Bulan ini ada ujian."}]'::jsonb),
  ('午', '[{"japanese":"午前八時に学校へ行きます。","reading":"ごぜん はちじに がっこうへ いきます。","meaning":"Saya pergi ke sekolah pukul delapan pagi."},{"japanese":"午後三時に帰ります。","reading":"ごご さんじに かえります。","meaning":"Saya pulang pukul tiga sore."}]'::jsonb),
  ('前', '[{"japanese":"学校の前に店があります。","reading":"がっこうの まえに みせが あります。","meaning":"Ada toko di depan sekolah."},{"japanese":"午前九時に来てください。","reading":"ごぜん くじに きてください。","meaning":"Silakan datang pukul sembilan pagi."}]'::jsonb),
  ('後', '[{"japanese":"ごはんの後で勉強します。","reading":"ごはんの あとで べんきょうします。","meaning":"Saya belajar setelah makan."},{"japanese":"午後は家にいます。","reading":"ごごは いえに います。","meaning":"Pada sore hari saya berada di rumah."}]'::jsonb),
  ('毎', '[{"japanese":"毎日、日本語を勉強します。","reading":"まいにち、にほんごを べんきょうします。","meaning":"Saya belajar bahasa Jepang setiap hari."},{"japanese":"毎週日曜日に休みます。","reading":"まいしゅう にちようびに やすみます。","meaning":"Saya beristirahat setiap hari Minggu."}]'::jsonb),
  ('人', '[{"japanese":"あの人は先生です。","reading":"あの ひとは せんせいです。","meaning":"Orang itu adalah guru."},{"japanese":"教室に三人います。","reading":"きょうしつに さんにん います。","meaning":"Ada tiga orang di kelas."}]'::jsonb),
  ('子', '[{"japanese":"子どもが公園で遊びます。","reading":"こどもが こうえんで あそびます。","meaning":"Anak-anak bermain di taman."},{"japanese":"女の子は学生です。","reading":"おんなのこは がくせいです。","meaning":"Anak perempuan itu adalah siswa."}]'::jsonb),
  ('女', '[{"japanese":"あの女の人は先生です。","reading":"あの おんなのひとは せんせいです。","meaning":"Perempuan itu adalah guru."},{"japanese":"女の子が二人います。","reading":"おんなのこが ふたり います。","meaning":"Ada dua anak perempuan."}]'::jsonb),
  ('男', '[{"japanese":"男の人が来ます。","reading":"おとこのひとが きます。","meaning":"Seorang pria akan datang."},{"japanese":"男の子は学生です。","reading":"おとこのこは がくせいです。","meaning":"Anak laki-laki itu adalah siswa."}]'::jsonb),
  ('父', '[{"japanese":"父は会社員です。","reading":"ちちは かいしゃいんです。","meaning":"Ayah saya adalah karyawan perusahaan."},{"japanese":"お父さんは元気です。","reading":"おとうさんは げんきです。","meaning":"Ayah dalam keadaan sehat."}]'::jsonb),
  ('母', '[{"japanese":"母は日本語を話します。","reading":"ははは にほんごを はなします。","meaning":"Ibu saya berbicara bahasa Jepang."},{"japanese":"お母さんは家にいます。","reading":"おかあさんは いえに います。","meaning":"Ibu berada di rumah."}]'::jsonb),
  ('友', '[{"japanese":"友だちと学校へ行きます。","reading":"ともだちと がっこうへ いきます。","meaning":"Saya pergi ke sekolah bersama teman."},{"japanese":"友だちは日本人です。","reading":"ともだちは にほんじんです。","meaning":"Teman saya orang Jepang."}]'::jsonb),
  ('先', '[{"japanese":"先生に聞きます。","reading":"せんせいに ききます。","meaning":"Saya bertanya kepada guru."},{"japanese":"先月、日本へ行きました。","reading":"せんげつ、にほんへ いきました。","meaning":"Bulan lalu saya pergi ke Jepang."}]'::jsonb),
  ('生', '[{"japanese":"私は学生です。","reading":"わたしは がくせいです。","meaning":"Saya adalah siswa / mahasiswa."},{"japanese":"子どもが生まれました。","reading":"こどもが うまれました。","meaning":"Seorang anak telah lahir."}]'::jsonb),
  ('名', '[{"japanese":"名前を書いてください。","reading":"なまえを かいてください。","meaning":"Tolong tuliskan nama."},{"japanese":"私の名字はヤマダです。","reading":"わたしの みょうじは やまだです。","meaning":"Nama keluarga saya Yamada."}]'::jsonb),
  ('山', '[{"japanese":"日曜日に山へ行きます。","reading":"にちようびに やまへ いきます。","meaning":"Saya pergi ke gunung pada hari Minggu."},{"japanese":"富士山は高いです。","reading":"ふじさんは たかいです。","meaning":"Gunung Fuji tinggi."}]'::jsonb),
  ('川', '[{"japanese":"川の水はきれいです。","reading":"かわの みずは きれいです。","meaning":"Air sungai itu bersih."},{"japanese":"小さい川があります。","reading":"ちいさい かわが あります。","meaning":"Ada sungai kecil."}]'::jsonb),
  ('天', '[{"japanese":"今日は天気がいいです。","reading":"きょうは てんきが いいです。","meaning":"Cuaca hari ini bagus."},{"japanese":"あしたの天気は雨です。","reading":"あしたの てんきは あめです。","meaning":"Cuaca besok hujan."}]'::jsonb),
  ('気', '[{"japanese":"お元気ですか。","reading":"おげんきですか。","meaning":"Apa kabar?"},{"japanese":"今日は天気がいいです。","reading":"きょうは てんきが いいです。","meaning":"Cuaca hari ini bagus."}]'::jsonb),
  ('雨', '[{"japanese":"今日は雨です。","reading":"きょうは あめです。","meaning":"Hari ini hujan."},{"japanese":"大雨ですから、家にいます。","reading":"おおあめですから、いえに います。","meaning":"Karena hujan lebat, saya berada di rumah."}]'::jsonb),
  ('電', '[{"japanese":"電車で学校へ行きます。","reading":"でんしゃで がっこうへ いきます。","meaning":"Saya pergi ke sekolah dengan kereta."},{"japanese":"母に電話します。","reading":"ははに でんわします。","meaning":"Saya menelepon ibu."}]'::jsonb),
  ('学', '[{"japanese":"私は日本語を学校で勉強します。","reading":"わたしは にほんごを がっこうで べんきょうします。","meaning":"Saya belajar bahasa Jepang di sekolah."},{"japanese":"大学で日本語を学びます。","reading":"だいがくで にほんごを まなびます。","meaning":"Saya belajar bahasa Jepang di universitas."}]'::jsonb),
  ('校', '[{"japanese":"学校は八時からです。","reading":"がっこうは はちじからです。","meaning":"Sekolah dimulai pukul delapan."},{"japanese":"あの人は高校の先生です。","reading":"あの ひとは こうこうの せんせいです。","meaning":"Orang itu adalah guru SMA."}]'::jsonb),
  ('本', '[{"japanese":"毎日本を読みます。","reading":"まいにち ほんを よみます。","meaning":"Saya membaca buku setiap hari."},{"japanese":"来年、日本へ行きたいです。","reading":"らいねん、にほんへ いきたいです。","meaning":"Tahun depan saya ingin pergi ke Jepang."}]'::jsonb),
  ('語', '[{"japanese":"毎日、日本語を勉強します。","reading":"まいにち、にほんごを べんきょうします。","meaning":"Saya belajar bahasa Jepang setiap hari."},{"japanese":"英語も少し話します。","reading":"えいごも すこし はなします。","meaning":"Saya juga sedikit berbicara bahasa Inggris."}]'::jsonb),
  ('文', '[{"japanese":"この文を読んでください。","reading":"この ぶんを よんでください。","meaning":"Tolong baca kalimat ini."},{"japanese":"日本語で作文を書きます。","reading":"にほんごで さくぶんを かきます。","meaning":"Saya menulis karangan dalam bahasa Jepang."}]'::jsonb),
  ('字', '[{"japanese":"この漢字はむずかしいです。","reading":"この かんじは むずかしいです。","meaning":"Kanji ini sulit."},{"japanese":"大きい字で書いてください。","reading":"おおきい じで かいてください。","meaning":"Tolong tulis dengan huruf besar."}]'::jsonb),
  ('何', '[{"japanese":"これは何ですか。","reading":"これは なんですか。","meaning":"Ini apa?"},{"japanese":"今、何時ですか。","reading":"いま、なんじですか。","meaning":"Sekarang pukul berapa?"}]'::jsonb),
  ('上', '[{"japanese":"本はつくえの上です。","reading":"ほんは つくえの うえです。","meaning":"Buku ada di atas meja."},{"japanese":"田中さんは日本語が上手です。","reading":"たなかさんは にほんごが じょうずです。","meaning":"Tanaka mahir berbahasa Jepang."}]'::jsonb),
  ('下', '[{"japanese":"ねこはつくえの下です。","reading":"ねこは つくえの したです。","meaning":"Kucing ada di bawah meja."},{"japanese":"地下に店があります。","reading":"ちかに みせが あります。","meaning":"Ada toko di bawah tanah."}]'::jsonb),
  ('中', '[{"japanese":"かばんの中に本があります。","reading":"かばんの なかに ほんが あります。","meaning":"Ada buku di dalam tas."},{"japanese":"中国から来ました。","reading":"ちゅうごくから きました。","meaning":"Saya datang dari Tiongkok."}]'::jsonb),
  ('外', '[{"japanese":"子どもが外で遊びます。","reading":"こどもが そとで あそびます。","meaning":"Anak-anak bermain di luar."},{"japanese":"外国へ行きたいです。","reading":"がいこくへ いきたいです。","meaning":"Saya ingin pergi ke luar negeri."}]'::jsonb),
  ('左', '[{"japanese":"左を見てください。","reading":"ひだりを みてください。","meaning":"Tolong lihat ke kiri."},{"japanese":"左手で書きます。","reading":"ひだりてで かきます。","meaning":"Saya menulis dengan tangan kiri."}]'::jsonb),
  ('右', '[{"japanese":"右を見てください。","reading":"みぎを みてください。","meaning":"Tolong lihat ke kanan."},{"japanese":"右手で食べます。","reading":"みぎてで たべます。","meaning":"Saya makan dengan tangan kanan."}]'::jsonb),
  ('東', '[{"japanese":"東京に住んでいます。","reading":"とうきょうに すんでいます。","meaning":"Saya tinggal di Tokyo."},{"japanese":"東に山があります。","reading":"ひがしに やまが あります。","meaning":"Ada gunung di sebelah timur."}]'::jsonb),
  ('西', '[{"japanese":"駅の西口で会いましょう。","reading":"えきの にしぐちで あいましょう。","meaning":"Mari bertemu di pintu barat stasiun."},{"japanese":"西に川があります。","reading":"にしに かわが あります。","meaning":"Ada sungai di sebelah barat."}]'::jsonb),
  ('南', '[{"japanese":"南口から出ます。","reading":"みなみぐちから でます。","meaning":"Saya keluar melalui pintu selatan."},{"japanese":"南はあたたかいです。","reading":"みなみは あたたかいです。","meaning":"Daerah selatan hangat."}]'::jsonb),
  ('北', '[{"japanese":"北口で待ちます。","reading":"きたぐちで まちます。","meaning":"Saya menunggu di pintu utara."},{"japanese":"北は寒いです。","reading":"きたは さむいです。","meaning":"Daerah utara dingin."}]'::jsonb),
  ('口', '[{"japanese":"口を開けてください。","reading":"くちを あけてください。","meaning":"Tolong buka mulut."},{"japanese":"入口は右です。","reading":"いりぐちは みぎです。","meaning":"Pintu masuk ada di sebelah kanan."}]'::jsonb),
  ('目', '[{"japanese":"目が大きいです。","reading":"めが おおきいです。","meaning":"Matanya besar."},{"japanese":"目薬を使います。","reading":"めぐすりを つかいます。","meaning":"Saya menggunakan obat tetes mata."}]'::jsonb),
  ('耳', '[{"japanese":"耳が痛いです。","reading":"みみが いたいです。","meaning":"Telinga saya sakit."},{"japanese":"耳で音を聞きます。","reading":"みみで おとを ききます。","meaning":"Kita mendengar suara dengan telinga."}]'::jsonb),
  ('手', '[{"japanese":"食べる前に手を洗います。","reading":"たべる まえに てを あらいます。","meaning":"Saya mencuci tangan sebelum makan."},{"japanese":"田中さんは日本語が上手です。","reading":"たなかさんは にほんごが じょうずです。","meaning":"Tanaka mahir berbahasa Jepang."}]'::jsonb),
  ('足', '[{"japanese":"今日は足が痛いです。","reading":"きょうは あしが いたいです。","meaning":"Hari ini kaki saya sakit."},{"japanese":"お金が足りません。","reading":"おかねが たりません。","meaning":"Uang saya tidak cukup."}]'::jsonb),
  ('大', '[{"japanese":"この学校は大きいです。","reading":"この がっこうは おおきいです。","meaning":"Sekolah ini besar."},{"japanese":"大学で日本語を勉強します。","reading":"だいがくで にほんごを べんきょうします。","meaning":"Saya belajar bahasa Jepang di universitas."}]'::jsonb),
  ('小', '[{"japanese":"小さい犬がいます。","reading":"ちいさい いぬが います。","meaning":"Ada seekor anjing kecil."},{"japanese":"小学校は家の近くです。","reading":"しょうがっこうは いえの ちかくです。","meaning":"Sekolah dasar berada dekat rumah."}]'::jsonb),
  ('長', '[{"japanese":"このえんぴつは長いです。","reading":"この えんぴつは ながいです。","meaning":"Pensil ini panjang."},{"japanese":"校長先生はあそこです。","reading":"こうちょうせんせいは あそこです。","meaning":"Kepala sekolah ada di sana."}]'::jsonb),
  ('高', '[{"japanese":"富士山は高いです。","reading":"ふじさんは たかいです。","meaning":"Gunung Fuji tinggi."},{"japanese":"この本は高いです。","reading":"この ほんは たかいです。","meaning":"Buku ini mahal."}]'::jsonb),
  ('安', '[{"japanese":"このかばんは安いです。","reading":"この かばんは やすいです。","meaning":"Tas ini murah."},{"japanese":"あの店は安いです。","reading":"あの みせは やすいです。","meaning":"Toko itu murah."}]'::jsonb),
  ('新', '[{"japanese":"新しい本を買います。","reading":"あたらしい ほんを かいます。","meaning":"Saya membeli buku baru."},{"japanese":"毎朝、新聞を読みます。","reading":"まいあさ、しんぶんを よみます。","meaning":"Saya membaca koran setiap pagi."}]'::jsonb),
  ('古', '[{"japanese":"この本は古いです。","reading":"この ほんは ふるいです。","meaning":"Buku ini tua."},{"japanese":"あの学校は古いです。","reading":"あの がっこうは ふるいです。","meaning":"Sekolah itu sudah lama."}]'::jsonb),
  ('多', '[{"japanese":"この町は人が多いです。","reading":"この まちは ひとが おおいです。","meaning":"Kota ini memiliki banyak orang."},{"japanese":"今日は宿題が多いです。","reading":"きょうは しゅくだいが おおいです。","meaning":"Hari ini pekerjaan rumah saya banyak."}]'::jsonb),
  ('少', '[{"japanese":"このクラスは学生が少ないです。","reading":"この くらすは がくせいが すくないです。","meaning":"Kelas ini memiliki sedikit siswa."},{"japanese":"水を少し飲みます。","reading":"みずを すこし のみます。","meaning":"Saya minum sedikit air."}]'::jsonb),
  ('行', '[{"japanese":"毎日、学校へ行きます。","reading":"まいにち、がっこうへ いきます。","meaning":"Saya pergi ke sekolah setiap hari."},{"japanese":"銀行は九時からです。","reading":"ぎんこうは くじからです。","meaning":"Bank buka mulai pukul sembilan."}]'::jsonb),
  ('来', '[{"japanese":"先生が来ます。","reading":"せんせいが きます。","meaning":"Guru akan datang."},{"japanese":"来年、日本へ行きます。","reading":"らいねん、にほんへ いきます。","meaning":"Tahun depan saya pergi ke Jepang."}]'::jsonb),
  ('入', '[{"japanese":"教室に入ります。","reading":"きょうしつに はいります。","meaning":"Saya masuk ke kelas."},{"japanese":"入口は左です。","reading":"いりぐちは ひだりです。","meaning":"Pintu masuk ada di sebelah kiri."}]'::jsonb),
  ('出', '[{"japanese":"教室から出ます。","reading":"きょうしつから でます。","meaning":"Saya keluar dari kelas."},{"japanese":"出口は右です。","reading":"でぐちは みぎです。","meaning":"Pintu keluar ada di sebelah kanan."}]'::jsonb),
  ('休', '[{"japanese":"日曜日は休みです。","reading":"にちようびは やすみです。","meaning":"Hari Minggu adalah hari libur."},{"japanese":"今日は学校を休みます。","reading":"きょうは がっこうを やすみます。","meaning":"Hari ini saya tidak masuk sekolah."}]'::jsonb),
  ('見', '[{"japanese":"毎晩テレビを見ます。","reading":"まいばん てれびを みます。","meaning":"Saya menonton televisi setiap malam."},{"japanese":"この本を見せてください。","reading":"この ほんを みせてください。","meaning":"Tolong perlihatkan buku ini."}]'::jsonb),
  ('聞', '[{"japanese":"先生の話を聞きます。","reading":"せんせいの はなしを ききます。","meaning":"Saya mendengarkan penjelasan guru."},{"japanese":"分からないとき、先生に聞きます。","reading":"わからない とき、せんせいに ききます。","meaning":"Ketika tidak mengerti, saya bertanya kepada guru."}]'::jsonb),
  ('読', '[{"japanese":"毎日本を読みます。","reading":"まいにち ほんを よみます。","meaning":"Saya membaca buku setiap hari."},{"japanese":"日本語の文を読みます。","reading":"にほんごの ぶんを よみます。","meaning":"Saya membaca kalimat bahasa Jepang."}]'::jsonb),
  ('書', '[{"japanese":"名前を書いてください。","reading":"なまえを かいてください。","meaning":"Tolong tuliskan nama."},{"japanese":"ノートに日本語を書きます。","reading":"のーとに にほんごを かきます。","meaning":"Saya menulis bahasa Jepang di buku catatan."}]'::jsonb),
  ('話', '[{"japanese":"友だちと日本語で話します。","reading":"ともだちと にほんごで はなします。","meaning":"Saya berbicara bahasa Jepang dengan teman."},{"japanese":"母に電話します。","reading":"ははに でんわします。","meaning":"Saya menelepon ibu."}]'::jsonb),
  ('食', '[{"japanese":"毎朝ごはんを食べます。","reading":"まいあさ ごはんを たべます。","meaning":"Saya makan sarapan setiap pagi."},{"japanese":"家で食事をします。","reading":"いえで しょくじを します。","meaning":"Saya makan di rumah."}]'::jsonb),
  ('飲', '[{"japanese":"毎朝、水を飲みます。","reading":"まいあさ、みずを のみます。","meaning":"Saya minum air setiap pagi."},{"japanese":"冷たい飲み物をください。","reading":"つめたい のみものを ください。","meaning":"Tolong beri saya minuman dingin."}]'::jsonb),
  ('買', '[{"japanese":"本を買います。","reading":"ほんを かいます。","meaning":"Saya membeli buku."},{"japanese":"スーパーで買い物をします。","reading":"すーぱーで かいものを します。","meaning":"Saya berbelanja di supermarket."}]'::jsonb)
)
update public.learning_items as li
set extra =
  jsonb_set(
    jsonb_set(coalesce(li.extra, '{}'::jsonb), '{sentences}', sd.sentences, true),
    '{sentence_dataset}',
    '"N5-sentences-v1"'::jsonb,
    true
  )
from sentence_data as sd
where li.item_type = 'kanji'
  and li.jlpt_level = 'N5'
  and li.reading is null
  and li.prompt = sd.prompt;

-- Validation: all 90 N5 Kanji rows must have 2+ complete sentence examples,
-- and every Japanese sentence must actually contain its target Kanji.
do $$
declare
  v_total integer;
  v_missing integer;
  v_invalid integer;
begin
  select count(*)
    into v_total
  from public.learning_items
  where item_type = 'kanji'
    and jlpt_level = 'N5'
    and reading is null
    and coalesce(extra->>'dataset', '') = 'N5-v1';

  if v_total <> 90 then
    raise exception 'KOJAC Kanji sentence validation failed: expected 90 N5 Kanji rows, found %', v_total;
  end if;

  select count(*)
    into v_missing
  from public.learning_items
  where item_type = 'kanji'
    and jlpt_level = 'N5'
    and reading is null
    and coalesce(extra->>'dataset', '') = 'N5-v1'
    and (
      jsonb_typeof(extra->'sentences') is distinct from 'array'
      or jsonb_array_length(extra->'sentences') < 2
    );

  if v_missing <> 0 then
    raise exception 'KOJAC Kanji sentence validation failed: % row(s) are missing 2+ sentences', v_missing;
  end if;

  select count(*)
    into v_invalid
  from public.learning_items as li
  cross join lateral jsonb_array_elements(li.extra->'sentences') as sentence
  where li.item_type = 'kanji'
    and li.jlpt_level = 'N5'
    and li.reading is null
    and coalesce(li.extra->>'dataset', '') = 'N5-v1'
    and (
      coalesce(sentence->>'japanese', '') = ''
      or coalesce(sentence->>'reading', '') = ''
      or coalesce(sentence->>'meaning', '') = ''
      or position(li.prompt in coalesce(sentence->>'japanese', '')) = 0
    );

  if v_invalid <> 0 then
    raise exception 'KOJAC Kanji sentence validation failed: % invalid sentence row(s)', v_invalid;
  end if;
end $$;
