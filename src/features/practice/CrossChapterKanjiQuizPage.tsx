import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { KanjiQuiz } from '../kanji/KanjiQuiz';
import type {
  KanjiExample,
  KanjiItem,
  KanjiLevel,
  KanjiProgress,
  KanjiRecordReview,
  KanjiSentence,
} from '../kanji/useKanji';
import './cross-chapter-quiz-page.css';

type VocabularyRow = {
  prompt: string;
  extra: Record<string, unknown> | null;
};

type KanjiRow = {
  id: string;
  prompt: string;
  meaning_id: string | null;
  jlpt_level: string | null;
  extra: Record<string, unknown> | null;
};

const MAX_CHAPTER = 35;
const PAGE_SIZE = 1000;

function routeChapter(value: string | null, fallback: number) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return fallback;
  return Math.max(1, Math.min(MAX_CHAPTER, numeric));
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(textValue).filter(Boolean);
}

function isKanjiLevel(value: string): value is KanjiLevel {
  return value === 'N5' || value === 'N4' || value === 'N3' || value === 'N2' || value === 'N1';
}

function examplesArray(value: unknown): KanjiExample[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const word = textValue(row.word);
    const reading = textValue(row.reading);
    const romaji = textValue(row.romaji);
    const meaning = textValue(row.meaning_id);
    if (!word || !reading || !meaning) return [];
    return [{ word, reading, romaji, meaning_id: meaning }];
  });
}

function sentencesArray(value: unknown): KanjiSentence[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const japanese = textValue(row.japanese);
    const reading = textValue(row.reading);
    const meaning = textValue(row.meaning);
    if (!japanese || !reading || !meaning) return [];
    return [{ japanese, reading, meaning }];
  });
}

async function loadPaged<T>(
  build: (offset: number) => PromiseLike<{ data: unknown; error: unknown }>,
) {
  const rows: T[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await build(offset);
    if (result.error) throw result.error;

    const page = (result.data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

const recordCrossKanjiReview: KanjiRecordReview = async (itemId, rating) => {
  const { data, error } = await supabase.rpc('record_learning_review', {
    p_item_id: itemId,
    p_rating: rating,
  });

  if (error) {
    const detail = [error.message, error.details, error.hint].filter(Boolean).join(' — ');
    throw new Error(detail || 'Gagal menyimpan progress Kanji.');
  }

  const row = (Array.isArray(data) ? data[0] : data) as KanjiProgress | null;
  if (!row?.item_id) {
    throw new Error('Supabase tidak mengembalikan progress Kanji yang tersimpan.');
  }

  return row;
};

export function CrossChapterKanjiQuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const startChapter = routeChapter(searchParams.get('start'), 1);
  const rawEnd = routeChapter(searchParams.get('end'), startChapter);
  const endChapter = Math.max(startChapter, rawEnd);

  const [vocabulary, setVocabulary] = useState<VocabularyRow[]>([]);
  const [kanjiRows, setKanjiRows] = useState<KanjiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [nextVocabulary, nextKanji] = await Promise.all([
          loadPaged<VocabularyRow>((offset) => supabase
            .from('learning_items')
            .select('prompt,extra')
            .eq('item_type', 'vocabulary')
            .eq('is_published', true)
            .order('id')
            .range(offset, offset + PAGE_SIZE - 1)),
          loadPaged<KanjiRow>((offset) => supabase
            .from('learning_items')
            .select('id,prompt,meaning_id,jlpt_level,extra')
            .eq('item_type', 'kanji')
            .eq('is_published', true)
            .order('id')
            .range(offset, offset + PAGE_SIZE - 1)),
        ]);

        if (cancelled) return;
        setVocabulary(nextVocabulary);
        setKanjiRows(nextKanji);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Gagal memuat Kanji lintas bab.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo<KanjiItem[]>(() => {
    const selectedVocabulary = vocabulary.filter((row) => {
      const chapter = Number(row.extra?.chapter_number);
      return Number.isInteger(chapter)
        && chapter >= startChapter
        && chapter <= endChapter;
    });

    const matched = kanjiRows.filter((row) => {
      const symbol = row.prompt.trim();
      return Boolean(symbol)
        && selectedVocabulary.some((word) => word.prompt.includes(symbol));
    });

    return matched.map((row, index) => {
      const extra = row.extra ?? {};
      const levelRaw = textValue(row.jlpt_level).toUpperCase();
      const level: KanjiLevel = isKanjiLevel(levelRaw) ? levelRaw : 'N5';

      return {
        id: row.id,
        prompt: row.prompt,
        meaning_id: row.meaning_id,
        jlpt_level: row.jlpt_level,
        extra,
        level,
        meaning: textValue(row.meaning_id) || '—',
        sortOrder: positiveInteger(extra.sort_order, index + 1),
        category: textValue(extra.category) || 'Lainnya',
        onyomi: stringArray(extra.onyomi),
        kunyomi: stringArray(extra.kunyomi),
        strokeCount: positiveInteger(extra.stroke_count, 0),
        examples: examplesArray(extra.examples),
        sentences: sentencesArray(extra.sentences),
        relatedKanji: [],
        mnemonic: null,
        progress: null,
      };
    }).sort((a, b) => (
      a.sortOrder - b.sortOrder
      || a.prompt.localeCompare(b.prompt, 'ja')
    ));
  }, [endChapter, kanjiRows, startChapter, vocabulary]);

  return (
    <div className="cross-reuse-page">
      <div className="cross-route-toolbar">
        <button
          type="button"
          className="cross-reuse-back"
          onClick={() => navigate('/latihan')}
        >
          <ArrowLeft size={17}/> Kembali ke Latihan
        </button>

        <div className="cross-route-context">
          <span>LATIHAN LINTAS BAB · KANJI</span>
          <strong>Bab {startChapter}–{endChapter}</strong>
        </div>

        {!loading && !error && (
          <span className="cross-route-count">{items.length} Kanji</span>
        )}
      </div>

      {loading && (
        <div className="cross-reuse-state">
          <strong>Memuat Kanji lintas bab…</strong>
          <span>Menyiapkan Bab {startChapter}–{endChapter}.</span>
        </div>
      )}

      {!loading && error && (
        <div className="cross-reuse-state error" role="alert">
          <strong>Kanji belum dapat dimuat.</strong>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <KanjiQuiz
          items={items}
          level="N5"
          onRecordReview={recordCrossKanjiReview}
          persistProgress
          setupTitle={`Quiz Kanji · Bab ${startChapter}–${endChapter}`}
          setupDescription={`Pilih tipe latihan dan jumlah soal. Semua soal memakai Kanji yang relevan dengan Vocabulary Bab ${startChapter}–${endChapter}.`}
          availabilityLabel={`${items.length} Kanji relevan tersedia pada rentang ini.`}
        />
      )}

      <p className="cross-reuse-safety">
        Jawaban Quiz Lintas Bab memperbarui mastery, SRS, due date, akurasi,
        dan progress Kanji melalui sistem review yang sama dengan Quiz di menu Belajar.
      </p>
    </div>
  );
}
