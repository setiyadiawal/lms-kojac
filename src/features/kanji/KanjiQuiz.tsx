import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, RotateCcw, Sparkles, Target, X } from 'lucide-react';
import { QuizSoundToggle } from '../quiz/QuizSoundToggle';
import { useQuizSounds } from '../quiz/useQuizSounds';
import { randomizeQuestionOptions } from '../quiz/optionRandomization';
import type { KanjiExample, KanjiItem, KanjiLevel, KanjiRecordReview } from './useKanji';
import './kanji-quiz.css';

type QuizMode =
  | 'kanji-meaning'
  | 'meaning-kanji'
  | 'kanji-onyomi'
  | 'kanji-kunyomi'
  | 'onyomi-kanji'
  | 'kunyomi-kanji'
  | 'typing'
  | 'vocabulary'
  | 'matching'
  | 'mixed';

type FixedChoiceKind =
  | 'kanji-meaning'
  | 'meaning-kanji'
  | 'kanji-onyomi'
  | 'kanji-kunyomi'
  | 'onyomi-kanji'
  | 'kunyomi-kanji';

type TypingKind = 'typing-meaning' | 'typing-onyomi' | 'typing-kunyomi';
type VocabularyKind = 'vocab-word-reading' | 'vocab-reading-word' | 'vocab-word-meaning';
type QuestionKind = FixedChoiceKind | TypingKind | VocabularyKind | 'matching';
type QuizCount = 5 | 10 | 15 | 20 | 25 | 30 | 40 | 50 | 'all';
type ReviewView = 'result' | 'summary' | 'questions';
type PromptTone = 'kanji' | 'reading' | 'meaning' | 'vocabulary';
type AnswerTone = 'kanji' | 'reading' | 'meaning' | 'vocabulary';

type QuizQuestion = {
  id: string;
  itemId: string;
  kind: QuestionKind;
  instruction: string;
  prompt: string;
  promptTone: PromptTone;
  correctAnswer: string;
  correctDisplay: string;
  validAnswers: string[];
  answerTone: AnswerTone;
  options: string[];
};

type QuizAttempt = {
  question: QuizQuestion;
  userAnswer: string;
  correct: boolean;
};

type VocabularyCandidate = {
  id: string;
  item: KanjiItem;
  example: KanjiExample;
};

type MatchingPair = {
  item: KanjiItem;
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
  { mode: 'kanji-onyomi', title: 'Kanji → Onyomi', description: 'Pilih 音読み yang benar.' },
  { mode: 'kanji-kunyomi', title: 'Kanji → Kunyomi', description: 'Pilih 訓読み yang benar.' },
  { mode: 'onyomi-kanji', title: 'Onyomi → Kanji', description: 'Pilih Kanji dari 音読み yang unik.' },
  { mode: 'kunyomi-kanji', title: 'Kunyomi → Kanji', description: 'Pilih Kanji dari 訓読み yang unik.' },
  { mode: 'typing', title: 'Ketik Jawaban', description: 'Ketik arti, Onyomi, atau Kunyomi.' },
  { mode: 'vocabulary', title: 'Kosakata Kanji', description: 'Latih Kanji melalui kosakata nyata.' },
  { mode: 'matching', title: 'Matching', description: 'Cocokkan Kanji dengan arti.' },
  { mode: 'mixed', title: 'Campuran', description: 'Gabungkan berbagai tipe soal Kanji.' },
];

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

