import {
  Award,
  ArrowRight,
  BookMarked,
  BookOpenCheck,
  BookOpenText,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Gauge,
  Headphones,
  Languages,
  LockKeyhole,
  PlaneTakeoff,
  SpellCheck,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  evaluateStudentAchievements,
  type Achievement,
} from '../features/dashboard/studentAchievements';
import {
  useStudentDashboardProgress,
  type DashboardModuleKey,
  type DashboardModuleSummary,
} from '../features/dashboard/useStudentDashboardProgress';
import { useStudentStudyStreak } from '../features/dashboard/useStudentStudyStreak';
import { useAuth } from '../state/AuthContext';

const ROADMAP_STAGES = [
  {
    number: 1,
    title: 'Kelas Semi Privat',
    duration: '8 bulan',
    description: 'Dari 0 – JFT A2 / JLPT N4',
    target: 'Lulus JFT Basic A2 / JLPT N4',
    status: 'Program Utama',
  },
  {
    number: 2,
    title: 'Kelas SSW',
    duration: '1–2 bulan',
    description: 'Persiapan ujian keterampilan bidang SSW',
    target: 'Lulus Ujian SSW',
    status: 'Tahap Lanjutan',
  },
  {
    number: 3,
    title: 'Kelas Kaiwa / Percakapan',
    duration: '1 bulan',
    description: 'Latihan komunikasi untuk situasi nyata di Jepang',
    target: 'Percakapan lancar',
    status: 'Tahap Lanjutan',
  },
  {
    number: 4,
    title: 'Kelas Mensetsu / Wawancara',
    duration: '3 minggu',
    description: 'Persiapan wawancara kerja bersama perusahaan Jepang',
    target: 'Persiapan wawancara kerja',
    status: 'Tahap Lanjutan',
  },
] as const;

const ROADMAP_MILESTONES = [
  'Lulus JFT Basic A2 / JLPT N4',
  'Lulus Ujian SSW',
  'Wawancara perusahaan',
  'Lulus wawancara',
  'Pengurusan dokumen, MCU, dsb.',
  'Berangkat ke Jepang',
] as const;

function firstName(fullName?: string | null) {
  const trimmed = fullName?.trim();
  if (!trimmed) return 'Siswa';
  return trimmed.split(/\s+/)[0] || 'Siswa';
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function ModuleIcon({ module }: { module: DashboardModuleKey }) {
  if (module === 'hiragana') return <Languages size={21}/>;
  if (module === 'katakana') return <SpellCheck size={21}/>;
  if (module === 'vocabulary') return <BookMarked size={21}/>;
  if (module === 'kanji') return <BookOpenCheck size={21}/>;
  if (module === 'grammar') return <BrainCircuit size={21}/>;
  if (module === 'reading') return <BookOpenText size={21}/>;
  return <Headphones size={21}/>;
}

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ModuleCard({ module, loading }: { module: DashboardModuleSummary; loading: boolean }) {
  return (
    <article className="student-module-card">
      <div className="student-module-card-top">
        <div className="dashboard-module-icon"><ModuleIcon module={module.key}/></div>
        <div>
          <span className="dashboard-module-kicker">MODUL BELAJAR</span>
          <h3>{module.title}</h3>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-module-loading" aria-label={`Memuat progress ${module.title}`}>
          <span />
          <span />
          <span />
        </div>
      ) : (
        <>
          <div className="dashboard-module-metric">
            <span>{module.metricLabel}</span>
            <strong>{module.metricValue}</strong>
          </div>
          <p className="dashboard-module-detail">{module.detail}</p>
          <div className="dashboard-progress-row">
            <span>{module.percentLabel}</span>
            <strong>{module.available ? `${module.percent}%` : '—'}</strong>
          </div>
          <div className="dashboard-progress-track" aria-hidden="true">
            <span style={{ width: module.available ? `${module.percent}%` : '0%' }} />
          </div>
        </>
      )}

      <Link className="dashboard-module-link" to={module.route}>
        Buka modul <ArrowRight size={16}/>
      </Link>
    </article>
  );
}

function AchievementIcon({ achievement }: { achievement: Achievement }) {
  if (achievement.category === 'general') return <Award size={21}/>;
  return <ModuleIcon module={achievement.category}/>;
}

