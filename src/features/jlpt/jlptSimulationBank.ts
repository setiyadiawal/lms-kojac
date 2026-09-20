import { supabase } from '../../lib/supabase';
import { GRAMMAR_PATTERNS } from '../grammar/grammarData';
import { GRAMMAR_EXERCISES } from '../grammar/grammarExercises';
import { READING_ITEMS } from '../reading/readingData';
import { LISTENING_ITEMS, type ListeningSpeakerTurn } from '../listening/listeningData';

export type JlptSimulationLevel = 'N5' | 'N4';
export type JlptSimulationSection = 'language' | 'reading' | 'listening';

export type JlptSimulationQuestion = {
  id: string;
  level: JlptSimulationLevel;
  section: JlptSimulationSection;
  category: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  passage?: string;
  listeningTurns?: ListeningSpeakerTurn[];
};

type LearningItemRow = {
  id: string;
  item_type: 'vocabulary' | 'kanji';
  jlpt_level: string | null;
  prompt: string;
  reading: string | null;
  meaning_id: string | null;
  extra: Record<string, unknown> | null;
};

const TARGET_COUNTS = {
  vocabulary: 5,
  kanji: 4,
  grammar: 5,
  reading: 8,
  listening: 8,
} as const;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildOptions(correct: string, pool: string[]) {
  const distractors = shuffle(
    unique(pool).filter((value) => value !== correct.trim()),
  ).slice(0, 3);

  if (distractors.length < 3) return [];
  return shuffle([correct.trim(), ...distractors]);
}

type ReadingPassage = (typeof READING_ITEMS)[number]['passage'];

function textOfReadingPassage(passage: ReadingPassage): string {
  return passage
    .map((paragraph) =>
      paragraph
        .map((segment) => segment.text)
        .join('')
        .trim(),
    )
    .filter(Boolean)
    .join('\n\n');
}

function buildVocabularyQuestions(
  rows: LearningItemRow[],
  level: JlptSimulationLevel,
) {
  const candidates = rows.filter(
    (row) =>
      row.item_type === 'vocabulary'
      && row.prompt.trim()
      && row.meaning_id?.trim()
      && row.reading?.trim(),
  );

  const readings = candidates.map((row) => row.reading ?? '');
  const meanings = candidates.map((row) => row.meaning_id ?? '');

  return shuffle(candidates)
    .flatMap((row, index): JlptSimulationQuestion[] => {
      const useReading = index % 2 === 0;
      const correct = useReading ? row.reading!.trim() : row.meaning_id!.trim();
      const options = buildOptions(correct, useReading ? readings : meanings);
      if (options.length !== 4) return [];

      return [{
        id: `jlpt-${level}-vocab-${row.id}-${useReading ? 'reading' : 'meaning'}`,
        level,
        section: 'language',
        category: useReading ? 'Kosakata · Cara Baca' : 'Kosakata · Arti',
        prompt: useReading
          ? `「${row.prompt}」の読み方として最も近いものはどれですか。`
          : `「${row.prompt}」の意味として最も近いものはどれですか。`,
        options,
        correctAnswer: correct,
        explanation: useReading
          ? `Cara baca yang tersimpan pada materi KOJAC adalah 「${correct}」.`
          : `Arti yang tersimpan pada materi KOJAC adalah “${correct}”.`,
      }];
    })
    .slice(0, TARGET_COUNTS.vocabulary);
}

function kanjiReadingCandidates(row: LearningItemRow) {
  const extra = row.extra ?? {};
  const onyomi = Array.isArray(extra.onyomi)
    ? extra.onyomi.filter((value): value is string => typeof value === 'string')
    : [];
  const kunyomi = Array.isArray(extra.kunyomi)
    ? extra.kunyomi.filter((value): value is string => typeof value === 'string')
    : [];
  return unique([...onyomi, ...kunyomi]);
}

function buildKanjiQuestions(
  rows: LearningItemRow[],
  level: JlptSimulationLevel,
) {
  const candidates = rows.filter(
    (row) => row.item_type === 'kanji' && row.prompt.trim() && row.meaning_id?.trim(),
  );
  const meanings = candidates.map((row) => row.meaning_id ?? '');

  return shuffle(candidates)
    .flatMap((row, index): JlptSimulationQuestion[] => {
      const readings = kanjiReadingCandidates(row);
      const useReading = index % 2 === 1 && readings.length > 0;

      if (useReading) {
        const correct = readings[0];
        const readingPool = candidates.flatMap(kanjiReadingCandidates);
        const options = buildOptions(correct, readingPool);
        if (options.length !== 4) return [];

        return [{
          id: `jlpt-${level}-kanji-${row.id}-reading`,
          level,
          section: 'language',
          category: 'Kanji · Cara Baca',
          prompt: `Kanji 「${row.prompt}」 memiliki salah satu cara baca berikut. Pilih yang benar.`,
          options,
          correctAnswer: correct,
          explanation: `Salah satu cara baca yang tersimpan pada materi KOJAC adalah 「${correct}」.`,
        }];
      }

      const correct = row.meaning_id!.trim();
      const options = buildOptions(correct, meanings);
      if (options.length !== 4) return [];

      return [{
        id: `jlpt-${level}-kanji-${row.id}-meaning`,
        level,
        section: 'language',
        category: 'Kanji · Arti',
        prompt: `Arti yang paling dekat untuk kanji 「${row.prompt}」 adalah...`,
        options,
        correctAnswer: correct,
        explanation: `Arti yang tersimpan pada materi KOJAC adalah “${correct}”.`,
      }];
    })
    .slice(0, TARGET_COUNTS.kanji);
}

