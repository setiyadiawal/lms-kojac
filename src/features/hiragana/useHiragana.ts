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

const JAPANESE_SPEECH_CHUNK_MAX_LENGTH = 120;
let activeJapaneseUtterances: SpeechSynthesisUtterance[] = [];

function splitLongJapaneseSpeechSegment(segment: string) {
  const naturalParts = segment.match(/[^\u3001\uFF0C,\uFF1B;\uFF1A:]+[\u3001\uFF0C,\uFF1B;\uFF1A:]?/gu) ?? [segment];
  const chunks: string[] = [];
  let current = '';

  for (const part of naturalParts) {
    const candidate = `${current}${part}`;

    if (candidate.length <= JAPANESE_SPEECH_CHUNK_MAX_LENGTH) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (part.length <= JAPANESE_SPEECH_CHUNK_MAX_LENGTH) {
      current = part;
      continue;
    }

    for (let start = 0; start < part.length; start += JAPANESE_SPEECH_CHUNK_MAX_LENGTH) {
      chunks.push(part.slice(start, start + JAPANESE_SPEECH_CHUNK_MAX_LENGTH));
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function chunkJapaneseSpeechText(text: string) {
  const cleanText = text.replace(/\s+/g, ' ').trim();

  if (!cleanText) return [];
  if (cleanText.length <= JAPANESE_SPEECH_CHUNK_MAX_LENGTH) return [cleanText];

  const sentences = cleanText.match(/[^\u3002\uFF01\uFF1F!?]+[\u3002\uFF01\uFF1F!?]?/gu) ?? [cleanText];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const candidate = current ? `${current} ${trimmed}` : trimmed;

    if (candidate.length <= JAPANESE_SPEECH_CHUNK_MAX_LENGTH) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (trimmed.length <= JAPANESE_SPEECH_CHUNK_MAX_LENGTH) {
      current = trimmed;
      continue;
    }

    chunks.push(...splitLongJapaneseSpeechSegment(trimmed));
  }

  if (current) chunks.push(current);
  return chunks;
}

export function stopJapaneseSpeech() {
  activeJapaneseUtterances = [];

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

export function speakJapanese(text: string) {
  if (
    typeof window === 'undefined'
    || !('speechSynthesis' in window)
    || typeof SpeechSynthesisUtterance === 'undefined'
  ) return false;

  const chunks = chunkJapaneseSpeechText(text);
  if (!chunks.length) return false;

  const synth = window.speechSynthesis;

  synth.cancel();
  activeJapaneseUtterances = [];

  if (synth.paused) synth.resume();

  const voices = synth.getVoices();
  const japanese = voices.find((voice) => voice.lang.toLowerCase() === 'ja-jp')
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('ja'));

  const utterances = chunks.map((chunk) => {
    const utterance = new SpeechSynthesisUtterance(chunk);

    utterance.lang = 'ja-JP';
    utterance.rate = 0.78;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (japanese) utterance.voice = japanese;

    return utterance;
  });

  const lastUtterance = utterances[utterances.length - 1];

  const clearFinishedQueue = () => {
    if (activeJapaneseUtterances === utterances) {
      activeJapaneseUtterances = [];
    }
  };

  if (lastUtterance) {
    lastUtterance.onend = clearFinishedQueue;
    lastUtterance.onerror = clearFinishedQueue;
  }

  activeJapaneseUtterances = utterances;

  // Queue all chunks synchronously from the original user action.
  utterances.forEach((utterance) => synth.speak(utterance));

  return true;
}
