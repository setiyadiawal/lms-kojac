import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, RotateCcw, Sparkles, Speaker, Target, X } from 'lucide-react';
import { speakJapanese } from '../hiragana/useHiragana';
import { QuizSoundToggle } from '../quiz/QuizSoundToggle';
import { useQuizSounds } from '../quiz/useQuizSounds';
import type { VocabularyRecordReview, VocabularyWithProgress } from './useVocabulary';
import './vocabulary-quiz.css';

type QuizMode =
  | 'kanji-meaning'
  | 'meaning-kanji'
  | 'kanji-kana'
  | 'kana-meaning'
  | 'meaning-kana'
  | 'kana-kanji'
  | 'typing'
  | 'audio'
  | 'matching'
  | 'mixed';

type FixedChoiceKind =
  | 'kanji-meaning'
  | 'meaning-kanji'
  | 'kanji-kana'
  | 'kana-meaning'
  | 'meaning-kana'
  | 'kana-kanji';

type TypingKind =
  | 'typing-kanji-romaji'
  | 'typing-kanji-kana'
  | 'typing-meaning-kana'
  | 'typing-meaning-romaji';

type AudioKind = 'audio-meaning' | 'audio-japanese';

type QuestionKind = FixedChoiceKind | TypingKind | AudioKind | 'matching';
type QuizCount = 5 | 10 | 15 | 20 | 25 | 30 | 40 | 50 | 'all';
type ReviewView = 'result' | 'summary' | 'questions';
type PromptTone = 'kanji' | 'kana' | 'meaning' | 'audio';
type AnswerTone = 'kanji' | 'kana' | 'romaji' | 'meaning' | 'japanese';

type QuizQuestion = {
  id: string;
  item: VocabularyWithProgress;
  kind: QuestionKind;
  instruction: string;
  prompt: string;
  promptTone: PromptTone;
  correctAnswer: string;
  answerTone: AnswerTone;
  options: string[];
};

type QuizAttempt = {
  question: QuizQuestion;
  userAnswer: string;
  correct: boolean;
};

type MatchingPair = {
  item: VocabularyWithProgress;
  left: string;
  right: string;
};

type MatchingRound = {
  pairs: MatchingPair[];
  rightOptions: Array<{ id: string; label: string }>;
};

const QUIZ_COUNTS: Exclude<QuizCount, 'all'>[] = [5, 10, 15, 20, 25, 30, 40, 50];

const QUIZ_MODES: Array<{ mode: QuizMode; title: string; description: string }> = [
  { mode: 'kanji-meaning', title: 'Kanji → Arti', description: 'Pilih arti Indonesia dari Kanji.' },
  { mode: 'meaning-kanji', title: 'Arti → Kanji', description: 'Pilih Kanji berdasarkan arti.' },
  { mode: 'kanji-kana', title: 'Kanji → Kana', description: 'Pilih reading Kana yang benar.' },
  { mode: 'kana-meaning', title: 'Kana → Arti', description: 'Pilih arti Indonesia dari Kana.' },
  { mode: 'meaning-kana', title: 'Arti → Kana', description: 'Pilih reading Kana berdasarkan arti.' },
  { mode: 'kana-kanji', title: 'Kana → Kanji', description: 'Pilih Kanji berdasarkan reading Kana.' },
  { mode: 'typing', title: 'Ketik Jawaban', description: 'Ketik Kana atau Romaji sesuai soal.' },
  { mode: 'audio', title: 'Dengarkan & Pilih', description: 'Dengarkan bunyi lalu pilih jawaban.' },
  { mode: 'matching', title: 'Matching', description: 'Cocokkan bahasa Jepang dengan arti.' },
  { mode: 'mixed', title: 'Campuran', description: 'Tipe pertanyaan berubah secara acak.' },
];

function containsKanji(text: string) {
  return /[\u3400-\u9fff々〆ヵヶ]/u.test(text);
}

function kanaOf(item: VocabularyWithProgress) {
  return (item.reading || item.prompt).trim();
}

function meaningOf(item: VocabularyWithProgress) {
  return (item.meaning_id || '').trim();
}

function japaneseOf(item: VocabularyWithProgress) {
  return containsKanji(item.prompt) ? item.prompt.trim() : kanaOf(item);
}

function hasKanji(item: VocabularyWithProgress) {
  return containsKanji(item.prompt) && Boolean(item.prompt.trim());
}

function shuffle<T>(source: T[]) {
  const copy = [...source];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function uniqueBy<T>(source: T[], getValue: (entry: T) => string) {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const entry of source) {
    const value = getValue(entry);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(entry);
  }
  return result;
}

function eligibleForFixedKind(kind: FixedChoiceKind, item: VocabularyWithProgress) {
  const kana = kanaOf(item);
  const meaning = meaningOf(item);
  if (kind === 'kanji-meaning') return hasKanji(item) && Boolean(meaning);
  if (kind === 'meaning-kanji') return hasKanji(item) && Boolean(meaning);
  if (kind === 'kanji-kana') return hasKanji(item) && Boolean(kana);
  if (kind === 'kana-meaning') return Boolean(kana && meaning);
  if (kind === 'meaning-kana') return Boolean(kana && meaning);
  return hasKanji(item) && Boolean(kana);
}

