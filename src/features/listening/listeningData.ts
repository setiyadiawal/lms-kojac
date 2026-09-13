import type { GrammarJlptLevel } from '../grammar/grammarData';
import { LISTENING_PHASE2_ITEMS } from './data/phase2';

export type ListeningDifficulty = 'Mudah' | 'Sedang' | 'Menantang';
export type ListeningKind = 'dialogue' | 'announcement' | 'voicemail' | 'instruction' | 'conversation' | 'information' | 'telephone' | 'shopping' | 'school' | 'workplace' | 'travel';
export type ListeningQuestionType = 'direct' | 'who_when_where' | 'next_action' | 'reason' | 'matching' | 'response';

export type ListeningSegment = {
  text: string;
  reading?: string;
};

export type ListeningSpeakerTurn = {
  speaker: string;
  segments: ListeningSegment[];
};

export type ListeningVocabularyHelp = {
  japanese: string;
  reading: string;
  meaning: string;
};

export type ListeningQuestion = {
  id: string;
  type: ListeningQuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  evidence?: string;
};

export type ListeningItem = {
  id: string;
  chapter: number;
  order: number;
  title: string;
  jlptLevel: GrammarJlptLevel;
  difficulty: ListeningDifficulty;
  type: ListeningKind;
  audioSource: 'tts' | 'file';
  audioUrl?: string;
  speakerTurns: ListeningSpeakerTurn[];
  translation: string[];
  grammarTargets: string[];
  vocabularyHelp: ListeningVocabularyHelp[];
  questions: ListeningQuestion[];
  estimatedDuration: number;
};

export function getListeningTurnText(turn: ListeningSpeakerTurn) {
  return turn.segments.map((segment) => segment.text).join('');
}

export function getListeningScript(item: ListeningItem) {
  return item.speakerTurns.map(getListeningTurnText).join(' ');
}

function estimateDuration(turns: ListeningSpeakerTurn[]) {
  const chars = turns.reduce((total, turn) => total + getListeningTurnText(turn).replace(/\s/g, '').length, 0);
  return Math.max(15, Math.round(chars / 3.2));
}

function item(input: Omit<ListeningItem, 'estimatedDuration'>): ListeningItem {
  return { ...input, estimatedDuration: estimateDuration(input.speakerTurns) };
}

