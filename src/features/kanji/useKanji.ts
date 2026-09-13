import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';

export type KanjiLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type KanjiRelationType = 'same_radical' | 'similar_shape' | 'shared_component' | 'concept_related';
export type KanjiReviewRating = 0 | 1 | 2 | 3;

export type KanjiExample = {
  word: string;
  reading: string;
  romaji: string;
  meaning_id: string;
};

export type KanjiSentence = {
  japanese: string;
  reading: string;
  meaning: string;
};

export type KanjiRelated = {
  kanji: string;
  relation: KanjiRelationType;
  note: string;
  meaning?: string;
  level?: KanjiLevel;
};

export type KanjiMnemonicComponent = {
  symbol: string;
  meaning: string;
};

export type KanjiMnemonic = {
  components: KanjiMnemonicComponent[];
  tip: string;
  kind?: 'learning_mnemonic';
};

export type KanjiExtra = {
  sort_order?: number | string;
  category?: string;
  onyomi?: unknown;
  kunyomi?: unknown;
  stroke_count?: number | string;
  examples?: unknown;
  sentences?: unknown;
  related_kanji?: unknown;
  mnemonic?: unknown;
  sentence_dataset?: string;
  learning_aids_dataset?: string;
  curriculum?: string;
  dataset?: string;
};

type KanjiRow = {
  id: string;
  prompt: string;
  meaning_id: string | null;
  jlpt_level: string | null;
  extra: KanjiExtra | null;
};

export type KanjiProgress = {
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

export type KanjiRecordReview = (
  itemId: string,
  rating: KanjiReviewRating,
) => Promise<KanjiProgress>;

export type KanjiItem = KanjiRow & {
  level: KanjiLevel;
  meaning: string;
  sortOrder: number;
  category: string;
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
  examples: KanjiExample[];
  sentences: KanjiSentence[];
  relatedKanji: KanjiRelated[];
  mnemonic: KanjiMnemonic | null;
  progress: KanjiProgress | null;
};

export type KanjiLevelStats = {
  total: number;
  started: number;
  mastered: number;
  due: number;
  accuracy: number;
  averageMastery: number;
};

const PROGRESS_CHUNK_SIZE = 150;
const PROGRESS_CLOCK_INTERVAL_MS = 60_000;

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

function isRelationType(value: string): value is KanjiRelationType {
  return value === 'same_radical' || value === 'similar_shape' || value === 'shared_component' || value === 'concept_related';
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

function relatedArray(value: unknown): KanjiRelated[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const kanji = textValue(row.kanji);
    const relation = textValue(row.relation);
    const note = textValue(row.note);
    const meaning = textValue(row.meaning);
    const level = textValue(row.level).toUpperCase();

    if (!kanji || !note || !isRelationType(relation)) return [];
    return [{
      kanji,
      relation,
      note,
      ...(meaning ? { meaning } : {}),
      ...(isKanjiLevel(level) ? { level } : {}),
    }];
  });
}

function mnemonicValue(value: unknown): KanjiMnemonic | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const tip = textValue(row.tip);
  if (!tip) return null;

  const components = Array.isArray(row.components) ? row.components.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const component = entry as Record<string, unknown>;
    const symbol = textValue(component.symbol);
    const meaning = textValue(component.meaning);
    return symbol && meaning ? [{ symbol, meaning }] : [];
  }) : [];

  return {
    components,
    tip,
    kind: 'learning_mnemonic',
  };
}

export function hasKanjiReview(progress: KanjiProgress | null | undefined) {
  if (!progress) return false;
  return Boolean(
    progress.last_reviewed_at
    || progress.repetitions > 0
    || progress.correct_count > 0
    || progress.wrong_count > 0
  );
}

export function isKanjiDue(progress: KanjiProgress | null | undefined, nowMs = Date.now()) {
  if (!hasKanjiReview(progress) || !progress?.due_at) return false;
  const dueMs = new Date(progress.due_at).getTime();
  return Number.isFinite(dueMs) && dueMs <= nowMs;
}

async function loadKanjiProgress(userId: string, itemIds: string[]) {
  const rows: KanjiProgress[] = [];

  for (let index = 0; index < itemIds.length; index += PROGRESS_CHUNK_SIZE) {
    const ids = itemIds.slice(index, index + PROGRESS_CHUNK_SIZE);
    if (!ids.length) continue;

    const result = await supabase
      .from('review_progress')
      .select('item_id,repetitions,interval_days,ease_factor,due_at,last_rating,last_reviewed_at,correct_count,wrong_count,mastery_score')
      .eq('user_id', userId)
      .in('item_id', ids);

    if (result.error) throw result.error;
    rows.push(...((result.data ?? []) as KanjiProgress[]));
  }

  return rows;
}

