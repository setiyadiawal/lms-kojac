import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import { GRAMMAR_PATTERNS, type GrammarPattern } from './grammarData';

export type GrammarReviewRating = 0 | 1 | 2 | 3;

export type GrammarProgress = {
  item_id: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  due_at: string;
  last_rating: GrammarReviewRating | null;
  last_reviewed_at: string | null;
  correct_count: number;
  wrong_count: number;
  mastery_score: number;
};

type GrammarLearningItemRow = {
  id: string;
  prompt: string;
  meaning_id: string | null;
  jlpt_level: string | null;
  extra: Record<string, unknown> | null;
};

export type GrammarProgressItem = {
  pattern: GrammarPattern;
  itemId: string | null;
  progress: GrammarProgress | null;
};

export type GrammarProgressStats = {
  total: number;
  started: number;
  mastered: number;
  due: number;
  accuracy: number;
  averageMastery: number;
};

export type GrammarChapterProgress = GrammarProgressStats & {
  chapter: number;
};

const PROGRESS_CHUNK_SIZE = 100;
const PROGRESS_CLOCK_INTERVAL_MS = 60_000;

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function hasGrammarReview(progress: GrammarProgress | null | undefined) {
  if (!progress) return false;
  return Boolean(
    progress.last_reviewed_at
    || progress.repetitions > 0
    || progress.correct_count > 0
    || progress.wrong_count > 0
  );
}

export function isGrammarDue(progress: GrammarProgress | null | undefined, nowMs = Date.now()) {
  if (!hasGrammarReview(progress) || !progress?.due_at) return false;
  const dueMs = new Date(progress.due_at).getTime();
  return Number.isFinite(dueMs) && dueMs <= nowMs;
}

export function grammarMasteryLabel(progress: GrammarProgress | null | undefined, nowMs = Date.now()) {
  if (!hasGrammarReview(progress)) return 'Belum Dipelajari';
  if (isGrammarDue(progress, nowMs)) return 'Perlu Review';
  const mastery = progress?.mastery_score ?? 0;
  if (mastery >= 80) return 'Dikuasai';
  if (mastery >= 40) return 'Berkembang';
  return 'Tahap Awal';
}

function computeStats(items: GrammarProgressItem[], nowMs: number): GrammarProgressStats {
  const total = items.length;
  const started = items.filter((item) => hasGrammarReview(item.progress)).length;
  const mastered = items.filter((item) => (item.progress?.mastery_score ?? 0) >= 80).length;
  const due = items.filter((item) => isGrammarDue(item.progress, nowMs)).length;
  const correct = items.reduce((sum, item) => sum + (item.progress?.correct_count ?? 0), 0);
  const attempts = items.reduce(
    (sum, item) => sum + (item.progress?.correct_count ?? 0) + (item.progress?.wrong_count ?? 0),
    0,
  );
  const masterySum = items.reduce((sum, item) => sum + (item.progress?.mastery_score ?? 0), 0);

  return {
    total,
    started,
    mastered,
    due,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    averageMastery: total ? Math.round(masterySum / total) : 0,
  };
}

async function loadProgress(userId: string, itemIds: string[]) {
  const rows: GrammarProgress[] = [];

  for (let index = 0; index < itemIds.length; index += PROGRESS_CHUNK_SIZE) {
    const ids = itemIds.slice(index, index + PROGRESS_CHUNK_SIZE);
    if (!ids.length) continue;
    const result = await supabase
      .from('review_progress')
      .select('item_id,repetitions,interval_days,ease_factor,due_at,last_rating,last_reviewed_at,correct_count,wrong_count,mastery_score')
      .eq('user_id', userId)
      .in('item_id', ids);

    if (result.error) throw result.error;
    rows.push(...((result.data ?? []) as GrammarProgress[]));
  }

  return rows;
}

