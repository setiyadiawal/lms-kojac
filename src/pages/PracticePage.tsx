import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Gauge,
  RefreshCw,
  RotateCcw,
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
import { CrossChapterPractice } from '../features/practice/CrossChapterPractice';
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

function formatDue(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Jatuh tempo';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(date);
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

      <CrossChapterPractice />

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
              <span>Gunakan Latihan Lintas Bab untuk melanjutkan latihan.</span>
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
