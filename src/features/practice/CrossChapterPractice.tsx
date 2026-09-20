import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Layers3, Play, RotateCcw, Shuffle, SlidersHorizontal, Speaker, Target, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GRAMMAR_PATTERNS } from '../grammar/grammarData';
import { GRAMMAR_EXERCISES } from '../grammar/grammarExercises';
import { speakJapanese } from '../hiragana/useHiragana';
import '../vocabulary/vocabulary.css';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import './cross-chapter-practice.css';

type PracticeModule = 'mixed' | 'vocabulary' | 'kanji' | 'grammar';
type PracticePhase = 'setup' | 'loading' | 'quiz' | 'flashcard' | 'result';

type VocabularyRow = {
  id: string;
  prompt: string;
  reading: string | null;
  meaning_id: string | null;
  extra: Record<string, unknown> | null;
};

type KanjiRow = {
  id: string;
  prompt: string;
  meaning_id: string | null;
  extra: Record<string, unknown> | null;
};

type CrossQuestionKind =
  | 'choice'
  | 'typing'
  | 'audio';

type CrossQuestionTone =
  | 'kanji'
  | 'kana'
  | 'meaning'
  | 'grammar'
  | 'audio';

type PracticeQuestion = {
  id: string;
  module: Exclude<PracticeModule, 'mixed'>;
  chapter: number;
  kind: CrossQuestionKind;
  instruction: string;
  prompt: string;
  promptTone: CrossQuestionTone;
  correctAnswer: string;
  acceptableAnswers?: string[];
  options: string[];
  audioText?: string;
  typeLabel: string;
  explanation?: string;
  reviewItemId?: string;
};

type PracticeAttempt = {
  question: PracticeQuestion;
  selectedAnswer: string;
  correct: boolean;
};

type PracticeCache = {
  vocabulary: VocabularyRow[];
  kanji: KanjiRow[];
  grammarItemIdByPattern?: Map<string, string>;
};

type CrossFlashcardField = 'kanji' | 'kana' | 'romaji' | 'arti' | 'jenis' | 'kategori';
type CrossFlashcardSidePreferences = Record<CrossFlashcardField, boolean>;

type CrossFlashcardPreferences = {
  front: CrossFlashcardSidePreferences;
  back: CrossFlashcardSidePreferences;
  audio: boolean;
};

const MAX_CHAPTER = 35;
const PAGE_SIZE = 1000;
const QUESTION_COUNTS = [10, 20, 30, 50] as const;

function routeChapter(value: string | null, fallback: number) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return fallback;
  return Math.max(1, Math.min(MAX_CHAPTER, numeric));
}

function routeModule(value: string | null): PracticeModule {
  return value === 'vocabulary'
    || value === 'kanji'
    || value === 'grammar'
    || value === 'mixed'
    ? value
    : 'mixed';
}

function routeQuestionCount(value: string | null) {
  const numeric = Number(value);
  return QUESTION_COUNTS.includes(numeric as (typeof QUESTION_COUNTS)[number])
    ? numeric
    : 20;
}

const MODULES: Array<{ key: PracticeModule; label: string; description: string }> = [
  { key: 'mixed', label: 'Campuran', description: 'Kosakata + Kanji + Tata Bahasa' },
  { key: 'vocabulary', label: 'Kosakata', description: 'Arti, Jepang, dan Kana' },
  { key: 'kanji', label: 'Kanji', description: 'Kanji yang muncul pada kosakata bab terpilih' },
  { key: 'grammar', label: 'Tata Bahasa', description: 'Pola dan fungsi dari bab terpilih' },
];

const PRESETS = Array.from({ length: 12 }, (_, index) => {
  const start = index * 3 + 1;
  return { start, end: Math.min(start + 2, MAX_CHAPTER) };
});

const CROSS_FLASHCARD_STORAGE_KEY = 'vocabularyFlashcardPreferences';

const CROSS_FLASHCARD_FIELDS: Array<{ key: CrossFlashcardField; label: string }> = [
  { key: 'kanji', label: 'Kanji' },
  { key: 'kana', label: 'Kana' },
  { key: 'romaji', label: 'Romaji' },
  { key: 'arti', label: 'Arti' },
  { key: 'jenis', label: 'Jenis' },
  { key: 'kategori', label: 'Kategori' },
];

function createCrossFlashcardPreferences(): CrossFlashcardPreferences {
  return {
    front: {
      kanji: true,
      kana: false,
      romaji: false,
      arti: false,
      jenis: false,
      kategori: false,
    },
    back: {
      kanji: true,
      kana: true,
      romaji: true,
      arti: true,
      jenis: true,
      kategori: true,
    },
    audio: true,
  };
}

function activeCrossFlashcardFields(preferences: CrossFlashcardSidePreferences) {
  return CROSS_FLASHCARD_FIELDS.reduce(
    (total, field) => total + (preferences[field.key] ? 1 : 0),
    0,
  );
}

function booleanPreference(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeCrossFlashcardSide(
  value: unknown,
  fallback: CrossFlashcardSidePreferences,
): CrossFlashcardSidePreferences {
  if (!value || typeof value !== 'object') return fallback;
  const row = value as Record<string, unknown>;
  const normalized = { ...fallback };

  for (const { key } of CROSS_FLASHCARD_FIELDS) {
    normalized[key] = booleanPreference(row[key], fallback[key]);
  }

  return activeCrossFlashcardFields(normalized) > 0 ? normalized : fallback;
}

function loadCrossFlashcardPreferences(): CrossFlashcardPreferences {
  const fallback = createCrossFlashcardPreferences();
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = window.localStorage.getItem(CROSS_FLASHCARD_STORAGE_KEY);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return {
      front: normalizeCrossFlashcardSide(parsed.front, fallback.front),
      back: normalizeCrossFlashcardSide(parsed.back, fallback.back),
      audio: booleanPreference(parsed.audio, fallback.audio),
    };
  } catch {
    return fallback;
  }
}

function saveCrossFlashcardPreferences(preferences: CrossFlashcardPreferences) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CROSS_FLASHCARD_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferensi opsional. Flashcard tetap bekerja tanpa localStorage.
  }
}

function containsKanji(text: string) {
  return /[\u3400-\u9fff々〆ヵヶ]/u.test(text);
}