export function useGrammarProgress() {
  const { user } = useAuth();
  const [itemIdByPattern, setItemIdByPattern] = useState<Record<string, string>>({});
  const [progressByItem, setProgressByItem] = useState<Record<string, GrammarProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressNowMs, setProgressNowMs] = useState(() => Date.now());
  const loadSequenceRef = useRef(0);

  const load = useCallback(async () => {
    const sequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = sequence;
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        setItemIdByPattern({});
        setProgressByItem({});
        return;
      }

      const itemResult = await supabase
        .from('learning_items')
        .select('id,prompt,meaning_id,jlpt_level,extra')
        .eq('item_type', 'grammar')
        .eq('is_published', true);

      if (itemResult.error) throw itemResult.error;
      if (loadSequenceRef.current !== sequence) return;

      const rows = (itemResult.data ?? []) as GrammarLearningItemRow[];
      const knownPatternIds = new Set(GRAMMAR_PATTERNS.map((pattern) => pattern.id));
      const nextItemIdByPattern: Record<string, string> = {};

      for (const row of rows) {
        const patternId = textValue(row.extra?.pattern_id);
        if (patternId && knownPatternIds.has(patternId)) nextItemIdByPattern[patternId] = row.id;
      }

      setItemIdByPattern(nextItemIdByPattern);
      const itemIds = Object.values(nextItemIdByPattern);
      if (!itemIds.length) {
        setProgressByItem({});
        setError('Mapping progress Grammar belum tersedia. Jalankan migration Grammar SRS terlebih dahulu.');
        return;
      }

      const progressRows = await loadProgress(user.id, itemIds);
      if (loadSequenceRef.current !== sequence) return;

      const nextProgress: Record<string, GrammarProgress> = {};
      for (const progress of progressRows) nextProgress[progress.item_id] = progress;
      setProgressByItem(nextProgress);

      if (itemIds.length !== GRAMMAR_PATTERNS.length) {
        setError(`Mapping progress Grammar belum lengkap (${itemIds.length}/${GRAMMAR_PATTERNS.length} pola).`);
      }
    } catch (loadError) {
      if (loadSequenceRef.current !== sequence) return;
      setItemIdByPattern({});
      setProgressByItem({});
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat progress Grammar.');
    } finally {
      if (loadSequenceRef.current === sequence) setLoading(false);
    }
  }, [user]);

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

  const items = useMemo<GrammarProgressItem[]>(() => GRAMMAR_PATTERNS.map((pattern) => {
    const itemId = itemIdByPattern[pattern.id] ?? null;
    return {
      pattern,
      itemId,
      progress: itemId ? (progressByItem[itemId] ?? null) : null,
    };
  }), [itemIdByPattern, progressByItem]);

  const itemByPatternId = useMemo(
    () => new Map(items.map((item) => [item.pattern.id, item])),
    [items],
  );

  const stats = useMemo(() => computeStats(items, progressNowMs), [items, progressNowMs]);

  const chapterStats = useMemo(() => {
    const map = new Map<number, GrammarChapterProgress>();
    const chapters = new Set(GRAMMAR_PATTERNS.map((pattern) => pattern.chapter));
    for (const chapter of chapters) {
      const chapterItems = items.filter((item) => item.pattern.chapter === chapter);
      map.set(chapter, { chapter, ...computeStats(chapterItems, progressNowMs) });
    }
    return map;
  }, [items, progressNowMs]);

  const dueItems = useMemo(
    () => items
      .filter((item) => item.itemId && isGrammarDue(item.progress, progressNowMs))
      .slice()
      .sort((a, b) => {
        const aDue = a.progress?.due_at ? new Date(a.progress.due_at).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.progress?.due_at ? new Date(b.progress.due_at).getTime() : Number.POSITIVE_INFINITY;
        return aDue - bDue || (a.progress?.mastery_score ?? 0) - (b.progress?.mastery_score ?? 0);
      }),
    [items, progressNowMs],
  );

  const recordReview = useCallback(async (patternId: string, rating: GrammarReviewRating) => {
    const itemId = itemIdByPattern[patternId];
    if (!itemId) throw new Error(`Learning item Grammar untuk pola ${patternId} belum tersedia.`);

    const { data, error: rpcError } = await supabase.rpc('record_learning_review', {
      p_item_id: itemId,
      p_rating: rating,
    });

    if (rpcError) {
      const detail = [rpcError.message, rpcError.details, rpcError.hint].filter(Boolean).join(' — ');
      throw new Error(detail || 'Gagal menyimpan progress Grammar.');
    }

    const row = (Array.isArray(data) ? data[0] : data) as GrammarProgress | null;
    if (!row?.item_id) throw new Error('Supabase tidak mengembalikan progress Grammar yang tersimpan.');

    setProgressByItem((current) => ({ ...current, [row.item_id]: row }));
    setProgressNowMs(Date.now());
    return row;
  }, [itemIdByPattern]);

  return {
    items,
    itemByPatternId,
    stats,
    chapterStats,
    dueItems,
    mappedCount: Object.keys(itemIdByPattern).length,
    mappingReady: Object.keys(itemIdByPattern).length === GRAMMAR_PATTERNS.length,
    progressNowMs,
    loading,
    error,
    reload: load,
    recordReview,
  };
}
