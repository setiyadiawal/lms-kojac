import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  speakJapanese,
  type HiraganaItem,
  type HiraganaProgress,
  type HiraganaVariant,
} from '../hiragana/useHiragana';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';

export type KatakanaVariant = HiraganaVariant;
export type KatakanaItem = HiraganaItem;
export type KatakanaProgress = HiraganaProgress;
export type KatakanaWithProgress = KatakanaItem & {
  progress: KatakanaProgress | null;
};

export { speakJapanese };

export function useKatakana() {
  const { user } = useAuth();
  const [items, setItems] = useState<KatakanaItem[]>([]);
  const [progressByItem, setProgressByItem] = useState<Record<string, KatakanaProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setProgressByItem({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const itemResult = await supabase
      .from('learning_items')
      .select('id,prompt,reading,extra')
      .eq('item_type', 'katakana')
      .eq('is_published', true);

    if (itemResult.error) {
      setError(itemResult.error.message);
      setLoading(false);
      return;
    }

    const normalized = ((itemResult.data ?? []) as KatakanaItem[])
      .filter((item) => Boolean(item.reading))
      .sort((a, b) => (a.extra?.sort_order ?? 9999) - (b.extra?.sort_order ?? 9999));

    setItems(normalized);

    if (normalized.length === 0) {
      setProgressByItem({});
      setLoading(false);
      return;
    }

    const progressResult = await supabase
      .from('review_progress')
      .select('item_id,repetitions,interval_days,ease_factor,due_at,last_rating,last_reviewed_at,correct_count,wrong_count,mastery_score')
      .eq('user_id', user.id)
      .in('item_id', normalized.map((item) => item.id));

    if (progressResult.error) {
      setError(progressResult.error.message);
      setLoading(false);
      return;
    }

    const nextMap: Record<string, KatakanaProgress> = {};
    for (const row of (progressResult.data ?? []) as KatakanaProgress[]) nextMap[row.item_id] = row;
    setProgressByItem(nextMap);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const recordReview = useCallback(async (itemId: string, rating: 0 | 1 | 2 | 3) => {
    const { data, error: rpcError } = await supabase.rpc('record_learning_review', {
      p_item_id: itemId,
      p_rating: rating,
    });

    if (rpcError) {
      const detail = [rpcError.message, rpcError.details, rpcError.hint].filter(Boolean).join(' — ');
      throw new Error(detail || 'Gagal menyimpan review Katakana.');
    }

    const row = (Array.isArray(data) ? data[0] : data) as KatakanaProgress | null;
    if (!row?.item_id) throw new Error('Supabase tidak mengembalikan progres review yang tersimpan.');
    setProgressByItem((current) => ({ ...current, [row.item_id]: row }));
    return row;
  }, []);

  const combined = useMemo<KatakanaWithProgress[]>(() => items.map((item) => ({
    ...item,
    progress: progressByItem[item.id] ?? null,
  })), [items, progressByItem]);

  const stats = useMemo(() => {
    const total = combined.length;
    const started = combined.filter((item) => item.progress && (item.progress.correct_count + item.progress.wrong_count > 0)).length;
    const mastered = combined.filter((item) => (item.progress?.mastery_score ?? 0) >= 80).length;
    const masterySum = combined.reduce((sum, item) => sum + (item.progress?.mastery_score ?? 0), 0);
    const attempts = combined.reduce((sum, item) => sum + (item.progress?.correct_count ?? 0) + (item.progress?.wrong_count ?? 0), 0);
    const correct = combined.reduce((sum, item) => sum + (item.progress?.correct_count ?? 0), 0);
    const due = combined.filter((item) => !item.progress || new Date(item.progress.due_at).getTime() <= Date.now()).length;

    return {
      total,
      started,
      mastered,
      due,
      averageMastery: total ? Math.round(masterySum / total) : 0,
      accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
      attempts,
    };
  }, [combined]);

  return { items: combined, stats, loading, error, reload: load, recordReview };
}
