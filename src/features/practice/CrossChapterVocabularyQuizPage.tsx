import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { VocabularyQuiz } from '../vocabulary/VocabularyQuiz';
import type {
  VocabularyJenis,
  VocabularyRecordReview,
  VocabularyWithProgress,
} from '../vocabulary/useVocabulary';
import './cross-chapter-vocabulary-quiz.css';

type VocabularyRow = {
  id: string;
  prompt: string;
  reading: string | null;
  meaning_id: string | null;
  extra: Record<string, unknown> | null;
};

const MAX_CHAPTER = 35;
const PAGE_SIZE = 1000;

function routeChapter(value: string | null, fallback: number) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return fallback;
  return Math.max(1, Math.min(MAX_CHAPTER, numeric));
}

function numberValue(value: unknown, fallback: number | null = null) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function jenisValue(value: unknown): VocabularyJenis | null {
  return value === 'KB'
    || value === 'KK'
    || value === 'KS-i'
    || value === 'KS-na'
    || value === 'UNG'
    ? value
    : null;
}

async function loadPublishedVocabulary() {
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

const noProgressReview: VocabularyRecordReview = async (itemId) => ({
  item_id: itemId,
  repetitions: 0,
  interval_days: 0,
  ease_factor: 2.5,
  due_at: '',
  last_rating: null,
  last_reviewed_at: null,
  correct_count: 0,
  wrong_count: 0,
  mastery_score: 0,
});

export function CrossChapterVocabularyQuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const startChapter = routeChapter(searchParams.get('start'), 1);
  const rawEndChapter = routeChapter(searchParams.get('end'), startChapter);
  const endChapter = Math.max(startChapter, rawEndChapter);

  const [rows, setRows] = useState<VocabularyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await loadPublishedVocabulary();
        if (cancelled) return;
        setRows(data);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Gagal memuat Vocabulary lintas bab.',
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

  const items = useMemo<VocabularyWithProgress[]>(() => {
    const result: VocabularyWithProgress[] = [];

    for (const row of rows) {
      const extra = row.extra ?? {};
      const chapterNumberRaw = numberValue(extra.chapter_number);
      const chapterNumber = chapterNumberRaw !== null
        ? Math.trunc(chapterNumberRaw)
        : null;

      if (
        chapterNumber === null
        || chapterNumber < startChapter
        || chapterNumber > endChapter
      ) {
        continue;
      }

      result.push({
        id: row.id,
        prompt: row.prompt,
        reading: row.reading,
        meaning_id: row.meaning_id,
        extra: {
          chapter_number: chapterNumber,
          chapter_title: textValue(extra.chapter_title) || `Bab ${chapterNumber}`,
          sort_order: numberValue(extra.sort_order, 9999) ?? 9999,
          romaji: textValue(extra.romaji),
          category: textValue(extra.category),
          jenis: jenisValue(extra.jenis) ?? undefined,
          audio_source: textValue(extra.audio_source),
        },
        chapterNumber,
        chapterTitle: textValue(extra.chapter_title) || `Bab ${chapterNumber}`,
        sortOrder: Math.max(
          0,
          Math.trunc(numberValue(extra.sort_order, 9999) ?? 9999),
        ),
        romaji: textValue(extra.romaji),
        category: textValue(extra.category) || null,
        jenis: jenisValue(extra.jenis),
        progress: null,
      });
    }

    return result.sort((a, b) => (
      (a.chapterNumber ?? 999) - (b.chapterNumber ?? 999)
      || a.sortOrder - b.sortOrder
      || a.prompt.localeCompare(b.prompt, 'ja')
    ));
  }, [endChapter, rows, startChapter]);

  return (
    <div className="cross-vocab-page">
      <div className="cross-route-toolbar">
        <button
          type="button"
          className="cross-vocab-back"
          onClick={() => navigate('/latihan')}
        >
          <ArrowLeft size={17}/> Kembali ke Latihan
        </button>

        <div className="cross-route-context">
          <span>LATIHAN LINTAS BAB · KOSAKATA</span>
          <strong>Bab {startChapter}–{endChapter}</strong>
        </div>

        {!loading && !error && (
          <span className="cross-route-count">{items.length} kosakata</span>
        )}
      </div>

      {loading && (
        <div className="cross-vocab-state">
          <strong>Memuat Vocabulary lintas bab…</strong>
          <span>Menyiapkan Bab {startChapter}–{endChapter}.</span>
        </div>
      )}

      {!loading && error && (
        <div className="cross-vocab-state error" role="alert">
          <strong>Vocabulary belum dapat dimuat.</strong>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <VocabularyQuiz
          items={items}
          onRecordReview={noProgressReview}
          persistProgress={false}
          setupTitle={`Quiz Vocabulary · Bab ${startChapter}–${endChapter}`}
          setupDescription={`Pilih tipe latihan dan jumlah soal. Semua soal menggunakan gabungan kosakata Bab ${startChapter}–${endChapter}.`}
          emptyDescription={`Tidak ada kosakata published pada Bab ${startChapter}–${endChapter}.`}
        />
      )}

      <p className="cross-vocab-safety">
        Sesi lintas bab bersifat latihan independen dan tidak mengubah SRS,
        mastery, due date, atau progress formal.
      </p>
    </div>
  );
}
