import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';

export type VocabularyJenis = 'KB' | 'KK' | 'KS-i' | 'KS-na' | 'UNG';
export type VocabularyReviewRating = 0 | 1 | 2 | 3;

export type VocabularyExtra = {
  chapter_number?: number | string;
  chapter_title?: string;
  sort_order?: number | string;
  romaji?: string;
  category?: string;
  jenis?: VocabularyJenis;
  audio_source?: string;
};

export type VocabularyProgress = {
  item_id: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  due_at: string;
  last_rating: number | null;
  last_reviewed_at: string | null;
  correct_count: number;
  wrong_count: number;
  mastery_score: number;
};

export type VocabularyRecordReview = (
  itemId: string,
  rating: VocabularyReviewRating,
) => Promise<VocabularyProgress>;

export type VocabularyItem = {
  id: string;
  prompt: string;
  reading: string | null;
  meaning_id: string | null;
  extra: VocabularyExtra | null;
};

export type VocabularyWithProgress = VocabularyItem & {
  chapterNumber: number | null;
  chapterTitle: string;
  sortOrder: number;
  romaji: string;
  category: string | null;
  jenis: VocabularyJenis | null;
  progress: VocabularyProgress | null;
};

export type VocabularyChapter = {
  number: number;
  title: string;
  items: VocabularyWithProgress[];
  total: number;
  started: number;
  mastered: number;
  due: number;
  accuracy: number;
  averageMastery: number;
  status: 'not_started' | 'in_progress' | 'mastered';
};

type VocabularyChapterSummaryRow = {
  chapter_number: number;
  chapter_title: string;
  total: number;
  started: number;
  mastered: number;
  due: number;
  accuracy: number;
  average_mastery: number;
};

type VocabularyChapterItemRow = VocabularyItem & {
  progress_item_id: string | null;
  repetitions: number | null;
  interval_days: number | null;
  ease_factor: number | string | null;
  due_at: string | null;
  last_rating: number | null;
  last_reviewed_at: string | null;
  correct_count: number | null;
  wrong_count: number | null;
  mastery_score: number | null;
};

const PROGRESS_CLOCK_INTERVAL_MS = 60_000;

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

function vocabularyJenisValue(value: unknown): VocabularyJenis | null {
  return value === 'KB' || value === 'KK' || value === 'KS-i' || value === 'KS-na' || value === 'UNG'
    ? value
    : null;
}

function chapterStatus(total: number, started: number, mastered: number): VocabularyChapter['status'] {
  if (total > 0 && mastered === total) return 'mastered';
  if (started > 0) return 'in_progress';
  return 'not_started';
}

function progressFromRpcRow(row: VocabularyChapterItemRow): VocabularyProgress | null {
  if (!row.progress_item_id) return null;

  return {
    item_id: row.progress_item_id,
    repetitions: row.repetitions ?? 0,
    interval_days: row.interval_days ?? 0,
    ease_factor: Number(row.ease_factor ?? 2.5),
    due_at: row.due_at ?? '',
    last_rating: row.last_rating,
    last_reviewed_at: row.last_reviewed_at,
    correct_count: row.correct_count ?? 0,
    wrong_count: row.wrong_count ?? 0,
    mastery_score: row.mastery_score ?? 0,
  };
}

export function hasVocabularyReview(progress: VocabularyProgress | null | undefined) {
  if (!progress) return false;
  return Boolean(
    progress.last_reviewed_at
    || progress.repetitions > 0
    || progress.correct_count > 0
    || progress.wrong_count > 0
  );
}

export function isVocabularyDue(progress: VocabularyProgress | null | undefined, nowMs = Date.now()) {
  if (!hasVocabularyReview(progress) || !progress?.due_at) return false;
  const dueMs = new Date(progress.due_at).getTime();
  return Number.isFinite(dueMs) && dueMs <= nowMs;
}

