import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import type { DashboardModuleKey } from '../dashboard/useStudentDashboardProgress';

export type StudentProgressLevel = {
  level: 'N5' | 'N4';
  total: number;
  started: number;
  mastered: number;
  averageMastery: number;
};

export type StudentProgressSrsOverall = {
  total: number;
  started: number;
  mastered: number;
  averageMastery: number;
  dueNow: number;
};

export type StudentReviewSummary = {
  moduleKey: DashboardModuleKey;
  dueCount: number;
  weakCount: number;
};

export type StudentReviewPriority = {
  moduleKey: DashboardModuleKey;
  title: string;
  reading: string | null;
  meaning: string | null;
  masteryScore: number;
  dueAt: string;
};

export type StudentRecentActivity = {
  moduleKey: DashboardModuleKey;
  activityType: 'review' | 'completion';
  title: string;
  detail: string;
  metric: number;
  occurredAt: string;
};

export type StudentProgressDetail = {
  srsOverall: StudentProgressSrsOverall;
  jlptLevels: StudentProgressLevel[];
  reviewSummary: StudentReviewSummary[];
  reviewPriorities: StudentReviewPriority[];
  recentActivity: StudentRecentActivity[];
};

type RawPayload = {
  srs_overall?: {
    total?: number;
    started?: number;
    mastered?: number;
    average_mastery?: number;
    due_now?: number;
  };
  jlpt_levels?: Array<{
    level?: string;
    total?: number;
    started?: number;
    mastered?: number;
    average_mastery?: number;
  }>;
  review_summary?: Array<{
    module_key?: string;
    due_count?: number;
    weak_count?: number;
  }>;
  review_priorities?: Array<{
    module_key?: string;
    title?: string;
    reading?: string | null;
    meaning?: string | null;
    mastery_score?: number;
    due_at?: string;
  }>;
  recent_activity?: Array<{
    module_key?: string;
    activity_type?: string;
    title?: string;
    detail?: string;
    metric?: number;
    occurred_at?: string;
  }>;
};

const MODULE_KEYS: DashboardModuleKey[] = [
  'hiragana',
  'katakana',
  'vocabulary',
  'kanji',
  'grammar',
  'reading',
  'listening',
];

function isModuleKey(value: unknown): value is DashboardModuleKey {
  return typeof value === 'string'
    && MODULE_KEYS.includes(value as DashboardModuleKey);
}

function safeInt(value: unknown) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
}

function safeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalize(raw: RawPayload): StudentProgressDetail {
  const overall = raw.srs_overall ?? {};

  const jlptLevels = (raw.jlpt_levels ?? [])
    .filter((row) => row.level === 'N5' || row.level === 'N4')
    .map((row) => ({
      level: row.level as 'N5' | 'N4',
      total: safeInt(row.total),
      started: safeInt(row.started),
      mastered: safeInt(row.mastered),
      averageMastery: safeInt(row.average_mastery),
    }));

  const reviewSummary = (raw.review_summary ?? [])
    .filter((row) => isModuleKey(row.module_key))
    .map((row) => ({
      moduleKey: row.module_key as DashboardModuleKey,
      dueCount: safeInt(row.due_count),
      weakCount: safeInt(row.weak_count),
    }));

  const reviewPriorities = (raw.review_priorities ?? [])
    .filter((row) => isModuleKey(row.module_key) && typeof row.due_at === 'string')
    .map((row) => ({
      moduleKey: row.module_key as DashboardModuleKey,
      title: safeText(row.title, 'Item review'),
      reading: typeof row.reading === 'string' ? row.reading : null,
      meaning: typeof row.meaning === 'string' ? row.meaning : null,
      masteryScore: safeInt(row.mastery_score),
      dueAt: row.due_at as string,
    }));

  const recentActivity = (raw.recent_activity ?? [])
    .filter(
      (row) =>
        isModuleKey(row.module_key)
        && typeof row.occurred_at === 'string'
        && (row.activity_type === 'review' || row.activity_type === 'completion'),
    )
    .map((row) => ({
      moduleKey: row.module_key as DashboardModuleKey,
      activityType: row.activity_type as 'review' | 'completion',
      title: safeText(row.title, 'Aktivitas belajar'),
      detail: safeText(row.detail),
      metric: safeInt(row.metric),
      occurredAt: row.occurred_at as string,
    }));

  return {
    srsOverall: {
      total: safeInt(overall.total),
      started: safeInt(overall.started),
      mastered: safeInt(overall.mastered),
      averageMastery: safeInt(overall.average_mastery),
      dueNow: safeInt(overall.due_now),
    },
    jlptLevels,
    reviewSummary,
    reviewPriorities,
    recentActivity,
  };
}

export function useStudentProgressDetail() {
  const { user } = useAuth();
  const [detail, setDetail] = useState<StudentProgressDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const sequenceRef = useRef(0);

  const load = useCallback(async () => {
    const sequence = sequenceRef.current + 1;
    sequenceRef.current = sequence;
    setLoading(true);
    setHasError(false);

    if (!user) {
      setDetail(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_student_progress_detail');
      if (error) throw error;
      if (sequenceRef.current !== sequence) return;

      setDetail(normalize((data ?? {}) as RawPayload));
    } catch (error) {
      if (sequenceRef.current !== sequence) return;
      console.error('Student progress detail load failed', error);
      setDetail(null);
      setHasError(true);
    } finally {
      if (sequenceRef.current === sequence) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();

    return () => {
      sequenceRef.current += 1;
    };
  }, [load]);

  return {
    detail,
    loading,
    hasError,
    reload: load,
  };
}