function fixedCorrectAnswer(kind: FixedChoiceKind, item: VocabularyWithProgress) {
  if (kind === 'kanji-meaning' || kind === 'kana-meaning') return meaningOf(item);
  if (kind === 'meaning-kanji' || kind === 'kana-kanji') return item.prompt.trim();
  return kanaOf(item);
}

function fixedPrompt(kind: FixedChoiceKind, item: VocabularyWithProgress) {
  if (kind === 'kanji-meaning' || kind === 'kanji-kana') return item.prompt.trim();
  if (kind === 'meaning-kanji' || kind === 'meaning-kana') return meaningOf(item);
  return kanaOf(item);
}

function fixedPromptTone(kind: FixedChoiceKind): PromptTone {
  if (kind === 'kanji-meaning' || kind === 'kanji-kana') return 'kanji';
  if (kind === 'meaning-kanji' || kind === 'meaning-kana') return 'meaning';
  return 'kana';
}

function fixedAnswerTone(kind: FixedChoiceKind): AnswerTone {
  if (kind === 'kanji-meaning' || kind === 'kana-meaning') return 'meaning';
  if (kind === 'meaning-kanji' || kind === 'kana-kanji') return 'kanji';
  return 'kana';
}

function fixedInstruction(kind: FixedChoiceKind) {
  if (kind === 'kanji-meaning') return 'Pilih arti yang benar.';
  if (kind === 'meaning-kanji') return 'Pilih Kanji yang benar.';
  if (kind === 'kanji-kana') return 'Pilih reading Kana yang benar.';
  if (kind === 'kana-meaning') return 'Pilih arti yang benar.';
  if (kind === 'meaning-kana') return 'Pilih Kana yang benar.';
  return 'Pilih Kanji yang benar.';
}

function sameTopicScore(correct: VocabularyWithProgress, candidate: VocabularyWithProgress) {
  let score = 0;
  if (correct.category && candidate.category === correct.category) score += 2;
  if (correct.jenis && candidate.jenis === correct.jenis) score += 1;
  return score;
}

function buildChoiceOptions(
  correct: VocabularyWithProgress,
  pool: VocabularyWithProgress[],
  getAnswer: (item: VocabularyWithProgress) => string,
) {
  const expected = getAnswer(correct);
  if (!expected) return [];

  const candidates = uniqueBy(
    pool.filter((item) => item.id !== correct.id && Boolean(getAnswer(item)) && getAnswer(item) !== expected),
    getAnswer,
  );

  const ordered = [3, 2, 1, 0].flatMap((targetScore) => shuffle(
    candidates.filter((candidate) => sameTopicScore(correct, candidate) === targetScore),
  ));

  const distractors: string[] = [];
  const used = new Set<string>([expected]);
  for (const candidate of ordered) {
    const answer = getAnswer(candidate);
    if (!answer || used.has(answer)) continue;
    distractors.push(answer);
    used.add(answer);
    if (distractors.length === 3) break;
  }

  if (distractors.length < 3) {
    for (const candidate of shuffle(candidates)) {
      const answer = getAnswer(candidate);
      if (!answer || used.has(answer)) continue;
      distractors.push(answer);
      used.add(answer);
      if (distractors.length === 3) break;
    }
  }

  return distractors.length === 3 ? shuffle([expected, ...distractors]) : [];
}

function buildFixedQuestion(kind: FixedChoiceKind, item: VocabularyWithProgress, pool: VocabularyWithProgress[]): QuizQuestion | null {
  if (!eligibleForFixedKind(kind, item)) return null;
  const options = buildChoiceOptions(item, pool.filter((candidate) => eligibleForFixedKind(kind, candidate)), (candidate) => fixedCorrectAnswer(kind, candidate));
  if (options.length < 4) return null;

  return {
    id: `${item.id}-${kind}`,
    item,
    kind,
    instruction: fixedInstruction(kind),
    prompt: fixedPrompt(kind, item),
    promptTone: fixedPromptTone(kind),
    correctAnswer: fixedCorrectAnswer(kind, item),
    answerTone: fixedAnswerTone(kind),
    options,
  };
}

function typingKindsForItem(item: VocabularyWithProgress): TypingKind[] {
  const result: TypingKind[] = [];
  const kana = kanaOf(item);
  const meaning = meaningOf(item);
  if (hasKanji(item) && item.romaji.trim()) result.push('typing-kanji-romaji');
  if (hasKanji(item) && kana) result.push('typing-kanji-kana');
  if (meaning && kana) result.push('typing-meaning-kana');
  if (meaning && item.romaji.trim()) result.push('typing-meaning-romaji');
  return result;
}

