import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import { READING_ITEMS } from '../reading/readingData';
import {
  getReadingProgressStats,
  type ReadingProgress,
} from '../reading/useReadingProgress';
import { LISTENING_ITEMS } from '../listening/listeningData';
import {
  getListeningProgressStats,
  type ListeningProgress,
} from '../listening/useListeningProgress';

export type DashboardModuleKey =
  | 'hiragana'
  | 'katakana'
  | 'vocabulary'
  | 'kanji'
  | 'grammar'
  | 'reading'
  | 'listening';

export type DashboardModuleSummary = {
  key: DashboardModuleKey;
  title: string;
  route: string;
  metricLabel: string;
  metricValue: string;
  detail: string;
  percentLabel: string;
  percent: number;
  available: boolean;
};

export type DashboardLatestActivity = {
  module: DashboardModuleKey;
  title: string;
  route: string;
  timestamp: string;
};

type LearningItemRow = {
  id: string;
  item_type: 'hiragana' | 'katakana' | 'vocabulary' | 'kanji' | 'grammar';
};

type ReviewProgressRow = {
  item_id: string;
  mastery_score: number;
  correct_count: number;
  wrong_count: number;
  last_reviewed_at: string | null;
};

type SrsModuleKey = LearningItemRow['item_type'];

type SrsSummary = {
  total: number;
  started: number;
  mastered: number;
  averageMastery: number;
};

const PAGE_SIZE = 1000;
const SRS_TYPES: SrsModuleKey[] = ['hiragana', 'katakana', 'vocabulary', 'kanji', 'grammar'];