function normalizePlain(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeReading(value: string) {
  return value.trim().replace(/[.・\s]/g, '');
}

function normalizeMeaning(value: string) {
  return normalizePlain(value).replace(/[.!?]+$/g, '');
}

function meaningAnswers(value: string) {
  const full = normalizeMeaning(value);
  const parts = value
    .split(/[\/;,]/g)
    .map(normalizeMeaning)
    .filter(Boolean);
  return Array.from(new Set([full, ...parts].filter(Boolean)));
}

function allReadingAnswers(readings: string[]) {
  return Array.from(new Set(readings.map(normalizeReading).filter(Boolean)));
}

function meaningKey(item: KanjiItem) {
  return normalizeMeaning(item.meaning);
}

function sameCategoryScore(correct: KanjiItem, candidate: KanjiItem) {
  return correct.category && candidate.category === correct.category ? 1 : 0;
}

function getReadingList(item: KanjiItem, type: 'onyomi' | 'kunyomi') {
  return type === 'onyomi' ? item.onyomi : item.kunyomi;
}

function getUniqueReverseReading(item: KanjiItem, pool: KanjiItem[], type: 'onyomi' | 'kunyomi') {
  const readings = getReadingList(item, type);
  for (const reading of readings) {
    const key = normalizeReading(reading);
    if (!key) continue;
    const matchingItems = pool.filter((candidate) => getReadingList(candidate, type).some((entry) => normalizeReading(entry) === key));
    if (matchingItems.length === 1) return reading;
  }
  return null;
}

function buildKanjiOptions(correct: KanjiItem, pool: KanjiItem[]) {
  const candidates = pool.filter((item) => item.id !== correct.id && item.prompt.trim());
  const ordered = [1, 0].flatMap((score) => shuffle(candidates.filter((candidate) => sameCategoryScore(correct, candidate) === score)));
  const distractors = uniqueBy(ordered, (item) => item.prompt).slice(0, 3).map((item) => item.prompt);
  return distractors.length === 3 ? shuffle([correct.prompt, ...distractors]) : [];
}

function buildMeaningOptions(correct: KanjiItem, pool: KanjiItem[]) {
  const expectedKeys = new Set(meaningAnswers(correct.meaning));
  const candidates = pool.filter((item) => {
    if (item.id === correct.id || !item.meaning.trim()) return false;
    const candidateAnswers = meaningAnswers(item.meaning);
    return candidateAnswers.every((answer) => !expectedKeys.has(answer));
  });
  const ordered = [1, 0].flatMap((score) => shuffle(candidates.filter((candidate) => sameCategoryScore(correct, candidate) === score)));
  const distractors = uniqueBy(ordered, meaningKey).slice(0, 3).map((item) => item.meaning);
  return distractors.length === 3 ? shuffle([correct.meaning, ...distractors]) : [];
}

function buildReadingOptions(correct: KanjiItem, pool: KanjiItem[], type: 'onyomi' | 'kunyomi') {
  const correctReadings = getReadingList(correct, type);
  if (!correctReadings.length) return [];
  const validKeys = new Set(allReadingAnswers(correctReadings));
  const candidates = pool.flatMap((item) => {
    if (item.id === correct.id) return [];
    return getReadingList(item, type)
      .filter((reading) => reading.trim() && !validKeys.has(normalizeReading(reading)))
      .map((reading) => ({ item, reading }));
  });
  const ordered = [1, 0].flatMap((score) => shuffle(candidates.filter(({ item }) => sameCategoryScore(correct, item) === score)));
  const distractors = uniqueBy(ordered, ({ reading }) => normalizeReading(reading)).slice(0, 3).map(({ reading }) => reading);
  const primary = correctReadings[0];
  return distractors.length === 3 ? shuffle([primary, ...distractors]) : [];
}

function fixedEligible(kind: FixedChoiceKind, item: KanjiItem, pool: KanjiItem[]) {
  if (kind === 'kanji-meaning') return Boolean(item.prompt.trim() && item.meaning.trim());
  if (kind === 'meaning-kanji') {
    const sameMeaning = pool.filter((candidate) => meaningKey(candidate) === meaningKey(item));
    return Boolean(item.meaning.trim() && item.prompt.trim() && sameMeaning.length === 1);
  }
  if (kind === 'kanji-onyomi') return item.onyomi.length > 0;
  if (kind === 'kanji-kunyomi') return item.kunyomi.length > 0;
  if (kind === 'onyomi-kanji') return Boolean(getUniqueReverseReading(item, pool, 'onyomi'));
  return Boolean(getUniqueReverseReading(item, pool, 'kunyomi'));
}

function buildFixedQuestion(kind: FixedChoiceKind, item: KanjiItem, pool: KanjiItem[]): QuizQuestion | null {
  if (!fixedEligible(kind, item, pool)) return null;

  if (kind === 'kanji-meaning') {
    const options = buildMeaningOptions(item, pool);
    if (options.length !== 4) return null;
    return {
      id: `${item.id}-${kind}`,
      itemId: item.id,
      kind,
      instruction: 'Pilih arti yang benar.',
      prompt: item.prompt,
      promptTone: 'kanji',
      correctAnswer: item.meaning,
      correctDisplay: item.meaning,
      validAnswers: meaningAnswers(item.meaning),
      answerTone: 'meaning',
      options,
    };
  }

  if (kind === 'meaning-kanji') {
    const options = buildKanjiOptions(item, pool);
    if (options.length !== 4) return null;
    return {
      id: `${item.id}-${kind}`,
      itemId: item.id,
      kind,
      instruction: 'Pilih Kanji yang sesuai dengan arti ini.',
      prompt: item.meaning,
      promptTone: 'meaning',
      correctAnswer: item.prompt,
      correctDisplay: item.prompt,
      validAnswers: [item.prompt],
      answerTone: 'kanji',
      options,
    };
  }

  if (kind === 'kanji-onyomi' || kind === 'kanji-kunyomi') {
    const type = kind === 'kanji-onyomi' ? 'onyomi' : 'kunyomi';
    const readings = getReadingList(item, type);
    const options = buildReadingOptions(item, pool, type);
    if (options.length !== 4) return null;
    return {
      id: `${item.id}-${kind}`,
      itemId: item.id,
      kind,
      instruction: type === 'onyomi' ? 'Pilih Onyomi yang benar.' : 'Pilih Kunyomi yang benar.',
      prompt: item.prompt,
      promptTone: 'kanji',
      correctAnswer: readings[0],
      correctDisplay: readings.join(' / '),
      validAnswers: allReadingAnswers(readings),
      answerTone: 'reading',
      options,
    };
  }

  const type = kind === 'onyomi-kanji' ? 'onyomi' : 'kunyomi';
  const reading = getUniqueReverseReading(item, pool, type);
  if (!reading) return null;
  const options = buildKanjiOptions(item, pool);
  if (options.length !== 4) return null;
  return {
    id: `${item.id}-${kind}-${normalizeReading(reading)}`,
    itemId: item.id,
    kind,
    instruction: 'Pilih Kanji yang sesuai dengan reading ini.',
    prompt: reading,
    promptTone: 'reading',
    correctAnswer: item.prompt,
    correctDisplay: item.prompt,
    validAnswers: [item.prompt],
    answerTone: 'kanji',
    options,
  };
}

function typingKindsForItem(item: KanjiItem): TypingKind[] {
  const kinds: TypingKind[] = [];
  if (item.meaning.trim()) kinds.push('typing-meaning');
  if (item.onyomi.length) kinds.push('typing-onyomi');
  if (item.kunyomi.length) kinds.push('typing-kunyomi');
  return kinds;
}

function buildTypingQuestion(item: KanjiItem, forcedKind?: TypingKind): QuizQuestion | null {
  const available = typingKindsForItem(item);
  if (!available.length) return null;
  const kind = forcedKind && available.includes(forcedKind) ? forcedKind : shuffle(available)[0];

  if (kind === 'typing-meaning') {
    return {
      id: `${item.id}-${kind}`,
      itemId: item.id,
      kind,
      instruction: 'Ketik salah satu arti yang benar.',
      prompt: item.prompt,
      promptTone: 'kanji',
      correctAnswer: item.meaning,
      correctDisplay: item.meaning,
      validAnswers: meaningAnswers(item.meaning),
      answerTone: 'meaning',
      options: [],
    };
  }

  const readings = kind === 'typing-onyomi' ? item.onyomi : item.kunyomi;
  if (!readings.length) return null;
  return {
    id: `${item.id}-${kind}`,
    itemId: item.id,
    kind,
    instruction: kind === 'typing-onyomi' ? 'Ketik salah satu Onyomi yang benar.' : 'Ketik salah satu Kunyomi yang benar.',
    prompt: item.prompt,
    promptTone: 'kanji',
    correctAnswer: readings[0],
    correctDisplay: readings.join(' / '),
    validAnswers: allReadingAnswers(readings),
    answerTone: 'reading',
    options: [],
  };
}

function vocabularyCandidates(items: KanjiItem[]) {
  const candidates = items.flatMap((item) => item.examples.map((example, exampleIndex) => ({
    id: `${item.id}-example-${exampleIndex}-${example.word}-${example.reading}`,
    item,
    example,
  })));

  return uniqueBy(candidates, ({ example }) => `${example.word}|${example.reading}|${example.meaning_id}`);
}

function vocabularySubKinds(candidate: VocabularyCandidate, pool: VocabularyCandidate[]): VocabularyKind[] {
  const kinds: VocabularyKind[] = [];
  const { word, reading, meaning_id: meaning } = candidate.example;

  const readingUnique = pool.filter((entry) => normalizeReading(entry.example.reading) === normalizeReading(reading));
  if (word.trim() && reading.trim()) kinds.push('vocab-word-reading');
  if (reading.trim() && word.trim() && readingUnique.length === 1) kinds.push('vocab-reading-word');
  if (word.trim() && meaning.trim()) kinds.push('vocab-word-meaning');
  return kinds;
}

function buildVocabularyOptions(
  candidate: VocabularyCandidate,
  pool: VocabularyCandidate[],
  kind: VocabularyKind,
) {
  const getAnswer = (entry: VocabularyCandidate) => {
    if (kind === 'vocab-word-reading') return entry.example.reading;
    if (kind === 'vocab-reading-word') return entry.example.word;
    return entry.example.meaning_id;
  };

  const expected = getAnswer(candidate);
  if (!expected) return [];
  const expectedKey = kind === 'vocab-word-reading' ? normalizeReading(expected) : normalizePlain(expected);
  const candidates = uniqueBy(
    pool.filter((entry) => entry.id !== candidate.id && getAnswer(entry).trim()),
    (entry) => kind === 'vocab-word-reading' ? normalizeReading(getAnswer(entry)) : normalizePlain(getAnswer(entry)),
  ).filter((entry) => {
    const answer = getAnswer(entry);
    const key = kind === 'vocab-word-reading' ? normalizeReading(answer) : normalizePlain(answer);
    return key !== expectedKey;
  });

  const ordered = [1, 0].flatMap((score) => shuffle(candidates.filter((entry) => sameCategoryScore(candidate.item, entry.item) === score)));
  const distractors = ordered.slice(0, 3).map(getAnswer);
  return distractors.length === 3 ? shuffle([expected, ...distractors]) : [];
}

function buildVocabularyQuestion(candidate: VocabularyCandidate, pool: VocabularyCandidate[], forcedKind?: VocabularyKind): QuizQuestion | null {
  const kinds = vocabularySubKinds(candidate, pool);
  if (!kinds.length) return null;
  const kind = forcedKind && kinds.includes(forcedKind) ? forcedKind : shuffle(kinds)[0];
  const options = buildVocabularyOptions(candidate, pool, kind);
  if (options.length !== 4) return null;

  if (kind === 'vocab-word-reading') {
    return {
      id: `${candidate.id}-${kind}`,
      itemId: candidate.item.id,
      kind,
      instruction: 'Pilih cara baca kosakata yang benar.',
      prompt: candidate.example.word,
      promptTone: 'vocabulary',
      correctAnswer: candidate.example.reading,
      correctDisplay: candidate.example.reading,
      validAnswers: [normalizeReading(candidate.example.reading)],
      answerTone: 'reading',
      options,
    };
  }

  if (kind === 'vocab-reading-word') {
    return {
      id: `${candidate.id}-${kind}`,
      itemId: candidate.item.id,
      kind,
      instruction: 'Pilih kosakata yang sesuai dengan reading ini.',
      prompt: candidate.example.reading,
      promptTone: 'reading',
      correctAnswer: candidate.example.word,
      correctDisplay: candidate.example.word,
      validAnswers: [candidate.example.word],
      answerTone: 'vocabulary',
      options,
    };
  }

  return {
    id: `${candidate.id}-${kind}`,
    itemId: candidate.item.id,
    kind,
    instruction: 'Pilih arti kosakata yang benar.',
    prompt: candidate.example.word,
    promptTone: 'vocabulary',
    correctAnswer: candidate.example.meaning_id,
    correctDisplay: candidate.example.meaning_id,
    validAnswers: meaningAnswers(candidate.example.meaning_id),
    answerTone: 'meaning',
    options,
  };
}

function uniqueMeaningItems(items: KanjiItem[]) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = meaningKey(item);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return items.filter((item) => item.prompt.trim() && item.meaning.trim() && counts.get(meaningKey(item)) === 1);
}