function buildTypingQuestion(item: VocabularyWithProgress, forcedKind?: TypingKind): QuizQuestion | null {
  const available = typingKindsForItem(item);
  if (!available.length) return null;
  const kind = forcedKind && available.includes(forcedKind) ? forcedKind : shuffle(available)[0];

  if (kind === 'typing-kanji-romaji') {
    return {
      id: `${item.id}-${kind}`,
      item,
      kind,
      instruction: 'Ketik Romaji yang benar.',
      prompt: item.prompt,
      promptTone: 'kanji',
      correctAnswer: item.romaji.trim(),
      answerTone: 'romaji',
      options: [],
    };
  }
  if (kind === 'typing-kanji-kana') {
    return {
      id: `${item.id}-${kind}`,
      item,
      kind,
      instruction: 'Ketik Kana yang benar.',
      prompt: item.prompt,
      promptTone: 'kanji',
      correctAnswer: kanaOf(item),
      answerTone: 'kana',
      options: [],
    };
  }
  if (kind === 'typing-meaning-romaji') {
    return {
      id: `${item.id}-${kind}`,
      item,
      kind,
      instruction: 'Ketik Romaji dari kosakata ini.',
      prompt: meaningOf(item),
      promptTone: 'meaning',
      correctAnswer: item.romaji.trim(),
      answerTone: 'romaji',
      options: [],
    };
  }
  return {
    id: `${item.id}-${kind}`,
    item,
    kind,
    instruction: 'Ketik Kana dari kosakata ini.',
    prompt: meaningOf(item),
    promptTone: 'meaning',
    correctAnswer: kanaOf(item),
    answerTone: 'kana',
    options: [],
  };
}

function audioKindsForItem(item: VocabularyWithProgress) {
  const result: AudioKind[] = [];
  if (meaningOf(item)) result.push('audio-meaning');
  if (japaneseOf(item)) result.push('audio-japanese');
  return result;
}

function buildAudioQuestion(item: VocabularyWithProgress, pool: VocabularyWithProgress[], forcedKind?: AudioKind): QuizQuestion | null {
  const available = audioKindsForItem(item);
  if (!available.length) return null;
  const kind = forcedKind && available.includes(forcedKind) ? forcedKind : shuffle(available)[0];
  const getAnswer = kind === 'audio-meaning' ? meaningOf : japaneseOf;
  const options = buildChoiceOptions(item, pool.filter((candidate) => Boolean(getAnswer(candidate))), getAnswer);
  if (options.length < 4) return null;

  return {
    id: `${item.id}-${kind}`,
    item,
    kind,
    instruction: kind === 'audio-meaning'
      ? 'Dengarkan, lalu pilih arti yang benar.'
      : 'Dengarkan, lalu pilih tulisan Jepang yang benar.',
    prompt: kanaOf(item),
    promptTone: 'audio',
    correctAnswer: getAnswer(item),
    answerTone: kind === 'audio-meaning' ? 'meaning' : 'japanese',
    options,
  };
}

function viableFixedKindsForMixed(item: VocabularyWithProgress, pool: VocabularyWithProgress[]) {
  const candidates: FixedChoiceKind[] = ['kanji-meaning', 'meaning-kanji', 'kanji-kana', 'kana-meaning'];
  return candidates.filter((kind) => Boolean(buildFixedQuestion(kind, item, pool)));
}

function buildMixedQuestion(item: VocabularyWithProgress, pool: VocabularyWithProgress[], audioSupported: boolean) {
  const builders: Array<() => QuizQuestion | null> = [];
  for (const kind of viableFixedKindsForMixed(item, pool)) builders.push(() => buildFixedQuestion(kind, item, pool));
  if (typingKindsForItem(item).length) builders.push(() => buildTypingQuestion(item));
  if (audioSupported && audioKindsForItem(item).length) builders.push(() => buildAudioQuestion(item, pool));

  for (const builder of shuffle(builders)) {
    const question = builder();
    if (question) return question;
  }
  return null;
}

function eligibleItemsForMode(mode: QuizMode, items: VocabularyWithProgress[], audioSupported: boolean) {
  if (mode === 'typing') return items.filter((item) => typingKindsForItem(item).length > 0);
  if (mode === 'audio') return audioSupported ? items.filter((item) => audioKindsForItem(item).length > 0) : [];
  if (mode === 'matching') {
    return uniqueBy(
      uniqueBy(items.filter((item) => Boolean(japaneseOf(item) && meaningOf(item))), japaneseOf),
      meaningOf,
    );
  }
  if (mode === 'mixed') return items.filter((item) => Boolean(buildMixedQuestion(item, items, audioSupported)));
  return items.filter((item) => Boolean(buildFixedQuestion(mode, item, items)));
}

function buildQuestionForMode(mode: Exclude<QuizMode, 'matching' | 'mixed'>, item: VocabularyWithProgress, pool: VocabularyWithProgress[]) {
  if (mode === 'typing') return buildTypingQuestion(item);
  if (mode === 'audio') return buildAudioQuestion(item, pool);
  return buildFixedQuestion(mode, item, pool);
}

function normalizeTypedAnswer(value: string, answerTone: AnswerTone) {
  const trimmed = value.trim();
  return answerTone === 'romaji' ? trimmed.toLowerCase() : trimmed;
}

function sessionSize(count: QuizCount, available: number) {
  return count === 'all' ? available : Math.min(count, available);
}