export function useVocabulary() {
  const { user } = useAuth();
  const { chapterNumber: chapterParam } = useParams<{ chapterNumber?: string }>();
  const parsedChapter = chapterParam ? Number(chapterParam) : null;
  const requestedChapterNumber = parsedChapter !== null
    && Number.isInteger(parsedChapter)
    && parsedChapter > 0
    ? parsedChapter
    : null;

  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [summaryChapters, setSummaryChapters] = useState<VocabularyChapter[]>([]);
  const [progressByItem, setProgressByItem] = useState<Record<string, VocabularyProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressNowMs, setProgressNowMs] = useState(() => Date.now());
  const loadSequenceRef = useRef(0);

  const load = useCallback(async () => {
    const sequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = sequence;

    if (!user) {
      setItems([]);
      setSummaryChapters([]);
      setProgressByItem({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (requestedChapterNumber === null) {
        const { data, error: rpcError } = await supabase.rpc('get_vocabulary_chapter_summaries');
        if (rpcError) throw rpcError;
        if (loadSequenceRef.current !== sequence) return;

        const rows = (data ?? []) as VocabularyChapterSummaryRow[];
        setSummaryChapters(rows.map((row) => ({
          number: row.chapter_number,
          title: row.chapter_title || `Bab ${row.chapter_number}`,
          items: [],
          total: row.total,
          started: row.started,
          mastered: row.mastered,
          due: row.due,
          accuracy: row.accuracy,
          averageMastery: row.average_mastery,
          status: chapterStatus(row.total, row.started, row.mastered),
        })));
        setItems([]);
        setProgressByItem({});
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('get_vocabulary_chapter_items', {
        p_chapter_number: requestedChapterNumber,
      });
      if (rpcError) throw rpcError;
      if (loadSequenceRef.current !== sequence) return;

      const rows = (data ?? []) as VocabularyChapterItemRow[];
      const nextItems: VocabularyItem[] = [];
      const nextProgress: Record<string, VocabularyProgress> = {};

      for (const row of rows) {
        nextItems.push({
          id: row.id,
          prompt: row.prompt,
          reading: row.reading,
          meaning_id: row.meaning_id,
          extra: row.extra,
        });

        const progress = progressFromRpcRow(row);
        if (progress) nextProgress[progress.item_id] = progress;
      }

      setItems(nextItems);
      setProgressByItem(nextProgress);
      setSummaryChapters([]);
    } catch (loadError) {
      if (loadSequenceRef.current !== sequence) return;
      setItems([]);
      setSummaryChapters([]);
      setProgressByItem({});
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat data Kosakata.');
    } finally {
      if (loadSequenceRef.current === sequence) setLoading(false);
    }
  }, [requestedChapterNumber, user]);

  useEffect(() => {
    void load();
    return () => {
      loadSequenceRef.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setProgressNowMs(Date.now()), PROGRESS_CLOCK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const recordReview = useCallback<VocabularyRecordReview>(async (itemId, rating) => {
    const { data, error: rpcError } = await supabase.rpc('record_learning_review', {
      p_item_id: itemId,
      p_rating: rating,
    });

    if (rpcError) {
      const detail = [rpcError.message, rpcError.details, rpcError.hint].filter(Boolean).join(' — ');
      throw new Error(detail || 'Gagal menyimpan review Vocabulary.');
    }

    const row = (Array.isArray(data) ? data[0] : data) as VocabularyProgress | null;
    if (!row?.item_id) throw new Error('Supabase tidak mengembalikan progres Vocabulary yang tersimpan.');

    setProgressByItem((current) => ({ ...current, [row.item_id]: row }));
    setProgressNowMs(Date.now());
    return row;
  }, []);

  const combined = useMemo<VocabularyWithProgress[]>(() => items.map((item) => {
    const extra = item.extra ?? {};
    const chapterNumberRaw = numberValue(extra.chapter_number);
    const chapterNumber = chapterNumberRaw !== null && chapterNumberRaw > 0
      ? Math.trunc(chapterNumberRaw)
      : null;
    const sortOrder = Math.max(0, Math.trunc(numberValue(extra.sort_order, 9999) ?? 9999));
    const chapterTitle = textValue(extra.chapter_title) || (chapterNumber ? `Bab ${chapterNumber}` : 'Tanpa Bab');

    return {
      ...item,
      chapterNumber,
      chapterTitle,
      sortOrder,
      romaji: textValue(extra.romaji),
      category: textValue(extra.category) || null,
      jenis: vocabularyJenisValue(extra.jenis),
      progress: progressByItem[item.id] ?? null,
    };
  }), [items, progressByItem]);

  const detailChapters = useMemo<VocabularyChapter[]>(() => {
    const grouped = new Map<number, VocabularyWithProgress[]>();

    for (const item of combined) {
      if (item.chapterNumber === null) continue;
      const current = grouped.get(item.chapterNumber) ?? [];
      current.push(item);
      grouped.set(item.chapterNumber, current);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([number, chapterItems]) => {
        const sortedItems = [...chapterItems].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.prompt.localeCompare(b.prompt, 'ja'),
        );
        const total = sortedItems.length;
        const started = sortedItems.filter((item) => hasVocabularyReview(item.progress)).length;
        const mastered = sortedItems.filter((item) => (item.progress?.mastery_score ?? 0) >= 80).length;
        const masterySum = sortedItems.reduce((sum, item) => sum + (item.progress?.mastery_score ?? 0), 0);
        const attempts = sortedItems.reduce(
          (sum, item) => sum + (item.progress?.correct_count ?? 0) + (item.progress?.wrong_count ?? 0),
          0,
        );
        const correct = sortedItems.reduce((sum, item) => sum + (item.progress?.correct_count ?? 0), 0);
        const due = sortedItems.filter((item) => isVocabularyDue(item.progress, progressNowMs)).length;
        const averageMastery = total ? Math.round(masterySum / total) : 0;
        const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;

        return {
          number,
          title: sortedItems.find((item) => item.chapterTitle)?.chapterTitle ?? `Bab ${number}`,
          items: sortedItems,
          total,
          started,
          mastered,
          due,
          accuracy,
          averageMastery,
          status: chapterStatus(total, started, mastered),
        };
      });
  }, [combined, progressNowMs]);

  const chapters = requestedChapterNumber === null ? summaryChapters : detailChapters;

  return {
    chapters,
    loading,
    error,
    // Live Vocabulary is fully categorized (2089/2089). Future CMS validation will enforce this.
    uncategorizedCount: 0,
    reload: load,
    recordReview,
  };
}