function matchingQuestion(pair: MatchingPair): QuizQuestion {
  return {
    id: `${pair.item.id}-matching`,
    itemId: pair.item.id,
    kind: 'matching',
    instruction: 'Cocokkan Kanji dengan arti yang benar.',
    prompt: pair.left,
    promptTone: 'kanji',
    correctAnswer: pair.right,
    correctDisplay: pair.right,
    validAnswers: meaningAnswers(pair.right),
    answerTone: 'meaning',
    options: [],
  };
}

function buildMatchingRounds(deck: KanjiItem[]) {
  if (!deck.length) return [];
  const roundCount = Math.max(1, Math.ceil(deck.length / 6));
  const baseSize = Math.floor(deck.length / roundCount);
  const largerRounds = deck.length % roundCount;
  const rounds: MatchingRound[] = [];
  let offset = 0;

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const size = baseSize + (roundIndex < largerRounds ? 1 : 0);
    const roundItems = deck.slice(offset, offset + size);
    offset += size;
    const pairs = roundItems.map((item) => ({ item, left: item.prompt, right: item.meaning }));
    rounds.push({
      pairs,
      rightOptions: shuffle(pairs.map((pair) => ({ id: pair.item.id, label: pair.right }))),
    });
  }
  return rounds;
}

function mixedBuildersForItem(item: KanjiItem, items: KanjiItem[], vocabPool: VocabularyCandidate[]) {
  const builders: Array<() => QuizQuestion | null> = [];
  const fixedKinds: FixedChoiceKind[] = [
    'kanji-meaning',
    'meaning-kanji',
    'kanji-onyomi',
    'kanji-kunyomi',
    'onyomi-kanji',
    'kunyomi-kanji',
  ];

  for (const kind of fixedKinds) {
    if (fixedEligible(kind, item, items)) builders.push(() => buildFixedQuestion(kind, item, items));
  }
  if (typingKindsForItem(item).length) builders.push(() => buildTypingQuestion(item));

  const itemVocabulary = vocabPool.filter((candidate) => candidate.item.id === item.id && vocabularySubKinds(candidate, vocabPool).length > 0);
  if (itemVocabulary.length) {
    builders.push(() => buildVocabularyQuestion(shuffle(itemVocabulary)[0], vocabPool));
  }

  return builders;
}

