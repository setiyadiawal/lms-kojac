import type { ListeningItem } from '../../listeningData';

export const LISTENING_CHAPTERS11_15: ListeningItem[] = [
  {
    "id": "listening-b11-01",
    "chapter": 11,
    "order": 1,
    "title": "今日の案内",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "information",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "クラスに"
          },
          {
            "text": "学生",
            "reading": "がくせい"
          },
          {
            "text": "が"
          },
          {
            "text": "十二人",
            "reading": "じゅうににん"
          },
          {
            "text": "います。"
          },
          {
            "text": "外国人",
            "reading": "がいこくじん"
          },
          {
            "text": "は"
          },
          {
            "text": "五人",
            "reading": "ごにん"
          },
          {
            "text": "です。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "駅前",
            "reading": "えきまえ"
          },
          {
            "text": "のカフェまで"
          },
          {
            "text": "十五分",
            "reading": "じゅうごふん"
          },
          {
            "text": "ぐらいです。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "学生",
            "reading": "がくせい"
          },
          {
            "text": "が十人います。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "一週間",
            "reading": "いっしゅうかん"
          },
          {
            "text": "に"
          },
          {
            "text": "三回",
            "reading": "さんかい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "毎日",
            "reading": "まいにち"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "時間",
            "reading": "じかん"
          },
          {
            "text": "や"
          },
          {
            "text": "場所",
            "reading": "ばしょ"
          },
          {
            "text": "を間違えないように"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "してください。"
          }
        ]
      }
    ],
    "translation": [
      "Ada 12 siswa di kelas, lima di antaranya orang asing. Pembicara juga memberi detail jumlah, durasi, atau frekuensi yang perlu dibedakan."
    ],
    "grammarTargets": [
      "ch11-counter"
    ],
    "vocabularyHelp": [
      {
        "japanese": "学生",
        "reading": "がくせい",
        "meaning": "siswa / pelajar"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      },
      {
        "japanese": "場所",
        "reading": "ばしょ",
        "meaning": "tempat"
      },
      {
        "japanese": "駅",
        "reading": "えき",
        "meaning": "stasiun"
      }
    ],
    "questions": [
      {
        "id": "listening-b11-01-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "クラスに学生が十二人います。外国人は五人です。",
          "クラスに会社員が十二人います。外国人は五人です。",
          "クラスに学生が十二人いません。外国人は五人です。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "クラスに学生が十二人います。外国人は五人です。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "クラスに学生が十二人います。外国人は五人です。"
      },
      {
        "id": "listening-b11-01-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "十五分",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "十五分",
        "explanation": "Audio menyebut 「十五分」 secara langsung.",
        "evidence": "駅前のカフェまで十五分ぐらいです。"
      },
      {
        "id": "listening-b11-01-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "駅前のカフェ",
          "病院",
          "空港",
          "別の時間です。"
        ],
        "correctAnswer": "駅前のカフェ",
        "explanation": "Audio menyebut lokasi 「駅前のカフェ」.",
        "evidence": "駅前のカフェまで十五分ぐらいです。"
      },
      {
        "id": "listening-b11-01-q4",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "時間や場所を間違えないように確認してください。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "時間や場所を間違えないように確認してください。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "時間や場所を間違えないように確認してください。"
      },
      {
        "id": "listening-b11-01-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "駅前のカフェまで十五分ぐらいです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "駅前のカフェまで十五分ぐらいです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "駅前のカフェまで十五分ぐらいです。"
      }
    ],
    "estimatedDuration": 31
  },
  {
    "id": "listening-b11-02",
    "chapter": 11,
    "order": 2,
    "title": "クラスでの確認",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "school",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "みなさん、"
          },
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "の内容を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "毎日",
            "reading": "まいにち"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "を"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "学生",
            "reading": "がくせい"
          },
          {
            "text": "が十人います。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "一週間",
            "reading": "いっしゅうかん"
          },
          {
            "text": "に"
          },
          {
            "text": "三回",
            "reading": "さんかい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "毎日",
            "reading": "まいにち"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "三",
            "reading": "みっ"
          },
          {
            "text": "番ホームまで"
          },
          {
            "text": "十五分",
            "reading": "じゅうごふん"
          },
          {
            "text": "ぐらいです。"
          }
        ]
      },
      {
        "speaker": "学生",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Saya belajar bahasa Jepang sekitar dua jam setiap hari. Pembicara juga memberi detail jumlah, durasi, atau frekuensi yang perlu dibedakan."
    ],
    "grammarTargets": [
      "ch11-duration"
    ],
    "vocabularyHelp": [
      {
        "japanese": "日本語",
        "reading": "にほんご",
        "meaning": "bahasa Jepang"
      },
      {
        "japanese": "学生",
        "reading": "がくせい",
        "meaning": "siswa / pelajar"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      },
      {
        "japanese": "本",
        "reading": "ほん",
        "meaning": "buku"
      }
    ],
    "questions": [
      {
        "id": "listening-b11-02-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "毎日二時間ぐらい日本語を勉強します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "毎日二時間ぐらい日本語を勉強します。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "毎日二時間ぐらい日本語を勉強します。"
      },
      {
        "id": "listening-b11-02-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "十五分",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "十五分",
        "explanation": "Audio menyebut 「十五分」 secara langsung.",
        "evidence": "三番ホームまで十五分ぐらいです。"
      },
      {
        "id": "listening-b11-02-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "三番ホーム",
          "病院",
          "空港",
          "別の時間です。"
        ],
        "correctAnswer": "三番ホーム",
        "explanation": "Audio menyebut lokasi 「三番ホーム」.",
        "evidence": "三番ホームまで十五分ぐらいです。"
      },
      {
        "id": "listening-b11-02-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "みなさん、今日の内容を確認します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "みなさん、今日の内容を確認します。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "みなさん、今日の内容を確認します。"
      },
      {
        "id": "listening-b11-02-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "学生が十人います。",
          "会社員が十人います。",
          "学生が十人いません。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "学生が十人います。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "学生が十人います。"
      }
    ],
    "estimatedDuration": 30
  },
  {
    "id": "listening-b11-03",
    "chapter": 11,
    "order": 3,
    "title": "友だちとの会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "conversation",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "アユさん、"
          },
          {
            "text": "少",
            "reading": "すこ"
          },
          {
            "text": "し"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "してもいいですか。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "一週間",
            "reading": "いっしゅうかん"
          },
          {
            "text": "に"
          },
          {
            "text": "三回",
            "reading": "さんかい"
          },
          {
            "text": "、ジムへ行きます。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "一週間",
            "reading": "いっしゅうかん"
          },
          {
            "text": "に"
          },
          {
            "text": "三回",
            "reading": "さんかい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "毎日",
            "reading": "まいにち"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "教室",
            "reading": "きょうしつ"
          },
          {
            "text": "まで"
          },
          {
            "text": "十五分",
            "reading": "じゅうごふん"
          },
          {
            "text": "ぐらいです。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "学生",
            "reading": "がくせい"
          },
          {
            "text": "が十人います。"
          }
        ]
      },
      {
        "speaker": "アユ",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Saya pergi ke gym tiga kali seminggu. Pembicara juga memberi detail jumlah, durasi, atau frekuensi yang perlu dibedakan."
    ],
    "grammarTargets": [
      "ch11-frequency"
    ],
    "vocabularyHelp": [
      {
        "japanese": "学生",
        "reading": "がくせい",
        "meaning": "siswa / pelajar"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      }
    ],
    "questions": [
      {
        "id": "listening-b11-03-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "一週間に三回、ジムへ行きます。",
          "一週間に三回、ジムへ行きません。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "一週間に三回、ジムへ行きます。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "一週間に三回、ジムへ行きます。"
      },
      {
        "id": "listening-b11-03-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "十五分",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "十五分",
        "explanation": "Audio menyebut 「十五分」 secara langsung.",
        "evidence": "教室まで十五分ぐらいです。"
      },
      {
        "id": "listening-b11-03-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "教室",
          "病院",
          "空港",
          "別の時間です。"
        ],
        "correctAnswer": "教室",
        "explanation": "Audio menyebut lokasi 「教室」.",
        "evidence": "教室まで十五分ぐらいです。"
      },
      {
        "id": "listening-b11-03-q4",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "アユさん、少し確認してもいいですか。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "アユさん、少し確認してもいいですか。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "アユさん、少し確認してもいいですか。"
      },
      {
        "id": "listening-b11-03-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "一週間に三回勉強します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "一週間に三回勉強します。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "一週間に三回勉強します。"
      }
    ],
    "estimatedDuration": 28
  },
  {
    "id": "listening-b11-04",
    "chapter": 11,
    "order": 4,
    "title": "店での会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "shopping",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "いらっしゃいませ。ご案内します。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "まで"
          },
          {
            "text": "歩",
            "reading": "ある"
          },
          {
            "text": "いて"
          },
          {
            "text": "十五分",
            "reading": "じゅうごふん"
          },
          {
            "text": "ぐらいです。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "毎日",
            "reading": "まいにち"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "公園",
            "reading": "こうえん"
          },
          {
            "text": "の"
          },
          {
            "text": "入口",
            "reading": "いりぐち"
          },
          {
            "text": "まで"
          },
          {
            "text": "十五分",
            "reading": "じゅうごふん"
          },
          {
            "text": "ぐらいです。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "学生",
            "reading": "がくせい"
          },
          {
            "text": "が十人います。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "一週間",
            "reading": "いっしゅうかん"
          },
          {
            "text": "に"
          },
          {
            "text": "三回",
            "reading": "さんかい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "客",
        "segments": [
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。ありがとうございます。"
          }
        ]
      }
    ],
    "translation": [
      "Jalan kaki ke stasiun sekitar 15 menit. Pembicara juga memberi detail jumlah, durasi, atau frekuensi yang perlu dibedakan."
    ],
    "grammarTargets": [
      "ch11-gurai"
    ],
    "vocabularyHelp": [
      {
        "japanese": "学生",
        "reading": "がくせい",
        "meaning": "siswa / pelajar"
      },
      {
        "japanese": "公園",
        "reading": "こうえん",
        "meaning": "taman"
      },
      {
        "japanese": "駅",
        "reading": "えき",
        "meaning": "stasiun"
      }
    ],
    "questions": [
      {
        "id": "listening-b11-04-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "駅まで歩いて十五分ぐらいです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "駅まで歩いて十五分ぐらいです。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "駅まで歩いて十五分ぐらいです。"
      },
      {
        "id": "listening-b11-04-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "十五分",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "十五分",
        "explanation": "Audio menyebut 「十五分」 secara langsung.",
        "evidence": "駅まで歩いて十五分ぐらいです。"
      },
      {
        "id": "listening-b11-04-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "公園の入口",
          "駅",
          "病院",
          "空港"
        ],
        "correctAnswer": "公園の入口",
        "explanation": "Audio menyebut lokasi 「公園の入口」.",
        "evidence": "公園の入口まで十五分ぐらいです。"
      },
      {
        "id": "listening-b11-04-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "いらっしゃいませ。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "いらっしゃいませ。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "いらっしゃいませ。"
      },
      {
        "id": "listening-b11-04-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "ご案内します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "ご案内します。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "ご案内します。"
      }
    ],
    "estimatedDuration": 31
  },
  {
    "id": "listening-b11-05",
    "chapter": 11,
    "order": 5,
    "title": "出発前の会話",
    "jlptLevel": "N5",
    "difficulty": "Menantang",
    "type": "travel",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "アユ",
        "segments": [
          {
            "text": "山田",
            "reading": "やまだ"
          },
          {
            "text": "さん、"
          },
          {
            "text": "予定",
            "reading": "よてい"
          },
          {
            "text": "を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "しましょう。"
          }
        ]
      },
      {
        "speaker": "アユ",
        "segments": [
          {
            "text": "りんごを"
          },
          {
            "text": "三",
            "reading": "みっ"
          },
          {
            "text": "つ、パンを"
          },
          {
            "text": "二",
            "reading": "ふた"
          },
          {
            "text": "つ"
          },
          {
            "text": "買",
            "reading": "か"
          },
          {
            "text": "いました。"
          }
        ]
      },
      {
        "speaker": "アユ",
        "segments": [
          {
            "text": "学校",
            "reading": "がっこう"
          },
          {
            "text": "の"
          },
          {
            "text": "入口",
            "reading": "いりぐち"
          },
          {
            "text": "まで"
          },
          {
            "text": "十五分",
            "reading": "じゅうごふん"
          },
          {
            "text": "ぐらいです。"
          }
        ]
      },
      {
        "speaker": "アユ",
        "segments": [
          {
            "text": "学生",
            "reading": "がくせい"
          },
          {
            "text": "が十人います。"
          }
        ]
      },
      {
        "speaker": "アユ",
        "segments": [
          {
            "text": "一週間",
            "reading": "いっしゅうかん"
          },
          {
            "text": "に"
          },
          {
            "text": "三回",
            "reading": "さんかい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "アユ",
        "segments": [
          {
            "text": "毎日",
            "reading": "まいにち"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "はい。"
          },
          {
            "text": "時間",
            "reading": "じかん"
          },
          {
            "text": "と"
          },
          {
            "text": "場所",
            "reading": "ばしょ"
          },
          {
            "text": "を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "しました。"
          }
        ]
      }
    ],
    "translation": [
      "Saya membeli tiga apel dan dua roti. Pembicara juga memberi detail jumlah, durasi, atau frekuensi yang perlu dibedakan."
    ],
    "grammarTargets": [
      "ch11-counter"
    ],
    "vocabularyHelp": [
      {
        "japanese": "学生",
        "reading": "がくせい",
        "meaning": "siswa / pelajar"
      },
      {
        "japanese": "学校",
        "reading": "がっこう",
        "meaning": "sekolah"
      },
      {
        "japanese": "予定",
        "reading": "よてい",
        "meaning": "rencana / jadwal"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      }
    ],
    "questions": [
      {
        "id": "listening-b11-05-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "りんごを三つ、パンを二つ買いました。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "りんごを三つ、パンを二つ買いました。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "りんごを三つ、パンを二つ買いました。"
      },
      {
        "id": "listening-b11-05-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "十五分",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "十五分",
        "explanation": "Audio menyebut 「十五分」 secara langsung.",
        "evidence": "学校の入口まで十五分ぐらいです。"
      },
      {
        "id": "listening-b11-05-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "学校の入口",
          "病院",
          "空港",
          "別の時間です。"
        ],
        "correctAnswer": "学校の入口",
        "explanation": "Audio menyebut lokasi 「学校の入口」.",
        "evidence": "学校の入口まで十五分ぐらいです。"
      },
      {
        "id": "listening-b11-05-q4",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "山田さん、予定を確認しましょう。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "山田さん、予定を確認しましょう。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "山田さん、予定を確認しましょう。"
      },
      {
        "id": "listening-b11-05-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "学校の入口まで十五分ぐらいです。",
          "図書館の入口まで十五分ぐらいです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "学校の入口まで十五分ぐらいです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "学校の入口まで十五分ぐらいです。"
      }
    ],
    "estimatedDuration": 32
  },
  {
    "id": "listening-b12-01",
    "chapter": 12,
    "order": 1,
    "title": "友だちとの会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "conversation",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "鈴木さん、"
          },
          {
            "text": "少",
            "reading": "すこ"
          },
          {
            "text": "し"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "してもいいですか。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "昨日",
            "reading": "きのう"
          },
          {
            "text": "は"
          },
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "より"
          },
          {
            "text": "寒",
            "reading": "さむ"
          },
          {
            "text": "かったです。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "昨日",
            "reading": "きのう"
          },
          {
            "text": "は"
          },
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "より"
          },
          {
            "text": "寒",
            "reading": "さむ"
          },
          {
            "text": "かったです。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "はバスより"
          },
          {
            "text": "速",
            "reading": "はや"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "この"
          },
          {
            "text": "中",
            "reading": "なか"
          },
          {
            "text": "で赤いかばんが"
          },
          {
            "text": "一番",
            "reading": "いちばん"
          },
          {
            "text": "安",
            "reading": "やす"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "先週",
            "reading": "せんしゅう"
          },
          {
            "text": "の"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "は"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Kemarin lebih dingin daripada hari ini. Pembicara juga membahas keadaan lampau dan perbandingan sederhana."
    ],
    "grammarTargets": [
      "ch12-yori"
    ],
    "vocabularyHelp": [
      {
        "japanese": "電車",
        "reading": "でんしゃ",
        "meaning": "kereta"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      }
    ],
    "questions": [
      {
        "id": "listening-b12-01-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "昨日は今日より寒かったです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "昨日は今日より寒かったです。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "昨日は今日より寒かったです。"
      },
      {
        "id": "listening-b12-01-q2",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "鈴木さん、少し確認してもいいですか。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "鈴木さん、少し確認してもいいですか。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "鈴木さん、少し確認してもいいですか。"
      },
      {
        "id": "listening-b12-01-q3",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "電車はバスより速いです。",
          "バスはバスより速いです。",
          "電車は電車より速いです。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "電車はバスより速いです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "電車はバスより速いです。"
      },
      {
        "id": "listening-b12-01-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "この中で赤いかばんが一番安いです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "この中で赤いかばんが一番安いです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "この中で赤いかばんが一番安いです。"
      },
      {
        "id": "listening-b12-01-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "先週の店は静かでした。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "先週の店は静かでした。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "先週の店は静かでした。"
      }
    ],
    "estimatedDuration": 30
  },
  {
    "id": "listening-b12-02",
    "chapter": 12,
    "order": 2,
    "title": "今日の案内",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "information",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "とバスと、どちらが"
          },
          {
            "text": "速",
            "reading": "はや"
          },
          {
            "text": "いですか。"
          },
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "のほうが"
          },
          {
            "text": "速",
            "reading": "はや"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "はバスより"
          },
          {
            "text": "速",
            "reading": "はや"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "この"
          },
          {
            "text": "中",
            "reading": "なか"
          },
          {
            "text": "で赤いかばんが"
          },
          {
            "text": "一番",
            "reading": "いちばん"
          },
          {
            "text": "安",
            "reading": "やす"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "先週",
            "reading": "せんしゅう"
          },
          {
            "text": "の"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "は"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "昨日",
            "reading": "きのう"
          },
          {
            "text": "は"
          },
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "より"
          },
          {
            "text": "寒",
            "reading": "さむ"
          },
          {
            "text": "かったです。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "時間",
            "reading": "じかん"
          },
          {
            "text": "や"
          },
          {
            "text": "場所",
            "reading": "ばしょ"
          },
          {
            "text": "を間違えないように"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "してください。"
          }
        ]
      }
    ],
    "translation": [
      "Kereta lebih cepat daripada bus. Pembicara juga membahas keadaan lampau dan perbandingan sederhana."
    ],
    "grammarTargets": [
      "ch12-dochiraga"
    ],
    "vocabularyHelp": [
      {
        "japanese": "電車",
        "reading": "でんしゃ",
        "meaning": "kereta"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      },
      {
        "japanese": "場所",
        "reading": "ばしょ",
        "meaning": "tempat"
      }
    ],
    "questions": [
      {
        "id": "listening-b12-02-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "電車とバスと、どちらが速いですか。電車のほうが速いです。",
          "バスとバスと、どちらが速いですか。電車のほうが速いです。",
          "電車と電車と、どちらが速いですか。電車のほうが速いです。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "電車とバスと、どちらが速いですか。電車のほうが速いです。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "電車とバスと、どちらが速いですか。電車のほうが速いです。"
      },
      {
        "id": "listening-b12-02-q2",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "時間や場所を間違えないように確認してください。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "時間や場所を間違えないように確認してください。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "時間や場所を間違えないように確認してください。"
      },
      {
        "id": "listening-b12-02-q3",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "電車はバスより速いです。",
          "バスはバスより速いです。",
          "電車は電車より速いです。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "電車はバスより速いです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "電車はバスより速いです。"
      },
      {
        "id": "listening-b12-02-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "この中で赤いかばんが一番安いです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "この中で赤いかばんが一番安いです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "この中で赤いかばんが一番安いです。"
      },
      {
        "id": "listening-b12-02-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "先週の店は静かでした。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "先週の店は静かでした。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "先週の店は静かでした。"
      }
    ],
    "estimatedDuration": 33
  },
  {
    "id": "listening-b12-03",
    "chapter": 12,
    "order": 3,
    "title": "出発前の会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "travel",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "ミラさん、"
          },
          {
            "text": "予定",
            "reading": "よてい"
          },
          {
            "text": "を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "しましょう。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "旅行",
            "reading": "りょこう"
          },
          {
            "text": "で"
          },
          {
            "text": "京都",
            "reading": "きょうと"
          },
          {
            "text": "が"
          },
          {
            "text": "一番",
            "reading": "いちばん"
          },
          {
            "text": "楽",
            "reading": "たの"
          },
          {
            "text": "しかったです。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "この"
          },
          {
            "text": "中",
            "reading": "なか"
          },
          {
            "text": "で赤いかばんが"
          },
          {
            "text": "一番",
            "reading": "いちばん"
          },
          {
            "text": "安",
            "reading": "やす"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "先週",
            "reading": "せんしゅう"
          },
          {
            "text": "の"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "は"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "昨日",
            "reading": "きのう"
          },
          {
            "text": "は"
          },
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "より"
          },
          {
            "text": "寒",
            "reading": "さむ"
          },
          {
            "text": "かったです。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "はバスより"
          },
          {
            "text": "速",
            "reading": "はや"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "ミラ",
        "segments": [
          {
            "text": "はい。"
          },
          {
            "text": "時間",
            "reading": "じかん"
          },
          {
            "text": "と"
          },
          {
            "text": "場所",
            "reading": "ばしょ"
          },
          {
            "text": "を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "しました。"
          }
        ]
      }
    ],
    "translation": [
      "Dalam perjalanan, Kyoto adalah yang paling menyenangkan. Pembicara juga membahas keadaan lampau dan perbandingan sederhana."
    ],
    "grammarTargets": [
      "ch12-ichiban"
    ],
    "vocabularyHelp": [
      {
        "japanese": "電車",
        "reading": "でんしゃ",
        "meaning": "kereta"
      },
      {
        "japanese": "旅行",
        "reading": "りょこう",
        "meaning": "perjalanan"
      },
      {
        "japanese": "予定",
        "reading": "よてい",
        "meaning": "rencana / jadwal"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      }
    ],
    "questions": [
      {
        "id": "listening-b12-03-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "旅行で京都が一番楽しかったです。",
          "旅行で東京が一番楽しかったです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "旅行で京都が一番楽しかったです。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "旅行で京都が一番楽しかったです。"
      },
      {
        "id": "listening-b12-03-q2",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "ミラさん、予定を確認しましょう。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "ミラさん、予定を確認しましょう。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "ミラさん、予定を確認しましょう。"
      },
      {
        "id": "listening-b12-03-q3",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "この中で赤いかばんが一番安いです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "この中で赤いかばんが一番安いです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "この中で赤いかばんが一番安いです。"
      },
      {
        "id": "listening-b12-03-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "先週の店は静かでした。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "先週の店は静かでした。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "先週の店は静かでした。"
      },
      {
        "id": "listening-b12-03-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "昨日は今日より寒かったです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "昨日は今日より寒かったです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "昨日は今日より寒かったです。"
      }
    ],
    "estimatedDuration": 32
  },
  {
    "id": "listening-b12-04",
    "chapter": 12,
    "order": 4,
    "title": "店での会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "shopping",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "いらっしゃいませ。ご案内します。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "先週",
            "reading": "せんしゅう"
          },
          {
            "text": "の"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "は"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。でも、"
          },
          {
            "text": "料理",
            "reading": "りょうり"
          },
          {
            "text": "は"
          },
          {
            "text": "高",
            "reading": "たか"
          },
          {
            "text": "かったです。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "先週",
            "reading": "せんしゅう"
          },
          {
            "text": "の"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "は"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "昨日",
            "reading": "きのう"
          },
          {
            "text": "は"
          },
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "より"
          },
          {
            "text": "寒",
            "reading": "さむ"
          },
          {
            "text": "かったです。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "はバスより"
          },
          {
            "text": "速",
            "reading": "はや"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "この"
          },
          {
            "text": "中",
            "reading": "なか"
          },
          {
            "text": "で赤いかばんが"
          },
          {
            "text": "一番",
            "reading": "いちばん"
          },
          {
            "text": "安",
            "reading": "やす"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "客",
        "segments": [
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。ありがとうございます。"
          }
        ]
      }
    ],
    "translation": [
      "Toko minggu lalu tenang, tetapi makanannya mahal. Pembicara juga membahas keadaan lampau dan perbandingan sederhana."
    ],
    "grammarTargets": [
      "ch12-na-past"
    ],
    "vocabularyHelp": [
      {
        "japanese": "電車",
        "reading": "でんしゃ",
        "meaning": "kereta"
      },
      {
        "japanese": "料理",
        "reading": "りょうり",
        "meaning": "masakan"
      }
    ],
    "questions": [
      {
        "id": "listening-b12-04-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "先週の店は静かでした。でも、料理は高かったです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "先週の店は静かでした。でも、料理は高かったです。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "先週の店は静かでした。でも、料理は高かったです。"
      },
      {
        "id": "listening-b12-04-q2",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "いらっしゃいませ。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "いらっしゃいませ。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "いらっしゃいませ。"
      },
      {
        "id": "listening-b12-04-q3",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "ご案内します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "ご案内します。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "ご案内します。"
      },
      {
        "id": "listening-b12-04-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "昨日は今日より寒かったです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "昨日は今日より寒かったです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "昨日は今日より寒かったです。"
      },
      {
        "id": "listening-b12-04-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "電車はバスより速いです。",
          "バスはバスより速いです。",
          "電車は電車より速いです。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "電車はバスより速いです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "電車はバスより速いです。"
      }
    ],
    "estimatedDuration": 35
  },
  {
    "id": "listening-b12-05",
    "chapter": 12,
    "order": 5,
    "title": "短い会話",
    "jlptLevel": "N5",
    "difficulty": "Menantang",
    "type": "dialogue",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "ミラ",
        "segments": [
          {
            "text": "田中",
            "reading": "たなか"
          },
          {
            "text": "さん、"
          },
          {
            "text": "少",
            "reading": "すこ"
          },
          {
            "text": "し"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "してもいいですか。"
          }
        ]
      },
      {
        "speaker": "ミラ",
        "segments": [
          {
            "text": "去年",
            "reading": "きょねん"
          },
          {
            "text": "の"
          },
          {
            "text": "冬",
            "reading": "ふゆ"
          },
          {
            "text": "はあまり"
          },
          {
            "text": "寒",
            "reading": "さむ"
          },
          {
            "text": "くなかったです。"
          }
        ]
      },
      {
        "speaker": "ミラ",
        "segments": [
          {
            "text": "昨日",
            "reading": "きのう"
          },
          {
            "text": "は"
          },
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "より"
          },
          {
            "text": "寒",
            "reading": "さむ"
          },
          {
            "text": "かったです。"
          }
        ]
      },
      {
        "speaker": "ミラ",
        "segments": [
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "はバスより"
          },
          {
            "text": "速",
            "reading": "はや"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "ミラ",
        "segments": [
          {
            "text": "この"
          },
          {
            "text": "中",
            "reading": "なか"
          },
          {
            "text": "で赤いかばんが"
          },
          {
            "text": "一番",
            "reading": "いちばん"
          },
          {
            "text": "安",
            "reading": "やす"
          },
          {
            "text": "いです。"
          }
        ]
      },
      {
        "speaker": "ミラ",
        "segments": [
          {
            "text": "先週",
            "reading": "せんしゅう"
          },
          {
            "text": "の"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "は"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Musim dingin tahun lalu tidak terlalu dingin. Pembicara juga membahas keadaan lampau dan perbandingan sederhana."
    ],
    "grammarTargets": [
      "ch12-i-past-negative"
    ],
    "vocabularyHelp": [
      {
        "japanese": "電車",
        "reading": "でんしゃ",
        "meaning": "kereta"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      }
    ],
    "questions": [
      {
        "id": "listening-b12-05-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "去年の冬はあまり寒くなかったです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "去年の冬はあまり寒くなかったです。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "去年の冬はあまり寒くなかったです。"
      },
      {
        "id": "listening-b12-05-q2",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "田中さん、少し確認してもいいですか。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "田中さん、少し確認してもいいですか。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "田中さん、少し確認してもいいですか。"
      },
      {
        "id": "listening-b12-05-q3",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "昨日は今日より寒かったです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "昨日は今日より寒かったです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "昨日は今日より寒かったです。"
      },
      {
        "id": "listening-b12-05-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "電車はバスより速いです。",
          "バスはバスより速いです。",
          "電車は電車より速いです。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "電車はバスより速いです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "電車はバスより速いです。"
      },
      {
        "id": "listening-b12-05-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "この中で赤いかばんが一番安いです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "この中で赤いかばんが一番安いです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "この中で赤いかばんが一番安いです。"
      }
    ],
    "estimatedDuration": 31
  },
  {
    "id": "listening-b13-01",
    "chapter": 13,
    "order": 1,
    "title": "友だちとの会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "conversation",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "アユさん、"
          },
          {
            "text": "少",
            "reading": "すこ"
          },
          {
            "text": "し"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "してもいいですか。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "新",
            "reading": "あたら"
          },
          {
            "text": "しい"
          },
          {
            "text": "辞書",
            "reading": "じしょ"
          },
          {
            "text": "がほしいです。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "新",
            "reading": "あたら"
          },
          {
            "text": "しい"
          },
          {
            "text": "傘",
            "reading": "かさ"
          },
          {
            "text": "がほしいです。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "は"
          },
          {
            "text": "教室",
            "reading": "きょうしつ"
          },
          {
            "text": "へ行きたいです。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "は"
          },
          {
            "text": "外",
            "reading": "そと"
          },
          {
            "text": "で"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べたくないです。"
          }
        ]
      },
      {
        "speaker": "アリ",
        "segments": [
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "へ"
          },
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "を"
          },
          {
            "text": "迎",
            "reading": "むか"
          },
          {
            "text": "えに行きます。"
          }
        ]
      },
      {
        "speaker": "アユ",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Saya ingin kamus baru. Pembicara juga membahas keinginan serta tujuan melakukan suatu kegiatan."
    ],
    "grammarTargets": [
      "ch13-hoshii"
    ],
    "vocabularyHelp": [
      {
        "japanese": "友だち",
        "reading": "ともだち",
        "meaning": "teman"
      },
      {
        "japanese": "辞書",
        "reading": "じしょ",
        "meaning": "kamus"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      },
      {
        "japanese": "傘",
        "reading": "かさ",
        "meaning": "payung"
      }
    ],
    "questions": [
      {
        "id": "listening-b13-01-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "私は新しい辞書がほしいです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "私は新しい辞書がほしいです。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "私は新しい辞書がほしいです。"
      },
      {
        "id": "listening-b13-01-q2",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "教室",
          "駅",
          "病院",
          "空港"
        ],
        "correctAnswer": "教室",
        "explanation": "Audio menyebut lokasi 「教室」.",
        "evidence": "友だちは教室へ行きたいです。"
      },
      {
        "id": "listening-b13-01-q3",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "傘",
          "財布",
          "カメラ",
          "別の時間です。"
        ],
        "correctAnswer": "傘",
        "explanation": "「傘」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "私は新しい傘がほしいです。"
      },
      {
        "id": "listening-b13-01-q4",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "アユさん、少し確認してもいいですか。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "アユさん、少し確認してもいいですか。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "アユさん、少し確認してもいいですか。"
      },
      {
        "id": "listening-b13-01-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "私は新しい傘がほしいです。",
          "私は新しいノートがほしいです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "私は新しい傘がほしいです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "私は新しい傘がほしいです。"
      }
    ],
    "estimatedDuration": 30
  },
  {
    "id": "listening-b13-02",
    "chapter": 13,
    "order": 2,
    "title": "出発前の会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "travel",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "ミラさん、"
          },
          {
            "text": "予定",
            "reading": "よてい"
          },
          {
            "text": "を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "しましょう。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "夏休",
            "reading": "なつやす"
          },
          {
            "text": "みに"
          },
          {
            "text": "北海道",
            "reading": "ほっかいどう"
          },
          {
            "text": "へ行きたいです。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "は"
          },
          {
            "text": "公園",
            "reading": "こうえん"
          },
          {
            "text": "の"
          },
          {
            "text": "入口",
            "reading": "いりぐち"
          },
          {
            "text": "へ行きたいです。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "は"
          },
          {
            "text": "外",
            "reading": "そと"
          },
          {
            "text": "で"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べたくないです。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "へ"
          },
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "を"
          },
          {
            "text": "迎",
            "reading": "むか"
          },
          {
            "text": "えに行きます。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "新",
            "reading": "あたら"
          },
          {
            "text": "しいノートがほしいです。"
          }
        ]
      },
      {
        "speaker": "ミラ",
        "segments": [
          {
            "text": "はい。"
          },
          {
            "text": "時間",
            "reading": "じかん"
          },
          {
            "text": "と"
          },
          {
            "text": "場所",
            "reading": "ばしょ"
          },
          {
            "text": "を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "しました。"
          }
        ]
      }
    ],
    "translation": [
      "Saya ingin pergi ke Hokkaido saat libur musim panas. Pembicara juga membahas keinginan serta tujuan melakukan suatu kegiatan."
    ],
    "grammarTargets": [
      "ch13-tai"
    ],
    "vocabularyHelp": [
      {
        "japanese": "友だち",
        "reading": "ともだち",
        "meaning": "teman"
      },
      {
        "japanese": "北海道",
        "reading": "ほっかいどう",
        "meaning": "Hokkaido"
      },
      {
        "japanese": "公園",
        "reading": "こうえん",
        "meaning": "taman"
      },
      {
        "japanese": "予定",
        "reading": "よてい",
        "meaning": "rencana / jadwal"
      }
    ],
    "questions": [
      {
        "id": "listening-b13-02-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "夏休みに北海道へ行きたいです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "夏休みに北海道へ行きたいです。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "夏休みに北海道へ行きたいです。"
      },
      {
        "id": "listening-b13-02-q2",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "公園の入口",
          "駅",
          "病院",
          "空港"
        ],
        "correctAnswer": "公園の入口",
        "explanation": "Audio menyebut lokasi 「公園の入口」.",
        "evidence": "友だちは公園の入口へ行きたいです。"
      },
      {
        "id": "listening-b13-02-q3",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "ノート",
          "財布",
          "カメラ",
          "別の時間です。"
        ],
        "correctAnswer": "ノート",
        "explanation": "「ノート」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "私は新しいノートがほしいです。"
      },
      {
        "id": "listening-b13-02-q4",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "ミラさん、予定を確認しましょう。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "ミラさん、予定を確認しましょう。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "ミラさん、予定を確認しましょう。"
      },
      {
        "id": "listening-b13-02-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "友だちは公園の入口へ行きたいです。",
          "友だちは図書館の入口へ行きたいです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "友だちは公園の入口へ行きたいです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "友だちは公園の入口へ行きたいです。"
      }
    ],
    "estimatedDuration": 33
  },
  {
    "id": "listening-b13-03",
    "chapter": 13,
    "order": 3,
    "title": "店での会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "shopping",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "いらっしゃいませ。ご案内します。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "は"
          },
          {
            "text": "外",
            "reading": "そと"
          },
          {
            "text": "で"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べたくないです。"
          },
          {
            "text": "家",
            "reading": "いえ"
          },
          {
            "text": "で"
          },
          {
            "text": "料理",
            "reading": "りょうり"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "は"
          },
          {
            "text": "外",
            "reading": "そと"
          },
          {
            "text": "で"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べたくないです。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "へ"
          },
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "を"
          },
          {
            "text": "迎",
            "reading": "むか"
          },
          {
            "text": "えに行きます。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "新",
            "reading": "あたら"
          },
          {
            "text": "しい"
          },
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "の"
          },
          {
            "text": "本",
            "reading": "ほん"
          },
          {
            "text": "がほしいです。"
          }
        ]
      },
      {
        "speaker": "店員",
        "segments": [
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "は"
          },
          {
            "text": "学校",
            "reading": "がっこう"
          },
          {
            "text": "の"
          },
          {
            "text": "入口",
            "reading": "いりぐち"
          },
          {
            "text": "へ行きたいです。"
          }
        ]
      },
      {
        "speaker": "客",
        "segments": [
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。ありがとうございます。"
          }
        ]
      }
    ],
    "translation": [
      "Hari ini saya tidak ingin makan di luar dan akan memasak di rumah. Pembicara juga membahas keinginan serta tujuan melakukan suatu kegiatan."
    ],
    "grammarTargets": [
      "ch13-takunai"
    ],
    "vocabularyHelp": [
      {
        "japanese": "日本語",
        "reading": "にほんご",
        "meaning": "bahasa Jepang"
      },
      {
        "japanese": "友だち",
        "reading": "ともだち",
        "meaning": "teman"
      },
      {
        "japanese": "学校",
        "reading": "がっこう",
        "meaning": "sekolah"
      },
      {
        "japanese": "料理",
        "reading": "りょうり",
        "meaning": "masakan"
      }
    ],
    "questions": [
      {
        "id": "listening-b13-03-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "今日は外で食べたくないです。家で料理します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "今日は外で食べたくないです。家で料理します。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "今日は外で食べたくないです。家で料理します。"
      },
      {
        "id": "listening-b13-03-q2",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "学校の入口",
          "駅",
          "病院",
          "空港"
        ],
        "correctAnswer": "学校の入口",
        "explanation": "Audio menyebut lokasi 「学校の入口」.",
        "evidence": "友だちは学校の入口へ行きたいです。"
      },
      {
        "id": "listening-b13-03-q3",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "日本語の本",
          "財布",
          "カメラ",
          "別の時間です。"
        ],
        "correctAnswer": "日本語の本",
        "explanation": "「日本語の本」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "私は新しい日本語の本がほしいです。"
      },
      {
        "id": "listening-b13-03-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "いらっしゃいませ。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "いらっしゃいませ。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "いらっしゃいませ。"
      },
      {
        "id": "listening-b13-03-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "ご案内します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "ご案内します。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "ご案内します。"
      }
    ],
    "estimatedDuration": 37
  },
  {
    "id": "listening-b13-04",
    "chapter": 13,
    "order": 4,
    "title": "クラスでの確認",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "school",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "みなさん、"
          },
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "の内容を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "へ"
          },
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "を"
          },
          {
            "text": "迎",
            "reading": "むか"
          },
          {
            "text": "えに行きます。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "へ"
          },
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "を"
          },
          {
            "text": "迎",
            "reading": "むか"
          },
          {
            "text": "えに行きます。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "新",
            "reading": "あたら"
          },
          {
            "text": "しい"
          },
          {
            "text": "青",
            "reading": "あお"
          },
          {
            "text": "いかばんがほしいです。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "は"
          },
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "の"
          },
          {
            "text": "東口",
            "reading": "ひがしぐち"
          },
          {
            "text": "へ行きたいです。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "は"
          },
          {
            "text": "外",
            "reading": "そと"
          },
          {
            "text": "で"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べたくないです。"
          }
        ]
      },
      {
        "speaker": "学生",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Saya pergi ke stasiun untuk menjemput teman. Pembicara juga membahas keinginan serta tujuan melakukan suatu kegiatan."
    ],
    "grammarTargets": [
      "ch13-purpose-ni"
    ],
    "vocabularyHelp": [
      {
        "japanese": "友だち",
        "reading": "ともだち",
        "meaning": "teman"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      },
      {
        "japanese": "駅",
        "reading": "えき",
        "meaning": "stasiun"
      }
    ],
    "questions": [
      {
        "id": "listening-b13-04-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "駅へ友だちを迎えに行きます。",
          "駅へ友だちを迎えに行きません。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "駅へ友だちを迎えに行きます。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "駅へ友だちを迎えに行きます。"
      },
      {
        "id": "listening-b13-04-q2",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "駅の東口",
          "病院",
          "空港",
          "別の時間です。"
        ],
        "correctAnswer": "駅の東口",
        "explanation": "Audio menyebut lokasi 「駅の東口」.",
        "evidence": "友だちは駅の東口へ行きたいです。"
      },
      {
        "id": "listening-b13-04-q3",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "青いかばん",
          "財布",
          "カメラ",
          "別の時間です。"
        ],
        "correctAnswer": "青いかばん",
        "explanation": "「青いかばん」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "私は新しい青いかばんがほしいです。"
      },
      {
        "id": "listening-b13-04-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "みなさん、今日の内容を確認します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "みなさん、今日の内容を確認します。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "みなさん、今日の内容を確認します。"
      },
      {
        "id": "listening-b13-04-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "私は新しい青いかばんがほしいです。",
          "私は新しい黒いかばんがほしいです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "私は新しい青いかばんがほしいです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "私は新しい青いかばんがほしいです。"
      }
    ],
    "estimatedDuration": 32
  },
  {
    "id": "listening-b13-05",
    "chapter": 13,
    "order": 5,
    "title": "短い会話",
    "jlptLevel": "N5",
    "difficulty": "Menantang",
    "type": "dialogue",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "リナさん、"
          },
          {
            "text": "少",
            "reading": "すこ"
          },
          {
            "text": "し"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "してもいいですか。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "図書館",
            "reading": "としょかん"
          },
          {
            "text": "へ"
          },
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "の"
          },
          {
            "text": "本",
            "reading": "ほん"
          },
          {
            "text": "を"
          },
          {
            "text": "借",
            "reading": "か"
          },
          {
            "text": "りに行きます。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "新",
            "reading": "あたら"
          },
          {
            "text": "しい"
          },
          {
            "text": "資料",
            "reading": "しりょう"
          },
          {
            "text": "がほしいです。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "は"
          },
          {
            "text": "図書館",
            "reading": "としょかん"
          },
          {
            "text": "の"
          },
          {
            "text": "前",
            "reading": "まえ"
          },
          {
            "text": "へ行きたいです。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "は"
          },
          {
            "text": "外",
            "reading": "そと"
          },
          {
            "text": "で"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べたくないです。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "へ"
          },
          {
            "text": "友だち",
            "reading": "ともだち"
          },
          {
            "text": "を"
          },
          {
            "text": "迎",
            "reading": "むか"
          },
          {
            "text": "えに行きます。"
          }
        ]
      },
      {
        "speaker": "リナ",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Saya pergi ke perpustakaan untuk meminjam buku bahasa Jepang. Pembicara juga membahas keinginan serta tujuan melakukan suatu kegiatan."
    ],
    "grammarTargets": [
      "ch13-purpose-ni"
    ],
    "vocabularyHelp": [
      {
        "japanese": "日本語",
        "reading": "にほんご",
        "meaning": "bahasa Jepang"
      },
      {
        "japanese": "友だち",
        "reading": "ともだち",
        "meaning": "teman"
      },
      {
        "japanese": "図書館",
        "reading": "としょかん",
        "meaning": "perpustakaan"
      },
      {
        "japanese": "資料",
        "reading": "しりょう",
        "meaning": "dokumen / materi"
      }
    ],
    "questions": [
      {
        "id": "listening-b13-05-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "図書館へ日本語の本を借りに行きます。",
          "学校へ日本語の本を借りに行きます。",
          "図書館へ英語の本を借りに行きます。",
          "図書館へ日本語の本を借りに行きません。"
        ],
        "correctAnswer": "図書館へ日本語の本を借りに行きます。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "図書館へ日本語の本を借りに行きます。"
      },
      {
        "id": "listening-b13-05-q2",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "図書館の前",
          "駅",
          "病院",
          "空港"
        ],
        "correctAnswer": "図書館の前",
        "explanation": "Audio menyebut lokasi 「図書館の前」.",
        "evidence": "友だちは図書館の前へ行きたいです。"
      },
      {
        "id": "listening-b13-05-q3",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "日本語の本",
          "資料",
          "財布",
          "カメラ"
        ],
        "correctAnswer": "日本語の本",
        "explanation": "「日本語の本」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "図書館へ日本語の本を借りに行きます。"
      },
      {
        "id": "listening-b13-05-q4",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "リナさん、少し確認してもいいですか。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "リナさん、少し確認してもいいですか。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "リナさん、少し確認してもいいですか。"
      },
      {
        "id": "listening-b13-05-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "私は新しい資料がほしいです。",
          "私は新しいノートがほしいです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "私は新しい資料がほしいです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "私は新しい資料がほしいです。"
      }
    ],
    "estimatedDuration": 33
  },
  {
    "id": "listening-b14-01",
    "chapter": 14,
    "order": 1,
    "title": "友だちとの会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "conversation",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "ミラさん、"
          },
          {
            "text": "少",
            "reading": "すこ"
          },
          {
            "text": "し"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "してもいいですか。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "この"
          },
          {
            "text": "名前",
            "reading": "なまえ"
          },
          {
            "text": "をここに"
          },
          {
            "text": "書",
            "reading": "か"
          },
          {
            "text": "いてください。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "明日",
            "reading": "あした"
          },
          {
            "text": "は"
          },
          {
            "text": "午後三時",
            "reading": "ごごさんじ"
          },
          {
            "text": "に"
          },
          {
            "text": "公園",
            "reading": "こうえん"
          },
          {
            "text": "の"
          },
          {
            "text": "入口",
            "reading": "いりぐち"
          },
          {
            "text": "で"
          },
          {
            "text": "会",
            "reading": "あ"
          },
          {
            "text": "います。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "ノートを"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "を"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "雨",
            "reading": "あめ"
          },
          {
            "text": "ですから、"
          },
          {
            "text": "傘",
            "reading": "かさ"
          },
          {
            "text": "を"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "終",
            "reading": "お"
          },
          {
            "text": "わります。それから、"
          },
          {
            "text": "駅前",
            "reading": "えきまえ"
          },
          {
            "text": "のカフェで"
          },
          {
            "text": "昼ご飯",
            "reading": "ひるごはん"
          },
          {
            "text": "を"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べます。"
          }
        ]
      },
      {
        "speaker": "鈴木さん",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "前",
            "reading": "まえ"
          },
          {
            "text": "にその"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "へ行きました。とても"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "ミラ",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Silakan tulis nama ini di sini. Pembicara juga memberi permintaan, kegiatan yang sedang berlangsung, atau urutan setelah suatu tindakan."
    ],
    "grammarTargets": [
      "ch14-tekudasai"
    ],
    "vocabularyHelp": [
      {
        "japanese": "日本語",
        "reading": "にほんご",
        "meaning": "bahasa Jepang"
      },
      {
        "japanese": "公園",
        "reading": "こうえん",
        "meaning": "taman"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      },
      {
        "japanese": "本",
        "reading": "ほん",
        "meaning": "buku"
      }
    ],
    "questions": [
      {
        "id": "listening-b14-01-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "この名前をここに書いてください。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "この名前をここに書いてください。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "この名前をここに書いてください。"
      },
      {
        "id": "listening-b14-01-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "午後三時",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "午後三時",
        "explanation": "Audio menyebut 「午後三時」 secara langsung.",
        "evidence": "明日は午後三時に公園の入口で会います。"
      },
      {
        "id": "listening-b14-01-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "駅前のカフェ",
          "公園の入口",
          "病院",
          "空港"
        ],
        "correctAnswer": "駅前のカフェ",
        "explanation": "Audio menyebut lokasi 「駅前のカフェ」.",
        "evidence": "それから、駅前のカフェで昼ご飯を食べます。"
      },
      {
        "id": "listening-b14-01-q4",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "ノート",
          "昼ご飯",
          "傘",
          "財布"
        ],
        "correctAnswer": "ノート",
        "explanation": "「ノート」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "ノートを持っていきます。"
      },
      {
        "id": "listening-b14-01-q5",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "ミラさん、少し確認してもいいですか。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "ミラさん、少し確認してもいいですか。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "ミラさん、少し確認してもいいですか。"
      }
    ],
    "estimatedDuration": 49
  },
  {
    "id": "listening-b14-02",
    "chapter": 14,
    "order": 2,
    "title": "説明を聞く",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "instruction",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "これから"
          },
          {
            "text": "説明",
            "reading": "せつめい"
          },
          {
            "text": "します。順番に"
          },
          {
            "text": "聞",
            "reading": "き"
          },
          {
            "text": "いてください。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "今、"
          },
          {
            "text": "田中",
            "reading": "たなか"
          },
          {
            "text": "さんは"
          },
          {
            "text": "電話",
            "reading": "でんわ"
          },
          {
            "text": "で"
          },
          {
            "text": "話",
            "reading": "はな"
          },
          {
            "text": "しています。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "の"
          },
          {
            "text": "本",
            "reading": "ほん"
          },
          {
            "text": "を"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "を"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "雨",
            "reading": "あめ"
          },
          {
            "text": "ですから、"
          },
          {
            "text": "傘",
            "reading": "かさ"
          },
          {
            "text": "を"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "終",
            "reading": "お"
          },
          {
            "text": "わります。それから、"
          },
          {
            "text": "駅前",
            "reading": "えきまえ"
          },
          {
            "text": "のカフェで"
          },
          {
            "text": "昼ご飯",
            "reading": "ひるごはん"
          },
          {
            "text": "を"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べます。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "前",
            "reading": "まえ"
          },
          {
            "text": "にその"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "へ行きました。とても"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "明日",
            "reading": "あした"
          },
          {
            "text": "は"
          },
          {
            "text": "七時",
            "reading": "しちじ"
          },
          {
            "text": "半に"
          },
          {
            "text": "学校",
            "reading": "がっこう"
          },
          {
            "text": "の"
          },
          {
            "text": "入口",
            "reading": "いりぐち"
          },
          {
            "text": "で"
          },
          {
            "text": "会",
            "reading": "あ"
          },
          {
            "text": "います。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "からないことは、最後に"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "してください。"
          }
        ]
      }
    ],
    "translation": [
      "Tanaka sedang berbicara melalui telepon. Pembicara juga memberi permintaan, kegiatan yang sedang berlangsung, atau urutan setelah suatu tindakan."
    ],
    "grammarTargets": [
      "ch14-teiru-progress"
    ],
    "vocabularyHelp": [
      {
        "japanese": "日本語",
        "reading": "にほんご",
        "meaning": "bahasa Jepang"
      },
      {
        "japanese": "学校",
        "reading": "がっこう",
        "meaning": "sekolah"
      },
      {
        "japanese": "電話",
        "reading": "でんわ",
        "meaning": "telepon"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      }
    ],
    "questions": [
      {
        "id": "listening-b14-02-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "今、田中さんは電話で話しています。",
          "今、田中さんは電話で話していません。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "今、田中さんは電話で話しています。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "今、田中さんは電話で話しています。"
      },
      {
        "id": "listening-b14-02-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "七時半",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "七時半",
        "explanation": "Audio menyebut 「七時半」 secara langsung.",
        "evidence": "明日は七時半に学校の入口で会います。"
      },
      {
        "id": "listening-b14-02-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "駅前のカフェ",
          "学校の入口",
          "病院",
          "空港"
        ],
        "correctAnswer": "駅前のカフェ",
        "explanation": "Audio menyebut lokasi 「駅前のカフェ」.",
        "evidence": "それから、駅前のカフェで昼ご飯を食べます。"
      },
      {
        "id": "listening-b14-02-q4",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "日本語の本",
          "昼ご飯",
          "傘",
          "財布"
        ],
        "correctAnswer": "日本語の本",
        "explanation": "「日本語の本」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "日本語の本を持っていきます。"
      },
      {
        "id": "listening-b14-02-q5",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "分からないことは、最後に確認してください。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "分からないことは、最後に確認してください。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "分からないことは、最後に確認してください。"
      }
    ],
    "estimatedDuration": 54
  },
  {
    "id": "listening-b14-03",
    "chapter": 14,
    "order": 3,
    "title": "クラスでの確認",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "school",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "みなさん、"
          },
          {
            "text": "今日",
            "reading": "きょう"
          },
          {
            "text": "の内容を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "荷物",
            "reading": "にもつ"
          },
          {
            "text": "を"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "ちましょうか。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "を"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "雨",
            "reading": "あめ"
          },
          {
            "text": "ですから、"
          },
          {
            "text": "傘",
            "reading": "かさ"
          },
          {
            "text": "を"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "終",
            "reading": "お"
          },
          {
            "text": "わります。それから、"
          },
          {
            "text": "駅前",
            "reading": "えきまえ"
          },
          {
            "text": "のカフェで"
          },
          {
            "text": "昼ご飯",
            "reading": "ひるごはん"
          },
          {
            "text": "を"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べます。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "前",
            "reading": "まえ"
          },
          {
            "text": "にその"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "へ行きました。とても"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "明日",
            "reading": "あした"
          },
          {
            "text": "は"
          },
          {
            "text": "八時",
            "reading": "はちじ"
          },
          {
            "text": "に"
          },
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "の"
          },
          {
            "text": "東口",
            "reading": "ひがしぐち"
          },
          {
            "text": "で"
          },
          {
            "text": "会",
            "reading": "あ"
          },
          {
            "text": "います。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "青",
            "reading": "あお"
          },
          {
            "text": "いかばんを"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "学生",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Bolehkah saya membawakan barangnya? Pembicara juga memberi permintaan, kegiatan yang sedang berlangsung, atau urutan setelah suatu tindakan."
    ],
    "grammarTargets": [
      "ch14-mashouka"
    ],
    "vocabularyHelp": [
      {
        "japanese": "日本語",
        "reading": "にほんご",
        "meaning": "bahasa Jepang"
      },
      {
        "japanese": "荷物",
        "reading": "にもつ",
        "meaning": "barang bawaan"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      },
      {
        "japanese": "本",
        "reading": "ほん",
        "meaning": "buku"
      }
    ],
    "questions": [
      {
        "id": "listening-b14-03-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "荷物を持ちましょうか。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "荷物を持ちましょうか。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "荷物を持ちましょうか。"
      },
      {
        "id": "listening-b14-03-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "八時",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "八時",
        "explanation": "Audio menyebut 「八時」 secara langsung.",
        "evidence": "明日は八時に駅の東口で会います。"
      },
      {
        "id": "listening-b14-03-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "駅前のカフェ",
          "駅の東口",
          "病院",
          "空港"
        ],
        "correctAnswer": "駅前のカフェ",
        "explanation": "Audio menyebut lokasi 「駅前のカフェ」.",
        "evidence": "それから、駅前のカフェで昼ご飯を食べます。"
      },
      {
        "id": "listening-b14-03-q4",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "青いかばん",
          "昼ご飯",
          "傘",
          "財布"
        ],
        "correctAnswer": "青いかばん",
        "explanation": "「青いかばん」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "青いかばんを持っていきます。"
      },
      {
        "id": "listening-b14-03-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "みなさん、今日の内容を確認します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "みなさん、今日の内容を確認します。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "みなさん、今日の内容を確認します。"
      }
    ],
    "estimatedDuration": 47
  },
  {
    "id": "listening-b14-04",
    "chapter": 14,
    "order": 4,
    "title": "電話での確認",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "telephone",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "もしもし、リナさんですか。"
          }
        ]
      },
      {
        "speaker": "リナ",
        "segments": [
          {
            "text": "はい、そうです。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "予定",
            "reading": "よてい"
          },
          {
            "text": "について"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "昼ご飯",
            "reading": "ひるごはん"
          },
          {
            "text": "を"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べてから、"
          },
          {
            "text": "図書館",
            "reading": "としょかん"
          },
          {
            "text": "へ行きます。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "雨",
            "reading": "あめ"
          },
          {
            "text": "ですから、"
          },
          {
            "text": "傘",
            "reading": "かさ"
          },
          {
            "text": "を"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "終",
            "reading": "お"
          },
          {
            "text": "わります。それから、"
          },
          {
            "text": "駅前",
            "reading": "えきまえ"
          },
          {
            "text": "のカフェで"
          },
          {
            "text": "昼ご飯",
            "reading": "ひるごはん"
          },
          {
            "text": "を"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べます。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "前",
            "reading": "まえ"
          },
          {
            "text": "にその"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "へ行きました。とても"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "明日",
            "reading": "あした"
          },
          {
            "text": "は"
          },
          {
            "text": "八時",
            "reading": "はちじ"
          },
          {
            "text": "半に"
          },
          {
            "text": "図書館",
            "reading": "としょかん"
          },
          {
            "text": "の"
          },
          {
            "text": "前",
            "reading": "まえ"
          },
          {
            "text": "で"
          },
          {
            "text": "会",
            "reading": "あ"
          },
          {
            "text": "います。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "資料",
            "reading": "しりょう"
          },
          {
            "text": "を"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "山田さん",
        "segments": [
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "を"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "リナ",
        "segments": [
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。内容を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "しました。"
          }
        ]
      }
    ],
    "translation": [
      "Setelah makan siang saya pergi ke perpustakaan. Pembicara juga memberi permintaan, kegiatan yang sedang berlangsung, atau urutan setelah suatu tindakan."
    ],
    "grammarTargets": [
      "ch14-tekara"
    ],
    "vocabularyHelp": [
      {
        "japanese": "日本語",
        "reading": "にほんご",
        "meaning": "bahasa Jepang"
      },
      {
        "japanese": "図書館",
        "reading": "としょかん",
        "meaning": "perpustakaan"
      },
      {
        "japanese": "資料",
        "reading": "しりょう",
        "meaning": "dokumen / materi"
      },
      {
        "japanese": "予定",
        "reading": "よてい",
        "meaning": "rencana / jadwal"
      }
    ],
    "questions": [
      {
        "id": "listening-b14-04-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "昼ご飯を食べてから、図書館へ行きます。",
          "昼ご飯を食べてから、学校へ行きます。",
          "昼ご飯を食べてから、図書館へ行きません。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "昼ご飯を食べてから、図書館へ行きます。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "昼ご飯を食べてから、図書館へ行きます。"
      },
      {
        "id": "listening-b14-04-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "八時半",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "八時半",
        "explanation": "Audio menyebut 「八時半」 secara langsung.",
        "evidence": "明日は八時半に図書館の前で会います。"
      },
      {
        "id": "listening-b14-04-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "駅前のカフェ",
          "図書館の前",
          "病院",
          "空港"
        ],
        "correctAnswer": "駅前のカフェ",
        "explanation": "Audio menyebut lokasi 「駅前のカフェ」.",
        "evidence": "それから、駅前のカフェで昼ご飯を食べます。"
      },
      {
        "id": "listening-b14-04-q4",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "昼ご飯",
          "資料",
          "傘",
          "財布"
        ],
        "correctAnswer": "昼ご飯",
        "explanation": "「昼ご飯」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "昼ご飯を食べてから、図書館へ行きます。"
      },
      {
        "id": "listening-b14-04-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "はい、そうです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "はい、そうです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "はい、そうです。"
      }
    ],
    "estimatedDuration": 56
  },
  {
    "id": "listening-b14-05",
    "chapter": 14,
    "order": 5,
    "title": "出発前の会話",
    "jlptLevel": "N5",
    "difficulty": "Menantang",
    "type": "travel",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "佐藤",
            "reading": "さとう"
          },
          {
            "text": "さん、"
          },
          {
            "text": "予定",
            "reading": "よてい"
          },
          {
            "text": "を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "しましょう。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "に"
          },
          {
            "text": "着",
            "reading": "き"
          },
          {
            "text": "いてから、"
          },
          {
            "text": "電話",
            "reading": "でんわ"
          },
          {
            "text": "してください。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "終",
            "reading": "お"
          },
          {
            "text": "わります。それから、"
          },
          {
            "text": "駅前",
            "reading": "えきまえ"
          },
          {
            "text": "のカフェで"
          },
          {
            "text": "昼ご飯",
            "reading": "ひるごはん"
          },
          {
            "text": "を"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べます。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "私",
            "reading": "わたし"
          },
          {
            "text": "は"
          },
          {
            "text": "前",
            "reading": "まえ"
          },
          {
            "text": "にその"
          },
          {
            "text": "店",
            "reading": "みせ"
          },
          {
            "text": "へ行きました。とても"
          },
          {
            "text": "静",
            "reading": "しず"
          },
          {
            "text": "かでした。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "明日",
            "reading": "あした"
          },
          {
            "text": "は"
          },
          {
            "text": "九時",
            "reading": "くじ"
          },
          {
            "text": "に"
          },
          {
            "text": "会社",
            "reading": "かいしゃ"
          },
          {
            "text": "の"
          },
          {
            "text": "受付",
            "reading": "うけつけ"
          },
          {
            "text": "で"
          },
          {
            "text": "会",
            "reading": "あ"
          },
          {
            "text": "います。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "切符",
            "reading": "きっぷ"
          },
          {
            "text": "を"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "を"
          },
          {
            "text": "二時間",
            "reading": "にじかん"
          },
          {
            "text": "ぐらい"
          },
          {
            "text": "勉強",
            "reading": "べんきょう"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "雨",
            "reading": "あめ"
          },
          {
            "text": "ですから、"
          },
          {
            "text": "傘",
            "reading": "かさ"
          },
          {
            "text": "を"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "っていきます。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "はい。"
          },
          {
            "text": "時間",
            "reading": "じかん"
          },
          {
            "text": "と"
          },
          {
            "text": "場所",
            "reading": "ばしょ"
          },
          {
            "text": "を"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "しました。"
          }
        ]
      }
    ],
    "translation": [
      "Setelah tiba di stasiun, silakan menelepon. Pembicara juga memberi permintaan, kegiatan yang sedang berlangsung, atau urutan setelah suatu tindakan."
    ],
    "grammarTargets": [
      "ch14-tekara"
    ],
    "vocabularyHelp": [
      {
        "japanese": "日本語",
        "reading": "にほんご",
        "meaning": "bahasa Jepang"
      },
      {
        "japanese": "受付",
        "reading": "うけつけ",
        "meaning": "resepsionis / penerimaan"
      },
      {
        "japanese": "電話",
        "reading": "でんわ",
        "meaning": "telepon"
      },
      {
        "japanese": "切符",
        "reading": "きっぷ",
        "meaning": "tiket"
      }
    ],
    "questions": [
      {
        "id": "listening-b14-05-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "駅に着いてから、電話してください。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "駅に着いてから、電話してください。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "駅に着いてから、電話してください。"
      },
      {
        "id": "listening-b14-05-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "九時",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "九時",
        "explanation": "Audio menyebut 「九時」 secara langsung.",
        "evidence": "明日は九時に会社の受付で会います。"
      },
      {
        "id": "listening-b14-05-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "駅前のカフェ",
          "会社の受付",
          "病院",
          "空港"
        ],
        "correctAnswer": "駅前のカフェ",
        "explanation": "Audio menyebut lokasi 「駅前のカフェ」.",
        "evidence": "それから、駅前のカフェで昼ご飯を食べます。"
      },
      {
        "id": "listening-b14-05-q4",
        "type": "direct",
        "prompt": "話の中に出てきたものはどれですか。",
        "options": [
          "昼ご飯",
          "切符",
          "傘",
          "財布"
        ],
        "correctAnswer": "昼ご飯",
        "explanation": "「昼ご飯」 disebut dalam audio sebagai benda/dokumen yang terkait situasi.",
        "evidence": "それから、駅前のカフェで昼ご飯を食べます。"
      },
      {
        "id": "listening-b14-05-q5",
        "type": "next_action",
        "prompt": "このあと、何をするように言われていますか。",
        "options": [
          "駅に着いてから、電話してください。",
          "すぐ全部中止します。",
          "何も持っていきません。",
          "連絡しないで帰ります。"
        ],
        "correctAnswer": "駅に着いてから、電話してください。",
        "explanation": "Tindakan ini diminta atau disepakati secara langsung dalam audio.",
        "evidence": "駅に着いてから、電話してください。"
      }
    ],
    "estimatedDuration": 50
  },
  {
    "id": "listening-b15-02",
    "chapter": 15,
    "order": 2,
    "title": "クラスでの確認",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "school",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "図書館",
            "reading": "としょかん"
          },
          {
            "text": "を"
          },
          {
            "text": "使",
            "reading": "つか"
          },
          {
            "text": "うときのルールを"
          },
          {
            "text": "確認",
            "reading": "かくにん"
          },
          {
            "text": "します。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "図書館",
            "reading": "としょかん"
          },
          {
            "text": "で大きい"
          },
          {
            "text": "声",
            "reading": "こえ"
          },
          {
            "text": "で"
          },
          {
            "text": "話",
            "reading": "はな"
          },
          {
            "text": "してはいけません。"
          }
        ]
      },
      {
        "speaker": "学生",
        "segments": [
          {
            "text": "飲",
            "reading": "の"
          },
          {
            "text": "み物を"
          },
          {
            "text": "飲",
            "reading": "の"
          },
          {
            "text": "んでもいいですか。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "水",
            "reading": "みず"
          },
          {
            "text": "は"
          },
          {
            "text": "飲",
            "reading": "の"
          },
          {
            "text": "んでもいいです。でも、"
          },
          {
            "text": "食べ物",
            "reading": "たべもの"
          },
          {
            "text": "は"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べてはいけません。"
          }
        ]
      },
      {
        "speaker": "学生",
        "segments": [
          {
            "text": "写真",
            "reading": "しゃしん"
          },
          {
            "text": "を"
          },
          {
            "text": "撮",
            "reading": "と"
          },
          {
            "text": "ってもいいですか。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "いいえ、"
          },
          {
            "text": "本",
            "reading": "ほん"
          },
          {
            "text": "の"
          },
          {
            "text": "写真",
            "reading": "しゃしん"
          },
          {
            "text": "は"
          },
          {
            "text": "撮",
            "reading": "と"
          },
          {
            "text": "ってはいけません。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "図書館",
            "reading": "としょかん"
          },
          {
            "text": "は"
          },
          {
            "text": "九時",
            "reading": "くじ"
          },
          {
            "text": "に閉まります。"
          }
        ]
      },
      {
        "speaker": "学生",
        "segments": [
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Di perpustakaan tidak boleh berbicara keras. Pembicara juga membahas izin, larangan, dan keadaan/kebiasaan."
    ],
    "grammarTargets": [
      "ch15-tewaikenai"
    ],
    "vocabularyHelp": [
      {
        "japanese": "図書館",
        "reading": "としょかん",
        "meaning": "perpustakaan"
      },
      {
        "japanese": "確認",
        "reading": "かくにん",
        "meaning": "konfirmasi"
      },
      {
        "japanese": "本",
        "reading": "ほん",
        "meaning": "buku"
      }
    ],
    "questions": [
      {
        "id": "listening-b15-02-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "図書館で大きい声で話してはいけません。",
          "学校で大きい声で話してはいけません。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "図書館で大きい声で話してはいけません。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "図書館で大きい声で話してはいけません。"
      },
      {
        "id": "listening-b15-02-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "九時",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "九時",
        "explanation": "Audio menyebut 「九時」 secara langsung.",
        "evidence": "図書館は九時に閉まります。"
      },
      {
        "id": "listening-b15-02-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "図書館",
          "病院",
          "空港",
          "別の時間です。"
        ],
        "correctAnswer": "図書館",
        "explanation": "Audio menyebut lokasi 「図書館」.",
        "evidence": "図書館を使うときのルールを確認します。"
      },
      {
        "id": "listening-b15-02-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "図書館を使うときのルールを確認します。",
          "学校を使うときのルールを確認します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "図書館を使うときのルールを確認します。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "図書館を使うときのルールを確認します。"
      },
      {
        "id": "listening-b15-02-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "水は飲んでもいいです。",
          "水は飲んでもよくないです。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "水は飲んでもいいです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "水は飲んでもいいです。"
      }
    ],
    "estimatedDuration": 41
  },
  {
    "id": "listening-b15-03",
    "chapter": 15,
    "order": 3,
    "title": "今日の案内",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "information",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "町",
            "reading": "まち"
          },
          {
            "text": "の生活についてご案内します。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "父",
            "reading": "ちち"
          },
          {
            "text": "は"
          },
          {
            "text": "東京",
            "reading": "とうきょう"
          },
          {
            "text": "に"
          },
          {
            "text": "住",
            "reading": "す"
          },
          {
            "text": "んでいます。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "父",
            "reading": "ちち"
          },
          {
            "text": "は"
          },
          {
            "text": "毎朝",
            "reading": "まいあさ"
          },
          {
            "text": "七時",
            "reading": "しちじ"
          },
          {
            "text": "半に"
          },
          {
            "text": "家",
            "reading": "いえ"
          },
          {
            "text": "を"
          },
          {
            "text": "出",
            "reading": "だ"
          },
          {
            "text": "ます。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "会社",
            "reading": "かいしゃ"
          },
          {
            "text": "まで"
          },
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "で行きます。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "の"
          },
          {
            "text": "中",
            "reading": "なか"
          },
          {
            "text": "では"
          },
          {
            "text": "毎日",
            "reading": "まいにち"
          },
          {
            "text": "日本語",
            "reading": "にほんご"
          },
          {
            "text": "を"
          },
          {
            "text": "聞",
            "reading": "き"
          },
          {
            "text": "いています。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "会社",
            "reading": "かいしゃ"
          },
          {
            "text": "の"
          },
          {
            "text": "近",
            "reading": "ちか"
          },
          {
            "text": "くに"
          },
          {
            "text": "小",
            "reading": "ちい"
          },
          {
            "text": "さい"
          },
          {
            "text": "公園",
            "reading": "こうえん"
          },
          {
            "text": "があります。"
          }
        ]
      },
      {
        "speaker": "案内",
        "segments": [
          {
            "text": "昼休",
            "reading": "ひるやす"
          },
          {
            "text": "みはそこで"
          },
          {
            "text": "休",
            "reading": "やす"
          },
          {
            "text": "んでいます。"
          }
        ]
      }
    ],
    "translation": [
      "Ayah tinggal di Tokyo. Pembicara juga membahas izin, larangan, dan keadaan/kebiasaan."
    ],
    "grammarTargets": [
      "ch15-teiru-state"
    ],
    "vocabularyHelp": [
      {
        "japanese": "日本語",
        "reading": "にほんご",
        "meaning": "bahasa Jepang"
      },
      {
        "japanese": "電車",
        "reading": "でんしゃ",
        "meaning": "kereta"
      },
      {
        "japanese": "公園",
        "reading": "こうえん",
        "meaning": "taman"
      },
      {
        "japanese": "本",
        "reading": "ほん",
        "meaning": "buku"
      }
    ],
    "questions": [
      {
        "id": "listening-b15-03-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "父は東京に住んでいます。",
          "父は大阪に住んでいます。",
          "父は東京に住んでいません。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "父は東京に住んでいます。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "父は東京に住んでいます。"
      },
      {
        "id": "listening-b15-03-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "七時半",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "七時半",
        "explanation": "Audio menyebut 「七時半」 secara langsung.",
        "evidence": "父は毎朝七時半に家を出ます。"
      },
      {
        "id": "listening-b15-03-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "会社",
          "病院",
          "空港",
          "別の時間です。"
        ],
        "correctAnswer": "会社",
        "explanation": "Audio menyebut lokasi 「会社」.",
        "evidence": "会社まで電車で行きます。"
      },
      {
        "id": "listening-b15-03-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "町の生活についてご案内します。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "町の生活についてご案内します。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "町の生活についてご案内します。"
      },
      {
        "id": "listening-b15-03-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "父は毎朝七時半に家を出ます。",
          "父は毎朝八時半に家を出ます。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "父は毎朝七時半に家を出ます。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "父は毎朝七時半に家を出ます。"
      }
    ],
    "estimatedDuration": 32
  },
  {
    "id": "listening-b15-04",
    "chapter": 15,
    "order": 4,
    "title": "友だちとの会話",
    "jlptLevel": "N5",
    "difficulty": "Sedang",
    "type": "conversation",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "この"
          },
          {
            "text": "部屋",
            "reading": "へや"
          },
          {
            "text": "で"
          },
          {
            "text": "飲",
            "reading": "の"
          },
          {
            "text": "み物を"
          },
          {
            "text": "飲",
            "reading": "の"
          },
          {
            "text": "んでもいいです。"
          },
          {
            "text": "食べ物",
            "reading": "たべもの"
          },
          {
            "text": "は"
          },
          {
            "text": "食",
            "reading": "た"
          },
          {
            "text": "べてはいけません。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "水",
            "reading": "みず"
          },
          {
            "text": "はいいですか。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "はい、"
          },
          {
            "text": "水",
            "reading": "みず"
          },
          {
            "text": "は大丈夫です。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "ここで"
          },
          {
            "text": "写真",
            "reading": "しゃしん"
          },
          {
            "text": "を"
          },
          {
            "text": "撮",
            "reading": "と"
          },
          {
            "text": "ってもいいですか。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "はい。でも、"
          },
          {
            "text": "授業",
            "reading": "じゅぎょう"
          },
          {
            "text": "中",
            "reading": "なか"
          },
          {
            "text": "は"
          },
          {
            "text": "撮",
            "reading": "と"
          },
          {
            "text": "ってはいけません。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "この"
          },
          {
            "text": "部屋",
            "reading": "へや"
          },
          {
            "text": "は何"
          },
          {
            "text": "時",
            "reading": "とき"
          },
          {
            "text": "までですか。"
          }
        ]
      },
      {
        "speaker": "田中さん",
        "segments": [
          {
            "text": "九時",
            "reading": "くじ"
          },
          {
            "text": "まで"
          },
          {
            "text": "使",
            "reading": "つか"
          },
          {
            "text": "ってもいいです。"
          }
        ]
      },
      {
        "speaker": "佐藤さん",
        "segments": [
          {
            "text": "分",
            "reading": "わ"
          },
          {
            "text": "かりました。"
          }
        ]
      }
    ],
    "translation": [
      "Di kamar ini boleh minum tetapi tidak boleh makan. Pembicara juga membahas izin, larangan, dan keadaan/kebiasaan."
    ],
    "grammarTargets": [
      "ch15-temoii"
    ],
    "vocabularyHelp": [
      {
        "japanese": "授業",
        "reading": "じゅぎょう",
        "meaning": "kelas / pelajaran"
      },
      {
        "japanese": "部屋",
        "reading": "へや",
        "meaning": "kamar"
      }
    ],
    "questions": [
      {
        "id": "listening-b15-04-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "この部屋で飲み物を飲んでもいいです。食べ物は食べてはいけません。",
          "この部屋で飲み物を飲んでもよくないです。食べ物は食べてはいけません。",
          "予定は明日ではありません。",
          "場所は駅の西口です。"
        ],
        "correctAnswer": "この部屋で飲み物を飲んでもいいです。食べ物は食べてはいけません。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "この部屋で飲み物を飲んでもいいです。食べ物は食べてはいけません。"
      },
      {
        "id": "listening-b15-04-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "九時",
          "七時",
          "十時",
          "別の時間です。"
        ],
        "correctAnswer": "九時",
        "explanation": "Audio menyebut 「九時」 secara langsung.",
        "evidence": "九時まで使ってもいいです。"
      },
      {
        "id": "listening-b15-04-q3",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "はい、水は大丈夫です。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "はい、水は大丈夫です。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "はい、水は大丈夫です。"
      },
      {
        "id": "listening-b15-04-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "でも、授業中は撮ってはいけません。",
          "予定は明日ではありません。",
          "場所は駅の西口です。",
          "時間は十時です。"
        ],
        "correctAnswer": "でも、授業中は撮ってはいけません。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "でも、授業中は撮ってはいけません。"
      },
      {
        "id": "listening-b15-04-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "九時まで使ってもいいです。",
          "十時まで使ってもいいです。",
          "九時まで使ってもよくないです。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "九時まで使ってもいいです。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "九時まで使ってもいいです。"
      }
    ],
    "estimatedDuration": 38
  },
  {
    "id": "listening-b15-05",
    "chapter": 15,
    "order": 5,
    "title": "説明を聞く",
    "jlptLevel": "N5",
    "difficulty": "Menantang",
    "type": "instruction",
    "audioSource": "tts",
    "speakerTurns": [
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "で"
          },
          {
            "text": "学校",
            "reading": "がっこう"
          },
          {
            "text": "へ来る"
          },
          {
            "text": "学生",
            "reading": "がくせい"
          },
          {
            "text": "は、よく"
          },
          {
            "text": "聞",
            "reading": "き"
          },
          {
            "text": "いてください。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "先生",
            "reading": "せんせい"
          },
          {
            "text": "は"
          },
          {
            "text": "毎朝",
            "reading": "まいあさ"
          },
          {
            "text": "この"
          },
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "を"
          },
          {
            "text": "使",
            "reading": "つか"
          },
          {
            "text": "っています。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "朝",
            "reading": "あさ"
          },
          {
            "text": "は"
          },
          {
            "text": "八時",
            "reading": "はちじ"
          },
          {
            "text": "の"
          },
          {
            "text": "電車",
            "reading": "でんしゃ"
          },
          {
            "text": "が"
          },
          {
            "text": "便利",
            "reading": "べんり"
          },
          {
            "text": "です。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "車",
            "reading": "くるま"
          },
          {
            "text": "内で大きい"
          },
          {
            "text": "声",
            "reading": "こえ"
          },
          {
            "text": "で"
          },
          {
            "text": "話",
            "reading": "はな"
          },
          {
            "text": "してはいけません。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "飲",
            "reading": "の"
          },
          {
            "text": "み物は"
          },
          {
            "text": "飲",
            "reading": "の"
          },
          {
            "text": "んでもいいですが、ごみは"
          },
          {
            "text": "持",
            "reading": "も"
          },
          {
            "text": "って帰ってください。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "学校",
            "reading": "がっこう"
          },
          {
            "text": "の最寄り"
          },
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "は"
          },
          {
            "text": "東口",
            "reading": "ひがしぐち"
          },
          {
            "text": "を"
          },
          {
            "text": "使",
            "reading": "つか"
          },
          {
            "text": "ってください。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "駅",
            "reading": "えき"
          },
          {
            "text": "から"
          },
          {
            "text": "学校",
            "reading": "がっこう"
          },
          {
            "text": "まで"
          },
          {
            "text": "歩",
            "reading": "ある"
          },
          {
            "text": "いて"
          },
          {
            "text": "十五分",
            "reading": "じゅうごふん"
          },
          {
            "text": "ぐらいです。"
          }
        ]
      },
      {
        "speaker": "先生",
        "segments": [
          {
            "text": "時間",
            "reading": "じかん"
          },
          {
            "text": "に気をつけてください。"
          }
        ]
      }
    ],
    "translation": [
      "Guru biasa menggunakan kereta ini setiap pagi. Pembicara juga membahas izin, larangan, dan keadaan/kebiasaan."
    ],
    "grammarTargets": [
      "ch15-teiru-state"
    ],
    "vocabularyHelp": [
      {
        "japanese": "学生",
        "reading": "がくせい",
        "meaning": "siswa / pelajar"
      },
      {
        "japanese": "先生",
        "reading": "せんせい",
        "meaning": "guru"
      },
      {
        "japanese": "学校",
        "reading": "がっこう",
        "meaning": "sekolah"
      },
      {
        "japanese": "電車",
        "reading": "でんしゃ",
        "meaning": "kereta"
      }
    ],
    "questions": [
      {
        "id": "listening-b15-05-q1",
        "type": "matching",
        "prompt": "聞いた内容と合っているものはどれですか。",
        "options": [
          "先生は毎朝この電車を使っています。",
          "先生は毎朝このバスを使っています。",
          "学生は毎朝この電車を使っています。",
          "先生は毎朝この電車を使っていません。"
        ],
        "correctAnswer": "先生は毎朝この電車を使っています。",
        "explanation": "Pernyataan ini benar-benar terdengar di audio.",
        "evidence": "先生は毎朝この電車を使っています。"
      },
      {
        "id": "listening-b15-05-q2",
        "type": "who_when_where",
        "prompt": "時間について、音声で聞こえたものはどれですか。",
        "options": [
          "十五分",
          "八時",
          "七時",
          "十時"
        ],
        "correctAnswer": "十五分",
        "explanation": "Audio menyebut 「十五分」 secara langsung.",
        "evidence": "駅から学校まで歩いて十五分ぐらいです。"
      },
      {
        "id": "listening-b15-05-q3",
        "type": "who_when_where",
        "prompt": "場所について、音声で聞こえたものはどれですか。",
        "options": [
          "学校",
          "駅",
          "病院",
          "空港"
        ],
        "correctAnswer": "学校",
        "explanation": "Audio menyebut lokasi 「学校」.",
        "evidence": "電車で学校へ来る学生は、よく聞いてください。"
      },
      {
        "id": "listening-b15-05-q4",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "電車で学校へ来る学生は、よく聞いてください。",
          "電車で図書館へ来る学生は、よく聞いてください。",
          "バスで学校へ来る学生は、よく聞いてください。",
          "電車で学校へ来る会社員は、よく聞いてください。"
        ],
        "correctAnswer": "電車で学校へ来る学生は、よく聞いてください。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "電車で学校へ来る学生は、よく聞いてください。"
      },
      {
        "id": "listening-b15-05-q5",
        "type": "matching",
        "prompt": "聞いた内容として正しいものはどれですか。",
        "options": [
          "朝は八時の電車が便利です。",
          "朝は九時の電車が便利です。",
          "朝は八時のバスが便利です。",
          "予定は明日ではありません。"
        ],
        "correctAnswer": "朝は八時の電車が便利です。",
        "explanation": "Pernyataan ini disebut langsung dalam audio.",
        "evidence": "朝は八時の電車が便利です。"
      }
    ],
    "estimatedDuration": 47
  }
];
