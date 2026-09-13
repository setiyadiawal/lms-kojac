import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import type { ListeningItem } from './listeningData';

export type ListeningProgress = {
  listening_id: string;
  chapter_number: number;
  completed: boolean;
  attempt_count: number;
  latest_score: number;
  best_score: number;
  latest_correct: number;
  latest_wrong: number;
  total_questions: number;
  first_completed_at: string | null;
  last_completed_at: string | null;
  updated_at: string;
};

export type ListeningProgressStats = {
  total: number;
  completed: number;
  mastered: number;
  progressPercent: number;
  masteryPercent: number;
};

export const LISTENING_MASTERY_THRESHOLD = 80;

export function getListeningProgressStats(
  listenings: ListeningItem[],
  progressByListeningId: Record<string, ListeningProgress>,
): ListeningProgressStats {
  const total = listenings.length;
  let completed = 0;
  let mastered = 0;
  let masteryTotal = 0;

  for (const listening of listenings) {
    const progress = progressByListeningId[listening.id];
    if (progress?.completed) completed += 1;
    if ((progress?.best_score ?? 0) >= LISTENING_MASTERY_THRESHOLD) mastered += 1;
    masteryTotal += progress?.best_score ?? 0;
  }

  return {
    total,
    completed,
    mastered,
    progressPercent: total ? Math.round((completed / total) * 100) : 0,
    masteryPercent: total ? Math.round(masteryTotal / total) : 0,
  };
}

export function useListeningProgress() {
  const { user } = useAuth();
  const [progressByListeningId, setProgressByListeningId] = useState<Record<string, ListeningProgress>>({});
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
        setProgressByListeningId({});
        return;
      }

      const result = await supabase
        .from('listening_progress')
        .select('listening_id,chapter_number,completed,attempt_count,latest_score,best_score,latest_correct,latest_wrong,total_questions,first_completed_at,last_completed_at,updated_at')
        .eq('user_id', user.id);

      if (result.error) throw result.error;
      if (loadSequenceRef.current !== sequence) return;

      const next: Record<string, ListeningProgress> = {};
      for (const row of (result.data ?? []) as ListeningProgress[]) next[row.listening_id] = row;
      setProgressByListeningId(next);
    } catch (loadError) {
      if (loadSequenceRef.current !== sequence) return;
      console.error('Listening progress load failed', loadError);
      setProgressByListeningId({});
      setError('Progress Listening belum dapat dimuat. Latihan tetap dapat digunakan.');
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
    listeningId: string,
    chapterNumber: number,
    score: number,
    correct: number,
    wrong: number,
    totalQuestions: number,
    sessionId: string,
  ): Promise<ListeningProgress | null> => {
    if (!user) return null;

    const { data, error: rpcError } = await supabase.rpc('record_listening_completion', {
      p_listening_id: listeningId,
      p_chapter_number: chapterNumber,
      p_score: score,
      p_correct: correct,
      p_wrong: wrong,
      p_total_questions: totalQuestions,
      p_session_id: sessionId,
    });

    if (rpcError) {
      console.error('Listening progress save failed', rpcError);
      throw new Error('Progress belum berhasil disimpan. Silakan coba lagi.');
    }

    const row = (Array.isArray(data) ? data[0] : data) as ListeningProgress | null;
    if (!row?.listening_id) {
      console.error('Listening progress save returned no persisted row');
      throw new Error('Progress belum berhasil disimpan. Silakan coba lagi.');
    }

    setProgressByListeningId((current) => ({ ...current, [row.listening_id]: row }));
    return row;
  }, [user]);

  const progressRows = useMemo(() => Object.values(progressByListeningId), [progressByListeningId]);

  return {
    progressByListeningId,
    progressRows,
    loading,
    error,
    isAuthenticated: Boolean(user),
    reload: load,
    recordCompletion,
  };
}