function buildGrammarQuestions(level: JlptSimulationLevel) {
  const patternLevel = new Map(
    GRAMMAR_PATTERNS.map((pattern) => [pattern.id, pattern.jlptLevel]),
  );

  const eligibleExercises = shuffle(
    GRAMMAR_EXERCISES.filter((exercise) => {
      if (patternLevel.get(exercise.patternId) !== level) return false;
      const options = exercise.options ?? [];
      return (
        options.length >= 4
        && options.includes(exercise.answer)
        && ['multiple_choice', 'pattern_choice', 'fill_blank', 'error_correction'].includes(exercise.type)
      );
    }),
  ).slice(0, TARGET_COUNTS.grammar);

  const questions: JlptSimulationQuestion[] = eligibleExercises.map((exercise) => ({
    id: `jlpt-${level}-grammar-${exercise.id}`,
    level,
    section: 'language',
    category: 'Tata Bahasa',
    prompt: [
      exercise.instruction,
      exercise.context ? `Konteks: ${exercise.context}` : '',
      exercise.prompt,
    ].filter(Boolean).join('\n'),
    options: shuffle(exercise.options ?? []),
    correctAnswer: exercise.answer,
    explanation: exercise.explanation,
  }));

  if (questions.length >= TARGET_COUNTS.grammar) return questions;

  // N4 belum memiliki GRAMMAR_EXERCISES existing.
  // Isi kekurangan hanya dari GRAMMAR_PATTERNS existing, tanpa membuat
  // kalimat/contoh materi baru dan tanpa mengubah modul Grammar.
  const usedPatternIds = new Set(eligibleExercises.map((exercise) => exercise.patternId));
  const sameLevelPatterns = GRAMMAR_PATTERNS.filter(
    (pattern) =>
      pattern.jlptLevel === level
      && pattern.pattern.trim().length > 0
      && pattern.meaning.trim().length > 0,
  );
  const meaningPool = sameLevelPatterns.map((pattern) => pattern.meaning);

  for (const pattern of shuffle(
    sameLevelPatterns.filter((item) => !usedPatternIds.has(item.id)),
  )) {
    const options = buildOptions(pattern.meaning, meaningPool);
    if (options.length !== 4) continue;

    questions.push({
      id: `jlpt-${level}-grammar-pattern-${pattern.id}`,
      level,
      section: 'language',
      category: 'Tata Bahasa · Arti Pola',
      prompt: `Arti/fungsi yang paling sesuai untuk pola 「${pattern.pattern}」 adalah...`,
      options,
      correctAnswer: pattern.meaning,
      explanation: pattern.explanation,
    });

    if (questions.length >= TARGET_COUNTS.grammar) break;
  }

  return questions;
}

function buildReadingQuestions(level: JlptSimulationLevel) {
  const candidates = shuffle(READING_ITEMS.filter((item) => item.jlptLevel === level));
  const questions: JlptSimulationQuestion[] = [];

  for (const item of candidates) {
    const question = shuffle(item.comprehensionQuestions)[0];
    if (!question || question.options.length < 4) continue;

    questions.push({
      id: `jlpt-${level}-reading-${question.id}`,
      level,
      section: 'reading',
      category: `Reading · ${item.kind}`,
      prompt: question.prompt,
      options: shuffle(question.options),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      passage: textOfReadingPassage(item.passage),
    });

    if (questions.length >= TARGET_COUNTS.reading) break;
  }

  return questions;
}

function buildListeningQuestions(level: JlptSimulationLevel) {
  const candidates = shuffle(LISTENING_ITEMS.filter((item) => item.jlptLevel === level));
  const questions: JlptSimulationQuestion[] = [];

  for (const item of candidates) {
    const question = shuffle(item.questions)[0];
    if (!question || question.options.length < 4) continue;

    questions.push({
      id: `jlpt-${level}-listening-${question.id}`,
      level,
      section: 'listening',
      category: `Listening · ${item.type}`,
      prompt: question.prompt,
      options: shuffle(question.options),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      listeningTurns: item.speakerTurns,
    });

    if (questions.length >= TARGET_COUNTS.listening) break;
  }

  return questions;
}

export async function buildJlptSimulation(level: JlptSimulationLevel) {
  const { data, error } = await supabase
    .from('learning_items')
    .select('id,item_type,jlpt_level,prompt,reading,meaning_id,extra')
    .eq('is_published', true)
    .eq('jlpt_level', level)
    .in('item_type', ['vocabulary', 'kanji']);

  if (error) throw error;

  const rows = (data ?? []) as LearningItemRow[];

  const questions = [
    ...buildVocabularyQuestions(rows, level),
    ...buildKanjiQuestions(rows, level),
    ...buildGrammarQuestions(level),
    ...buildReadingQuestions(level),
    ...buildListeningQuestions(level),
  ];

  const expectedTotal = Object.values(TARGET_COUNTS).reduce((sum, count) => sum + count, 0);
  if (questions.length !== expectedTotal) {
    throw new Error(
      `Bank simulasi ${level} belum lengkap (${questions.length}/${expectedTotal}).`,
    );
  }

  return questions;
}
