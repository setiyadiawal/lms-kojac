import type {
  DashboardModuleKey,
  DashboardModuleSummary,
} from './useStudentDashboardProgress';

export type AchievementCategory = 'general' | DashboardModuleKey;

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  unlocked: boolean;
  current: number;
  target: number;
  progressPercent: number;
  progressText: string;
};

const MAIN_MODULES: DashboardModuleKey[] = [
  'hiragana',
  'katakana',
  'vocabulary',
  'kanji',
  'grammar',
  'reading',
  'listening',
];

function safeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function percent(current: number, target: number) {
  const safeCurrent = safeNumber(current);
  const safeTarget = safeNumber(target);
  if (safeTarget <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((safeCurrent / safeTarget) * 100)));
}

function moduleHasProgress(module: DashboardModuleSummary | undefined) {
  if (!module?.available) return false;
  if (module.key === 'reading' || module.key === 'listening') {
    return safeNumber(module.progress?.completed) > 0;
  }
  return safeNumber(module.progress?.started) > 0;
}

function createAchievement(input: {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  current: number;
  target: number;
  available?: boolean;
  unit: string;
  format?: 'count' | 'percent';
}): Achievement {
  const current = safeNumber(input.current);
  const target = safeNumber(input.target);
  const available = input.available ?? true;
  const unlocked = available && target > 0 && current >= target;

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    category: input.category,
    unlocked,
    current,
    target,
    progressPercent: available ? percent(current, target) : 0,
    progressText: available
      ? input.format === 'percent'
        ? `${current}% / ${target}% ${input.unit}`
        : `${current} / ${target} ${input.unit}`
      : 'Data modul belum tersedia',
  };
}

export function evaluateStudentAchievements(
  modules: DashboardModuleSummary[],
): Achievement[] {
  const byModule = new Map(modules.map((module) => [module.key, module]));
  const hiragana = byModule.get('hiragana');
  const katakana = byModule.get('katakana');
  const vocabulary = byModule.get('vocabulary');
  const kanji = byModule.get('kanji');
  const grammar = byModule.get('grammar');
  const reading = byModule.get('reading');
  const listening = byModule.get('listening');

  const progressedModules = MAIN_MODULES.filter((key) => moduleHasProgress(byModule.get(key))).length;

  return [
    createAchievement({
      id: 'first-step',
      title: 'Langkah Pertama',
      description: 'Mulai progress pada salah satu modul utama KOJAC.',
      category: 'general',
      current: progressedModules > 0 ? 1 : 0,
      target: 1,
      unit: 'Modul dimulai',
    }),
    createAchievement({
      id: 'hiragana-beginner',
      title: 'Hiragana Pemula',
      description: 'Capai minimal 25% mastery Hiragana.',
      category: 'hiragana',
      current: hiragana?.progress?.averageMastery ?? 0,
      target: 25,
      available: hiragana?.available ?? false,
      unit: 'Mastery',
      format: 'percent',
    }),
    createAchievement({
      id: 'hiragana-master',
      title: 'Hiragana Master',
      description: 'Capai 100% mastery Hiragana.',
      category: 'hiragana',
      current: hiragana?.progress?.averageMastery ?? 0,
      target: 100,
      available: hiragana?.available ?? false,
      unit: 'Mastery',
      format: 'percent',
    }),
    createAchievement({
      id: 'katakana-master',
      title: 'Katakana Master',
      description: 'Capai 100% mastery Katakana.',
      category: 'katakana',
      current: katakana?.progress?.averageMastery ?? 0,
      target: 100,
      available: katakana?.available ?? false,
      unit: 'Mastery',
      format: 'percent',
    }),
    createAchievement({
      id: 'vocabulary-100',
      title: 'Kosakata 100',
      description: 'Kuasai minimal 100 kosakata.',
      category: 'vocabulary',
      current: vocabulary?.progress?.mastered ?? 0,
      target: 100,
      available: vocabulary?.available ?? false,
      unit: 'Kosakata',
    }),
    createAchievement({
      id: 'vocabulary-500',
      title: 'Kosakata 500',
      description: 'Kuasai minimal 500 kosakata.',
      category: 'vocabulary',
      current: vocabulary?.progress?.mastered ?? 0,
      target: 500,
      available: vocabulary?.available ?? false,
      unit: 'Kosakata',
    }),
    createAchievement({
      id: 'kanji-50',
      title: 'Kanji 50',
      description: 'Kuasai minimal 50 Kanji.',
      category: 'kanji',
      current: kanji?.progress?.mastered ?? 0,
      target: 50,
      available: kanji?.available ?? false,
      unit: 'Kanji',
    }),
    createAchievement({
      id: 'kanji-100',
      title: 'Kanji 100',
      description: 'Kuasai minimal 100 Kanji.',
      category: 'kanji',
      current: kanji?.progress?.mastered ?? 0,
      target: 100,
      available: kanji?.available ?? false,
      unit: 'Kanji',
    }),
    createAchievement({
      id: 'grammar-starter',
      title: 'Grammar Starter',
      description: 'Kuasai minimal 10 materi Tata Bahasa.',
      category: 'grammar',
      current: grammar?.progress?.mastered ?? 0,
      target: 10,
      available: grammar?.available ?? false,
      unit: 'Grammar',
    }),
    createAchievement({
      id: 'reading-starter',
      title: 'Reading Starter',
      description: 'Selesaikan minimal 10 Reading.',
      category: 'reading',
      current: reading?.progress?.completed ?? 0,
      target: 10,
      available: reading?.available ?? false,
      unit: 'Reading',
    }),
    createAchievement({
      id: 'reading-master',
      title: 'Reading Master',
      description: 'Selesaikan seluruh Reading yang tersedia.',
      category: 'reading',
      current: reading?.progress?.completed ?? 0,
      target: reading?.progress?.total ?? 0,
      available: Boolean(reading?.available && safeNumber(reading.progress?.total ?? 0) > 0),
      unit: 'Reading',
    }),
    createAchievement({
      id: 'listening-starter',
      title: 'Listening Starter',
      description: 'Selesaikan minimal 10 Listening.',
      category: 'listening',
      current: listening?.progress?.completed ?? 0,
      target: 10,
      available: listening?.available ?? false,
      unit: 'Listening',
    }),
    createAchievement({
      id: 'listening-master',
      title: 'Listening Master',
      description: 'Selesaikan seluruh Listening yang tersedia.',
      category: 'listening',
      current: listening?.progress?.completed ?? 0,
      target: listening?.progress?.total ?? 0,
      available: Boolean(listening?.available && safeNumber(listening.progress?.total ?? 0) > 0),
      unit: 'Listening',
    }),
    createAchievement({
      id: 'all-rounder',
      title: 'All Rounder',
      description: 'Miliki progress pada seluruh 7 modul utama.',
      category: 'general',
      current: progressedModules,
      target: MAIN_MODULES.length,
      unit: 'Modul',
    }),
  ];
}