export const LISTENING_PILOT_ITEMS: ListeningItem[] = [
  item({
    id: 'listening-b01-01', chapter: 1, order: 1, title: 'はじめまして、ミラーです', jlptLevel: 'N5', difficulty: 'Mudah', type: 'information', audioSource: 'tts',
    speakerTurns: [
      { speaker: 'ミラー', segments: [
        { text: 'はじめまして。ミラーです。アメリカ' }, { text: '人', reading: 'じん' }, { text: 'です。KOJACの' }, { text: '学生', reading: 'がくせい' }, { text: 'です。' },
        { text: '日本語', reading: 'にほんご' }, { text: 'の' }, { text: '先生', reading: 'せんせい' }, { text: 'は' }, { text: '佐藤', reading: 'さとう' }, { text: '先生', reading: 'せんせい' }, { text: 'です。どうぞよろしくお' }, { text: '願', reading: 'ねが' }, { text: 'いします。' },
      ] },
    ],
    translation: ['Perkenalkan, saya Miller. Saya orang Amerika dan siswa KOJAC. Guru bahasa Jepang saya adalah Bu/Pak Sato. Senang berkenalan dengan Anda.'],
    grammarTargets: ['ch1-desu', 'ch1-no'],
    vocabularyHelp: [
      { japanese: '学生', reading: 'がくせい', meaning: 'siswa / mahasiswa' },
      { japanese: '先生', reading: 'せんせい', meaning: 'guru' },
      { japanese: '日本語', reading: 'にほんご', meaning: 'bahasa Jepang' },
    ],
    questions: [
      { id: 'listening-b01-01-q1', type: 'direct', prompt: '話している人の名前は何ですか。', options: ['ミラーです。', '佐藤です。', '山田です。', 'アニです。'], correctAnswer: 'ミラーです。', explanation: 'Pembicara membuka perkenalan dengan 「ミラーです」.', evidence: 'はじめまして。ミラーです。' },
      { id: 'listening-b01-01-q2', type: 'direct', prompt: 'ミラーさんは何人ですか。', options: ['アメリカ人です。', '日本人です。', 'インドネシア人です。', '中国人です。'], correctAnswer: 'アメリカ人です。', explanation: 'Miller secara langsung mengatakan 「アメリカ人です」.', evidence: 'アメリカ人です。' },
      { id: 'listening-b01-01-q3', type: 'direct', prompt: 'ミラーさんは何の学生ですか。', options: ['KOJACの学生です。', '大学の学生です。', '高校の学生です。', '会社の学生です。'], correctAnswer: 'KOJACの学生です。', explanation: 'Audio menyebut 「KOJACの学生です」.', evidence: 'KOJACの学生です。' },
      { id: 'listening-b01-01-q4', type: 'who_when_where', prompt: '日本語の先生はだれですか。', options: ['佐藤先生です。', 'ミラー先生です。', '山田先生です。', 'アニ先生です。'], correctAnswer: '佐藤先生です。', explanation: 'Guru bahasa Jepang Miller adalah Sato-sensei.', evidence: '日本語の先生は佐藤先生です。' },
    ],
  }),
  item({
    id: 'listening-b01-02', chapter: 1, order: 2, title: 'はじめてのクラス', jlptLevel: 'N5', difficulty: 'Mudah', type: 'school', audioSource: 'tts',
    speakerTurns: [
      { speaker: '先生', segments: [{ text: 'みなさん、おはようございます。' }, { text: '私', reading: 'わたし' }, { text: 'は' }, { text: '佐藤', reading: 'さとう' }, { text: 'です。' }, { text: '日本語', reading: 'にほんご' }, { text: 'の' }, { text: '先生', reading: 'せんせい' }, { text: 'です。' }] },
      { speaker: 'アニ', segments: [{ text: '先生', reading: 'せんせい' }, { text: '、こちらはミラーさんですか。' }] },
      { speaker: '先生', segments: [{ text: 'はい、そうです。ミラーさんもKOJACの' }, { text: '学生', reading: 'がくせい' }, { text: 'です。' }] },
      { speaker: 'ミラー', segments: [{ text: 'はじめまして。よろしくお' }, { text: '願', reading: 'ねが' }, { text: 'いします。' }] },
    ],
    translation: ['Guru memperkenalkan diri sebagai Sato, guru bahasa Jepang. Ani memastikan apakah orang di sebelahnya adalah Miller. Guru menjawab iya dan menjelaskan bahwa Miller juga siswa KOJAC.'],
    grammarTargets: ['ch1-desu', 'ch1-desuka', 'ch1-mo'],
    vocabularyHelp: [
      { japanese: 'こちら', reading: 'こちら', meaning: 'orang/arah di sini (sopan)' },
      { japanese: '学生', reading: 'がくせい', meaning: 'siswa / mahasiswa' },
      { japanese: '先生', reading: 'せんせい', meaning: 'guru' },
    ],
    questions: [
      { id: 'listening-b01-02-q1', type: 'direct', prompt: '佐藤さんは何の先生ですか。', options: ['日本語の先生です。', '英語の先生です。', '数学の先生です。', '音楽の先生です。'], correctAnswer: '日本語の先生です。', explanation: 'Sato mengatakan 「日本語の先生です」.', evidence: '私は佐藤です。日本語の先生です。' },
      { id: 'listening-b01-02-q2', type: 'matching', prompt: 'ミラーさんについて正しいものはどれですか。', options: ['KOJACの学生です。', '日本語の先生です。', '佐藤さんの先生です。', 'アニさんではありません。'], correctAnswer: 'KOJACの学生です。', explanation: 'Guru menyatakan bahwa Miller juga siswa KOJAC.', evidence: 'ミラーさんもKOJACの学生です。' },
      { id: 'listening-b01-02-q3', type: 'response', prompt: 'ミラーさんは最後に何と言いましたか。', options: ['よろしくお願いします。', 'さようなら。', 'いただきます。', 'おやすみなさい。'], correctAnswer: 'よろしくお願いします。', explanation: 'Miller menutup perkenalan dengan 「よろしくお願いします」.', evidence: 'はじめまして。よろしくお願いします。' },
    ],
  }),
  item({
    id: 'listening-b05-01', chapter: 5, order: 1, title: '駅での待ち合わせ', jlptLevel: 'N5', difficulty: 'Mudah', type: 'travel', audioSource: 'tts',
    speakerTurns: [
      { speaker: 'A', segments: [{ text: '山田', reading: 'やまだ' }, { text: 'さん、' }, { text: '明日', reading: 'あした' }, { text: 'どこへ' }, { text: '行', reading: 'い' }, { text: 'きますか。' }] },
      { speaker: 'B', segments: [{ text: '京都', reading: 'きょうと' }, { text: 'へ' }, { text: '行', reading: 'い' }, { text: 'きます。' }, { text: '大阪', reading: 'おおさか' }, { text: 'から' }, { text: '京都', reading: 'きょうと' }, { text: 'まで' }, { text: '電車', reading: 'でんしゃ' }, { text: 'で' }, { text: '行', reading: 'い' }, { text: 'きます。' }] },
      { speaker: 'A', segments: [{ text: '一人', reading: 'ひとり' }, { text: 'で' }, { text: '行', reading: 'い' }, { text: 'きますか。' }] },
      { speaker: 'B', segments: [{ text: 'いいえ、' }, { text: '妹', reading: 'いもうと' }, { text: 'と' }, { text: '行', reading: 'い' }, { text: 'きます。' }, { text: '午前', reading: 'ごぜん' }, { text: '8' }, { text: '時', reading: 'じ' }, { text: 'に' }, { text: '大阪駅', reading: 'おおさかえき' }, { text: 'で' }, { text: '会', reading: 'あ' }, { text: 'います。' }] },
      { speaker: 'A', segments: [{ text: '何時', reading: 'なんじ' }, { text: 'ごろ' }, { text: '京都', reading: 'きょうと' }, { text: 'に' }, { text: '着', reading: 'つ' }, { text: 'きますか。' }] },
      { speaker: 'B', segments: [{ text: '9' }, { text: '時', reading: 'じ' }, { text: 'ごろです。' }] },
    ],
    translation: ['Yamada akan pergi ke Kyoto besok. Ia naik kereta dari Osaka ke Kyoto bersama adiknya. Mereka bertemu di Stasiun Osaka pukul 08.00 dan diperkirakan tiba sekitar pukul 09.00.'],
    grammarTargets: ['ch5-e-movement', 'ch5-transport-de', 'ch5-person-to', 'ch5-kara-made', 'ch4-time-ni'],
    vocabularyHelp: [
      { japanese: '待ち合わせ', reading: 'まちあわせ', meaning: 'janji bertemu' },
      { japanese: '妹', reading: 'いもうと', meaning: 'adik perempuan' },
      { japanese: '着きます', reading: 'つきます', meaning: 'tiba' },
      { japanese: '電車', reading: 'でんしゃ', meaning: 'kereta' },
    ],
    questions: [
      { id: 'listening-b05-01-q1', type: 'who_when_where', prompt: '山田さんはどこへ行きますか。', options: ['京都へ行きます。', '大阪へ行きます。', '東京へ行きます。', '神戸へ行きます。'], correctAnswer: '京都へ行きます。', explanation: 'Tujuan Yamada adalah Kyoto.', evidence: '京都へ行きます。' },
      { id: 'listening-b05-01-q2', type: 'direct', prompt: '何で京都へ行きますか。', options: ['電車で行きます。', 'バスで行きます。', '車で行きます。', '歩いて行きます。'], correctAnswer: '電車で行きます。', explanation: 'Ia mengatakan pergi dari Osaka ke Kyoto dengan kereta.', evidence: '大阪から京都まで電車で行きます。' },
      { id: 'listening-b05-01-q3', type: 'who_when_where', prompt: 'だれと行きますか。', options: ['妹と行きます。', '一人で行きます。', '先生と行きます。', '友だちと行きます。'], correctAnswer: '妹と行きます。', explanation: 'Yamada pergi bersama adik perempuannya.', evidence: '妹と行きます。' },
      { id: 'listening-b05-01-q4', type: 'who_when_where', prompt: '大阪駅で何時に会いますか。', options: ['8時です。', '9時です。', '7時です。', '10時です。'], correctAnswer: '8時です。', explanation: 'Waktu bertemu di Stasiun Osaka adalah pukul delapan pagi.', evidence: '午前8時に大阪駅で会います。' },
    ],
  }),
  item({
    id: 'listening-b10-01', chapter: 10, order: 1, title: '黒い猫はどこですか', jlptLevel: 'N5', difficulty: 'Sedang', type: 'conversation', audioSource: 'tts',
    speakerTurns: [
      { speaker: 'A', segments: [{ text: 'すみません、' }, { text: '黒', reading: 'くろ' }, { text: 'い' }, { text: '猫', reading: 'ねこ' }, { text: 'を' }, { text: '見', reading: 'み' }, { text: 'ませんでしたか。' }] },
      { speaker: 'B', segments: [{ text: 'さっき' }, { text: '公園', reading: 'こうえん' }, { text: 'にいましたよ。' }] },
      { speaker: 'A', segments: [{ text: '公園', reading: 'こうえん' }, { text: 'のどこですか。' }] },
      { speaker: 'B', segments: [{ text: '大', reading: 'おお' }, { text: 'きい' }, { text: '木', reading: 'き' }, { text: 'の' }, { text: '下', reading: 'した' }, { text: 'です。ベンチの' }, { text: '隣', reading: 'となり' }, { text: 'にいました。' }] },
      { speaker: 'A', segments: [{ text: '今', reading: 'いま' }, { text: 'もいますか。' }] },
      { speaker: 'B', segments: [{ text: 'たぶん。' }, { text: '公園', reading: 'こうえん' }, { text: 'の' }, { text: '入口', reading: 'いりぐち' }, { text: 'の' }, { text: '近', reading: 'ちか' }, { text: 'くにも' }, { text: '猫', reading: 'ねこ' }, { text: 'が' }, { text: '一匹', reading: 'いっぴき' }, { text: 'いますが、その' }, { text: '猫', reading: 'ねこ' }, { text: 'は' }, { text: '白', reading: 'しろ' }, { text: 'いです。' }] },
    ],
    translation: ['Seseorang mencari kucing hitam. Orang lain melihatnya tadi di taman, di bawah pohon besar di sebelah bangku. Ada kucing lain di dekat pintu masuk taman, tetapi kucing itu berwarna putih.'],
    grammarTargets: ['ch10-imasu', 'ch10-location-ni', 'ch10-position', 'ch4-verb-masendeshita'],
    vocabularyHelp: [
      { japanese: '猫', reading: 'ねこ', meaning: 'kucing' },
      { japanese: '入口', reading: 'いりぐち', meaning: 'pintu masuk' },
      { japanese: '隣', reading: 'となり', meaning: 'sebelah' },
      { japanese: '一匹', reading: 'いっぴき', meaning: 'satu ekor (binatang kecil)' },
    ],
    questions: [
      { id: 'listening-b10-01-q1', type: 'direct', prompt: 'Aさんは何を探していますか。', options: ['黒い猫です。', '白い猫です。', '黒い犬です。', '白い犬です。'], correctAnswer: '黒い猫です。', explanation: 'A bertanya apakah B melihat kucing hitam.', evidence: '黒い猫を見ませんでしたか。' },
      { id: 'listening-b10-01-q2', type: 'who_when_where', prompt: 'Bさんは猫をどこで見ましたか。', options: ['公園です。', '駅です。', '学校です。', '家です。'], correctAnswer: '公園です。', explanation: 'B mengatakan kucing itu tadi ada di taman.', evidence: 'さっき公園にいましたよ。' },
      { id: 'listening-b10-01-q3', type: 'who_when_where', prompt: '黒い猫はどこにいましたか。', options: ['大きい木の下、ベンチの隣です。', '入口の近くです。', 'ベンチの上です。', '木の後ろです。'], correctAnswer: '大きい木の下、ベンチの隣です。', explanation: 'Lokasinya dijelaskan dengan dua petunjuk: di bawah pohon besar dan di sebelah bangku.', evidence: '大きい木の下です。ベンチの隣にいました。' },
      { id: 'listening-b10-01-q4', type: 'matching', prompt: '入口の近くにいる猫はどんな猫ですか。', options: ['白い猫です。', '黒い猫です。', '大きい猫です。', '小さい猫です。'], correctAnswer: '白い猫です。', explanation: 'Kucing dekat pintu masuk adalah kucing putih, bukan kucing yang dicari.', evidence: 'その猫は白いです。' },
      { id: 'listening-b10-01-q5', type: 'reason', prompt: '黒い猫と入口の近くの猫は同じ猫ですか。', options: ['いいえ、違います。色が違います。', 'はい、同じ猫です。', 'はい、どちらも黒いです。', 'わかりません。'], correctAnswer: 'いいえ、違います。色が違います。', explanation: 'Kucing yang dicari hitam, sedangkan kucing di pintu masuk putih.', evidence: '黒い猫…その猫は白いです。' },
    ],
  }),
  item({
    id: 'listening-b15-01', chapter: 15, order: 1, title: '図書館のルール', jlptLevel: 'N5', difficulty: 'Sedang', type: 'announcement', audioSource: 'tts',
    speakerTurns: [
      { speaker: 'アナウンス', segments: [
        { text: '図書館', reading: 'としょかん' }, { text: 'からのお' }, { text: '知', reading: 'し' }, { text: 'らせです。' }, { text: '館内', reading: 'かんない' }, { text: 'で' }, { text: '食', reading: 'た' }, { text: 'べ' }, { text: '物', reading: 'もの' }, { text: 'を' }, { text: '食', reading: 'た' }, { text: 'べてはいけません。' },
        { text: '飲', reading: 'の' }, { text: 'み' }, { text: '物', reading: 'もの' }, { text: 'は、ふたのあるボトルの' }, { text: '飲', reading: 'の' }, { text: 'み' }, { text: '物', reading: 'もの' }, { text: 'を' }, { text: '飲', reading: 'の' }, { text: 'んでもいいです。' }, { text: '電話', reading: 'でんわ' }, { text: 'で' }, { text: '話', reading: 'はな' }, { text: 'してはいけませんが、メッセージを' }, { text: '送', reading: 'おく' }, { text: 'ってもいいです。' },
        { text: '本', reading: 'ほん' }, { text: 'は' }, { text: '一人', reading: 'ひとり' }, { text: '5' }, { text: '冊', reading: 'さつ' }, { text: 'まで' }, { text: '借', reading: 'か' }, { text: 'りてもいいです。' }, { text: '期間', reading: 'きかん' }, { text: 'は2' }, { text: '週間', reading: 'しゅうかん' }, { text: 'です。' }, { text: '図書館', reading: 'としょかん' }, { text: 'は' }, { text: '午後', reading: 'ごご' }, { text: '6' }, { text: '時', reading: 'じ' }, { text: 'に' }, { text: '閉', reading: 'し' }, { text: 'まります。' },
      ] },
    ],
    translation: ['Pengumuman perpustakaan: dilarang makan di dalam. Minuman dalam botol bertutup diperbolehkan. Menelepon tidak diperbolehkan, tetapi mengirim pesan boleh. Buku boleh dipinjam maksimal lima buku per orang selama dua minggu. Perpustakaan tutup pukul 18.00.'],
    grammarTargets: ['ch15-temoii', 'ch15-tewaikenai', 'ch4-time-ni'],
    vocabularyHelp: [
      { japanese: '館内', reading: 'かんない', meaning: 'di dalam gedung' },
      { japanese: '冊', reading: 'さつ', meaning: 'counter untuk buku' },
      { japanese: '期間', reading: 'きかん', meaning: 'jangka waktu / periode' },
      { japanese: '閉まります', reading: 'しまります', meaning: 'tutup' },
    ],
    questions: [
      { id: 'listening-b15-01-q1', type: 'matching', prompt: '図書館で何をしてもいいですか。', options: ['ふたのあるボトルの飲み物を飲むことです。', '食べ物を食べることです。', '電話で話すことです。', '大きい声で話すことです。'], correctAnswer: 'ふたのあるボトルの飲み物を飲むことです。', explanation: 'Minuman diperbolehkan jika berada dalam botol dengan tutup.', evidence: 'ふたのあるボトルの飲み物を飲んでもいいです。' },
      { id: 'listening-b15-01-q2', type: 'direct', prompt: '電話について正しいものはどれですか。', options: ['電話で話してはいけません。', '電話で話してもいいです。', '電話を持ってはいけません。', '電話で写真を撮ってはいけません。'], correctAnswer: '電話で話してはいけません。', explanation: 'Yang dilarang adalah berbicara melalui telepon.', evidence: '電話で話してはいけません。' },
      { id: 'listening-b15-01-q3', type: 'direct', prompt: '一人で本を何冊まで借りてもいいですか。', options: ['5冊です。', '2冊です。', '6冊です。', '10冊です。'], correctAnswer: '5冊です。', explanation: 'Batas peminjaman adalah lima buku per orang.', evidence: '本は一人5冊まで借りてもいいです。' },
      { id: 'listening-b15-01-q4', type: 'direct', prompt: '本は何週間借りてもいいですか。', options: ['2週間です。', '1週間です。', '5日です。', '1か月です。'], correctAnswer: '2週間です。', explanation: 'Periode peminjaman disebut dua minggu.', evidence: '期間は2週間です。' },
      { id: 'listening-b15-01-q5', type: 'who_when_where', prompt: '図書館は何時に閉まりますか。', options: ['午後6時です。', '午後5時です。', '午後7時です。', '午前6時です。'], correctAnswer: '午後6時です。', explanation: 'Perpustakaan tutup pukul enam sore.', evidence: '午後6時に閉まります。' },
    ],
  }),
  item({
    id: 'listening-b20-01', chapter: 20, order: 1, title: '週末、何する？', jlptLevel: 'N5', difficulty: 'Sedang', type: 'conversation', audioSource: 'tts',
    speakerTurns: [
      { speaker: 'A', segments: [{ text: '土曜日', reading: 'どようび' }, { text: '、' }, { text: '何', reading: 'なに' }, { text: 'する？' }] },
      { speaker: 'B', segments: [{ text: '朝', reading: 'あさ' }, { text: 'はアルバイトだけど、' }, { text: '午後', reading: 'ごご' }, { text: 'は' }, { text: '暇', reading: 'ひま' }, { text: 'だよ。' }, { text: '新', reading: 'あたら' }, { text: 'しい' }, { text: '映画', reading: 'えいが' }, { text: 'を' }, { text: '見', reading: 'み' }, { text: 'たい。' }] },
      { speaker: 'A', segments: [{ text: '私', reading: 'わたし' }, { text: 'も' }, { text: '見', reading: 'み' }, { text: 'たいけど、3' }, { text: '時', reading: 'じ' }, { text: 'から' }, { text: '日本語', reading: 'にほんご' }, { text: 'のクラスがある。' }] },
      { speaker: 'A', segments: [{ text: 'クラスは4' }, { text: '時半', reading: 'じはん' }, { text: 'まで。だから、' }, { text: '土曜日', reading: 'どようび' }, { text: 'の' }, { text: '映画', reading: 'えいが' }, { text: 'はちょっと' }, { text: '遅', reading: 'おそ' }, { text: 'いね。' }] },
      { speaker: 'B', segments: [{ text: 'じゃ、' }, { text: '映画', reading: 'えいが' }, { text: 'は' }, { text: '日曜日', reading: 'にちようび' }, { text: 'にする？' }] },
      { speaker: 'A', segments: [{ text: 'いいね。' }, { text: '日曜日', reading: 'にちようび' }, { text: 'は' }, { text: '午後', reading: 'ごご' }, { text: '1' }, { text: '時', reading: 'じ' }, { text: 'の' }, { text: '回', reading: 'かい' }, { text: 'がいい。' }] },
      { speaker: 'B', segments: [{ text: 'わかった。' }, { text: '駅', reading: 'えき' }, { text: 'の' }, { text: '前', reading: 'まえ' }, { text: 'で12' }, { text: '時半', reading: 'じはん' }, { text: 'に' }, { text: '会', reading: 'あ' }, { text: 'う。' }] },
    ],
    translation: ['Dua teman membicarakan akhir pekan. B bekerja paruh waktu pada Sabtu pagi dan ingin menonton film sore hari. A juga ingin menonton, tetapi punya kelas bahasa Jepang pukul 15.00. Mereka akhirnya memilih hari Minggu, pertunjukan pukul 13.00, dan bertemu di depan stasiun pukul 12.30.'],
    grammarTargets: ['ch20-plain-verb', 'ch20-plain-noun', 'ch20-kedo', 'ch13-tai', 'ch9-reason-kara'],
    vocabularyHelp: [
      { japanese: '暇', reading: 'ひま', meaning: 'senggang' },
      { japanese: '映画', reading: 'えいが', meaning: 'film' },
      { japanese: '回', reading: 'かい', meaning: 'sesi / pemutaran' },
      { japanese: '時半', reading: 'じはん', meaning: 'setengah (jam)' },
    ],
    questions: [
      { id: 'listening-b20-01-q1', type: 'direct', prompt: 'Bさんは土曜日の朝、何をしますか。', options: ['アルバイトをします。', '映画を見ます。', '日本語を勉強します。', '駅へ行きます。'], correctAnswer: 'アルバイトをします。', explanation: 'B mengatakan Sabtu pagi ia bekerja paruh waktu.', evidence: '朝はアルバイトだけど…' },
      { id: 'listening-b20-01-q2', type: 'reason', prompt: '土曜日の午後に映画を見ないのはなぜですか。', options: ['Aさんに日本語のクラスがあるからです。', 'Bさんに仕事があるからです。', '映画館が休みだからです。', '雨だからです。'], correctAnswer: 'Aさんに日本語のクラスがあるからです。', explanation: 'A memiliki kelas bahasa Jepang mulai pukul tiga sore.', evidence: '3時から日本語のクラスがある。' },
      { id: 'listening-b20-01-q3', type: 'next_action', prompt: '二人はいつ映画を見ますか。', options: ['日曜日です。', '土曜日です。', '金曜日です。', '月曜日です。'], correctAnswer: '日曜日です。', explanation: 'B mengusulkan memindahkan film ke hari Minggu dan A setuju.', evidence: '映画は日曜日にする？' },
      { id: 'listening-b20-01-q4', type: 'who_when_where', prompt: '映画は何時の回ですか。', options: ['午後1時です。', '午後3時です。', '12時半です。', '午前1時です。'], correctAnswer: '午後1時です。', explanation: 'A memilih pemutaran pukul satu siang.', evidence: '午後1時の回がいい。' },
      { id: 'listening-b20-01-q5', type: 'who_when_where', prompt: '二人はどこで会いますか。', options: ['駅の前です。', '映画館の中です。', '日本語の教室です。', 'アルバイトの店です。'], correctAnswer: '駅の前です。', explanation: 'Mereka sepakat bertemu di depan stasiun.', evidence: '駅の前で12時半に会う。' },
    ],
  }),
  item({
    id: 'listening-b21-01', chapter: 21, order: 1, title: '来週のピクニック', jlptLevel: 'N4', difficulty: 'Sedang', type: 'conversation', audioSource: 'tts',
    speakerTurns: [
      { speaker: 'A', segments: [{ text: '明日', reading: 'あした' }, { text: 'のピクニック、どうする？' }] },
      { speaker: 'B', segments: [{ text: '午後', reading: 'ごご' }, { text: 'から' }, { text: '雨', reading: 'あめ' }, { text: 'が' }, { text: '降', reading: 'ふ' }, { text: 'るかもしれないよ。' }] },
      { speaker: 'A', segments: [{ text: 'でも、' }, { text: '朝', reading: 'あさ' }, { text: 'は' }, { text: '晴', reading: 'は' }, { text: 'れるでしょう。' }, { text: '私', reading: 'わたし' }, { text: 'は' }, { text: '午前中', reading: 'ごぜんちゅう' }, { text: 'に' }, { text: '行', reading: 'い' }, { text: 'くのがいいと' }, { text: '思', reading: 'おも' }, { text: 'う。' }] },
      { speaker: 'B', segments: [{ text: '山田', reading: 'やまだ' }, { text: 'さんは「11' }, { text: '時', reading: 'じ' }, { text: 'まで' }, { text: '仕事', reading: 'しごと' }, { text: 'です」と' }, { text: '言', reading: 'い' }, { text: 'ったよ。' }] },
      { speaker: 'A', segments: [{ text: 'じゃあ、' }, { text: '午前中', reading: 'ごぜんちゅう' }, { text: 'はむずかしいね。' }] },
      { speaker: 'B', segments: [{ text: 'それに、' }, { text: '公園', reading: 'こうえん' }, { text: 'は' }, { text: '駅', reading: 'えき' }, { text: 'から' }, { text: '少', reading: 'すこ' }, { text: 'し' }, { text: '遠', reading: 'とお' }, { text: 'いよ。' }, { text: '雨', reading: 'あめ' }, { text: 'が' }, { text: '降', reading: 'ふ' }, { text: 'るかもしれないから、' }, { text: '私', reading: 'わたし' }, { text: 'は' }, { text: '来週', reading: 'らいしゅう' }, { text: 'がいいと' }, { text: '思', reading: 'おも' }, { text: 'う。' }] },
      { speaker: 'A', segments: [{ text: 'なるほど。' }] },
      { speaker: 'B', segments: [{ text: 'うん。' }, { text: '私', reading: 'わたし' }, { text: 'は' }, { text: '来週', reading: 'らいしゅう' }, { text: 'にするのがいいと' }, { text: '思', reading: 'おも' }, { text: 'う。' }] },
      { speaker: 'A', segments: [{ text: 'そうだね。' }, { text: '来週', reading: 'らいしゅう' }, { text: 'にする。' }] },
    ],
    translation: ['Dua orang membahas piknik besok. Ada kemungkinan hujan pada sore hari. A berpikir pagi hari akan cerah, tetapi Yamada bekerja sampai pukul 11. Karena itu mereka memutuskan memindahkan piknik ke minggu depan.'],
    grammarTargets: ['ch21-to-omoimasu', 'ch21-to-iimasu', 'ch21-deshou', 'ch21-kamoshirenai', 'ch20-plain-verb', 'ch9-reason-kara'],
    vocabularyHelp: [
      { japanese: '降る', reading: 'ふる', meaning: 'turun (hujan/salju)' },
      { japanese: '午前中', reading: 'ごぜんちゅう', meaning: 'sepanjang pagi / sebelum siang' },
      { japanese: '来週', reading: 'らいしゅう', meaning: 'minggu depan' },
      { japanese: '晴れる', reading: 'はれる', meaning: 'menjadi cerah' },
    ],
    questions: [
      { id: 'listening-b21-01-q1', type: 'direct', prompt: '明日の午後、天気はどうなるかもしれませんか。', options: ['雨が降るかもしれません。', '雪が降るかもしれません。', 'ずっと晴れるかもしれません。', '風がありません。'], correctAnswer: '雨が降るかもしれません。', explanation: 'B menyebut ada kemungkinan hujan mulai sore.', evidence: '午後から雨が降るかもしれないよ。' },
      { id: 'listening-b21-01-q2', type: 'matching', prompt: 'Aさんは朝の天気をどう考えていますか。', options: ['晴れるでしょう。', '雨でしょう。', '雪でしょう。', 'わからないと思っています。'], correctAnswer: '晴れるでしょう。', explanation: 'A memperkirakan pagi hari akan cerah.', evidence: '朝は晴れるでしょう。' },
      { id: 'listening-b21-01-q3', type: 'who_when_where', prompt: '山田さんは何時まで仕事ですか。', options: ['11時までです。', '10時までです。', '12時までです。', '3時までです。'], correctAnswer: '11時までです。', explanation: 'B mengutip Yamada yang mengatakan bekerja sampai pukul 11.', evidence: '「11時まで仕事です」と言ったよ。' },
      { id: 'listening-b21-01-q4', type: 'reason', prompt: '午前中にピクニックへ行かないのはなぜですか。', options: ['山田さんが仕事だからです。', '朝から雨だからです。', 'Aさんが仕事だからです。', '公園が休みだからです。'], correctAnswer: '山田さんが仕事だからです。', explanation: 'Yamada belum selesai bekerja pada pagi hari.', evidence: '山田さんは「11時まで仕事です」と言ったよ。' },
      { id: 'listening-b21-01-q5', type: 'next_action', prompt: '最後に、ピクニックはいつですか。', options: ['来週ピクニックをします。', '明日の午後に行きます。', '明日の朝に行きます。', 'ピクニックをやめます。'], correctAnswer: '来週ピクニックをします。', explanation: 'Keputusan akhir adalah memindahkan piknik ke minggu depan.', evidence: '来週にする。' },
    ],
  }),
  item({
    id: 'listening-b25-01', chapter: 25, order: 1, title: '雨の日の予定変更', jlptLevel: 'N4', difficulty: 'Menantang', type: 'telephone', audioSource: 'tts',
    speakerTurns: [
      { speaker: 'A', segments: [{ text: 'もしもし、' }, { text: '明日', reading: 'あした' }, { text: 'のハイキングだけど、' }, { text: '雨', reading: 'あめ' }, { text: 'だったらどうする？' }] },
      { speaker: 'B', segments: [{ text: '少', reading: 'すこ' }, { text: 'しの' }, { text: '雨', reading: 'あめ' }, { text: 'なら' }, { text: '行', reading: 'い' }, { text: 'きたいけど、' }, { text: '強', reading: 'つよ' }, { text: 'い' }, { text: '雨', reading: 'あめ' }, { text: 'なら' }, { text: '危', reading: 'あぶ' }, { text: 'ないよ。' }] },
      { speaker: 'A', segments: [{ text: 'そうだね。' }, { text: '天気', reading: 'てんき' }, { text: 'がよければ' }, { text: '山', reading: 'やま' }, { text: 'へ' }, { text: '行', reading: 'い' }, { text: 'く？' }, { text: '雨', reading: 'あめ' }, { text: 'なら、' }, { text: '駅前', reading: 'えきまえ' }, { text: 'のスポーツセンターはどう？' }] },
      { speaker: 'B', segments: [{ text: 'いいね。スポーツセンターなら' }, { text: '雨', reading: 'あめ' }, { text: 'でも' }, { text: '運動', reading: 'うんどう' }, { text: 'できるし、' }, { text: '駅', reading: 'えき' }, { text: 'からも' }, { text: '近', reading: 'ちか' }, { text: 'い。' }] },
      { speaker: 'A', segments: [{ text: 'じゃあ、' }, { text: '朝', reading: 'あさ' }, { text: '7' }, { text: '時', reading: 'じ' }, { text: 'に' }, { text: '天気予報', reading: 'てんきよほう' }, { text: 'を' }, { text: '見', reading: 'み' }, { text: 'る。' }, { text: '晴', reading: 'は' }, { text: 'れたら8' }, { text: '時', reading: 'じ' }, { text: 'に' }, { text: '駅', reading: 'えき' }, { text: 'で' }, { text: '会', reading: 'あ' }, { text: 'う。' }] },
      { speaker: 'B', segments: [{ text: 'わかった。' }, { text: '雨', reading: 'あめ' }, { text: 'だったら10' }, { text: '時', reading: 'じ' }, { text: 'にスポーツセンターで' }, { text: '会', reading: 'あ' }, { text: 'う。' }] },
    ],
    translation: ['Dua orang membahas rencana hiking berdasarkan cuaca. Jika cuaca bagus mereka pergi ke gunung. Jika hujan, mereka memilih pusat olahraga dekat stasiun. Pukul 07.00 mereka akan memeriksa prakiraan cuaca. Jika cerah mereka bertemu pukul 08.00 di stasiun; jika hujan mereka bertemu pukul 10.00 di pusat olahraga.'],
    grammarTargets: ['ch25-tara', 'ch25-temo', 'ch25-nara', 'ch25-ba', 'ch13-tai'],
    vocabularyHelp: [
      { japanese: '危ない', reading: 'あぶない', meaning: 'berbahaya' },
      { japanese: '天気予報', reading: 'てんきよほう', meaning: 'prakiraan cuaca' },
      { japanese: '運動', reading: 'うんどう', meaning: 'olahraga' },
      { japanese: '駅前', reading: 'えきまえ', meaning: 'depan / sekitar stasiun' },
    ],
    questions: [
      { id: 'listening-b25-01-q1', type: 'matching', prompt: '強い雨なら、Bさんはハイキングについてどう考えていますか。', options: ['危ないと考えています。', '必ず行きたいと考えています。', '一人で行くと考えています。', '朝早く行けば安全だと考えています。'], correctAnswer: '危ないと考えています。', explanation: 'B membedakan hujan ringan dan hujan lebat; hujan lebat dianggap berbahaya.', evidence: '強い雨なら危ないよ。' },
      { id: 'listening-b25-01-q2', type: 'next_action', prompt: '天気がよければ、二人はどこへ行きますか。', options: ['山へ行きます。', 'スポーツセンターへ行きます。', '図書館へ行きます。', '家にいます。'], correctAnswer: '山へ行きます。', explanation: 'Cuaca bagus berarti rencana hiking tetap dilakukan.', evidence: '天気がよければ山へ行く？' },
      { id: 'listening-b25-01-q3', type: 'reason', prompt: '雨の日にスポーツセンターがいいのはなぜですか。', options: ['雨でも運動できて、駅から近いからです。', '山より高いからです。', '朝7時から開いているからです。', '無料だからです。'], correctAnswer: '雨でも運動できて、駅から近いからです。', explanation: 'B menyebut dua alasan: tetap bisa berolahraga saat hujan dan lokasinya dekat stasiun.', evidence: '雨でも運動できるし、駅からも近い。' },
      { id: 'listening-b25-01-q4', type: 'who_when_where', prompt: '二人は何時に天気予報を見ますか。', options: ['朝7時です。', '朝8時です。', '朝10時です。', '夜7時です。'], correctAnswer: '朝7時です。', explanation: 'Mereka memeriksa prakiraan cuaca pukul tujuh pagi.', evidence: '朝7時に天気予報を見る。' },
      { id: 'listening-b25-01-q5', type: 'who_when_where', prompt: '晴れたら、二人は何時に駅で会いますか。', options: ['8時です。', '7時です。', '10時です。', '9時です。'], correctAnswer: '8時です。', explanation: 'Jika cerah, waktu bertemu adalah pukul delapan di stasiun.', evidence: '晴れたら8時に駅で会う。' },
      { id: 'listening-b25-01-q6', type: 'who_when_where', prompt: '雨だったら、どこで会いますか。', options: ['スポーツセンターです。', '駅です。', '山です。', '公園です。'], correctAnswer: 'スポーツセンターです。', explanation: 'Jika hujan, mereka bertemu langsung di pusat olahraga.', evidence: '雨だったら10時にスポーツセンターで会う。' },
    ],
  }),
  item({
    id: 'listening-b30-01', chapter: 30, order: 1, title: '来月の勉強計画', jlptLevel: 'N4', difficulty: 'Menantang', type: 'school', audioSource: 'tts',
    speakerTurns: [
      { speaker: '先生', segments: [{ text: '来月', reading: 'らいげつ' }, { text: 'の' }, { text: '日本語試験', reading: 'にほんごしけん' }, { text: 'について、' }, { text: '何', reading: 'なに' }, { text: 'か' }, { text: '計画', reading: 'けいかく' }, { text: 'がありますか。' }] },
      { speaker: '学生', segments: [{ text: 'はい。' }, { text: '今年', reading: 'ことし' }, { text: 'はN4を' }, { text: '受', reading: 'う' }, { text: 'けるつもりです。' }, { text: '毎朝', reading: 'まいあさ' }, { text: '30' }, { text: '分', reading: 'ぷん' }, { text: 'ずつ' }, { text: '単語', reading: 'たんご' }, { text: 'を' }, { text: '復習', reading: 'ふくしゅう' }, { text: 'しようと' }, { text: '思', reading: 'おも' }, { text: 'っています。' }] },
      { speaker: '先生', segments: [{ text: 'いいですね。' }, { text: '週末', reading: 'しゅうまつ' }, { text: 'はどうしますか。' }] },
      { speaker: '学生', segments: [{ text: '土曜日', reading: 'どようび' }, { text: 'は' }, { text: '友', reading: 'とも' }, { text: 'だちと' }, { text: '会話', reading: 'かいわ' }, { text: 'の' }, { text: '練習', reading: 'れんしゅう' }, { text: 'をする' }, { text: '予定', reading: 'よてい' }, { text: 'です。' }, { text: '日曜日', reading: 'にちようび' }, { text: 'は' }, { text: '長', reading: 'なが' }, { text: 'い' }, { text: '文章', reading: 'ぶんしょう' }, { text: 'を' }, { text: '読', reading: 'よ' }, { text: 'もうと' }, { text: '思', reading: 'おも' }, { text: 'います。' }] },
      { speaker: '先生', segments: [{ text: '最近', reading: 'さいきん' }, { text: '、' }, { text: '長', reading: 'なが' }, { text: 'い' }, { text: '文章', reading: 'ぶんしょう' }, { text: 'も' }, { text: '読', reading: 'よ' }, { text: 'めるようになりましたね。' }] },
      { speaker: '学生', segments: [{ text: 'はい。' }, { text: '前', reading: 'まえ' }, { text: 'より' }, { text: '少', reading: 'すこ' }, { text: 'し' }, { text: '速', reading: 'はや' }, { text: 'く' }, { text: '読', reading: 'よ' }, { text: 'めるようになりました。でも、' }, { text: '聴解', reading: 'ちょうかい' }, { text: 'はまだ' }, { text: '難', reading: 'むずか' }, { text: 'しいので、' }, { text: '毎日', reading: 'まいにち' }, { text: '聞', reading: 'き' }, { text: 'く' }, { text: '練習', reading: 'れんしゅう' }, { text: 'もするつもりです。' }] },
    ],
    translation: ['Seorang siswa menjelaskan rencana belajar untuk ujian N4 bulan depan. Ia berniat mengulang kosakata 30 menit setiap pagi. Sabtu ia berencana berlatih percakapan dengan teman dan Minggu membaca teks panjang. Kemampuan membacanya sudah meningkat, tetapi listening masih sulit, jadi ia juga berniat berlatih mendengar setiap hari.'],
    grammarTargets: ['ch30-volitional', 'ch30-volitional-toomou', 'ch30-tsumori', 'ch30-yotei', 'ch30-you-ni-naru', 'ch28-node'],
    vocabularyHelp: [
      { japanese: '試験', reading: 'しけん', meaning: 'ujian' },
      { japanese: '復習', reading: 'ふくしゅう', meaning: 'mengulang pelajaran' },
      { japanese: '会話', reading: 'かいわ', meaning: 'percakapan' },
      { japanese: '文章', reading: 'ぶんしょう', meaning: 'teks / tulisan' },
      { japanese: '聴解', reading: 'ちょうかい', meaning: 'pemahaman mendengar' },
    ],
    questions: [
      { id: 'listening-b30-01-q1', type: 'direct', prompt: '学生は何の試験を受けるつもりですか。', options: ['N4です。', 'N5です。', 'N3です。', '英語の試験です。'], correctAnswer: 'N4です。', explanation: 'Siswa secara langsung mengatakan berniat mengikuti N4.', evidence: '今年はN4を受けるつもりです。' },
      { id: 'listening-b30-01-q2', type: 'direct', prompt: '毎朝、何を復習しようと思っていますか。', options: ['単語です。', '漢字だけです。', '会話だけです。', '作文だけです。'], correctAnswer: '単語です。', explanation: 'Rencana setiap pagi adalah mengulang kosakata.', evidence: '毎朝30分ずつ単語を復習しようと思っています。' },
      { id: 'listening-b30-01-q3', type: 'who_when_where', prompt: '土曜日は何をする予定ですか。', options: ['友だちと会話の練習をします。', '長い文章を読みます。', '試験を受けます。', '学校を休みます。'], correctAnswer: '友だちと会話の練習をします。', explanation: 'Latihan percakapan dengan teman dijadwalkan untuk hari Sabtu.', evidence: '土曜日は友だちと会話の練習をする予定です。' },
      { id: 'listening-b30-01-q4', type: 'matching', prompt: '学生の読む力について正しいものはどれですか。', options: ['前より速く読めるようになりました。', '前より読めなくなりました。', '長い文章はまだ全然読めません。', '読む練習をやめました。'], correctAnswer: '前より速く読めるようになりました。', explanation: 'Siswa mengatakan sekarang dapat membaca sedikit lebih cepat dibanding sebelumnya.', evidence: '前より少し速く読めるようになりました。' },
      { id: 'listening-b30-01-q5', type: 'reason', prompt: '毎日聞く練習もするのはなぜですか。', options: ['聴解がまだ難しいからです。', '読むことが嫌いだからです。', '先生が毎日試験をするからです。', '土曜日に時間がないからです。'], correctAnswer: '聴解がまだ難しいからです。', explanation: 'Listening masih terasa sulit sehingga siswa ingin berlatih setiap hari.', evidence: '聴解はまだ難しいので、毎日聞く練習もするつもりです。' },
      { id: 'listening-b30-01-q6', type: 'matching', prompt: 'この学生の勉強計画として正しいものはどれですか。', options: ['平日は単語、週末は会話や読解、毎日は聴解も練習します。', '毎日会話だけ練習します。', '週末は勉強しません。', '読む練習だけをします。'], correctAnswer: '平日は単語、週末は会話や読解、毎日は聴解も練習します。', explanation: 'Audio menyebut beberapa aktivitas belajar dengan jadwal berbeda.', evidence: '毎朝…単語…土曜日…会話…日曜日…文章…毎日聞く練習…' },
    ],
  }),
  item({
    id: 'listening-b35-01', chapter: 35, order: 1, title: '新しい商品の説明', jlptLevel: 'N4', difficulty: 'Menantang', type: 'workplace', audioSource: 'tts',
    speakerTurns: [
      { speaker: '店長', segments: [{ text: '佐藤', reading: 'さとう' }, { text: 'さん、' }, { text: '今', reading: 'いま' }, { text: 'ちょうど' }, { text: '新', reading: 'あたら' }, { text: 'しい' }, { text: '商品', reading: 'しょうひん' }, { text: 'の' }, { text: '説明', reading: 'せつめい' }, { text: 'を' }, { text: '始', reading: 'はじ' }, { text: 'めるところです。' }] },
      { speaker: '佐藤', segments: [{ text: 'すみません。' }, { text: '電車', reading: 'でんしゃ' }, { text: 'が' }, { text: '遅', reading: 'おく' }, { text: 'れて、' }, { text: '今', reading: 'いま' }, { text: '着', reading: 'つ' }, { text: 'いたばかりです。' }] },
      { speaker: '店長', segments: [{ text: '大丈夫', reading: 'だいじょうぶ' }, { text: 'です。この' }, { text: '商品', reading: 'しょうひん' }, { text: 'は' }, { text: '先週', reading: 'せんしゅう' }, { text: 'から' }, { text: '店', reading: 'みせ' }, { text: 'で' }, { text: '売', reading: 'う' }, { text: 'られています。' }, { text: '今月', reading: 'こんげつ' }, { text: 'はもっと' }, { text: '多', reading: 'おお' }, { text: 'くのお' }, { text: '客様', reading: 'きゃくさま' }, { text: 'に' }, { text: '紹介', reading: 'しょうかい' }, { text: 'していきます。' }] },
      { speaker: '佐藤', segments: [{ text: 'この' }, { text: '写真', reading: 'しゃしん' }, { text: 'はだれが' }, { text: '撮', reading: 'と' }, { text: 'ったんですか。' }] },
      { speaker: '店長', segments: [{ text: 'その' }, { text: '写真', reading: 'しゃしん' }, { text: 'は' }, { text: '田中', reading: 'たなか' }, { text: 'さんに' }, { text: '撮', reading: 'と' }, { text: 'られました。' }, { text: '新', reading: 'あたら' }, { text: 'しいポスターも' }, { text: '今日', reading: 'きょう' }, { text: 'できたところです。' }] },
      { speaker: '佐藤', segments: [{ text: 'わかりました。' }, { text: '説明', reading: 'せつめい' }, { text: 'を' }, { text: '聞', reading: 'き' }, { text: 'いたあとで、' }, { text: '売', reading: 'う' }, { text: 'り' }, { text: '場', reading: 'ば' }, { text: 'を' }, { text: '見', reading: 'み' }, { text: 'てきます。' }] },
      { speaker: '店長', segments: [{ text: 'お' }, { text: '願', reading: 'ねが' }, { text: 'いします。これからお' }, { text: '客様', reading: 'きゃくさま' }, { text: 'の' }, { text: '質問', reading: 'しつもん' }, { text: 'も' }, { text: '増', reading: 'ふ' }, { text: 'えていくと' }, { text: '思', reading: 'おも' }, { text: 'いますから、' }, { text: '特徴', reading: 'とくちょう' }, { text: 'をよく' }, { text: '確認', reading: 'かくにん' }, { text: 'してください。' }] },
    ],
    translation: ['Manajer toko hendak memulai penjelasan produk baru ketika Sato tiba setelah keretanya terlambat. Produk itu sudah dijual sejak minggu lalu dan akan terus dipromosikan kepada lebih banyak pelanggan. Foto produk diambil oleh Tanaka dan poster baru baru saja selesai dibuat. Setelah mendengarkan penjelasan, Sato akan melihat area penjualan. Manajer memperkirakan pertanyaan pelanggan akan semakin banyak, jadi Sato diminta memahami fitur produk dengan baik.'],
    grammarTargets: ['ch35-tokoro', 'ch35-ta-bakari', 'ch35-teiku', 'ch35-tekuru', 'ch35-passive', 'ch23-ta-atode', 'ch21-to-omoimasu'],
    vocabularyHelp: [
      { japanese: '商品', reading: 'しょうひん', meaning: 'produk / barang dagangan' },
      { japanese: '売り場', reading: 'うりば', meaning: 'area penjualan' },
      { japanese: '特徴', reading: 'とくちょう', meaning: 'ciri / karakteristik' },
      { japanese: '確認', reading: 'かくにん', meaning: 'memastikan / memeriksa' },
      { japanese: '遅れる', reading: 'おくれる', meaning: 'terlambat' },
    ],
    questions: [
      { id: 'listening-b35-01-q1', type: 'direct', prompt: '店長は今、何を始めるところですか。', options: ['新しい商品の説明です。', '会議です。', '店の掃除です。', '面接です。'], correctAnswer: '新しい商品の説明です。', explanation: 'Manajer mengatakan tepat akan memulai penjelasan produk baru.', evidence: '今ちょうど新しい商品の説明を始めるところです。' },
      { id: 'listening-b35-01-q2', type: 'reason', prompt: '佐藤さんが遅れたのはなぜですか。', options: ['電車が遅れたからです。', '寝坊したからです。', '店を間違えたからです。', '雨が降ったからです。'], correctAnswer: '電車が遅れたからです。', explanation: 'Sato mengatakan ia baru tiba karena kereta terlambat.', evidence: '電車が遅れて、今着いたばかりです。' },
      { id: 'listening-b35-01-q3', type: 'matching', prompt: '新しい商品について正しいものはどれですか。', options: ['先週から店で売られています。', '来週から初めて売られます。', 'もう販売が終わりました。', '田中さんだけが買えます。'], correctAnswer: '先週から店で売られています。', explanation: 'Produk tersebut sudah dijual sejak minggu lalu.', evidence: 'この商品は先週から店で売られています。' },
      { id: 'listening-b35-01-q4', type: 'who_when_where', prompt: '商品の写真はだれに撮られましたか。', options: ['田中さんです。', '佐藤さんです。', '店長です。', 'お客様です。'], correctAnswer: '田中さんです。', explanation: 'Manajer menyatakan foto itu diambil oleh Tanaka.', evidence: 'その写真は田中さんに撮られました。' },
      { id: 'listening-b35-01-q5', type: 'next_action', prompt: '佐藤さんは説明を聞いたあとで何をしますか。', options: ['売り場を見てきます。', '家へ帰ります。', '写真を撮ります。', '新しいポスターを作ります。'], correctAnswer: '売り場を見てきます。', explanation: 'Setelah penjelasan, Sato akan pergi melihat area penjualan lalu kembali.', evidence: '説明を聞いたあとで、売り場を見てきます。' },
      { id: 'listening-b35-01-q6', type: 'reason', prompt: '店長はなぜ商品の特徴をよく確認してほしいですか。', options: ['お客様の質問が増えていくと思っているからです。', '商品を今日捨てるからです。', '店を閉めるからです。', '写真を撮り直すからです。'], correctAnswer: 'お客様の質問が増えていくと思っているからです。', explanation: 'Manajer memperkirakan pertanyaan pelanggan akan bertambah, sehingga staf perlu memahami produk.', evidence: 'お客様の質問も増えていくと思いますから、特徴をよく確認してください。' },
    ],
  }),
].sort((a, b) => a.chapter - b.chapter || a.order - b.order);

export const LISTENING_ITEMS: ListeningItem[] = [
  ...LISTENING_PILOT_ITEMS,
  ...LISTENING_PHASE2_ITEMS,
].sort((a, b) => a.chapter - b.chapter || a.order - b.order);

export function getListeningItem(id: string) {
  return LISTENING_ITEMS.find((entry) => entry.id === id);
}

export function getListeningsByChapter(chapter: number) {
  return LISTENING_ITEMS.filter((entry) => entry.chapter === chapter).sort((a, b) => a.order - b.order);
}