function buildMatchingRounds(deck: VocabularyWithProgress[]) {
  if (!deck.length) return [];
  const roundCount = Math.max(1, Math.ceil(deck.length / 6));
  const baseSize = Math.floor(deck.length / roundCount);
  const largerRounds = deck.length % roundCount;
  const rounds: MatchingRound[] = [];
  let offset = 0;

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const size = baseSize + (roundIndex < largerRounds ? 1 : 0);
    const items = deck.slice(offset, offset + size);
    offset += size;
    const pairs = items.map((item) => ({ item, left: japaneseOf(item), right: meaningOf(item) }));
    rounds.push({
      pairs,
      rightOptions: shuffle(pairs.map((pair) => ({ id: pair.item.id, label: pair.right }))),
    });
  }

  return rounds;
}

function quizModeLabel(mode: QuizMode) {
  return QUIZ_MODES.find((entry) => entry.mode === mode)?.title ?? 'Quiz';
}

function questionKindLabel(kind: QuestionKind) {
  if (kind === 'matching') return 'Matching';
  if (kind === 'typing-kanji-romaji') return 'Ketik: Kanji → Romaji';
  if (kind === 'typing-kanji-kana') return 'Ketik: Kanji → Kana';
  if (kind === 'typing-meaning-kana') return 'Ketik: Arti → Kana';
  if (kind === 'typing-meaning-romaji') return 'Ketik: Arti → Romaji';
  if (kind === 'audio-meaning') return 'Dengarkan → Arti';
  if (kind === 'audio-japanese') return 'Dengarkan → Jepang';
  return quizModeLabel(kind);
}

function promptSummary(question: QuizQuestion) {
  return question.promptTone === 'audio' ? `🔊 ${kanaOf(question.item)}` : question.prompt;
}

