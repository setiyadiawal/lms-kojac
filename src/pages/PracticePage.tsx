import {
  ArrowRight,
  Brain,
  BookOpenCheck,
  BookOpenText,
  CheckCircle2,
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

export function PracticePage() {
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

  const moduleMap = new Map(modules.map((module) => [module.key, module]));
  const activeModules = modules.filter(moduleStarted);

  const weakestStarted = activeModules.length > 0
    ? [...activeModules].sort((a, b) => clampPercent(a.percent) - clampPercent(b.percent))[0]
    : null;

  const dueByModule = new Map(
    (detail?.reviewSummary ?? []).map((row) => [row.moduleKey, row.dueCount]),
  );

  const totalDue = detail?.srsOverall.dueNow ?? 0;
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
            Pusat latihan existing KOJAC. Pilih modul lalu gunakan Flashcard,
            Quiz, SRS, Dokkai, atau Choukai yang sudah tersedia.
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
          <div className="practice-center-summary-icon"><CheckCircle2 size={20}/></div>
          <div>
            <strong>{loading ? '…' : `${activeModules.length} / 7`}</strong>
            <span>Modul sudah dimulai</span>
          </div>
        </article>
        <article>
          <div className="practice-center-summary-icon"><Target size={20}/></div>
          <div>
            <strong>{loading ? '…' : weakestStarted ? weakestStarted.title : 'Belum ada'}</strong>
            <span>Fokus latihan berikutnya</span>
          </div>
        </article>
      </section>

      {weakestStarted && (
        <section className="practice-center-recommendation panel">
          <div>
            <p className="eyebrow">REKOMENDASI FOKUS</p>
            <h2>{weakestStarted.title}</h2>
            <p>
              Progress saat ini {clampPercent(weakestStarted.percent)}%.
              Gunakan latihan existing pada modul ini untuk memperkuat mastery.
            </p>
          </div>
          <Link to={weakestStarted.route} className="practice-center-primary-link">
            Buka modul <ArrowRight size={16}/>
          </Link>
        </section>
      )}

      <section className="practice-center-section" aria-labelledby="practice-center-modules-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">LATIHAN PER MODUL</p>
            <h2 id="practice-center-modules-title">Pilih Modul</h2>
          </div>
          <p>
            Halaman ini tidak membuat engine latihan baru. Semua latihan tetap dijalankan pada modul aslinya.
          </p>
        </div>

        <div className="practice-center-grid">
          {PRACTICE_MODULES.map((item) => {
            const progress = moduleMap.get(item.key);
            const percent = progress?.available ? clampPercent(progress.percent) : 0;
            const due = dueByModule.get(item.key) ?? 0;

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
      </section>

      <section className="practice-center-note panel">
        <Gauge size={20} aria-hidden="true"/>
        <div>
          <strong>Progress tetap mengikuti aturan modul asli</strong>
          <p>
            Contohnya, latihan Tata Bahasa tidak menaikkan progress formal bila modul tersebut
            memang hanya menghitung Quiz atau Review SRS. Latihan Center tidak mengubah aturan mastery.
          </p>
        </div>
      </section>

      <section className="practice-center-section practice-center-exam-teaser" aria-labelledby="practice-center-exam-title">
        <div className="practice-center-exam-icon"><Trophy size={22}/></div>
        <div>
          <p className="eyebrow">TAHAP BERIKUTNYA</p>
          <h2 id="practice-center-exam-title">Simulasi JLPT tetap terpisah</h2>
          <p>
            Latihan Center fokus pada latihan modul existing. Simulasi JLPT akan menggunakan flow ujian tersendiri.
          </p>
        </div>
      </section>
    </div>
  );
}
