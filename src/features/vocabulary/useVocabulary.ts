import { useCallback, useEffect, useMemo, useState } from 'react';
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

const ITEM_PAGE_SIZE = 1000;
const PROGRESS_CHUNK_SIZE = 150;
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

async function loadAllVocabularyItems() {
  const rows: VocabularyItem[] = [];

  for (let from = 0; ; from += ITEM_PAGE_SIZE) {
    const result = await supabase
      .from('learning_items')
      .select('id,prompt,reading,meaning_id,extra')
      .eq('item_type', 'vocabulary')
      .eq('is_published', true)
      .order('id', { ascending: true })
      .range(from, from + ITEM_PAGE_SIZE - 1);

    if (result.error) throw result.error;
    const page = (result.data ?? []) as VocabularyItem[];
    rows.push(...page);
    if (page.length < ITEM_PAGE_SIZE) break;
  }

  return rows;
}

async function loadVocabularyProgress(userId: string, itemIds: string[]) {
  const rows: VocabularyProgress[] = [];

  for (let index = 0; index < itemIds.length; index += PROGRESS_CHUNK_SIZE) {
    const ids = itemIds.slice(index, index + PROGRESS_CHUNK_SIZE);
    const result = await supabase
      .from('review_progress')
      .select('item_id,repetitions,interval_days,ease_factor,due_at,last_rating,last_reviewed_at,correct_count,wrong_count,mastery_score')
      .eq('user_id', userId)
      .in('item_id', ids);

    if (result.error) throw result.error;
    rows.push(...((result.data ?? []) as VocabularyProgress[]));
  }

  return rows;
}

export function useVocabulary() {
  const { user } = useAuth();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [progressByItem, setProgressByItem] = useState<Record<string, VocabularyProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressNowMs, setProgressNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setProgressByItem({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const vocabularyItems = await loadAllVocabularyItems();
      setItems(vocabularyItems);

      if (!vocabularyItems.length) {
        setProgressByItem({});
        setLoading(false);
        return;
      }

      const progressRows = await loadVocabularyProgress(user.id, vocabularyItems.map((item) => item.id));
      const nextProgress: Record<string, VocabularyProgress> = {};
      for (const row of progressRows) nextProgress[row.item_id] = row;
      setProgressByItem(nextProgress);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat data Kosakata.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
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

  const chapters = useMemo<VocabularyChapter[]>(() => {
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
        const sortedItems = [...chapterItems].sort((a, b) => a.sortOrder - b.sortOrder || a.prompt.localeCompare(b.prompt, 'ja'));
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
        const status: VocabularyChapter['status'] = total > 0 && mastered === total
          ? 'mastered'
          : started > 0
            ? 'in_progress'
            : 'not_started';

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
          status,
        };
      });
  }, [combined, progressNowMs]);

  const uncategorizedCount = useMemo(
    () => combined.filter((item) => item.chapterNumber === null).length,
    [combined],
  );

  return {
    chapters,
    loading,
    error,
    uncategorizedCount,
    reload: load,
    recordReview,
  };
}
