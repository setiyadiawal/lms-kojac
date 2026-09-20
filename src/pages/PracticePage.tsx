import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Brain,
  BookOpenCheck,
  BookOpenText,
  CheckCircle2,
  CircleAlert,
  Gauge,
  Headphones,
  Languages,
  ListChecks,
  RefreshCw,
  RotateCcw,
  SpellCheck,
  Target,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useStudentDashboardProgress,
  type DashboardModuleKey,
  type DashboardModuleSummary,
} from '../features/dashboard/useStudentDashboardProgress';
import { useStudentProgressDetail } from '../features/progress/useStudentProgressDetail';
import './practice-page.css';

type PracticeModule = {
  key: DashboardModuleKey;
  title: string;
  description: string;
  route: string;
  modes: string[];
};

type PracticeFilter = 'all' | 'review' | 'weak' | 'not-started';

const PRACTICE_MODULES: PracticeModule[] = [
  {
    key: 'hiragana',
    title: 'Hiragana',
    description: 'Kuatkan bentuk dan bunyi huruf dasar Jepang.',
    route: '/belajar/hiragana',
    modes: ['Flashcard', 'Quiz'],
  },
  {
    key: 'katakana',
    title: 'Katakana',
    description: 'Latih pengenalan Katakana dan bunyi dengan pengulangan aktif.',
    route: '/belajar/katakana',
    modes: ['Flashcard', 'Quiz'],
  },
  {
    key: 'vocabulary',
    title: 'Kosakata',
    description: 'Review kosakata per bab dengan Flashcard, Quiz, dan SRS.',
    route: '/belajar/kosakata',
    modes: ['Flashcard', 'Quiz', 'SRS'],
  },
  {
    key: 'kanji',
    title: 'Kanji',
    description: 'Latih arti, cara baca, kosakata terkait, dan recall Kanji.',
    route: '/belajar/kanji',
    modes: ['Flashcard', 'Quiz', 'SRS'],
  },
  {
    key: 'grammar',
    title: 'Tata Bahasa',
    description: 'Latihan pola, Quiz, dan review SRS untuk Bunpō.',
    route: '/belajar/tata-bahasa',
    modes: ['Latihan', 'Quiz', 'SRS'],
  },
  {
    key: 'reading',
    title: 'Reading / 読解',
    description: 'Latihan memahami bacaan dan menjawab pertanyaan berdasarkan teks.',
    route: '/belajar/reading',
    modes: ['Dokkai', 'Soal Pemahaman'],
  },
  {
    key: 'listening',
    title: 'Listening / 聴解',
    description: 'Latihan memahami dialog, pengumuman, dan situasi lisan.',
    route: '/belajar/listening',
    modes: ['Choukai', 'Soal Pemahaman'],
  },
];

const FILTERS: Array<{ value: PracticeFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'review', label: 'Perlu Review' },
  { value: 'weak', label: 'Mastery Lemah' },
  { value: 'not-started', label: 'Belum Dimulai' },
];

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function moduleStarted(module?: DashboardModuleSummary) {
  if (!module?.available || !module.progress) return false;

  if (module.key === 'reading' || module.key === 'listening') {
    return module.progress.completed > 0;
  }

  return module.progress.started > 0;
}

function PracticeIcon({ module }: { module: DashboardModuleKey }) {
  if (module === 'hiragana') return <Languages size={21}/>;
  if (module === 'katakana') return <SpellCheck size={21}/>;
  if (module === 'vocabulary') return <Brain size={21}/>;
  if (module === 'kanji') return <BookOpenCheck size={21}/>;
  if (module === 'grammar') return <ListChecks size={21}/>;
  if (module === 'reading') return <BookOpenText size={21}/>;
  return <Headphones size={21}/>;
}

function formatDue(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Jatuh tempo';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(date);
}