function AchievementCard({ achievement, loading }: { achievement: Achievement; loading: boolean }) {
  const status = loading ? 'Memuat' : achievement.unlocked ? 'Tercapai' : 'Terkunci';
  const progressText = loading ? 'Memuat progress…' : achievement.progressText;
  const progressValue = loading ? 0 : achievement.progressPercent;

  return (
    <article className={`student-achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'} ${loading ? 'loading' : ''}`}>
      <div className="student-achievement-card-top">
        <div className="achievement-icon" aria-hidden="true">
          <AchievementIcon achievement={achievement}/>
        </div>
        <span className={`achievement-status ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
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

function StreakCard({
  icon,
  value,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div className={`dashboard-streak-card ${active ? 'active' : ''}`}>
      <div className="dashboard-streak-icon" aria-hidden="true">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { profile } = useAuth();
  const {
    modules,
    latestActivity,
    loading,
    hasPartialError,
  } = useStudentDashboardProgress();
  const {
    streak,
    loading: streakLoading,
    hasError: streakHasError,
  } = useStudentStudyStreak();

  const continueTarget = latestActivity ?? {
    module: 'hiragana' as const,
    title: 'Hiragana',
    route: '/belajar/hiragana',
    timestamp: '',
  };
  const lastActivityText = latestActivity ? formatActivityTime(latestActivity.timestamp) : null;
  const hiragana = modules.find((module) => module.key === 'hiragana');
  const reading = modules.find((module) => module.key === 'reading');
  const listening = modules.find((module) => module.key === 'listening');
  const summaryFallback = loading ? 'Memuat…' : '—';
  const achievements = evaluateStudentAchievements(modules);
  const unlockedAchievementCount = achievements.filter((achievement) => achievement.unlocked).length;
  const achievementLoading = loading && modules.length === 0;
  const streakFallback = streakLoading ? 'Memuat…' : streak.available ? '0' : '—';
  const todayStatus = streakLoading
    ? 'Memuat…'
    : !streak.available
      ? '—'
      : streak.activeToday ? 'Sudah' : 'Belum';

  return (
    <div className="page student-dashboard-page">
      <div className="page-header student-dashboard-header">
        <div>
          <p className="eyebrow">おかえりなさい</p>
          <h1>Selamat datang, {firstName(profile?.full_name)} 👋</h1>
          <p>Lanjutkan perjalanan belajarmu bersama KOJAC hari ini.</p>
        </div>
        <span className="level-badge">Kuuhaku System · ± 1 Tahun</span>
      </div>

      <section className="stats-grid dashboard-summary-grid" aria-label="Ringkasan progress siswa">
        <SummaryCard
          icon={<Languages size={20}/>} 
          value={hiragana?.metricValue ?? summaryFallback}
          label="Hiragana dikuasai"
        />
        <SummaryCard
          icon={<Gauge size={20}/>} 
          value={hiragana?.available ? `${hiragana.percent}%` : summaryFallback}
          label="Mastery Hiragana"
        />
        <SummaryCard
          icon={<BookOpenText size={20}/>} 
          value={reading?.metricValue ?? summaryFallback}
          label="Reading selesai"
        />
        <SummaryCard
          icon={<Headphones size={20}/>} 
          value={listening?.metricValue ?? summaryFallback}
          label="Listening selesai"
        />
      </section>

      <section className="dashboard-continue panel">
        <div className="dashboard-continue-copy">
          <p className="eyebrow">LANJUT BELAJAR</p>
          <h2>{latestActivity ? `Lanjutkan ${continueTarget.title}` : 'Mulai dari Hiragana'}</h2>
          <p>
            {latestActivity
              ? `Aktivitas belajar terbaru${lastActivityText ? ` · ${lastActivityText}` : ''}.`
              : 'Belum ada aktivitas tersimpan. Mulai perjalananmu dari dasar huruf Jepang.'}
          </p>
        </div>
        <Link className="dashboard-continue-link" to={continueTarget.route}>
          {latestActivity ? 'Lanjutkan belajar' : 'Mulai belajar'} <ArrowRight size={17}/>
        </Link>
      </section>

      <section
        className={`dashboard-streak-section panel ${streak.available && streak.activeToday ? 'active' : ''}`}
        aria-labelledby="dashboard-streak-title"
      >
        <div className="dashboard-section-heading dashboard-streak-heading">
          <div>
            <p className="eyebrow">STREAK BELAJAR</p>
            <h2 id="dashboard-streak-title">Konsistensi Belajar</h2>
          </div>
          <p>
            {streakLoading
              ? 'Memuat aktivitas harian…'
              : !streak.available
                ? 'Data streak belum dapat dimuat.'
                : streak.activeToday
                  ? 'Aktivitas belajar hari ini sudah tercatat.'
                  : streak.totalActiveDays > 0
                    ? 'Belum ada aktivitas belajar yang tercatat hari ini.'
                    : 'Mulai belajar untuk membangun streak pertamamu.'}
          </p>
        </div>

        <div className="dashboard-streak-grid">
          <StreakCard
            icon={<Gauge size={20}/>}
            value={streak.available ? `${streak.currentStreak} hari` : streakFallback}
            label="Streak Saat Ini"
            active={streak.available && streak.currentStreak > 0}
          />
          <StreakCard
            icon={<Award size={20}/>}
            value={streak.available ? `${streak.longestStreak} hari` : streakFallback}
            label="Streak Terpanjang"
          />
          <StreakCard
            icon={<CalendarDays size={20}/>}
            value={streak.available ? `${streak.totalActiveDays} hari` : streakFallback}
            label="Total Hari Aktif"
          />
          <StreakCard
            icon={<CheckCircle2 size={20}/>}
            value={todayStatus}
            label="Belajar Hari Ini"
            active={streak.available && streak.activeToday}
          />
        </div>

        {streakHasError && !streakLoading && (
          <div className="dashboard-streak-notice" role="status">
            Streak belum dapat dimuat. Progress belajar lainnya tetap aman dan dapat digunakan.
          </div>
        )}
      </section>

      {hasPartialError && !loading && (
        <div className="dashboard-safe-notice" role="status">
          Sebagian progress belum dapat dimuat. Semua modul tetap bisa dibuka dan digunakan.
        </div>
      )}

      <section className="dashboard-module-section">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">PROGRESS PER MODUL</p>
            <h2>Belajar sesuai progresmu</h2>
          </div>
          <p>Setiap modul memakai metric yang sesuai dengan sistem belajarnya.</p>
        </div>

        <div className="student-module-grid">
          {loading && modules.length === 0
            ? (['hiragana', 'katakana', 'vocabulary', 'kanji', 'grammar', 'reading', 'listening'] as DashboardModuleKey[]).map((key) => (
                <ModuleCard
                  key={key}
                  loading
                  module={{
                    key,
                    title: {
                      hiragana: 'Hiragana',
                      katakana: 'Katakana',
                      vocabulary: 'Kosakata',
                      kanji: 'Kanji',
                      grammar: 'Tata Bahasa',
                      reading: 'Reading / 読解',
                      listening: 'Listening / 聴解',
                    }[key],
                    route: {
                      hiragana: '/belajar/hiragana',
                      katakana: '/belajar/katakana',
                      vocabulary: '/belajar/kosakata',
                      kanji: '/belajar/kanji',
                      grammar: '/belajar/tata-bahasa',
                      reading: '/belajar/reading',
                      listening: '/belajar/listening',
                    }[key],
                    metricLabel: 'Progress',
                    metricValue: 'Memuat…',
                    detail: 'Memuat progress tersimpan…',
                    percentLabel: 'Memuat',
                    percent: 0,
                    available: false,
                  }}
                />
              ))
            : modules.map((module) => <ModuleCard key={module.key} module={module} loading={false}/>)}
        </div>
      </section>

      <section className="dashboard-achievement-section" aria-labelledby="dashboard-achievement-title">
        <div className="dashboard-section-heading dashboard-achievement-heading">
          <div>
            <p className="eyebrow">PENCAPAIAN</p>
            <h2 id="dashboard-achievement-title">Achievement Kamu</h2>
          </div>
          <p>
            {achievementLoading
              ? 'Memuat pencapaian…'
              : `${unlockedAchievementCount} / ${achievements.length} Achievement Terbuka`}
          </p>
        </div>

        <div className="student-achievement-grid">
          {achievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              loading={achievementLoading}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-roadmap-section" aria-labelledby="dashboard-roadmap-title">
        <div className="dashboard-section-heading dashboard-roadmap-heading">
          <div>
            <p className="eyebrow">JALUR BELAJAR KOJAC</p>
            <h2 id="dashboard-roadmap-title">Kuuhaku System: From Zero to Japan</h2>
          </div>
          <p>Estimasi perjalanan belajar utama sekitar ± 1 tahun, dari dasar bahasa hingga persiapan bekerja di Jepang.</p>
        </div>

        <div className="kojac-roadmap-grid">
          {ROADMAP_STAGES.map((stage) => (
            <article key={stage.number} className={`kojac-roadmap-card ${stage.number === 1 ? 'current' : ''}`}>
              <div className="kojac-roadmap-card-top">
                <span className="kojac-roadmap-number">{stage.number}</span>
                <span className="kojac-roadmap-status">{stage.status}</span>
              </div>
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>
              <div className="kojac-roadmap-meta">
                <span><CalendarDays size={15}/> {stage.duration}</span>
                <span><Target size={15}/> {stage.target}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="kojac-milestone-panel">
          <div className="kojac-milestone-heading">
            <div className="dashboard-module-icon"><PlaneTakeoff size={21}/></div>
            <div>
              <span className="dashboard-module-kicker">MILESTONE</span>
              <h3>Target perjalanan menuju Jepang</h3>
            </div>
          </div>
          <div className="kojac-milestone-grid">
            {ROADMAP_MILESTONES.map((milestone) => (
              <div key={milestone} className="kojac-milestone-item">
                <CheckCircle2 size={16}/>
                <span>{milestone}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
