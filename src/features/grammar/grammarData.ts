export type GrammarJlptLevel = 'N5' | 'N4' | 'N3';

export interface GrammarExample {
  japanese: string;
  reading: string;
  meaning: string;
  highlight: string[];
}

export interface GrammarCommonMistake {
  wrong: string;
  correct: string;
  explanation: string;
}

export interface GrammarPattern {
  id: string;
  chapter: number;
  order: number;
  pattern: string;
  meaning: string;
  jlptLevel: GrammarJlptLevel;
  formula: string;
  explanation: string;
  keywords: string[];
  examples: GrammarExample[];
  notes: string[];
  commonMistakes: GrammarCommonMistake[];
  relatedPatterns: string[];
}

export interface GrammarChapter {
  chapter: number;
  title: string;
  description: string;
}

export const GRAMMAR_CHAPTERS: GrammarChapter[] = [
  {
    "chapter": 1,
    "title": "Pengenalan Kalimat Dasar",
    "description": "Mengenal kalimat nominal dasar, partikel topik, kepemilikan, dan kata tanya orang/benda."
  },
  {
    "chapter": 2,
    "title": "Kata Tunjuk dan Kepemilikan",
    "description": "Menggunakan これ・それ・あれ, この・その・あの, serta pola untuk menanyakan jenis dan pemilik benda."
  },
  {
    "chapter": 3,
    "title": "Tempat, Arah, dan Harga",
    "description": "Menunjuk benda, tempat, arah, dan menanyakan lokasi maupun harga dengan pola dasar yang sering dipakai."
  },
{
  "chapter": 4,
  "title": "Waktu dan Bentuk Sopan Kata Kerja",
  "description": "Menyatakan waktu kegiatan serta membentuk kata kerja sopan sekarang, negatif, lampau, dan lampau negatif."
},
{
  "chapter": 5,
  "title": "Perpindahan dan Transportasi",
  "description": "Membicarakan tujuan perpindahan, alat transportasi, teman perjalanan, dan rentang tempat/waktu."
},
{
  "chapter": 6,
  "title": "Objek dan Aktivitas Sehari-hari",
  "description": "Menggunakan partikel objek dan tempat kegiatan serta membuat ajakan sederhana."
},
{
  "chapter": 7,
  "title": "Alat, Bahasa, dan Pemberian Benda",
  "description": "Menyatakan alat atau bahasa yang digunakan, serta pemberian dan penerimaan benda."
},
{
  "chapter": 8,
  "title": "Kata Sifat Dasar",
  "description": "Membentuk kalimat dengan KS-i dan KS-na dalam bentuk positif maupun negatif."
},
{
  "chapter": 9,
  "title": "Kesukaan, Kemampuan, dan Alasan",
  "description": "Menyatakan suka/tidak suka, kemampuan dasar, pemahaman, dan alasan dengan から."
},
{
  "chapter": 10,
  "title": "Keberadaan dan Lokasi",
  "description": "Menyatakan keberadaan benda/orang serta letak menggunakan あります・います dan ungkapan posisi."
},
{
  "chapter": 11,
  "title": "Jumlah, Durasi, dan Frekuensi",
  "description": "Menggunakan kata bantu bilangan, durasi, perkiraan jumlah, dan frekuensi kegiatan."
},
{
  "chapter": 12,
  "title": "Bentuk Lampau dan Perbandingan",
  "description": "Menyatakan keadaan lampau dan membandingkan dua atau lebih hal."
},
{
  "chapter": 13,
  "title": "Keinginan dan Tujuan Pergi",
  "description": "Menyatakan keinginan terhadap benda atau kegiatan dan tujuan melakukan aktivitas."
},
{
  "chapter": 14,
  "title": "Bentuk て dan Permintaan Dasar",
  "description": "Mengenal bentuk て untuk permintaan, kegiatan berlangsung, bantuan, dan urutan kegiatan."
},
{
  "chapter": 15,
  "title": "Izin, Larangan, dan Keadaan",
  "description": "Meminta/memberi izin, menyatakan larangan, serta memahami beberapa fungsi ～ています."
},
{
  "chapter": 16,
  "title": "Menghubungkan Kegiatan dan Sifat",
  "description": "Menggabungkan kegiatan dan sifat dalam satu kalimat dengan bentuk sambung dasar."
},
{
  "chapter": 17,
  "title": "Bentuk ない dan Kewajiban",
  "description": "Menggunakan bentuk negatif kata kerja untuk larangan, kewajiban, ketidakharusan, dan batas waktu."
},
{
  "chapter": 18,
  "title": "Bentuk Kamus dan Kemampuan Dasar",
  "description": "Menggunakan bentuk kamus untuk kemampuan, hobi, serta hubungan waktu sederhana."
},
{
  "chapter": 19,
  "title": "Pengalaman dan Perubahan",
  "description": "Menyatakan pengalaman, daftar kegiatan, dan perubahan keadaan."
},
{
  "chapter": 20,
  "title": "Bentuk Biasa / 普通形",
  "description": "Mengenal bentuk biasa kata kerja, kata sifat, dan kata benda sebagai dasar menuju pola N4."
},
{
  "chapter": 21,
  "title": "Pendapat, Kutipan, dan Dugaan",
  "description": "Menggunakan bentuk biasa untuk pendapat, kutipan, perkiraan, dan kemungkinan."
},
{
  "chapter": 22,
  "title": "Klausa yang Menerangkan Kata Benda",
  "description": "Membuat frasa nomina yang diterangkan oleh kata kerja, kata sifat, atau klausa."
},
{
  "chapter": 23,
  "title": "Waktu dan Hubungan Antar Kejadian",
  "description": "Menjelaskan waktu, urutan kejadian, dan hubungan otomatis antar kejadian."
},
{
  "chapter": 24,
  "title": "Memberi dan Menerima Bantuan",
  "description": "Menggunakan ～てあげる・～てもらう・～てくれる untuk bantuan dan tindakan demi orang lain."
},
{
  "chapter": 25,
  "title": "Kondisi Dasar N4",
  "description": "Membandingkan penggunaan ～たら・～ても・～なら・～ば dalam kalimat kondisi."
},
{
  "chapter": 26,
  "title": "Penjelasan dan Permintaan Sopan",
  "description": "Memberi penjelasan dengan ～んです dan membuat pertanyaan atau permintaan yang lebih natural."
},
{
  "chapter": 27,
  "title": "Kemampuan dan Batasan",
  "description": "Menggunakan bentuk potensial serta ungkapan batasan seperti ～しか～ない dan ～だけ."
},
{
  "chapter": 28,
  "title": "Kegiatan Bersamaan dan Alasan",
  "description": "Menyatakan dua kegiatan bersamaan, beberapa alasan, sebab, dan tujuan."
},
{
  "chapter": 29,
  "title": "Keadaan Hasil, Penyelesaian, dan Persiapan",
  "description": "Menyatakan keadaan hasil, tindakan selesai, keadaan yang disiapkan, dan persiapan sebelumnya."
},
{
  "chapter": 30,
  "title": "Niat, Rencana, dan Perubahan Kemampuan",
  "description": "Menyatakan niat, rencana, serta perubahan kemampuan atau keadaan dari waktu ke waktu."
},
{
  "chapter": 31,
  "title": "Kebiasaan, Saran, dan Keputusan",
  "description": "Menyatakan usaha membentuk kebiasaan, saran, harapan logis, dan keputusan."
},
{
  "chapter": 32,
  "title": "Informasi, Kesan, dan Laporan",
  "description": "Menyampaikan kabar, kesan dari penampilan, perkiraan berdasarkan keadaan, serta laporan ucapan."
},
{
  "chapter": 33,
  "title": "Kondisi Lanjutan dan Pertentangan",
  "description": "Menggunakan kondisi dalam situasi nyata dan menyatakan hasil yang bertentangan dengan harapan."
},
{
  "chapter": 34,
  "title": "Cara, Percobaan, Kemudahan, dan Kelebihan",
  "description": "Menjelaskan cara, melakukan percobaan, kemudahan/kesulitan, dan keadaan berlebihan."
},
{
  "chapter": 35,
  "title": "Pola N4 Lanjutan yang Sering Dipakai",
  "description": "Menggunakan pola untuk tahap tindakan, hal yang baru terjadi, perubahan berkelanjutan, dan kalimat pasif."
}
];