function textExtra(row: VocabularyRow, key: string) {
  const value = row.extra?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function numberExtra(row: VocabularyRow, key: string, fallback = 9999) {
  const value = row.extra?.[key];
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function flashcardValueMap(row: VocabularyRow) {
  const prompt = row.prompt.trim();
  const kana = (row.reading || prompt).trim();

  return {
    kanji: containsKanji(prompt) ? prompt : '',
    kana,
    romaji: textExtra(row, 'romaji'),
    arti: row.meaning_id?.trim() ?? '',
    jenis: textExtra(row, 'jenis'),
    kategori: textExtra(row, 'category'),
  } satisfies Record<CrossFlashcardField, string>;
}

function sideHasFlashcardValue(
  row: VocabularyRow,
  preferences: CrossFlashcardSidePreferences,
) {
  const values = flashcardValueMap(row);
  return CROSS_FLASHCARD_FIELDS.some(
    ({ key }) => preferences[key] && Boolean(values[key]),
  );
}

function CrossFlashcardFields({
  row,
  side,
  preferences,
}: {
  row: VocabularyRow;
  side: 'front' | 'back';
  preferences: CrossFlashcardSidePreferences;
}) {
  const values = flashcardValueMap(row);
  const fallbackToKana = !sideHasFlashcardValue(row, preferences);
  const kanjiLong = Array.from(values.kanji).length > 5;
  const kanaLong = Array.from(values.kana).length > 10;
  const showMeta = preferences.jenis || preferences.kategori;

  const visibleFieldCount = [
    preferences.kanji && Boolean(values.kanji),
    fallbackToKana,
    preferences.kana && Boolean(values.kana),
    preferences.romaji && Boolean(values.romaji),
    preferences.arti,
    showMeta,
  ].filter(Boolean).length;

  const densityClass = visibleFieldCount <= 1
    ? 'is-single-field'
    : visibleFieldCount === 2
      ? 'is-two-fields'
      : visibleFieldCount === 3
        ? 'is-three-fields'
        : 'is-many-fields';

  return <span className={`vocab-flashcard-fields is-${side} ${densityClass}`}>
    {preferences.kanji && values.kanji && (
      <span className={`vocab-flashcard-field vocab-flashcard-field-kanji${kanjiLong ? ' is-long' : ''}`}>
        {values.kanji}
      </span>
    )}

    {fallbackToKana && (
      <span className={`vocab-flashcard-field vocab-flashcard-field-kana is-fallback${kanaLong ? ' is-long' : ''}`}>
        {values.kana}
      </span>
    )}

    {preferences.kana && values.kana && (
      <span className={`vocab-flashcard-field vocab-flashcard-field-kana${kanaLong ? ' is-long' : ''}`}>
        {values.kana}
      </span>
    )}

    {preferences.romaji && values.romaji && (
      <span className="vocab-flashcard-field vocab-flashcard-field-romaji">{values.romaji}</span>
    )}

    {preferences.arti && (
      <strong className="vocab-flashcard-field vocab-flashcard-field-meaning">
        {values.arti || 'Arti belum tersedia'}
      </strong>
    )}

    {showMeta && (
      <span className="vocab-flashcard-field vocab-flashcard-field-meta">
        {preferences.jenis && <span className="vocab-jenis-badge">{values.jenis || '—'}</span>}
        {preferences.kategori && <span>{values.kategori || '—'}</span>}
      </span>
    )}
  </span>;
}

function CrossFlashcardPreferenceSection({
  title,
  preferences,
  onChange,
}: {
  title: string;
  preferences: CrossFlashcardSidePreferences;
  onChange: (key: CrossFlashcardField, checked: boolean) => void;
}) {
  const count = activeCrossFlashcardFields(preferences);

  return <section className="vocab-flashcard-settings-section">
    <strong>{title}</strong>
    <div className="vocab-flashcard-settings-grid">
      {CROSS_FLASHCARD_FIELDS.map(({ key, label }) => {
        const locked = preferences[key] && count <= 1;

        return <label key={key} className={locked ? 'is-locked' : undefined}>
          <input
            type="checkbox"
            checked={preferences[key]}
            disabled={locked}
            onChange={(event) => onChange(key, event.target.checked)}
          />
          <span>{label}</span>
        </label>;
      })}
    </div>
  </section>;
}

function shuffle<T>(source: T[]) {
  const copy = [...source];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function uniqueStrings(source: string[]) {
  return [...new Set(source.map((value) => value.trim()).filter(Boolean))];
}

function buildOptions(correct: string, candidates: string[]) {
  const distractors = shuffle(
    uniqueStrings(candidates).filter((candidate) => candidate !== correct),
  ).slice(0, 3);

  if (distractors.length < 3) return [];
  return shuffle([correct, ...distractors]);
}

function normalizeTypedAnswer(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ja-JP')
    .replace(/[\s\u3000]+/g, '');
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => typeof entry === 'string' ? entry.trim() : '')
    .filter(Boolean);
}

function kanjiReadings(row: KanjiRow) {
  return {
    onyomi: stringArray(row.extra?.onyomi),
    kunyomi: stringArray(row.extra?.kunyomi),
  };
}

function hasKanjiText(value: string) {
  return /[\u3400-\u9fff々〆ヵヶ]/u.test(value);
}

function vocabularyRomaji(row: VocabularyRow) {
  const raw = row.extra?.romaji;
  return typeof raw === 'string' ? raw.trim() : '';
}

function japaneseVocabulary(row: VocabularyRow) {
  return row.prompt.trim();
}

function kanaVocabulary(row: VocabularyRow) {
  return (row.reading || row.prompt).trim();
}

function meaningVocabulary(row: VocabularyRow) {
  return row.meaning_id?.trim() ?? '';
}

function chapterOf(row: VocabularyRow) {
  const raw = row.extra?.chapter_number;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_CHAPTER) return null;
  return numeric;
}

function inRange(chapter: number | null, start: number, end: number) {
  return chapter !== null && chapter >= start && chapter <= end;
}

async function loadAllVocabulary() {
  const rows: VocabularyRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('learning_items')
      .select('id,prompt,reading,meaning_id,extra')
      .eq('item_type', 'vocabulary')
      .eq('is_published', true)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as VocabularyRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function loadGrammarItemIdByPattern() {
  const { data, error } = await supabase
    .from('learning_items')
    .select('id,extra')
    .eq('item_type', 'grammar')
    .eq('is_published', true);

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; extra: Record<string, unknown> | null }>) {
    const patternId = typeof row.extra?.pattern_id === 'string'
      ? row.extra.pattern_id.trim()
      : '';
    if (patternId) map.set(patternId, row.id);
  }

  return map;
}