function buildMixedQuestion(item: KanjiItem, items: KanjiItem[], vocabPool: VocabularyCandidate[]) {
  for (const builder of shuffle(mixedBuildersForItem(item, items, vocabPool))) {
    const question = builder();
    if (question) return question;
  }
  return null;
}

function eligibleItemsForFixedMode(mode: FixedChoiceKind, items: KanjiItem[]) {
  return items.filter((item) => Boolean(buildFixedQuestion(mode, item, items)));
}

function eligibleVocabularyCandidates(items: KanjiItem[]) {
  const pool = vocabularyCandidates(items);
  return pool.filter((candidate) => Boolean(buildVocabularyQuestion(candidate, pool)));
}

function eligibleItemsForMode(mode: QuizMode, items: KanjiItem[]) {
  if (mode === 'typing') return items.filter((item) => typingKindsForItem(item).length > 0);
  if (mode === 'matching') return uniqueMeaningItems(items);
  if (mode === 'mixed') {
    const vocabPool = vocabularyCandidates(items);
    return items.filter((item) => mixedBuildersForItem(item, items, vocabPool).length > 0);
  }
  if (mode === 'vocabulary') return eligibleVocabularyCandidates(items);
  return eligibleItemsForFixedMode(mode, items);
}

function quizModeLabel(mode: QuizMode) {
  return QUIZ_MODES.find((entry) => entry.mode === mode)?.title ?? 'Quiz';
}