const MODULE_META: Record<DashboardModuleKey, { title: string; route: string }> = {
  hiragana: { title: 'Hiragana', route: '/belajar/hiragana' },
  katakana: { title: 'Katakana', route: '/belajar/katakana' },
  vocabulary: { title: 'Kosakata', route: '/belajar/kosakata' },
  kanji: { title: 'Kanji', route: '/belajar/kanji' },
  grammar: { title: 'Tata Bahasa', route: '/belajar/tata-bahasa' },
  reading: { title: 'Reading / 読解', route: '/belajar/reading' },
  listening: { title: 'Listening / 聴解', route: '/belajar/listening' },
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function loadPublishedLearningItems() {
  const rows: LearningItemRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await supabase
      .from('learning_items')
      .select('id,item_type')
      .eq('is_published', true)
      .in('item_type', SRS_TYPES)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (result.error) throw result.error;
    const page = (result.data ?? []) as LearningItemRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function loadReviewProgress(userId: string) {
  const rows: ReviewProgressRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await supabase
      .from('review_progress')
      .select('item_id,mastery_score,correct_count,wrong_count,last_reviewed_at')
      .eq('user_id', userId)
      .order('item_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (result.error) throw result.error;
    const page = (result.data ?? []) as ReviewProgressRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function loadReadingProgress(userId: string) {
  const result = await supabase
    .from('reading_progress')
    .select('reading_id,reading_title,attempts,completed,latest_score,best_score,latest_correct_count,total_questions,first_completed_at,last_completed_at,updated_at')
    .eq('user_id', userId);

  if (result.error) throw result.error;
  return (result.data ?? []) as ReadingProgress[];
}

async function loadListeningProgress(userId: string) {
  const result = await supabase
    .from('listening_progress')
    .select('listening_id,chapter_number,completed,attempt_count,latest_score,best_score,latest_correct,latest_wrong,total_questions,first_completed_at,last_completed_at,updated_at')
    .eq('user_id', userId);

  if (result.error) throw result.error;
  return (result.data ?? []) as ListeningProgress[];
}

function emptySrsSummary(): Record<SrsModuleKey, SrsSummary> {
  return {
    hiragana: { total: 0, started: 0, mastered: 0, averageMastery: 0 },
    katakana: { total: 0, started: 0, mastered: 0, averageMastery: 0 },
    vocabulary: { total: 0, started: 0, mastered: 0, averageMastery: 0 },
    kanji: { total: 0, started: 0, mastered: 0, averageMastery: 0 },
    grammar: { total: 0, started: 0, mastered: 0, averageMastery: 0 },
  };
}

function summarizeSrs(items: LearningItemRow[], progress: ReviewProgressRow[]) {
  const summaries = emptySrsSummary();
  const itemTypeById = new Map<string, SrsModuleKey>();

  for (const item of items) {
    itemTypeById.set(item.id, item.item_type);
    summaries[item.item_type].total += 1;
  }

  const masterySums: Record<SrsModuleKey, number> = {
    hiragana: 0,
    katakana: 0,
    vocabulary: 0,
    kanji: 0,
    grammar: 0,
  };

  for (const row of progress) {
    const type = itemTypeById.get(row.item_id);
    if (!type) continue;
    const reviewed = (row.correct_count ?? 0) + (row.wrong_count ?? 0) > 0;
    if (reviewed) summaries[type].started += 1;
    if ((row.mastery_score ?? 0) >= 80) summaries[type].mastered += 1;
    masterySums[type] += row.mastery_score ?? 0;
  }

  for (const type of SRS_TYPES) {
    const total = summaries[type].total;
    summaries[type].averageMastery = total ? Math.round(masterySums[type] / total) : 0;
  }

  return { summaries, itemTypeById };
}

function unavailableSummary(key: DashboardModuleKey): DashboardModuleSummary {
  const meta = MODULE_META[key];
  return {
    key,
    title: meta.title,
    route: meta.route,
    metricLabel: 'Progress',
    metricValue: 'Belum tersedia',
    detail: 'Modul tetap dapat dibuka.',
    percentLabel: 'Data belum termuat',
    percent: 0,
    available: false,
  };
}

export function useStudentDashboardProgress() {
  const { user } = useAuth();
  const [modules, setModules] = useState<DashboardModuleSummary[]>([]);
  const [latestActivity, setLatestActivity] = useState<DashboardLatestActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPartialError, setHasPartialError] = useState(false);
  const loadSequenceRef = useRef(0);

  const load = useCallback(async () => {
    const sequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = sequence;
    setLoading(true);
    setHasPartialError(false);

    if (!user) {
      setModules([]);
      setLatestActivity(null);
      setLoading(false);
      return;
    }

    const [itemsResult, reviewResult, readingResult, listeningResult] = await Promise.allSettled([
      loadPublishedLearningItems(),
      loadReviewProgress(user.id),
      loadReadingProgress(user.id),
      loadListeningProgress(user.id),
    ]);

    if (loadSequenceRef.current !== sequence) return;

    const nextModules: DashboardModuleSummary[] = [];
    const activityCandidates: DashboardLatestActivity[] = [];
    let partialError = false;

    if (itemsResult.status === 'fulfilled' && reviewResult.status === 'fulfilled') {
      const { summaries, itemTypeById } = summarizeSrs(itemsResult.value, reviewResult.value);

      for (const key of SRS_TYPES) {
        const summary = summaries[key];
        const meta = MODULE_META[key];
        nextModules.push({
          key,
          title: meta.title,
          route: meta.route,
          metricLabel: 'Dikuasai',
          metricValue: `${summary.mastered} / ${summary.total}`,
          detail: `Dimulai ${summary.started} · Mastery rata-rata ${summary.averageMastery}%`,
          percentLabel: 'Mastery',
          percent: clampPercent(summary.averageMastery),
          available: true,
        });
      }

      for (const row of reviewResult.value) {
        if (!row.last_reviewed_at) continue;
        const type = itemTypeById.get(row.item_id);
        if (!type) continue;
        activityCandidates.push({
          module: type,
          title: MODULE_META[type].title,
          route: MODULE_META[type].route,
          timestamp: row.last_reviewed_at,
        });
      }
    } else {
      partialError = true;
      if (itemsResult.status === 'rejected') console.error('Dashboard: gagal memuat learning_items', itemsResult.reason);
      if (reviewResult.status === 'rejected') console.error('Dashboard: gagal memuat review_progress', reviewResult.reason);
      for (const key of SRS_TYPES) nextModules.push(unavailableSummary(key));
    }

    if (readingResult.status === 'fulfilled') {
      const readingMap: Record<string, ReadingProgress> = {};
      for (const row of readingResult.value) readingMap[row.reading_id] = row;
      const stats = getReadingProgressStats(READING_ITEMS, readingMap);
      nextModules.push({
        key: 'reading',
        title: MODULE_META.reading.title,
        route: MODULE_META.reading.route,
        metricLabel: 'Selesai',
        metricValue: `${stats.completed} / ${stats.total}`,
        detail: `Dikuasai ${stats.mastered} · Akurasi rata-rata ${stats.averageAccuracy}%`,
        percentLabel: 'Progress',
        percent: clampPercent(stats.progressPercent),
        available: true,
      });

      for (const row of readingResult.value) {
        if (!row.updated_at) continue;
        activityCandidates.push({
          module: 'reading',
          title: MODULE_META.reading.title,
          route: MODULE_META.reading.route,
          timestamp: row.updated_at,
        });
      }
    } else {
      partialError = true;
      console.error('Dashboard: gagal memuat reading_progress', readingResult.reason);
      nextModules.push(unavailableSummary('reading'));
    }

    if (listeningResult.status === 'fulfilled') {
      const listeningMap: Record<string, ListeningProgress> = {};
      for (const row of listeningResult.value) listeningMap[row.listening_id] = row;
      const stats = getListeningProgressStats(LISTENING_ITEMS, listeningMap);
      nextModules.push({
        key: 'listening',
        title: MODULE_META.listening.title,
        route: MODULE_META.listening.route,
        metricLabel: 'Selesai',
        metricValue: `${stats.completed} / ${stats.total}`,
        detail: `Progress ${stats.progressPercent}% · Mastery ${stats.masteryPercent}%`,
        percentLabel: 'Progress',
        percent: clampPercent(stats.progressPercent),
        available: true,
      });

      for (const row of listeningResult.value) {
        if (!row.updated_at) continue;
        activityCandidates.push({
          module: 'listening',
          title: MODULE_META.listening.title,
          route: MODULE_META.listening.route,
          timestamp: row.updated_at,
        });
      }
    } else {
      partialError = true;
      console.error('Dashboard: gagal memuat listening_progress', listeningResult.reason);
      nextModules.push(unavailableSummary('listening'));
    }

    const latest = activityCandidates
      .filter((candidate) => Number.isFinite(new Date(candidate.timestamp).getTime()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;

    setModules(nextModules);
    setLatestActivity(latest);
    setHasPartialError(partialError);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    return () => {
      loadSequenceRef.current += 1;
    };
  }, [load]);

  const moduleByKey = useMemo(() => {
    const next: Partial<Record<DashboardModuleKey, DashboardModuleSummary>> = {};
    for (const module of modules) next[module.key] = module;
    return next;
  }, [modules]);

  return {
    modules,
    moduleByKey,
    latestActivity,
    loading,
    hasPartialError,
    reload: load,
  };
}