async function loadAllKanji() {
  const rows: KanjiRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('learning_items')
      .select('id,prompt,meaning_id,extra')
      .eq('item_type', 'kanji')
      .eq('is_published', true)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as KanjiRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

function buildVocabularyQuestions(
  vocabulary: VocabularyRow[],
  start: number,
  end: number,
) {
  const selected = vocabulary.filter((row) => inRange(chapterOf(row), start, end));

  const meanings = selected.map(meaningVocabulary);
  const japanese = selected.map(japaneseVocabulary);
  const kana = selected.map(kanaVocabulary);

  return selected.flatMap<PracticeQuestion>((row) => {
    const chapter = chapterOf(row);
    const meaning = meaningVocabulary(row);
    const prompt = japaneseVocabulary(row);
    const reading = kanaVocabulary(row);
    const romaji = vocabularyRomaji(row);

    if (!chapter || !meaning || !prompt) return [];

    const questions: PracticeQuestion[] = [];
    const meaningOptions = buildOptions(meaning, meanings);
    const japaneseOptions = buildOptions(prompt, japanese);
    const kanaOptions = buildOptions(reading, kana);
    const hasKanji = hasKanjiText(prompt);

    if (meaningOptions.length === 4) {
      questions.push({
        id: `vocabulary-${row.id}-jp-meaning`,
        module: 'vocabulary',
        reviewItemId: row.id,
        chapter,
        kind: 'choice',
        instruction: 'Pilih arti yang benar.',
        prompt,
        promptTone: hasKanji ? 'kanji' : 'kana',
        correctAnswer: meaning,
        options: meaningOptions,
        typeLabel: hasKanji ? 'Kanji → Arti' : 'Kana → Arti',
      });
    }

    if (japaneseOptions.length === 4) {
      questions.push({
        id: `vocabulary-${row.id}-meaning-jp`,
        module: 'vocabulary',
        reviewItemId: row.id,
        chapter,
        kind: 'choice',
        instruction: 'Pilih kosakata Jepang yang benar.',
        prompt: meaning,
        promptTone: 'meaning',
        correctAnswer: prompt,
        options: japaneseOptions,
        typeLabel: 'Arti → Jepang',
      });
    }

    if (hasKanji && reading && kanaOptions.length === 4) {
      questions.push({
        id: `vocabulary-${row.id}-kanji-kana`,
        module: 'vocabulary',
        reviewItemId: row.id,
        chapter,
        kind: 'choice',
        instruction: 'Pilih reading Kana yang benar.',
        prompt,
        promptTone: 'kanji',
        correctAnswer: reading,
        options: kanaOptions,
        typeLabel: 'Kanji → Kana',
      });
    }

    if (reading && meaningOptions.length === 4) {
      questions.push({
        id: `vocabulary-${row.id}-kana-meaning`,
        module: 'vocabulary',
        reviewItemId: row.id,
        chapter,
        kind: 'choice',
        instruction: 'Pilih arti dari Kana berikut.',
        prompt: reading,
        promptTone: 'kana',
        correctAnswer: meaning,
        options: meaningOptions,
        typeLabel: 'Kana → Arti',
      });
    }

    if (reading && kanaOptions.length === 4) {
      questions.push({
        id: `vocabulary-${row.id}-meaning-kana`,
        module: 'vocabulary',
        reviewItemId: row.id,
        chapter,
        kind: 'choice',
        instruction: 'Pilih Kana yang benar.',
        prompt: meaning,
        promptTone: 'meaning',
        correctAnswer: reading,
        options: kanaOptions,
        typeLabel: 'Arti → Kana',
      });
    }

    if (hasKanji && japaneseOptions.length === 4) {
      questions.push({
        id: `vocabulary-${row.id}-kana-kanji`,
        module: 'vocabulary',
        reviewItemId: row.id,
        chapter,
        kind: 'choice',
        instruction: 'Pilih Kanji yang sesuai dengan reading berikut.',
        prompt: reading,
        promptTone: 'kana',
        correctAnswer: prompt,
        options: japaneseOptions,
        typeLabel: 'Kana → Kanji',
      });
    }

    if (hasKanji && reading) {
      questions.push({
        id: `vocabulary-${row.id}-typing-kana`,
        module: 'vocabulary',
        reviewItemId: row.id,
        chapter,
        kind: 'typing',
        instruction: 'Ketik Kana yang benar.',
        prompt,
        promptTone: 'kanji',
        correctAnswer: reading,
        acceptableAnswers: [reading],
        options: [],
        typeLabel: 'Ketik: Kanji → Kana',
      });
    }

    if (romaji) {
      questions.push({
        id: `vocabulary-${row.id}-typing-romaji`,
        module: 'vocabulary',
        reviewItemId: row.id,
        chapter,
        kind: 'typing',
        instruction: 'Ketik Romaji yang benar.',
        prompt: hasKanji ? prompt : reading,
        promptTone: hasKanji ? 'kanji' : 'kana',
        correctAnswer: romaji,
        acceptableAnswers: [romaji],
        options: [],
        typeLabel: 'Ketik Jawaban',
      });
    }

    if (reading && meaningOptions.length === 4) {
      questions.push({
        id: `vocabulary-${row.id}-audio-meaning`,
        module: 'vocabulary',
        reviewItemId: row.id,
        chapter,
        kind: 'audio',
        instruction: 'Dengarkan, lalu pilih arti yang benar.',
        prompt: 'Dengarkan audio',
        promptTone: 'audio',
        correctAnswer: meaning,
        options: meaningOptions,
        audioText: reading,
        typeLabel: 'Dengarkan → Arti',
      });
    }

    return questions;
  });
}

function buildKanjiQuestions(
  vocabulary: VocabularyRow[],
  kanjiRows: KanjiRow[],
  start: number,
  end: number,
) {
  const selectedVocabulary = vocabulary.filter((row) => inRange(chapterOf(row), start, end));
  const chapterByKanji = new Map<string, number>();

  for (const kanji of kanjiRows) {
    const symbol = kanji.prompt.trim();
    if (!symbol) continue;

    for (const vocabularyRow of selectedVocabulary) {
      const chapter = chapterOf(vocabularyRow);
      if (!chapter || !vocabularyRow.prompt.includes(symbol)) continue;
      const current = chapterByKanji.get(kanji.id);
      if (current === undefined || chapter < current) chapterByKanji.set(kanji.id, chapter);
    }
  }

  const selectedKanji = kanjiRows.filter((row) => chapterByKanji.has(row.id) && row.meaning_id?.trim());
  const meanings = selectedKanji.map((row) => row.meaning_id ?? '');
  const symbols = selectedKanji.map((row) => row.prompt);
  const allOnyomi = selectedKanji.flatMap((row) => kanjiReadings(row).onyomi);
  const allKunyomi = selectedKanji.flatMap((row) => kanjiReadings(row).kunyomi);

  return selectedKanji.flatMap<PracticeQuestion>((row) => {
    const chapter = chapterByKanji.get(row.id);
    const meaning = row.meaning_id?.trim() ?? '';
    const symbol = row.prompt.trim();
    const readings = kanjiReadings(row);

    if (!chapter || !meaning || !symbol) return [];

    const questions: PracticeQuestion[] = [];

    const meaningOptions = buildOptions(meaning, meanings);
    if (meaningOptions.length === 4) {
      questions.push({
        id: `kanji-${row.id}-meaning`,
        module: 'kanji',
        reviewItemId: row.id,
        chapter,
        kind: 'choice',
        instruction: 'Pilih arti Kanji yang benar.',
        prompt: symbol,
        promptTone: 'kanji',
        correctAnswer: meaning,
        options: meaningOptions,
        typeLabel: 'Kanji → Arti',
      });
    }

    const symbolOptions = buildOptions(symbol, symbols);
    if (symbolOptions.length === 4) {
      questions.push({
        id: `kanji-${row.id}-symbol`,
        module: 'kanji',
        reviewItemId: row.id,
        chapter,
        kind: 'choice',
        instruction: 'Pilih Kanji yang sesuai dengan arti berikut.',
        prompt: meaning,
        promptTone: 'meaning',
        correctAnswer: symbol,
        options: symbolOptions,
        typeLabel: 'Arti → Kanji',
      });
    }

    const onyomi = readings.onyomi[0];
    if (onyomi) {
      const onyomiOptions = buildOptions(onyomi, allOnyomi);
      if (onyomiOptions.length === 4) {
        questions.push({
          id: `kanji-${row.id}-onyomi`,
          module: 'kanji',
          chapter,
          kind: 'choice',
          instruction: 'Pilih Onyomi yang benar.',
          prompt: symbol,
          promptTone: 'kanji',
          correctAnswer: onyomi,
          acceptableAnswers: readings.onyomi,
          options: onyomiOptions,
          typeLabel: 'Kanji → Onyomi',
        });
      }

      questions.push({
        id: `kanji-${row.id}-typing-onyomi`,
        module: 'kanji',
        reviewItemId: row.id,
        chapter,
        kind: 'typing',
        instruction: 'Ketik salah satu Onyomi yang benar.',
        prompt: symbol,
        promptTone: 'kanji',
        correctAnswer: onyomi,
        acceptableAnswers: readings.onyomi,
        options: [],
        typeLabel: 'Ketik Onyomi',
      });
    }

    const kunyomi = readings.kunyomi[0];
    if (kunyomi) {
      const kunyomiOptions = buildOptions(kunyomi, allKunyomi);
      if (kunyomiOptions.length === 4) {
        questions.push({
          id: `kanji-${row.id}-kunyomi`,
          module: 'kanji',
          chapter,
          kind: 'choice',
          instruction: 'Pilih Kunyomi yang benar.',
          prompt: symbol,
          promptTone: 'kanji',
          correctAnswer: kunyomi,
          acceptableAnswers: readings.kunyomi,
          options: kunyomiOptions,
          typeLabel: 'Kanji → Kunyomi',
        });
      }

      questions.push({
        id: `kanji-${row.id}-typing-kunyomi`,
        module: 'kanji',
        reviewItemId: row.id,
        chapter,
        kind: 'typing',
        instruction: 'Ketik salah satu Kunyomi yang benar.',
        prompt: symbol,
        promptTone: 'kanji',
        correctAnswer: kunyomi,
        acceptableAnswers: readings.kunyomi,
        options: [],
        typeLabel: 'Ketik Kunyomi',
      });
    }

    return questions;
  });
}

function buildGrammarQuestions(
  start: number,
  end: number,
  grammarItemIdByPattern: Map<string, string>,
) {
  const patternById = new Map(GRAMMAR_PATTERNS.map((pattern) => [pattern.id, pattern]));

  return GRAMMAR_EXERCISES.flatMap<PracticeQuestion>((exercise) => {
    const pattern = patternById.get(exercise.patternId);
    if (!pattern || pattern.chapter < start || pattern.chapter > end) return [];

    if (exercise.type === 'sentence_order') {
      return [];
    }

    const options = exercise.options ?? [];

    if (options.length >= 4) {
      return [{
        id: `grammar-${exercise.id}`,
        module: 'grammar',
        reviewItemId: grammarItemIdByPattern.get(exercise.patternId),
        chapter: pattern.chapter,
        kind: 'choice',
        instruction: exercise.instruction,
        prompt: exercise.prompt,
        promptTone: 'grammar',
        correctAnswer: exercise.answer,
        acceptableAnswers: exercise.acceptableAnswers,
        options: shuffle(options),
        typeLabel: exercise.type === 'multiple_choice'
          ? 'Pilih Jawaban'
          : exercise.type === 'pattern_choice'
            ? 'Pilih Pola'
            : exercise.type === 'fill_blank'
              ? 'Lengkapi Kalimat'
              : exercise.type === 'conjugation'
                ? 'Konjugasi'
                : 'Koreksi Kalimat',
        explanation: exercise.explanation,
      }];
    }

    if (
      exercise.type === 'fill_blank'
      || exercise.type === 'conjugation'
    ) {
      return [{
        id: `grammar-${exercise.id}-typing`,
        module: 'grammar',
        reviewItemId: grammarItemIdByPattern.get(exercise.patternId),
        chapter: pattern.chapter,
        kind: 'typing',
        instruction: exercise.instruction,
        prompt: exercise.prompt,
        promptTone: 'grammar',
        correctAnswer: exercise.answer,
        acceptableAnswers: [exercise.answer, ...(exercise.acceptableAnswers ?? [])],
        options: [],
        typeLabel: exercise.type === 'fill_blank' ? 'Ketik: Lengkapi Kalimat' : 'Ketik: Konjugasi',
        explanation: exercise.explanation,
      }];
    }

    return [];
  });
}

function selectBalanced(
  source: PracticeQuestion[],
  requestedCount: number,
  start: number,
  end: number,
) {
  if (source.length <= requestedCount) return shuffle(source);

  const chapterOrder = shuffle(
    Array.from({ length: end - start + 1 }, (_, index) => start + index)
      .filter((chapter) => source.some((question) => question.chapter === chapter)),
  );

  const groups = new Map<number, PracticeQuestion[]>();
  for (const chapter of chapterOrder) {
    groups.set(chapter, shuffle(source.filter((question) => question.chapter === chapter)));
  }

  const selected: PracticeQuestion[] = [];
  let round = 0;

  while (selected.length < requestedCount) {
    let added = false;
    for (const chapter of chapterOrder) {
      const question = groups.get(chapter)?.[round];
      if (!question) continue;
      selected.push(question);
      added = true;
      if (selected.length === requestedCount) break;
    }
    if (!added) break;
    round += 1;
  }

  return selected;
}

function buildSession(
  module: PracticeModule,
  questionCount: number,
  start: number,
  end: number,
  vocabulary: VocabularyRow[],
  kanjiRows: KanjiRow[],
  grammarItemIdByPattern: Map<string, string>,
) {
  const vocabularyQuestions = buildVocabularyQuestions(vocabulary, start, end);
  const kanjiQuestions = buildKanjiQuestions(vocabulary, kanjiRows, start, end);
  const grammarQuestions = buildGrammarQuestions(start, end, grammarItemIdByPattern);

  if (module === 'vocabulary') return selectBalanced(vocabularyQuestions, questionCount, start, end);
  if (module === 'kanji') return selectBalanced(kanjiQuestions, questionCount, start, end);
  if (module === 'grammar') return selectBalanced(grammarQuestions, questionCount, start, end);

  const perModule = Math.ceil(questionCount / 3);
  const initial = [
    ...selectBalanced(vocabularyQuestions, perModule, start, end),
    ...selectBalanced(kanjiQuestions, perModule, start, end),
    ...selectBalanced(grammarQuestions, perModule, start, end),
  ];

  const selectedIds = new Set(initial.map((question) => question.id));
  const remaining = [
    ...vocabularyQuestions,
    ...kanjiQuestions,
    ...grammarQuestions,
  ].filter((question) => !selectedIds.has(question.id));

  const combined = initial.length >= questionCount
    ? shuffle(initial).slice(0, questionCount)
    : [
      ...initial,
      ...selectBalanced(remaining, questionCount - initial.length, start, end),
    ];

  return shuffle(combined).slice(0, questionCount);
}

function moduleLabel(module: PracticeQuestion['module']) {
  if (module === 'vocabulary') return 'Kosakata';
  if (module === 'kanji') return 'Kanji';
  return 'Tata Bahasa';
}

function scorePercent(correct: number, total: number) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

export function CrossChapterPractice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const standaloneMode: 'quiz' | 'flashcard' | null = location.pathname === '/latihan/sesi'
    ? 'quiz'
    : location.pathname === '/latihan/flashcard'
      ? 'flashcard'
      : null;

  const routeStartChapter = routeChapter(searchParams.get('start'), 1);
  const rawRouteEndChapter = routeChapter(searchParams.get('end'), routeStartChapter);
  const routeEndChapter = Math.max(routeStartChapter, rawRouteEndChapter);
  const routePracticeModule = routeModule(searchParams.get('module'));
  const routePracticeCount = routeQuestionCount(searchParams.get('count'));
  const routeBootKey = standaloneMode
    ? `${standaloneMode}:${routeStartChapter}:${routeEndChapter}:${routePracticeModule}:${routePracticeCount}`
    : '';
  const routeBootRef = useRef('');

  const [startChapter, setStartChapter] = useState(1);
  const [endChapter, setEndChapter] = useState(3);
  const [module, setModule] = useState<PracticeModule>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [phase, setPhase] = useState<PracticePhase>(
    () => standaloneMode ? 'loading' : 'setup',
  );
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [loadError, setLoadError] = useState('');
  const [progressPending, setProgressPending] = useState(0);
  const [progressSaveError, setProgressSaveError] = useState('');
  const progressQueueRef = useRef<Promise<void>>(Promise.resolve());
  const recordedProgressKeysRef = useRef(new Set<string>());
  const [flashcardItems, setFlashcardItems] = useState<VocabularyRow[]>([]);
  const [flashcardDeckIds, setFlashcardDeckIds] = useState<string[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardRevealed, setFlashcardRevealed] = useState(false);
  const [flashcardPreferences, setFlashcardPreferences] = useState<CrossFlashcardPreferences>(
    loadCrossFlashcardPreferences,
  );
  const [flashcardSettingsOpen, setFlashcardSettingsOpen] = useState(false);
  const flashcardSettingsRef = useRef<HTMLDetailsElement>(null);
  const cacheRef = useRef<PracticeCache | null>(null);

  const currentQuestion = questions[currentIndex];
  const currentCorrect = currentQuestion
    ? currentQuestion.kind === 'typing'
      ? typedAnswer.trim()
        ? (
          currentQuestion.acceptableAnswers
            ?? [currentQuestion.correctAnswer]
        ).some((answer) => (
          normalizeTypedAnswer(answer) === normalizeTypedAnswer(typedAnswer)
        ))
        : null
      : selectedAnswer
        ? selectedAnswer === currentQuestion.correctAnswer
        : null
    : null;

  const chapterResults = useMemo(() => {
    const rows = new Map<number, { total: number; correct: number }>();
    for (const attempt of attempts) {
      const current = rows.get(attempt.question.chapter) ?? { total: 0, correct: 0 };
      current.total += 1;
      if (attempt.correct) current.correct += 1;
      rows.set(attempt.question.chapter, current);
    }

    return [...rows.entries()]
      .sort(([a], [b]) => a - b)
      .map(([chapter, stats]) => ({ chapter, ...stats }));
  }, [attempts]);

  const score = attempts.filter((attempt) => attempt.correct).length;

  useEffect(() => {
    if (!flashcardSettingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = flashcardSettingsRef.current;
      if (!menu || !(event.target instanceof Node)) return;
      if (!menu.contains(event.target)) setFlashcardSettingsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setFlashcardSettingsOpen(false);
      const summary = flashcardSettingsRef.current?.querySelector('summary');
      if (summary instanceof HTMLElement) summary.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [flashcardSettingsOpen]);

  useEffect(() => {
    if (phase !== 'flashcard' || flashcardSettingsOpen || flashcardDeckIds.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, textarea, select, summary, [contenteditable="true"]')) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setFlashcardIndex((current) => (
          current - 1 + flashcardDeckIds.length
        ) % flashcardDeckIds.length);
        setFlashcardRevealed(false);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setFlashcardIndex((current) => (current + 1) % flashcardDeckIds.length);
        setFlashcardRevealed(false);
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setFlashcardRevealed((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flashcardDeckIds.length, flashcardSettingsOpen, phase]);

  const queuePracticeProgress = (question: PracticeQuestion, correct: boolean) => {
    if (!question.reviewItemId) return;

    // Vocabulary/Kanji: satu update per learning item per sesi.
    // Grammar: tetap per exercise seperti Quiz Grammar existing.
    const reviewKey = question.module === 'grammar'
      ? question.id
      : question.reviewItemId;

    if (recordedProgressKeysRef.current.has(reviewKey)) return;
    recordedProgressKeysRef.current.add(reviewKey);

    setProgressPending((current) => current + 1);
    setProgressSaveError('');

    progressQueueRef.current = progressQueueRef.current.then(async () => {
      try {
        const { error } = await supabase.rpc('record_learning_review', {
          p_item_id: question.reviewItemId,
          p_rating: correct ? 2 : 0,
        });

        if (error) {
          const detail = [error.message, error.details, error.hint].filter(Boolean).join(' — ');
          throw new Error(detail || 'Progress latihan gagal disimpan.');
        }
      } catch (saveError) {
        setProgressSaveError(
          saveError instanceof Error
            ? saveError.message
            : 'Sebagian progress latihan belum tersimpan.',
        );
      } finally {
        setProgressPending((current) => Math.max(0, current - 1));
      }
    });
  };

  const startFlashcardSession = async () => {
    const effectiveStart = standaloneMode === 'flashcard' ? routeStartChapter : startChapter;
    const effectiveEnd = standaloneMode === 'flashcard' ? routeEndChapter : endChapter;

    setPhase('loading');
    setLoadError('');

    try {
      if (!cacheRef.current) {
        const [vocabulary, kanji] = await Promise.all([
          loadAllVocabulary(),
          loadAllKanji(),
        ]);
        cacheRef.current = { vocabulary, kanji };
      }

      const selected = cacheRef.current.vocabulary
        .filter((row) => inRange(chapterOf(row), effectiveStart, effectiveEnd))
        .slice()
        .sort((a, b) => (
          (chapterOf(a) ?? 999) - (chapterOf(b) ?? 999)
          || numberExtra(a, 'sort_order') - numberExtra(b, 'sort_order')
          || a.prompt.localeCompare(b.prompt, 'ja')
        ));

      if (!selected.length) {
        throw new Error('Tidak ada kosakata Flashcard pada rentang Bab ini.');
      }

      setFlashcardItems(selected);
      setFlashcardDeckIds(selected.map((row) => row.id));
      setFlashcardIndex(0);
      setFlashcardRevealed(false);
      setFlashcardSettingsOpen(false);
      setPhase('flashcard');
    } catch (error) {
      console.error('KOJAC cross chapter flashcard load failed', error);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Flashcard lintas bab belum dapat dimuat.',
      );
      setPhase('setup');
    }
  };

  const startSession = async () => {
    const effectiveStart = standaloneMode === 'quiz' ? routeStartChapter : startChapter;
    const effectiveEnd = standaloneMode === 'quiz' ? routeEndChapter : endChapter;
    const effectiveModule = standaloneMode === 'quiz' ? routePracticeModule : module;
    const effectiveQuestionCount = standaloneMode === 'quiz' ? routePracticeCount : questionCount;

    setPhase('loading');
    setLoadError('');
    setAttempts([]);
    setCurrentIndex(0);
    setSelectedAnswer('');
    setTypedAnswer('');
    setProgressPending(0);
    setProgressSaveError('');
    recordedProgressKeysRef.current.clear();

    try {
      if (!cacheRef.current) {
        const [vocabulary, kanji, grammarItemIdByPattern] = await Promise.all([
          loadAllVocabulary(),
          loadAllKanji(),
          loadGrammarItemIdByPattern(),
        ]);
        cacheRef.current = { vocabulary, kanji, grammarItemIdByPattern };
      } else if (!cacheRef.current.grammarItemIdByPattern) {
        cacheRef.current.grammarItemIdByPattern = await loadGrammarItemIdByPattern();
      }

      const session = buildSession(
        effectiveModule,
        effectiveQuestionCount,
        effectiveStart,
        effectiveEnd,
        cacheRef.current.vocabulary,
        cacheRef.current.kanji,
        cacheRef.current.grammarItemIdByPattern ?? new Map(),
      );

      if (!session.length) throw new Error('Tidak ada soal yang dapat dibuat untuk rentang dan jenis latihan ini.');
      setQuestions(session);
      setPhase('quiz');
    } catch (error) {
      console.error('KOJAC cross chapter practice load failed', error);
      setLoadError(error instanceof Error ? error.message : 'Latihan lintas bab belum dapat dimuat.');
      setPhase('setup');
    }
  };

  useEffect(() => {
    if (!standaloneMode || !routeBootKey || routeBootRef.current === routeBootKey) return;

    routeBootRef.current = routeBootKey;
    setStartChapter(routeStartChapter);
    setEndChapter(routeEndChapter);
    setModule(routePracticeModule);
    setQuestionCount(routePracticeCount);

    if (standaloneMode === 'flashcard') {
      void startFlashcardSession();
    } else {
      void startSession();
    }
  }, [routeBootKey]);

  const nextQuestion = () => {
    if (!currentQuestion) return;

    const answer = currentQuestion.kind === 'typing'
      ? typedAnswer.trim()
      : selectedAnswer;

    if (!answer) return;

    const correct = currentQuestion.kind === 'typing'
      ? (
        currentQuestion.acceptableAnswers
          ?? [currentQuestion.correctAnswer]
      ).some((candidate) => (
        normalizeTypedAnswer(candidate) === normalizeTypedAnswer(answer)
      ))
      : answer === currentQuestion.correctAnswer;

    const nextAttempts = [
      ...attempts,
      {
        question: currentQuestion,
        selectedAnswer: answer,
        correct,
      },
    ];
    setAttempts(nextAttempts);
    queuePracticeProgress(currentQuestion, correct);

    if (currentIndex >= questions.length - 1) {
      setPhase('result');
      return;
    }

    setCurrentIndex((current) => current + 1);
    setSelectedAnswer('');
    setTypedAnswer('');
  };

  const resetToSetup = () => {
    setPhase('setup');
    setQuestions([]);
    setAttempts([]);
    setCurrentIndex(0);
    setSelectedAnswer('');
    setFlashcardItems([]);
    setFlashcardDeckIds([]);
    setFlashcardIndex(0);
    setFlashcardRevealed(false);
    setFlashcardSettingsOpen(false);
    setLoadError('');
    setProgressPending(0);
    setProgressSaveError('');
    recordedProgressKeysRef.current.clear();
  };

  const returnToPracticeCenter = () => {
    if (standaloneMode) {
      navigate('/latihan');
      return;
    }
    resetToSetup();
  };

  if (standaloneMode && phase === 'loading') {
    return (
      <section className="cross-practice-standalone-loading" role="status" aria-live="polite">
        <strong>
          {standaloneMode === 'flashcard'
            ? 'Menyiapkan Flashcard Lintas Bab…'
            : 'Menyiapkan Latihan Lintas Bab…'}
        </strong>
        <span>
          Bab {routeStartChapter}–{routeEndChapter}
          {standaloneMode === 'quiz'
            ? ` · ${MODULES.find((item) => item.key === routePracticeModule)?.label ?? 'Campuran'} · ${routePracticeCount} soal`
            : ''}
        </span>
      </section>
    );
  }

  if (phase === 'flashcard' && flashcardDeckIds.length > 0) {
    const safeIndex = flashcardIndex % flashcardDeckIds.length;
    const activeId = flashcardDeckIds[safeIndex];
    const row = flashcardItems.find((item) => item.id === activeId) ?? flashcardItems[0];

    if (!row) {
      resetToSetup();
      return null;
    }

    const values = flashcardValueMap(row);
    const currentChapter = chapterOf(row);

    const updatePreference = (
      side: 'front' | 'back',
      key: CrossFlashcardField,
      checked: boolean,
    ) => {
      setFlashcardPreferences((current) => {
        if (
          !checked
          && current[side][key]
          && activeCrossFlashcardFields(current[side]) <= 1
        ) {
          return current;
        }

        const next: CrossFlashcardPreferences = {
          ...current,
          [side]: {
            ...current[side],
            [key]: checked,
          },
        };
        saveCrossFlashcardPreferences(next);
        return next;
      });
    };

    const goPrevious = () => {
      setFlashcardIndex((current) => (
        current - 1 + flashcardDeckIds.length
      ) % flashcardDeckIds.length);
      setFlashcardRevealed(false);
    };

    const goNext = () => {
      setFlashcardIndex((current) => (current + 1) % flashcardDeckIds.length);
      setFlashcardRevealed(false);
    };

    const shuffleFlashcards = () => {
      setFlashcardDeckIds((current) => shuffle(current));
      setFlashcardIndex(0);
      setFlashcardRevealed(false);
    };

    return (
      <section className="cross-practice-shell cross-practice-flashcard" aria-label="Flashcard lintas bab">
        <div className="cross-practice-flashcard-back">
          <button type="button" onClick={returnToPracticeCenter}>
            <ArrowLeft size={16}/> Kembali ke Latihan
          </button>
          <span>FLASHCARD LINTAS BAB · BAB {standaloneMode === 'flashcard' ? routeStartChapter : startChapter}–{standaloneMode === 'flashcard' ? routeEndChapter : endChapter}</span>
        </div>

        <div className="vocab-flashcard-stage">
          <div className="vocab-flashcard-topbar">
            <div className="vocab-flashcard-meta">
              <strong>{safeIndex + 1} / {flashcardDeckIds.length}</strong>
              <span>
                Bab {currentChapter ?? '—'} · rentang Bab {standaloneMode === 'flashcard' ? routeStartChapter : startChapter}–{standaloneMode === 'flashcard' ? routeEndChapter : endChapter}
              </span>
            </div>

            <details
              ref={flashcardSettingsRef}
              className="vocab-flashcard-settings"
              open={flashcardSettingsOpen}
              onToggle={(event) => setFlashcardSettingsOpen(event.currentTarget.open)}
            >
              <summary><SlidersHorizontal size={16}/> Atur Flashcard</summary>
              <div className="vocab-flashcard-settings-popover">
                <CrossFlashcardPreferenceSection
                  title="SISI DEPAN"
                  preferences={flashcardPreferences.front}
                  onChange={(key, checked) => updatePreference('front', key, checked)}
                />

                <CrossFlashcardPreferenceSection
                  title="SISI BELAKANG"
                  preferences={flashcardPreferences.back}
                  onChange={(key, checked) => updatePreference('back', key, checked)}
                />

                <label className="vocab-flashcard-audio-setting">
                  <input
                    type="checkbox"
                    checked={flashcardPreferences.audio}
                    onChange={(event) => {
                      const next = {
                        ...flashcardPreferences,
                        audio: event.target.checked,
                      };
                      saveCrossFlashcardPreferences(next);
                      setFlashcardPreferences(next);
                    }}
                  />
                  <span>Tampilkan Audio</span>
                </label>

                <button
                  type="button"
                  className="vocab-flashcard-reset"
                  onClick={() => {
                    const next = createCrossFlashcardPreferences();
                    saveCrossFlashcardPreferences(next);
                    setFlashcardPreferences(next);
                  }}
                >
                  Reset Flashcard
                </button>
              </div>
            </details>
          </div>

          <button
            type="button"
            className={`vocab-flashcard${flashcardRevealed ? ' revealed' : ''}`}
            onClick={() => setFlashcardRevealed((current) => !current)}
            aria-pressed={flashcardRevealed}
          >
            <span className="vocab-flashcard-inner" aria-hidden="true">
              <span className="vocab-flashcard-face vocab-flashcard-front">
                <CrossFlashcardFields
                  row={row}
                  side="front"
                  preferences={flashcardPreferences.front}
                />
                <span className="vocab-flashcard-hint">
                  Klik / tap kartu untuk melihat jawaban
                </span>
              </span>

              <span className="vocab-flashcard-face vocab-flashcard-back">
                <span className="vocab-flashcard-back-label">JAWABAN</span>
                <CrossFlashcardFields
                  row={row}
                  side="back"
                  preferences={flashcardPreferences.back}
                />
                <span className="vocab-flashcard-hint">
                  Flashcard latihan lintas bab · tidak mengubah SRS
                </span>
              </span>
            </span>
          </button>

          <div className="vocab-flashcard-controls" aria-label="Navigasi Flashcard lintas bab">
            <button
              type="button"
              className="vocab-flashcard-prev"
              onClick={goPrevious}
              disabled={flashcardDeckIds.length <= 1}
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              className="vocab-flashcard-shuffle"
              onClick={shuffleFlashcards}
              disabled={flashcardDeckIds.length <= 1}
            >
              <Shuffle size={16}/> Acak
            </button>
            <button
              type="button"
              className="vocab-flashcard-next"
              onClick={goNext}
              disabled={flashcardDeckIds.length <= 1}
            >
              Selanjutnya →
            </button>
          </div>

          {flashcardPreferences.audio && (
            <button
              type="button"
              className="vocab-flashcard-audio"
              onClick={() => speakJapanese(values.kana)}
              aria-label={`Dengarkan ${values.kana}`}
            >
              <Speaker size={17}/>
              <span className="vocab-flashcard-audio-label">Dengarkan</span>
            </button>
          )}
        </div>

        <p className="cross-practice-safety-note cross-practice-flashcard-note">
          Flashcard ini menggunakan seluruh Kosakata published pada Bab {standaloneMode === 'flashcard' ? routeStartChapter : startChapter}–{standaloneMode === 'flashcard' ? routeEndChapter : endChapter}.
          Sesi tidak mengubah mastery, SRS, atau due date.
        </p>
      </section>
    );
  }

  if (phase === 'quiz' && currentQuestion) {
    return (
      <section className="cross-practice-shell cross-practice-quiz" aria-label="Latihan lintas bab">
        <div className="cross-practice-quiz-top">
          <button type="button" onClick={returnToPracticeCenter}><ArrowLeft size={16}/> Kembali ke Latihan</button>
          <div><span>Bab {startChapter}–{endChapter}</span><strong>{currentIndex + 1} / {questions.length}</strong></div>
        </div>

        <div className="cross-practice-progress" aria-hidden="true">
          <span style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}/>
        </div>

        {(progressPending > 0 || progressSaveError) && (
          <div className={`cross-practice-progress-sync ${progressSaveError ? 'error' : ''}`} role="status">
            {progressSaveError
              ? `Progress belum tersimpan: ${progressSaveError}`
              : `Menyinkronkan progress… ${progressPending}`}
          </div>
        )}

        <article className="cross-practice-question-card">
          <div className="cross-practice-question-meta">
            <span>{moduleLabel(currentQuestion.module)}</span>
            <span>{currentQuestion.typeLabel}</span>
            <span>Bab {currentQuestion.chapter}</span>
          </div>

          <p>{currentQuestion.instruction}</p>

          {currentQuestion.kind === 'audio' ? (
            <div className="cross-practice-audio-question">
              <button
                type="button"
                onClick={() => currentQuestion.audioText && speakJapanese(currentQuestion.audioText)}
              >
                <Speaker size={20}/>
                Dengarkan
              </button>
            </div>
          ) : (
            <h3>{currentQuestion.prompt}</h3>
          )}

          {currentQuestion.kind === 'typing' ? (
            <div className="cross-practice-typing-wrap">
              <input
                className="cross-practice-typing-input"
                value={typedAnswer}
                onChange={(event) => setTypedAnswer(event.target.value)}
                placeholder="Ketik jawaban…"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="cross-practice-typing-check"
                disabled={!typedAnswer.trim()}
                onClick={() => {
                  if (!typedAnswer.trim()) return;
                  setSelectedAnswer('__typed_checked__');
                }}
              >
                Periksa Jawaban
              </button>
            </div>
          ) : (
            <div className="cross-practice-options">
              {currentQuestion.options.map((option) => {
                const selected = option === selectedAnswer;
                const correct = Boolean(selectedAnswer) && option === currentQuestion.correctAnswer;
                const wrong = selected && currentCorrect === false;

                return (
                  <button
                    type="button"
                    key={option}
                    className={[selected ? 'selected' : '', correct ? 'correct' : '', wrong ? 'wrong' : ''].filter(Boolean).join(' ')}
                    disabled={Boolean(selectedAnswer)}
                    onClick={() => setSelectedAnswer(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {(currentQuestion.kind === 'typing' ? selectedAnswer === '__typed_checked__' : Boolean(selectedAnswer)) && (
            <div className={`cross-practice-feedback ${currentCorrect ? 'correct' : 'wrong'}`}>
              {currentCorrect ? <CheckCircle2 size={18}/> : <XCircle size={18}/>}
              <div>
                <strong>{currentCorrect ? 'Benar' : 'Belum tepat'}</strong>
                {!currentCorrect && <span>Jawaban: {currentQuestion.correctAnswer}</span>}
              </div>
            </div>
          )}

          <button type="button" className="cross-practice-next" disabled={!selectedAnswer} onClick={nextQuestion}>
            {currentIndex === questions.length - 1 ? 'Lihat Hasil' : 'Soal Berikutnya'}
          </button>
        </article>
      </section>
    );
  }

  if (phase === 'result') {
    return (
      <section className="cross-practice-shell cross-practice-result" aria-label="Hasil latihan lintas bab">
        <div className="cross-practice-result-hero">
          <div className="cross-practice-result-icon"><Target size={25}/></div>
          <div>
            <p className="eyebrow">HASIL LATIHAN LINTAS BAB</p>
            <h2>{score} / {attempts.length} · {scorePercent(score, attempts.length)}%</h2>
            <span>Bab {startChapter}–{endChapter} · {MODULES.find((item) => item.key === module)?.label}</span>
          </div>
        </div>

        <div className="cross-practice-chapter-results">
          {chapterResults.map((row) => (
            <article key={row.chapter}>
              <span>Bab {row.chapter}</span>
              <strong>{row.correct}/{row.total}</strong>
              <small>{scorePercent(row.correct, row.total)}%</small>
            </article>
          ))}
        </div>

        <section className="cross-practice-review-section" aria-labelledby="cross-practice-review-title">
          <div className="cross-practice-review-heading">
            <div>
              <p className="eyebrow">PREVIEW SOAL & JAWABAN</p>
              <h3 id="cross-practice-review-title">Lihat Ulang Semua Soal</h3>
            </div>
            <span>{attempts.length} soal</span>
          </div>

          <div className="cross-practice-review-list">
            {attempts.map((attempt, index) => (
              <details className={`cross-practice-review-item ${attempt.correct ? 'correct' : 'wrong'}`} key={attempt.question.id}>
                <summary>
                  <div>
                    <strong>Soal {index + 1}</strong>
                    <span>{moduleLabel(attempt.question.module)} · {attempt.question.typeLabel} · Bab {attempt.question.chapter}</span>
                  </div>
                  <span className="cross-practice-review-status">
                    {attempt.correct ? 'Benar' : 'Salah'}
                  </span>
                </summary>

                <div className="cross-practice-review-body">
                  <p className="cross-practice-review-instruction">{attempt.question.instruction}</p>
                  <h4>{attempt.question.kind === 'audio' ? '🔊 Soal Audio' : attempt.question.prompt}</h4>

                  {attempt.question.options.length > 0 && <div className="cross-practice-review-options">
                    {attempt.question.options.map((option) => {
                      const isCorrect = option === attempt.question.correctAnswer;
                      const isSelected = option === attempt.selectedAnswer;

                      return (
                        <div
                          className={[
                            isCorrect ? 'correct' : '',
                            isSelected ? 'selected' : '',
                            isSelected && !isCorrect ? 'wrong' : '',
                          ].filter(Boolean).join(' ')}
                          key={option}
                        >
                          <span>{option}</span>
                          {isCorrect && <small>Jawaban benar</small>}
                          {isSelected && !isCorrect && <small>Jawaban Anda</small>}
                          {isSelected && isCorrect && <small>Jawaban Anda · benar</small>}
                        </div>
                      );
                    })}
                  </div>}

                  <div className="cross-practice-review-answer-line">
                    <div>
                      <span>Jawaban Anda</span>
                      <strong>{attempt.selectedAnswer}</strong>
                    </div>
                    <div>
                      <span>Jawaban benar</span>
                      <strong>{attempt.question.correctAnswer}</strong>
                    </div>
                  </div>

                  {attempt.question.explanation && (
                    <div className="cross-practice-review-explanation">
                      <span>Penjelasan</span>
                      <p>{attempt.question.explanation}</p>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        {(progressPending > 0 || progressSaveError) && (
          <div className={`cross-practice-progress-sync ${progressSaveError ? 'error' : ''}`} role="status">
            {progressSaveError
              ? `Sebagian progress belum tersimpan: ${progressSaveError}`
              : `Menyinkronkan ${progressPending} update progress…`}
          </div>
        )}

        <p className="cross-practice-result-note">
          Jawaban pada sesi ini memperbarui mastery, SRS, due date, akurasi, dan progress materi seperti Quiz di menu Belajar.
        </p>

        <div className="cross-practice-result-actions">
          <button type="button" className="ghost-btn" onClick={returnToPracticeCenter}>
            <ArrowLeft size={16}/> Kembali ke Latihan
          </button>
          <button type="button" className="cross-practice-start" onClick={() => void startSession()}>
            <RotateCcw size={16}/> Ulangi Rentang Ini
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="cross-practice-shell" aria-labelledby="cross-practice-title">
      <div className="cross-practice-heading">
        <div>
          <p className="eyebrow">LATIHAN LINTAS BAB</p>
          <h2 id="cross-practice-title">Latihan Fleksibel Bab 1–35</h2>
          <p>Pilih paket 3 bab atau tentukan sendiri rentang bab yang ingin dilatih. Soal digabung menjadi satu sesi lintas bab.</p>
        </div>
        <div className="cross-practice-heading-icon"><Layers3 size={22}/></div>
      </div>

      <div className="cross-practice-preset-grid">
        {PRESETS.map((preset) => {
          const active = preset.start === startChapter && preset.end === endChapter;
          return (
            <button
              type="button"
              key={preset.start}
              className={active ? 'active' : ''}
              onClick={() => { setStartChapter(preset.start); setEndChapter(preset.end); }}
            >
              Bab {preset.start}–{preset.end}
            </button>
          );
        })}
      </div>

      <div className="cross-practice-custom">
        <div><strong>Rentang Custom</strong><span>Pilih bab awal dan akhir.</span></div>

        <label>
          <span>Dari Bab</span>
          <select
            value={startChapter}
            onChange={(event) => {
              const next = Number(event.target.value);
              setStartChapter(next);
              if (next > endChapter) setEndChapter(next);
            }}
          >
            {Array.from({ length: MAX_CHAPTER }, (_, index) => index + 1).map((chapter) => (
              <option value={chapter} key={chapter}>{chapter}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Sampai Bab</span>
          <select
            value={endChapter}
            onChange={(event) => {
              const next = Number(event.target.value);
              setEndChapter(next);
              if (next < startChapter) setStartChapter(next);
            }}
          >
            {Array.from({ length: MAX_CHAPTER }, (_, index) => index + 1).map((chapter) => (
              <option value={chapter} key={chapter}>{chapter}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="cross-practice-config">
        <div>
          <span className="cross-practice-config-label">Jenis latihan</span>
          <div className="cross-practice-module-grid">
            {MODULES.map((item) => (
              <button
                type="button"
                key={item.key}
                className={module === item.key ? 'active' : ''}
                onClick={() => setModule(item.key)}
              >
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        </div>

        {module === 'mixed' && <div>
          <span className="cross-practice-config-label">Jumlah soal</span>
          <div className="cross-practice-count-row">
            {QUESTION_COUNTS.map((count) => (
              <button
                type="button"
                key={count}
                className={questionCount === count ? 'active' : ''}
                onClick={() => setQuestionCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>}
      </div>

      {loadError && <div className="cross-practice-error" role="alert">{loadError}</div>}

      <div className="cross-practice-footer">
        <div>
          <strong>Bab {startChapter}–{endChapter}</strong>
          <span>
            {module === 'vocabulary'
              ? 'Kosakata · pilih tipe Quiz dan jumlah soal di halaman berikutnya'
              : module === 'kanji'
                ? 'Kanji · pilih tipe Quiz dan jumlah soal di halaman berikutnya'
                : module === 'grammar'
                  ? 'Tata Bahasa · pilih jumlah soal di halaman Quiz lintas bab'
                  : `${MODULES.find((item) => item.key === module)?.label} · ${questionCount} soal`}
          </span>
        </div>
        <div className="cross-practice-session-actions">
          <button
            type="button"
            className="cross-practice-flashcard-start"
            disabled={phase === 'loading'}
            onClick={() => navigate(
              `/latihan/flashcard?start=${startChapter}&end=${endChapter}`,
            )}
          >
            <Layers3 size={16}/>
            Flashcard Lintas Bab
          </button>

          <button
            type="button"
            className="cross-practice-start"
            disabled={phase === 'loading'}
            onClick={() => navigate(
              module === 'vocabulary'
                ? `/latihan/vocabulary?start=${startChapter}&end=${endChapter}`
                : module === 'kanji'
                  ? `/latihan/kanji?start=${startChapter}&end=${endChapter}`
                  : module === 'grammar'
                    ? `/latihan/grammar?start=${startChapter}&end=${endChapter}`
                    : `/latihan/sesi?start=${startChapter}&end=${endChapter}&module=${module}&count=${questionCount}`,
            )}
          >
            <Play size={16}/>
            {module === 'vocabulary'
              ? 'Buka Quiz Vocabulary'
              : module === 'kanji'
                ? 'Buka Quiz Kanji'
                : module === 'grammar'
                  ? 'Buka Quiz Tata Bahasa'
                  : 'Mulai Latihan'}
          </button>
        </div>
      </div>

      <p className="cross-practice-safety-note">
        Jawaban pada Quiz Latihan Lintas Bab memperbarui SRS, mastery, due date, akurasi, dan progress materi. Flashcard Lintas Bab tetap tidak mengubah progress karena tidak memiliki rating/jawaban.
      </p>
    </section>
  );
}
