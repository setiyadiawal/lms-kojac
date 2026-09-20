import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  Layers3,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StudentProgressOverview } from '../features/dashboard/StudentProgressOverview';
import {
  useStudentDashboardProgress,
  type DashboardModuleSummary,
} from '../features/dashboard/useStudentDashboardProgress';
import './progress-page.css';

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

  const reviewPriorities = activeModules
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

  return (
    <div className="page central-progress-page">
      <div className="page-header central-progress-header">
        <div>
          <p className="eyebrow">KOJAC LMS · READ ONLY</p>
          <h1>Progres Belajar</h1>
          <p>
            Ringkasan progres tersimpan dari 7 modul utama KOJAC tanpa membuat
            atau mengubah data belajar baru.
          </p>
        </div>

        <button
          type="button"
          className="ghost-btn central-progress-refresh"
          onClick={() => void reload()}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true"/>
          {loading ? 'Memuat…' : 'Muat ulang'}
        </button>
      </div>

      {hasPartialError && !initialLoading && (
        <div className="central-progress-warning" role="status">
          <AlertTriangle size={17} aria-hidden="true"/>
          <span>
            Sebagian data progres belum dapat dimuat. Modul belajar tetap aman
            dan dapat digunakan seperti biasa.
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
          value={initialLoading ? '…' : `${completedModules.length} / ${availableModules.length || 7}`}
          label="Modul 100%"
        />
        <SummaryStat
          icon={<Clock3 size={20}/>}
          value={initialLoading ? '…' : latestActivity ? latestActivity.title : 'Belum ada'}
          label="Aktivitas terbaru"
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
            <p className="eyebrow">AREA REVIEW</p>
            <h2 id="central-progress-review-title">Fokus Berikutnya</h2>
          </div>
          <p>
            Diurutkan otomatis dari modul yang sudah dimulai dengan progress
            terendah. Tidak mengubah jadwal atau mastery.
          </p>
        </div>

        <div className="central-progress-focus-grid">
          {reviewPriorities.length > 0 ? reviewPriorities.map((module) => (
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
                <strong>Semua modul utama sudah mencapai 100%</strong>
                <span>Tetap gunakan review pada masing-masing modul untuk menjaga mastery.</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