export function useKanji(level: KanjiLevel) {
  const { user } = useAuth();
  const [rows, setRows] = useState<KanjiRow[]>([]);
  const [progressByItem, setProgressByItem] = useState<Record<string, KanjiProgress>>({});
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
      const result = await supabase
        .from('learning_items')
        .select('id,prompt,meaning_id,jlpt_level,extra')
        .eq('item_type', 'kanji')
        .eq('jlpt_level', level)
        .eq('is_published', true)
        .order('prompt', { ascending: true });

      if (result.error) throw result.error;
      if (loadSequenceRef.current !== sequence) return;

      const nextRows = (result.data ?? []) as KanjiRow[];
      setRows(nextRows);

      if (!user || nextRows.length === 0) {
        setProgressByItem({});
        return;
      }

      const progressRows = await loadKanjiProgress(user.id, nextRows.map((row) => row.id));
      if (loadSequenceRef.current !== sequence) return;

      const nextProgress: Record<string, KanjiProgress> = {};
      for (const progress of progressRows) nextProgress[progress.item_id] = progress;
      setProgressByItem(nextProgress);
    } catch (loadError) {
      if (loadSequenceRef.current !== sequence) return;
      setRows([]);
      setProgressByItem({});
      setError(loadError instanceof Error ? loadError.message : `Gagal memuat Kanji ${level}.`);
    } finally {
      if (loadSequenceRef.current === sequence) setLoading(false);
    }
  }, [level, user]);

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

  const recordReview = useCallback<KanjiRecordReview>(async (itemId, rating) => {
    const { data, error: rpcError } = await supabase.rpc('record_learning_review', {
      p_item_id: itemId,
      p_rating: rating,
    });

    if (rpcError) {
      const detail = [rpcError.message, rpcError.details, rpcError.hint].filter(Boolean).join(' — ');
      throw new Error(detail || 'Gagal menyimpan review Kanji.');
    }

    const row = (Array.isArray(data) ? data[0] : data) as KanjiProgress | null;
    if (!row?.item_id) throw new Error('Supabase tidak mengembalikan progress Kanji yang tersimpan.');

    setProgressByItem((current) => ({ ...current, [row.item_id]: row }));
    setProgressNowMs(Date.now());
    return row;
  }, []);

  const items = useMemo<KanjiItem[]>(() => rows.map((row, index) => {
    const extra = row.extra ?? {};
    return {
      ...row,
      level,
      meaning: textValue(row.meaning_id) || '—',
      sortOrder: positiveInteger(extra.sort_order, index + 1),
      category: textValue(extra.category) || 'Lainnya',
      onyomi: stringArray(extra.onyomi),
      kunyomi: stringArray(extra.kunyomi),
      strokeCount: positiveInteger(extra.stroke_count, 0),
      examples: examplesArray(extra.examples),
      sentences: sentencesArray(extra.sentences),
      relatedKanji: relatedArray(extra.related_kanji),
      mnemonic: mnemonicValue(extra.mnemonic),
      progress: progressByItem[row.id] ?? null,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.prompt.localeCompare(b.prompt, 'ja')), [rows, level, progressByItem]);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))), [items]);

  const stats = useMemo<KanjiLevelStats>(() => {
    const total = items.length;
    const started = items.filter((item) => hasKanjiReview(item.progress)).length;
    const mastered = items.filter((item) => (item.progress?.mastery_score ?? 0) >= 80).length;
    const due = items.filter((item) => isKanjiDue(item.progress, progressNowMs)).length;
    const masterySum = items.reduce((sum, item) => sum + (item.progress?.mastery_score ?? 0), 0);
    const correct = items.reduce((sum, item) => sum + (item.progress?.correct_count ?? 0), 0);
    const attempts = items.reduce(
      (sum, item) => sum + (item.progress?.correct_count ?? 0) + (item.progress?.wrong_count ?? 0),
      0,
    );

    return {
      total,
      started,
      mastered,
      due,
      accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
      averageMastery: total ? Math.round(masterySum / total) : 0,
    };
  }, [items, progressNowMs]);

  return {
    items,
    categories,
    stats,
    progressNowMs,
    loading,
    error,
    reload: load,
    recordReview,
  };
}