export function PracticePage() {
  const [filter, setFilter] = useState<PracticeFilter>('all');

  const {
    modules,
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

  const moduleMap = useMemo(
    () => new Map(modules.map((module) => [module.key, module])),
    [modules],
  );

  const reviewSummaryMap = useMemo(
    () => new Map(
      (detail?.reviewSummary ?? []).map((row) => [row.moduleKey, row]),
    ),
    [detail],
  );

  const activeModules = modules.filter(moduleStarted);
  const totalDue = detail?.srsOverall.dueNow ?? 0;
  const totalWeak = (detail?.reviewSummary ?? []).reduce(
    (sum, row) => sum + row.weakCount,
    0,
  );

  const rankedFocus = useMemo(() => {
    return PRACTICE_MODULES
      .map((item) => {
        const progress = moduleMap.get(item.key);
        const review = reviewSummaryMap.get(item.key);
        return {
          item,
          progress,
          due: review?.dueCount ?? 0,
          weak: review?.weakCount ?? 0,
          percent: progress?.available ? clampPercent(progress.percent) : 0,
          started: moduleStarted(progress),
        };
      })
      .filter((row) => row.started)
      .sort((a, b) =>
        b.due - a.due
        || b.weak - a.weak
        || a.percent - b.percent,
      );
  }, [moduleMap, reviewSummaryMap]);

  const topFocus = rankedFocus[0] ?? null;

  const visibleModules = useMemo(() => {
    return PRACTICE_MODULES.filter((item) => {
      if (filter === 'all') return true;

      const progress = moduleMap.get(item.key);
      const review = reviewSummaryMap.get(item.key);

      if (filter === 'review') return (review?.dueCount ?? 0) > 0;
      if (filter === 'weak') return (review?.weakCount ?? 0) > 0;
      return !moduleStarted(progress);
    });
  }, [filter, moduleMap, reviewSummaryMap]);

  const anyLoading = loading || detailLoading;
  const partialError = hasPartialError || detailHasError;

  const reloadAll = async () => {
    await Promise.all([reload(), reloadDetail()]);
  };

  return (
    <div className="page practice-center-page">
      <div className="page-header practice-center-header">
        <div>
          <p className="eyebrow">KOJAC LMS</p>
          <h1>Latihan</h1>
          <p>
            Pusat latihan existing KOJAC dengan rekomendasi berdasarkan progress,
            mastery, dan jadwal review yang sudah tersimpan.
          </p>
        </div>

        <button
          type="button"
          className="ghost-btn practice-center-refresh"
          onClick={() => void reloadAll()}
          disabled={anyLoading}
        >
          <RefreshCw size={16} aria-hidden="true"/>
          {anyLoading ? 'Memuat…' : 'Muat ulang'}
        </button>
      </div>

      {partialError && !anyLoading && (
        <div className="practice-center-warning" role="status">
          Sebagian status progress belum dapat dimuat. Semua modul latihan tetap dapat dibuka.
        </div>
      )}

      <section className="practice-center-summary" aria-label="Ringkasan latihan">
        <article>
          <div className="practice-center-summary-icon"><RotateCcw size={20}/></div>
          <div>
            <strong>{detailLoading ? '…' : detail ? String(totalDue) : '—'}</strong>
            <span>Review SRS jatuh tempo</span>
          </div>
        </article>
        <article>
          <div className="practice-center-summary-icon"><CircleAlert size={20}/></div>
          <div>
            <strong>{detailLoading ? '…' : detail ? String(totalWeak) : '—'}</strong>
            <span>Item mastery &lt; 60</span>
          </div>
        </article>
        <article>
          <div className="practice-center-summary-icon"><CheckCircle2 size={20}/></div>
          <div>
            <strong>{loading ? '…' : `${activeModules.length} / 7`}</strong>
            <span>Modul sudah dimulai</span>
          </div>
        </article>
        <article>
          <div className="practice-center-summary-icon"><Target size={20}/></div>
          <div>
            <strong>{anyLoading ? '…' : topFocus ? topFocus.item.title : 'Belum ada'}</strong>
            <span>Fokus latihan berikutnya</span>
          </div>
        </article>
      </section>

      {topFocus && (
        <section className="practice-center-recommendation panel">
          <div>
            <p className="eyebrow">REKOMENDASI FOKUS</p>
            <h2>{topFocus.item.title}</h2>
            <p>
              {topFocus.due > 0
                ? `${topFocus.due} review sudah jatuh tempo`
                : `${topFocus.weak} item mastery lemah`}
              {' · '}progress modul {topFocus.percent}%.
            </p>
          </div>
          <Link to={topFocus.item.route} className="practice-center-primary-link">
            Buka modul <ArrowRight size={16}/>
          </Link>
        </section>
      )}

      <section className="practice-center-section" aria-labelledby="practice-review-queue-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">REVIEW QUEUE</p>
            <h2 id="practice-review-queue-title">Review yang Perlu Dikerjakan</h2>
          </div>
          <p>
            Diambil dari SRS existing dan diurutkan dari mastery terendah.
          </p>
        </div>

        {detailLoading && !detail ? (
          <div className="practice-review-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <span className="practice-review-loading" key={index}/>
            ))}
          </div>
        ) : detail && detail.reviewPriorities.length > 0 ? (
          <div className="practice-review-grid">
            {detail.reviewPriorities.map((row, index) => {
              const module = PRACTICE_MODULES.find((item) => item.key === row.moduleKey);
              if (!module) return null;

              return (
                <Link
                  className="practice-review-card"
                  to={module.route}
                  key={`${row.moduleKey}-${row.title}-${row.dueAt}-${index}`}
                >
                  <div className="practice-review-card-top">
                    <span>{module.title}</span>
                    <strong>{row.masteryScore}%</strong>
                  </div>

                  <h3>{row.title}</h3>
                  {row.reading && <p className="practice-review-reading">{row.reading}</p>}
                  {row.meaning && <p>{row.meaning}</p>}

                  <div className="practice-review-footer">
                    <span>Due {formatDue(row.dueAt)}</span>
                    <ArrowRight size={14}/>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="practice-center-empty">
            <CheckCircle2 size={20}/>
            <div>
              <strong>Tidak ada item review jatuh tempo</strong>
              <span>Pilih modul di bawah untuk melanjutkan latihan reguler.</span>
            </div>
          </div>
        )}
      </section>

      <section className="practice-center-section" aria-labelledby="practice-center-modules-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">LATIHAN PER MODUL</p>
            <h2 id="practice-center-modules-title">Pilih Modul</h2>
          </div>
          <p>
            Filter hanya mengubah tampilan Latihan Center. Progress dan mastery tidak diubah.
          </p>
        </div>

        <div className="practice-filter-row" role="group" aria-label="Filter modul latihan">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? 'active' : ''}
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {visibleModules.length > 0 ? (
          <div className="practice-center-grid">
            {visibleModules.map((item) => {
              const progress = moduleMap.get(item.key);
              const percent = progress?.available ? clampPercent(progress.percent) : 0;
              const review = reviewSummaryMap.get(item.key);
              const due = review?.dueCount ?? 0;
              const weak = review?.weakCount ?? 0;

              return (
                <article className="practice-center-card" key={item.key}>
                  <div className="practice-center-card-top">
                    <div className="practice-center-card-icon">
                      <PracticeIcon module={item.key}/>
                    </div>
                    <div>
                      <span>MODUL LATIHAN</span>
                      <h3>{item.title}</h3>
                    </div>
                    {due > 0 && (
                      <span className="practice-center-due-badge">
                        {due > 99 ? '99+' : due} due
                      </span>
                    )}
                  </div>

                  <p className="practice-center-card-description">{item.description}</p>

                  <div className="practice-center-mode-list" aria-label={`Mode latihan ${item.title}`}>
                    {item.modes.map((mode) => <span key={mode}>{mode}</span>)}
                  </div>

                  {(due > 0 || weak > 0) && (
                    <div className="practice-center-health">
                      {due > 0 && <span><RotateCcw size={12}/>{due} due</span>}
                      {weak > 0 && <span><CircleAlert size={12}/>{weak} lemah</span>}
                    </div>
                  )}

                  <div className="practice-center-progress-row">
                    <span>Progress existing</span>
                    <strong>{progress?.available ? `${percent}%` : '—'}</strong>
                  </div>
                  <div className="practice-center-progress-track" aria-hidden="true">
                    <span style={{ width: progress?.available ? `${percent}%` : '0%' }}/>
                  </div>

                  <Link className="practice-center-module-link" to={item.route}>
                    Mulai latihan <ArrowRight size={15}/>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="practice-center-empty">
            <Gauge size={20}/>
            <div>
              <strong>Tidak ada modul pada filter ini</strong>
              <span>Pilih filter lain untuk melihat modul latihan.</span>
            </div>
          </div>
        )}
      </section>

      <section className="practice-center-note panel">
        <Gauge size={20} aria-hidden="true"/>
        <div>
          <strong>Progress tetap mengikuti aturan modul asli</strong>
          <p>
            Latihan Center hanya membaca progress dan mengarahkan ke modul existing.
            Tidak ada skor, mastery, due date, atau SRS yang dimodifikasi dari halaman ini.
          </p>
        </div>
      </section>

      <section className="practice-center-section practice-center-exam-teaser" aria-labelledby="practice-center-exam-title">
        <div className="practice-center-exam-icon"><Trophy size={22}/></div>
        <div>
          <p className="eyebrow">UJIAN JLPT</p>
          <h2 id="practice-center-exam-title">Simulasi JLPT N5/N4 sudah tersedia</h2>
          <p>
            Latihan Center fokus pada latihan harian dan review. Gunakan menu Ujian untuk menjalankan Simulasi JLPT N5 atau N4.
          </p>
        </div>
      </section>
    </div>
  );
}
