import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';

export type StudentStudyStreak = {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
  lastActivityDate: string | null;
  totalActiveDays: number;
  available: boolean;
};

type StudyStreakRow = {
  current_streak: number;
  longest_streak: number;
  active_today: boolean;
  last_activity_date: string | null;
  total_active_days: number;
};

const EMPTY_STREAK: StudentStudyStreak = {
  currentStreak: 0,
  longestStreak: 0,
  activeToday: false,
  lastActivityDate: null,
  totalActiveDays: 0,
  available: false,
};

function safeCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function useStudentStudyStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StudentStudyStreak>(EMPTY_STREAK);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const loadSequenceRef = useRef(0);

  const load = useCallback(async () => {
    const sequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = sequence;
    setLoading(true);
    setHasError(false);

    if (!user) {
      setStreak({ ...EMPTY_STREAK });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_my_study_streak');
      if (error) throw error;
      if (loadSequenceRef.current !== sequence) return;

      const row = ((data ?? []) as StudyStreakRow[])[0];

      if (!row) {
        setStreak({
          ...EMPTY_STREAK,
          available: true,
        });
        return;
      }

      setStreak({
        currentStreak: safeCount(row.current_streak),
        longestStreak: safeCount(row.longest_streak),
        activeToday: Boolean(row.active_today),
        lastActivityDate: row.last_activity_date ?? null,
        totalActiveDays: safeCount(row.total_active_days),
        available: true,
      });
    } catch (loadError) {
      if (loadSequenceRef.current !== sequence) return;
      console.error('Study streak load failed', loadError);
      setStreak({ ...EMPTY_STREAK });
      setHasError(true);
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

  return {
    streak,
    loading,
    hasError,
    reload: load,
  };
}