export const GRAMMAR_PATTERNS: GrammarPattern[] = [
  {
    "id": "ch1-desu",
    "chapter": 1,
    "order": 1,
    "pattern": "～は～です",
    "meaning": "A adalah B",
    "jlptLevel": "N5",
    "formula": "KB1 + は + KB2 + です",
    "explanation": "Pola ini digunakan untuk menyatakan bahwa topik A adalah B. Partikel は menandai topik yang sedang dibicarakan, sedangkan です membuat kalimat terdengar sopan.",
    "keywords": [
      "adalah",
      "identitas",
      "perkenalan",
      "kalimat nominal",
      "topik"
    ],
    "examples": [
      {
        "japanese": "私は学生です。",
        "reading": "わたしは がくせいです。",
        "meaning": "Saya adalah pelajar.",
        "highlight": [
          "は",
          "です"
        ]
      },
      {
        "japanese": "田中さんは先生です。",
        "reading": "たなかさんは せんせいです。",
        "meaning": "Tanaka adalah guru.",
        "highlight": [
          "は",
          "です"
        ]
      },
      {
        "japanese": "これは本です。",
        "reading": "これは ほんです。",
        "meaning": "Ini adalah buku.",
        "highlight": [
          "は",
          "です"
        ]
      },
      {
        "japanese": "父は会社員です。",
        "reading": "ちちは かいしゃいんです。",
        "meaning": "Ayah saya adalah karyawan perusahaan.",
        "highlight": [
          "は",
          "です"
        ]
      },
      {
        "japanese": "東京は日本の首都です。",
        "reading": "とうきょうは にほんの しゅとです。",
        "meaning": "Tokyo adalah ibu kota Jepang.",
        "highlight": [
          "は",
          "です"
        ]
      }
    ],
    "notes": [
      "Partikel は ditulis は tetapi ketika berfungsi sebagai partikel topik dibaca わ.",
      "です tidak selalu diterjemahkan secara harfiah; fungsinya juga membuat pernyataan menjadi sopan."
    ],
    "commonMistakes": [
      {
        "wrong": "私は学生はです。",
        "correct": "私は学生です。",
        "explanation": "Jangan menambahkan は setelah predikat nominal. は cukup menandai topik di awal pola ini."
      }
    ],
    "relatedPatterns": [
      "ch1-desuka",
      "ch1-dewaarimasen",
      "ch1-mo"
    ]
  },
  {
    "id": "ch1-desuka",
    "chapter": 1,
    "order": 2,
    "pattern": "～は～ですか",
    "meaning": "Apakah A adalah B?",
    "jlptLevel": "N5",
    "formula": "KB1 + は + KB2 + ですか",
    "explanation": "Tambahkan か di akhir kalimat sopan untuk membuat pertanyaan. Dalam percakapan sopan, intonasi naik membantu menandai bahwa kalimat tersebut adalah pertanyaan.",
    "keywords": [
      "apakah",
      "pertanyaan",
      "desu ka",
      "konfirmasi"
    ],
    "examples": [
      {
        "japanese": "田中さんは学生ですか。",
        "reading": "たなかさんは がくせいですか。",
        "meaning": "Apakah Tanaka seorang pelajar?",
        "highlight": [
          "は",
          "ですか"
        ]
      },
      {
        "japanese": "これは辞書ですか。",
        "reading": "これは じしょですか。",
        "meaning": "Apakah ini kamus?",
        "highlight": [
          "は",
          "ですか"
        ]
      },
      {
        "japanese": "山田さんは先生ですか。",
        "reading": "やまださんは せんせいですか。",
        "meaning": "Apakah Yamada seorang guru?",
        "highlight": [
          "は",
          "ですか"
        ]
      },
      {
        "japanese": "お母さんは会社員ですか。",
        "reading": "おかあさんは かいしゃいんですか。",
        "meaning": "Apakah ibu Anda seorang karyawan perusahaan?",
        "highlight": [
          "は",
          "ですか"
        ]
      },
      {
        "japanese": "ここは教室ですか。",
        "reading": "ここは きょうしつですか。",
        "meaning": "Apakah di sini ruang kelas?",
        "highlight": [
          "は",
          "ですか"
        ]
      }
    ],
    "notes": [
      "Dalam tulisan formal, tanda tanya tidak selalu wajib karena か sudah menandai pertanyaan, tetapi dalam materi pemula tanda tanya membantu keterbacaan."
    ],
    "commonMistakes": [
      {
        "wrong": "これは本かです。",
        "correct": "これは本ですか。",
        "explanation": "Pada pola sopan, か diletakkan setelah です, bukan sebelum です."
      }
    ],
    "relatedPatterns": [
      "ch1-desu",
      "ch1-dewaarimasen",
      "ch2-soudesu"
    ]
  },
  {
    "id": "ch1-dewaarimasen",
    "chapter": 1,
    "order": 3,
    "pattern": "～は～ではありません",
    "meaning": "A bukan B",
    "jlptLevel": "N5",
    "formula": "KB1 + は + KB2 + ではありません",
    "explanation": "Pola ini adalah bentuk negatif sopan dari ～です untuk kata benda. Dalam percakapan sehari-hari, じゃありません juga sering digunakan sebagai bentuk yang lebih lisan.",
    "keywords": [
      "bukan",
      "negatif",
      "dewa arimasen",
      "ja arimasen"
    ],
    "examples": [
      {
        "japanese": "私は先生ではありません。",
        "reading": "わたしは せんせいではありません。",
        "meaning": "Saya bukan guru.",
        "highlight": [
          "は",
          "ではありません"
        ]
      },
      {
        "japanese": "これは新聞ではありません。",
        "reading": "これは しんぶんではありません。",
        "meaning": "Ini bukan koran.",
        "highlight": [
          "は",
          "ではありません"
        ]
      },
      {
        "japanese": "田中さんは医者ではありません。",
        "reading": "たなかさんは いしゃではありません。",
        "meaning": "Tanaka bukan dokter.",
        "highlight": [
          "は",
          "ではありません"
        ]
      },
      {
        "japanese": "父は銀行員ではありません。",
        "reading": "ちちは ぎんこういんではありません。",
        "meaning": "Ayah saya bukan pegawai bank.",
        "highlight": [
          "は",
          "ではありません"
        ]
      },
      {
        "japanese": "あそこは図書館ではありません。",
        "reading": "あそこは としょかんではありません。",
        "meaning": "Di sana bukan perpustakaan.",
        "highlight": [
          "は",
          "ではありません"
        ]
      }
    ],
    "notes": [
      "じゃありません adalah bentuk percakapan dari ではありません.",
      "Untuk tahap awal, gunakan ではありません ketika ingin menjaga gaya sopan dan jelas."
    ],
    "commonMistakes": [
      {
        "wrong": "私は先生ありません。",
        "correct": "私は先生ではありません。",
        "explanation": "Untuk menegasikan predikat kata benda dalam pola ini diperlukan では sebelum ありません."
      }
    ],
    "relatedPatterns": [
      "ch1-desu",
      "ch1-desuka",
      "ch2-soudewaarimasen"
    ]
  },
  {
    "id": "ch1-mo",
    "chapter": 1,
    "order": 4,
    "pattern": "～も",
    "meaning": "juga / pun",
    "jlptLevel": "N5",
    "formula": "KB + も + Predikat",
    "explanation": "Partikel も digunakan ketika informasi tentang topik kedua sama atau sejenis dengan informasi sebelumnya. Dalam posisi ini も biasanya menggantikan は.",
    "keywords": [
      "juga",
      "pun",
      "mo",
      "partikel"
    ],
    "examples": [
      {
        "japanese": "私は学生です。山田さんも学生です。",
        "reading": "わたしは がくせいです。やまださんも がくせいです。",
        "meaning": "Saya pelajar. Yamada juga pelajar.",
        "highlight": [
          "も"
        ]
      },
      {
        "japanese": "父は会社員です。母も会社員です。",
        "reading": "ちちは かいしゃいんです。ははも かいしゃいんです。",
        "meaning": "Ayah saya karyawan perusahaan. Ibu saya juga karyawan perusahaan.",
        "highlight": [
          "も"
        ]
      },
      {
        "japanese": "これは日本の本です。それも日本の本です。",
        "reading": "これは にほんの ほんです。それも にほんの ほんです。",
        "meaning": "Ini buku Jepang. Itu juga buku Jepang.",
        "highlight": [
          "も"
        ]
      },
      {
        "japanese": "私はインドネシア人です。友だちもインドネシア人です。",
        "reading": "わたしは いんどねしあじんです。ともだちも いんどねしあじんです。",
        "meaning": "Saya orang Indonesia. Teman saya juga orang Indonesia.",
        "highlight": [
          "も"
        ]
      },
      {
        "japanese": "月曜日は休みです。火曜日も休みです。",
        "reading": "げつようびは やすみです。かようびも やすみです。",
        "meaning": "Senin libur. Selasa juga libur.",
        "highlight": [
          "も"
        ]
      }
    ],
    "notes": [
      "Jika も menggantikan topik, jangan memakai は dan も sekaligus sebagai *はも pada pola dasar ini."
    ],
    "commonMistakes": [
      {
        "wrong": "山田さんはも学生です。",
        "correct": "山田さんも学生です。",
        "explanation": "Dalam pola dasar ini も menggantikan は untuk menyatakan 'juga'."
      }
    ],
    "relatedPatterns": [
      "ch1-desu",
      "ch1-no"
    ]
  },
  {
    "id": "ch1-no",
    "chapter": 1,
    "order": 5,
    "pattern": "KB1 の KB2",
    "meaning": "KB2 milik/berkaitan dengan KB1",
    "jlptLevel": "N5",
    "formula": "KB1 + の + KB2",
    "explanation": "Partikel の menghubungkan dua kata benda. Hubungannya dapat berupa kepemilikan, asal, organisasi, jenis, atau keterangan lain yang menjelaskan KB2.",
    "keywords": [
      "kepemilikan",
      "asal",
      "hubungan",
      "no",
      "milik"
    ],
    "examples": [
      {
        "japanese": "これは私の本です。",
        "reading": "これは わたしの ほんです。",
        "meaning": "Ini buku saya.",
        "highlight": [
          "の"
        ]
      },
      {
        "japanese": "田中さんは日本の会社員です。",
        "reading": "たなかさんは にほんの かいしゃいんです。",
        "meaning": "Tanaka adalah karyawan perusahaan Jepang.",
        "highlight": [
          "の"
        ]
      },
      {
        "japanese": "あれは学校の車です。",
        "reading": "あれは がっこうの くるまです。",
        "meaning": "Itu mobil milik sekolah.",
        "highlight": [
          "の"
        ]
      },
      {
        "japanese": "私はKOJACの学生です。",
        "reading": "わたしは こじゃっくの がくせいです。",
        "meaning": "Saya siswa KOJAC.",
        "highlight": [
          "の"
        ]
      },
      {
        "japanese": "これは日本語の辞書です。",
        "reading": "これは にほんごの じしょです。",
        "meaning": "Ini kamus bahasa Jepang.",
        "highlight": [
          "の"
        ]
      }
    ],
    "notes": [
      "Arti の tidak selalu 'milik'. Tentukan hubungan KB1 dan KB2 dari konteks."
    ],
    "commonMistakes": [
      {
        "wrong": "これは本の私です。",
        "correct": "これは私の本です。",
        "explanation": "Urutannya adalah penjelas + の + benda yang dijelaskan: 私の本."
      }
    ],
    "relatedPatterns": [
      "ch2-dareno",
      "ch2-nanno",
      "ch2-kono-sono-ano"
    ]
  },
  {
    "id": "ch1-nan",
    "chapter": 1,
    "order": 6,
    "pattern": "なん／何",
    "meaning": "apa",
    "jlptLevel": "N5",
    "formula": "なん + ですか / なん + の + KB / konteks lain",
    "explanation": "何 adalah kata tanya 'apa'. Pada pola dasar, なん sering muncul sebelum です atau sebelum の. Bacaan 何 dapat berubah menjadi なに pada konteks lain, jadi pelajari bersama pola penggunaannya.",
    "keywords": [
      "apa",
      "what",
      "nan",
      "nani",
      "kata tanya"
    ],
    "examples": [
      {
        "japanese": "これは何ですか。",
        "reading": "これは なんですか。",
        "meaning": "Ini apa?",
        "highlight": [
          "何ですか"
        ]
      },
      {
        "japanese": "あれは何ですか。",
        "reading": "あれは なんですか。",
        "meaning": "Itu apa?",
        "highlight": [
          "何ですか"
        ]
      },
      {
        "japanese": "田中さんの仕事は何ですか。",
        "reading": "たなかさんの しごとは なんですか。",
        "meaning": "Apa pekerjaan Tanaka?",
        "highlight": [
          "何ですか"
        ]
      },
      {
        "japanese": "これは何の本ですか。",
        "reading": "これは なんの ほんですか。",
        "meaning": "Ini buku tentang/jenis apa?",
        "highlight": [
          "何の"
        ]
      },
      {
        "japanese": "今日は何曜日ですか。",
        "reading": "きょうは なんようびですか。",
        "meaning": "Hari ini hari apa?",
        "highlight": [
          "何曜日ですか"
        ]
      }
    ],
    "notes": [
      "何 tidak selalu dibaca なん. Misalnya 何を biasanya dibaca なにを."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch2-nanno",
      "ch1-dare",
      "ch1-donata"
    ]
  },
  {
    "id": "ch1-dare",
    "chapter": 1,
    "order": 7,
    "pattern": "だれ／誰",
    "meaning": "siapa",
    "jlptLevel": "N5",
    "formula": "だれ + ですか / だれ + の + KB",
    "explanation": "だれ digunakan untuk menanyakan identitas orang dalam situasi umum. Untuk situasi yang lebih sopan, gunakan どなた.",
    "keywords": [
      "siapa",
      "who",
      "dare",
      "orang",
      "kata tanya"
    ],
    "examples": [
      {
        "japanese": "あの人は誰ですか。",
        "reading": "あの ひとは だれですか。",
        "meaning": "Siapa orang itu?",
        "highlight": [
          "誰ですか"
        ]
      },
      {
        "japanese": "先生は誰ですか。",
        "reading": "せんせいは だれですか。",
        "meaning": "Siapa gurunya?",
        "highlight": [
          "誰ですか"
        ]
      },
      {
        "japanese": "これは誰のかばんですか。",
        "reading": "これは だれの かばんですか。",
        "meaning": "Ini tas siapa?",
        "highlight": [
          "誰の"
        ]
      },
      {
        "japanese": "教室にいる人は誰ですか。",
        "reading": "きょうしつに いる ひとは だれですか。",
        "meaning": "Siapa orang yang ada di ruang kelas?",
        "highlight": [
          "誰ですか"
        ]
      },
      {
        "japanese": "その方は誰ですか。",
        "reading": "その かたは だれですか。",
        "meaning": "Siapa orang itu?",
        "highlight": [
          "誰ですか"
        ]
      }
    ],
    "notes": [
      "Untuk menanyakan identitas orang yang perlu dihormati, どなた lebih sopan daripada だれ."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch1-donata",
      "ch2-dareno",
      "ch1-nan"
    ]
  },
  {
    "id": "ch1-donata",
    "chapter": 1,
    "order": 8,
    "pattern": "どなた",
    "meaning": "siapa (lebih sopan)",
    "jlptLevel": "N5",
    "formula": "どなた + ですか / どなた + の + KB",
    "explanation": "どなた adalah bentuk lebih sopan dari だれ. Pola ini cocok ketika berbicara dengan pelanggan, orang yang belum dikenal, atau orang yang perlu dihormati.",
    "keywords": [
      "siapa sopan",
      "donata",
      "formal",
      "orang"
    ],
    "examples": [
      {
        "japanese": "あの方はどなたですか。",
        "reading": "あの かたは どなたですか。",
        "meaning": "Siapakah orang itu?",
        "highlight": [
          "どなたですか"
        ]
      },
      {
        "japanese": "先生はどなたですか。",
        "reading": "せんせいは どなたですか。",
        "meaning": "Siapakah gurunya?",
        "highlight": [
          "どなたですか"
        ]
      },
      {
        "japanese": "こちらはどなたですか。",
        "reading": "こちらは どなたですか。",
        "meaning": "Siapakah orang ini?",
        "highlight": [
          "どなたですか"
        ]
      },
      {
        "japanese": "担当の方はどなたですか。",
        "reading": "たんとうの かたは どなたですか。",
        "meaning": "Siapakah orang yang bertanggung jawab?",
        "highlight": [
          "どなたですか"
        ]
      },
      {
        "japanese": "お客様はどなたですか。",
        "reading": "おきゃくさまは どなたですか。",
        "meaning": "Siapakah tamunya?",
        "highlight": [
          "どなたですか"
        ]
      }
    ],
    "notes": [
      "どなた sendiri sudah sopan; pilih juga kosakata pendamping yang sopan seperti 方 bila konteks memerlukannya."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch1-dare",
      "ch3-dochira"
    ]
  },
  {
    "id": "ch2-kore-sore-are",
    "chapter": 2,
    "order": 1,
    "pattern": "これ・それ・あれ",
    "meaning": "ini / itu / itu di sana",
    "jlptLevel": "N5",
    "formula": "これ / それ / あれ + は + KB + です",
    "explanation": "これ menunjuk benda dekat pembicara, それ dekat lawan bicara, dan あれ jauh dari keduanya. Ketiganya dapat berdiri sendiri sebagai kata ganti benda.",
    "keywords": [
      "ini",
      "itu",
      "kore",
      "sore",
      "are",
      "kata tunjuk"
    ],
    "examples": [
      {
        "japanese": "これは本です。",
        "reading": "これは ほんです。",
        "meaning": "Ini buku.",
        "highlight": [
          "これ"
        ]
      },
      {
        "japanese": "それは辞書です。",
        "reading": "それは じしょです。",
        "meaning": "Itu kamus.",
        "highlight": [
          "それ"
        ]
      },
      {
        "japanese": "あれは学校です。",
        "reading": "あれは がっこうです。",
        "meaning": "Itu di sana adalah sekolah.",
        "highlight": [
          "あれ"
        ]
      },
      {
        "japanese": "これは私の傘です。",
        "reading": "これは わたしの かさです。",
        "meaning": "Ini payung saya.",
        "highlight": [
          "これ"
        ]
      },
      {
        "japanese": "それは田中さんのかばんです。",
        "reading": "それは たなかさんの かばんです。",
        "meaning": "Itu tas Tanaka.",
        "highlight": [
          "それ"
        ]
      }
    ],
    "notes": [
      "これ・それ・あれ tidak langsung diikuti kata benda. Jika ingin langsung menerangkan kata benda, gunakan この・その・あの."
    ],
    "commonMistakes": [
      {
        "wrong": "これ本です。",
        "correct": "これは本です。",
        "explanation": "これ adalah kata ganti benda. Dalam kalimat nominal dasar, gunakan partikel seperti は sebelum predikat."
      },
      {
        "wrong": "これ本",
        "correct": "この本",
        "explanation": "Untuk bentuk 'buku ini', gunakan この + 本, bukan これ + 本."
      }
    ],
    "relatedPatterns": [
      "ch2-kono-sono-ano",
      "ch3-dore"
    ]
  },
  {
    "id": "ch2-kono-sono-ano",
    "chapter": 2,
    "order": 2,
    "pattern": "この・その・あの + KB",
    "meaning": "KB ini / KB itu / KB itu di sana",
    "jlptLevel": "N5",
    "formula": "この / その / あの + KB",
    "explanation": "この・その・あの harus diikuti kata benda. Jaraknya mengikuti konsep これ・それ・あれ: dekat pembicara, dekat lawan bicara, atau jauh dari keduanya.",
    "keywords": [
      "benda ini",
      "benda itu",
      "kono",
      "sono",
      "ano",
      "kata tunjuk"
    ],
    "examples": [
      {
        "japanese": "この本は日本語の本です。",
        "reading": "この ほんは にほんごの ほんです。",
        "meaning": "Buku ini adalah buku bahasa Jepang.",
        "highlight": [
          "この"
        ]
      },
      {
        "japanese": "そのかばんは私のです。",
        "reading": "その かばんは わたしのです。",
        "meaning": "Tas itu milik saya.",
        "highlight": [
          "その"
        ]
      },
      {
        "japanese": "あの人は先生です。",
        "reading": "あの ひとは せんせいです。",
        "meaning": "Orang itu adalah guru.",
        "highlight": [
          "あの"
        ]
      },
      {
        "japanese": "この車は父の車です。",
        "reading": "この くるまは ちちの くるまです。",
        "meaning": "Mobil ini adalah mobil ayah saya.",
        "highlight": [
          "この"
        ]
      },
      {
        "japanese": "その辞書は英語の辞書です。",
        "reading": "その じしょは えいごの じしょです。",
        "meaning": "Kamus itu adalah kamus bahasa Inggris.",
        "highlight": [
          "その"
        ]
      }
    ],
    "notes": [
      "この・その・あの tidak dapat berdiri sendiri; selalu ikuti dengan kata benda."
    ],
    "commonMistakes": [
      {
        "wrong": "このは本です。",
        "correct": "これは本です。",
        "explanation": "この harus langsung diikuti kata benda. Jika kata bendanya tidak disebut, gunakan これ."
      }
    ],
    "relatedPatterns": [
      "ch2-kore-sore-are",
      "ch3-dono",
      "ch1-no"
    ]
  },
  {
    "id": "ch2-soudesu",
    "chapter": 2,
    "order": 3,
    "pattern": "そうです",
    "meaning": "Benar / Ya, begitu",
    "jlptLevel": "N5",
    "formula": "はい、そうです",
    "explanation": "そうです digunakan untuk mengonfirmasi informasi yang baru disebutkan lawan bicara. Pada pertanyaan identifikasi sederhana, jawaban はい、そうです berarti 'Ya, benar/begitu'.",
    "keywords": [
      "benar",
      "ya begitu",
      "sou desu",
      "konfirmasi"
    ],
    "examples": [
      {
        "japanese": "「これは田中さんの本ですか。」「はい、そうです。」",
        "reading": "これは たなかさんの ほんですか。はい、そうです。",
        "meaning": "“Apakah ini buku Tanaka?” “Ya, benar.”",
        "highlight": [
          "そうです"
        ]
      },
      {
        "japanese": "「山田さんは学生ですか。」「はい、そうです。」",
        "reading": "やまださんは がくせいですか。はい、そうです。",
        "meaning": "“Apakah Yamada seorang pelajar?” “Ya, benar.”",
        "highlight": [
          "そうです"
        ]
      },
      {
        "japanese": "「あれは学校ですか。」「はい、そうです。」",
        "reading": "あれは がっこうですか。はい、そうです。",
        "meaning": "“Apakah itu sekolah?” “Ya, benar.”",
        "highlight": [
          "そうです"
        ]
      },
      {
        "japanese": "「これは日本語の辞書ですか。」「はい、そうです。」",
        "reading": "これは にほんごの じしょですか。はい、そうです。",
        "meaning": "“Apakah ini kamus bahasa Jepang?” “Ya, benar.”",
        "highlight": [
          "そうです"
        ]
      },
      {
        "japanese": "「先生は田中さんですか。」「はい、そうです。」",
        "reading": "せんせいは たなかさんですか。はい、そうです。",
        "meaning": "“Apakah gurunya Tanaka?” “Ya, benar.”",
        "highlight": [
          "そうです"
        ]
      }
    ],
    "notes": [
      "そうです di sini adalah respons konfirmasi. Pola そうです dengan arti 'katanya...' adalah pola lain yang dipelajari pada tahap lebih lanjut."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch2-soudewaarimasen",
      "ch2-soudesuka",
      "ch1-desuka"
    ]
  },
  {
    "id": "ch2-soudewaarimasen",
    "chapter": 2,
    "order": 4,
    "pattern": "そうではありません",
    "meaning": "Tidak, bukan begitu",
    "jlptLevel": "N5",
    "formula": "いいえ、そうではありません",
    "explanation": "Gunakan そうではありません untuk menyangkal informasi yang baru ditanyakan atau dinyatakan. Dalam percakapan, そうじゃありません juga sering terdengar.",
    "keywords": [
      "bukan begitu",
      "tidak",
      "sou dewa arimasen",
      "penyangkalan"
    ],
    "examples": [
      {
        "japanese": "「これは田中さんの本ですか。」「いいえ、そうではありません。」",
        "reading": "これは たなかさんの ほんですか。いいえ、そうではありません。",
        "meaning": "“Apakah ini buku Tanaka?” “Tidak, bukan.”",
        "highlight": [
          "そうではありません"
        ]
      },
      {
        "japanese": "「山田さんは先生ですか。」「いいえ、そうではありません。」",
        "reading": "やまださんは せんせいですか。いいえ、そうではありません。",
        "meaning": "“Apakah Yamada guru?” “Tidak, bukan.”",
        "highlight": [
          "そうではありません"
        ]
      },
      {
        "japanese": "「あれは病院ですか。」「いいえ、そうではありません。」",
        "reading": "あれは びょういんですか。いいえ、そうではありません。",
        "meaning": "“Apakah itu rumah sakit?” “Tidak, bukan.”",
        "highlight": [
          "そうではありません"
        ]
      },
      {
        "japanese": "「これは英語の辞書ですか。」「いいえ、そうではありません。」",
        "reading": "これは えいごの じしょですか。いいえ、そうではありません。",
        "meaning": "“Apakah ini kamus bahasa Inggris?” “Tidak, bukan.”",
        "highlight": [
          "そうではありません"
        ]
      },
      {
        "japanese": "「その人は会社員ですか。」「いいえ、そうではありません。」",
        "reading": "その ひとは かいしゃいんですか。いいえ、そうではありません。",
        "meaning": "“Apakah orang itu karyawan perusahaan?” “Tidak, bukan.”",
        "highlight": [
          "そうではありません"
        ]
      }
    ],
    "notes": [
      "Dalam jawaban nyata, setelah menyangkal biasanya kita dapat menambahkan informasi yang benar, misalnya いいえ、そうではありません。学生です。"
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch2-soudesu",
      "ch1-dewaarimasen"
    ]
  },
  {
    "id": "ch2-soudesuka",
    "chapter": 2,
    "order": 5,
    "pattern": "そうですか",
    "meaning": "Oh, begitu? / Begitu ya",
    "jlptLevel": "N5",
    "formula": "そうですか",
    "explanation": "そうですか dipakai sebagai respons ketika menerima atau memastikan informasi baru. Nuansanya bergantung pada intonasi dan konteks, sering setara dengan 'Oh, begitu' atau 'Begitu ya'.",
    "keywords": [
      "oh begitu",
      "begitu ya",
      "sou desu ka",
      "respons"
    ],
    "examples": [
      {
        "japanese": "「明日は休みです。」「そうですか。」",
        "reading": "あしたは やすみです。そうですか。",
        "meaning": "“Besok libur.” “Oh, begitu.”",
        "highlight": [
          "そうですか"
        ]
      },
      {
        "japanese": "「田中さんは先生です。」「そうですか。」",
        "reading": "たなかさんは せんせいです。そうですか。",
        "meaning": "“Tanaka adalah guru.” “Oh, begitu.”",
        "highlight": [
          "そうですか"
        ]
      },
      {
        "japanese": "「この本は千円です。」「そうですか。」",
        "reading": "この ほんは せんえんです。そうですか。",
        "meaning": "“Buku ini seribu yen.” “Begitu ya.”",
        "highlight": [
          "そうですか"
        ]
      },
      {
        "japanese": "「駅はあそこです。」「そうですか。」",
        "reading": "えきは あそこです。そうですか。",
        "meaning": "“Stasiunnya di sana.” “Oh, begitu.”",
        "highlight": [
          "そうですか"
        ]
      },
      {
        "japanese": "「山田さんはインドネシア人です。」「そうですか。」",
        "reading": "やまださんは いんどねしあじんです。そうですか。",
        "meaning": "“Yamada orang Indonesia.” “Oh, begitu.”",
        "highlight": [
          "そうですか"
        ]
      }
    ],
    "notes": [
      "Jangan samakan そうですか dengan pertanyaan identifikasi biasa ～ですか. Di sini そう merujuk pada informasi yang baru didengar."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch2-soudesu",
      "ch2-soudewaarimasen"
    ]
  },
  {
    "id": "ch2-nanno",
    "chapter": 2,
    "order": 6,
    "pattern": "なんの + KB",
    "meaning": "KB apa / tentang apa / jenis apa",
    "jlptLevel": "N5",
    "formula": "なん + の + KB",
    "explanation": "なんの digunakan untuk menanyakan jenis, kategori, isi, atau hubungan suatu benda. Jawabannya biasanya berupa KB1 の KB2.",
    "keywords": [
      "apa jenis",
      "tentang apa",
      "nanno",
      "jenis benda"
    ],
    "examples": [
      {
        "japanese": "これは何の本ですか。",
        "reading": "これは なんの ほんですか。",
        "meaning": "Ini buku tentang/jenis apa?",
        "highlight": [
          "何の"
        ]
      },
      {
        "japanese": "それは何の雑誌ですか。",
        "reading": "それは なんの ざっしですか。",
        "meaning": "Itu majalah tentang apa?",
        "highlight": [
          "何の"
        ]
      },
      {
        "japanese": "あれは何の会社ですか。",
        "reading": "あれは なんの かいしゃですか。",
        "meaning": "Itu perusahaan bidang apa?",
        "highlight": [
          "何の"
        ]
      },
      {
        "japanese": "これは何のカードですか。",
        "reading": "これは なんの かーどですか。",
        "meaning": "Ini kartu apa?",
        "highlight": [
          "何の"
        ]
      },
      {
        "japanese": "その本は何の本ですか。",
        "reading": "その ほんは なんの ほんですか。",
        "meaning": "Buku itu buku tentang apa?",
        "highlight": [
          "何の"
        ]
      }
    ],
    "notes": [
      "Pertanyaan なんの berfokus pada hubungan/jenis kata benda, bukan sekadar nama bendanya."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch1-no",
      "ch1-nan",
      "ch2-dareno"
    ]
  },
  {
    "id": "ch2-dareno",
    "chapter": 2,
    "order": 7,
    "pattern": "だれの + KB",
    "meaning": "KB milik siapa",
    "jlptLevel": "N5",
    "formula": "だれ + の + KB",
    "explanation": "だれの digunakan untuk menanyakan pemilik atau pihak yang berhubungan dengan suatu benda. Jawaban biasanya memakai nama/orang + の + benda.",
    "keywords": [
      "milik siapa",
      "whose",
      "dare no",
      "kepemilikan"
    ],
    "examples": [
      {
        "japanese": "これは誰の本ですか。",
        "reading": "これは だれの ほんですか。",
        "meaning": "Ini buku siapa?",
        "highlight": [
          "誰の"
        ]
      },
      {
        "japanese": "その傘は誰のですか。",
        "reading": "その かさは だれのですか。",
        "meaning": "Payung itu milik siapa?",
        "highlight": [
          "誰の"
        ]
      },
      {
        "japanese": "あれは誰の車ですか。",
        "reading": "あれは だれの くるまですか。",
        "meaning": "Itu mobil siapa?",
        "highlight": [
          "誰の"
        ]
      },
      {
        "japanese": "このかばんは誰のですか。",
        "reading": "この かばんは だれのですか。",
        "meaning": "Tas ini milik siapa?",
        "highlight": [
          "誰の"
        ]
      },
      {
        "japanese": "机の上の辞書は誰のですか。",
        "reading": "つくえの うえの じしょは だれのですか。",
        "meaning": "Kamus di atas meja itu milik siapa?",
        "highlight": [
          "誰の"
        ]
      }
    ],
    "notes": [
      "Jika benda yang dimaksud sudah jelas, kata benda setelah の dapat dihilangkan: これは田中さんのです。"
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch1-no",
      "ch1-dare",
      "ch2-nanno"
    ]
  },
  {
    "id": "ch3-dore",
    "chapter": 3,
    "order": 1,
    "pattern": "どれ",
    "meaning": "yang mana (berdiri sendiri)",
    "jlptLevel": "N5",
    "formula": "どれ + が / ですか (sesuai kalimat)",
    "explanation": "どれ digunakan untuk memilih satu benda dari beberapa pilihan ketika kata bendanya tidak disebut langsung setelah kata tanya tersebut.",
    "keywords": [
      "yang mana",
      "which one",
      "dore",
      "pilihan"
    ],
    "examples": [
      {
        "japanese": "田中さんの本はどれですか。",
        "reading": "たなかさんの ほんは どれですか。",
        "meaning": "Yang mana buku Tanaka?",
        "highlight": [
          "どれですか"
        ]
      },
      {
        "japanese": "あなたの傘はどれですか。",
        "reading": "あなたの かさは どれですか。",
        "meaning": "Yang mana payung Anda?",
        "highlight": [
          "どれですか"
        ]
      },
      {
        "japanese": "日本語の辞書はどれですか。",
        "reading": "にほんごの じしょは どれですか。",
        "meaning": "Yang mana kamus bahasa Jepang?",
        "highlight": [
          "どれですか"
        ]
      },
      {
        "japanese": "山田さんのかばんはどれですか。",
        "reading": "やまださんの かばんは どれですか。",
        "meaning": "Yang mana tas Yamada?",
        "highlight": [
          "どれですか"
        ]
      },
      {
        "japanese": "あなたの車はどれですか。",
        "reading": "あなたの くるまは どれですか。",
        "meaning": "Yang mana mobil Anda?",
        "highlight": [
          "どれですか"
        ]
      }
    ],
    "notes": [
      "どれ dapat berdiri sendiri. Jika langsung diikuti kata benda, gunakan どの + KB."
    ],
    "commonMistakes": [
      {
        "wrong": "どれ本ですか。",
        "correct": "どの本ですか。",
        "explanation": "Untuk 'buku yang mana', どの harus langsung menerangkan 本."
      }
    ],
    "relatedPatterns": [
      "ch3-dono",
      "ch2-kore-sore-are"
    ]
  },
  {
    "id": "ch3-dono",
    "chapter": 3,
    "order": 2,
    "pattern": "どの + KB",
    "meaning": "KB yang mana",
    "jlptLevel": "N5",
    "formula": "どの + KB",
    "explanation": "どの digunakan ketika kata benda yang ditanyakan disebut langsung setelahnya. Pola ini berpasangan dengan この・その・あの.",
    "keywords": [
      "benda yang mana",
      "dono",
      "which",
      "pilihan"
    ],
    "examples": [
      {
        "japanese": "どの本が田中さんの本ですか。",
        "reading": "どの ほんが たなかさんの ほんですか。",
        "meaning": "Buku yang mana milik Tanaka?",
        "highlight": [
          "どの本"
        ]
      },
      {
        "japanese": "どの傘があなたのですか。",
        "reading": "どの かさが あなたのですか。",
        "meaning": "Payung yang mana milik Anda?",
        "highlight": [
          "どの傘"
        ]
      },
      {
        "japanese": "どの人が先生ですか。",
        "reading": "どの ひとが せんせいですか。",
        "meaning": "Orang yang mana gurunya?",
        "highlight": [
          "どの人"
        ]
      },
      {
        "japanese": "どのかばんが山田さんのですか。",
        "reading": "どの かばんが やまださんのですか。",
        "meaning": "Tas yang mana milik Yamada?",
        "highlight": [
          "どのかばん"
        ]
      },
      {
        "japanese": "どの辞書が日本語の辞書ですか。",
        "reading": "どの じしょが にほんごの じしょですか。",
        "meaning": "Kamus yang mana kamus bahasa Jepang?",
        "highlight": [
          "どの辞書"
        ]
      }
    ],
    "notes": [
      "どの tidak dapat berdiri sendiri; selalu diikuti kata benda."
    ],
    "commonMistakes": [
      {
        "wrong": "どのですか。",
        "correct": "どれですか。",
        "explanation": "Jika kata bendanya tidak disebut setelah kata tanya, gunakan どれ."
      }
    ],
    "relatedPatterns": [
      "ch3-dore",
      "ch2-kono-sono-ano"
    ]
  },
  {
    "id": "ch3-koko-soko-asoko",
    "chapter": 3,
    "order": 3,
    "pattern": "ここ・そこ・あそこ",
    "meaning": "di sini / di situ / di sana",
    "jlptLevel": "N5",
    "formula": "ここ / そこ / あそこ + は + Tempat + です",
    "explanation": "ここ menunjuk tempat dekat pembicara, そこ tempat dekat lawan bicara, dan あそこ tempat yang jauh dari keduanya.",
    "keywords": [
      "di sini",
      "di situ",
      "di sana",
      "koko",
      "soko",
      "asoko",
      "tempat"
    ],
    "examples": [
      {
        "japanese": "ここは教室です。",
        "reading": "ここは きょうしつです。",
        "meaning": "Di sini adalah ruang kelas.",
        "highlight": [
          "ここ"
        ]
      },
      {
        "japanese": "そこは事務所です。",
        "reading": "そこは じむしょです。",
        "meaning": "Di situ adalah kantor.",
        "highlight": [
          "そこ"
        ]
      },
      {
        "japanese": "あそこは食堂です。",
        "reading": "あそこは しょくどうです。",
        "meaning": "Di sana adalah kantin.",
        "highlight": [
          "あそこ"
        ]
      },
      {
        "japanese": "ここは受付です。",
        "reading": "ここは うけつけです。",
        "meaning": "Di sini adalah meja resepsionis.",
        "highlight": [
          "ここ"
        ]
      },
      {
        "japanese": "あそこは駅です。",
        "reading": "あそこは えきです。",
        "meaning": "Di sana adalah stasiun.",
        "highlight": [
          "あそこ"
        ]
      }
    ],
    "notes": [
      "Untuk bentuk yang lebih sopan sekaligus dapat menunjuk arah/orang, gunakan こちら・そちら・あちら."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch3-doko",
      "ch3-kochira-sochira-achira"
    ]
  },
  {
    "id": "ch3-doko",
    "chapter": 3,
    "order": 4,
    "pattern": "どこ",
    "meaning": "di mana",
    "jlptLevel": "N5",
    "formula": "KB + は + どこ + ですか",
    "explanation": "どこ digunakan untuk menanyakan tempat atau lokasi. Dalam kalimat nominal dasar, bentuk yang sangat umum adalah ～はどこですか.",
    "keywords": [
      "di mana",
      "where",
      "doko",
      "lokasi",
      "tempat"
    ],
    "examples": [
      {
        "japanese": "トイレはどこですか。",
        "reading": "といれは どこですか。",
        "meaning": "Toilet di mana?",
        "highlight": [
          "どこですか"
        ]
      },
      {
        "japanese": "駅はどこですか。",
        "reading": "えきは どこですか。",
        "meaning": "Stasiun di mana?",
        "highlight": [
          "どこですか"
        ]
      },
      {
        "japanese": "受付はどこですか。",
        "reading": "うけつけは どこですか。",
        "meaning": "Meja resepsionis di mana?",
        "highlight": [
          "どこですか"
        ]
      },
      {
        "japanese": "田中さんの教室はどこですか。",
        "reading": "たなかさんの きょうしつは どこですか。",
        "meaning": "Ruang kelas Tanaka di mana?",
        "highlight": [
          "どこですか"
        ]
      },
      {
        "japanese": "会社はどこですか。",
        "reading": "かいしゃは どこですか。",
        "meaning": "Perusahaannya di mana?",
        "highlight": [
          "どこですか"
        ]
      }
    ],
    "notes": [
      "どこ adalah bentuk umum. どちら dapat menjadi bentuk lebih sopan ketika menanyakan lokasi/arah dalam konteks tertentu."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch3-koko-soko-asoko",
      "ch3-dochira"
    ]
  },
  {
    "id": "ch3-kochira-sochira-achira",
    "chapter": 3,
    "order": 5,
    "pattern": "こちら・そちら・あちら",
    "meaning": "sebelah sini / situ / sana; bentuk sopan",
    "jlptLevel": "N5",
    "formula": "こちら / そちら / あちら + です",
    "explanation": "こちら・そちら・あちら dapat menunjuk arah atau tempat dan juga dipakai sebagai bentuk lebih sopan dari ここ・そこ・あそこ. Dalam situasi sopan, こちら juga dapat merujuk pada orang.",
    "keywords": [
      "arah",
      "tempat sopan",
      "kochira",
      "sochira",
      "achira"
    ],
    "examples": [
      {
        "japanese": "受付はこちらです。",
        "reading": "うけつけは こちらです。",
        "meaning": "Meja resepsionis ada di sebelah sini.",
        "highlight": [
          "こちら"
        ]
      },
      {
        "japanese": "会議室はそちらです。",
        "reading": "かいぎしつは そちらです。",
        "meaning": "Ruang rapat ada di sebelah situ.",
        "highlight": [
          "そちら"
        ]
      },
      {
        "japanese": "出口はあちらです。",
        "reading": "でぐちは あちらです。",
        "meaning": "Pintu keluar ada di sebelah sana.",
        "highlight": [
          "あちら"
        ]
      },
      {
        "japanese": "エレベーターはこちらです。",
        "reading": "えれべーたーは こちらです。",
        "meaning": "Lift ada di sebelah sini.",
        "highlight": [
          "こちら"
        ]
      },
      {
        "japanese": "田中さんはこちらです。",
        "reading": "たなかさんは こちらです。",
        "meaning": "Tanaka ada di sini / Ini Tanaka (sopan, sesuai konteks).",
        "highlight": [
          "こちら"
        ]
      }
    ],
    "notes": [
      "Makna tepatnya bisa 'arah ini', 'di sini', atau 'orang ini' bergantung konteks."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch3-koko-soko-asoko",
      "ch3-dochira",
      "ch1-donata"
    ]
  },
  {
    "id": "ch3-dochira",
    "chapter": 3,
    "order": 6,
    "pattern": "どちら",
    "meaning": "yang mana / sebelah mana / di mana (lebih sopan)",
    "jlptLevel": "N5",
    "formula": "KB + は + どちら + ですか",
    "explanation": "どちら digunakan untuk menanyakan pilihan antara arah/pihak, dan dalam konteks sopan dapat digunakan untuk menanyakan lokasi atau asal. Maknanya ditentukan oleh konteks.",
    "keywords": [
      "sebelah mana",
      "yang mana sopan",
      "dochira",
      "arah",
      "lokasi"
    ],
    "examples": [
      {
        "japanese": "エレベーターはどちらですか。",
        "reading": "えれべーたーは どちらですか。",
        "meaning": "Lift ada di sebelah mana?",
        "highlight": [
          "どちらですか"
        ]
      },
      {
        "japanese": "受付はどちらですか。",
        "reading": "うけつけは どちらですか。",
        "meaning": "Meja resepsionis ada di sebelah mana?",
        "highlight": [
          "どちらですか"
        ]
      },
      {
        "japanese": "お国はどちらですか。",
        "reading": "おくには どちらですか。",
        "meaning": "Anda berasal dari negara mana?",
        "highlight": [
          "どちらですか"
        ]
      },
      {
        "japanese": "会社はどちらですか。",
        "reading": "かいしゃは どちらですか。",
        "meaning": "Perusahaan Anda yang mana/di mana? (sopan, sesuai konteks)",
        "highlight": [
          "どちらですか"
        ]
      },
      {
        "japanese": "先生はどちらですか。",
        "reading": "せんせいは どちらですか。",
        "meaning": "Yang mana orangnya guru? / Guru ada di mana? (bergantung konteks)",
        "highlight": [
          "どちらですか"
        ]
      }
    ],
    "notes": [
      "Karena どちら mempunyai beberapa fungsi, perhatikan konteks agar tidak langsung menerjemahkannya hanya sebagai 'di mana'."
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch3-kochira-sochira-achira",
      "ch3-doko",
      "ch1-donata"
    ]
  },
  {
    "id": "ch3-ikura",
    "chapter": 3,
    "order": 7,
    "pattern": "いくら",
    "meaning": "berapa harganya",
    "jlptLevel": "N5",
    "formula": "KB + は + いくら + ですか",
    "explanation": "いくら digunakan untuk menanyakan harga. Pada pola dasar, benda yang ditanyakan menjadi topik dengan は lalu diikuti いくらですか.",
    "keywords": [
      "harga",
      "berapa",
      "ikura",
      "uang"
    ],
    "examples": [
      {
        "japanese": "この本はいくらですか。",
        "reading": "この ほんは いくらですか。",
        "meaning": "Berapa harga buku ini?",
        "highlight": [
          "いくらですか"
        ]
      },
      {
        "japanese": "そのかばんはいくらですか。",
        "reading": "その かばんは いくらですか。",
        "meaning": "Berapa harga tas itu?",
        "highlight": [
          "いくらですか"
        ]
      },
      {
        "japanese": "この時計はいくらですか。",
        "reading": "この とけいは いくらですか。",
        "meaning": "Berapa harga jam ini?",
        "highlight": [
          "いくらですか"
        ]
      },
      {
        "japanese": "あの傘はいくらですか。",
        "reading": "あの かさは いくらですか。",
        "meaning": "Berapa harga payung itu?",
        "highlight": [
          "いくらですか"
        ]
      },
      {
        "japanese": "この辞書はいくらですか。",
        "reading": "この じしょは いくらですか。",
        "meaning": "Berapa harga kamus ini?",
        "highlight": [
          "いくらですか"
        ]
      }
    ],
    "notes": [
      "いくら menanyakan harga secara umum. Jawaban dapat memakai angka + satuan mata uang, misalnya 千円です。"
    ],
    "commonMistakes": [],
    "relatedPatterns": [
      "ch3-dore",
      "ch3-dono"
    ]
  },
{
  "id": "ch4-time-ni",
  "chapter": 4,
  "order": 1,
  "pattern": "Waktu + に + KK",
  "meaning": "melakukan kegiatan pada waktu tertentu",
  "jlptLevel": "N5",
  "formula": "Waktu tertentu + に + KK",
  "explanation": "Partikel に menandai waktu tertentu ketika suatu kegiatan dilakukan. Untuk kata seperti 今日・明日・毎日, に biasanya tidak dipakai.",
  "keywords": [
    "waktu",
    "jam",
    "hari",
    "partikel ni",
    "kapan"
  ],
  "examples": [
    {
      "japanese": "毎朝七時に起きます。",
      "reading": "まいあさ しちじに おきます。",
      "meaning": "Saya bangun pukul tujuh setiap pagi.",
      "highlight": [
        "に"
      ]
    },
    {
      "japanese": "十二時に昼ご飯を食べます。",
      "reading": "じゅうにじに ひるごはんを たべます。",
      "meaning": "Saya makan siang pukul dua belas.",
      "highlight": [
        "に"
      ]
    },
    {
      "japanese": "月曜日に日本語を勉強します。",
      "reading": "げつようびに にほんごを べんきょうします。",
      "meaning": "Saya belajar bahasa Jepang pada hari Senin.",
      "highlight": [
        "に"
      ]
    },
    {
      "japanese": "三月に日本へ行きます。",
      "reading": "さんがつに にほんへ いきます。",
      "meaning": "Saya pergi ke Jepang pada bulan Maret.",
      "highlight": [
        "に"
      ]
    },
    {
      "japanese": "九時半に会社へ行きます。",
      "reading": "くじはんに かいしゃへ いきます。",
      "meaning": "Saya pergi ke kantor pukul setengah sepuluh.",
      "highlight": [
        "に"
      ]
    }
  ],
  "notes": [
    "Kata waktu relatif seperti 今日・明日・昨日 biasanya digunakan tanpa に."
  ],
  "commonMistakes": [
    {
      "wrong": "今日に勉強します。",
      "correct": "今日勉強します。",
      "explanation": "今日 adalah kata waktu relatif, sehingga dalam pemakaian dasar tidak memerlukan に."
    }
  ],
  "relatedPatterns": [
    "ch4-verb-masu",
    "ch11-frequency"
  ]
},
{
  "id": "ch4-verb-masu",
  "chapter": 4,
  "order": 2,
  "pattern": "～ます",
  "meaning": "melakukan / akan melakukan (sopan)",
  "jlptLevel": "N5",
  "formula": "KK bentuk ます",
  "explanation": "Bentuk ～ます adalah bentuk sopan kata kerja untuk kegiatan sekarang yang bersifat kebiasaan atau kegiatan yang akan dilakukan.",
  "keywords": [
    "kata kerja",
    "masu",
    "sopan",
    "kebiasaan",
    "masa depan"
  ],
  "examples": [
    {
      "japanese": "毎日日本語を勉強します。",
      "reading": "まいにち にほんごを べんきょうします。",
      "meaning": "Saya belajar bahasa Jepang setiap hari.",
      "highlight": [
        "します"
      ]
    },
    {
      "japanese": "朝六時に起きます。",
      "reading": "あさ ろくじに おきます。",
      "meaning": "Saya bangun pukul enam pagi.",
      "highlight": [
        "起きます"
      ]
    },
    {
      "japanese": "今晩テレビを見ます。",
      "reading": "こんばん てれびを みます。",
      "meaning": "Malam ini saya akan menonton televisi.",
      "highlight": [
        "見ます"
      ]
    },
    {
      "japanese": "日曜日に友達と話します。",
      "reading": "にちようびに ともだちと はなします。",
      "meaning": "Hari Minggu saya berbicara dengan teman.",
      "highlight": [
        "話します"
      ]
    },
    {
      "japanese": "明日図書館へ行きます。",
      "reading": "あした としょかんへ いきます。",
      "meaning": "Besok saya akan pergi ke perpustakaan.",
      "highlight": [
        "行きます"
      ]
    }
  ],
  "notes": [
    "Bentuk ～ます tidak membedakan secara khusus 'sekarang' dan 'masa depan'; konteks waktu menentukan maknanya."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch4-verb-masen",
    "ch4-verb-mashita"
  ]
},
{
  "id": "ch4-verb-masen",
  "chapter": 4,
  "order": 3,
  "pattern": "～ません",
  "meaning": "tidak melakukan (sopan)",
  "jlptLevel": "N5",
  "formula": "KK bentuk ます → ます diganti ません",
  "explanation": "Bentuk ～ません adalah bentuk negatif sopan kata kerja. Digunakan untuk menyatakan bahwa suatu kegiatan tidak dilakukan.",
  "keywords": [
    "negatif",
    "masen",
    "kata kerja",
    "tidak"
  ],
  "examples": [
    {
      "japanese": "今日は働きません。",
      "reading": "きょうは はたらきません。",
      "meaning": "Hari ini saya tidak bekerja.",
      "highlight": [
        "ません"
      ]
    },
    {
      "japanese": "朝はコーヒーを飲みません。",
      "reading": "あさは こーひーを のみません。",
      "meaning": "Pagi hari saya tidak minum kopi.",
      "highlight": [
        "ません"
      ]
    },
    {
      "japanese": "日曜日は学校へ行きません。",
      "reading": "にちようびは がっこうへ いきません。",
      "meaning": "Hari Minggu saya tidak pergi ke sekolah.",
      "highlight": [
        "ません"
      ]
    },
    {
      "japanese": "私はたばこを吸いません。",
      "reading": "わたしは たばこを すいません。",
      "meaning": "Saya tidak merokok.",
      "highlight": [
        "ません"
      ]
    },
    {
      "japanese": "今晩テレビを見ません。",
      "reading": "こんばん てれびを みません。",
      "meaning": "Malam ini saya tidak menonton televisi.",
      "highlight": [
        "ません"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch4-verb-masu",
    "ch4-verb-masendeshita"
  ]
},
{
  "id": "ch4-verb-mashita",
  "chapter": 4,
  "order": 4,
  "pattern": "～ました",
  "meaning": "telah melakukan (sopan)",
  "jlptLevel": "N5",
  "formula": "KK bentuk ます → ます diganti ました",
  "explanation": "Bentuk ～ました menyatakan tindakan yang sudah selesai pada masa lampau dalam gaya sopan.",
  "keywords": [
    "lampau",
    "mashita",
    "kata kerja",
    "sudah"
  ],
  "examples": [
    {
      "japanese": "昨日日本語を勉強しました。",
      "reading": "きのう にほんごを べんきょうしました。",
      "meaning": "Kemarin saya belajar bahasa Jepang.",
      "highlight": [
        "ました"
      ]
    },
    {
      "japanese": "朝ご飯を食べました。",
      "reading": "あさごはんを たべました。",
      "meaning": "Saya sudah sarapan.",
      "highlight": [
        "ました"
      ]
    },
    {
      "japanese": "先週京都へ行きました。",
      "reading": "せんしゅう きょうとへ いきました。",
      "meaning": "Minggu lalu saya pergi ke Kyoto.",
      "highlight": [
        "ました"
      ]
    },
    {
      "japanese": "さっき先生と話しました。",
      "reading": "さっき せんせいと はなしました。",
      "meaning": "Tadi saya berbicara dengan guru.",
      "highlight": [
        "ました"
      ]
    },
    {
      "japanese": "昨日本を買いました。",
      "reading": "きのう ほんを かいました。",
      "meaning": "Kemarin saya membeli buku.",
      "highlight": [
        "ました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch4-verb-masu",
    "ch4-verb-masendeshita"
  ]
},
{
  "id": "ch4-verb-masendeshita",
  "chapter": 4,
  "order": 5,
  "pattern": "～ませんでした",
  "meaning": "tidak melakukan (lampau, sopan)",
  "jlptLevel": "N5",
  "formula": "KK bentuk ます → ます diganti ませんでした",
  "explanation": "Bentuk ～ませんでした adalah bentuk negatif lampau sopan. Digunakan untuk menyatakan bahwa suatu kegiatan tidak dilakukan pada masa lalu.",
  "keywords": [
    "lampau negatif",
    "masen deshita",
    "tidak melakukan"
  ],
  "examples": [
    {
      "japanese": "昨日は勉強しませんでした。",
      "reading": "きのうは べんきょうしませんでした。",
      "meaning": "Kemarin saya tidak belajar.",
      "highlight": [
        "ませんでした"
      ]
    },
    {
      "japanese": "朝ご飯を食べませんでした。",
      "reading": "あさごはんを たべませんでした。",
      "meaning": "Saya tidak sarapan.",
      "highlight": [
        "ませんでした"
      ]
    },
    {
      "japanese": "先週は働きませんでした。",
      "reading": "せんしゅうは はたらきませんでした。",
      "meaning": "Minggu lalu saya tidak bekerja.",
      "highlight": [
        "ませんでした"
      ]
    },
    {
      "japanese": "昨日テレビを見ませんでした。",
      "reading": "きのう てれびを みませんでした。",
      "meaning": "Kemarin saya tidak menonton televisi.",
      "highlight": [
        "ませんでした"
      ]
    },
    {
      "japanese": "日曜日は外出しませんでした。",
      "reading": "にちようびは がいしゅつしませんでした。",
      "meaning": "Hari Minggu saya tidak keluar rumah.",
      "highlight": [
        "ませんでした"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch4-verb-masen",
    "ch4-verb-mashita"
  ]
},
{
  "id": "ch5-e-movement",
  "chapter": 5,
  "order": 1,
  "pattern": "Tempat + へ + 行きます／来ます／帰ります",
  "meaning": "pergi / datang / pulang ke suatu tempat",
  "jlptLevel": "N5",
  "formula": "Tempat + へ + 行きます／来ます／帰ります",
  "explanation": "Partikel へ menandai arah atau tujuan perpindahan. Saat menjadi partikel, へ dibaca え.",
  "keywords": [
    "arah",
    "tujuan",
    "pergi",
    "datang",
    "pulang",
    "partikel e"
  ],
  "examples": [
    {
      "japanese": "学校へ行きます。",
      "reading": "がっこうへ いきます。",
      "meaning": "Saya pergi ke sekolah.",
      "highlight": [
        "へ"
      ]
    },
    {
      "japanese": "来月日本へ来ます。",
      "reading": "らいげつ にほんへ きます。",
      "meaning": "Bulan depan saya datang ke Jepang.",
      "highlight": [
        "へ"
      ]
    },
    {
      "japanese": "六時に家へ帰ります。",
      "reading": "ろくじに いえへ かえります。",
      "meaning": "Saya pulang ke rumah pukul enam.",
      "highlight": [
        "へ"
      ]
    },
    {
      "japanese": "週末大阪へ行きます。",
      "reading": "しゅうまつ おおさかへ いきます。",
      "meaning": "Akhir pekan saya pergi ke Osaka.",
      "highlight": [
        "へ"
      ]
    },
    {
      "japanese": "友達はインドネシアへ帰りました。",
      "reading": "ともだちは いんどねしあへ かえりました。",
      "meaning": "Teman saya sudah pulang ke Indonesia.",
      "highlight": [
        "へ"
      ]
    }
  ],
  "notes": [
    "Dalam banyak konteks perpindahan, に juga dapat menandai tujuan. Pada bab ini fokusnya adalah fungsi arah dengan へ."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch5-transport-de",
    "ch13-purpose-ni"
  ]
},
{
  "id": "ch5-transport-de",
  "chapter": 5,
  "order": 2,
  "pattern": "Kendaraan + で + 行きます",
  "meaning": "pergi dengan kendaraan / sarana",
  "jlptLevel": "N5",
  "formula": "Kendaraan / sarana + で + KK perpindahan",
  "explanation": "Partikel で menandai alat atau sarana yang digunakan untuk berpindah dari satu tempat ke tempat lain.",
  "keywords": [
    "transportasi",
    "kendaraan",
    "partikel de",
    "sarana"
  ],
  "examples": [
    {
      "japanese": "電車で会社へ行きます。",
      "reading": "でんしゃで かいしゃへ いきます。",
      "meaning": "Saya pergi ke kantor dengan kereta.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "バスで学校へ行きます。",
      "reading": "ばすで がっこうへ いきます。",
      "meaning": "Saya pergi ke sekolah dengan bus.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "飛行機で日本へ行きました。",
      "reading": "ひこうきで にほんへ いきました。",
      "meaning": "Saya pergi ke Jepang dengan pesawat.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "自転車で駅まで行きます。",
      "reading": "じてんしゃで えきまで いきます。",
      "meaning": "Saya pergi sampai stasiun dengan sepeda.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "タクシーでホテルへ帰りました。",
      "reading": "たくしーで ほてるへ かえりました。",
      "meaning": "Saya pulang ke hotel dengan taksi.",
      "highlight": [
        "で"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch5-e-movement",
    "ch7-tool-de"
  ]
},
{
  "id": "ch5-person-to",
  "chapter": 5,
  "order": 3,
  "pattern": "Orang + と + KK",
  "meaning": "melakukan kegiatan bersama seseorang",
  "jlptLevel": "N5",
  "formula": "Orang + と + KK",
  "explanation": "Partikel と menandai orang yang menjadi teman melakukan suatu kegiatan bersama.",
  "keywords": [
    "bersama",
    "orang",
    "partikel to",
    "teman"
  ],
  "examples": [
    {
      "japanese": "友達と映画を見ます。",
      "reading": "ともだちと えいがを みます。",
      "meaning": "Saya menonton film bersama teman.",
      "highlight": [
        "と"
      ]
    },
    {
      "japanese": "家族と旅行します。",
      "reading": "かぞくと りょこうします。",
      "meaning": "Saya bepergian bersama keluarga.",
      "highlight": [
        "と"
      ]
    },
    {
      "japanese": "先生と話しました。",
      "reading": "せんせいと はなしました。",
      "meaning": "Saya berbicara dengan guru.",
      "highlight": [
        "と"
      ]
    },
    {
      "japanese": "妹と買い物へ行きます。",
      "reading": "いもうとと かいものへ いきます。",
      "meaning": "Saya pergi berbelanja bersama adik perempuan.",
      "highlight": [
        "と"
      ]
    },
    {
      "japanese": "同僚と昼ご飯を食べました。",
      "reading": "どうりょうと ひるごはんを たべました。",
      "meaning": "Saya makan siang bersama rekan kerja.",
      "highlight": [
        "と"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch5-e-movement",
    "ch21-to-iimasu"
  ]
},
{
  "id": "ch5-kara-made",
  "chapter": 5,
  "order": 4,
  "pattern": "～から～まで",
  "meaning": "dari ... sampai ...",
  "jlptLevel": "N5",
  "formula": "Tempat / waktu + から + tempat / waktu + まで",
  "explanation": "から menandai titik awal dan まで menandai batas akhir. Keduanya dapat digunakan bersama atau secara terpisah.",
  "keywords": [
    "dari",
    "sampai",
    "rentang",
    "waktu",
    "tempat"
  ],
  "examples": [
    {
      "japanese": "九時から五時まで働きます。",
      "reading": "くじから ごじまで はたらきます。",
      "meaning": "Saya bekerja dari pukul sembilan sampai lima.",
      "highlight": [
        "から",
        "まで"
      ]
    },
    {
      "japanese": "月曜日から金曜日まで学校があります。",
      "reading": "げつようびから きんようびまで がっこうが あります。",
      "meaning": "Ada sekolah dari Senin sampai Jumat.",
      "highlight": [
        "から",
        "まで"
      ]
    },
    {
      "japanese": "東京から大阪まで新幹線で行きます。",
      "reading": "とうきょうから おおさかまで しんかんせんで いきます。",
      "meaning": "Saya pergi dari Tokyo sampai Osaka dengan Shinkansen.",
      "highlight": [
        "から",
        "まで"
      ]
    },
    {
      "japanese": "昼休みは十二時から一時までです。",
      "reading": "ひるやすみは じゅうにじから いちじまでです。",
      "meaning": "Istirahat siang dari pukul dua belas sampai satu.",
      "highlight": [
        "から",
        "まで"
      ]
    },
    {
      "japanese": "家から駅まで歩きます。",
      "reading": "いえから えきまで あるきます。",
      "meaning": "Saya berjalan dari rumah sampai stasiun.",
      "highlight": [
        "から",
        "まで"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch4-time-ni",
    "ch17-made-ni"
  ]
},
{
  "id": "ch6-object-o",
  "chapter": 6,
  "order": 1,
  "pattern": "KB + を + KK",
  "meaning": "melakukan tindakan terhadap objek",
  "jlptLevel": "N5",
  "formula": "KB + を + KK transitif",
  "explanation": "Partikel を menandai objek langsung dari tindakan. Sebagai partikel, を dibaca お.",
  "keywords": [
    "objek",
    "partikel o",
    "wo",
    "kata kerja transitif"
  ],
  "examples": [
    {
      "japanese": "本を読みます。",
      "reading": "ほんを よみます。",
      "meaning": "Saya membaca buku.",
      "highlight": [
        "を"
      ]
    },
    {
      "japanese": "水を飲みます。",
      "reading": "みずを のみます。",
      "meaning": "Saya minum air.",
      "highlight": [
        "を"
      ]
    },
    {
      "japanese": "日本語を勉強します。",
      "reading": "にほんごを べんきょうします。",
      "meaning": "Saya belajar bahasa Jepang.",
      "highlight": [
        "を"
      ]
    },
    {
      "japanese": "音楽を聞きます。",
      "reading": "おんがくを ききます。",
      "meaning": "Saya mendengarkan musik.",
      "highlight": [
        "を"
      ]
    },
    {
      "japanese": "写真を撮りました。",
      "reading": "しゃしんを とりました。",
      "meaning": "Saya mengambil foto.",
      "highlight": [
        "を"
      ]
    }
  ],
  "notes": [
    "を ditulis を tetapi sebagai partikel dibaca お."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch6-place-de"
  ]
},
{
  "id": "ch6-place-de",
  "chapter": 6,
  "order": 2,
  "pattern": "Tempat + で + KK",
  "meaning": "melakukan kegiatan di suatu tempat",
  "jlptLevel": "N5",
  "formula": "Tempat berlangsungnya kegiatan + で + KK",
  "explanation": "Partikel で menandai tempat berlangsungnya suatu tindakan atau kegiatan.",
  "keywords": [
    "tempat kegiatan",
    "partikel de",
    "lokasi aktivitas"
  ],
  "examples": [
    {
      "japanese": "図書館で本を読みます。",
      "reading": "としょかんで ほんを よみます。",
      "meaning": "Saya membaca buku di perpustakaan.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "学校で日本語を勉強します。",
      "reading": "がっこうで にほんごを べんきょうします。",
      "meaning": "Saya belajar bahasa Jepang di sekolah.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "レストランで昼ご飯を食べました。",
      "reading": "れすとらんで ひるごはんを たべました。",
      "meaning": "Saya makan siang di restoran.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "公園で友達と話します。",
      "reading": "こうえんで ともだちと はなします。",
      "meaning": "Saya berbicara dengan teman di taman.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "家で映画を見ます。",
      "reading": "いえで えいがを みます。",
      "meaning": "Saya menonton film di rumah.",
      "highlight": [
        "で"
      ]
    }
  ],
  "notes": [
    "Untuk keberadaan benda/orang gunakan に dengan あります・います, bukan で."
  ],
  "commonMistakes": [
    {
      "wrong": "教室で先生がいます。",
      "correct": "教室に先生がいます。",
      "explanation": "Jika fokusnya keberadaan seseorang, tempat ditandai に."
    }
  ],
  "relatedPatterns": [
    "ch6-object-o",
    "ch10-location-ni"
  ]
},
{
  "id": "ch6-masenka",
  "chapter": 6,
  "order": 3,
  "pattern": "～ませんか",
  "meaning": "maukah ...? / mengajak dengan sopan",
  "jlptLevel": "N5",
  "formula": "KK bentuk ません + か",
  "explanation": "Pola ～ませんか digunakan untuk mengajak atau menawarkan kegiatan dengan sopan. Meskipun bentuknya negatif, maknanya adalah ajakan.",
  "keywords": [
    "ajakan",
    "masenka",
    "maukah",
    "undangan"
  ],
  "examples": [
    {
      "japanese": "一緒に昼ご飯を食べませんか。",
      "reading": "いっしょに ひるごはんを たべませんか。",
      "meaning": "Maukah makan siang bersama?",
      "highlight": [
        "ませんか"
      ]
    },
    {
      "japanese": "週末映画を見ませんか。",
      "reading": "しゅうまつ えいがを みませんか。",
      "meaning": "Maukah menonton film akhir pekan ini?",
      "highlight": [
        "ませんか"
      ]
    },
    {
      "japanese": "コーヒーを飲みませんか。",
      "reading": "こーひーを のみませんか。",
      "meaning": "Maukah minum kopi?",
      "highlight": [
        "ませんか"
      ]
    },
    {
      "japanese": "日曜日に出かけませんか。",
      "reading": "にちようびに でかけませんか。",
      "meaning": "Maukah pergi keluar hari Minggu?",
      "highlight": [
        "ませんか"
      ]
    },
    {
      "japanese": "一緒に日本語を勉強しませんか。",
      "reading": "いっしょに にほんごを べんきょうしませんか。",
      "meaning": "Maukah belajar bahasa Jepang bersama?",
      "highlight": [
        "ませんか"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch6-mashou"
  ]
},
{
  "id": "ch6-mashou",
  "chapter": 6,
  "order": 4,
  "pattern": "～ましょう",
  "meaning": "mari ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk ます → ます diganti ましょう",
  "explanation": "Pola ～ましょう digunakan untuk mengajak orang lain melakukan sesuatu bersama atau mengusulkan suatu tindakan.",
  "keywords": [
    "mari",
    "ajakan",
    "mashou",
    "proposal"
  ],
  "examples": [
    {
      "japanese": "一緒に帰りましょう。",
      "reading": "いっしょに かえりましょう。",
      "meaning": "Mari pulang bersama.",
      "highlight": [
        "ましょう"
      ]
    },
    {
      "japanese": "少し休みましょう。",
      "reading": "すこし やすみましょう。",
      "meaning": "Mari istirahat sebentar.",
      "highlight": [
        "ましょう"
      ]
    },
    {
      "japanese": "日本語で話しましょう。",
      "reading": "にほんごで はなしましょう。",
      "meaning": "Mari berbicara dalam bahasa Jepang.",
      "highlight": [
        "ましょう"
      ]
    },
    {
      "japanese": "明日また会いましょう。",
      "reading": "あした また あいましょう。",
      "meaning": "Mari bertemu lagi besok.",
      "highlight": [
        "ましょう"
      ]
    },
    {
      "japanese": "ここで写真を撮りましょう。",
      "reading": "ここで しゃしんを とりましょう。",
      "meaning": "Mari mengambil foto di sini.",
      "highlight": [
        "ましょう"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch6-masenka",
    "ch14-mashouka"
  ]
},
{
  "id": "ch7-tool-de",
  "chapter": 7,
  "order": 1,
  "pattern": "Alat / bahasa + で + KK",
  "meaning": "melakukan sesuatu dengan alat / bahasa tertentu",
  "jlptLevel": "N5",
  "formula": "Alat / sarana / bahasa + で + KK",
  "explanation": "Partikel で dapat menandai alat, sarana, atau bahasa yang digunakan untuk melakukan suatu tindakan.",
  "keywords": [
    "alat",
    "bahasa",
    "partikel de",
    "sarana"
  ],
  "examples": [
    {
      "japanese": "箸でご飯を食べます。",
      "reading": "はしで ごはんを たべます。",
      "meaning": "Saya makan dengan sumpit.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "日本語で話してください。",
      "reading": "にほんごで はなしてください。",
      "meaning": "Tolong berbicara dalam bahasa Jepang.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "ペンで名前を書きます。",
      "reading": "ぺんで なまえを かきます。",
      "meaning": "Saya menulis nama dengan pena.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "スマートフォンで写真を撮ります。",
      "reading": "すまーとふぉんで しゃしんを とります。",
      "meaning": "Saya mengambil foto dengan ponsel.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "はさみで紙を切ります。",
      "reading": "はさみで かみを きります。",
      "meaning": "Saya memotong kertas dengan gunting.",
      "highlight": [
        "で"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch5-transport-de",
    "ch6-place-de"
  ]
},
{
  "id": "ch7-ageru",
  "chapter": 7,
  "order": 2,
  "pattern": "A は B に KB を あげます",
  "meaning": "A memberikan benda kepada B",
  "jlptLevel": "N5",
  "formula": "Pemberi + は + penerima + に + benda + を + あげます",
  "explanation": "あげます digunakan ketika pihak yang menjadi sudut pandang memberikan sesuatu kepada orang lain. Pada level dasar, penerima ditandai に.",
  "keywords": [
    "memberi",
    "ageru",
    "pemberian",
    "kepada"
  ],
  "examples": [
    {
      "japanese": "私は友達に本をあげました。",
      "reading": "わたしは ともだちに ほんを あげました。",
      "meaning": "Saya memberikan buku kepada teman.",
      "highlight": [
        "に",
        "あげました"
      ]
    },
    {
      "japanese": "母に花をあげます。",
      "reading": "ははに はなを あげます。",
      "meaning": "Saya memberikan bunga kepada ibu.",
      "highlight": [
        "に",
        "あげます"
      ]
    },
    {
      "japanese": "弟にお菓子をあげました。",
      "reading": "おとうとに おかしを あげました。",
      "meaning": "Saya memberikan camilan kepada adik laki-laki.",
      "highlight": [
        "に",
        "あげました"
      ]
    },
    {
      "japanese": "田中さんは山田さんに写真をあげました。",
      "reading": "たなかさんは やまださんに しゃしんを あげました。",
      "meaning": "Tanaka memberikan foto kepada Yamada.",
      "highlight": [
        "に",
        "あげました"
      ]
    },
    {
      "japanese": "子どもにプレゼントをあげます。",
      "reading": "こどもに ぷれぜんとを あげます。",
      "meaning": "Saya memberikan hadiah kepada anak.",
      "highlight": [
        "に",
        "あげます"
      ]
    }
  ],
  "notes": [
    "Untuk memberi kepada orang yang kedudukannya lebih tinggi, pemilihan verba pemberian dapat berubah sesuai tingkat kesopanan; tahap ini fokus pada pola dasar."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch7-morau",
    "ch24-teageru"
  ]
},
{
  "id": "ch7-morau",
  "chapter": 7,
  "order": 3,
  "pattern": "A は B に／から KB を もらいます",
  "meaning": "A menerima benda dari B",
  "jlptLevel": "N5",
  "formula": "Penerima + は + pemberi + に／から + benda + を + もらいます",
  "explanation": "もらいます digunakan dari sudut pandang penerima. Sumber pemberian dapat ditandai に atau から.",
  "keywords": [
    "menerima",
    "morau",
    "pemberian",
    "dari"
  ],
  "examples": [
    {
      "japanese": "私は友達に本をもらいました。",
      "reading": "わたしは ともだちに ほんを もらいました。",
      "meaning": "Saya menerima buku dari teman.",
      "highlight": [
        "に",
        "もらいました"
      ]
    },
    {
      "japanese": "母から手紙をもらいました。",
      "reading": "ははから てがみを もらいました。",
      "meaning": "Saya menerima surat dari ibu.",
      "highlight": [
        "から",
        "もらいました"
      ]
    },
    {
      "japanese": "先生に辞書をもらいました。",
      "reading": "せんせいに じしょを もらいました。",
      "meaning": "Saya menerima kamus dari guru.",
      "highlight": [
        "に",
        "もらいました"
      ]
    },
    {
      "japanese": "会社から資料をもらいました。",
      "reading": "かいしゃから しりょうを もらいました。",
      "meaning": "Saya menerima materi dari perusahaan.",
      "highlight": [
        "から",
        "もらいました"
      ]
    },
    {
      "japanese": "誕生日に友達から時計をもらいました。",
      "reading": "たんじょうびに ともだちから とけいを もらいました。",
      "meaning": "Pada ulang tahun, saya menerima jam dari teman.",
      "highlight": [
        "から",
        "もらいました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch7-ageru",
    "ch24-temorau"
  ]
},
{
  "id": "ch7-mou-mashita",
  "chapter": 7,
  "order": 4,
  "pattern": "もう～ました",
  "meaning": "sudah ...",
  "jlptLevel": "N5",
  "formula": "もう + KK bentuk ました",
  "explanation": "もう bersama bentuk lampau menyatakan bahwa suatu kegiatan sudah selesai atau keadaan yang diharapkan sudah terjadi.",
  "keywords": [
    "sudah",
    "mou",
    "selesai",
    "lampau"
  ],
  "examples": [
    {
      "japanese": "もう昼ご飯を食べました。",
      "reading": "もう ひるごはんを たべました。",
      "meaning": "Saya sudah makan siang.",
      "highlight": [
        "もう",
        "ました"
      ]
    },
    {
      "japanese": "宿題はもうしました。",
      "reading": "しゅくだいは もう しました。",
      "meaning": "Saya sudah mengerjakan PR.",
      "highlight": [
        "もう"
      ]
    },
    {
      "japanese": "もう切符を買いました。",
      "reading": "もう きっぷを かいました。",
      "meaning": "Saya sudah membeli tiket.",
      "highlight": [
        "もう",
        "ました"
      ]
    },
    {
      "japanese": "田中さんはもう帰りました。",
      "reading": "たなかさんは もう かえりました。",
      "meaning": "Tanaka sudah pulang.",
      "highlight": [
        "もう",
        "ました"
      ]
    },
    {
      "japanese": "その映画はもう見ました。",
      "reading": "その えいがは もう みました。",
      "meaning": "Saya sudah menonton film itu.",
      "highlight": [
        "もう",
        "ました"
      ]
    }
  ],
  "notes": [
    "Jawaban negatif untuk pertanyaan 'sudah?' sering memakai まだです untuk menyatakan 'belum'."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch19-mada",
    "ch4-verb-mashita"
  ]
},
{
  "id": "ch8-i-positive",
  "chapter": 8,
  "order": 1,
  "pattern": "KS-i + です",
  "meaning": "menyatakan sifat dengan kata sifat い",
  "jlptLevel": "N5",
  "formula": "KB + は + KS-i + です",
  "explanation": "Kata sifat い dapat langsung diikuti です untuk membuat pernyataan sopan. Huruf い pada akhir kata sifat tetap dipertahankan.",
  "keywords": [
    "kata sifat i",
    "adjektiva",
    "desu",
    "sifat"
  ],
  "examples": [
    {
      "japanese": "この本は面白いです。",
      "reading": "この ほんは おもしろいです。",
      "meaning": "Buku ini menarik.",
      "highlight": [
        "いです"
      ]
    },
    {
      "japanese": "今日は暑いです。",
      "reading": "きょうは あついです。",
      "meaning": "Hari ini panas.",
      "highlight": [
        "いです"
      ]
    },
    {
      "japanese": "このかばんは高いです。",
      "reading": "この かばんは たかいです。",
      "meaning": "Tas ini mahal.",
      "highlight": [
        "いです"
      ]
    },
    {
      "japanese": "北海道は冬が寒いです。",
      "reading": "ほっかいどうは ふゆが さむいです。",
      "meaning": "Musim dingin di Hokkaido dingin.",
      "highlight": [
        "いです"
      ]
    },
    {
      "japanese": "この料理はおいしいです。",
      "reading": "この りょうりは おいしいです。",
      "meaning": "Masakan ini enak.",
      "highlight": [
        "いです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch8-i-negative",
    "ch12-i-past"
  ]
},
{
  "id": "ch8-i-negative",
  "chapter": 8,
  "order": 2,
  "pattern": "KS-i → ～くないです",
  "meaning": "tidak ... (kata sifat い)",
  "jlptLevel": "N5",
  "formula": "KS-i: い → くないです",
  "explanation": "Untuk membuat kata sifat い menjadi negatif, ubah い terakhir menjadi くないです. Bentuk ～くありません juga dapat muncul dalam gaya lebih formal.",
  "keywords": [
    "kata sifat i",
    "negatif",
    "kunai",
    "tidak"
  ],
  "examples": [
    {
      "japanese": "この本は高くないです。",
      "reading": "この ほんは たかくないです。",
      "meaning": "Buku ini tidak mahal.",
      "highlight": [
        "くないです"
      ]
    },
    {
      "japanese": "今日は寒くないです。",
      "reading": "きょうは さむくないです。",
      "meaning": "Hari ini tidak dingin.",
      "highlight": [
        "くないです"
      ]
    },
    {
      "japanese": "この問題は難しくないです。",
      "reading": "この もんだいは むずかしくないです。",
      "meaning": "Soal ini tidak sulit.",
      "highlight": [
        "くないです"
      ]
    },
    {
      "japanese": "駅は遠くないです。",
      "reading": "えきは とおくないです。",
      "meaning": "Stasiunnya tidak jauh.",
      "highlight": [
        "くないです"
      ]
    },
    {
      "japanese": "この部屋は広くないです。",
      "reading": "この へやは ひろくないです。",
      "meaning": "Kamar ini tidak luas.",
      "highlight": [
        "くないです"
      ]
    }
  ],
  "notes": [
    "いい adalah kata sifat tidak beraturan: bentuk negatifnya よくないです."
  ],
  "commonMistakes": [
    {
      "wrong": "この本は高いくないです。",
      "correct": "この本は高くないです。",
      "explanation": "Buang い terakhir sebelum menambahkan くないです."
    }
  ],
  "relatedPatterns": [
    "ch8-i-positive",
    "ch12-i-past-negative"
  ]
},
{
  "id": "ch8-na-positive",
  "chapter": 8,
  "order": 3,
  "pattern": "KS-na + です",
  "meaning": "menyatakan sifat dengan kata sifat な",
  "jlptLevel": "N5",
  "formula": "KB + は + KS-na + です",
  "explanation": "Kata sifat な pada akhir kalimat diikuti です. な tidak digunakan ketika kata sifat な berdiri sebagai predikat sebelum です.",
  "keywords": [
    "kata sifat na",
    "adjektiva",
    "sifat",
    "desu"
  ],
  "examples": [
    {
      "japanese": "この町は静かです。",
      "reading": "この まちは しずかです。",
      "meaning": "Kota ini tenang.",
      "highlight": [
        "静かです"
      ]
    },
    {
      "japanese": "田中さんは元気です。",
      "reading": "たなかさんは げんきです。",
      "meaning": "Tanaka sehat/bersemangat.",
      "highlight": [
        "元気です"
      ]
    },
    {
      "japanese": "この部屋はきれいです。",
      "reading": "この へやは きれいです。",
      "meaning": "Kamar ini bersih/indah.",
      "highlight": [
        "きれいです"
      ]
    },
    {
      "japanese": "その店は有名です。",
      "reading": "その みせは ゆうめいです。",
      "meaning": "Toko itu terkenal.",
      "highlight": [
        "有名です"
      ]
    },
    {
      "japanese": "この仕事は簡単です。",
      "reading": "この しごとは かんたんです。",
      "meaning": "Pekerjaan ini mudah.",
      "highlight": [
        "簡単です"
      ]
    }
  ],
  "notes": [
    "きれい berakhir dengan huruf い tetapi termasuk KS-na."
  ],
  "commonMistakes": [
    {
      "wrong": "この町は静かなです。",
      "correct": "この町は静かです。",
      "explanation": "な dipakai saat KS-na menerangkan kata benda, bukan sebelum です pada predikat."
    }
  ],
  "relatedPatterns": [
    "ch8-na-negative",
    "ch12-na-past"
  ]
},
{
  "id": "ch8-na-negative",
  "chapter": 8,
  "order": 4,
  "pattern": "KS-na + ではありません",
  "meaning": "tidak ... (kata sifat な)",
  "jlptLevel": "N5",
  "formula": "KS-na + ではありません／じゃありません",
  "explanation": "Bentuk negatif sopan KS-na dibuat dengan ではありません. Dalam percakapan, じゃありません juga sering digunakan.",
  "keywords": [
    "kata sifat na",
    "negatif",
    "dewa arimasen",
    "janai"
  ],
  "examples": [
    {
      "japanese": "この町は静かではありません。",
      "reading": "この まちは しずかではありません。",
      "meaning": "Kota ini tidak tenang.",
      "highlight": [
        "ではありません"
      ]
    },
    {
      "japanese": "今日は暇ではありません。",
      "reading": "きょうは ひまではありません。",
      "meaning": "Hari ini saya tidak senggang.",
      "highlight": [
        "ではありません"
      ]
    },
    {
      "japanese": "この問題は簡単ではありません。",
      "reading": "この もんだいは かんたんではありません。",
      "meaning": "Soal ini tidak mudah.",
      "highlight": [
        "ではありません"
      ]
    },
    {
      "japanese": "その店は有名ではありません。",
      "reading": "その みせは ゆうめいではありません。",
      "meaning": "Toko itu tidak terkenal.",
      "highlight": [
        "ではありません"
      ]
    },
    {
      "japanese": "この部屋はきれいではありません。",
      "reading": "この へやは きれいではありません。",
      "meaning": "Kamar ini tidak bersih.",
      "highlight": [
        "ではありません"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch8-na-positive",
    "ch12-na-past-negative"
  ]
},
{
  "id": "ch8-totemo-amari",
  "chapter": 8,
  "order": 5,
  "pattern": "とても／あまり～ません",
  "meaning": "sangat / tidak terlalu ...",
  "jlptLevel": "N5",
  "formula": "とても + sifat ／ あまり + bentuk negatif",
  "explanation": "とても memperkuat sifat dengan makna 'sangat'. あまり biasanya dipakai bersama bentuk negatif untuk menyatakan 'tidak terlalu'.",
  "keywords": [
    "sangat",
    "tidak terlalu",
    "totemo",
    "amari",
    "derajat"
  ],
  "examples": [
    {
      "japanese": "この料理はとてもおいしいです。",
      "reading": "この りょうりは とても おいしいです。",
      "meaning": "Masakan ini sangat enak.",
      "highlight": [
        "とても"
      ]
    },
    {
      "japanese": "富士山はとても高いです。",
      "reading": "ふじさんは とても たかいです。",
      "meaning": "Gunung Fuji sangat tinggi.",
      "highlight": [
        "とても"
      ]
    },
    {
      "japanese": "この町はとても静かです。",
      "reading": "この まちは とても しずかです。",
      "meaning": "Kota ini sangat tenang.",
      "highlight": [
        "とても"
      ]
    },
    {
      "japanese": "この映画はあまり面白くないです。",
      "reading": "この えいがは あまり おもしろくないです。",
      "meaning": "Film ini tidak terlalu menarik.",
      "highlight": [
        "あまり",
        "くないです"
      ]
    },
    {
      "japanese": "私は辛い料理があまり好きではありません。",
      "reading": "わたしは からい りょうりが あまり すきではありません。",
      "meaning": "Saya tidak terlalu suka makanan pedas.",
      "highlight": [
        "あまり",
        "ではありません"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch8-i-negative",
    "ch9-suki-kirai"
  ]
},
{
  "id": "ch9-suki-kirai",
  "chapter": 9,
  "order": 1,
  "pattern": "～が好きです／嫌いです",
  "meaning": "suka / tidak suka ...",
  "jlptLevel": "N5",
  "formula": "KB + が + 好きです／嫌いです",
  "explanation": "好き dan 嫌い adalah KS-na. Benda atau kegiatan yang disukai/tidak disukai umumnya ditandai dengan が pada pola dasar.",
  "keywords": [
    "suka",
    "tidak suka",
    "suki",
    "kirai",
    "partikel ga"
  ],
  "examples": [
    {
      "japanese": "私は音楽が好きです。",
      "reading": "わたしは おんがくが すきです。",
      "meaning": "Saya suka musik.",
      "highlight": [
        "が",
        "好きです"
      ]
    },
    {
      "japanese": "妹は猫が好きです。",
      "reading": "いもうとは ねこが すきです。",
      "meaning": "Adik perempuan saya suka kucing.",
      "highlight": [
        "が",
        "好きです"
      ]
    },
    {
      "japanese": "父は野菜が好きです。",
      "reading": "ちちは やさいが すきです。",
      "meaning": "Ayah saya suka sayuran.",
      "highlight": [
        "が",
        "好きです"
      ]
    },
    {
      "japanese": "私は納豆が嫌いです。",
      "reading": "わたしは なっとうが きらいです。",
      "meaning": "Saya tidak suka natto.",
      "highlight": [
        "が",
        "嫌いです"
      ]
    },
    {
      "japanese": "田中さんは寒い天気が嫌いです。",
      "reading": "たなかさんは さむい てんきが きらいです。",
      "meaning": "Tanaka tidak suka cuaca dingin.",
      "highlight": [
        "が",
        "嫌いです"
      ]
    }
  ],
  "notes": [
    "好きではありません dapat digunakan untuk 'tidak suka' dengan nuansa lebih lunak daripada 嫌いです."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch9-jouzu-heta",
    "ch8-na-positive"
  ]
},
{
  "id": "ch9-jouzu-heta",
  "chapter": 9,
  "order": 2,
  "pattern": "～が上手です／下手です",
  "meaning": "pandai / kurang pandai ...",
  "jlptLevel": "N5",
  "formula": "KB + が + 上手です／下手です",
  "explanation": "上手 dan 下手 digunakan untuk menilai kemampuan atau keterampilan. Aktivitas atau bidang yang dinilai biasanya ditandai が.",
  "keywords": [
    "pandai",
    "kurang pandai",
    "jouzu",
    "heta",
    "kemampuan"
  ],
  "examples": [
    {
      "japanese": "田中さんは料理が上手です。",
      "reading": "たなかさんは りょうりが じょうずです。",
      "meaning": "Tanaka pandai memasak.",
      "highlight": [
        "が",
        "上手です"
      ]
    },
    {
      "japanese": "兄はサッカーが上手です。",
      "reading": "あには さっかーが じょうずです。",
      "meaning": "Kakak laki-laki saya pandai bermain sepak bola.",
      "highlight": [
        "が",
        "上手です"
      ]
    },
    {
      "japanese": "私は絵が下手です。",
      "reading": "わたしは えが へたです。",
      "meaning": "Saya kurang pandai menggambar.",
      "highlight": [
        "が",
        "下手です"
      ]
    },
    {
      "japanese": "妹は歌が上手です。",
      "reading": "いもうとは うたが じょうずです。",
      "meaning": "Adik perempuan saya pandai bernyanyi.",
      "highlight": [
        "が",
        "上手です"
      ]
    },
    {
      "japanese": "私は運転があまり上手ではありません。",
      "reading": "わたしは うんてんが あまり じょうずではありません。",
      "meaning": "Saya tidak terlalu pandai mengemudi.",
      "highlight": [
        "が",
        "上手ではありません"
      ]
    }
  ],
  "notes": [
    "Untuk menyatakan kemampuan diri sendiri, 上手です dapat terdengar seperti memuji diri; pola できます sering lebih natural tergantung konteks."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch9-wakaru",
    "ch18-koto-ga-dekiru"
  ]
},
{
  "id": "ch9-wakaru",
  "chapter": 9,
  "order": 3,
  "pattern": "～がわかります",
  "meaning": "mengerti / memahami ...",
  "jlptLevel": "N5",
  "formula": "KB + が + わかります",
  "explanation": "わかります menyatakan bahwa seseorang memahami suatu bahasa, penjelasan, atau informasi. Hal yang dipahami umumnya ditandai が.",
  "keywords": [
    "mengerti",
    "memahami",
    "wakaru",
    "partikel ga"
  ],
  "examples": [
    {
      "japanese": "私は日本語が少しわかります。",
      "reading": "わたしは にほんごが すこし わかります。",
      "meaning": "Saya sedikit mengerti bahasa Jepang.",
      "highlight": [
        "が",
        "わかります"
      ]
    },
    {
      "japanese": "この漢字の意味がわかります。",
      "reading": "この かんじの いみが わかります。",
      "meaning": "Saya mengerti arti Kanji ini.",
      "highlight": [
        "が",
        "わかります"
      ]
    },
    {
      "japanese": "先生の説明がよくわかりました。",
      "reading": "せんせいの せつめいが よく わかりました。",
      "meaning": "Saya memahami penjelasan guru dengan baik.",
      "highlight": [
        "が",
        "わかりました"
      ]
    },
    {
      "japanese": "この問題の答えがわかりません。",
      "reading": "この もんだいの こたえが わかりません。",
      "meaning": "Saya tidak tahu jawaban soal ini.",
      "highlight": [
        "が",
        "わかりません"
      ]
    },
    {
      "japanese": "駅までの道がわかりますか。",
      "reading": "えきまでの みちが わかりますか。",
      "meaning": "Apakah Anda tahu jalan menuju stasiun?",
      "highlight": [
        "が",
        "わかりますか"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch9-jouzu-heta",
    "ch18-koto-ga-dekiru"
  ]
},
{
  "id": "ch9-reason-kara",
  "chapter": 9,
  "order": 4,
  "pattern": "～から、～",
  "meaning": "karena ..., maka ...",
  "jlptLevel": "N5",
  "formula": "Alasan + から、hasil / keputusan",
  "explanation": "から diletakkan setelah klausa yang menyatakan alasan. Pada level dasar, pola ini menjelaskan sebab yang mendasari tindakan atau keputusan pembicara.",
  "keywords": [
    "karena",
    "alasan",
    "kara",
    "sebab"
  ],
  "examples": [
    {
      "japanese": "今日は雨ですから、家にいます。",
      "reading": "きょうは あめですから、いえに います。",
      "meaning": "Karena hari ini hujan, saya berada di rumah.",
      "highlight": [
        "から"
      ]
    },
    {
      "japanese": "明日は休みですから、ゆっくり寝ます。",
      "reading": "あしたは やすみですから、ゆっくり ねます。",
      "meaning": "Karena besok libur, saya akan tidur santai.",
      "highlight": [
        "から"
      ]
    },
    {
      "japanese": "日本語が好きですから、毎日勉強します。",
      "reading": "にほんごが すきですから、まいにち べんきょうします。",
      "meaning": "Karena saya suka bahasa Jepang, saya belajar setiap hari.",
      "highlight": [
        "から"
      ]
    },
    {
      "japanese": "時間がありませんから、タクシーで行きます。",
      "reading": "じかんが ありませんから、たくしーで いきます。",
      "meaning": "Karena tidak ada waktu, saya pergi dengan taksi.",
      "highlight": [
        "から"
      ]
    },
    {
      "japanese": "この店は安いですから、よく来ます。",
      "reading": "この みせは やすいですから、よく きます。",
      "meaning": "Karena toko ini murah, saya sering datang.",
      "highlight": [
        "から"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch28-node",
    "ch28-shi"
  ]
},
{
  "id": "ch10-arimasu",
  "chapter": 10,
  "order": 1,
  "pattern": "～があります",
  "meaning": "ada ... (benda / hal tidak bernyawa)",
  "jlptLevel": "N5",
  "formula": "Tempat + に + benda + が + あります",
  "explanation": "あります digunakan untuk menyatakan keberadaan benda, tumbuhan, acara, atau hal yang diperlakukan sebagai tidak bernyawa.",
  "keywords": [
    "ada",
    "arimasu",
    "benda",
    "keberadaan"
  ],
  "examples": [
    {
      "japanese": "机の上に本があります。",
      "reading": "つくえの うえに ほんが あります。",
      "meaning": "Ada buku di atas meja.",
      "highlight": [
        "に",
        "があります"
      ]
    },
    {
      "japanese": "駅の前に銀行があります。",
      "reading": "えきの まえに ぎんこうが あります。",
      "meaning": "Ada bank di depan stasiun.",
      "highlight": [
        "に",
        "があります"
      ]
    },
    {
      "japanese": "庭に木があります。",
      "reading": "にわに きが あります。",
      "meaning": "Ada pohon di halaman.",
      "highlight": [
        "に",
        "があります"
      ]
    },
    {
      "japanese": "日曜日に試験があります。",
      "reading": "にちようびに しけんが あります。",
      "meaning": "Ada ujian pada hari Minggu.",
      "highlight": [
        "があります"
      ]
    },
    {
      "japanese": "冷蔵庫の中に牛乳があります。",
      "reading": "れいぞうこの なかに ぎゅうにゅうが あります。",
      "meaning": "Ada susu di dalam kulkas.",
      "highlight": [
        "に",
        "があります"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch10-imasu",
    "ch10-location-ni"
  ]
},
{
  "id": "ch10-imasu",
  "chapter": 10,
  "order": 2,
  "pattern": "～がいます",
  "meaning": "ada ... (orang / hewan)",
  "jlptLevel": "N5",
  "formula": "Tempat + に + orang / hewan + が + います",
  "explanation": "います digunakan untuk menyatakan keberadaan manusia dan hewan.",
  "keywords": [
    "ada",
    "imasu",
    "orang",
    "hewan",
    "keberadaan"
  ],
  "examples": [
    {
      "japanese": "教室に先生がいます。",
      "reading": "きょうしつに せんせいが います。",
      "meaning": "Ada guru di ruang kelas.",
      "highlight": [
        "に",
        "がいます"
      ]
    },
    {
      "japanese": "公園に子どもがいます。",
      "reading": "こうえんに こどもが います。",
      "meaning": "Ada anak-anak di taman.",
      "highlight": [
        "に",
        "がいます"
      ]
    },
    {
      "japanese": "家に猫がいます。",
      "reading": "いえに ねこが います。",
      "meaning": "Ada kucing di rumah.",
      "highlight": [
        "に",
        "がいます"
      ]
    },
    {
      "japanese": "駅に友達がいます。",
      "reading": "えきに ともだちが います。",
      "meaning": "Teman saya ada di stasiun.",
      "highlight": [
        "に",
        "がいます"
      ]
    },
    {
      "japanese": "会社に田中さんがいます。",
      "reading": "かいしゃに たなかさんが います。",
      "meaning": "Tanaka ada di kantor.",
      "highlight": [
        "に",
        "がいます"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch10-arimasu",
    "ch10-location-ni"
  ]
},
{
  "id": "ch10-location-ni",
  "chapter": 10,
  "order": 3,
  "pattern": "KB は Tempat に あります／います",
  "meaning": "A berada di ...",
  "jlptLevel": "N5",
  "formula": "Benda / orang + は + tempat + に + あります／います",
  "explanation": "Jika benda atau orang sudah menjadi topik, pola ini menjelaskan lokasi keberadaannya. Gunakan あります untuk benda dan います untuk orang/hewan.",
  "keywords": [
    "lokasi",
    "berada",
    "ni",
    "arimasu",
    "imasu"
  ],
  "examples": [
    {
      "japanese": "本は机の上にあります。",
      "reading": "ほんは つくえの うえに あります。",
      "meaning": "Buku berada di atas meja.",
      "highlight": [
        "に",
        "あります"
      ]
    },
    {
      "japanese": "先生は教室にいます。",
      "reading": "せんせいは きょうしつに います。",
      "meaning": "Guru berada di ruang kelas.",
      "highlight": [
        "に",
        "います"
      ]
    },
    {
      "japanese": "郵便局は駅の隣にあります。",
      "reading": "ゆうびんきょくは えきの となりに あります。",
      "meaning": "Kantor pos berada di sebelah stasiun.",
      "highlight": [
        "に",
        "あります"
      ]
    },
    {
      "japanese": "猫は椅子の下にいます。",
      "reading": "ねこは いすの したに います。",
      "meaning": "Kucing berada di bawah kursi.",
      "highlight": [
        "に",
        "います"
      ]
    },
    {
      "japanese": "私の家は学校の近くにあります。",
      "reading": "わたしの いえは がっこうの ちかくに あります。",
      "meaning": "Rumah saya berada dekat sekolah.",
      "highlight": [
        "に",
        "あります"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch10-position",
    "ch6-place-de"
  ]
},
{
  "id": "ch10-position",
  "chapter": 10,
  "order": 4,
  "pattern": "上・下・前・後ろ・隣・中・外・近く",
  "meaning": "menyatakan posisi / letak",
  "jlptLevel": "N5",
  "formula": "KB1 + の + posisi + に + KB2 + が + あります／います",
  "explanation": "Kata posisi ditempatkan setelah の untuk menunjukkan letak relatif suatu benda, tempat, atau orang.",
  "keywords": [
    "posisi",
    "atas",
    "bawah",
    "depan",
    "belakang",
    "sebelah",
    "dalam"
  ],
  "examples": [
    {
      "japanese": "机の上に辞書があります。",
      "reading": "つくえの うえに じしょが あります。",
      "meaning": "Ada kamus di atas meja.",
      "highlight": [
        "の上"
      ]
    },
    {
      "japanese": "椅子の下に猫がいます。",
      "reading": "いすの したに ねこが います。",
      "meaning": "Ada kucing di bawah kursi.",
      "highlight": [
        "の下"
      ]
    },
    {
      "japanese": "学校の前にコンビニがあります。",
      "reading": "がっこうの まえに こんびにが あります。",
      "meaning": "Ada minimarket di depan sekolah.",
      "highlight": [
        "の前"
      ]
    },
    {
      "japanese": "銀行の隣に郵便局があります。",
      "reading": "ぎんこうの となりに ゆうびんきょくが あります。",
      "meaning": "Ada kantor pos di sebelah bank.",
      "highlight": [
        "の隣"
      ]
    },
    {
      "japanese": "かばんの中に財布があります。",
      "reading": "かばんの なかに さいふが あります。",
      "meaning": "Ada dompet di dalam tas.",
      "highlight": [
        "の中"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch10-location-ni",
    "ch3-doko"
  ]
},
{
  "id": "ch11-counter",
  "chapter": 11,
  "order": 1,
  "pattern": "Jumlah + kata bantu bilangan",
  "meaning": "menyatakan jumlah benda/orang dengan counter",
  "jlptLevel": "N5",
  "formula": "Angka + kata bantu bilangan",
  "explanation": "Dalam bahasa Jepang, jumlah benda atau orang sering dinyatakan dengan kata bantu bilangan (counter) yang sesuai, misalnya ～人 untuk orang, ～枚 untuk benda tipis, dan ～本 untuk benda panjang.",
  "keywords": [
    "jumlah",
    "counter",
    "orang",
    "benda",
    "angka"
  ],
  "examples": [
    {
      "japanese": "教室に学生が三人います。",
      "reading": "きょうしつに がくせいが さんにん います。",
      "meaning": "Ada tiga pelajar di ruang kelas.",
      "highlight": [
        "三人"
      ]
    },
    {
      "japanese": "切手を二枚買いました。",
      "reading": "きってを にまい かいました。",
      "meaning": "Saya membeli dua lembar perangko.",
      "highlight": [
        "二枚"
      ]
    },
    {
      "japanese": "ペンを三本持っています。",
      "reading": "ぺんを さんぼん もっています。",
      "meaning": "Saya membawa tiga pena.",
      "highlight": [
        "三本"
      ]
    },
    {
      "japanese": "りんごを四つください。",
      "reading": "りんごを よっつ ください。",
      "meaning": "Tolong beri saya empat apel.",
      "highlight": [
        "四つ"
      ]
    },
    {
      "japanese": "本を五冊読みました。",
      "reading": "ほんを ごさつ よみました。",
      "meaning": "Saya membaca lima buku.",
      "highlight": [
        "五冊"
      ]
    }
  ],
  "notes": [
    "Bentuk bunyi counter dapat berubah, misalnya 一本（いっぽん）・三本（さんぼん）. Pelajari bersama kosakata dan contoh yang sering digunakan."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch11-duration",
    "ch11-frequency"
  ]
},
{
  "id": "ch11-duration",
  "chapter": 11,
  "order": 2,
  "pattern": "Durasi + KK",
  "meaning": "melakukan kegiatan selama ...",
  "jlptLevel": "N5",
  "formula": "Durasi + KK",
  "explanation": "Durasi seperti 一時間・三日間 biasanya langsung diletakkan sebelum kata kerja tanpa partikel に.",
  "keywords": [
    "durasi",
    "selama",
    "jam",
    "hari",
    "waktu"
  ],
  "examples": [
    {
      "japanese": "毎日一時間勉強します。",
      "reading": "まいにち いちじかん べんきょうします。",
      "meaning": "Saya belajar satu jam setiap hari.",
      "highlight": [
        "一時間"
      ]
    },
    {
      "japanese": "昨日二時間テレビを見ました。",
      "reading": "きのう にじかん てれびを みました。",
      "meaning": "Kemarin saya menonton televisi selama dua jam.",
      "highlight": [
        "二時間"
      ]
    },
    {
      "japanese": "日本に三年間住みました。",
      "reading": "にほんに さんねんかん すみました。",
      "meaning": "Saya tinggal di Jepang selama tiga tahun.",
      "highlight": [
        "三年間"
      ]
    },
    {
      "japanese": "十分休みましょう。",
      "reading": "じゅっぷん やすみましょう。",
      "meaning": "Mari istirahat selama sepuluh menit.",
      "highlight": [
        "十分"
      ]
    },
    {
      "japanese": "夏休みに一週間旅行しました。",
      "reading": "なつやすみに いっしゅうかん りょこうしました。",
      "meaning": "Saat liburan musim panas saya bepergian selama satu minggu.",
      "highlight": [
        "一週間"
      ]
    }
  ],
  "notes": [
    "Durasi berbeda dari waktu tertentu: 七時に起きます memakai に, tetapi 一時間勉強します tidak memakai に."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch4-time-ni",
    "ch11-frequency"
  ]
},
{
  "id": "ch11-frequency",
  "chapter": 11,
  "order": 3,
  "pattern": "Periode + に + 回数",
  "meaning": "melakukan ... sebanyak ... kali dalam suatu periode",
  "jlptLevel": "N5",
  "formula": "Periode + に + angka + 回 + KK",
  "explanation": "Pola ini menyatakan frekuensi. に menghubungkan periode dengan jumlah berapa kali kegiatan dilakukan.",
  "keywords": [
    "frekuensi",
    "kali",
    "per minggu",
    "per bulan",
    "kai"
  ],
  "examples": [
    {
      "japanese": "一週間に三回運動します。",
      "reading": "いっしゅうかんに さんかい うんどうします。",
      "meaning": "Saya berolahraga tiga kali seminggu.",
      "highlight": [
        "に",
        "三回"
      ]
    },
    {
      "japanese": "一か月に二回映画を見ます。",
      "reading": "いっかげつに にかい えいがを みます。",
      "meaning": "Saya menonton film dua kali sebulan.",
      "highlight": [
        "に",
        "二回"
      ]
    },
    {
      "japanese": "一日に三回薬を飲みます。",
      "reading": "いちにちに さんかい くすりを のみます。",
      "meaning": "Saya minum obat tiga kali sehari.",
      "highlight": [
        "に",
        "三回"
      ]
    },
    {
      "japanese": "一年に一回旅行します。",
      "reading": "いちねんに いっかい りょこうします。",
      "meaning": "Saya bepergian sekali setahun.",
      "highlight": [
        "に",
        "一回"
      ]
    },
    {
      "japanese": "週に五回会社へ行きます。",
      "reading": "しゅうに ごかい かいしゃへ いきます。",
      "meaning": "Saya pergi ke kantor lima kali seminggu.",
      "highlight": [
        "に",
        "五回"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch11-duration",
    "ch4-time-ni"
  ]
},
{
  "id": "ch11-gurai",
  "chapter": 11,
  "order": 4,
  "pattern": "～ぐらい／くらい",
  "meaning": "sekitar / kira-kira ...",
  "jlptLevel": "N5",
  "formula": "Jumlah / durasi + ぐらい／くらい",
  "explanation": "ぐらい atau くらい diletakkan setelah jumlah atau durasi untuk menyatakan perkiraan.",
  "keywords": [
    "sekitar",
    "kira-kira",
    "gurai",
    "kurai",
    "perkiraan"
  ],
  "examples": [
    {
      "japanese": "駅まで十分ぐらいかかります。",
      "reading": "えきまで じゅっぷんぐらい かかります。",
      "meaning": "Ke stasiun memerlukan sekitar sepuluh menit.",
      "highlight": [
        "ぐらい"
      ]
    },
    {
      "japanese": "日本語を二年ぐらい勉強しました。",
      "reading": "にほんごを にねんぐらい べんきょうしました。",
      "meaning": "Saya belajar bahasa Jepang sekitar dua tahun.",
      "highlight": [
        "ぐらい"
      ]
    },
    {
      "japanese": "この本は千円ぐらいです。",
      "reading": "この ほんは せんえんぐらいです。",
      "meaning": "Buku ini harganya sekitar seribu yen.",
      "highlight": [
        "ぐらい"
      ]
    },
    {
      "japanese": "教室に学生が二十人くらいいます。",
      "reading": "きょうしつに がくせいが にじゅうにんくらい います。",
      "meaning": "Ada sekitar dua puluh pelajar di kelas.",
      "highlight": [
        "くらい"
      ]
    },
    {
      "japanese": "毎晩七時間ぐらい寝ます。",
      "reading": "まいばん しちじかんぐらい ねます。",
      "meaning": "Saya tidur sekitar tujuh jam setiap malam.",
      "highlight": [
        "ぐらい"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch11-duration",
    "ch11-counter"
  ]
},
{
  "id": "ch12-i-past",
  "chapter": 12,
  "order": 1,
  "pattern": "KS-i → ～かったです",
  "meaning": "... pada masa lalu (KS-i)",
  "jlptLevel": "N5",
  "formula": "KS-i: い → かったです",
  "explanation": "Bentuk lampau positif KS-i dibuat dengan mengganti い terakhir menjadi かったです.",
  "keywords": [
    "kata sifat i",
    "lampau",
    "katta",
    "adjektiva"
  ],
  "examples": [
    {
      "japanese": "昨日は暑かったです。",
      "reading": "きのうは あつかったです。",
      "meaning": "Kemarin panas.",
      "highlight": [
        "かったです"
      ]
    },
    {
      "japanese": "旅行は楽しかったです。",
      "reading": "りょこうは たのしかったです。",
      "meaning": "Perjalanannya menyenangkan.",
      "highlight": [
        "かったです"
      ]
    },
    {
      "japanese": "昨日の試験は難しかったです。",
      "reading": "きのうの しけんは むずかしかったです。",
      "meaning": "Ujian kemarin sulit.",
      "highlight": [
        "かったです"
      ]
    },
    {
      "japanese": "あの映画は面白かったです。",
      "reading": "あの えいがは おもしろかったです。",
      "meaning": "Film itu menarik.",
      "highlight": [
        "かったです"
      ]
    },
    {
      "japanese": "先週は忙しかったです。",
      "reading": "せんしゅうは いそがしかったです。",
      "meaning": "Minggu lalu sibuk.",
      "highlight": [
        "かったです"
      ]
    }
  ],
  "notes": [
    "いい menjadi よかったです dalam bentuk lampau positif."
  ],
  "commonMistakes": [
    {
      "wrong": "昨日は暑いでした。",
      "correct": "昨日は暑かったです。",
      "explanation": "KS-i tidak memakai でした langsung; ubah い menjadi かったです."
    }
  ],
  "relatedPatterns": [
    "ch12-i-past-negative",
    "ch8-i-positive"
  ]
},
{
  "id": "ch12-i-past-negative",
  "chapter": 12,
  "order": 2,
  "pattern": "KS-i → ～くなかったです",
  "meaning": "tidak ... pada masa lalu (KS-i)",
  "jlptLevel": "N5",
  "formula": "KS-i: い → くなかったです",
  "explanation": "Bentuk lampau negatif KS-i dibuat dengan mengubah い menjadi くなかったです.",
  "keywords": [
    "kata sifat i",
    "lampau negatif",
    "kunakatta"
  ],
  "examples": [
    {
      "japanese": "昨日は寒くなかったです。",
      "reading": "きのうは さむくなかったです。",
      "meaning": "Kemarin tidak dingin.",
      "highlight": [
        "くなかったです"
      ]
    },
    {
      "japanese": "試験は難しくなかったです。",
      "reading": "しけんは むずかしくなかったです。",
      "meaning": "Ujiannya tidak sulit.",
      "highlight": [
        "くなかったです"
      ]
    },
    {
      "japanese": "ホテルは高くなかったです。",
      "reading": "ほてるは たかくなかったです。",
      "meaning": "Hotelnya tidak mahal.",
      "highlight": [
        "くなかったです"
      ]
    },
    {
      "japanese": "昨日は忙しくなかったです。",
      "reading": "きのうは いそがしくなかったです。",
      "meaning": "Kemarin tidak sibuk.",
      "highlight": [
        "くなかったです"
      ]
    },
    {
      "japanese": "その料理は辛くなかったです。",
      "reading": "その りょうりは からくなかったです。",
      "meaning": "Masakan itu tidak pedas.",
      "highlight": [
        "くなかったです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch12-i-past",
    "ch8-i-negative"
  ]
},
{
  "id": "ch12-na-past",
  "chapter": 12,
  "order": 3,
  "pattern": "KS-na / KB + でした",
  "meaning": "... pada masa lalu",
  "jlptLevel": "N5",
  "formula": "KS-na / KB + でした",
  "explanation": "でした adalah bentuk lampau sopan untuk predikat kata benda dan kata sifat な.",
  "keywords": [
    "lampau",
    "deshita",
    "kata sifat na",
    "kata benda"
  ],
  "examples": [
    {
      "japanese": "昨日は休みでした。",
      "reading": "きのうは やすみでした。",
      "meaning": "Kemarin libur.",
      "highlight": [
        "でした"
      ]
    },
    {
      "japanese": "京都は静かでした。",
      "reading": "きょうとは しずかでした。",
      "meaning": "Kyoto tenang.",
      "highlight": [
        "でした"
      ]
    },
    {
      "japanese": "田中さんは学生でした。",
      "reading": "たなかさんは がくせいでした。",
      "meaning": "Tanaka dulu seorang pelajar.",
      "highlight": [
        "でした"
      ]
    },
    {
      "japanese": "パーティーはにぎやかでした。",
      "reading": "ぱーてぃーは にぎやかでした。",
      "meaning": "Pestanya meriah.",
      "highlight": [
        "でした"
      ]
    },
    {
      "japanese": "先週は暇でした。",
      "reading": "せんしゅうは ひまでした。",
      "meaning": "Minggu lalu saya senggang.",
      "highlight": [
        "でした"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch12-na-past-negative",
    "ch8-na-positive"
  ]
},
{
  "id": "ch12-na-past-negative",
  "chapter": 12,
  "order": 4,
  "pattern": "KS-na / KB + ではありませんでした",
  "meaning": "bukan / tidak ... pada masa lalu",
  "jlptLevel": "N5",
  "formula": "KS-na / KB + ではありませんでした",
  "explanation": "Pola ini adalah bentuk lampau negatif sopan untuk kata benda dan kata sifat な.",
  "keywords": [
    "lampau negatif",
    "dewa arimasen deshita",
    "kata sifat na"
  ],
  "examples": [
    {
      "japanese": "昨日は休みではありませんでした。",
      "reading": "きのうは やすみではありませんでした。",
      "meaning": "Kemarin bukan hari libur.",
      "highlight": [
        "ではありませんでした"
      ]
    },
    {
      "japanese": "ホテルは静かではありませんでした。",
      "reading": "ほてるは しずかではありませんでした。",
      "meaning": "Hotelnya tidak tenang.",
      "highlight": [
        "ではありませんでした"
      ]
    },
    {
      "japanese": "田中さんは先生ではありませんでした。",
      "reading": "たなかさんは せんせいではありませんでした。",
      "meaning": "Tanaka dulu bukan guru.",
      "highlight": [
        "ではありませんでした"
      ]
    },
    {
      "japanese": "会議は簡単ではありませんでした。",
      "reading": "かいぎは かんたんではありませんでした。",
      "meaning": "Rapatnya tidak mudah.",
      "highlight": [
        "ではありませんでした"
      ]
    },
    {
      "japanese": "昨日は暇ではありませんでした。",
      "reading": "きのうは ひまではありませんでした。",
      "meaning": "Kemarin saya tidak senggang.",
      "highlight": [
        "ではありませんでした"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch12-na-past",
    "ch8-na-negative"
  ]
},
{
  "id": "ch12-yori",
  "chapter": 12,
  "order": 5,
  "pattern": "A は B より～です",
  "meaning": "A lebih ... daripada B",
  "jlptLevel": "N5",
  "formula": "A + は + B + より + sifat + です",
  "explanation": "より menandai pembanding. Pola ini menyatakan bahwa A memiliki sifat tertentu lebih daripada B.",
  "keywords": [
    "perbandingan",
    "lebih dari",
    "yori"
  ],
  "examples": [
    {
      "japanese": "東京は大阪より大きいです。",
      "reading": "とうきょうは おおさかより おおきいです。",
      "meaning": "Tokyo lebih besar daripada Osaka.",
      "highlight": [
        "より"
      ]
    },
    {
      "japanese": "電車はバスより速いです。",
      "reading": "でんしゃは ばすより はやいです。",
      "meaning": "Kereta lebih cepat daripada bus.",
      "highlight": [
        "より"
      ]
    },
    {
      "japanese": "今日は昨日より寒いです。",
      "reading": "きょうは きのうより さむいです。",
      "meaning": "Hari ini lebih dingin daripada kemarin.",
      "highlight": [
        "より"
      ]
    },
    {
      "japanese": "日本語は英語より難しいです。",
      "reading": "にほんごは えいごより むずかしいです。",
      "meaning": "Bahasa Jepang lebih sulit daripada bahasa Inggris.",
      "highlight": [
        "より"
      ]
    },
    {
      "japanese": "この店はあの店より安いです。",
      "reading": "この みせは あの みせより やすいです。",
      "meaning": "Toko ini lebih murah daripada toko itu.",
      "highlight": [
        "より"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch12-dochiraga",
    "ch12-ichiban"
  ]
},
{
  "id": "ch12-dochiraga",
  "chapter": 12,
  "order": 6,
  "pattern": "A と B と どちらが～ですか",
  "meaning": "antara A dan B, mana yang lebih ...?",
  "jlptLevel": "N5",
  "formula": "A + と + B + と + どちら + が + sifat + ですか",
  "explanation": "Pola ini digunakan untuk membandingkan dua pilihan dan menanyakan mana yang memiliki sifat lebih kuat.",
  "keywords": [
    "perbandingan",
    "mana",
    "dochira",
    "dua pilihan"
  ],
  "examples": [
    {
      "japanese": "コーヒーとお茶とどちらが好きですか。",
      "reading": "こーひーと おちゃと どちらが すきですか。",
      "meaning": "Antara kopi dan teh, mana yang Anda suka?",
      "highlight": [
        "どちらが"
      ]
    },
    {
      "japanese": "東京と大阪とどちらが大きいですか。",
      "reading": "とうきょうと おおさかと どちらが おおきいですか。",
      "meaning": "Antara Tokyo dan Osaka, mana yang lebih besar?",
      "highlight": [
        "どちらが"
      ]
    },
    {
      "japanese": "電車とバスとどちらが速いですか。",
      "reading": "でんしゃと ばすと どちらが はやいですか。",
      "meaning": "Antara kereta dan bus, mana yang lebih cepat?",
      "highlight": [
        "どちらが"
      ]
    },
    {
      "japanese": "夏と冬とどちらが好きですか。",
      "reading": "なつと ふゆと どちらが すきですか。",
      "meaning": "Antara musim panas dan musim dingin, mana yang Anda suka?",
      "highlight": [
        "どちらが"
      ]
    },
    {
      "japanese": "日本語と英語とどちらが難しいですか。",
      "reading": "にほんごと えいごと どちらが むずかしいですか。",
      "meaning": "Antara bahasa Jepang dan Inggris, mana yang lebih sulit?",
      "highlight": [
        "どちらが"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch12-yori",
    "ch12-ichiban"
  ]
},
{
  "id": "ch12-ichiban",
  "chapter": 12,
  "order": 7,
  "pattern": "～の中で～が一番～です",
  "meaning": "... paling ... di antara ...",
  "jlptLevel": "N5",
  "formula": "Kelompok + の中で + KB + が + 一番 + sifat + です",
  "explanation": "一番 menyatakan tingkat paling tinggi dalam suatu kelompok. Kelompok pembanding dapat ditandai dengan ～の中で.",
  "keywords": [
    "paling",
    "ichiban",
    "superlatif",
    "perbandingan"
  ],
  "examples": [
    {
      "japanese": "果物の中でりんごが一番好きです。",
      "reading": "くだものの なかで りんごが いちばん すきです。",
      "meaning": "Di antara buah-buahan, saya paling suka apel.",
      "highlight": [
        "一番"
      ]
    },
    {
      "japanese": "一年で八月が一番暑いです。",
      "reading": "いちねんで はちがつが いちばん あついです。",
      "meaning": "Dalam setahun, Agustus paling panas.",
      "highlight": [
        "一番"
      ]
    },
    {
      "japanese": "家族の中で父が一番背が高いです。",
      "reading": "かぞくの なかで ちちが いちばん せが たかいです。",
      "meaning": "Di keluarga, ayah paling tinggi.",
      "highlight": [
        "一番"
      ]
    },
    {
      "japanese": "この店の料理ではカレーが一番おいしいです。",
      "reading": "この みせの りょうりでは かれーが いちばん おいしいです。",
      "meaning": "Di antara masakan toko ini, kari paling enak.",
      "highlight": [
        "一番"
      ]
    },
    {
      "japanese": "日本の山では富士山が一番高いです。",
      "reading": "にほんの やまでは ふじさんが いちばん たかいです。",
      "meaning": "Di antara gunung di Jepang, Gunung Fuji paling tinggi.",
      "highlight": [
        "一番"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch12-yori",
    "ch12-dochiraga"
  ]
},
{
  "id": "ch13-hoshii",
  "chapter": 13,
  "order": 1,
  "pattern": "KB がほしいです",
  "meaning": "ingin benda ...",
  "jlptLevel": "N5",
  "formula": "KB + が + ほしいです",
  "explanation": "ほしいです digunakan untuk menyatakan keinginan pembicara terhadap benda atau hal. Benda yang diinginkan biasanya ditandai が.",
  "keywords": [
    "ingin benda",
    "hoshii",
    "keinginan"
  ],
  "examples": [
    {
      "japanese": "新しい辞書がほしいです。",
      "reading": "あたらしい じしょが ほしいです。",
      "meaning": "Saya ingin kamus baru.",
      "highlight": [
        "がほしいです"
      ]
    },
    {
      "japanese": "日本の友達がほしいです。",
      "reading": "にほんの ともだちが ほしいです。",
      "meaning": "Saya ingin punya teman Jepang.",
      "highlight": [
        "がほしいです"
      ]
    },
    {
      "japanese": "もう少し時間がほしいです。",
      "reading": "もう すこし じかんが ほしいです。",
      "meaning": "Saya ingin sedikit lebih banyak waktu.",
      "highlight": [
        "がほしいです"
      ]
    },
    {
      "japanese": "誕生日に自転車がほしいです。",
      "reading": "たんじょうびに じてんしゃが ほしいです。",
      "meaning": "Saya ingin sepeda untuk ulang tahun.",
      "highlight": [
        "がほしいです"
      ]
    },
    {
      "japanese": "旅行用のかばんがほしいです。",
      "reading": "りょこうようの かばんが ほしいです。",
      "meaning": "Saya ingin tas untuk bepergian.",
      "highlight": [
        "がほしいです"
      ]
    }
  ],
  "notes": [
    "Untuk keinginan melakukan aktivitas, gunakan ～たいです, bukan ほしいです."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch13-tai",
    "ch13-takunai"
  ]
},
{
  "id": "ch13-tai",
  "chapter": 13,
  "order": 2,
  "pattern": "～たいです",
  "meaning": "ingin melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk ます tanpa ます + たいです",
  "explanation": "～たいです ditempelkan pada stem bentuk ます untuk menyatakan keinginan pembicara melakukan suatu kegiatan.",
  "keywords": [
    "ingin",
    "tai",
    "keinginan",
    "kata kerja"
  ],
  "examples": [
    {
      "japanese": "日本へ行きたいです。",
      "reading": "にほんへ いきたいです。",
      "meaning": "Saya ingin pergi ke Jepang.",
      "highlight": [
        "たいです"
      ]
    },
    {
      "japanese": "寿司を食べたいです。",
      "reading": "すしを たべたいです。",
      "meaning": "Saya ingin makan sushi.",
      "highlight": [
        "たいです"
      ]
    },
    {
      "japanese": "週末ゆっくり休みたいです。",
      "reading": "しゅうまつ ゆっくり やすみたいです。",
      "meaning": "Akhir pekan saya ingin beristirahat dengan santai.",
      "highlight": [
        "たいです"
      ]
    },
    {
      "japanese": "日本語で話したいです。",
      "reading": "にほんごで はなしたいです。",
      "meaning": "Saya ingin berbicara dalam bahasa Jepang.",
      "highlight": [
        "たいです"
      ]
    },
    {
      "japanese": "京都の寺を見たいです。",
      "reading": "きょうとの てらを みたいです。",
      "meaning": "Saya ingin melihat kuil di Kyoto.",
      "highlight": [
        "たいです"
      ]
    }
  ],
  "notes": [
    "Objek pada pola ～たい dapat ditandai を atau が tergantung konteks; untuk tahap ini contoh utama memakai を."
  ],
  "commonMistakes": [
    {
      "wrong": "日本へ行くたいです。",
      "correct": "日本へ行きたいです。",
      "explanation": "～たい ditempelkan pada stem bentuk ます: 行きます → 行きたいです."
    }
  ],
  "relatedPatterns": [
    "ch13-takunai",
    "ch13-hoshii"
  ]
},
{
  "id": "ch13-takunai",
  "chapter": 13,
  "order": 3,
  "pattern": "～たくないです",
  "meaning": "tidak ingin melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk ます tanpa ます + たくないです",
  "explanation": "Bentuk negatif dari ～たいです adalah ～たくないです dan digunakan untuk menyatakan bahwa pembicara tidak ingin melakukan sesuatu.",
  "keywords": [
    "tidak ingin",
    "takunai",
    "keinginan negatif"
  ],
  "examples": [
    {
      "japanese": "今日は外へ行きたくないです。",
      "reading": "きょうは そとへ いきたくないです。",
      "meaning": "Hari ini saya tidak ingin pergi keluar.",
      "highlight": [
        "たくないです"
      ]
    },
    {
      "japanese": "辛い物は食べたくないです。",
      "reading": "からい ものは たべたくないです。",
      "meaning": "Saya tidak ingin makan makanan pedas.",
      "highlight": [
        "たくないです"
      ]
    },
    {
      "japanese": "明日は早く起きたくないです。",
      "reading": "あしたは はやく おきたくないです。",
      "meaning": "Besok saya tidak ingin bangun pagi.",
      "highlight": [
        "たくないです"
      ]
    },
    {
      "japanese": "今日は残業したくないです。",
      "reading": "きょうは ざんぎょうしたくないです。",
      "meaning": "Hari ini saya tidak ingin lembur.",
      "highlight": [
        "たくないです"
      ]
    },
    {
      "japanese": "一人で行きたくないです。",
      "reading": "ひとりで いきたくないです。",
      "meaning": "Saya tidak ingin pergi sendirian.",
      "highlight": [
        "たくないです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch13-tai",
    "ch13-hoshii"
  ]
},
{
  "id": "ch13-purpose-ni",
  "chapter": 13,
  "order": 4,
  "pattern": "KK stem + に行きます／来ます／帰ります",
  "meaning": "pergi / datang / pulang untuk melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk ます tanpa ます + に + 行きます／来ます／帰ります",
  "explanation": "Pola ini menyatakan tujuan kegiatan dari suatu perpindahan. Kata kerja tujuan memakai stem bentuk ます diikuti に.",
  "keywords": [
    "tujuan",
    "pergi untuk",
    "ni iku",
    "stem masu"
  ],
  "examples": [
    {
      "japanese": "図書館へ本を借りに行きます。",
      "reading": "としょかんへ ほんを かりに いきます。",
      "meaning": "Saya pergi ke perpustakaan untuk meminjam buku.",
      "highlight": [
        "に行きます"
      ]
    },
    {
      "japanese": "駅へ友達を迎えに行きます。",
      "reading": "えきへ ともだちを むかえに いきます。",
      "meaning": "Saya pergi ke stasiun untuk menjemput teman.",
      "highlight": [
        "に行きます"
      ]
    },
    {
      "japanese": "日本へ日本語を勉強しに来ました。",
      "reading": "にほんへ にほんごを べんきょうしに きました。",
      "meaning": "Saya datang ke Jepang untuk belajar bahasa Jepang.",
      "highlight": [
        "に来ました"
      ]
    },
    {
      "japanese": "昼ご飯を食べにレストランへ行きます。",
      "reading": "ひるごはんを たべに れすとらんへ いきます。",
      "meaning": "Saya pergi ke restoran untuk makan siang.",
      "highlight": [
        "に"
      ]
    },
    {
      "japanese": "家へ財布を取りに帰りました。",
      "reading": "いえへ さいふを とりに かえりました。",
      "meaning": "Saya pulang ke rumah untuk mengambil dompet.",
      "highlight": [
        "に帰りました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch5-e-movement",
    "ch28-tameni"
  ]
},
{
  "id": "ch14-tekudasai",
  "chapter": 14,
  "order": 1,
  "pattern": "～てください",
  "meaning": "tolong lakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk て + ください",
  "explanation": "～てください digunakan untuk meminta seseorang melakukan sesuatu secara sopan tetapi cukup langsung.",
  "keywords": [
    "permintaan",
    "tolong",
    "te kudasai",
    "bentuk te"
  ],
  "examples": [
    {
      "japanese": "ここに名前を書いてください。",
      "reading": "ここに なまえを かいてください。",
      "meaning": "Tolong tulis nama di sini.",
      "highlight": [
        "てください"
      ]
    },
    {
      "japanese": "もう一度言ってください。",
      "reading": "もう いちど いってください。",
      "meaning": "Tolong katakan sekali lagi.",
      "highlight": [
        "てください"
      ]
    },
    {
      "japanese": "この本を読んでください。",
      "reading": "この ほんを よんでください。",
      "meaning": "Tolong baca buku ini.",
      "highlight": [
        "てください"
      ]
    },
    {
      "japanese": "少し待ってください。",
      "reading": "すこし まってください。",
      "meaning": "Tolong tunggu sebentar.",
      "highlight": [
        "てください"
      ]
    },
    {
      "japanese": "ドアを閉めてください。",
      "reading": "どあを しめてください。",
      "meaning": "Tolong tutup pintunya.",
      "highlight": [
        "てください"
      ]
    }
  ],
  "notes": [
    "Untuk permintaan yang lebih sopan, N4 akan mempelajari pola seperti ～ていただけませんか."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch15-temoii",
    "ch17-naidekudasai",
    "ch26-teitadakemasenka"
  ]
},
{
  "id": "ch14-teiru-progress",
  "chapter": 14,
  "order": 2,
  "pattern": "～ています（sedang berlangsung）",
  "meaning": "sedang melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk て + います",
  "explanation": "Salah satu fungsi ～ています adalah menyatakan kegiatan yang sedang berlangsung pada saat tertentu.",
  "keywords": [
    "sedang",
    "te iru",
    "progresif",
    "bentuk te"
  ],
  "examples": [
    {
      "japanese": "今、日本語を勉強しています。",
      "reading": "いま にほんごを べんきょうしています。",
      "meaning": "Sekarang saya sedang belajar bahasa Jepang.",
      "highlight": [
        "ています"
      ]
    },
    {
      "japanese": "母は台所で料理しています。",
      "reading": "ははは だいどころで りょうりしています。",
      "meaning": "Ibu sedang memasak di dapur.",
      "highlight": [
        "ています"
      ]
    },
    {
      "japanese": "子どもたちは公園で遊んでいます。",
      "reading": "こどもたちは こうえんで あそんでいます。",
      "meaning": "Anak-anak sedang bermain di taman.",
      "highlight": [
        "でいます"
      ]
    },
    {
      "japanese": "田中さんは電話で話しています。",
      "reading": "たなかさんは でんわで はなしています。",
      "meaning": "Tanaka sedang berbicara melalui telepon.",
      "highlight": [
        "ています"
      ]
    },
    {
      "japanese": "外で雨が降っています。",
      "reading": "そとで あめが ふっています。",
      "meaning": "Di luar sedang turun hujan.",
      "highlight": [
        "っています"
      ]
    }
  ],
  "notes": [
    "～ています juga dapat menyatakan keadaan hasil atau kebiasaan; fungsi tersebut dibahas bertahap pada Bab 15 dan N4."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch15-teiru-state",
    "ch29-teiru-result"
  ]
},
{
  "id": "ch14-mashouka",
  "chapter": 14,
  "order": 3,
  "pattern": "～ましょうか",
  "meaning": "bagaimana kalau saya ...? / boleh saya bantu ...?",
  "jlptLevel": "N5",
  "formula": "KK bentuk ます → ます diganti ましょうか",
  "explanation": "～ましょうか dapat digunakan untuk menawarkan bantuan atau mengusulkan tindakan yang akan dilakukan pembicara.",
  "keywords": [
    "menawarkan bantuan",
    "mashouka",
    "boleh saya",
    "usulan"
  ],
  "examples": [
    {
      "japanese": "荷物を持ちましょうか。",
      "reading": "にもつを もちましょうか。",
      "meaning": "Boleh saya bawakan barangnya?",
      "highlight": [
        "ましょうか"
      ]
    },
    {
      "japanese": "窓を開けましょうか。",
      "reading": "まどを あけましょうか。",
      "meaning": "Boleh saya buka jendelanya?",
      "highlight": [
        "ましょうか"
      ]
    },
    {
      "japanese": "駅まで送りましょうか。",
      "reading": "えきまで おくりましょうか。",
      "meaning": "Boleh saya antar sampai stasiun?",
      "highlight": [
        "ましょうか"
      ]
    },
    {
      "japanese": "写真を撮りましょうか。",
      "reading": "しゃしんを とりましょうか。",
      "meaning": "Bagaimana kalau saya ambil fotonya?",
      "highlight": [
        "ましょうか"
      ]
    },
    {
      "japanese": "少し休みましょうか。",
      "reading": "すこし やすみましょうか。",
      "meaning": "Bagaimana kalau kita istirahat sebentar?",
      "highlight": [
        "ましょうか"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch6-mashou",
    "ch26-teitadakemasenka"
  ]
},
{
  "id": "ch14-tekara",
  "chapter": 14,
  "order": 4,
  "pattern": "～てから",
  "meaning": "setelah melakukan ..., kemudian ...",
  "jlptLevel": "N5",
  "formula": "KK1 bentuk て + から、KK2",
  "explanation": "～てから menyatakan bahwa tindakan kedua dilakukan setelah tindakan pertama selesai.",
  "keywords": [
    "setelah",
    "te kara",
    "urutan",
    "bentuk te"
  ],
  "examples": [
    {
      "japanese": "朝ご飯を食べてから、学校へ行きます。",
      "reading": "あさごはんを たべてから がっこうへ いきます。",
      "meaning": "Setelah sarapan, saya pergi ke sekolah.",
      "highlight": [
        "てから"
      ]
    },
    {
      "japanese": "宿題をしてから、テレビを見ます。",
      "reading": "しゅくだいを してから てれびを みます。",
      "meaning": "Setelah mengerjakan PR, saya menonton televisi.",
      "highlight": [
        "てから"
      ]
    },
    {
      "japanese": "シャワーを浴びてから寝ます。",
      "reading": "しゃわーを あびてから ねます。",
      "meaning": "Setelah mandi, saya tidur.",
      "highlight": [
        "てから"
      ]
    },
    {
      "japanese": "駅に着いてから電話してください。",
      "reading": "えきに ついてから でんわしてください。",
      "meaning": "Setelah tiba di stasiun, tolong telepon.",
      "highlight": [
        "てから"
      ]
    },
    {
      "japanese": "説明を読んでから使います。",
      "reading": "せつめいを よんでから つかいます。",
      "meaning": "Saya menggunakannya setelah membaca petunjuk.",
      "highlight": [
        "でから"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch16-te-sequence",
    "ch23-ta-atode"
  ]
},
{
  "id": "ch15-temoii",
  "chapter": 15,
  "order": 1,
  "pattern": "～てもいいです",
  "meaning": "boleh melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk て + もいいです",
  "explanation": "～てもいいです menyatakan izin atau bahwa suatu tindakan diperbolehkan. Bentuk pertanyaan ～てもいいですか digunakan untuk meminta izin.",
  "keywords": [
    "boleh",
    "izin",
    "temo ii",
    "permission"
  ],
  "examples": [
    {
      "japanese": "ここに座ってもいいです。",
      "reading": "ここに すわっても いいです。",
      "meaning": "Boleh duduk di sini.",
      "highlight": [
        "てもいいです"
      ]
    },
    {
      "japanese": "写真を撮ってもいいですか。",
      "reading": "しゃしんを とっても いいですか。",
      "meaning": "Bolehkah saya mengambil foto?",
      "highlight": [
        "てもいいですか"
      ]
    },
    {
      "japanese": "このペンを使ってもいいですか。",
      "reading": "この ぺんを つかっても いいですか。",
      "meaning": "Bolehkah saya memakai pena ini?",
      "highlight": [
        "てもいいですか"
      ]
    },
    {
      "japanese": "今日は早く帰ってもいいです。",
      "reading": "きょうは はやく かえっても いいです。",
      "meaning": "Hari ini boleh pulang lebih awal.",
      "highlight": [
        "てもいいです"
      ]
    },
    {
      "japanese": "窓を開けてもいいですか。",
      "reading": "まどを あけても いいですか。",
      "meaning": "Bolehkah saya membuka jendela?",
      "highlight": [
        "てもいいですか"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch15-tewaikenai",
    "ch14-tekudasai"
  ]
},
{
  "id": "ch15-tewaikenai",
  "chapter": 15,
  "order": 2,
  "pattern": "～てはいけません",
  "meaning": "tidak boleh melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk て + はいけません",
  "explanation": "～てはいけません menyatakan larangan atau bahwa suatu tindakan tidak diperbolehkan.",
  "keywords": [
    "tidak boleh",
    "larangan",
    "te wa ikemasen",
    "prohibition"
  ],
  "examples": [
    {
      "japanese": "ここでたばこを吸ってはいけません。",
      "reading": "ここで たばこを すってはいけません。",
      "meaning": "Tidak boleh merokok di sini.",
      "highlight": [
        "てはいけません"
      ]
    },
    {
      "japanese": "この部屋に入ってはいけません。",
      "reading": "この へやに はいってはいけません。",
      "meaning": "Tidak boleh masuk ruangan ini.",
      "highlight": [
        "てはいけません"
      ]
    },
    {
      "japanese": "授業中に電話を使ってはいけません。",
      "reading": "じゅぎょうちゅうに でんわを つかってはいけません。",
      "meaning": "Tidak boleh memakai telepon saat pelajaran.",
      "highlight": [
        "てはいけません"
      ]
    },
    {
      "japanese": "ここに車を止めてはいけません。",
      "reading": "ここに くるまを とめてはいけません。",
      "meaning": "Tidak boleh memarkir mobil di sini.",
      "highlight": [
        "てはいけません"
      ]
    },
    {
      "japanese": "図書館で大きな声で話してはいけません。",
      "reading": "としょかんで おおきな こえで はなしてはいけません。",
      "meaning": "Tidak boleh berbicara keras di perpustakaan.",
      "highlight": [
        "てはいけません"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch15-temoii",
    "ch17-naidekudasai"
  ]
},
{
  "id": "ch15-teiru-state",
  "chapter": 15,
  "order": 3,
  "pattern": "～ています（keadaan / kebiasaan）",
  "meaning": "berada dalam keadaan ... / biasa melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk て + います",
  "explanation": "Selain kegiatan yang sedang berlangsung, ～ています dapat menyatakan keadaan yang berlanjut atau kebiasaan yang dilakukan secara rutin, tergantung jenis kata kerja dan konteks.",
  "keywords": [
    "keadaan",
    "kebiasaan",
    "te iru",
    "hasil"
  ],
  "examples": [
    {
      "japanese": "私は東京に住んでいます。",
      "reading": "わたしは とうきょうに すんでいます。",
      "meaning": "Saya tinggal di Tokyo.",
      "highlight": [
        "んでいます"
      ]
    },
    {
      "japanese": "兄は会社で働いています。",
      "reading": "あには かいしゃで はたらいています。",
      "meaning": "Kakak laki-laki saya bekerja di perusahaan.",
      "highlight": [
        "いています"
      ]
    },
    {
      "japanese": "田中さんは結婚しています。",
      "reading": "たなかさんは けっこんしています。",
      "meaning": "Tanaka sudah menikah.",
      "highlight": [
        "しています"
      ]
    },
    {
      "japanese": "私は眼鏡をかけています。",
      "reading": "わたしは めがねを かけています。",
      "meaning": "Saya memakai kacamata.",
      "highlight": [
        "ています"
      ]
    },
    {
      "japanese": "毎朝この道を歩いています。",
      "reading": "まいあさ この みちを あるいています。",
      "meaning": "Saya biasa berjalan di jalan ini setiap pagi.",
      "highlight": [
        "いています"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch14-teiru-progress",
    "ch29-teiru-result"
  ]
},
{
  "id": "ch16-te-sequence",
  "chapter": 16,
  "order": 1,
  "pattern": "KK1 て、KK2",
  "meaning": "melakukan A lalu B",
  "jlptLevel": "N5",
  "formula": "KK1 bentuk て、KK2",
  "explanation": "Bentuk て dapat menghubungkan dua atau lebih tindakan yang dilakukan secara berurutan dalam satu kalimat.",
  "keywords": [
    "urutan kegiatan",
    "dan lalu",
    "bentuk te",
    "menghubungkan"
  ],
  "examples": [
    {
      "japanese": "朝起きて、顔を洗います。",
      "reading": "あさ おきて かおを あらいます。",
      "meaning": "Pagi hari saya bangun lalu mencuci muka.",
      "highlight": [
        "て"
      ]
    },
    {
      "japanese": "駅まで歩いて、電車に乗ります。",
      "reading": "えきまで あるいて でんしゃに のります。",
      "meaning": "Saya berjalan sampai stasiun lalu naik kereta.",
      "highlight": [
        "いて"
      ]
    },
    {
      "japanese": "スーパーへ行って、野菜を買いました。",
      "reading": "すーぱーへ いって やさいを かいました。",
      "meaning": "Saya pergi ke supermarket lalu membeli sayuran.",
      "highlight": [
        "って"
      ]
    },
    {
      "japanese": "家に帰って、宿題をします。",
      "reading": "いえに かえって しゅくだいを します。",
      "meaning": "Saya pulang ke rumah lalu mengerjakan PR.",
      "highlight": [
        "って"
      ]
    },
    {
      "japanese": "シャワーを浴びて、寝ました。",
      "reading": "しゃわーを あびて ねました。",
      "meaning": "Saya mandi lalu tidur.",
      "highlight": [
        "びて"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch14-tekara",
    "ch16-i-kute"
  ]
},
{
  "id": "ch16-i-kute",
  "chapter": 16,
  "order": 2,
  "pattern": "KS-i → ～くて",
  "meaning": "... dan ... (menghubungkan KS-i)",
  "jlptLevel": "N5",
  "formula": "KS-i: い → くて + klausa berikutnya",
  "explanation": "～くて menghubungkan kata sifat い dengan sifat atau informasi berikutnya. Hubungan makna biasanya penambahan atau sebab yang natural dari konteks.",
  "keywords": [
    "kata sifat i",
    "kute",
    "dan",
    "menghubungkan sifat"
  ],
  "examples": [
    {
      "japanese": "この部屋は広くて明るいです。",
      "reading": "この へやは ひろくて あかるいです。",
      "meaning": "Kamar ini luas dan terang.",
      "highlight": [
        "くて"
      ]
    },
    {
      "japanese": "このかばんは安くて便利です。",
      "reading": "この かばんは やすくて べんりです。",
      "meaning": "Tas ini murah dan praktis.",
      "highlight": [
        "くて"
      ]
    },
    {
      "japanese": "富士山は高くてきれいです。",
      "reading": "ふじさんは たかくて きれいです。",
      "meaning": "Gunung Fuji tinggi dan indah.",
      "highlight": [
        "くて"
      ]
    },
    {
      "japanese": "この料理は辛くておいしいです。",
      "reading": "この りょうりは からくて おいしいです。",
      "meaning": "Masakan ini pedas dan enak.",
      "highlight": [
        "くて"
      ]
    },
    {
      "japanese": "昨日は忙しくて疲れました。",
      "reading": "きのうは いそがしくて つかれました。",
      "meaning": "Kemarin saya sibuk sehingga lelah.",
      "highlight": [
        "くて"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch16-na-de",
    "ch8-i-positive"
  ]
},
{
  "id": "ch16-na-de",
  "chapter": 16,
  "order": 3,
  "pattern": "KS-na / KB + で",
  "meaning": "... dan ... (menghubungkan KS-na / KB)",
  "jlptLevel": "N5",
  "formula": "KS-na / KB + で + klausa berikutnya",
  "explanation": "で dapat menghubungkan predikat kata sifat な atau kata benda dengan informasi berikutnya.",
  "keywords": [
    "kata sifat na",
    "kata benda",
    "de",
    "menghubungkan"
  ],
  "examples": [
    {
      "japanese": "この町は静かで便利です。",
      "reading": "この まちは しずかで べんりです。",
      "meaning": "Kota ini tenang dan praktis.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "田中さんは親切で元気です。",
      "reading": "たなかさんは しんせつで げんきです。",
      "meaning": "Tanaka baik hati dan bersemangat.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "父は会社員で、母は先生です。",
      "reading": "ちちは かいしゃいんで ははは せんせいです。",
      "meaning": "Ayah adalah karyawan perusahaan dan ibu adalah guru.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "京都は有名な町で、観光客が多いです。",
      "reading": "きょうとは ゆうめいな まちで かんこうきゃくが おおいです。",
      "meaning": "Kyoto adalah kota terkenal dan wisatawannya banyak.",
      "highlight": [
        "で"
      ]
    },
    {
      "japanese": "この図書館は静かで広いです。",
      "reading": "この としょかんは しずかで ひろいです。",
      "meaning": "Perpustakaan ini tenang dan luas.",
      "highlight": [
        "で"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch16-i-kute",
    "ch8-na-positive"
  ]
},
{
  "id": "ch16-soshite-sorekara",
  "chapter": 16,
  "order": 4,
  "pattern": "そして／それから",
  "meaning": "dan / kemudian",
  "jlptLevel": "N5",
  "formula": "Kalimat A。そして／それから、Kalimat B。",
  "explanation": "そして menghubungkan informasi yang setara dengan makna 'dan'. それから sering menekankan urutan 'setelah itu/kemudian'.",
  "keywords": [
    "dan",
    "kemudian",
    "soshite",
    "sorekara",
    "konjungsi"
  ],
  "examples": [
    {
      "japanese": "この町は静かです。そして、便利です。",
      "reading": "この まちは しずかです。そして べんりです。",
      "meaning": "Kota ini tenang. Dan juga praktis.",
      "highlight": [
        "そして"
      ]
    },
    {
      "japanese": "朝ご飯を食べます。それから、学校へ行きます。",
      "reading": "あさごはんを たべます。それから がっこうへ いきます。",
      "meaning": "Saya sarapan. Setelah itu, saya pergi ke sekolah.",
      "highlight": [
        "それから"
      ]
    },
    {
      "japanese": "田中さんは先生です。そして、山田さんも先生です。",
      "reading": "たなかさんは せんせいです。そして やまださんも せんせいです。",
      "meaning": "Tanaka adalah guru. Dan Yamada juga guru.",
      "highlight": [
        "そして"
      ]
    },
    {
      "japanese": "宿題をしました。それから、テレビを見ました。",
      "reading": "しゅくだいを しました。それから てれびを みました。",
      "meaning": "Saya mengerjakan PR. Kemudian saya menonton televisi.",
      "highlight": [
        "それから"
      ]
    },
    {
      "japanese": "京都へ行きました。そして、奈良へも行きました。",
      "reading": "きょうとへ いきました。そして ならへも いきました。",
      "meaning": "Saya pergi ke Kyoto. Dan saya juga pergi ke Nara.",
      "highlight": [
        "そして"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch16-te-sequence",
    "ch9-reason-kara"
  ]
},
{
  "id": "ch17-naidekudasai",
  "chapter": 17,
  "order": 1,
  "pattern": "～ないでください",
  "meaning": "tolong jangan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk ない + でください",
  "explanation": "～ないでください digunakan untuk meminta seseorang agar tidak melakukan suatu tindakan.",
  "keywords": [
    "tolong jangan",
    "naide kudasai",
    "larangan halus",
    "bentuk nai"
  ],
  "examples": [
    {
      "japanese": "ここで写真を撮らないでください。",
      "reading": "ここで しゃしんを とらないでください。",
      "meaning": "Tolong jangan mengambil foto di sini.",
      "highlight": [
        "ないでください"
      ]
    },
    {
      "japanese": "この部屋に入らないでください。",
      "reading": "この へやに はいらないでください。",
      "meaning": "Tolong jangan masuk ruangan ini.",
      "highlight": [
        "ないでください"
      ]
    },
    {
      "japanese": "窓を開けないでください。",
      "reading": "まどを あけないでください。",
      "meaning": "Tolong jangan membuka jendela.",
      "highlight": [
        "ないでください"
      ]
    },
    {
      "japanese": "大きな声で話さないでください。",
      "reading": "おおきな こえで はなさないでください。",
      "meaning": "Tolong jangan berbicara dengan suara keras.",
      "highlight": [
        "ないでください"
      ]
    },
    {
      "japanese": "ここに荷物を置かないでください。",
      "reading": "ここに にもつを おかないでください。",
      "meaning": "Tolong jangan meletakkan barang di sini.",
      "highlight": [
        "ないでください"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch14-tekudasai",
    "ch15-tewaikenai"
  ]
},
{
  "id": "ch17-nakereba",
  "chapter": 17,
  "order": 2,
  "pattern": "～なければなりません",
  "meaning": "harus melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk ない: ない → なければなりません",
  "explanation": "～なければなりません menyatakan kewajiban atau sesuatu yang harus dilakukan.",
  "keywords": [
    "harus",
    "kewajiban",
    "nakereba narimasen"
  ],
  "examples": [
    {
      "japanese": "毎日薬を飲まなければなりません。",
      "reading": "まいにち くすりを のまなければなりません。",
      "meaning": "Saya harus minum obat setiap hari.",
      "highlight": [
        "なければなりません"
      ]
    },
    {
      "japanese": "明日早く起きなければなりません。",
      "reading": "あした はやく おきなければなりません。",
      "meaning": "Besok saya harus bangun pagi.",
      "highlight": [
        "なければなりません"
      ]
    },
    {
      "japanese": "宿題をしなければなりません。",
      "reading": "しゅくだいを しなければなりません。",
      "meaning": "Saya harus mengerjakan PR.",
      "highlight": [
        "なければなりません"
      ]
    },
    {
      "japanese": "九時までに会社へ行かなければなりません。",
      "reading": "くじまでに かいしゃへ いかなければなりません。",
      "meaning": "Saya harus pergi ke kantor paling lambat pukul sembilan.",
      "highlight": [
        "なければなりません"
      ]
    },
    {
      "japanese": "図書館では静かにしなければなりません。",
      "reading": "としょかんでは しずかに しなければなりません。",
      "meaning": "Di perpustakaan harus tenang.",
      "highlight": [
        "なければなりません"
      ]
    }
  ],
  "notes": [
    "Dalam percakapan, ada bentuk kewajiban yang lebih singkat, tetapi tahap ini memakai bentuk penuh yang jelas."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch17-nakutemoii",
    "ch31-houga-ii"
  ]
},
{
  "id": "ch17-nakutemoii",
  "chapter": 17,
  "order": 3,
  "pattern": "～なくてもいいです",
  "meaning": "tidak harus ... / tidak perlu ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk ない: ない → なくてもいいです",
  "explanation": "～なくてもいいです menyatakan bahwa suatu tindakan tidak wajib dilakukan.",
  "keywords": [
    "tidak harus",
    "tidak perlu",
    "nakutemo ii"
  ],
  "examples": [
    {
      "japanese": "明日は来なくてもいいです。",
      "reading": "あしたは こなくても いいです。",
      "meaning": "Besok tidak perlu datang.",
      "highlight": [
        "なくてもいいです"
      ]
    },
    {
      "japanese": "この漢字は書かなくてもいいです。",
      "reading": "この かんじは かかなくても いいです。",
      "meaning": "Kanji ini tidak harus ditulis.",
      "highlight": [
        "なくてもいいです"
      ]
    },
    {
      "japanese": "今日は残業しなくてもいいです。",
      "reading": "きょうは ざんぎょうしなくても いいです。",
      "meaning": "Hari ini tidak perlu lembur.",
      "highlight": [
        "なくてもいいです"
      ]
    },
    {
      "japanese": "靴を脱がなくてもいいです。",
      "reading": "くつを ぬがなくても いいです。",
      "meaning": "Tidak perlu melepas sepatu.",
      "highlight": [
        "なくてもいいです"
      ]
    },
    {
      "japanese": "全部食べなくてもいいです。",
      "reading": "ぜんぶ たべなくても いいです。",
      "meaning": "Tidak harus menghabiskan semuanya.",
      "highlight": [
        "なくてもいいです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch17-nakereba",
    "ch15-temoii"
  ]
},
{
  "id": "ch17-made-ni",
  "chapter": 17,
  "order": 4,
  "pattern": "～までに",
  "meaning": "paling lambat sebelum / pada batas waktu ...",
  "jlptLevel": "N5",
  "formula": "Waktu batas + までに + KK",
  "explanation": "までに menandai batas waktu kapan suatu tindakan harus selesai. Berbeda dari まで yang menyatakan rentang sampai suatu titik.",
  "keywords": [
    "batas waktu",
    "deadline",
    "made ni",
    "sebelum"
  ],
  "examples": [
    {
      "japanese": "九時までに来てください。",
      "reading": "くじまでに きてください。",
      "meaning": "Tolong datang paling lambat pukul sembilan.",
      "highlight": [
        "までに"
      ]
    },
    {
      "japanese": "金曜日までに宿題を出します。",
      "reading": "きんようびまでに しゅくだいを だします。",
      "meaning": "Saya menyerahkan PR paling lambat hari Jumat.",
      "highlight": [
        "までに"
      ]
    },
    {
      "japanese": "今月末までに払わなければなりません。",
      "reading": "こんげつまつまでに はらわなければなりません。",
      "meaning": "Harus membayar paling lambat akhir bulan ini.",
      "highlight": [
        "までに"
      ]
    },
    {
      "japanese": "十二時までに帰ります。",
      "reading": "じゅうにじまでに かえります。",
      "meaning": "Saya pulang paling lambat pukul dua belas.",
      "highlight": [
        "までに"
      ]
    },
    {
      "japanese": "明日までにこの本を読みます。",
      "reading": "あしたまでに この ほんを よみます。",
      "meaning": "Saya akan membaca buku ini sampai selesai paling lambat besok.",
      "highlight": [
        "までに"
      ]
    }
  ],
  "notes": [
    "まで = 'sampai' sebagai rentang; までに = 'paling lambat pada/sebelum' sebagai batas penyelesaian."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch5-kara-made",
    "ch23-made"
  ]
},
{
  "id": "ch18-koto-ga-dekiru",
  "chapter": 18,
  "order": 1,
  "pattern": "～ことができます",
  "meaning": "bisa / mampu melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk kamus + ことができます",
  "explanation": "Pola ini mengubah kegiatan menjadi 'hal melakukan...' dengan こと lalu menyatakan kemampuan menggunakan できます.",
  "keywords": [
    "bisa",
    "kemampuan",
    "koto ga dekiru",
    "potensial"
  ],
  "examples": [
    {
      "japanese": "私は日本語を話すことができます。",
      "reading": "わたしは にほんごを はなすことが できます。",
      "meaning": "Saya bisa berbicara bahasa Jepang.",
      "highlight": [
        "ことができます"
      ]
    },
    {
      "japanese": "ここで泳ぐことができます。",
      "reading": "ここで およぐことが できます。",
      "meaning": "Di sini bisa berenang.",
      "highlight": [
        "ことができます"
      ]
    },
    {
      "japanese": "このカードで払うことができます。",
      "reading": "この かーどで はらうことが できます。",
      "meaning": "Bisa membayar dengan kartu ini.",
      "highlight": [
        "ことができます"
      ]
    },
    {
      "japanese": "図書館で本を借りることができます。",
      "reading": "としょかんで ほんを かりることが できます。",
      "meaning": "Bisa meminjam buku di perpustakaan.",
      "highlight": [
        "ことができます"
      ]
    },
    {
      "japanese": "スマートフォンで予約することができます。",
      "reading": "すまーとふぉんで よやくすることが できます。",
      "meaning": "Bisa melakukan reservasi dengan ponsel.",
      "highlight": [
        "ことができます"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch27-potential",
    "ch9-jouzu-heta"
  ]
},
{
  "id": "ch18-hobby-koto",
  "chapter": 18,
  "order": 2,
  "pattern": "趣味は～ことです",
  "meaning": "hobi saya adalah melakukan ...",
  "jlptLevel": "N5",
  "formula": "趣味 + は + KK bentuk kamus + ことです",
  "explanation": "こと dapat menominalkan kata kerja sehingga sebuah kegiatan dapat diperlakukan sebagai kata benda, misalnya saat menjelaskan hobi.",
  "keywords": [
    "hobi",
    "nominalisasi",
    "koto",
    "kegiatan"
  ],
  "examples": [
    {
      "japanese": "私の趣味は本を読むことです。",
      "reading": "わたしの しゅみは ほんを よむことです。",
      "meaning": "Hobi saya adalah membaca buku.",
      "highlight": [
        "ことです"
      ]
    },
    {
      "japanese": "趣味は写真を撮ることです。",
      "reading": "しゅみは しゃしんを とることです。",
      "meaning": "Hobi saya adalah mengambil foto.",
      "highlight": [
        "ことです"
      ]
    },
    {
      "japanese": "父の趣味は魚を釣ることです。",
      "reading": "ちちの しゅみは さかなを つることです。",
      "meaning": "Hobi ayah saya adalah memancing ikan.",
      "highlight": [
        "ことです"
      ]
    },
    {
      "japanese": "妹の趣味は音楽を聞くことです。",
      "reading": "いもうとの しゅみは おんがくを きくことです。",
      "meaning": "Hobi adik perempuan saya adalah mendengarkan musik.",
      "highlight": [
        "ことです"
      ]
    },
    {
      "japanese": "私の趣味は料理を作ることです。",
      "reading": "わたしの しゅみは りょうりを つくることです。",
      "meaning": "Hobi saya adalah memasak.",
      "highlight": [
        "ことです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch18-koto-ga-dekiru"
  ]
},
{
  "id": "ch18-mae-ni",
  "chapter": 18,
  "order": 3,
  "pattern": "～前に",
  "meaning": "sebelum melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk kamus + 前に ／ KB + の + 前に",
  "explanation": "～前に menyatakan bahwa suatu tindakan dilakukan sebelum tindakan atau waktu lain.",
  "keywords": [
    "sebelum",
    "mae ni",
    "urutan",
    "waktu"
  ],
  "examples": [
    {
      "japanese": "寝る前に歯を磨きます。",
      "reading": "ねる まえに はを みがきます。",
      "meaning": "Saya menyikat gigi sebelum tidur.",
      "highlight": [
        "前に"
      ]
    },
    {
      "japanese": "食べる前に手を洗います。",
      "reading": "たべる まえに てを あらいます。",
      "meaning": "Saya mencuci tangan sebelum makan.",
      "highlight": [
        "前に"
      ]
    },
    {
      "japanese": "学校へ行く前に朝ご飯を食べます。",
      "reading": "がっこうへ いく まえに あさごはんを たべます。",
      "meaning": "Saya sarapan sebelum pergi ke sekolah.",
      "highlight": [
        "前に"
      ]
    },
    {
      "japanese": "会議の前に資料を読みます。",
      "reading": "かいぎの まえに しりょうを よみます。",
      "meaning": "Saya membaca materi sebelum rapat.",
      "highlight": [
        "前に"
      ]
    },
    {
      "japanese": "旅行の前にホテルを予約しました。",
      "reading": "りょこうの まえに ほてるを よやくしました。",
      "meaning": "Saya memesan hotel sebelum perjalanan.",
      "highlight": [
        "前に"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch23-ta-atode",
    "ch23-toki"
  ]
},
{
  "id": "ch19-ta-koto-ga-aru",
  "chapter": 19,
  "order": 1,
  "pattern": "～たことがあります",
  "meaning": "pernah melakukan ...",
  "jlptLevel": "N5",
  "formula": "KK bentuk た + ことがあります",
  "explanation": "Pola ini menyatakan pengalaman pernah melakukan suatu tindakan setidaknya sekali sampai sekarang.",
  "keywords": [
    "pernah",
    "pengalaman",
    "ta koto ga aru"
  ],
  "examples": [
    {
      "japanese": "日本へ行ったことがあります。",
      "reading": "にほんへ いったことが あります。",
      "meaning": "Saya pernah pergi ke Jepang.",
      "highlight": [
        "たことがあります"
      ]
    },
    {
      "japanese": "富士山に登ったことがあります。",
      "reading": "ふじさんに のぼったことが あります。",
      "meaning": "Saya pernah mendaki Gunung Fuji.",
      "highlight": [
        "たことがあります"
      ]
    },
    {
      "japanese": "寿司を作ったことがあります。",
      "reading": "すしを つくったことが あります。",
      "meaning": "Saya pernah membuat sushi.",
      "highlight": [
        "たことがあります"
      ]
    },
    {
      "japanese": "新幹線に乗ったことがあります。",
      "reading": "しんかんせんに のったことが あります。",
      "meaning": "Saya pernah naik Shinkansen.",
      "highlight": [
        "たことがあります"
      ]
    },
    {
      "japanese": "日本人の友達と旅行したことがあります。",
      "reading": "にほんじんの ともだちと りょこうしたことが あります。",
      "meaning": "Saya pernah bepergian dengan teman Jepang.",
      "highlight": [
        "たことがあります"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch19-tari-tari",
    "ch18-mae-ni"
  ]
},
{
  "id": "ch19-tari-tari",
  "chapter": 19,
  "order": 2,
  "pattern": "～たり～たりします",
  "meaning": "melakukan hal-hal seperti ... dan ...",
  "jlptLevel": "N5",
  "formula": "KK1 bentuk た + り、KK2 bentuk た + りします",
  "explanation": "～たり～たりします menyebut beberapa kegiatan sebagai contoh, tanpa berarti daftar tersebut lengkap atau harus berurutan.",
  "keywords": [
    "dan sebagainya",
    "tari tari",
    "contoh kegiatan",
    "daftar"
  ],
  "examples": [
    {
      "japanese": "日曜日は本を読んだり、映画を見たりします。",
      "reading": "にちようびは ほんを よんだり えいがを みたりします。",
      "meaning": "Hari Minggu saya melakukan hal seperti membaca buku dan menonton film.",
      "highlight": [
        "たり"
      ]
    },
    {
      "japanese": "休みの日は掃除したり、料理したりします。",
      "reading": "やすみの ひは そうじしたり りょうりしたりします。",
      "meaning": "Saat libur saya melakukan hal seperti bersih-bersih dan memasak.",
      "highlight": [
        "たり"
      ]
    },
    {
      "japanese": "公園で歩いたり、写真を撮ったりしました。",
      "reading": "こうえんで あるいたり しゃしんを とったりしました。",
      "meaning": "Di taman saya berjalan-jalan dan mengambil foto, dan sebagainya.",
      "highlight": [
        "たり"
      ]
    },
    {
      "japanese": "旅行では寺を見たり、お土産を買ったりしました。",
      "reading": "りょこうでは てらを みたり おみやげを かったりしました。",
      "meaning": "Saat perjalanan saya melihat kuil dan membeli oleh-oleh, dan sebagainya.",
      "highlight": [
        "たり"
      ]
    },
    {
      "japanese": "夜は音楽を聞いたり、友達と話したりします。",
      "reading": "よるは おんがくを きいたり ともだちと はなしたりします。",
      "meaning": "Malam hari saya mendengarkan musik dan berbicara dengan teman, dan sebagainya.",
      "highlight": [
        "たり"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch19-ta-koto-ga-aru",
    "ch16-te-sequence"
  ]
},
{
  "id": "ch19-naru",
  "chapter": 19,
  "order": 3,
  "pattern": "～くなります／～になります",
  "meaning": "menjadi ... / berubah menjadi ...",
  "jlptLevel": "N5",
  "formula": "KS-i: い→く + なります ／ KS-na・KB + に + なります",
  "explanation": "なります menyatakan perubahan keadaan. KS-i berubah ke bentuk ～くなります, sedangkan KS-na dan KB memakai ～になります.",
  "keywords": [
    "menjadi",
    "perubahan",
    "naru",
    "berubah"
  ],
  "examples": [
    {
      "japanese": "だんだん寒くなります。",
      "reading": "だんだん さむくなります。",
      "meaning": "Lama-lama menjadi dingin.",
      "highlight": [
        "くなります"
      ]
    },
    {
      "japanese": "日本語が上手になりました。",
      "reading": "にほんごが じょうずに なりました。",
      "meaning": "Bahasa Jepang saya menjadi lebih baik.",
      "highlight": [
        "になりました"
      ]
    },
    {
      "japanese": "来年大学生になります。",
      "reading": "らいねん だいがくせいに なります。",
      "meaning": "Tahun depan saya menjadi mahasiswa.",
      "highlight": [
        "になります"
      ]
    },
    {
      "japanese": "部屋がきれいになりました。",
      "reading": "へやが きれいに なりました。",
      "meaning": "Kamar menjadi bersih.",
      "highlight": [
        "になりました"
      ]
    },
    {
      "japanese": "日が長くなりました。",
      "reading": "ひが ながくなりました。",
      "meaning": "Siang hari menjadi lebih panjang.",
      "highlight": [
        "くなりました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch30-you-ni-naru",
    "ch19-ta-koto-ga-aru"
  ]
},
{
  "id": "ch19-mada",
  "chapter": 19,
  "order": 4,
  "pattern": "まだ～ていません",
  "meaning": "belum melakukan ...",
  "jlptLevel": "N5",
  "formula": "まだ + KK bentuk て + いません",
  "explanation": "Pola ini menyatakan bahwa suatu tindakan belum selesai atau belum dilakukan sampai saat ini.",
  "keywords": [
    "belum",
    "mada",
    "te imasen"
  ],
  "examples": [
    {
      "japanese": "宿題はまだ終わっていません。",
      "reading": "しゅくだいは まだ おわっていません。",
      "meaning": "PR belum selesai.",
      "highlight": [
        "まだ",
        "ていません"
      ]
    },
    {
      "japanese": "まだ昼ご飯を食べていません。",
      "reading": "まだ ひるごはんを たべていません。",
      "meaning": "Saya belum makan siang.",
      "highlight": [
        "まだ",
        "ていません"
      ]
    },
    {
      "japanese": "田中さんはまだ来ていません。",
      "reading": "たなかさんは まだ きていません。",
      "meaning": "Tanaka belum datang.",
      "highlight": [
        "まだ",
        "ていません"
      ]
    },
    {
      "japanese": "その映画はまだ見ていません。",
      "reading": "その えいがは まだ みていません。",
      "meaning": "Saya belum menonton film itu.",
      "highlight": [
        "まだ",
        "ていません"
      ]
    },
    {
      "japanese": "まだ予約していません。",
      "reading": "まだ よやくしていません。",
      "meaning": "Saya belum melakukan reservasi.",
      "highlight": [
        "まだ",
        "ていません"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch7-mou-mashita",
    "ch14-teiru-progress"
  ]
},
{
  "id": "ch20-plain-verb",
  "chapter": 20,
  "order": 1,
  "pattern": "KK bentuk biasa",
  "meaning": "bentuk nonformal kata kerja",
  "jlptLevel": "N5",
  "formula": "ます→bentuk kamus ／ ません→ない ／ ました→た ／ ませんでした→なかった",
  "explanation": "Bentuk biasa digunakan dalam percakapan akrab dan menjadi dasar untuk banyak pola N4. Bab ini memperkenalkan empat pasangan dasar kata kerja.",
  "keywords": [
    "bentuk biasa",
    "plain form",
    "kamus",
    "nai",
    "ta",
    "nakatta"
  ],
  "examples": [
    {
      "japanese": "毎日日本語を勉強する。",
      "reading": "まいにち にほんごを べんきょうする。",
      "meaning": "Saya belajar bahasa Jepang setiap hari. (biasa)",
      "highlight": [
        "する"
      ]
    },
    {
      "japanese": "今日は学校へ行かない。",
      "reading": "きょうは がっこうへ いかない。",
      "meaning": "Hari ini saya tidak pergi ke sekolah. (biasa)",
      "highlight": [
        "ない"
      ]
    },
    {
      "japanese": "昨日友達に会った。",
      "reading": "きのう ともだちに あった。",
      "meaning": "Kemarin saya bertemu teman. (biasa)",
      "highlight": [
        "た"
      ]
    },
    {
      "japanese": "朝ご飯を食べなかった。",
      "reading": "あさごはんを たべなかった。",
      "meaning": "Saya tidak sarapan. (biasa)",
      "highlight": [
        "なかった"
      ]
    },
    {
      "japanese": "週末は家で休む。",
      "reading": "しゅうまつは いえで やすむ。",
      "meaning": "Akhir pekan saya beristirahat di rumah. (biasa)",
      "highlight": [
        "休む"
      ]
    }
  ],
  "notes": [
    "Dalam situasi formal gunakan bentuk ます. Bentuk biasa dipakai dengan lawan bicara yang akrab dan di dalam banyak struktur tata bahasa."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch21-to-omoimasu",
    "ch20-plain-adj"
  ]
},
{
  "id": "ch20-plain-adj",
  "chapter": 20,
  "order": 2,
  "pattern": "KS-i / KS-na bentuk biasa",
  "meaning": "bentuk nonformal kata sifat",
  "jlptLevel": "N5",
  "formula": "KS-i: ～い／～くない／～かった／～くなかった; KS-na: ～だ／～じゃない／～だった／～じゃなかった",
  "explanation": "Kata sifat juga memiliki bentuk biasa. Bentuk ini penting sebelum pola seperti ～と思います dan ketika menerangkan informasi dalam klausa.",
  "keywords": [
    "bentuk biasa",
    "kata sifat",
    "plain adjective"
  ],
  "examples": [
    {
      "japanese": "この本は面白い。",
      "reading": "この ほんは おもしろい。",
      "meaning": "Buku ini menarik. (biasa)",
      "highlight": [
        "面白い"
      ]
    },
    {
      "japanese": "今日は寒くない。",
      "reading": "きょうは さむくない。",
      "meaning": "Hari ini tidak dingin. (biasa)",
      "highlight": [
        "くない"
      ]
    },
    {
      "japanese": "昨日は暑かった。",
      "reading": "きのうは あつかった。",
      "meaning": "Kemarin panas. (biasa)",
      "highlight": [
        "かった"
      ]
    },
    {
      "japanese": "この町は静かだ。",
      "reading": "この まちは しずかだ。",
      "meaning": "Kota ini tenang. (biasa)",
      "highlight": [
        "だ"
      ]
    },
    {
      "japanese": "昨日は暇じゃなかった。",
      "reading": "きのうは ひまじゃなかった。",
      "meaning": "Kemarin saya tidak senggang. (biasa)",
      "highlight": [
        "じゃなかった"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch20-plain-verb",
    "ch21-to-omoimasu"
  ]
},
{
  "id": "ch20-plain-noun",
  "chapter": 20,
  "order": 3,
  "pattern": "KB + だ／じゃない／だった／じゃなかった",
  "meaning": "bentuk biasa predikat kata benda",
  "jlptLevel": "N5",
  "formula": "KB + だ／じゃない／だった／じゃなかった",
  "explanation": "Predikat kata benda memakai だ pada bentuk biasa positif sekarang, じゃない pada negatif, だった pada lampau, dan じゃなかった pada lampau negatif.",
  "keywords": [
    "kata benda",
    "plain form",
    "da",
    "janai",
    "datta"
  ],
  "examples": [
    {
      "japanese": "私は学生だ。",
      "reading": "わたしは がくせいだ。",
      "meaning": "Saya pelajar. (biasa)",
      "highlight": [
        "だ"
      ]
    },
    {
      "japanese": "今日は休みじゃない。",
      "reading": "きょうは やすみじゃない。",
      "meaning": "Hari ini bukan hari libur. (biasa)",
      "highlight": [
        "じゃない"
      ]
    },
    {
      "japanese": "昨日は日曜日だった。",
      "reading": "きのうは にちようびだった。",
      "meaning": "Kemarin adalah hari Minggu. (biasa)",
      "highlight": [
        "だった"
      ]
    },
    {
      "japanese": "田中さんは先生じゃなかった。",
      "reading": "たなかさんは せんせいじゃなかった。",
      "meaning": "Tanaka dulu bukan guru. (biasa)",
      "highlight": [
        "じゃなかった"
      ]
    },
    {
      "japanese": "明日は試験だ。",
      "reading": "あしたは しけんだ。",
      "meaning": "Besok ada ujian. (biasa)",
      "highlight": [
        "だ"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch20-plain-verb",
    "ch21-to-omoimasu"
  ]
},
{
  "id": "ch20-kedo",
  "chapter": 20,
  "order": 4,
  "pattern": "～けど／けれど",
  "meaning": "tetapi / meskipun / ... sih",
  "jlptLevel": "N5",
  "formula": "Bentuk biasa + けど、... ／ kalimat sopan + けど、...",
  "explanation": "けど menghubungkan dua informasi yang berlawanan atau melunakkan pembukaan kalimat. Pada tahap ini fokus pada makna sederhana 'tetapi'.",
  "keywords": [
    "tetapi",
    "kedo",
    "kontras",
    "penghubung"
  ],
  "examples": [
    {
      "japanese": "この店は安いけど、おいしいです。",
      "reading": "この みせは やすいけど おいしいです。",
      "meaning": "Toko ini murah, tetapi makanannya enak.",
      "highlight": [
        "けど"
      ]
    },
    {
      "japanese": "日本語は難しいけど、面白いです。",
      "reading": "にほんごは むずかしいけど おもしろいです。",
      "meaning": "Bahasa Jepang sulit, tetapi menarik.",
      "highlight": [
        "けど"
      ]
    },
    {
      "japanese": "行きたいけど、時間がありません。",
      "reading": "いきたいけど じかんが ありません。",
      "meaning": "Saya ingin pergi, tetapi tidak ada waktu.",
      "highlight": [
        "けど"
      ]
    },
    {
      "japanese": "雨だけど、出かけます。",
      "reading": "あめだけど でかけます。",
      "meaning": "Meskipun hujan, saya akan pergi keluar.",
      "highlight": [
        "けど"
      ]
    },
    {
      "japanese": "少し高いですけど、買います。",
      "reading": "すこし たかいですけど かいます。",
      "meaning": "Sedikit mahal, tetapi saya akan membelinya.",
      "highlight": [
        "けど"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch33-noni",
    "ch28-node"
  ]
},
{
  "id": "ch21-to-omoimasu",
  "chapter": 21,
  "order": 1,
  "pattern": "～と思います",
  "meaning": "saya pikir / menurut saya ...",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + と思います",
  "explanation": "～と思います digunakan untuk menyatakan pendapat, perkiraan, atau pemikiran pembicara. Klausa sebelum と biasanya memakai bentuk biasa.",
  "keywords": [
    "pendapat",
    "menurut saya",
    "to omoimasu",
    "pikir"
  ],
  "examples": [
    {
      "japanese": "明日は雨が降ると思います。",
      "reading": "あしたは あめが ふると おもいます。",
      "meaning": "Saya pikir besok akan hujan.",
      "highlight": [
        "と思います"
      ]
    },
    {
      "japanese": "この本は面白いと思います。",
      "reading": "この ほんは おもしろいと おもいます。",
      "meaning": "Menurut saya buku ini menarik.",
      "highlight": [
        "と思います"
      ]
    },
    {
      "japanese": "田中さんは来ないと思います。",
      "reading": "たなかさんは こないと おもいます。",
      "meaning": "Saya pikir Tanaka tidak akan datang.",
      "highlight": [
        "と思います"
      ]
    },
    {
      "japanese": "日本語は大切だと思います。",
      "reading": "にほんごは たいせつだと おもいます。",
      "meaning": "Saya pikir bahasa Jepang itu penting.",
      "highlight": [
        "と思います"
      ]
    },
    {
      "japanese": "その方法が一番いいと思います。",
      "reading": "その ほうほうが いちばん いいと おもいます。",
      "meaning": "Menurut saya cara itu yang paling baik.",
      "highlight": [
        "と思います"
      ]
    }
  ],
  "notes": [
    "Untuk KB dan KS-na dalam bentuk sekarang positif, gunakan だ sebelum と: 学生だと思います・静かだと思います."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch21-to-iimasu",
    "ch21-deshou",
    "ch32-youdesu"
  ]
},
{
  "id": "ch21-to-iimasu",
  "chapter": 21,
  "order": 2,
  "pattern": "～と言います",
  "meaning": "mengatakan bahwa ...",
  "jlptLevel": "N4",
  "formula": "Ucapan / bentuk biasa + と言います",
  "explanation": "～と言います digunakan untuk mengutip ucapan. Kutipan langsung dapat diletakkan di dalam 「 」, sedangkan isi tidak langsung biasanya memakai bentuk biasa sebelum と.",
  "keywords": [
    "mengatakan",
    "kutipan",
    "to iimasu",
    "ucapan"
  ],
  "examples": [
    {
      "japanese": "田中さんは「明日行きます」と言いました。",
      "reading": "たなかさんは あした いきますと いいました。",
      "meaning": "Tanaka berkata, 'Besok saya pergi.'",
      "highlight": [
        "と言いました"
      ]
    },
    {
      "japanese": "先生は試験は金曜日だと言いました。",
      "reading": "せんせいは しけんは きんようびだと いいました。",
      "meaning": "Guru mengatakan bahwa ujian hari Jumat.",
      "highlight": [
        "と言いました"
      ]
    },
    {
      "japanese": "母は今日は遅くなると言いました。",
      "reading": "ははは きょうは おそくなると いいました。",
      "meaning": "Ibu mengatakan bahwa hari ini akan pulang terlambat.",
      "highlight": [
        "と言いました"
      ]
    },
    {
      "japanese": "友達はその映画が面白いと言っています。",
      "reading": "ともだちは その えいがが おもしろいと いっています。",
      "meaning": "Teman saya mengatakan film itu menarik.",
      "highlight": [
        "と言っています"
      ]
    },
    {
      "japanese": "山田さんは来週帰国すると言いました。",
      "reading": "やまださんは らいしゅう きこくすると いいました。",
      "meaning": "Yamada mengatakan akan pulang ke negaranya minggu depan.",
      "highlight": [
        "と言いました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch21-to-omoimasu",
    "ch32-to-itteimashita"
  ]
},
{
  "id": "ch21-deshou",
  "chapter": 21,
  "order": 3,
  "pattern": "～でしょう",
  "meaning": "mungkin / tampaknya / bukan?",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + でしょう",
  "explanation": "～でしょう menyatakan perkiraan yang cukup kuat atau meminta persetujuan lawan bicara, tergantung intonasi dan konteks.",
  "keywords": [
    "mungkin",
    "perkiraan",
    "deshou",
    "dugaan"
  ],
  "examples": [
    {
      "japanese": "明日は晴れるでしょう。",
      "reading": "あしたは はれるでしょう。",
      "meaning": "Besok mungkin akan cerah.",
      "highlight": [
        "でしょう"
      ]
    },
    {
      "japanese": "週末は人が多いでしょう。",
      "reading": "しゅうまつは ひとが おおいでしょう。",
      "meaning": "Akhir pekan mungkin akan banyak orang.",
      "highlight": [
        "でしょう"
      ]
    },
    {
      "japanese": "田中さんも来るでしょう。",
      "reading": "たなかさんも くるでしょう。",
      "meaning": "Tanaka juga mungkin akan datang.",
      "highlight": [
        "でしょう"
      ]
    },
    {
      "japanese": "この問題は難しいでしょう。",
      "reading": "この もんだいは むずかしいでしょう。",
      "meaning": "Soal ini mungkin sulit.",
      "highlight": [
        "でしょう"
      ]
    },
    {
      "japanese": "北海道はもう寒いでしょう。",
      "reading": "ほっかいどうは もう さむいでしょう。",
      "meaning": "Hokkaido mungkin sudah dingin.",
      "highlight": [
        "でしょう"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch21-kamoshirenai",
    "ch21-to-omoimasu"
  ]
},
{
  "id": "ch21-kamoshirenai",
  "chapter": 21,
  "order": 4,
  "pattern": "～かもしれません",
  "meaning": "mungkin ...",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + かもしれません",
  "explanation": "～かもしれません menyatakan kemungkinan yang belum pasti. Tingkat keyakinannya biasanya lebih rendah daripada でしょう.",
  "keywords": [
    "mungkin",
    "kemungkinan",
    "kamoshirenai"
  ],
  "examples": [
    {
      "japanese": "午後は雨が降るかもしれません。",
      "reading": "ごごは あめが ふるかもしれません。",
      "meaning": "Sore nanti mungkin turun hujan.",
      "highlight": [
        "かもしれません"
      ]
    },
    {
      "japanese": "田中さんは遅れるかもしれません。",
      "reading": "たなかさんは おくれるかもしれません。",
      "meaning": "Tanaka mungkin terlambat.",
      "highlight": [
        "かもしれません"
      ]
    },
    {
      "japanese": "この店はもう閉まっているかもしれません。",
      "reading": "この みせは もう しまっているかもしれません。",
      "meaning": "Toko ini mungkin sudah tutup.",
      "highlight": [
        "かもしれません"
      ]
    },
    {
      "japanese": "明日は休みかもしれません。",
      "reading": "あしたは やすみかもしれません。",
      "meaning": "Besok mungkin libur.",
      "highlight": [
        "かもしれません"
      ]
    },
    {
      "japanese": "その話は本当ではないかもしれません。",
      "reading": "その はなしは ほんとうではないかもしれません。",
      "meaning": "Cerita itu mungkin tidak benar.",
      "highlight": [
        "かもしれません"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch21-deshou",
    "ch32-youdesu"
  ]
},
{
  "id": "ch22-verb-relative",
  "chapter": 22,
  "order": 1,
  "pattern": "KK bentuk biasa + KB",
  "meaning": "kata benda yang diterangkan oleh kegiatan/keadaan",
  "jlptLevel": "N4",
  "formula": "Klausa KK bentuk biasa + KB",
  "explanation": "Dalam bahasa Jepang, klausa yang menerangkan kata benda diletakkan langsung sebelum kata benda tanpa kata penghubung seperti 'yang'.",
  "keywords": [
    "klausa relatif",
    "yang",
    "menerangkan kata benda",
    "relative clause"
  ],
  "examples": [
    {
      "japanese": "昨日買った本を読みました。",
      "reading": "きのう かった ほんを よみました。",
      "meaning": "Saya membaca buku yang dibeli kemarin.",
      "highlight": [
        "買った本"
      ]
    },
    {
      "japanese": "駅で会った人は田中さんです。",
      "reading": "えきで あった ひとは たなかさんです。",
      "meaning": "Orang yang saya temui di stasiun adalah Tanaka.",
      "highlight": [
        "会った人"
      ]
    },
    {
      "japanese": "母が作った料理はおいしいです。",
      "reading": "ははが つくった りょうりは おいしいです。",
      "meaning": "Masakan yang dibuat ibu enak.",
      "highlight": [
        "作った料理"
      ]
    },
    {
      "japanese": "日本で撮った写真を見せます。",
      "reading": "にほんで とった しゃしんを みせます。",
      "meaning": "Saya akan menunjukkan foto yang diambil di Jepang.",
      "highlight": [
        "撮った写真"
      ]
    },
    {
      "japanese": "毎日使う辞書はこれです。",
      "reading": "まいにち つかう じしょは これです。",
      "meaning": "Kamus yang saya gunakan setiap hari adalah ini.",
      "highlight": [
        "使う辞書"
      ]
    }
  ],
  "notes": [
    "Subjek di dalam klausa relatif sering ditandai が, misalnya 母が作った料理."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch22-adj-relative",
    "ch22-noun-na-relative"
  ]
},
{
  "id": "ch22-adj-relative",
  "chapter": 22,
  "order": 2,
  "pattern": "KS-i / KS-na + KB",
  "meaning": "kata benda yang diterangkan oleh sifat",
  "jlptLevel": "N4",
  "formula": "KS-i + KB ／ KS-na + な + KB",
  "explanation": "KS-i ditempelkan langsung pada kata benda. KS-na memakai な ketika menerangkan kata benda.",
  "keywords": [
    "menerangkan kata benda",
    "kata sifat",
    "adjective clause"
  ],
  "examples": [
    {
      "japanese": "安いホテルを探しています。",
      "reading": "やすい ほてるを さがしています。",
      "meaning": "Saya sedang mencari hotel murah.",
      "highlight": [
        "安いホテル"
      ]
    },
    {
      "japanese": "静かな町に住みたいです。",
      "reading": "しずかな まちに すみたいです。",
      "meaning": "Saya ingin tinggal di kota yang tenang.",
      "highlight": [
        "静かな町"
      ]
    },
    {
      "japanese": "面白い映画を見ました。",
      "reading": "おもしろい えいがを みました。",
      "meaning": "Saya menonton film yang menarik.",
      "highlight": [
        "面白い映画"
      ]
    },
    {
      "japanese": "便利なアプリを使っています。",
      "reading": "べんりな あぷりを つかっています。",
      "meaning": "Saya menggunakan aplikasi yang praktis.",
      "highlight": [
        "便利な"
      ]
    },
    {
      "japanese": "新しい仕事を始めました。",
      "reading": "あたらしい しごとを はじめました。",
      "meaning": "Saya memulai pekerjaan baru.",
      "highlight": [
        "新しい仕事"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch22-verb-relative",
    "ch8-na-positive"
  ]
},
{
  "id": "ch22-noun-na-relative",
  "chapter": 22,
  "order": 3,
  "pattern": "KB + の + KB／KS-na + な + KB",
  "meaning": "menerangkan kata benda dengan nomina atau KS-na",
  "jlptLevel": "N4",
  "formula": "KB1 + の + KB2 ／ KS-na + な + KB",
  "explanation": "Kata benda menerangkan kata benda lain dengan の, sedangkan KS-na menggunakan な. Pola ini penting untuk membentuk frasa yang lebih panjang.",
  "keywords": [
    "frasa nomina",
    "no",
    "na",
    "menerangkan"
  ],
  "examples": [
    {
      "japanese": "日本の会社で働いています。",
      "reading": "にほんの かいしゃで はたらいています。",
      "meaning": "Saya bekerja di perusahaan Jepang.",
      "highlight": [
        "の会社"
      ]
    },
    {
      "japanese": "駅の近くの店で買いました。",
      "reading": "えきの ちかくの みせで かいました。",
      "meaning": "Saya membelinya di toko dekat stasiun.",
      "highlight": [
        "の店"
      ]
    },
    {
      "japanese": "有名な先生に会いました。",
      "reading": "ゆうめいな せんせいに あいました。",
      "meaning": "Saya bertemu guru yang terkenal.",
      "highlight": [
        "有名な"
      ]
    },
    {
      "japanese": "大切な書類をなくしました。",
      "reading": "たいせつな しょるいを なくしました。",
      "meaning": "Saya kehilangan dokumen penting.",
      "highlight": [
        "大切な"
      ]
    },
    {
      "japanese": "友達の家の前で待ちます。",
      "reading": "ともだちの いえの まえで まちます。",
      "meaning": "Saya menunggu di depan rumah teman.",
      "highlight": [
        "の家",
        "の前"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch22-adj-relative",
    "ch1-no"
  ]
},
{
  "id": "ch22-toiu-noun",
  "chapter": 22,
  "order": 4,
  "pattern": "～という + KB",
  "meaning": "yang disebut / bernama ...",
  "jlptLevel": "N4",
  "formula": "Nama / kata / klausa + という + KB",
  "explanation": "～という digunakan untuk menerangkan nama, sebutan, atau isi suatu istilah sebelum kata benda.",
  "keywords": [
    "disebut",
    "bernama",
    "to iu",
    "nama"
  ],
  "examples": [
    {
      "japanese": "「さくら」という店で食べました。",
      "reading": "さくらという みせで たべました。",
      "meaning": "Saya makan di restoran yang bernama 'Sakura'.",
      "highlight": [
        "という"
      ]
    },
    {
      "japanese": "田中さんという人を知っていますか。",
      "reading": "たなかさんという ひとを しっていますか。",
      "meaning": "Apakah Anda mengenal orang yang bernama Tanaka?",
      "highlight": [
        "という"
      ]
    },
    {
      "japanese": "JLPTという試験を受けます。",
      "reading": "じぇいえるぴーてぃーという しけんを うけます。",
      "meaning": "Saya akan mengikuti ujian yang disebut JLPT.",
      "highlight": [
        "という"
      ]
    },
    {
      "japanese": "「もったいない」という言葉を習いました。",
      "reading": "もったいないという ことばを ならいました。",
      "meaning": "Saya mempelajari kata yang disebut 'mottainai'.",
      "highlight": [
        "という"
      ]
    },
    {
      "japanese": "富士山という山は日本で有名です。",
      "reading": "ふじさんという やまは にほんで ゆうめいです。",
      "meaning": "Gunung yang bernama Fuji terkenal di Jepang.",
      "highlight": [
        "という"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch32-toiu-imi",
    "ch21-to-iimasu"
  ]
},
{
  "id": "ch23-toki",
  "chapter": 23,
  "order": 1,
  "pattern": "～とき",
  "meaning": "ketika / saat ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk biasa + とき ／ KS-i + とき ／ KS-na + なとき ／ KB + のとき",
  "explanation": "～とき menghubungkan suatu keadaan atau kegiatan dengan waktu terjadinya tindakan lain. Bentuk kata kerja sebelum とき memengaruhi hubungan waktunya.",
  "keywords": [
    "ketika",
    "saat",
    "toki",
    "waktu"
  ],
  "examples": [
    {
      "japanese": "日本へ行くとき、カメラを持って行きます。",
      "reading": "にほんへ いくとき かめらを もっていきます。",
      "meaning": "Saat pergi ke Jepang, saya membawa kamera.",
      "highlight": [
        "とき"
      ]
    },
    {
      "japanese": "家を出るとき、電気を消します。",
      "reading": "いえを でるとき でんきを けします。",
      "meaning": "Saat keluar rumah, saya mematikan lampu.",
      "highlight": [
        "とき"
      ]
    },
    {
      "japanese": "子どものとき、よく海で泳ぎました。",
      "reading": "こどもの とき よく うみで およぎました。",
      "meaning": "Saat kecil, saya sering berenang di laut.",
      "highlight": [
        "とき"
      ]
    },
    {
      "japanese": "暇なとき、本を読みます。",
      "reading": "ひまな とき ほんを よみます。",
      "meaning": "Saat senggang, saya membaca buku.",
      "highlight": [
        "とき"
      ]
    },
    {
      "japanese": "困ったとき、先生に相談します。",
      "reading": "こまった とき せんせいに そうだんします。",
      "meaning": "Saat mengalami kesulitan, saya berkonsultasi dengan guru.",
      "highlight": [
        "とき"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch18-mae-ni",
    "ch23-ta-atode"
  ]
},
{
  "id": "ch23-to-condition",
  "chapter": 23,
  "order": 2,
  "pattern": "～と（kondisi otomatis）",
  "meaning": "jika / ketika A, selalu B",
  "jlptLevel": "N4",
  "formula": "Bentuk kamus / ない + と、hasil alami / kebiasaan",
  "explanation": "Kondisional と digunakan ketika akibat B terjadi secara otomatis, merupakan fakta umum, petunjuk mesin, atau kebiasaan yang kuat.",
  "keywords": [
    "jika",
    "kondisi",
    "to",
    "otomatis",
    "fakta umum"
  ],
  "examples": [
    {
      "japanese": "春になると、暖かくなります。",
      "reading": "はるに なると あたたかくなります。",
      "meaning": "Kalau musim semi tiba, cuaca menjadi hangat.",
      "highlight": [
        "と"
      ]
    },
    {
      "japanese": "このボタンを押すと、ドアが開きます。",
      "reading": "この ぼたんを おすと どあが あきます。",
      "meaning": "Kalau tombol ini ditekan, pintu terbuka.",
      "highlight": [
        "と"
      ]
    },
    {
      "japanese": "右へ曲がると、駅があります。",
      "reading": "みぎへ まがると えきが あります。",
      "meaning": "Kalau belok kanan, ada stasiun.",
      "highlight": [
        "と"
      ]
    },
    {
      "japanese": "冬になると、日が短くなります。",
      "reading": "ふゆに なると ひが みじかくなります。",
      "meaning": "Kalau musim dingin tiba, siang menjadi pendek.",
      "highlight": [
        "と"
      ]
    },
    {
      "japanese": "この薬を飲むと、眠くなります。",
      "reading": "この くすりを のむと ねむくなります。",
      "meaning": "Kalau minum obat ini, akan mengantuk.",
      "highlight": [
        "と"
      ]
    }
  ],
  "notes": [
    "Kondisional と tidak cocok untuk hasil yang berupa perintah, ajakan, atau keinginan pembicara pada pola dasar."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch25-tara",
    "ch25-ba"
  ]
},
{
  "id": "ch23-ta-atode",
  "chapter": 23,
  "order": 3,
  "pattern": "～たあとで",
  "meaning": "setelah melakukan ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk た + あとで ／ KB + の + あとで",
  "explanation": "～たあとで menyatakan bahwa tindakan kedua terjadi setelah tindakan pertama selesai.",
  "keywords": [
    "setelah",
    "ato de",
    "urutan",
    "bentuk ta"
  ],
  "examples": [
    {
      "japanese": "仕事が終わったあとで、友達に会います。",
      "reading": "しごとが おわった あとで ともだちに あいます。",
      "meaning": "Setelah pekerjaan selesai, saya bertemu teman.",
      "highlight": [
        "たあとで"
      ]
    },
    {
      "japanese": "ご飯を食べたあとで、薬を飲みます。",
      "reading": "ごはんを たべた あとで くすりを のみます。",
      "meaning": "Setelah makan, saya minum obat.",
      "highlight": [
        "たあとで"
      ]
    },
    {
      "japanese": "授業のあとで、先生に質問しました。",
      "reading": "じゅぎょうの あとで せんせいに しつもんしました。",
      "meaning": "Setelah pelajaran, saya bertanya kepada guru.",
      "highlight": [
        "あとで"
      ]
    },
    {
      "japanese": "映画を見たあとで、食事をしました。",
      "reading": "えいがを みた あとで しょくじを しました。",
      "meaning": "Setelah menonton film, saya makan.",
      "highlight": [
        "たあとで"
      ]
    },
    {
      "japanese": "日本へ来たあとで、日本語の勉強を始めました。",
      "reading": "にほんへ きた あとで にほんごの べんきょうを はじめました。",
      "meaning": "Setelah datang ke Jepang, saya mulai belajar bahasa Jepang.",
      "highlight": [
        "たあとで"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch14-tekara",
    "ch18-mae-ni"
  ]
},
{
  "id": "ch23-made",
  "chapter": 23,
  "order": 4,
  "pattern": "～まで",
  "meaning": "sampai suatu tindakan / keadaan berakhir",
  "jlptLevel": "N4",
  "formula": "KK bentuk kamus + まで ／ waktu + まで",
  "explanation": "まで dapat menandai batas akhir waktu atau batas sampai suatu keadaan/tindakan tertentu tercapai.",
  "keywords": [
    "sampai",
    "made",
    "batas",
    "waktu"
  ],
  "examples": [
    {
      "japanese": "雨が止むまでここで待ちます。",
      "reading": "あめが やむまで ここで まちます。",
      "meaning": "Saya menunggu di sini sampai hujan berhenti.",
      "highlight": [
        "まで"
      ]
    },
    {
      "japanese": "仕事が終わるまで帰れません。",
      "reading": "しごとが おわるまで かえれません。",
      "meaning": "Saya tidak bisa pulang sampai pekerjaan selesai.",
      "highlight": [
        "まで"
      ]
    },
    {
      "japanese": "夜十時まで勉強しました。",
      "reading": "よる じゅうじまで べんきょうしました。",
      "meaning": "Saya belajar sampai pukul sepuluh malam.",
      "highlight": [
        "まで"
      ]
    },
    {
      "japanese": "友達が来るまで本を読んでいます。",
      "reading": "ともだちが くるまで ほんを よんでいます。",
      "meaning": "Saya membaca buku sampai teman datang.",
      "highlight": [
        "まで"
      ]
    },
    {
      "japanese": "元気になるまで休んでください。",
      "reading": "げんきに なるまで やすんでください。",
      "meaning": "Tolong istirahat sampai sehat kembali.",
      "highlight": [
        "まで"
      ]
    }
  ],
  "notes": [
    "までに adalah batas penyelesaian; まで menyatakan keadaan atau kegiatan berlangsung sampai batas tersebut."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch17-made-ni",
    "ch5-kara-made"
  ]
},
{
  "id": "ch24-teageru",
  "chapter": 24,
  "order": 1,
  "pattern": "～てあげます",
  "meaning": "melakukan sesuatu untuk orang lain",
  "jlptLevel": "N4",
  "formula": "Pemberi + は + penerima + に + KK bentuk て + あげます",
  "explanation": "～てあげます menyatakan bahwa seseorang melakukan tindakan sebagai bantuan atau kebaikan untuk pihak lain. Gunakan dengan hati-hati agar tidak terdengar menekankan jasa kepada orang yang lebih tinggi.",
  "keywords": [
    "memberi bantuan",
    "te ageru",
    "untuk orang lain"
  ],
  "examples": [
    {
      "japanese": "私は妹に宿題を教えてあげました。",
      "reading": "わたしは いもうとに しゅくだいを おしえてあげました。",
      "meaning": "Saya membantu mengajari PR kepada adik perempuan.",
      "highlight": [
        "てあげました"
      ]
    },
    {
      "japanese": "友達に駅までの道を案内してあげました。",
      "reading": "ともだちに えきまでの みちを あんないしてあげました。",
      "meaning": "Saya menunjukkan jalan ke stasiun untuk teman.",
      "highlight": [
        "てあげました"
      ]
    },
    {
      "japanese": "子どもに本を読んであげます。",
      "reading": "こどもに ほんを よんであげます。",
      "meaning": "Saya membacakan buku untuk anak.",
      "highlight": [
        "てあげます"
      ]
    },
    {
      "japanese": "弟の荷物を持ってあげました。",
      "reading": "おとうとの にもつを もってあげました。",
      "meaning": "Saya membawakan barang adik laki-laki.",
      "highlight": [
        "てあげました"
      ]
    },
    {
      "japanese": "友達の写真を撮ってあげました。",
      "reading": "ともだちの しゃしんを とってあげました。",
      "meaning": "Saya mengambilkan foto untuk teman.",
      "highlight": [
        "てあげました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch24-temorau",
    "ch24-tekureru",
    "ch7-ageru"
  ]
},
{
  "id": "ch24-temorau",
  "chapter": 24,
  "order": 2,
  "pattern": "～てもらいます",
  "meaning": "menerima bantuan melakukan ...",
  "jlptLevel": "N4",
  "formula": "Penerima + は + pelaku + に + KK bentuk て + もらいます",
  "explanation": "～てもらいます menyatakan bahwa subjek menerima manfaat dari tindakan yang dilakukan orang lain.",
  "keywords": [
    "menerima bantuan",
    "te morau",
    "dibantu"
  ],
  "examples": [
    {
      "japanese": "私は先生に作文を直してもらいました。",
      "reading": "わたしは せんせいに さくぶんを なおしてもらいました。",
      "meaning": "Saya meminta/menerima bantuan guru untuk memperbaiki karangan.",
      "highlight": [
        "てもらいました"
      ]
    },
    {
      "japanese": "友達に駅まで送ってもらいました。",
      "reading": "ともだちに えきまで おくってもらいました。",
      "meaning": "Saya diantar teman sampai stasiun.",
      "highlight": [
        "てもらいました"
      ]
    },
    {
      "japanese": "母に料理を作ってもらいました。",
      "reading": "ははに りょうりを つくってもらいました。",
      "meaning": "Saya dibuatkan masakan oleh ibu.",
      "highlight": [
        "てもらいました"
      ]
    },
    {
      "japanese": "同僚に仕事を手伝ってもらいました。",
      "reading": "どうりょうに しごとを てつだってもらいました。",
      "meaning": "Saya mendapat bantuan rekan kerja untuk pekerjaan.",
      "highlight": [
        "てもらいました"
      ]
    },
    {
      "japanese": "日本人の友達に発音を教えてもらいました。",
      "reading": "にほんじんの ともだちに はつおんを おしえてもらいました。",
      "meaning": "Saya diajari pengucapan oleh teman Jepang.",
      "highlight": [
        "てもらいました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch24-teageru",
    "ch24-tekureru",
    "ch7-morau"
  ]
},
{
  "id": "ch24-tekureru",
  "chapter": 24,
  "order": 3,
  "pattern": "～てくれます",
  "meaning": "seseorang melakukan sesuatu untuk saya / pihak saya",
  "jlptLevel": "N4",
  "formula": "Pelaku + が／は + KK bentuk て + くれます",
  "explanation": "～てくれます menyatakan bahwa orang lain melakukan sesuatu yang bermanfaat bagi pembicara atau orang yang dekat dengan pembicara.",
  "keywords": [
    "memberi bantuan",
    "te kureru",
    "untuk saya"
  ],
  "examples": [
    {
      "japanese": "友達が宿題を手伝ってくれました。",
      "reading": "ともだちが しゅくだいを てつだってくれました。",
      "meaning": "Teman membantu mengerjakan PR saya.",
      "highlight": [
        "てくれました"
      ]
    },
    {
      "japanese": "先生が漢字を教えてくれました。",
      "reading": "せんせいが かんじを おしえてくれました。",
      "meaning": "Guru mengajarkan Kanji kepada saya.",
      "highlight": [
        "てくれました"
      ]
    },
    {
      "japanese": "兄が駅まで送ってくれました。",
      "reading": "あにが えきまで おくってくれました。",
      "meaning": "Kakak mengantar saya sampai stasiun.",
      "highlight": [
        "てくれました"
      ]
    },
    {
      "japanese": "田中さんが写真を撮ってくれました。",
      "reading": "たなかさんが しゃしんを とってくれました。",
      "meaning": "Tanaka mengambilkan foto untuk saya.",
      "highlight": [
        "てくれました"
      ]
    },
    {
      "japanese": "母が弁当を作ってくれました。",
      "reading": "ははが べんとうを つくってくれました。",
      "meaning": "Ibu membuatkan bekal untuk saya.",
      "highlight": [
        "てくれました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch24-temorau",
    "ch24-teageru"
  ]
},
{
  "id": "ch24-tekudasaru",
  "chapter": 24,
  "order": 4,
  "pattern": "～てくださいます",
  "meaning": "orang yang dihormati melakukan sesuatu untuk saya",
  "jlptLevel": "N4",
  "formula": "Pelaku + が + KK bentuk て + くださいます",
  "explanation": "～てくださいます adalah bentuk hormat yang berkaitan dengan ～てくれます, digunakan ketika pihak yang memberi bantuan perlu dihormati.",
  "keywords": [
    "kudasaru",
    "bantuan sopan",
    "honorifik",
    "untuk saya"
  ],
  "examples": [
    {
      "japanese": "先生が推薦状を書いてくださいました。",
      "reading": "せんせいが すいせんじょうを かいてくださいました。",
      "meaning": "Guru berkenan menuliskan surat rekomendasi untuk saya.",
      "highlight": [
        "てくださいました"
      ]
    },
    {
      "japanese": "部長が説明してくださいました。",
      "reading": "ぶちょうが せつめいしてくださいました。",
      "meaning": "Kepala bagian berkenan menjelaskan kepada saya.",
      "highlight": [
        "てくださいました"
      ]
    },
    {
      "japanese": "先生が本を貸してくださいました。",
      "reading": "せんせいが ほんを かしてくださいました。",
      "meaning": "Guru berkenan meminjamkan buku kepada saya.",
      "highlight": [
        "てくださいました"
      ]
    },
    {
      "japanese": "駅員さんが道を教えてくださいました。",
      "reading": "えきいんさんが みちを おしえてくださいました。",
      "meaning": "Petugas stasiun berkenan menunjukkan jalan kepada saya.",
      "highlight": [
        "てくださいました"
      ]
    },
    {
      "japanese": "医者が詳しく話してくださいました。",
      "reading": "いしゃが くわしく はなしてくださいました。",
      "meaning": "Dokter berkenan menjelaskan dengan rinci kepada saya.",
      "highlight": [
        "てくださいました"
      ]
    }
  ],
  "notes": [
    "Pola ini memperkenalkan nuansa hormat secara ringan; sistem keigo lengkap dipelajari pada tahap yang lebih tinggi."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch24-tekureru",
    "ch26-teitadakemasenka"
  ]
},
{
  "id": "ch25-tara",
  "chapter": 25,
  "order": 1,
  "pattern": "～たら",
  "meaning": "kalau / jika / setelah ...",
  "jlptLevel": "N4",
  "formula": "Bentuk lampau biasa + ら、...",
  "explanation": "～たら adalah pola kondisi yang sangat umum. Dapat digunakan untuk syarat hipotetis maupun 'setelah A terjadi, lakukan B'.",
  "keywords": [
    "jika",
    "kalau",
    "tara",
    "kondisi"
  ],
  "examples": [
    {
      "japanese": "時間があったら、映画を見ます。",
      "reading": "じかんが あったら えいがを みます。",
      "meaning": "Kalau ada waktu, saya akan menonton film.",
      "highlight": [
        "たら"
      ]
    },
    {
      "japanese": "雨が降ったら、出かけません。",
      "reading": "あめが ふったら でかけません。",
      "meaning": "Kalau hujan, saya tidak akan keluar.",
      "highlight": [
        "たら"
      ]
    },
    {
      "japanese": "日本へ行ったら、京都を見たいです。",
      "reading": "にほんへ いったら きょうとを みたいです。",
      "meaning": "Kalau pergi ke Jepang, saya ingin melihat Kyoto.",
      "highlight": [
        "たら"
      ]
    },
    {
      "japanese": "仕事が終わったら、電話してください。",
      "reading": "しごとが おわったら でんわしてください。",
      "meaning": "Kalau pekerjaan sudah selesai, tolong telepon.",
      "highlight": [
        "たら"
      ]
    },
    {
      "japanese": "駅に着いたら、連絡します。",
      "reading": "えきに ついたら れんらくします。",
      "meaning": "Setelah tiba di stasiun, saya akan menghubungi Anda.",
      "highlight": [
        "たら"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch25-temo",
    "ch25-nara",
    "ch25-ba"
  ]
},
{
  "id": "ch25-temo",
  "chapter": 25,
  "order": 2,
  "pattern": "～ても",
  "meaning": "meskipun / walaupun ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk て + も ／ KS-i くて + も ／ KS-na・KB で + も",
  "explanation": "～ても menyatakan bahwa hasil di klausa utama tetap terjadi walaupun kondisi sebelumnya terpenuhi.",
  "keywords": [
    "meskipun",
    "walaupun",
    "temo",
    "kontras"
  ],
  "examples": [
    {
      "japanese": "雨が降っても、行きます。",
      "reading": "あめが ふっても いきます。",
      "meaning": "Walaupun hujan, saya akan pergi.",
      "highlight": [
        "ても"
      ]
    },
    {
      "japanese": "高くても、このかばんを買いたいです。",
      "reading": "たかくても この かばんを かいたいです。",
      "meaning": "Walaupun mahal, saya ingin membeli tas ini.",
      "highlight": [
        "くても"
      ]
    },
    {
      "japanese": "忙しくても、毎日日本語を勉強します。",
      "reading": "いそがしくても まいにち にほんごを べんきょうします。",
      "meaning": "Walaupun sibuk, saya belajar bahasa Jepang setiap hari.",
      "highlight": [
        "くても"
      ]
    },
    {
      "japanese": "日曜日でも、会社へ行くことがあります。",
      "reading": "にちようびでも かいしゃへ いくことが あります。",
      "meaning": "Walaupun hari Minggu, kadang saya pergi ke kantor.",
      "highlight": [
        "でも"
      ]
    },
    {
      "japanese": "少し遠くても、歩きます。",
      "reading": "すこし とおくても あるきます。",
      "meaning": "Walaupun agak jauh, saya akan berjalan.",
      "highlight": [
        "くても"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch25-tara",
    "ch33-noni"
  ]
},
{
  "id": "ch25-nara",
  "chapter": 25,
  "order": 3,
  "pattern": "～なら",
  "meaning": "kalau memang ... / jika soal ...",
  "jlptLevel": "N4",
  "formula": "KB / KS-na + なら ／ bentuk biasa + なら",
  "explanation": "～なら sering digunakan ketika kondisi berasal dari informasi, topik, atau asumsi yang sudah muncul dalam percakapan.",
  "keywords": [
    "jika",
    "nara",
    "kondisi",
    "jika soal"
  ],
  "examples": [
    {
      "japanese": "日本へ行くなら、春がおすすめです。",
      "reading": "にほんへ いくなら はるが おすすめです。",
      "meaning": "Kalau akan pergi ke Jepang, saya menyarankan musim semi.",
      "highlight": [
        "なら"
      ]
    },
    {
      "japanese": "車を買うなら、この店がいいです。",
      "reading": "くるまを かうなら この みせが いいです。",
      "meaning": "Kalau akan membeli mobil, toko ini bagus.",
      "highlight": [
        "なら"
      ]
    },
    {
      "japanese": "日曜日なら、時間があります。",
      "reading": "にちようびなら じかんが あります。",
      "meaning": "Kalau hari Minggu, saya ada waktu.",
      "highlight": [
        "なら"
      ]
    },
    {
      "japanese": "簡単な料理なら、作れます。",
      "reading": "かんたんな りょうりなら つくれます。",
      "meaning": "Kalau masakan sederhana, saya bisa membuatnya.",
      "highlight": [
        "なら"
      ]
    },
    {
      "japanese": "駅へ行くなら、このバスが便利です。",
      "reading": "えきへ いくなら この ばすが べんりです。",
      "meaning": "Kalau menuju stasiun, bus ini praktis.",
      "highlight": [
        "なら"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch25-tara",
    "ch25-ba"
  ]
},
{
  "id": "ch25-ba",
  "chapter": 25,
  "order": 4,
  "pattern": "～ば",
  "meaning": "jika / apabila ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk ば ／ KS-i: ～ければ ／ KS-na・KB: ～なら（ば）",
  "explanation": "～ば menyatakan syarat yang menghasilkan konsekuensi. Bentuk ini sering digunakan untuk hubungan logis, saran, atau kondisi umum.",
  "keywords": [
    "jika",
    "ba",
    "kondisional",
    "syarat"
  ],
  "examples": [
    {
      "japanese": "時間があれば、手伝います。",
      "reading": "じかんが あれば てつだいます。",
      "meaning": "Kalau ada waktu, saya akan membantu.",
      "highlight": [
        "あれば"
      ]
    },
    {
      "japanese": "安ければ、買います。",
      "reading": "やすければ かいます。",
      "meaning": "Kalau murah, saya akan membelinya.",
      "highlight": [
        "ければ"
      ]
    },
    {
      "japanese": "わからなければ、先生に聞いてください。",
      "reading": "わからなければ せんせいに きいてください。",
      "meaning": "Kalau tidak mengerti, tolong tanyakan kepada guru.",
      "highlight": [
        "なければ"
      ]
    },
    {
      "japanese": "天気がよければ、公園へ行きます。",
      "reading": "てんきが よければ こうえんへ いきます。",
      "meaning": "Kalau cuacanya bagus, saya akan pergi ke taman.",
      "highlight": [
        "よければ"
      ]
    },
    {
      "japanese": "もっと練習すれば、上手になります。",
      "reading": "もっと れんしゅうすれば じょうずに なります。",
      "meaning": "Kalau lebih banyak berlatih, akan menjadi lebih mahir.",
      "highlight": [
        "すれば"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch25-tara",
    "ch25-nara",
    "ch23-to-condition"
  ]
},
{
  "id": "ch26-ndesu",
  "chapter": 26,
  "order": 1,
  "pattern": "～んです／～のです",
  "meaning": "memberi penjelasan / latar belakang",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + んです（KB・KS-na: ～な + んです）",
  "explanation": "～んです digunakan untuk memberi atau meminta penjelasan, latar belakang, atau alasan dengan nuansa bahwa informasi tersebut relevan dengan situasi.",
  "keywords": [
    "penjelasan",
    "alasan",
    "ndesu",
    "nodesu",
    "latar belakang"
  ],
  "examples": [
    {
      "japanese": "今日は少し疲れているんです。",
      "reading": "きょうは すこし つかれているんです。",
      "meaning": "Hari ini saya agak lelah, soalnya.",
      "highlight": [
        "んです"
      ]
    },
    {
      "japanese": "明日試験があるんです。",
      "reading": "あした しけんが あるんです。",
      "meaning": "Besok ada ujian, soalnya.",
      "highlight": [
        "んです"
      ]
    },
    {
      "japanese": "日本語を勉強しているんです。",
      "reading": "にほんごを べんきょうしているんです。",
      "meaning": "Saya sedang belajar bahasa Jepang, soalnya.",
      "highlight": [
        "んです"
      ]
    },
    {
      "japanese": "この店はとても有名なんです。",
      "reading": "この みせは とても ゆうめいなんです。",
      "meaning": "Toko ini sangat terkenal, lho.",
      "highlight": [
        "なんです"
      ]
    },
    {
      "japanese": "どうして遅れたんですか。",
      "reading": "どうして おくれたんですか。",
      "meaning": "Kenapa Anda terlambat?",
      "highlight": [
        "んですか"
      ]
    }
  ],
  "notes": [
    "Untuk KB dan KS-na pada bentuk sekarang positif gunakan な sebelum んです: 学生なんです・静かなんです."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch28-node",
    "ch26-tara-iidesuka"
  ]
},
{
  "id": "ch26-teitadakemasenka",
  "chapter": 26,
  "order": 2,
  "pattern": "～ていただけませんか",
  "meaning": "bisakah Anda ...? (sangat sopan)",
  "jlptLevel": "N4",
  "formula": "KK bentuk て + いただけませんか",
  "explanation": "～ていただけませんか adalah pola permintaan yang lebih sopan daripada ～てください. Cocok ketika meminta bantuan dengan menjaga kesopanan.",
  "keywords": [
    "permintaan sopan",
    "te itadakemasenka",
    "bisakah",
    "tolong"
  ],
  "examples": [
    {
      "japanese": "もう一度説明していただけませんか。",
      "reading": "もう いちど せつめいしていただけませんか。",
      "meaning": "Bisakah Anda menjelaskan sekali lagi?",
      "highlight": [
        "ていただけませんか"
      ]
    },
    {
      "japanese": "少し待っていただけませんか。",
      "reading": "すこし まっていただけませんか。",
      "meaning": "Bisakah Anda menunggu sebentar?",
      "highlight": [
        "ていただけませんか"
      ]
    },
    {
      "japanese": "この漢字を読んでいただけませんか。",
      "reading": "この かんじを よんでいただけませんか。",
      "meaning": "Bisakah Anda membacakan Kanji ini?",
      "highlight": [
        "ていただけませんか"
      ]
    },
    {
      "japanese": "駅までの道を教えていただけませんか。",
      "reading": "えきまでの みちを おしえていただけませんか。",
      "meaning": "Bisakah Anda menunjukkan jalan ke stasiun?",
      "highlight": [
        "ていただけませんか"
      ]
    },
    {
      "japanese": "写真を撮っていただけませんか。",
      "reading": "しゃしんを とっていただけませんか。",
      "meaning": "Bisakah Anda mengambilkan foto?",
      "highlight": [
        "ていただけませんか"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch14-tekudasai",
    "ch24-tekudasaru"
  ]
},
{
  "id": "ch26-tara-iidesuka",
  "chapter": 26,
  "order": 3,
  "pattern": "～たらいいですか",
  "meaning": "sebaiknya bagaimana / apa yang harus dilakukan?",
  "jlptLevel": "N4",
  "formula": "KK bentuk た + らいいですか",
  "explanation": "～たらいいですか digunakan untuk meminta saran mengenai tindakan yang sebaiknya dilakukan.",
  "keywords": [
    "saran",
    "sebaiknya",
    "tara ii desu ka",
    "apa yang harus"
  ],
  "examples": [
    {
      "japanese": "駅へはどう行ったらいいですか。",
      "reading": "えきへは どう いったらいいですか。",
      "meaning": "Bagaimana sebaiknya saya pergi ke stasiun?",
      "highlight": [
        "たらいいですか"
      ]
    },
    {
      "japanese": "この薬はいつ飲んだらいいですか。",
      "reading": "この くすりは いつ のんだらいいですか。",
      "meaning": "Kapan sebaiknya saya minum obat ini?",
      "highlight": [
        "たらいいですか"
      ]
    },
    {
      "japanese": "日本語が上手になるにはどうしたらいいですか。",
      "reading": "にほんごが じょうずに なるには どうしたらいいですか。",
      "meaning": "Apa yang sebaiknya dilakukan agar mahir bahasa Jepang?",
      "highlight": [
        "たらいいですか"
      ]
    },
    {
      "japanese": "申込書はどこに出したらいいですか。",
      "reading": "もうしこみしょは どこに だしたらいいですか。",
      "meaning": "Ke mana sebaiknya formulir pendaftaran diserahkan?",
      "highlight": [
        "たらいいですか"
      ]
    },
    {
      "japanese": "道に迷ったら、誰に聞いたらいいですか。",
      "reading": "みちに まよったら だれに きいたらいいですか。",
      "meaning": "Jika tersesat, kepada siapa sebaiknya saya bertanya?",
      "highlight": [
        "たらいいですか"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch31-houga-ii",
    "ch25-tara"
  ]
},
{
  "id": "ch26-doushite-ndesu",
  "chapter": 26,
  "order": 4,
  "pattern": "どうして～んですか",
  "meaning": "mengapa ...? (meminta penjelasan)",
  "jlptLevel": "N4",
  "formula": "どうして + bentuk biasa + んですか",
  "explanation": "Pola ini meminta alasan atau latar belakang dengan nuansa penjelasan yang lebih natural daripada pertanyaan sebab yang sangat langsung.",
  "keywords": [
    "mengapa",
    "kenapa",
    "penjelasan",
    "doushite",
    "ndesu"
  ],
  "examples": [
    {
      "japanese": "どうして日本語を勉強しているんですか。",
      "reading": "どうして にほんごを べんきょうしているんですか。",
      "meaning": "Mengapa Anda belajar bahasa Jepang?",
      "highlight": [
        "どうして",
        "んですか"
      ]
    },
    {
      "japanese": "どうして会社を休んだんですか。",
      "reading": "どうして かいしゃを やすんだんですか。",
      "meaning": "Mengapa Anda tidak masuk kerja?",
      "highlight": [
        "どうして",
        "んですか"
      ]
    },
    {
      "japanese": "どうしてこの町に住んでいるんですか。",
      "reading": "どうして この まちに すんでいるんですか。",
      "meaning": "Mengapa Anda tinggal di kota ini?",
      "highlight": [
        "どうして",
        "んですか"
      ]
    },
    {
      "japanese": "どうしてそんなに急いでいるんですか。",
      "reading": "どうして そんなに いそいでいるんですか。",
      "meaning": "Mengapa Anda terburu-buru seperti itu?",
      "highlight": [
        "どうして",
        "んですか"
      ]
    },
    {
      "japanese": "どうしてその仕事を選んだんですか。",
      "reading": "どうして その しごとを えらんだんですか。",
      "meaning": "Mengapa Anda memilih pekerjaan itu?",
      "highlight": [
        "どうして",
        "んですか"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch26-ndesu",
    "ch9-reason-kara"
  ]
},
{
  "id": "ch27-potential",
  "chapter": 27,
  "order": 1,
  "pattern": "可能形（bentuk potensial）",
  "meaning": "bisa melakukan ...",
  "jlptLevel": "N4",
  "formula": "KK kelompok 1: u→e + る; kelompok 2: る→られる; する→できる; 来る→こられる",
  "explanation": "Bentuk potensial menyatakan kemampuan atau kemungkinan melakukan suatu tindakan. Objek sering ditandai が, walaupun を juga dapat muncul dalam pemakaian modern.",
  "keywords": [
    "bentuk potensial",
    "bisa",
    "kemampuan",
    "kanoukei"
  ],
  "examples": [
    {
      "japanese": "私は日本語が話せます。",
      "reading": "わたしは にほんごが はなせます。",
      "meaning": "Saya bisa berbicara bahasa Jepang.",
      "highlight": [
        "話せます"
      ]
    },
    {
      "japanese": "この魚は生で食べられます。",
      "reading": "この さかなは なまで たべられます。",
      "meaning": "Ikan ini bisa dimakan mentah.",
      "highlight": [
        "食べられます"
      ]
    },
    {
      "japanese": "明日は早く来られます。",
      "reading": "あしたは はやく こられます。",
      "meaning": "Besok saya bisa datang lebih awal.",
      "highlight": [
        "来られます"
      ]
    },
    {
      "japanese": "一人でできます。",
      "reading": "ひとりで できます。",
      "meaning": "Saya bisa melakukannya sendiri.",
      "highlight": [
        "できます"
      ]
    },
    {
      "japanese": "ここから富士山が見られます。",
      "reading": "ここから ふじさんが みられます。",
      "meaning": "Dari sini Gunung Fuji bisa dilihat.",
      "highlight": [
        "見られます"
      ]
    }
  ],
  "notes": [
    "Bentuk potensial 食べられる juga sama bentuknya dengan pasif untuk verba kelompok 2; konteks menentukan makna."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch18-koto-ga-dekiru",
    "ch27-mieru-kikoeru"
  ]
},
{
  "id": "ch27-mieru-kikoeru",
  "chapter": 27,
  "order": 2,
  "pattern": "見えます／聞こえます",
  "meaning": "terlihat / terdengar secara alami",
  "jlptLevel": "N4",
  "formula": "KB + が + 見えます／聞こえます",
  "explanation": "見えます dan 聞こえます menyatakan sesuatu dapat terlihat atau terdengar secara alami, bukan kemampuan sengaja untuk melihat/mendengar.",
  "keywords": [
    "terlihat",
    "terdengar",
    "mieru",
    "kikoeru",
    "persepsi"
  ],
  "examples": [
    {
      "japanese": "窓から海が見えます。",
      "reading": "まどから うみが みえます。",
      "meaning": "Laut terlihat dari jendela.",
      "highlight": [
        "が見えます"
      ]
    },
    {
      "japanese": "ここから富士山が見えます。",
      "reading": "ここから ふじさんが みえます。",
      "meaning": "Gunung Fuji terlihat dari sini.",
      "highlight": [
        "が見えます"
      ]
    },
    {
      "japanese": "隣の部屋から音楽が聞こえます。",
      "reading": "となりの へやから おんがくが きこえます。",
      "meaning": "Musik terdengar dari kamar sebelah.",
      "highlight": [
        "が聞こえます"
      ]
    },
    {
      "japanese": "鳥の声が聞こえます。",
      "reading": "とりの こえが きこえます。",
      "meaning": "Suara burung terdengar.",
      "highlight": [
        "が聞こえます"
      ]
    },
    {
      "japanese": "暗くて何も見えません。",
      "reading": "くらくて なにも みえません。",
      "meaning": "Karena gelap, tidak terlihat apa-apa.",
      "highlight": [
        "見えません"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch27-potential"
  ]
},
{
  "id": "ch27-shika-nai",
  "chapter": 27,
  "order": 3,
  "pattern": "～しか～ない",
  "meaning": "hanya ... saja (dan tidak ada selain itu)",
  "jlptLevel": "N4",
  "formula": "KB / jumlah + しか + bentuk negatif",
  "explanation": "しか selalu dipakai bersama predikat negatif untuk menekankan bahwa jumlah atau pilihan terbatas hanya pada hal tersebut.",
  "keywords": [
    "hanya",
    "shika nai",
    "batasan",
    "cuma"
  ],
  "examples": [
    {
      "japanese": "財布に千円しかありません。",
      "reading": "さいふに せんえんしか ありません。",
      "meaning": "Di dompet hanya ada seribu yen.",
      "highlight": [
        "しか",
        "ありません"
      ]
    },
    {
      "japanese": "今日は一時間しか勉強できません。",
      "reading": "きょうは いちじかんしか べんきょうできません。",
      "meaning": "Hari ini saya hanya bisa belajar satu jam.",
      "highlight": [
        "しか",
        "できません"
      ]
    },
    {
      "japanese": "この店には三つしかありません。",
      "reading": "この みせには みっつしか ありません。",
      "meaning": "Di toko ini hanya ada tiga.",
      "highlight": [
        "しか",
        "ありません"
      ]
    },
    {
      "japanese": "日本語しか話せません。",
      "reading": "にほんごしか はなせません。",
      "meaning": "Saya hanya bisa berbicara bahasa Jepang.",
      "highlight": [
        "しか",
        "話せません"
      ]
    },
    {
      "japanese": "休みは日曜日しかありません。",
      "reading": "やすみは にちようびしか ありません。",
      "meaning": "Libur saya hanya hari Minggu.",
      "highlight": [
        "しか",
        "ありません"
      ]
    }
  ],
  "notes": [
    "Berbeda dengan だけ, しか mengharuskan predikat negatif."
  ],
  "commonMistakes": [
    {
      "wrong": "千円しかあります。",
      "correct": "千円しかありません。",
      "explanation": "しか dipasangkan dengan bentuk negatif."
    }
  ],
  "relatedPatterns": [
    "ch27-dake"
  ]
},
{
  "id": "ch27-dake",
  "chapter": 27,
  "order": 4,
  "pattern": "～だけ",
  "meaning": "hanya ...",
  "jlptLevel": "N4",
  "formula": "KB / klausa + だけ",
  "explanation": "だけ membatasi arti pada sesuatu atau jumlah tertentu. Berbeda dari しか, だけ tidak mewajibkan predikat negatif.",
  "keywords": [
    "hanya",
    "dake",
    "batasan"
  ],
  "examples": [
    {
      "japanese": "水だけ飲みます。",
      "reading": "みずだけ のみます。",
      "meaning": "Saya hanya minum air.",
      "highlight": [
        "だけ"
      ]
    },
    {
      "japanese": "今日は一時間だけ勉強します。",
      "reading": "きょうは いちじかんだけ べんきょうします。",
      "meaning": "Hari ini saya hanya belajar satu jam.",
      "highlight": [
        "だけ"
      ]
    },
    {
      "japanese": "この本だけ買いました。",
      "reading": "この ほんだけ かいました。",
      "meaning": "Saya hanya membeli buku ini.",
      "highlight": [
        "だけ"
      ]
    },
    {
      "japanese": "日曜日だけ休みです。",
      "reading": "にちようびだけ やすみです。",
      "meaning": "Saya libur hanya hari Minggu.",
      "highlight": [
        "だけ"
      ]
    },
    {
      "japanese": "必要な物だけ持って来てください。",
      "reading": "ひつような ものだけ もってきてください。",
      "meaning": "Tolong bawa hanya barang yang diperlukan.",
      "highlight": [
        "だけ"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch27-shika-nai"
  ]
},
{
  "id": "ch28-nagara",
  "chapter": 28,
  "order": 1,
  "pattern": "～ながら",
  "meaning": "sambil melakukan ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk ます tanpa ます + ながら + KK utama",
  "explanation": "～ながら menyatakan dua kegiatan dilakukan oleh subjek yang sama pada waktu bersamaan. Tindakan utama biasanya berada di akhir kalimat.",
  "keywords": [
    "sambil",
    "nagara",
    "bersamaan",
    "simultan"
  ],
  "examples": [
    {
      "japanese": "音楽を聞きながら勉強します。",
      "reading": "おんがくを ききながら べんきょうします。",
      "meaning": "Saya belajar sambil mendengarkan musik.",
      "highlight": [
        "ながら"
      ]
    },
    {
      "japanese": "朝ご飯を食べながらニュースを見ます。",
      "reading": "あさごはんを たべながら にゅーすを みます。",
      "meaning": "Saya menonton berita sambil sarapan.",
      "highlight": [
        "ながら"
      ]
    },
    {
      "japanese": "歩きながら電話をしないでください。",
      "reading": "あるきながら でんわを しないでください。",
      "meaning": "Tolong jangan menelepon sambil berjalan.",
      "highlight": [
        "ながら"
      ]
    },
    {
      "japanese": "コーヒーを飲みながら友達と話しました。",
      "reading": "こーひーを のみながら ともだちと はなしました。",
      "meaning": "Saya berbicara dengan teman sambil minum kopi.",
      "highlight": [
        "ながら"
      ]
    },
    {
      "japanese": "働きながら日本語を勉強しています。",
      "reading": "はたらきながら にほんごを べんきょうしています。",
      "meaning": "Saya belajar bahasa Jepang sambil bekerja.",
      "highlight": [
        "ながら"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch16-te-sequence",
    "ch28-shi"
  ]
},
{
  "id": "ch28-shi",
  "chapter": 28,
  "order": 2,
  "pattern": "～し、～し",
  "meaning": "... dan ...; selain itu ...",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + し、bentuk biasa + し",
  "explanation": "～し digunakan untuk menyebut beberapa alasan atau sifat secara paralel. Sering dipakai ketika alasan tidak hanya satu.",
  "keywords": [
    "dan juga",
    "beberapa alasan",
    "shi",
    "selain itu"
  ],
  "examples": [
    {
      "japanese": "この町は静かだし、便利だし、住みやすいです。",
      "reading": "この まちは しずかだし べんりだし すみやすいです。",
      "meaning": "Kota ini tenang, praktis, dan nyaman ditinggali.",
      "highlight": [
        "し"
      ]
    },
    {
      "japanese": "田中さんは親切だし、日本語も上手です。",
      "reading": "たなかさんは しんせつだし にほんごも じょうずです。",
      "meaning": "Tanaka baik hati dan juga pandai bahasa Jepang.",
      "highlight": [
        "し"
      ]
    },
    {
      "japanese": "この店は安いし、おいしいし、よく来ます。",
      "reading": "この みせは やすいし おいしいし よく きます。",
      "meaning": "Toko ini murah dan enak, jadi saya sering datang.",
      "highlight": [
        "し"
      ]
    },
    {
      "japanese": "駅から近いし、部屋も広いです。",
      "reading": "えきから ちかいし へやも ひろいです。",
      "meaning": "Dekat dari stasiun dan kamarnya juga luas.",
      "highlight": [
        "し"
      ]
    },
    {
      "japanese": "今日は雨だし、寒いし、家にいます。",
      "reading": "きょうは あめだし さむいし いえに います。",
      "meaning": "Hari ini hujan dan dingin, jadi saya di rumah.",
      "highlight": [
        "し"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch28-node",
    "ch9-reason-kara"
  ]
},
{
  "id": "ch28-node",
  "chapter": 28,
  "order": 3,
  "pattern": "～ので",
  "meaning": "karena ...",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + ので（KB・KS-na: ～な + ので）",
  "explanation": "～ので menyatakan sebab/alasan dengan nuansa yang umumnya lebih lembut dan objektif dibanding から.",
  "keywords": [
    "karena",
    "node",
    "alasan",
    "sebab"
  ],
  "examples": [
    {
      "japanese": "雨が降っているので、出かけません。",
      "reading": "あめが ふっているので でかけません。",
      "meaning": "Karena sedang hujan, saya tidak keluar.",
      "highlight": [
        "ので"
      ]
    },
    {
      "japanese": "明日は試験なので、今晩勉強します。",
      "reading": "あしたは しけんなので こんばん べんきょうします。",
      "meaning": "Karena besok ujian, malam ini saya belajar.",
      "highlight": [
        "なので"
      ]
    },
    {
      "japanese": "電車が遅れたので、遅刻しました。",
      "reading": "でんしゃが おくれたので ちこくしました。",
      "meaning": "Karena kereta terlambat, saya ikut terlambat.",
      "highlight": [
        "ので"
      ]
    },
    {
      "japanese": "この町は静かなので、好きです。",
      "reading": "この まちは しずかなので すきです。",
      "meaning": "Karena kota ini tenang, saya menyukainya.",
      "highlight": [
        "なので"
      ]
    },
    {
      "japanese": "風邪をひいたので、会社を休みました。",
      "reading": "かぜを ひいたので かいしゃを やすみました。",
      "meaning": "Karena masuk angin/sakit, saya tidak masuk kerja.",
      "highlight": [
        "ので"
      ]
    }
  ],
  "notes": [
    "Untuk KB dan KS-na sekarang positif gunakan な: 学生なので・静かなので."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch9-reason-kara",
    "ch28-shi"
  ]
},
{
  "id": "ch28-tameni",
  "chapter": 28,
  "order": 4,
  "pattern": "～ために（tujuan）",
  "meaning": "untuk / demi ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk kamus + ために ／ KB + の + ために",
  "explanation": "～ために dapat menyatakan tujuan yang ingin dicapai melalui tindakan yang dilakukan dengan sengaja.",
  "keywords": [
    "untuk",
    "demi",
    "tujuan",
    "tame ni"
  ],
  "examples": [
    {
      "japanese": "日本で働くために、日本語を勉強しています。",
      "reading": "にほんで はたらくために にほんごを べんきょうしています。",
      "meaning": "Saya belajar bahasa Jepang untuk bekerja di Jepang.",
      "highlight": [
        "ために"
      ]
    },
    {
      "japanese": "健康のために、毎朝歩いています。",
      "reading": "けんこうの ために まいあさ あるいています。",
      "meaning": "Demi kesehatan, saya berjalan setiap pagi.",
      "highlight": [
        "ために"
      ]
    },
    {
      "japanese": "試験に合格するために、毎日勉強します。",
      "reading": "しけんに ごうかくするために まいにち べんきょうします。",
      "meaning": "Saya belajar setiap hari untuk lulus ujian.",
      "highlight": [
        "ために"
      ]
    },
    {
      "japanese": "家を買うために、お金を貯めています。",
      "reading": "いえを かうために おかねを ためています。",
      "meaning": "Saya menabung uang untuk membeli rumah.",
      "highlight": [
        "ために"
      ]
    },
    {
      "japanese": "家族のために、一生懸命働いています。",
      "reading": "かぞくの ために いっしょうけんめい はたらいています。",
      "meaning": "Saya bekerja keras demi keluarga.",
      "highlight": [
        "ために"
      ]
    }
  ],
  "notes": [
    "Untuk tujuan yang berhubungan dengan kemampuan/perubahan tidak selalu memakai ために; pola ～ように juga penting dan dipelajari pada Bab 30."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch13-purpose-ni",
    "ch30-you-ni-naru",
    "ch30-you-ni-suru"
  ]
},
{
  "id": "ch29-teiru-result",
  "chapter": 29,
  "order": 1,
  "pattern": "～ています（keadaan hasil）",
  "meaning": "berada dalam keadaan hasil dari suatu perubahan",
  "jlptLevel": "N4",
  "formula": "KK intransitif bentuk て + います",
  "explanation": "Dengan kata kerja tertentu, ～ています menyatakan keadaan yang merupakan hasil dari perubahan yang sudah terjadi, bukan aktivitas yang sedang berlangsung.",
  "keywords": [
    "keadaan hasil",
    "te iru",
    "result state",
    "intransitif"
  ],
  "examples": [
    {
      "japanese": "窓が開いています。",
      "reading": "まどが あいています。",
      "meaning": "Jendelanya dalam keadaan terbuka.",
      "highlight": [
        "ています"
      ]
    },
    {
      "japanese": "電気がついています。",
      "reading": "でんきが ついています。",
      "meaning": "Lampunya menyala.",
      "highlight": [
        "ています"
      ]
    },
    {
      "japanese": "ドアが閉まっています。",
      "reading": "どあが しまっています。",
      "meaning": "Pintunya tertutup.",
      "highlight": [
        "っています"
      ]
    },
    {
      "japanese": "車が止まっています。",
      "reading": "くるまが とまっています。",
      "meaning": "Mobilnya sedang dalam keadaan berhenti/terparkir.",
      "highlight": [
        "っています"
      ]
    },
    {
      "japanese": "この時計は壊れています。",
      "reading": "この とけいは こわれています。",
      "meaning": "Jam ini rusak.",
      "highlight": [
        "ています"
      ]
    }
  ],
  "notes": [
    "Bedakan dengan ～てあります yang menekankan keadaan hasil dari tindakan sengaja seseorang."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch14-teiru-progress",
    "ch15-teiru-state",
    "ch29-tearu"
  ]
},
{
  "id": "ch29-teshimau",
  "chapter": 29,
  "order": 2,
  "pattern": "～てしまいます",
  "meaning": "selesai sepenuhnya / terlanjur ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk て + しまいます",
  "explanation": "～てしまいます dapat menyatakan suatu tindakan selesai sepenuhnya atau menyatakan penyesalan karena sesuatu terjadi tanpa diinginkan.",
  "keywords": [
    "selesai",
    "terlanjur",
    "penyesalan",
    "te shimau"
  ],
  "examples": [
    {
      "japanese": "宿題を全部してしまいました。",
      "reading": "しゅくだいを ぜんぶ してしまいました。",
      "meaning": "Saya sudah menyelesaikan seluruh PR.",
      "highlight": [
        "てしまいました"
      ]
    },
    {
      "japanese": "財布をなくしてしまいました。",
      "reading": "さいふを なくしてしまいました。",
      "meaning": "Saya terlanjur kehilangan dompet.",
      "highlight": [
        "てしまいました"
      ]
    },
    {
      "japanese": "ケーキを全部食べてしまいました。",
      "reading": "けーきを ぜんぶ たべてしまいました。",
      "meaning": "Saya menghabiskan seluruh kue.",
      "highlight": [
        "てしまいました"
      ]
    },
    {
      "japanese": "電車の中で寝てしまいました。",
      "reading": "でんしゃの なかで ねてしまいました。",
      "meaning": "Saya tidak sengaja tertidur di kereta.",
      "highlight": [
        "てしまいました"
      ]
    },
    {
      "japanese": "大切なファイルを消してしまいました。",
      "reading": "たいせつな ふぁいるを けしてしまいました。",
      "meaning": "Saya tidak sengaja menghapus file penting.",
      "highlight": [
        "てしまいました"
      ]
    }
  ],
  "notes": [
    "Dalam percakapan, ～てしまう sering memendek menjadi ～ちゃう／～じゃう, tetapi bentuk tersebut belum menjadi fokus bab ini."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch29-teoku",
    "ch29-tearu"
  ]
},
{
  "id": "ch29-tearu",
  "chapter": 29,
  "order": 3,
  "pattern": "～てあります",
  "meaning": "sudah dilakukan dan keadaannya dipertahankan",
  "jlptLevel": "N4",
  "formula": "KB + が + KK transitif bentuk て + あります",
  "explanation": "～てあります menyatakan keadaan yang sengaja dibuat oleh seseorang sebagai hasil suatu tindakan, biasanya untuk suatu tujuan.",
  "keywords": [
    "keadaan hasil",
    "sengaja",
    "te aru",
    "persiapan"
  ],
  "examples": [
    {
      "japanese": "机の上に資料が置いてあります。",
      "reading": "つくえの うえに しりょうが おいてあります。",
      "meaning": "Materi sudah diletakkan di atas meja.",
      "highlight": [
        "てあります"
      ]
    },
    {
      "japanese": "部屋に花が飾ってあります。",
      "reading": "へやに はなが かざってあります。",
      "meaning": "Bunga sudah dipajang di kamar.",
      "highlight": [
        "てあります"
      ]
    },
    {
      "japanese": "ホテルはもう予約してあります。",
      "reading": "ほてるは もう よやくしてあります。",
      "meaning": "Hotel sudah dipesan sebelumnya.",
      "highlight": [
        "てあります"
      ]
    },
    {
      "japanese": "名前が紙に書いてあります。",
      "reading": "なまえが かみに かいてあります。",
      "meaning": "Nama sudah tertulis di kertas.",
      "highlight": [
        "てあります"
      ]
    },
    {
      "japanese": "会議室に椅子が並べてあります。",
      "reading": "かいぎしつに いすが ならべてあります。",
      "meaning": "Kursi sudah disusun di ruang rapat.",
      "highlight": [
        "てあります"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch29-teiru-result",
    "ch29-teoku"
  ]
},
{
  "id": "ch29-teoku",
  "chapter": 29,
  "order": 4,
  "pattern": "～ておきます",
  "meaning": "melakukan ... sebelumnya sebagai persiapan",
  "jlptLevel": "N4",
  "formula": "KK bentuk て + おきます",
  "explanation": "～ておきます digunakan untuk melakukan sesuatu lebih dulu sebagai persiapan atau membiarkan suatu keadaan tetap seperti sekarang.",
  "keywords": [
    "persiapan",
    "te oku",
    "sebelumnya",
    "biarkan"
  ],
  "examples": [
    {
      "japanese": "旅行の前にホテルを予約しておきます。",
      "reading": "りょこうの まえに ほてるを よやくしておきます。",
      "meaning": "Saya akan memesan hotel lebih dulu sebelum perjalanan.",
      "highlight": [
        "ておきます"
      ]
    },
    {
      "japanese": "明日の会議の資料を読んでおきます。",
      "reading": "あしたの かいぎの しりょうを よんでおきます。",
      "meaning": "Saya akan membaca materi rapat besok terlebih dahulu.",
      "highlight": [
        "ておきます"
      ]
    },
    {
      "japanese": "冷蔵庫に飲み物を入れておきます。",
      "reading": "れいぞうこに のみものを いれておきます。",
      "meaning": "Saya akan memasukkan minuman ke kulkas sebagai persiapan.",
      "highlight": [
        "ておきます"
      ]
    },
    {
      "japanese": "窓は開けておいてください。",
      "reading": "まどは あけておいてください。",
      "meaning": "Tolong biarkan jendelanya tetap terbuka.",
      "highlight": [
        "ておいて"
      ]
    },
    {
      "japanese": "必要な言葉をメモしておきました。",
      "reading": "ひつような ことばを めもしておきました。",
      "meaning": "Saya sudah mencatat kata-kata penting sebelumnya.",
      "highlight": [
        "ておきました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch29-tearu",
    "ch29-teshimau"
  ]
},
{
  "id": "ch30-volitional",
  "chapter": 30,
  "order": 1,
  "pattern": "意向形（bentuk volisional）",
  "meaning": "ayo / akan ... (bentuk biasa)",
  "jlptLevel": "N4",
  "formula": "KK kelompok 1: u→o + う; kelompok 2: る→よう; する→しよう; 来る→こよう",
  "explanation": "Bentuk volisional digunakan untuk ajakan informal atau sebagai dasar untuk menyatakan niat.",
  "keywords": [
    "volisional",
    "ikoukei",
    "ayo",
    "niat"
  ],
  "examples": [
    {
      "japanese": "一緒に帰ろう。",
      "reading": "いっしょに かえろう。",
      "meaning": "Ayo pulang bersama.",
      "highlight": [
        "帰ろう"
      ]
    },
    {
      "japanese": "少し休もう。",
      "reading": "すこし やすもう。",
      "meaning": "Ayo istirahat sebentar.",
      "highlight": [
        "休もう"
      ]
    },
    {
      "japanese": "明日は早く起きよう。",
      "reading": "あしたは はやく おきよう。",
      "meaning": "Besok saya akan berusaha bangun pagi.",
      "highlight": [
        "起きよう"
      ]
    },
    {
      "japanese": "週末に映画を見よう。",
      "reading": "しゅうまつに えいがを みよう。",
      "meaning": "Ayo menonton film akhir pekan ini.",
      "highlight": [
        "見よう"
      ]
    },
    {
      "japanese": "この問題を一緒に考えよう。",
      "reading": "この もんだいを いっしょに かんがえよう。",
      "meaning": "Ayo memikirkan soal ini bersama.",
      "highlight": [
        "考えよう"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch30-volitional-toomou",
    "ch6-mashou"
  ]
},
{
  "id": "ch30-volitional-toomou",
  "chapter": 30,
  "order": 2,
  "pattern": "～ようと思います",
  "meaning": "berniat / berpikir akan ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk volisional + と思います",
  "explanation": "Pola ini menyatakan niat yang baru diputuskan atau pikiran pembicara untuk melakukan suatu tindakan.",
  "keywords": [
    "niat",
    "akan",
    "you to omou",
    "volisional"
  ],
  "examples": [
    {
      "japanese": "来年日本へ行こうと思います。",
      "reading": "らいねん にほんへ いこうと おもいます。",
      "meaning": "Saya berniat pergi ke Jepang tahun depan.",
      "highlight": [
        "ようと思います"
      ]
    },
    {
      "japanese": "今日は早く寝ようと思います。",
      "reading": "きょうは はやく ねようと おもいます。",
      "meaning": "Hari ini saya berniat tidur lebih awal.",
      "highlight": [
        "ようと思います"
      ]
    },
    {
      "japanese": "週末は部屋を掃除しようと思います。",
      "reading": "しゅうまつは へやを そうじしようと おもいます。",
      "meaning": "Akhir pekan saya berniat membersihkan kamar.",
      "highlight": [
        "ようと思います"
      ]
    },
    {
      "japanese": "新しい仕事を探そうと思います。",
      "reading": "あたらしい しごとを さがそうと おもいます。",
      "meaning": "Saya berniat mencari pekerjaan baru.",
      "highlight": [
        "ようと思います"
      ]
    },
    {
      "japanese": "毎日運動しようと思います。",
      "reading": "まいにち うんどうしようと おもいます。",
      "meaning": "Saya berniat berolahraga setiap hari.",
      "highlight": [
        "ようと思います"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch30-volitional",
    "ch30-tsumori"
  ]
},
{
  "id": "ch30-tsumori",
  "chapter": 30,
  "order": 3,
  "pattern": "～つもりです",
  "meaning": "bermaksud / berniat ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk kamus / ない + つもりです",
  "explanation": "～つもりです menyatakan niat atau rencana pribadi yang relatif jelas.",
  "keywords": [
    "berniat",
    "rencana",
    "tsumori",
    "intention"
  ],
  "examples": [
    {
      "japanese": "来年日本へ留学するつもりです。",
      "reading": "らいねん にほんへ りゅうがくするつもりです。",
      "meaning": "Saya berniat belajar di Jepang tahun depan.",
      "highlight": [
        "つもりです"
      ]
    },
    {
      "japanese": "今週は車を使わないつもりです。",
      "reading": "こんしゅうは くるまを つかわないつもりです。",
      "meaning": "Minggu ini saya berniat tidak memakai mobil.",
      "highlight": [
        "つもりです"
      ]
    },
    {
      "japanese": "卒業したら働くつもりです。",
      "reading": "そつぎょうしたら はたらくつもりです。",
      "meaning": "Setelah lulus, saya berniat bekerja.",
      "highlight": [
        "つもりです"
      ]
    },
    {
      "japanese": "夏休みに国へ帰るつもりです。",
      "reading": "なつやすみに くにへ かえるつもりです。",
      "meaning": "Saat libur musim panas saya berniat pulang ke negara asal.",
      "highlight": [
        "つもりです"
      ]
    },
    {
      "japanese": "この仕事を続けるつもりです。",
      "reading": "この しごとを つづけるつもりです。",
      "meaning": "Saya berniat melanjutkan pekerjaan ini.",
      "highlight": [
        "つもりです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch30-yotei",
    "ch30-volitional-toomou"
  ]
},
{
  "id": "ch30-yotei",
  "chapter": 30,
  "order": 4,
  "pattern": "～予定です",
  "meaning": "dijadwalkan / direncanakan ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk kamus + 予定です ／ KB + の + 予定です",
  "explanation": "～予定です menyatakan rencana atau jadwal yang relatif sudah ditetapkan.",
  "keywords": [
    "jadwal",
    "rencana",
    "yotei",
    "planned"
  ],
  "examples": [
    {
      "japanese": "来月大阪へ出張する予定です。",
      "reading": "らいげつ おおさかへ しゅっちょうする よていです。",
      "meaning": "Bulan depan saya dijadwalkan dinas ke Osaka.",
      "highlight": [
        "予定です"
      ]
    },
    {
      "japanese": "会議は三時に始まる予定です。",
      "reading": "かいぎは さんじに はじまる よていです。",
      "meaning": "Rapat dijadwalkan mulai pukul tiga.",
      "highlight": [
        "予定です"
      ]
    },
    {
      "japanese": "来年結婚する予定です。",
      "reading": "らいねん けっこんする よていです。",
      "meaning": "Saya berencana menikah tahun depan.",
      "highlight": [
        "予定です"
      ]
    },
    {
      "japanese": "飛行機は午後六時に着く予定です。",
      "reading": "ひこうきは ごご ろくじに つく よていです。",
      "meaning": "Pesawat dijadwalkan tiba pukul enam sore.",
      "highlight": [
        "予定です"
      ]
    },
    {
      "japanese": "日曜日は家族旅行の予定です。",
      "reading": "にちようびは かぞくりょこうの よていです。",
      "meaning": "Hari Minggu ada rencana perjalanan keluarga.",
      "highlight": [
        "予定です"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch30-tsumori",
    "ch31-koto-ni-suru"
  ]
},
{
  "id": "ch30-you-ni-naru",
  "chapter": 30,
  "order": 5,
  "pattern": "～ようになります",
  "meaning": "menjadi bisa / mulai terbiasa ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk kamus / ない + ようになります",
  "explanation": "～ようになります menyatakan perubahan bertahap pada kemampuan, kebiasaan, atau keadaan sehingga sesuatu menjadi terjadi atau tidak terjadi.",
  "keywords": [
    "menjadi bisa",
    "perubahan",
    "you ni naru",
    "kemampuan"
  ],
  "examples": [
    {
      "japanese": "日本語が話せるようになりました。",
      "reading": "にほんごが はなせるように なりました。",
      "meaning": "Saya menjadi bisa berbicara bahasa Jepang.",
      "highlight": [
        "ようになりました"
      ]
    },
    {
      "japanese": "毎朝早く起きるようになりました。",
      "reading": "まいあさ はやく おきるように なりました。",
      "meaning": "Saya mulai terbiasa bangun pagi setiap hari.",
      "highlight": [
        "ようになりました"
      ]
    },
    {
      "japanese": "辛い物も食べられるようになりました。",
      "reading": "からい ものも たべられるように なりました。",
      "meaning": "Saya menjadi bisa makan makanan pedas.",
      "highlight": [
        "ようになりました"
      ]
    },
    {
      "japanese": "最近あまりテレビを見ないようになりました。",
      "reading": "さいきん あまり てれびを みないように なりました。",
      "meaning": "Belakangan saya jadi tidak banyak menonton televisi.",
      "highlight": [
        "ようになりました"
      ]
    },
    {
      "japanese": "一人で料理できるようになりました。",
      "reading": "ひとりで りょうりできるように なりました。",
      "meaning": "Saya menjadi bisa memasak sendiri.",
      "highlight": [
        "ようになりました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch19-naru",
    "ch30-you-ni-suru"
  ]
},
{
  "id": "ch30-you-ni-suru",
  "chapter": 31,
  "order": 1,
  "pattern": "～ようにします",
  "meaning": "berusaha / membiasakan diri untuk ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk kamus / ない + ようにします",
  "explanation": "～ようにします menyatakan usaha sadar atau kebiasaan yang sengaja dilakukan agar suatu keadaan tercapai.",
  "keywords": [
    "berusaha",
    "membiasakan",
    "you ni suru",
    "kebiasaan"
  ],
  "examples": [
    {
      "japanese": "毎日日本語を話すようにしています。",
      "reading": "まいにち にほんごを はなすように しています。",
      "meaning": "Saya berusaha membiasakan berbicara bahasa Jepang setiap hari.",
      "highlight": [
        "ようにしています"
      ]
    },
    {
      "japanese": "夜はコーヒーを飲まないようにしています。",
      "reading": "よるは こーひーを のまないように しています。",
      "meaning": "Saya berusaha tidak minum kopi pada malam hari.",
      "highlight": [
        "ようにしています"
      ]
    },
    {
      "japanese": "忘れないようにメモします。",
      "reading": "わすれないように めもします。",
      "meaning": "Saya mencatat agar tidak lupa.",
      "highlight": [
        "ように"
      ]
    },
    {
      "japanese": "毎朝野菜を食べるようにしています。",
      "reading": "まいあさ やさいを たべるように しています。",
      "meaning": "Saya membiasakan makan sayur setiap pagi.",
      "highlight": [
        "ようにしています"
      ]
    },
    {
      "japanese": "遅刻しないようにしてください。",
      "reading": "ちこくしないように してください。",
      "meaning": "Tolong usahakan agar tidak terlambat.",
      "highlight": [
        "ようにしてください"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch30-you-ni-naru",
    "ch31-houga-ii"
  ]
},
{
  "id": "ch31-houga-ii",
  "chapter": 31,
  "order": 2,
  "pattern": "～ほうがいいです",
  "meaning": "sebaiknya ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk た + ほうがいいです ／ KK bentuk ない + ほうがいいです",
  "explanation": "～ほうがいいです memberikan saran. Bentuk lampau biasa sering dipakai untuk saran positif, sedangkan bentuk ない untuk menyarankan agar tidak melakukan sesuatu.",
  "keywords": [
    "sebaiknya",
    "saran",
    "hou ga ii"
  ],
  "examples": [
    {
      "japanese": "疲れているなら、早く寝たほうがいいです。",
      "reading": "つかれているなら はやく ねたほうが いいです。",
      "meaning": "Kalau lelah, sebaiknya tidur lebih awal.",
      "highlight": [
        "たほうがいいです"
      ]
    },
    {
      "japanese": "毎日少しずつ勉強したほうがいいです。",
      "reading": "まいにち すこしずつ べんきょうしたほうが いいです。",
      "meaning": "Sebaiknya belajar sedikit demi sedikit setiap hari.",
      "highlight": [
        "たほうがいいです"
      ]
    },
    {
      "japanese": "熱があるなら、会社へ行かないほうがいいです。",
      "reading": "ねつが あるなら かいしゃへ いかないほうが いいです。",
      "meaning": "Kalau demam, sebaiknya tidak pergi ke kantor.",
      "highlight": [
        "ないほうがいいです"
      ]
    },
    {
      "japanese": "この道は夜一人で歩かないほうがいいです。",
      "reading": "この みちは よる ひとりで あるかないほうが いいです。",
      "meaning": "Sebaiknya jangan berjalan sendirian di jalan ini pada malam hari.",
      "highlight": [
        "ないほうがいいです"
      ]
    },
    {
      "japanese": "予約してから行ったほうがいいです。",
      "reading": "よやくしてから いったほうが いいです。",
      "meaning": "Sebaiknya pergi setelah melakukan reservasi.",
      "highlight": [
        "たほうがいいです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch26-tara-iidesuka",
    "ch17-nakereba"
  ]
},
{
  "id": "ch31-hazu",
  "chapter": 31,
  "order": 3,
  "pattern": "～はずです",
  "meaning": "seharusnya / semestinya ...",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + はずです（KB: ～のはず／KS-na: ～なはず）",
  "explanation": "～はずです menyatakan kesimpulan atau keyakinan logis berdasarkan informasi yang dimiliki pembicara.",
  "keywords": [
    "seharusnya",
    "semestinya",
    "hazu",
    "dugaan logis"
  ],
  "examples": [
    {
      "japanese": "田中さんはもう駅に着いているはずです。",
      "reading": "たなかさんは もう えきに ついているはずです。",
      "meaning": "Tanaka seharusnya sudah tiba di stasiun.",
      "highlight": [
        "はずです"
      ]
    },
    {
      "japanese": "この店は日曜日も開いているはずです。",
      "reading": "この みせは にちようびも あいているはずです。",
      "meaning": "Toko ini seharusnya buka juga hari Minggu.",
      "highlight": [
        "はずです"
      ]
    },
    {
      "japanese": "鍵はかばんの中にあるはずです。",
      "reading": "かぎは かばんの なかに あるはずです。",
      "meaning": "Kuncinya seharusnya ada di dalam tas.",
      "highlight": [
        "はずです"
      ]
    },
    {
      "japanese": "彼は日本に十年住んでいるから、日本語が上手なはずです。",
      "reading": "かれは にほんに じゅうねん すんでいるから にほんごが じょうずなはずです。",
      "meaning": "Karena dia sudah tinggal di Jepang sepuluh tahun, bahasa Jepangnya seharusnya mahir.",
      "highlight": [
        "なはずです"
      ]
    },
    {
      "japanese": "今日は祝日だから、銀行は休みのはずです。",
      "reading": "きょうは しゅくじつだから ぎんこうは やすみのはずです。",
      "meaning": "Karena hari ini hari libur, bank seharusnya tutup.",
      "highlight": [
        "のはずです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch21-deshou",
    "ch21-kamoshirenai"
  ]
},
{
  "id": "ch31-koto-ni-suru",
  "chapter": 31,
  "order": 4,
  "pattern": "～ことにします",
  "meaning": "memutuskan untuk ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk kamus / ない + ことにします",
  "explanation": "～ことにします menyatakan keputusan yang dibuat oleh pembicara atau pihak yang menjadi pelaku.",
  "keywords": [
    "memutuskan",
    "keputusan",
    "koto ni suru"
  ],
  "examples": [
    {
      "japanese": "来月から毎日運動することにします。",
      "reading": "らいげつから まいにち うんどうすることに します。",
      "meaning": "Saya memutuskan untuk berolahraga setiap hari mulai bulan depan.",
      "highlight": [
        "ことにします"
      ]
    },
    {
      "japanese": "今日は早く帰ることにします。",
      "reading": "きょうは はやく かえることに します。",
      "meaning": "Hari ini saya memutuskan pulang lebih awal.",
      "highlight": [
        "ことにします"
      ]
    },
    {
      "japanese": "車を買わないことにしました。",
      "reading": "くるまを かわないことに しました。",
      "meaning": "Saya memutuskan untuk tidak membeli mobil.",
      "highlight": [
        "ことにしました"
      ]
    },
    {
      "japanese": "週末は家で勉強することにしました。",
      "reading": "しゅうまつは いえで べんきょうすることに しました。",
      "meaning": "Saya memutuskan belajar di rumah akhir pekan ini.",
      "highlight": [
        "ことにしました"
      ]
    },
    {
      "japanese": "この仕事を続けることにします。",
      "reading": "この しごとを つづけることに します。",
      "meaning": "Saya memutuskan untuk melanjutkan pekerjaan ini.",
      "highlight": [
        "ことにします"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch31-koto-ni-naru",
    "ch30-tsumori"
  ]
},
{
  "id": "ch31-koto-ni-naru",
  "chapter": 31,
  "order": 5,
  "pattern": "～ことになります",
  "meaning": "diputuskan / menjadi ketentuan bahwa ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk kamus / ない + ことになります",
  "explanation": "～ことになります menyatakan keputusan atau ketentuan yang ditetapkan oleh keadaan, organisasi, atau pihak lain, bukan keputusan pribadi langsung.",
  "keywords": [
    "diputuskan",
    "ketentuan",
    "koto ni naru",
    "keputusan eksternal"
  ],
  "examples": [
    {
      "japanese": "来月大阪へ転勤することになりました。",
      "reading": "らいげつ おおさかへ てんきんすることに なりました。",
      "meaning": "Diputuskan bahwa bulan depan saya pindah tugas ke Osaka.",
      "highlight": [
        "ことになりました"
      ]
    },
    {
      "japanese": "会議はオンラインで行うことになりました。",
      "reading": "かいぎは おんらいんで おこなうことに なりました。",
      "meaning": "Diputuskan rapat akan dilaksanakan secara daring.",
      "highlight": [
        "ことになりました"
      ]
    },
    {
      "japanese": "来週から制服を着ることになりました。",
      "reading": "らいしゅうから せいふくを きることに なりました。",
      "meaning": "Mulai minggu depan ditetapkan harus memakai seragam.",
      "highlight": [
        "ことになりました"
      ]
    },
    {
      "japanese": "この部屋では食べないことになっています。",
      "reading": "この へやでは たべないことに なっています。",
      "meaning": "Di ruangan ini ada ketentuan untuk tidak makan.",
      "highlight": [
        "ことになっています"
      ]
    },
    {
      "japanese": "来年日本へ行くことになりました。",
      "reading": "らいねん にほんへ いくことに なりました。",
      "meaning": "Sudah diputuskan bahwa tahun depan saya akan pergi ke Jepang.",
      "highlight": [
        "ことになりました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch31-koto-ni-suru",
    "ch30-yotei"
  ]
},
{
  "id": "ch32-sou-hearsay",
  "chapter": 32,
  "order": 1,
  "pattern": "～そうです（katanya）",
  "meaning": "katanya / saya dengar ...",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + そうです",
  "explanation": "～そうです setelah bentuk biasa menyampaikan informasi yang didengar dari sumber lain. Pola ini tidak menyatakan penilaian dari penampilan.",
  "keywords": [
    "katanya",
    "hearsay",
    "sou desu",
    "dengar"
  ],
  "examples": [
    {
      "japanese": "天気予報によると、明日は雨が降るそうです。",
      "reading": "てんきよほうに よると あしたは あめが ふるそうです。",
      "meaning": "Menurut ramalan cuaca, katanya besok akan hujan.",
      "highlight": [
        "そうです"
      ]
    },
    {
      "japanese": "田中さんは来月結婚するそうです。",
      "reading": "たなかさんは らいげつ けっこんするそうです。",
      "meaning": "Katanya Tanaka akan menikah bulan depan.",
      "highlight": [
        "そうです"
      ]
    },
    {
      "japanese": "この店の料理はおいしいそうです。",
      "reading": "この みせの りょうりは おいしいそうです。",
      "meaning": "Katanya masakan toko ini enak.",
      "highlight": [
        "そうです"
      ]
    },
    {
      "japanese": "新しい先生はとても親切だそうです。",
      "reading": "あたらしい せんせいは とても しんせつだそうです。",
      "meaning": "Katanya guru baru sangat baik hati.",
      "highlight": [
        "そうです"
      ]
    },
    {
      "japanese": "あの会社は日曜日も休みではないそうです。",
      "reading": "あの かいしゃは にちようびも やすみではないそうです。",
      "meaning": "Katanya perusahaan itu juga tidak libur hari Minggu.",
      "highlight": [
        "そうです"
      ]
    }
  ],
  "notes": [
    "Bedakan dengan ～そうです 'kelihatannya' yang memakai bentuk khusus pada kata kerja/kata sifat."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch32-sou-appearance",
    "ch32-to-itteimashita"
  ]
},
{
  "id": "ch32-sou-appearance",
  "chapter": 32,
  "order": 2,
  "pattern": "～そうです（kelihatannya）",
  "meaning": "kelihatannya / tampaknya akan ...",
  "jlptLevel": "N4",
  "formula": "KK stem + そうです ／ KS-i: い→そうです ／ KS-na + そうです",
  "explanation": "Pola ini menyatakan kesan berdasarkan apa yang terlihat. Untuk kata kerja, sering berarti suatu kejadian tampaknya akan segera terjadi.",
  "keywords": [
    "kelihatannya",
    "tampaknya",
    "sou desu",
    "appearance"
  ],
  "examples": [
    {
      "japanese": "このケーキはおいしそうです。",
      "reading": "この けーきは おいしそうです。",
      "meaning": "Kue ini kelihatannya enak.",
      "highlight": [
        "そうです"
      ]
    },
    {
      "japanese": "雨が降りそうです。",
      "reading": "あめが ふりそうです。",
      "meaning": "Kelihatannya akan turun hujan.",
      "highlight": [
        "そうです"
      ]
    },
    {
      "japanese": "田中さんは元気そうです。",
      "reading": "たなかさんは げんきそうです。",
      "meaning": "Tanaka kelihatannya sehat/bersemangat.",
      "highlight": [
        "そうです"
      ]
    },
    {
      "japanese": "この荷物は重そうです。",
      "reading": "この にもつは おもそうです。",
      "meaning": "Barang ini kelihatannya berat.",
      "highlight": [
        "そうです"
      ]
    },
    {
      "japanese": "その仕事は大変そうです。",
      "reading": "その しごとは たいへんそうです。",
      "meaning": "Pekerjaan itu kelihatannya berat/sulit.",
      "highlight": [
        "そうです"
      ]
    }
  ],
  "notes": [
    "いい → よさそうです; ない → なさそうです adalah bentuk yang perlu diperhatikan."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch32-sou-hearsay",
    "ch32-youdesu"
  ]
},
{
  "id": "ch32-youdesu",
  "chapter": 32,
  "order": 3,
  "pattern": "～ようです",
  "meaning": "sepertinya / tampaknya ...",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + ようです（KB: ～のようです／KS-na: ～なようです）",
  "explanation": "～ようです menyatakan kesimpulan atau kesan berdasarkan informasi atau keadaan yang diamati. Sering diterjemahkan 'sepertinya'.",
  "keywords": [
    "sepertinya",
    "tampaknya",
    "you desu",
    "dugaan"
  ],
  "examples": [
    {
      "japanese": "外は雨が降っているようです。",
      "reading": "そとは あめが ふっているようです。",
      "meaning": "Sepertinya di luar sedang hujan.",
      "highlight": [
        "ようです"
      ]
    },
    {
      "japanese": "田中さんは忙しいようです。",
      "reading": "たなかさんは いそがしいようです。",
      "meaning": "Sepertinya Tanaka sibuk.",
      "highlight": [
        "ようです"
      ]
    },
    {
      "japanese": "この機械は壊れているようです。",
      "reading": "この きかいは こわれているようです。",
      "meaning": "Sepertinya mesin ini rusak.",
      "highlight": [
        "ようです"
      ]
    },
    {
      "japanese": "あの人は学生のようです。",
      "reading": "あの ひとは がくせいのようです。",
      "meaning": "Orang itu sepertinya pelajar.",
      "highlight": [
        "のようです"
      ]
    },
    {
      "japanese": "この町は夜も静かなようです。",
      "reading": "この まちは よるも しずかなようです。",
      "meaning": "Sepertinya kota ini juga tenang pada malam hari.",
      "highlight": [
        "なようです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch32-sou-appearance",
    "ch21-kamoshirenai",
    "ch21-deshou"
  ]
},
{
  "id": "ch32-to-itteimashita",
  "chapter": 32,
  "order": 4,
  "pattern": "～と言っていました",
  "meaning": "dia mengatakan bahwa ...",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa / kutipan + と言っていました",
  "explanation": "～と言っていました digunakan untuk melaporkan kembali ucapan seseorang yang disampaikan sebelumnya.",
  "keywords": [
    "laporan ucapan",
    "reported speech",
    "to itte imashita"
  ],
  "examples": [
    {
      "japanese": "田中さんは明日来ると言っていました。",
      "reading": "たなかさんは あした くると いっていました。",
      "meaning": "Tanaka mengatakan bahwa besok dia akan datang.",
      "highlight": [
        "と言っていました"
      ]
    },
    {
      "japanese": "先生は試験は難しくないと言っていました。",
      "reading": "せんせいは しけんは むずかしくないと いっていました。",
      "meaning": "Guru mengatakan bahwa ujiannya tidak sulit.",
      "highlight": [
        "と言っていました"
      ]
    },
    {
      "japanese": "母は少し遅くなると言っていました。",
      "reading": "ははは すこし おそくなると いっていました。",
      "meaning": "Ibu mengatakan akan sedikit terlambat.",
      "highlight": [
        "と言っていました"
      ]
    },
    {
      "japanese": "山田さんは今日は休むと言っていました。",
      "reading": "やまださんは きょうは やすむと いっていました。",
      "meaning": "Yamada mengatakan hari ini dia akan libur/tidak masuk.",
      "highlight": [
        "と言っていました"
      ]
    },
    {
      "japanese": "友達はその店がおいしいと言っていました。",
      "reading": "ともだちは その みせが おいしいと いっていました。",
      "meaning": "Teman mengatakan bahwa toko itu enak.",
      "highlight": [
        "と言っていました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch21-to-iimasu",
    "ch32-sou-hearsay"
  ]
},
{
  "id": "ch32-toiu-imi",
  "chapter": 32,
  "order": 5,
  "pattern": "～という意味です",
  "meaning": "artinya ... / berarti ...",
  "jlptLevel": "N4",
  "formula": "Kata / ungkapan + は + ... + という意味です",
  "explanation": "～という意味です digunakan untuk menjelaskan arti suatu kata, ungkapan, tanda, atau simbol.",
  "keywords": [
    "arti",
    "berarti",
    "to iu imi",
    "makna"
  ],
  "examples": [
    {
      "japanese": "「立入禁止」は入ってはいけないという意味です。",
      "reading": "たちいりきんしは はいってはいけないという いみです。",
      "meaning": "'Dilarang masuk' berarti tidak boleh masuk.",
      "highlight": [
        "という意味です"
      ]
    },
    {
      "japanese": "このマークは禁煙という意味です。",
      "reading": "この まーくは きんえんという いみです。",
      "meaning": "Tanda ini berarti dilarang merokok.",
      "highlight": [
        "という意味です"
      ]
    },
    {
      "japanese": "「無料」はお金がいらないという意味です。",
      "reading": "むりょうは おかねが いらないという いみです。",
      "meaning": "'Gratis' berarti tidak membutuhkan uang.",
      "highlight": [
        "という意味です"
      ]
    },
    {
      "japanese": "「徐行」はゆっくり走るという意味です。",
      "reading": "じょこうは ゆっくり はしるという いみです。",
      "meaning": "'Jokō' berarti berkendara pelan.",
      "highlight": [
        "という意味です"
      ]
    },
    {
      "japanese": "この言葉はどういう意味ですか。",
      "reading": "この ことばは どういう いみですか。",
      "meaning": "Apa arti kata ini?",
      "highlight": [
        "どういう意味ですか"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch22-toiu-noun",
    "ch21-to-iimasu"
  ]
},
{
  "id": "ch33-baai",
  "chapter": 33,
  "order": 2,
  "pattern": "～場合（は）",
  "meaning": "dalam hal / apabila ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk biasa + 場合（は）／KS-na + な場合／KB + の場合",
  "explanation": "～場合は digunakan untuk menjelaskan tindakan atau aturan yang berlaku jika suatu keadaan tertentu terjadi. Sering dipakai dalam petunjuk dan situasi formal.",
  "keywords": [
    "apabila",
    "dalam hal",
    "baai",
    "situasi"
  ],
  "examples": [
    {
      "japanese": "雨の場合は、試合を中止します。",
      "reading": "あめの ばあいは しあいを ちゅうしします。",
      "meaning": "Jika hujan, pertandingan dibatalkan.",
      "highlight": [
        "場合は"
      ]
    },
    {
      "japanese": "遅れる場合は、連絡してください。",
      "reading": "おくれる ばあいは れんらくしてください。",
      "meaning": "Jika akan terlambat, tolong hubungi.",
      "highlight": [
        "場合は"
      ]
    },
    {
      "japanese": "わからない場合は、先生に聞いてください。",
      "reading": "わからない ばあいは せんせいに きいてください。",
      "meaning": "Jika tidak mengerti, tolong tanyakan kepada guru.",
      "highlight": [
        "場合は"
      ]
    },
    {
      "japanese": "緊急の場合は、この番号に電話してください。",
      "reading": "きんきゅうの ばあいは この ばんごうに でんわしてください。",
      "meaning": "Dalam keadaan darurat, tolong telepon nomor ini.",
      "highlight": [
        "場合は"
      ]
    },
    {
      "japanese": "パスポートをなくした場合は、警察へ行ってください。",
      "reading": "ぱすぽーとを なくした ばあいは けいさつへ いってください。",
      "meaning": "Jika paspor hilang, silakan pergi ke polisi.",
      "highlight": [
        "場合は"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch25-tara",
    "ch25-ba"
  ]
},
{
  "id": "ch33-noni",
  "chapter": 33,
  "order": 3,
  "pattern": "～のに",
  "meaning": "meskipun / padahal ...",
  "jlptLevel": "N4",
  "formula": "Bentuk biasa + のに（KB・KS-na: ～なのに）",
  "explanation": "～のに menyatakan hasil yang bertentangan dengan harapan atau fakta sebelumnya, sering disertai nuansa heran, kecewa, atau tidak sesuai dugaan.",
  "keywords": [
    "meskipun",
    "padahal",
    "noni",
    "kontras"
  ],
  "examples": [
    {
      "japanese": "たくさん勉強したのに、試験に合格できませんでした。",
      "reading": "たくさん べんきょうしたのに しけんに ごうかくできませんでした。",
      "meaning": "Padahal sudah banyak belajar, saya tidak lulus ujian.",
      "highlight": [
        "のに"
      ]
    },
    {
      "japanese": "日曜日なのに、会社へ行かなければなりません。",
      "reading": "にちようびなのに かいしゃへ いかなければなりません。",
      "meaning": "Padahal hari Minggu, saya harus pergi ke kantor.",
      "highlight": [
        "なのに"
      ]
    },
    {
      "japanese": "この店は安いのに、おいしいです。",
      "reading": "この みせは やすいのに おいしいです。",
      "meaning": "Meskipun toko ini murah, makanannya enak.",
      "highlight": [
        "のに"
      ]
    },
    {
      "japanese": "薬を飲んだのに、まだ熱があります。",
      "reading": "くすりを のんだのに まだ ねつが あります。",
      "meaning": "Padahal sudah minum obat, saya masih demam.",
      "highlight": [
        "のに"
      ]
    },
    {
      "japanese": "静かな町なのに、駅の前はにぎやかです。",
      "reading": "しずかな まちなのに えきの まえは にぎやかです。",
      "meaning": "Meskipun kota ini tenang, depan stasiun ramai.",
      "highlight": [
        "なのに"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch25-temo",
    "ch20-kedo"
  ]
},
{
  "id": "ch33-tatoe-temo",
  "chapter": 33,
  "order": 4,
  "pattern": "たとえ～ても",
  "meaning": "walaupun sekalipun ...",
  "jlptLevel": "N4",
  "formula": "たとえ + ～ても",
  "explanation": "たとえ～ても menekankan bahwa hasil atau keputusan tidak berubah walaupun kondisi yang dibayangkan terjadi.",
  "keywords": [
    "walaupun sekalipun",
    "tatoe",
    "temo",
    "penekanan"
  ],
  "examples": [
    {
      "japanese": "たとえ雨が降っても、行きます。",
      "reading": "たとえ あめが ふっても いきます。",
      "meaning": "Walaupun sekalipun hujan, saya akan pergi.",
      "highlight": [
        "たとえ",
        "ても"
      ]
    },
    {
      "japanese": "たとえ難しくても、最後までやります。",
      "reading": "たとえ むずかしくても さいごまで やります。",
      "meaning": "Walaupun sulit, saya akan melakukannya sampai akhir.",
      "highlight": [
        "たとえ",
        "くても"
      ]
    },
    {
      "japanese": "たとえ時間がなくても、毎日少し勉強します。",
      "reading": "たとえ じかんが なくても まいにち すこし べんきょうします。",
      "meaning": "Walaupun tidak ada banyak waktu, saya belajar sedikit setiap hari.",
      "highlight": [
        "たとえ",
        "ても"
      ]
    },
    {
      "japanese": "たとえ失敗しても、もう一度挑戦します。",
      "reading": "たとえ しっぱいしても もう いちど ちょうせんします。",
      "meaning": "Walaupun gagal, saya akan mencoba sekali lagi.",
      "highlight": [
        "たとえ",
        "ても"
      ]
    },
    {
      "japanese": "たとえ遠くても、その店へ行きたいです。",
      "reading": "たとえ とおくても その みせへ いきたいです。",
      "meaning": "Walaupun jauh, saya ingin pergi ke toko itu.",
      "highlight": [
        "たとえ",
        "くても"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch25-temo",
    "ch33-noni"
  ]
},
{
  "id": "ch34-toorini",
  "chapter": 34,
  "order": 1,
  "pattern": "～とおりに",
  "meaning": "sesuai / seperti ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk kamus / た + とおりに ／ KB + の + とおりに",
  "explanation": "～とおりに menyatakan bahwa suatu tindakan dilakukan sesuai contoh, instruksi, rencana, atau keadaan yang disebutkan.",
  "keywords": [
    "sesuai",
    "seperti",
    "toori ni",
    "cara"
  ],
  "examples": [
    {
      "japanese": "先生が言ったとおりに書いてください。",
      "reading": "せんせいが いったとおりに かいてください。",
      "meaning": "Tolong tulis sesuai yang guru katakan.",
      "highlight": [
        "とおりに"
      ]
    },
    {
      "japanese": "説明書のとおりに使ってください。",
      "reading": "せつめいしょの とおりに つかってください。",
      "meaning": "Tolong gunakan sesuai petunjuk.",
      "highlight": [
        "のとおりに"
      ]
    },
    {
      "japanese": "私がするとおりにしてください。",
      "reading": "わたしが するとおりに してください。",
      "meaning": "Tolong lakukan seperti yang saya lakukan.",
      "highlight": [
        "とおりに"
      ]
    },
    {
      "japanese": "予定どおりに会議が始まりました。",
      "reading": "よていどおりに かいぎが はじまりました。",
      "meaning": "Rapat dimulai sesuai jadwal.",
      "highlight": [
        "どおりに"
      ]
    },
    {
      "japanese": "地図のとおりに歩いたら、駅に着きました。",
      "reading": "ちずの とおりに あるいたら えきに つきました。",
      "meaning": "Ketika berjalan sesuai peta, saya tiba di stasiun.",
      "highlight": [
        "のとおりに"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch34-temiru",
    "ch22-verb-relative"
  ]
},
{
  "id": "ch34-naide",
  "chapter": 34,
  "order": 2,
  "pattern": "～ないで",
  "meaning": "tanpa melakukan ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk ない + で + tindakan utama",
  "explanation": "～ないで menyatakan bahwa tindakan utama dilakukan tanpa melakukan tindakan sebelumnya.",
  "keywords": [
    "tanpa",
    "naide",
    "tidak melakukan sambil"
  ],
  "examples": [
    {
      "japanese": "朝ご飯を食べないで学校へ行きました。",
      "reading": "あさごはんを たべないで がっこうへ いきました。",
      "meaning": "Saya pergi ke sekolah tanpa sarapan.",
      "highlight": [
        "ないで"
      ]
    },
    {
      "japanese": "傘を持たないで出かけました。",
      "reading": "かさを もたないで でかけました。",
      "meaning": "Saya pergi keluar tanpa membawa payung.",
      "highlight": [
        "ないで"
      ]
    },
    {
      "japanese": "何も言わないで帰りました。",
      "reading": "なにも いわないで かえりました。",
      "meaning": "Dia pulang tanpa mengatakan apa-apa.",
      "highlight": [
        "ないで"
      ]
    },
    {
      "japanese": "砂糖を入れないでコーヒーを飲みます。",
      "reading": "さとうを いれないで こーひーを のみます。",
      "meaning": "Saya minum kopi tanpa menambahkan gula.",
      "highlight": [
        "ないで"
      ]
    },
    {
      "japanese": "辞書を使わないで読んでみてください。",
      "reading": "じしょを つかわないで よんでみてください。",
      "meaning": "Cobalah membaca tanpa menggunakan kamus.",
      "highlight": [
        "ないで"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch17-naidekudasai",
    "ch34-temiru"
  ]
},
{
  "id": "ch34-temiru",
  "chapter": 34,
  "order": 3,
  "pattern": "～てみます",
  "meaning": "mencoba melakukan ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk て + みます",
  "explanation": "～てみます menyatakan mencoba suatu tindakan untuk mengetahui hasil atau pengalaman.",
  "keywords": [
    "mencoba",
    "te miru",
    "try doing"
  ],
  "examples": [
    {
      "japanese": "この料理を食べてみます。",
      "reading": "この りょうりを たべてみます。",
      "meaning": "Saya akan mencoba makan masakan ini.",
      "highlight": [
        "てみます"
      ]
    },
    {
      "japanese": "日本語で話してみてください。",
      "reading": "にほんごで はなしてみてください。",
      "meaning": "Cobalah berbicara dalam bahasa Jepang.",
      "highlight": [
        "てみて"
      ]
    },
    {
      "japanese": "新しい方法を使ってみました。",
      "reading": "あたらしい ほうほうを つかってみました。",
      "meaning": "Saya mencoba menggunakan cara baru.",
      "highlight": [
        "てみました"
      ]
    },
    {
      "japanese": "一人で作ってみます。",
      "reading": "ひとりで つくってみます。",
      "meaning": "Saya akan mencoba membuatnya sendiri.",
      "highlight": [
        "てみます"
      ]
    },
    {
      "japanese": "わからない言葉を辞書で調べてみました。",
      "reading": "わからない ことばを じしょで しらべてみました。",
      "meaning": "Saya mencoba mencari kata yang tidak dimengerti di kamus.",
      "highlight": [
        "てみました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch34-toorini",
    "ch34-yasui-nikui"
  ]
},
{
  "id": "ch34-yasui-nikui",
  "chapter": 34,
  "order": 4,
  "pattern": "～やすい／～にくい",
  "meaning": "mudah / sulit untuk dilakukan",
  "jlptLevel": "N4",
  "formula": "KK bentuk ます tanpa ます + やすい／にくい",
  "explanation": "～やすい menyatakan suatu tindakan mudah dilakukan, sedangkan ～にくい menyatakan sulit dilakukan karena sifat atau kondisi tertentu.",
  "keywords": [
    "mudah",
    "sulit",
    "yasui",
    "nikui",
    "kemudahan"
  ],
  "examples": [
    {
      "japanese": "このペンは書きやすいです。",
      "reading": "この ぺんは かきやすいです。",
      "meaning": "Pena ini mudah digunakan untuk menulis.",
      "highlight": [
        "やすい"
      ]
    },
    {
      "japanese": "この説明はわかりやすいです。",
      "reading": "この せつめいは わかりやすいです。",
      "meaning": "Penjelasan ini mudah dipahami.",
      "highlight": [
        "やすい"
      ]
    },
    {
      "japanese": "この靴は歩きにくいです。",
      "reading": "この くつは あるきにくいです。",
      "meaning": "Sepatu ini sulit dipakai berjalan.",
      "highlight": [
        "にくい"
      ]
    },
    {
      "japanese": "小さい字は読みにくいです。",
      "reading": "ちいさい じは よみにくいです。",
      "meaning": "Tulisan kecil sulit dibaca.",
      "highlight": [
        "にくい"
      ]
    },
    {
      "japanese": "このアプリは使いやすいです。",
      "reading": "この あぷりは つかいやすいです。",
      "meaning": "Aplikasi ini mudah digunakan.",
      "highlight": [
        "やすい"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch34-temiru",
    "ch34-sugiru"
  ]
},
{
  "id": "ch34-sugiru",
  "chapter": 34,
  "order": 5,
  "pattern": "～すぎます",
  "meaning": "terlalu ...",
  "jlptLevel": "N4",
  "formula": "KK stem + すぎます ／ KS-i: い→すぎます ／ KS-na + すぎます",
  "explanation": "～すぎます menyatakan bahwa jumlah, sifat, atau tindakan melebihi tingkat yang dianggap sesuai.",
  "keywords": [
    "terlalu",
    "sugiru",
    "berlebihan"
  ],
  "examples": [
    {
      "japanese": "昨日食べすぎました。",
      "reading": "きのう たべすぎました。",
      "meaning": "Kemarin saya makan terlalu banyak.",
      "highlight": [
        "すぎました"
      ]
    },
    {
      "japanese": "このかばんは高すぎます。",
      "reading": "この かばんは たかすぎます。",
      "meaning": "Tas ini terlalu mahal.",
      "highlight": [
        "すぎます"
      ]
    },
    {
      "japanese": "働きすぎないでください。",
      "reading": "はたらきすぎないでください。",
      "meaning": "Tolong jangan bekerja terlalu berlebihan.",
      "highlight": [
        "すぎないで"
      ]
    },
    {
      "japanese": "この部屋は静かすぎます。",
      "reading": "この へやは しずかすぎます。",
      "meaning": "Kamar ini terlalu sepi.",
      "highlight": [
        "すぎます"
      ]
    },
    {
      "japanese": "コーヒーを飲みすぎました。",
      "reading": "こーひーを のみすぎました。",
      "meaning": "Saya minum kopi terlalu banyak.",
      "highlight": [
        "すぎました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch34-yasui-nikui"
  ]
},
{
  "id": "ch35-tokoro",
  "chapter": 35,
  "order": 1,
  "pattern": "～ところです",
  "meaning": "baru akan / sedang / baru saja melakukan",
  "jlptLevel": "N4",
  "formula": "KK kamus + ところです ／ ～ているところです ／ KK bentuk た + ところです",
  "explanation": "～ところです menunjukkan tahap suatu tindakan: baru akan dilakukan, sedang berlangsung, atau baru saja selesai tergantung bentuk kata kerja.",
  "keywords": [
    "tahap tindakan",
    "tokoro",
    "baru akan",
    "sedang",
    "baru saja"
  ],
  "examples": [
    {
      "japanese": "今から昼ご飯を食べるところです。",
      "reading": "いまから ひるごはんを たべるところです。",
      "meaning": "Saya baru akan makan siang sekarang.",
      "highlight": [
        "るところです"
      ]
    },
    {
      "japanese": "今、宿題をしているところです。",
      "reading": "いま しゅくだいを しているところです。",
      "meaning": "Saya sedang mengerjakan PR sekarang.",
      "highlight": [
        "ているところです"
      ]
    },
    {
      "japanese": "今、駅に着いたところです。",
      "reading": "いま えきに ついたところです。",
      "meaning": "Saya baru saja tiba di stasiun.",
      "highlight": [
        "たところです"
      ]
    },
    {
      "japanese": "これから会議を始めるところです。",
      "reading": "これから かいぎを はじめるところです。",
      "meaning": "Kami baru akan memulai rapat.",
      "highlight": [
        "るところです"
      ]
    },
    {
      "japanese": "先生と話しているところです。",
      "reading": "せんせいと はなしているところです。",
      "meaning": "Saya sedang berbicara dengan guru.",
      "highlight": [
        "ているところです"
      ]
    }
  ],
  "notes": [
    "～たところです menekankan 'baru saja' sangat dekat dengan waktu bicara; berbeda dari ～たばかり yang lebih bergantung pada perasaan pembicara."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch35-ta-bakari",
    "ch14-teiru-progress"
  ]
},
{
  "id": "ch35-ta-bakari",
  "chapter": 35,
  "order": 2,
  "pattern": "～たばかりです",
  "meaning": "baru saja melakukan ...",
  "jlptLevel": "N4",
  "formula": "KK bentuk た + ばかりです",
  "explanation": "～たばかりです menyatakan bahwa menurut perasaan pembicara, suatu tindakan baru saja terjadi. Jarak waktunya dapat lebih fleksibel daripada ～たところです.",
  "keywords": [
    "baru saja",
    "ta bakari",
    "recent"
  ],
  "examples": [
    {
      "japanese": "日本へ来たばかりです。",
      "reading": "にほんへ きたばかりです。",
      "meaning": "Saya baru saja datang ke Jepang.",
      "highlight": [
        "たばかりです"
      ]
    },
    {
      "japanese": "この会社に入ったばかりです。",
      "reading": "この かいしゃに はいったばかりです。",
      "meaning": "Saya baru saja bergabung dengan perusahaan ini.",
      "highlight": [
        "たばかりです"
      ]
    },
    {
      "japanese": "昼ご飯を食べたばかりです。",
      "reading": "ひるごはんを たべたばかりです。",
      "meaning": "Saya baru saja makan siang.",
      "highlight": [
        "たばかりです"
      ]
    },
    {
      "japanese": "その本は昨日買ったばかりです。",
      "reading": "その ほんは きのう かったばかりです。",
      "meaning": "Buku itu baru saya beli kemarin.",
      "highlight": [
        "たばかりです"
      ]
    },
    {
      "japanese": "日本語の勉強を始めたばかりです。",
      "reading": "にほんごの べんきょうを はじめたばかりです。",
      "meaning": "Saya baru saja mulai belajar bahasa Jepang.",
      "highlight": [
        "たばかりです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch35-tokoro",
    "ch19-ta-koto-ga-aru"
  ]
},
{
  "id": "ch35-teiku",
  "chapter": 35,
  "order": 3,
  "pattern": "～ていきます",
  "meaning": "terus berubah / bergerak dari sekarang ke depan",
  "jlptLevel": "N4",
  "formula": "KK bentuk て + いきます",
  "explanation": "Selain makna gerak literal 'pergi sambil...', ～ていきます dapat menyatakan perubahan atau proses yang berlanjut dari sekarang menuju masa depan.",
  "keywords": [
    "perubahan",
    "te iku",
    "ke depan",
    "berlanjut"
  ],
  "examples": [
    {
      "japanese": "これからもっと暑くなっていきます。",
      "reading": "これから もっと あつくなっていきます。",
      "meaning": "Mulai sekarang cuaca akan semakin panas.",
      "highlight": [
        "ていきます"
      ]
    },
    {
      "japanese": "日本語を少しずつ勉強していきます。",
      "reading": "にほんごを すこしずつ べんきょうしていきます。",
      "meaning": "Saya akan terus belajar bahasa Jepang sedikit demi sedikit.",
      "highlight": [
        "ていきます"
      ]
    },
    {
      "japanese": "この町はこれから変わっていくでしょう。",
      "reading": "この まちは これから かわっていくでしょう。",
      "meaning": "Kota ini mungkin akan terus berubah ke depan.",
      "highlight": [
        "ていく"
      ]
    },
    {
      "japanese": "人口はこれから減っていくかもしれません。",
      "reading": "じんこうは これから へっていくかもしれません。",
      "meaning": "Populasi mungkin akan terus berkurang mulai sekarang.",
      "highlight": [
        "ていく"
      ]
    },
    {
      "japanese": "経験を積みながら成長していきたいです。",
      "reading": "けいけんを つみながら せいちょうしていきたいです。",
      "meaning": "Saya ingin terus berkembang sambil menambah pengalaman.",
      "highlight": [
        "ていきたいです"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch35-tekuru",
    "ch30-you-ni-naru"
  ]
},
{
  "id": "ch35-tekuru",
  "chapter": 35,
  "order": 4,
  "pattern": "～てきます",
  "meaning": "perubahan yang berlangsung sampai sekarang / datang setelah melakukan",
  "jlptLevel": "N4",
  "formula": "KK bentuk て + きます",
  "explanation": "～てきます dapat menyatakan perubahan yang dimulai sebelumnya dan mendekati sekarang, atau gerak 'melakukan sesuatu lalu datang/kembali'.",
  "keywords": [
    "perubahan",
    "te kuru",
    "sampai sekarang",
    "datang"
  ],
  "examples": [
    {
      "japanese": "だんだん暖かくなってきました。",
      "reading": "だんだん あたたかくなってきました。",
      "meaning": "Cuaca perlahan-lahan mulai menjadi hangat.",
      "highlight": [
        "てきました"
      ]
    },
    {
      "japanese": "日本語が少しわかるようになってきました。",
      "reading": "にほんごが すこし わかるように なってきました。",
      "meaning": "Saya mulai sedikit demi sedikit memahami bahasa Jepang.",
      "highlight": [
        "てきました"
      ]
    },
    {
      "japanese": "雨が降ってきました。",
      "reading": "あめが ふってきました。",
      "meaning": "Hujan mulai turun.",
      "highlight": [
        "てきました"
      ]
    },
    {
      "japanese": "ちょっと飲み物を買ってきます。",
      "reading": "ちょっと のみものを かってきます。",
      "meaning": "Saya pergi membeli minuman sebentar lalu kembali.",
      "highlight": [
        "てきます"
      ]
    },
    {
      "japanese": "最近仕事が忙しくなってきました。",
      "reading": "さいきん しごとが いそがしくなってきました。",
      "meaning": "Belakangan pekerjaan mulai menjadi sibuk.",
      "highlight": [
        "てきました"
      ]
    }
  ],
  "notes": [],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch35-teiku",
    "ch30-you-ni-naru"
  ]
},
{
  "id": "ch35-passive",
  "chapter": 35,
  "order": 5,
  "pattern": "受身形（bentuk pasif）",
  "meaning": "dikenai / dilakukan oleh ...",
  "jlptLevel": "N4",
  "formula": "KK kelompok 1: u→a + れる; kelompok 2: る→られる; する→される; 来る→こられる",
  "explanation": "Bentuk pasif menyatakan bahwa subjek menerima atau terkena tindakan dari pihak lain. Pelaku sering ditandai に.",
  "keywords": [
    "pasif",
    "ukemikei",
    "dilakukan oleh",
    "reru rareru"
  ],
  "examples": [
    {
      "japanese": "私は先生に褒められました。",
      "reading": "わたしは せんせいに ほめられました。",
      "meaning": "Saya dipuji oleh guru.",
      "highlight": [
        "に",
        "られました"
      ]
    },
    {
      "japanese": "弟は母に叱られました。",
      "reading": "おとうとは ははに しかられました。",
      "meaning": "Adik laki-laki dimarahi ibu.",
      "highlight": [
        "に",
        "られました"
      ]
    },
    {
      "japanese": "この寺は五百年前に建てられました。",
      "reading": "この てらは ごひゃくねんまえに たてられました。",
      "meaning": "Kuil ini dibangun lima ratus tahun lalu.",
      "highlight": [
        "られました"
      ]
    },
    {
      "japanese": "私の自転車は誰かに盗まれました。",
      "reading": "わたしの じてんしゃは だれかに ぬすまれました。",
      "meaning": "Sepeda saya dicuri seseorang.",
      "highlight": [
        "に",
        "まれました"
      ]
    },
    {
      "japanese": "この本は多くの人に読まれています。",
      "reading": "この ほんは おおくの ひとに よまれています。",
      "meaning": "Buku ini dibaca oleh banyak orang.",
      "highlight": [
        "に",
        "まれています"
      ]
    }
  ],
  "notes": [
    "Bentuk potensial dan pasif beberapa verba kelompok 2 sama-sama ～られる; tentukan dari struktur dan konteks kalimat."
  ],
  "commonMistakes": [],
  "relatedPatterns": [
    "ch27-potential"
  ]
}
];

export function getGrammarPattern(id: string) {
  return GRAMMAR_PATTERNS.find((pattern) => pattern.id === id);
}
