import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';

export type HiraganaVariant = 'basic' | 'dakuten' | 'handakuten' | 'yoon';

export type HiraganaItem = {
  id: string;
  prompt: string;
  reading: string;
  extra: {
    group?: string;
    variant?: HiraganaVariant;
    sort_order?: number;
  } | null;
};

export type HiraganaProgress = {
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

export type HiraganaWithProgress = HiraganaItem & {
  progress: HiraganaProgress | null;
};

export function useHiragana() {
  const { user } = useAuth();
  const [items, setItems] = useState<HiraganaItem[]>([]);
  const [progressByItem, setProgressByItem] = useState<Record<string, HiraganaProgress>>({});
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
      .eq('item_type', 'hiragana')
      .eq('is_published', true);

    if (itemResult.error) {
      setError(itemResult.error.message);
      setLoading(false);
      return;
    }

    const normalized = ((itemResult.data ?? []) as HiraganaItem[])
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

    const nextMap: Record<string, HiraganaProgress> = {};
    for (const row of (progressResult.data ?? []) as HiraganaProgress[]) nextMap[row.item_id] = row;
    setProgressByItem(nextMap);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const recordReview = useCallback(async (itemId: string, rating: 0 | 1 | 2 | 3) => {
    const { data, error: rpcError } = await supabase.rpc('record_hiragana_review', {
      p_item_id: itemId,
      p_rating: rating,
    });
    if (rpcError) {
      const detail = [rpcError.message, rpcError.details, rpcError.hint].filter(Boolean).join(' — ');
      throw new Error(detail || 'Gagal menyimpan review Hiragana.');
    }

    const row = (Array.isArray(data) ? data[0] : data) as HiraganaProgress | null;
    if (!row?.item_id) throw new Error('Supabase tidak mengembalikan progres review yang tersimpan.');
    setProgressByItem((current) => ({ ...current, [row.item_id]: row }));
    return row;
  }, []);

  const combined = useMemo<HiraganaWithProgress[]>(() => items.map((item) => ({
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

export function speakJapanese(text: string) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.78;
  const voices = window.speechSynthesis.getVoices();
  const japanese = voices.find((voice) => voice.lang.toLowerCase().startsWith('ja'));
  if (japanese) utterance.voice = japanese;
  window.speechSynthesis.speak(utterance);
  return true;
}