export function VocabularyQuiz({ items, onRecordReview }: { items: VocabularyWithProgress[]; onRecordReview: VocabularyRecordReview }) {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [count, setCount] = useState<QuizCount>(items.length >= 10 ? 10 : 'all');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [matchingRounds, setMatchingRounds] = useState<MatchingRound[]>([]);
  const [matchingRoundIndex, setMatchingRoundIndex] = useState(0);
  const [matchingSelectedId, setMatchingSelectedId] = useState<string | null>(null);
  const [matchingCompletedIds, setMatchingCompletedIds] = useState<string[]>([]);
  const [matchingMistakeIds, setMatchingMistakeIds] = useState<string[]>([]);
  const [matchingWrongRightId, setMatchingWrongRightId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [answerCorrect, setAnswerCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [reviewView, setReviewView] = useState<ReviewView>('result');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [progressSavingCount, setProgressSavingCount] = useState(0);
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);
  const { soundEnabled, toggleSound, playCorrect, playIncorrect, playComplete } = useQuizSounds();
  const recordedReviewKeysRef = useRef<Set<string>>(new Set());

  const audioSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const availableForMode = useMemo(
    () => mode ? eligibleItemsForMode(mode, items, audioSupported).length : items.length,
    [audioSupported, items, mode],
  );


  const recordQuizReviewOnce = async (reviewKey: string, itemId: string, correct: boolean) => {
    if (recordedReviewKeysRef.current.has(reviewKey)) return;
    recordedReviewKeysRef.current.add(reviewKey);
    setProgressSavingCount((current) => current + 1);
    setProgressSaveError(null);

    try {
      await onRecordReview(itemId, correct ? 2 : 0);
    } catch (saveError) {
      setProgressSaveError(saveError instanceof Error
        ? saveError.message
        : 'Jawaban Quiz tersimpan di sesi, tetapi progress SRS gagal disimpan.');
    } finally {
      setProgressSavingCount((current) => Math.max(0, current - 1));
    }
  };

  useEffect(() => {
    if (count === 'all' || count <= availableForMode) return;
    setCount(availableForMode >= 10 ? 10 : 'all');
  }, [availableForMode, count]);

  if (items.length === 0) {
    return <div className="vocab-inline-empty"><strong>Belum ada kosakata untuk Quiz</strong><span>Quiz akan menggunakan kosakata dari Bab ini.</span></div>;
  }

  function resetSessionState() {
    setIndex(0);
    setSelected(null);
    setTypedAnswer('');
    setAnswered(false);
    setAnswerCorrect(false);
    setScore(0);
    setFinished(false);
    setAttempts([]);
    setReviewView('result');
    setReviewIndex(0);
    setMatchingRoundIndex(0);
    setMatchingSelectedId(null);
    setMatchingCompletedIds([]);
    setMatchingMistakeIds([]);
    setMatchingWrongRightId(null);
    setProgressSavingCount(0);
    setProgressSaveError(null);
    recordedReviewKeysRef.current.clear();
  }

  function startQuiz() {
    if (!mode) return;
    if (mode === 'audio' && !audioSupported) return;

    const eligible = eligibleItemsForMode(mode, items, audioSupported);
    if (!eligible.length) return;
    const deck = shuffle(eligible).slice(0, sessionSize(count, eligible.length));
    if (!deck.length) return;

    if (mode === 'matching') {
      if (deck.length < 4) return;
      setMatchingRounds(buildMatchingRounds(deck));
      setQuestions([]);
    } else if (mode === 'mixed') {
      const nextQuestions = deck
        .map((item) => buildMixedQuestion(item, items, audioSupported))
        .filter((question): question is QuizQuestion => Boolean(question));
      if (!nextQuestions.length) return;
      setQuestions(nextQuestions);
      setMatchingRounds([]);
    } else {
      const nextQuestions = deck
        .map((item) => buildQuestionForMode(mode, item, items))
        .filter((question): question is QuizQuestion => Boolean(question));
      if (!nextQuestions.length) return;
      setQuestions(nextQuestions);
      setMatchingRounds([]);
    }

    resetSessionState();
    setStarted(true);
  }

  function chooseAnotherQuiz() {
    setMode(null);
    setStarted(false);
    setQuestions([]);
    setMatchingRounds([]);
    resetSessionState();
  }

  if (!started) {
    return <QuizSetup
      items={items}
      mode={mode}
      count={count}
      availableForMode={availableForMode}
      audioSupported={audioSupported}
      onMode={setMode}
      onCount={setCount}
      onStart={startQuiz}
    />;
  }

  const total = mode === 'matching'
    ? matchingRounds.reduce((sum, round) => sum + round.pairs.length, 0)
    : questions.length;
  const wrongAttempts = attempts.filter((attempt) => !attempt.correct);

  if (finished) {
    if (reviewView === 'summary') {
      return <WrongSummary attempts={wrongAttempts} onBack={() => setReviewView('result')}/>;
    }
    if (reviewView === 'questions') {
      return <WrongQuestionReview
        attempts={wrongAttempts}
        index={reviewIndex}
        onIndex={setReviewIndex}
        onBack={() => {
          setReviewView('result');
          setReviewIndex(0);
        }}
      />;
    }

    const wrong = Math.max(total - score, 0);
    const pct = total ? Math.round((score / total) * 100) : 0;
    return <div className="vocab-quiz-result">
      <div className="vocab-quiz-result-icon"><Sparkles size={30}/></div>
      <p className="eyebrow">HASIL QUIZ</p>
      <h2>{score}/{total}</h2>
      <strong className="vocab-quiz-result-score">Nilai: {pct}%</strong>
      <div className="vocab-quiz-result-stats">
        <span><strong>{score}</strong>Benar</span>
        <span><strong>{wrong}</strong>Salah</span>
        <span><strong>{total}</strong>Total</span>
      </div>
      <p>{pct >= 80 ? 'Bagus! Pertahankan hasilnya dan ulangi lagi secara berkala.' : 'Pelajari kembali kosakata yang masih salah, lalu coba lagi.'}</p>
      <div className="vocab-quiz-result-actions">
        <button type="button" className="vocab-quiz-primary" onClick={startQuiz}><RotateCcw size={17}/> Ulangi Quiz</button>
        <button type="button" className="vocab-quiz-ghost" onClick={chooseAnotherQuiz}><Target size={17}/> Pilih Quiz Lain</button>
      </div>
      {wrongAttempts.length > 0 && <div className="vocab-quiz-review-actions">
        <span>REVIEW JAWABAN SALAH</span>
        <div>
          <button type="button" className="vocab-quiz-ghost" onClick={() => setReviewView('summary')}>Rekapan Jawaban Salah</button>
          <button type="button" className="vocab-quiz-ghost" onClick={() => {
            setReviewIndex(0);
            setReviewView('questions');
          }}>Lihat Soal yang Salah</button>
        </div>
      </div>}
    </div>;
  }

  if (mode === 'matching') {
    const round = matchingRounds[matchingRoundIndex];
    if (!round) return <QuizEmpty text="Ronde Matching tidak tersedia."/>;
    const completedInRound = round.pairs.filter((pair) => matchingCompletedIds.includes(pair.item.id)).length;
    const completedTotal = matchingCompletedIds.length;
    const roundDone = completedInRound === round.pairs.length;
    const wrong = matchingMistakeIds.length;

    function chooseRight(optionId: string) {
      if (!matchingSelectedId || roundDone) return;
      const pair = round.pairs.find((candidate) => candidate.item.id === matchingSelectedId);
      const option = round.rightOptions.find((candidate) => candidate.id === optionId);
      if (!pair || !option || matchingCompletedIds.includes(pair.item.id)) return;

      if (pair.item.id !== option.id) {
        playIncorrect();
        setMatchingWrongRightId(option.id);
        setMatchingMistakeIds((current) => current.includes(pair.item.id) ? current : [...current, pair.item.id]);
        setAttempts((current) => {
          const question = matchingQuestion(pair);
          const attempt: QuizAttempt = { question, userAnswer: option.label, correct: false };
          const existing = current.findIndex((entry) => entry.question.id === question.id);
          if (existing < 0) return [...current, attempt];
          const next = [...current];
          next[existing] = attempt;
          return next;
        });
        return;
      }

      const hadMistake = matchingMistakeIds.includes(pair.item.id);
      playCorrect();
      void recordQuizReviewOnce(`matching-${pair.item.id}`, pair.item.id, !hadMistake);
      if (!hadMistake) {
        setScore((current) => current + 1);
        setAttempts((current) => [...current, {
          question: matchingQuestion(pair),
          userAnswer: pair.right,
          correct: true,
        }]);
      }
      setMatchingCompletedIds((current) => [...current, pair.item.id]);
      setMatchingSelectedId(null);
      setMatchingWrongRightId(null);
    }

    function nextRound() {
      if (!roundDone || progressSavingCount > 0) return;
      if (matchingRoundIndex + 1 >= matchingRounds.length) {
        playComplete();
        setFinished(true);
      }
      else {
        setMatchingRoundIndex((current) => current + 1);
        setMatchingSelectedId(null);
        setMatchingWrongRightId(null);
      }
    }

    return <div className="vocab-quiz-shell">
      <QuizTop position={Math.min(completedTotal + 1, total)} completed={completedTotal} total={total} score={score} wrong={wrong} soundEnabled={soundEnabled} onSoundToggle={toggleSound}/>
      {progressSaveError && <div className="vocab-quiz-progress-error" role="alert">Progress SRS belum tersimpan: {progressSaveError}</div>}
      <div className="vocab-quiz-question-card vocab-quiz-matching-card">
        <div className="vocab-quiz-question-heading">
          <span>Matching</span>
          <p>Pilih kosakata Jepang di kiri, lalu cocokkan dengan arti di kanan.</p>
        </div>
        <div className="vocab-quiz-matching-board">
          <div className="vocab-quiz-matching-column">
            {round.pairs.map((pair) => {
              const completed = matchingCompletedIds.includes(pair.item.id);
              return <button
                type="button"
                key={pair.item.id}
                disabled={completed}
                className={`${matchingSelectedId === pair.item.id ? 'selected' : ''} ${completed ? 'completed' : ''}`}
                onClick={() => {
                  setMatchingSelectedId(pair.item.id);
                  setMatchingWrongRightId(null);
                }}
              >
                <strong>{pair.left}</strong>
                {completed && <Check size={17}/>} 
              </button>;
            })}
          </div>
          <div className="vocab-quiz-matching-column meanings">
            {round.rightOptions.map((option) => {
              const completed = matchingCompletedIds.includes(option.id);
              const wrongState = matchingWrongRightId === option.id;
              return <button
                type="button"
                key={option.id}
                disabled={completed || !matchingSelectedId}
                className={`${completed ? 'completed' : ''} ${wrongState ? 'wrong' : ''}`}
                onClick={() => chooseRight(option.id)}
              >
                <span>{option.label}</span>
                {completed && <Check size={17}/>} 
              </button>;
            })}
          </div>
        </div>
        {roundDone && <div className="vocab-quiz-feedback ok">
          <strong>Ronde selesai.</strong>
          <button type="button" disabled={progressSavingCount > 0} onClick={nextRound}>{progressSavingCount > 0 ? 'Menyimpan…' : matchingRoundIndex + 1 === matchingRounds.length ? 'Lihat hasil' : 'Ronde berikutnya'} <ChevronRight size={17}/></button>
        </div>}
      </div>
    </div>;
  }

  const question = questions[index];
  if (!question) return <QuizEmpty text="Soal Quiz tidak tersedia."/>;
  const answeredCount = index + (answered ? 1 : 0);
  const wrong = answeredCount - score;

  function submitAnswer(value: string) {
    if (answered) return;
    const normalizedValue = question.options.length === 0
      ? normalizeTypedAnswer(value, question.answerTone)
      : value;
    const normalizedExpected = question.options.length === 0
      ? normalizeTypedAnswer(question.correctAnswer, question.answerTone)
      : question.correctAnswer;
    const correct = normalizedValue === normalizedExpected;
    if (correct) playCorrect();
    else playIncorrect();

    setSelected(value);
    setAnswered(true);
    setAnswerCorrect(correct);
    if (correct) setScore((current) => current + 1);
    setAttempts((current) => [...current, { question, userAnswer: value, correct }]);
    void recordQuizReviewOnce(question.id, question.item.id, correct);
  }

  function nextQuestion() {
    if (progressSavingCount > 0) return;
    if (index + 1 >= questions.length) {
      playComplete();
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
    setSelected(null);
    setTypedAnswer('');
    setAnswered(false);
    setAnswerCorrect(false);
  }

  return <div className="vocab-quiz-shell">
    <QuizTop position={index + 1} completed={answeredCount} total={questions.length} score={score} wrong={wrong} soundEnabled={soundEnabled} onSoundToggle={toggleSound}/>
    {progressSaveError && <div className="vocab-quiz-progress-error" role="alert">Progress SRS belum tersimpan: {progressSaveError}</div>}
    <div className="vocab-quiz-question-card">
      <QuestionPrompt question={question}/>

      {question.options.length === 0 ? <form className="vocab-quiz-typing-form" onSubmit={(event) => {
        event.preventDefault();
        if (typedAnswer.trim()) submitAnswer(typedAnswer);
      }}>
        <input
          type="text"
          value={typedAnswer}
          disabled={answered}
          onChange={(event) => setTypedAnswer(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label={question.answerTone === 'romaji' ? 'Jawaban Romaji' : 'Jawaban Kana'}
          placeholder={question.answerTone === 'romaji' ? 'Ketik Romaji…' : 'Ketik Kana…'}
        />
        <button type="submit" className="vocab-quiz-primary" disabled={answered || !typedAnswer.trim()}>Jawab</button>
      </form> : <div className={`vocab-quiz-options tone-${question.answerTone}`}>
        {question.options.map((option) => {
          let state = '';
          if (answered && option === question.correctAnswer) state = 'correct';
          else if (answered && option === selected) state = 'wrong';
          return <button
            type="button"
            key={option}
            disabled={answered}
            className={state}
            onClick={() => submitAnswer(option)}
          >
            <span>{option}</span>
            {state === 'correct' && <Check size={18}/>} 
            {state === 'wrong' && <X size={18}/>} 
          </button>;
        })}
      </div>}

      {answered && <div className={`vocab-quiz-feedback ${answerCorrect ? 'ok' : 'bad'}`}>
        <div>
          <strong>{answerCorrect ? 'Benar!' : 'Belum tepat.'}</strong>
          {!answerCorrect && <span>Jawaban benar: <b>{question.correctAnswer}</b></span>}
        </div>
        <button type="button" disabled={progressSavingCount > 0} onClick={nextQuestion}>{progressSavingCount > 0 ? 'Menyimpan…' : index + 1 === questions.length ? 'Lihat hasil' : 'Selanjutnya'} <ChevronRight size={17}/></button>
      </div>}
    </div>
  </div>;
}

function QuizSetup({
  items,
  mode,
  count,
  availableForMode,
  audioSupported,
  onMode,
  onCount,
  onStart,
}: {
  items: VocabularyWithProgress[];
  mode: QuizMode | null;
  count: QuizCount;
  availableForMode: number;
  audioSupported: boolean;
  onMode: (mode: QuizMode) => void;
  onCount: (count: QuizCount) => void;
  onStart: () => void;
}) {
  const canStart = Boolean(mode) && availableForMode > 0 && (mode !== 'matching' || availableForMode >= 4) && (mode !== 'audio' || audioSupported);
  const validCountOptions: QuizCount[] = [
    ...QUIZ_COUNTS.filter((option) => option <= availableForMode),
    'all',
  ];

  return <div className="vocab-quiz-shell vocab-quiz-setup">
    <section className="vocab-quiz-setup-card">
      <div className="vocab-quiz-setup-heading">
        <p className="eyebrow">PILIH JENIS QUIZ</p>
        <h2>Quiz Vocabulary</h2>
        <p>Pilih tipe latihan dan jumlah soal. Semua soal menggunakan kosakata Bab ini.</p>
      </div>

      <div className="vocab-quiz-mode-grid">
        {QUIZ_MODES.map((option, position) => {
          const eligible = eligibleItemsForMode(option.mode, items, audioSupported).length;
          const disabled = eligible === 0 || (option.mode === 'matching' && eligible < 4) || (option.mode === 'audio' && !audioSupported);
          return <button
            type="button"
            key={option.mode}
            disabled={disabled}
            className={mode === option.mode ? 'active' : ''}
            onClick={() => onMode(option.mode)}
          >
            <span className="vocab-quiz-mode-number">{position + 1}</span>
            <span>
              <strong>{option.title}</strong>
              <small>{option.mode === 'audio' && !audioSupported ? 'Audio browser tidak tersedia.' : option.description}</small>
            </span>
          </button>;
        })}
      </div>

      <div className="vocab-quiz-count-block">
        <div>
          <strong>Jumlah soal</strong>
          <span>{mode ? `${availableForMode} kosakata cocok untuk mode ini.` : `${items.length} kosakata tersedia di Bab ini.`}</span>
        </div>
        <div className="vocab-quiz-count-row">
          {validCountOptions.map((option) => <button
            type="button"
            key={String(option)}
            className={count === option ? 'active' : ''}
            onClick={() => onCount(option)}
          >
            {option === 'all' ? 'Semua' : option}
          </button>)}
        </div>
      </div>

      <button type="button" className="vocab-quiz-primary vocab-quiz-start" disabled={!canStart} onClick={onStart}>Mulai Quiz</button>
    </section>
  </div>;
}

function QuizTop({ position, completed, total, score, wrong, soundEnabled, onSoundToggle }: { position: number; completed: number; total: number; score: number; wrong: number; soundEnabled: boolean; onSoundToggle: () => void }) {
  return <div className="vocab-quiz-top quiz-sfx-host">
    <span>Soal {position} / {total}</span>
    <div className="vocab-quiz-progress"><i style={{ width: `${total ? (completed / total) * 100 : 0}%` }}/></div>
    <strong>Benar: {score}</strong>
    <strong>Salah: {Math.max(wrong, 0)}</strong>
    <QuizSoundToggle enabled={soundEnabled} onToggle={onSoundToggle}/>
  </div>;
}

function QuestionPrompt({ question, readOnly = false }: { question: QuizQuestion; readOnly?: boolean }) {
  if (question.promptTone === 'audio') {
    return <div className="vocab-quiz-question-heading">
      <span>{questionKindLabel(question.kind)}</span>
      <p>{question.instruction}</p>
      <button
        type="button"
        className="vocab-quiz-listen"
        onClick={() => speakJapanese(kanaOf(question.item))}
        aria-label={`Dengarkan ${kanaOf(question.item)}`}
      ><Speaker size={20}/><span>Dengarkan</span></button>
      {readOnly && <small>Audio tetap dapat diputar saat review.</small>}
    </div>;
  }

  return <div className="vocab-quiz-question-heading">
    <span>{questionKindLabel(question.kind)}</span>
    <p>{question.instruction}</p>
    <div className={`vocab-quiz-main-prompt tone-${question.promptTone}`}>{question.prompt}</div>
  </div>;
}

function matchingQuestion(pair: MatchingPair): QuizQuestion {
  return {
    id: `${pair.item.id}-matching`,
    item: pair.item,
    kind: 'matching',
    instruction: 'Cocokkan kosakata Jepang dengan arti yang benar.',
    prompt: pair.left,
    promptTone: hasKanji(pair.item) ? 'kanji' : 'kana',
    correctAnswer: pair.right,
    answerTone: 'meaning',
    options: [],
  };
}

function WrongSummary({ attempts, onBack }: { attempts: QuizAttempt[]; onBack: () => void }) {
  return <div className="vocab-quiz-shell vocab-quiz-review-shell">
    <div className="vocab-quiz-review-header">
      <div>
        <p className="eyebrow">REVIEW QUIZ</p>
        <h2>Rekapan Jawaban Salah</h2>
        <p>{attempts.length} jawaban perlu dipelajari kembali.</p>
      </div>
      <button type="button" className="vocab-quiz-ghost" onClick={onBack}>Kembali ke Hasil</button>
    </div>

    <div className="vocab-quiz-wrong-list">
      {attempts.map((attempt, position) => <article className="vocab-quiz-wrong-item" key={`${attempt.question.id}-${position}`}>
        <div className="vocab-quiz-wrong-top"><span>{position + 1}</span><small>{questionKindLabel(attempt.question.kind)}</small></div>
        <div className={`vocab-quiz-wrong-prompt tone-${attempt.question.promptTone}`}>{promptSummary(attempt.question)}</div>
        <div className="vocab-quiz-review-answer-grid">
          <div><span>Jawaban kamu</span><strong className="wrong">{attempt.userAnswer || '—'}</strong></div>
          <div><span>Jawaban benar</span><strong className="correct">{attempt.question.correctAnswer}</strong></div>
        </div>
      </article>)}
    </div>

    <button type="button" className="vocab-quiz-ghost vocab-quiz-review-back" onClick={onBack}>Kembali ke Hasil</button>
  </div>;
}

function WrongQuestionReview({
  attempts,
  index,
  onIndex,
  onBack,
}: {
  attempts: QuizAttempt[];
  index: number;
  onIndex: (index: number) => void;
  onBack: () => void;
}) {
  if (!attempts.length) {
    return <div className="vocab-quiz-result"><h2>Tidak ada jawaban salah</h2><button type="button" className="vocab-quiz-ghost" onClick={onBack}>Kembali ke Hasil</button></div>;
  }

  const safeIndex = Math.min(Math.max(index, 0), attempts.length - 1);
  const attempt = attempts[safeIndex];
  const question = attempt.question;

  return <div className="vocab-quiz-shell vocab-quiz-review-shell">
    <div className="vocab-quiz-review-toolbar">
      <button type="button" className="vocab-quiz-ghost" onClick={onBack}>Kembali ke Hasil</button>
      <span>Review soal salah</span>
    </div>

    <div className="vocab-quiz-question-card vocab-quiz-review-card">
      <QuestionPrompt question={question} readOnly/>
      {question.options.length > 0 && <div className={`vocab-quiz-options vocab-quiz-review-options tone-${question.answerTone}`}>
        {question.options.map((option) => {
          const correct = option === question.correctAnswer;
          const wrong = option === attempt.userAnswer && !correct;
          return <button type="button" key={option} disabled className={`${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`}>
            <span>{option}</span>
            {correct && <Check size={18}/>} 
            {wrong && <X size={18}/>} 
          </button>;
        })}
      </div>}
      <div className="vocab-quiz-review-answer-grid">
        <div><span>Jawaban kamu</span><strong className="wrong">{attempt.userAnswer || '—'}</strong></div>
        <div><span>Jawaban benar</span><strong className="correct">{question.correctAnswer}</strong></div>
      </div>
    </div>

    <div className="vocab-quiz-review-nav" aria-label="Navigasi review jawaban salah">
      <button type="button" disabled={safeIndex === 0} onClick={() => onIndex(safeIndex - 1)}>← Sebelumnya</button>
      <strong>{safeIndex + 1} / {attempts.length}</strong>
      <button type="button" disabled={safeIndex + 1 >= attempts.length} onClick={() => onIndex(safeIndex + 1)}>Selanjutnya →</button>
    </div>
  </div>;
}

function QuizEmpty({ text }: { text: string }) {
  return <div className="vocab-inline-empty"><strong>Quiz tidak tersedia</strong><span>{text}</span></div>;
}
