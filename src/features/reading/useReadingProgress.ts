import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import type { ReadingItem } from './readingData';

export type ReadingProgress = {
  reading_id: string;
  reading_title: string;
  attempts: number;
  completed: boolean;
  latest_score: number;
  best_score: number;
  latest_correct_count: number;
  total_questions: number;
  first_completed_at: string | null;
  last_completed_at: string | null;
  updated_at: string;
};

export type ReadingProgressStatus = 'not_started' | 'completed' | 'repeat' | 'mastered';
export type ReadingProgressFilter = 'all' | ReadingProgressStatus;

export type ReadingProgressStats = {
  total: number;
  completed: number;
  mastered: number;
  repeat: number;
  averageAccuracy: number;
  progressPercent: number;
};

export const READING_MASTERY_THRESHOLD = 80;
export const READING_REPEAT_THRESHOLD = 60;

export function getReadingProgressStatus(progress: ReadingProgress | null | undefined): ReadingProgressStatus {
  if (!progress || progress.attempts <= 0 || !progress.completed) return 'not_started';
  if (progress.best_score >= READING_MASTERY_THRESHOLD) return 'mastered';
  if (progress.latest_score < READING_REPEAT_THRESHOLD) return 'repeat';
  return 'completed';
}

export function getReadingStatusLabel(progress: ReadingProgress | null | undefined) {
  const status = getReadingProgressStatus(progress);
  if (status === 'mastered') return 'Dikuasai';
  if (status === 'repeat') return 'Perlu Diulang';
  if (status === 'completed') return 'Selesai';
  return 'Belum Dibaca';
}

export function getReadingProgressStats(
  readings: ReadingItem[],
  progressByReadingId: Record<string, ReadingProgress>,
): ReadingProgressStats {
  const total = readings.length;
  const progressRows = readings
    .map((reading) => progressByReadingId[reading.id])
    .filter((progress): progress is ReadingProgress => Boolean(progress?.completed && progress.attempts > 0));
  const completed = progressRows.length;
  const mastered = progressRows.filter((progress) => progress.best_score >= READING_MASTERY_THRESHOLD).length;
  const repeat = progressRows.filter((progress) =>
    progress.best_score < READING_MASTERY_THRESHOLD
    && progress.latest_score < READING_REPEAT_THRESHOLD
  ).length;
  const averageAccuracy = completed
    ? Math.round(progressRows.reduce((sum, progress) => sum + progress.latest_score, 0) / completed)
    : 0;
  const completedNotMastered = Math.max(0, completed - mastered);
  const progressPercent = total
    ? Math.round(((mastered + (completedNotMastered * 0.5)) / total) * 100)
    : 0;

  return { total, completed, mastered, repeat, averageAccuracy, progressPercent };
}

export function readingMatchesProgressFilter(
  progress: ReadingProgress | null | undefined,
  filter: ReadingProgressFilter,
) {
  if (filter === 'all') return true;
  return getReadingProgressStatus(progress) === filter;
}

export function useReadingProgress() {
  const { user } = useAuth();
  const [progressByReadingId, setProgressByReadingId] = useState<Record<string, ReadingProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadSequenceRef = useRef(0);

  const load = useCallback(async () => {
    const sequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = sequence;
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        setProgressByReadingId({});
        return;
      }

      const result = await supabase
        .from('reading_progress')
        .select('reading_id,reading_title,attempts,completed,latest_score,best_score,latest_correct_count,total_questions,first_completed_at,last_completed_at,updated_at')
        .eq('user_id', user.id);

      if (result.error) throw result.error;
      if (loadSequenceRef.current !== sequence) return;

      const next: Record<string, ReadingProgress> = {};
      for (const row of (result.data ?? []) as ReadingProgress[]) next[row.reading_id] = row;
      setProgressByReadingId(next);
    } catch (loadError) {
      if (loadSequenceRef.current !== sequence) return;
      console.error('Reading progress load failed', loadError);
      setProgressByReadingId({});
      setError('Progress Reading belum dapat dimuat. Silakan coba lagi.');
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

  const recordCompletion = useCallback(async (
    readingId: string,
    readingTitle: string,
    correctCount: number,
    totalQuestions: number,
    sessionId: string,
  ) => {
    const { data, error: rpcError } = await supabase.rpc('record_reading_completion', {
      p_reading_id: readingId,
      p_reading_title: readingTitle,
      p_correct_count: correctCount,
      p_total_questions: totalQuestions,
      p_session_id: sessionId,
    });

    if (rpcError) {
      console.error('Reading progress save failed', rpcError);
      throw new Error('Progress Reading belum berhasil disimpan. Silakan coba lagi.');
    }

    const row = (Array.isArray(data) ? data[0] : data) as ReadingProgress | null;
    if (!row?.reading_id) {
      console.error('Reading progress save returned no persisted row');
      throw new Error('Progress Reading belum berhasil disimpan. Silakan coba lagi.');
    }

    setProgressByReadingId((current) => ({ ...current, [row.reading_id]: row }));
    return row;
  }, []);

  const progressRows = useMemo(() => Object.values(progressByReadingId), [progressByReadingId]);

  return {
    progressByReadingId,
    progressRows,
    loading,
    error,
    reload: load,
    recordCompletion,
  };
}