function questionKindLabel(kind: QuestionKind) {
  if (kind === 'matching') return 'Matching';
  if (kind === 'typing-meaning') return 'Ketik: Kanji → Arti';
  if (kind === 'typing-onyomi') return 'Ketik: Kanji → Onyomi';
  if (kind === 'typing-kunyomi') return 'Ketik: Kanji → Kunyomi';
  if (kind === 'vocab-word-reading') return 'Kosakata → Reading';
  if (kind === 'vocab-reading-word') return 'Reading → Kosakata';
  if (kind === 'vocab-word-meaning') return 'Kosakata → Arti';
  return quizModeLabel(kind);
}

function sessionSize(count: QuizCount, available: number) {
  return count === 'all' ? available : Math.min(count, available);
}

function normalizeAnswerForQuestion(value: string, question: QuizQuestion) {
  if (question.answerTone === 'reading') return normalizeReading(value);
  if (question.answerTone === 'meaning') return normalizeMeaning(value);
  return value.trim();
}

function isCorrectAnswer(value: string, question: QuizQuestion) {
  const normalized = normalizeAnswerForQuestion(value, question);
  if (question.answerTone === 'meaning') return question.validAnswers.includes(normalized);
  if (question.answerTone === 'reading') return question.validAnswers.includes(normalized);
  return question.validAnswers.includes(value.trim());
}

