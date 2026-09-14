import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';

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

type DashboardSummaryRow = {
  module_key: string;
  total: number;
  started: number;
  mastered: number;
  average_mastery: number;
  completed: number;
  average_accuracy: number;
  progress_percent: number;
  mastery_percent: number;
  latest_activity: string | null;
};

const MODULE_ORDER: DashboardModuleKey[] = [
  'hiragana',
  'katakana',
  'vocabulary',
  'kanji',
  'grammar',
  'reading',
  'listening',
];

const SRS_MODULES = new Set<DashboardModuleKey>([
  'hiragana',
  'katakana',
  'vocabulary',
  'kanji',
  'grammar',
]);

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

function isDashboardModuleKey(value: string): value is DashboardModuleKey {
  return MODULE_ORDER.includes(value as DashboardModuleKey);
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

function summaryFromRow(key: DashboardModuleKey, row: DashboardSummaryRow): DashboardModuleSummary {
  const meta = MODULE_META[key];

  if (SRS_MODULES.has(key)) {
    return {
      key,
      title: meta.title,
      route: meta.route,
      metricLabel: 'Dikuasai',
      metricValue: `${row.mastered} / ${row.total}`,
      detail: `Dimulai ${row.started} · Mastery rata-rata ${row.average_mastery}%`,
      percentLabel: 'Mastery',
      percent: clampPercent(row.average_mastery),
      available: true,
    };
  }

  if (key === 'reading') {
    return {
      key,
      title: meta.title,
      route: meta.route,
      metricLabel: 'Selesai',
      metricValue: `${row.completed} / ${row.total}`,
      detail: `Dikuasai ${row.mastered} · Akurasi rata-rata ${row.average_accuracy}%`,
      percentLabel: 'Progress',
      percent: clampPercent(row.progress_percent),
      available: true,
    };
  }

  return {
    key,
    title: meta.title,
    route: meta.route,
    metricLabel: 'Selesai',
    metricValue: `${row.completed} / ${row.total}`,
    detail: `Progress ${row.progress_percent}% · Mastery ${row.mastery_percent}%`,
    percentLabel: 'Progress',
    percent: clampPercent(row.progress_percent),
    available: true,
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

    try {
      const { data, error } = await supabase.rpc('get_student_dashboard_summary');
      if (error) throw error;
      if (loadSequenceRef.current !== sequence) return;

      const rows = ((data ?? []) as DashboardSummaryRow[])
        .filter((row) => isDashboardModuleKey(row.module_key));
      const rowByModule = new Map(rows.map((row) => [row.module_key as DashboardModuleKey, row]));
      let partialError = false;

      const nextModules = MODULE_ORDER.map((key) => {
        const row = rowByModule.get(key);
        if (!row) {
          partialError = true;
          return unavailableSummary(key);
        }
        return summaryFromRow(key, row);
      });

      const latest = rows
        .filter((row) => Boolean(row.latest_activity))
        .map((row) => ({
          module: row.module_key as DashboardModuleKey,
          title: MODULE_META[row.module_key as DashboardModuleKey].title,
          route: MODULE_META[row.module_key as DashboardModuleKey].route,
          timestamp: row.latest_activity as string,
        }))
        .filter((candidate) => Number.isFinite(new Date(candidate.timestamp).getTime()))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;

      setModules(nextModules);
      setLatestActivity(latest);
      setHasPartialError(partialError);
    } catch (loadError) {
      if (loadSequenceRef.current !== sequence) return;
      console.error('Dashboard summary load failed', loadError);
      setModules(MODULE_ORDER.map(unavailableSummary));
      setLatestActivity(null);
      setHasPartialError(true);
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
