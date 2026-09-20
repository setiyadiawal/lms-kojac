import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookMarked,
  BookOpenCheck,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  Headphones,
  Languages,
  Layers3,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  SpellCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StudentProgressOverview } from '../features/dashboard/StudentProgressOverview';
import {
  evaluateStudentAchievements,
  type Achievement,
} from '../features/dashboard/studentAchievements';
import {
  useStudentDashboardProgress,
  type DashboardModuleKey,
  type DashboardModuleSummary,
} from '../features/dashboard/useStudentDashboardProgress';
import { useStudentProgressDetail } from '../features/progress/useStudentProgressDetail';
import './progress-page.css';

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

function moduleStarted(module: DashboardModuleSummary) {
  if (!module.available || !module.progress) return false;

  if (module.key === 'reading' || module.key === 'listening') {
    return module.progress.completed > 0;
  }

  return module.progress.started > 0;
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDue(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Review jatuh tempo';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function SummaryStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <article className="central-progress-stat">
      <div className="central-progress-stat-icon" aria-hidden="true">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function AchievementModuleIcon({
  category,
}: {
  category: Achievement['category'];
}) {
  if (category === 'general') return <Award size={21}/>;
  if (category === 'hiragana') return <Languages size={21}/>;
  if (category === 'katakana') return <SpellCheck size={21}/>;
  if (category === 'vocabulary') return <BookMarked size={21}/>;
  if (category === 'kanji') return <BookOpenCheck size={21}/>;
  if (category === 'grammar') return <BrainCircuit size={21}/>;
  if (category === 'reading') return <BookOpenText size={21}/>;
  return <Headphones size={21}/>;
}

function ProgressAchievementCard({
  achievement,
  loading,
}: {
  achievement: Achievement;
  loading: boolean;
}) {
  const status = loading ? 'Memuat' : achievement.unlocked ? 'Tercapai' : 'Terkunci';
  const progressText = loading ? 'Memuat progress…' : achievement.progressText;
  const progressValue = loading ? 0 : achievement.progressPercent;

  return (
    <article
      className={`student-achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'} ${loading ? 'loading' : ''}`}
    >
      <div className="student-achievement-card-top">
        <div className="achievement-icon" aria-hidden="true">
          <AchievementModuleIcon category={achievement.category}/>
        </div>

        <span
          className={`achievement-status ${achievement.unlocked ? 'unlocked' : 'locked'}`}
        >
          {!loading && (
            achievement.unlocked
              ? <CheckCircle2 size={13} aria-hidden="true"/>
              : <LockKeyhole size={13} aria-hidden="true"/>
          )}
          {status}
        </span>
      </div>

      <h3>{achievement.title}</h3>
      <p>{achievement.description}</p>

      <div className="achievement-progress-row">
        <span>Progress</span>
        <strong>{progressText}</strong>
      </div>

      <div
        className="achievement-progress-track"
        role="progressbar"
        aria-label={`Progress ${achievement.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressValue}
        aria-valuetext={progressText}
      >
        <span style={{ width: `${progressValue}%` }}/>
      </div>
    </article>
  );
}

function DetailCard({ module }: { module: DashboardModuleSummary }) {
  const percent = clampPercent(module.percent);

  return (
    <article className="central-progress-module-card">
      <div className="central-progress-module-heading">
        <div>
          <span>MODUL BELAJAR</span>
          <h3>{module.title}</h3>
        </div>
        <strong>{module.available ? `${percent}%` : '—'}</strong>
      </div>

      <div className="central-progress-module-track" aria-hidden="true">
        <span style={{ width: module.available ? `${percent}%` : '0%' }} />
      </div>

      <div className="central-progress-module-metric">
        <span>{module.metricLabel}</span>
        <strong>{module.metricValue}</strong>
      </div>

      <p>{module.detail}</p>

      <Link to={module.route} className="central-progress-module-link">
        Buka modul <ArrowRight size={15} aria-hidden="true"/>
      </Link>
    </article>
  );
}

export function ProgressPage() {
  const {
    modules,
    latestActivity,
    loading,
    hasPartialError,
    reload,
  } = useStudentDashboardProgress();

  const {
    detail,
    loading: detailLoading,
    hasError: detailHasError,
    reload: reloadDetail,
  } = useStudentProgressDetail();

  const achievements = evaluateStudentAchievements(modules);
  const unlockedAchievementCount = achievements.filter(
    (achievement) => achievement.unlocked,
  ).length;
  const achievementLoading = loading && modules.length === 0;

  const availableModules = modules.filter((module) => module.available);
  const activeModules = availableModules.filter(moduleStarted);
  const completedModules = availableModules.filter(
    (module) => clampPercent(module.percent) >= 100,
  );

  const overallPercent = availableModules.length > 0
    ? Math.round(
        availableModules.reduce(
          (sum, module) => sum + clampPercent(module.percent),
          0,
        ) / availableModules.length,
      )
    : 0;

  const moduleReviewPriorities = activeModules
    .filter((module) => clampPercent(module.percent) < 100)
    .sort((a, b) => clampPercent(a.percent) - clampPercent(b.percent))
    .slice(0, 3);

  const notStarted = availableModules
    .filter((module) => !moduleStarted(module))
    .slice(0, 3);

  const latestActivityText = latestActivity
    ? formatActivityTime(latestActivity.timestamp)
    : null;

  const initialLoading = loading && modules.length === 0;
  const anyLoading = loading || detailLoading;
  const anyPartialError = hasPartialError || detailHasError;

  const reloadAll = async () => {
    await Promise.all([reload(), reloadDetail()]);
  };

  return (
    <div className="page central-progress-page">
      <div className="page-header central-progress-header">
        <div>
          <p className="eyebrow">KOJAC LMS · READ ONLY</p>
          <h1>Progres Belajar</h1>
          <p>
            Ringkasan progres tersimpan dari modul utama KOJAC tanpa membuat
            atau mengubah data belajar baru.
          </p>
        </div>

        <button
          type="button"
          className="ghost-btn central-progress-refresh"
          onClick={() => void reloadAll()}
          disabled={anyLoading}
        >
          <RefreshCw size={16} aria-hidden="true"/>
          {anyLoading ? 'Memuat…' : 'Muat ulang'}
        </button>
      </div>

      {anyPartialError && !initialLoading && (
        <div className="central-progress-warning" role="status">
          <AlertTriangle size={17} aria-hidden="true"/>
          <span>
            Sebagian detail progres belum dapat dimuat. Data utama dan modul
            belajar tetap aman serta dapat digunakan seperti biasa.
          </span>
        </div>
      )}

      <section
        className="central-progress-stats"
        aria-label="Ringkasan progres belajar"
      >
        <SummaryStat
          icon={<Gauge size={20}/>}
          value={initialLoading ? '…' : availableModules.length > 0 ? `${overallPercent}%` : '—'}
          label="Overall progress"
        />
        <SummaryStat
          icon={<Layers3 size={20}/>}
          value={initialLoading ? '…' : `${activeModules.length} / ${availableModules.length || 7}`}
          label="Modul aktif"
        />
        <SummaryStat
          icon={<CheckCircle2 size={20}/>}
          value={detailLoading ? '…' : detail ? `${detail.srsOverall.averageMastery}%` : '—'}
          label="Mastery SRS rata-rata"
        />
        <SummaryStat
          icon={<RotateCcw size={20}/>}
          value={detailLoading ? '…' : detail ? String(detail.srsOverall.dueNow) : '—'}
          label="Review jatuh tempo"
        />
      </section>

      <StudentProgressOverview modules={modules} loading={loading}/>

      <section className="central-progress-next panel" aria-labelledby="central-progress-next-title">
        <div>
          <p className="eyebrow">LANJUT BELAJAR</p>
          <h2 id="central-progress-next-title">
            {latestActivity ? `Lanjutkan ${latestActivity.title}` : 'Mulai perjalanan belajarmu'}
          </h2>
          <p>
            {latestActivity
              ? `Aktivitas terakhir tersimpan${latestActivityText ? ` · ${latestActivityText}` : ''}.`
              : 'Belum ada aktivitas belajar yang tersimpan pada ringkasan progres.'}
          </p>
        </div>

        <Link
          className="central-progress-primary-link"
          to={latestActivity?.route ?? '/belajar/hiragana'}
        >
          {latestActivity ? 'Lanjutkan belajar' : 'Mulai dari Hiragana'}
          <ArrowRight size={16} aria-hidden="true"/>
        </Link>
      </section>

      <section className="central-progress-section" aria-labelledby="central-progress-jlpt-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">N5 → N4</p>
            <h2 id="central-progress-jlpt-title">Progress JLPT</h2>
          </div>
          <p>
            Dihitung hanya dari Kosakata, Kanji, dan Tata Bahasa yang memiliki
            label JLPT N5/N4 pada source data KOJAC.
          </p>
        </div>

        {detailLoading && !detail ? (
          <div className="central-progress-level-grid" aria-label="Memuat progress JLPT">
            <span className="central-progress-level-loading"/>
            <span className="central-progress-level-loading"/>
          </div>
        ) : detail && detail.jlptLevels.length > 0 ? (
          <div className="central-progress-level-grid">
            {detail.jlptLevels.map((level) => {
              const masteryCoverage = level.total > 0
                ? clampPercent((100 * level.mastered) / level.total)
                : 0;
              const startedCoverage = level.total > 0
                ? clampPercent((100 * level.started) / level.total)
                : 0;

              return (
                <article className="central-progress-level-card" key={level.level}>
                  <div className="central-progress-level-top">
                    <div>
                      <span>JLPT LEVEL</span>
                      <h3>{level.level}</h3>
                    </div>
                    <strong>{masteryCoverage}%</strong>
                  </div>

                  <div className="central-progress-level-track" aria-hidden="true">
                    <span style={{ width: `${masteryCoverage}%` }}/>
                  </div>

                  <div className="central-progress-level-metrics">
                    <div>
                      <strong>{level.mastered} / {level.total}</strong>
                      <span>Dikuasai ≥80</span>
                    </div>
                    <div>
                      <strong>{level.started} / {level.total}</strong>
                      <span>Sudah dimulai · {startedCoverage}%</span>
                    </div>
                    <div>
                      <strong>{level.averageMastery}%</strong>
                      <span>Mastery rata-rata</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="central-progress-detail-fallback">
            Detail N5/N4 belum dapat dimuat.
          </div>
        )}
      </section>

      <section className="central-progress-section" aria-labelledby="central-progress-detail-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">DETAIL MODUL</p>
            <h2 id="central-progress-detail-title">Progress per Modul</h2>
          </div>
          <p>
            Angka berasal dari progress existing pada masing-masing modul.
          </p>
        </div>

        {initialLoading ? (
          <div className="central-progress-loading-grid" aria-label="Memuat detail progres">
            {Array.from({ length: 6 }, (_, index) => <span key={index}/>)}
          </div>
        ) : (
          <div className="central-progress-module-grid">
            {modules.map((module) => (
              <DetailCard key={module.key} module={module}/>
            ))}
          </div>
        )}
      </section>

      <section className="central-progress-section" aria-labelledby="central-progress-review-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">REVIEW INTELLIGENCE</p>
            <h2 id="central-progress-review-title">Prioritas Review</h2>
          </div>
          <p>
            Item yang sudah jatuh tempo diurutkan dari mastery terendah. Hanya
            membaca status SRS existing.
          </p>
        </div>

        {detailLoading && !detail ? (
          <div className="central-progress-review-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <span className="central-progress-review-loading" key={index}/>
            ))}
          </div>
        ) : detail && detail.reviewPriorities.length > 0 ? (
          <div className="central-progress-review-grid">
            {detail.reviewPriorities.map((item, index) => {
              const meta = MODULE_META[item.moduleKey];

              return (
                <Link
                  className="central-progress-review-card"
                  to={meta.route}
                  key={`${item.moduleKey}-${item.title}-${item.dueAt}-${index}`}
                >
                  <div className="central-progress-review-card-top">
                    <span>{meta.title}</span>
                    <strong>{item.masteryScore}%</strong>
                  </div>
                  <h3>{item.title}</h3>
                  {item.reading && <p className="central-progress-review-reading">{item.reading}</p>}
                  {item.meaning && <p>{item.meaning}</p>}
                  <div className="central-progress-review-due">
                    <Clock3 size={13} aria-hidden="true"/>
                    <span>Jatuh tempo {formatDue(item.dueAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="central-progress-focus-grid">
            {moduleReviewPriorities.length > 0 ? moduleReviewPriorities.map((module) => (
              <Link className="central-progress-focus-card" to={module.route} key={module.key}>
                <div className="central-progress-focus-icon" aria-hidden="true">
                  <Target size={18}/>
                </div>
                <div>
                  <strong>{module.title}</strong>
                  <span>{clampPercent(module.percent)}% · {module.metricValue}</span>
                </div>
                <ArrowRight size={15} aria-hidden="true"/>
              </Link>
            )) : notStarted.length > 0 ? notStarted.map((module) => (
              <Link className="central-progress-focus-card" to={module.route} key={module.key}>
                <div className="central-progress-focus-icon" aria-hidden="true">
                  <TrendingUp size={18}/>
                </div>
                <div>
                  <strong>{module.title}</strong>
                  <span>Belum dimulai</span>
                </div>
                <ArrowRight size={15} aria-hidden="true"/>
              </Link>
            )) : (
              <div className="central-progress-complete panel">
                <CheckCircle2 size={20} aria-hidden="true"/>
                <div>
                  <strong>Tidak ada review jatuh tempo</strong>
                  <span>Gunakan masing-masing modul untuk menjaga mastery.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section
        className="central-progress-section central-progress-achievement-section"
        aria-labelledby="central-progress-achievement-title"
      >
        <div className="dashboard-section-heading central-progress-achievement-heading">
          <div>
            <p className="eyebrow">PENCAPAIAN</p>
            <h2 id="central-progress-achievement-title">Achievement Kamu</h2>
          </div>
          <p>
            {achievementLoading
              ? 'Memuat pencapaian…'
              : `${unlockedAchievementCount} / ${achievements.length} Achievement Terbuka`}
          </p>
        </div>

        <div className="student-achievement-grid">
          {achievements.map((achievement) => (
            <ProgressAchievementCard
              key={achievement.id}
              achievement={achievement}
              loading={achievementLoading}
            />
          ))}
        </div>
      </section>

      <section className="central-progress-section" aria-labelledby="central-progress-activity-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">AKTIVITAS TERBARU</p>
            <h2 id="central-progress-activity-title">Riwayat Belajar</h2>
          </div>
          <p>
            Maksimal 12 aktivitas terbaru dari SRS, Reading, dan Listening.
          </p>
        </div>

        {detailLoading && !detail ? (
          <div className="central-progress-activity-list">
            {Array.from({ length: 4 }, (_, index) => (
              <span className="central-progress-activity-loading" key={index}/>
            ))}
          </div>
        ) : detail && detail.recentActivity.length > 0 ? (
          <div className="central-progress-activity-list">
            {detail.recentActivity.map((activity, index) => {
              const meta = MODULE_META[activity.moduleKey];
              const time = formatActivityTime(activity.occurredAt);

              return (
                <Link
                  to={meta.route}
                  className="central-progress-activity-item"
                  key={`${activity.moduleKey}-${activity.occurredAt}-${index}`}
                >
                  <div className="central-progress-activity-icon" aria-hidden="true">
                    {activity.activityType === 'review'
                      ? <RotateCcw size={16}/>
                      : <CheckCircle2 size={16}/>}
                  </div>
                  <div className="central-progress-activity-copy">
                    <div>
                      <strong>{activity.title}</strong>
                      <span>{meta.title}</span>
                    </div>
                    <p>{activity.detail}</p>
                  </div>
                  <time dateTime={activity.occurredAt}>{time ?? 'Aktivitas terbaru'}</time>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="central-progress-detail-fallback">
            Belum ada aktivitas detail yang tersimpan.
          </div>
        )}
      </section>
    </div>
  );
}