export function KanjiQuiz({
  items,
  level,
  onRecordReview,
  persistProgress = true,
  setupTitle,
  setupDescription,
  availabilityLabel,
}: {
  items: KanjiItem[];
  level: KanjiLevel;
  onRecordReview: KanjiRecordReview;
  persistProgress?: boolean;
  setupTitle?: string;
  setupDescription?: string;
  availabilityLabel?: string;
}) {
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
  const [progressError, setProgressError] = useState<string | null>(null);
  const { soundEnabled, toggleSound, playCorrect, playIncorrect, playComplete } = useQuizSounds();
  const recordedReviewKeysRef = useRef<Set<string>>(new Set());
  const matchingMistakeIdsRef = useRef<Set<string>>(new Set());

  const recordQuizReview = (question: QuizQuestion, correct: boolean) => {
    if (!persistProgress) return;
    const reviewKey = question.id;
    if (recordedReviewKeysRef.current.has(reviewKey)) return;

    recordedReviewKeysRef.current.add(reviewKey);
    setProgressError(null);

    void onRecordReview(question.itemId, correct ? 2 : 0).catch((saveError: unknown) => {
      setProgressError(saveError instanceof Error ? saveError.message : 'Progress Kanji belum tersimpan.');
    });
  };

  const availableForMode = useMemo(
    () => mode ? eligibleItemsForMode(mode, items).length : items.length,
    [items, mode],
  );

  useEffect(() => {
    if (count === 'all' || count <= availableForMode) return;
    setCount(availableForMode >= 10 ? 10 : 'all');
  }, [availableForMode, count]);

  if (!items.length) {
    return <div className="kanji-quiz-empty"><strong>Belum ada Kanji untuk Quiz</strong><span>Quiz menggunakan dataset Kanji level aktif.</span></div>;
  }

  function resetSessionState() {
    recordedReviewKeysRef.current.clear();
    matchingMistakeIdsRef.current.clear();
    setProgressError(null);
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
  }

  function startQuiz() {
    if (!mode) return;
    const eligible = eligibleItemsForMode(mode, items);
    if (!eligible.length) return;
    const targetSize = sessionSize(count, eligible.length);
    if (!targetSize) return;

    if (mode === 'matching') {
      const deck = shuffle(eligible as KanjiItem[]).slice(0, targetSize);
      if (deck.length < 4) return;
      setMatchingRounds(buildMatchingRounds(deck));
      setQuestions([]);
    } else if (mode === 'vocabulary') {
      const pool = vocabularyCandidates(items);
      const deck = shuffle(eligible as VocabularyCandidate[]).slice(0, targetSize);
      const nextQuestions = deck
        .map((candidate) => buildVocabularyQuestion(candidate, pool))
        .filter((question): question is QuizQuestion => Boolean(question));
      if (!nextQuestions.length) return;
      setQuestions(randomizeQuestionOptions(nextQuestions));
      setMatchingRounds([]);
    } else if (mode === 'mixed') {
      const vocabPool = vocabularyCandidates(items);
      const deck = shuffle(eligible as KanjiItem[]).slice(0, targetSize);
      const nextQuestions = deck
        .map((item) => buildMixedQuestion(item, items, vocabPool))
        .filter((question): question is QuizQuestion => Boolean(question));
      if (!nextQuestions.length) return;
      setQuestions(randomizeQuestionOptions(nextQuestions));
      setMatchingRounds([]);
    } else if (mode === 'typing') {
      const deck = shuffle(eligible as KanjiItem[]).slice(0, targetSize);
      const nextQuestions = deck
        .map((item) => buildTypingQuestion(item))
        .filter((question): question is QuizQuestion => Boolean(question));
      if (!nextQuestions.length) return;
      setQuestions(randomizeQuestionOptions(nextQuestions));
      setMatchingRounds([]);
    } else {
      const deck = shuffle(eligible as KanjiItem[]).slice(0, targetSize);
      const nextQuestions = deck
        .map((item) => buildFixedQuestion(mode, item, items))
        .filter((question): question is QuizQuestion => Boolean(question));
      if (!nextQuestions.length) return;
      setQuestions(randomizeQuestionOptions(nextQuestions));
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
      level={level}
      mode={mode}
      count={count}
      availableForMode={availableForMode}
      onMode={setMode}
      onCount={setCount}
      onStart={startQuiz}
      setupTitle={setupTitle}
      setupDescription={setupDescription}
      availabilityLabel={availabilityLabel}
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
    return <div className="kanji-quiz-result">
      {progressError && <div className="kanji-quiz-progress-error" role="alert">Progress Kanji belum tersimpan: {progressError}</div>}
      <div className="kanji-quiz-result-icon"><Sparkles size={30}/></div>
      <p className="eyebrow">HASIL QUIZ KANJI</p>
      <h2>{score}/{total}</h2>
      <strong className="kanji-quiz-result-score">Nilai: {pct}%</strong>
      <div className="kanji-quiz-result-stats">
        <span><strong>{score}</strong>Benar</span>
        <span><strong>{wrong}</strong>Salah</span>
        <span><strong>{total}</strong>Total</span>
      </div>
      <p>{pct >= 80 ? 'Bagus! Pertahankan hasilnya dan ulangi Kanji ini secara berkala.' : 'Pelajari kembali Kanji yang masih salah, lalu coba lagi.'}</p>
      <div className="kanji-quiz-result-actions">
        <button type="button" className="kanji-quiz-primary" onClick={startQuiz}><RotateCcw size={17}/> Ulangi Quiz</button>
        <button type="button" className="kanji-quiz-ghost" onClick={chooseAnotherQuiz}><Target size={17}/> Pilih Quiz Lain</button>
      </div>
      {wrongAttempts.length > 0 && <div className="kanji-quiz-review-actions">
        <span>REVIEW JAWABAN SALAH</span>
        <div>
          <button type="button" className="kanji-quiz-ghost" onClick={() => setReviewView('summary')}>Rekapan Jawaban Salah</button>
          <button type="button" className="kanji-quiz-ghost" onClick={() => {
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
        matchingMistakeIdsRef.current.add(pair.item.id);
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

      const hadMistake = matchingMistakeIdsRef.current.has(pair.item.id);
      playCorrect();
      if (!hadMistake) {
        setScore((current) => current + 1);
        setAttempts((current) => [...current, {
          question: matchingQuestion(pair),
          userAnswer: pair.right,
          correct: true,
        }]);
      }
      recordQuizReview(matchingQuestion(pair), !hadMistake);
      setMatchingCompletedIds((current) => [...current, pair.item.id]);
      setMatchingSelectedId(null);
      setMatchingWrongRightId(null);
    }

    function nextRound() {
      if (!roundDone) return;
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

    return <div className="kanji-quiz-shell">
      <QuizTop position={Math.min(completedTotal + 1, total)} completed={completedTotal} total={total} score={score} wrong={wrong} soundEnabled={soundEnabled} onSoundToggle={toggleSound}/>
      <div className="kanji-quiz-question-card kanji-quiz-matching-card">
        <div className="kanji-quiz-question-heading">
          <span>Matching</span>
          <p>Pilih Kanji di kiri, lalu cocokkan dengan arti di kanan.</p>
        </div>
        <div className="kanji-quiz-matching-board">
          <div className="kanji-quiz-matching-column">
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
          <div className="kanji-quiz-matching-column meanings">
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
        {roundDone && <div className="kanji-quiz-feedback ok">
          <strong>Ronde selesai.</strong>
          <button type="button" onClick={nextRound}>{matchingRoundIndex + 1 === matchingRounds.length ? 'Lihat hasil' : 'Ronde berikutnya'} <ChevronRight size={17}/></button>
        </div>}
      </div>
      {progressError && <div className="kanji-quiz-progress-error" role="alert">Progress Kanji belum tersimpan: {progressError}</div>}
    </div>;
  }

  const question = questions[index];
  if (!question) return <QuizEmpty text="Soal Quiz tidak tersedia."/>;
  const answeredCount = index + (answered ? 1 : 0);
  const wrong = answeredCount - score;

  function submitAnswer(value: string) {
    if (answered) return;
    const correct = isCorrectAnswer(value, question);
    if (correct) playCorrect();
    else playIncorrect();
    setSelected(value);
    setAnswered(true);
    setAnswerCorrect(correct);
    setScore((current) => current + (correct ? 1 : 0));
    setAttempts((current) => [...current, { question, userAnswer: value, correct }]);
    recordQuizReview(question, correct);
  }

  function nextQuestion() {
    if (!answered) return;
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

  return <div className="kanji-quiz-shell">
    <QuizTop position={index + 1} completed={answeredCount} total={questions.length} score={score} wrong={wrong} soundEnabled={soundEnabled} onSoundToggle={toggleSound}/>
    <div className="kanji-quiz-question-card">
      <QuestionPrompt question={question}/>

      {question.options.length === 0 ? <form className="kanji-quiz-typing-form" onSubmit={(event) => {
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
          aria-label="Jawaban Quiz Kanji"
          placeholder={question.answerTone === 'meaning' ? 'Ketik arti…' : 'Ketik reading…'}
        />
        <button type="submit" className="kanji-quiz-primary" disabled={answered || !typedAnswer.trim()}>Jawab</button>
      </form> : <div className={`kanji-quiz-options tone-${question.answerTone}`}>
        {question.options.map((option) => {
          const correctOption = isCorrectAnswer(option, question);
          let state = '';
          if (answered && correctOption) state = 'correct';
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

      {answered && <div className={`kanji-quiz-feedback ${answerCorrect ? 'ok' : 'bad'}`}>
        <div>
          <strong>{answerCorrect ? 'Benar!' : 'Belum tepat.'}</strong>
          {!answerCorrect && <>
            <span>Jawaban kamu: <b>{selected || typedAnswer || '—'}</b></span>
            <span>Jawaban benar: <b>{question.correctDisplay}</b></span>
          </>}
        </div>
        <button type="button" onClick={nextQuestion}>{index + 1 === questions.length ? 'Lihat hasil' : 'Selanjutnya'} <ChevronRight size={17}/></button>
      </div>}
    </div>
    {progressError && <div className="kanji-quiz-progress-error" role="alert">Progress Kanji belum tersimpan: {progressError}</div>}
  </div>;
}

function QuizSetup({
  items,
  level,
  mode,
  count,
  availableForMode,
  onMode,
  onCount,
  onStart,
  setupTitle,
  setupDescription,
  availabilityLabel,
}: {
  items: KanjiItem[];
  level: KanjiLevel;
  mode: QuizMode | null;
  count: QuizCount;
  availableForMode: number;
  onMode: (mode: QuizMode) => void;
  onCount: (count: QuizCount) => void;
  onStart: () => void;
  setupTitle?: string;
  setupDescription?: string;
  availabilityLabel?: string;
}) {
  const canStart = Boolean(mode) && availableForMode > 0 && (mode !== 'matching' || availableForMode >= 4);
  const validCountOptions: QuizCount[] = [...QUIZ_COUNTS.filter((option) => option <= availableForMode), 'all'];

  return <div className="kanji-quiz-shell kanji-quiz-setup">
    <section className="kanji-quiz-setup-card">
      <div className="kanji-quiz-setup-heading">
        <p className="eyebrow">PILIH JENIS QUIZ</p>
        <h2>{setupTitle ?? `Quiz Kanji · ${level}`}</h2>
        <p>{setupDescription ?? `Pilih tipe latihan dan jumlah soal. Semua soal menggunakan data Kanji ${level} yang sudah ada.`}</p>
      </div>

      <div className="kanji-quiz-mode-grid">
        {QUIZ_MODES.map((option, position) => {
          const eligible = eligibleItemsForMode(option.mode, items).length;
          const disabled = eligible === 0 || (option.mode === 'matching' && eligible < 4);
          return <button
            type="button"
            key={option.mode}
            disabled={disabled}
            className={mode === option.mode ? 'active' : ''}
            onClick={() => onMode(option.mode)}
          >
            <span className="kanji-quiz-mode-number">{position + 1}</span>
            <span>
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </span>
          </button>;
        })}
      </div>

      <div className="kanji-quiz-count-block">
        <div>
          <strong>Jumlah soal</strong>
          <span>{mode ? `${availableForMode} kandidat valid untuk mode ini.` : (availabilityLabel ?? `${items.length} Kanji tersedia di ${level}.`)}</span>
        </div>
        <div className="kanji-quiz-count-row">
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

      <button type="button" className="kanji-quiz-primary kanji-quiz-start" disabled={!canStart} onClick={onStart}>Mulai Quiz</button>
    </section>
  </div>;
}

function QuizTop({ position, completed, total, score, wrong, soundEnabled, onSoundToggle }: { position: number; completed: number; total: number; score: number; wrong: number; soundEnabled: boolean; onSoundToggle: () => void }) {
  return <div className="kanji-quiz-top quiz-sfx-host">
    <span>Soal {position} / {total}</span>
    <div className="kanji-quiz-progress"><i style={{ width: `${total ? (completed / total) * 100 : 0}%` }}/></div>
    <strong>Benar: {score}</strong>
    <strong>Salah: {Math.max(wrong, 0)}</strong>
    <QuizSoundToggle enabled={soundEnabled} onToggle={onSoundToggle}/>
  </div>;
}

function QuestionPrompt({ question }: { question: QuizQuestion }) {
  return <div className="kanji-quiz-question-heading">
    <span>{questionKindLabel(question.kind)}</span>
    <p>{question.instruction}</p>
    <div className={`kanji-quiz-main-prompt tone-${question.promptTone}`}>{question.prompt}</div>
  </div>;
}

function WrongSummary({ attempts, onBack }: { attempts: QuizAttempt[]; onBack: () => void }) {
  return <div className="kanji-quiz-shell kanji-quiz-review-shell">
    <div className="kanji-quiz-review-header">
      <div>
        <p className="eyebrow">REVIEW QUIZ</p>
        <h2>Rekapan Jawaban Salah</h2>
        <p>{attempts.length} jawaban perlu dipelajari kembali.</p>
      </div>
      <button type="button" className="kanji-quiz-ghost" onClick={onBack}>Kembali ke Hasil</button>
    </div>

    <div className="kanji-quiz-wrong-list">
      {attempts.map((attempt, position) => <article className="kanji-quiz-wrong-item" key={`${attempt.question.id}-${position}`}>
        <div className="kanji-quiz-wrong-top"><span>{position + 1}</span><small>{questionKindLabel(attempt.question.kind)}</small></div>
        <div className={`kanji-quiz-wrong-prompt tone-${attempt.question.promptTone}`}>{attempt.question.prompt}</div>
        <div className="kanji-quiz-review-answer-grid">
          <div><span>Jawaban kamu</span><strong className="wrong">{attempt.userAnswer || '—'}</strong></div>
          <div><span>Jawaban benar</span><strong className="correct">{attempt.question.correctDisplay}</strong></div>
        </div>
      </article>)}
    </div>

    <button type="button" className="kanji-quiz-ghost kanji-quiz-review-back" onClick={onBack}>Kembali ke Hasil</button>
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
    return <div className="kanji-quiz-result"><h2>Tidak ada jawaban salah</h2><button type="button" className="kanji-quiz-ghost" onClick={onBack}>Kembali ke Hasil</button></div>;
  }

  const safeIndex = Math.min(Math.max(index, 0), attempts.length - 1);
  const attempt = attempts[safeIndex];
  const question = attempt.question;

  return <div className="kanji-quiz-shell kanji-quiz-review-shell">
    <div className="kanji-quiz-review-toolbar">
      <span>Review soal salah · read-only</span>
    </div>

    <div className="kanji-quiz-question-card kanji-quiz-review-card">
      <QuestionPrompt question={question}/>
      {question.options.length > 0 && <div className={`kanji-quiz-options kanji-quiz-review-options tone-${question.answerTone}`}>
        {question.options.map((option) => {
          const correct = isCorrectAnswer(option, question);
          const wrong = option === attempt.userAnswer && !correct;
          return <button type="button" key={option} disabled className={`${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`}>
            <span>{option}</span>
            {correct && <Check size={18}/>}
            {wrong && <X size={18}/>}
          </button>;
        })}
      </div>}
      <div className="kanji-quiz-review-answer-grid">
        <div><span>Jawaban kamu</span><strong className="wrong">{attempt.userAnswer || '—'}</strong></div>
        <div><span>Jawaban benar</span><strong className="correct">{question.correctDisplay}</strong></div>
      </div>
    </div>

    <div className="kanji-quiz-review-nav" aria-label="Navigasi review jawaban salah">
      <button type="button" disabled={safeIndex === 0} onClick={() => onIndex(safeIndex - 1)}>← Sebelumnya</button>
      <strong>{safeIndex + 1} / {attempts.length}</strong>
      <button type="button" disabled={safeIndex + 1 >= attempts.length} onClick={() => onIndex(safeIndex + 1)}>Selanjutnya →</button>
    </div>
    <button type="button" className="kanji-quiz-ghost kanji-quiz-review-back" onClick={onBack}>Kembali ke Hasil</button>
  </div>;
}

function QuizEmpty({ text }: { text: string }) {
  return <div className="kanji-quiz-empty"><strong>Quiz tidak tersedia</strong><span>{text}</span></div>;
}
