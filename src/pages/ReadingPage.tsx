import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Clock, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGrammarPattern } from '../features/grammar/grammarData';
import { ReadingEngine } from '../features/reading/ReadingEngine';
import {
  READING_CHAPTERS,
  READING_ITEMS,
  getReadingItem,
  getReadingsByChapter,
} from '../features/reading/readingData';
import {
  getReadingProgressStats,
  getReadingProgressStatus,
  getReadingStatusLabel,
  readingMatchesProgressFilter,
  type ReadingProgressFilter,
  useReadingProgress,
} from '../features/reading/useReadingProgress';
import '../features/reading/reading.css';
import '../features/reading/reading-progress.css';

export function ReadingPage() {
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedReadingId, setSelectedReadingId] = useState<string | null>(null);
  const [progressFilter, setProgressFilter] = useState<ReadingProgressFilter>('all');
  const { progressByReadingId, loading: progressLoading, error: progressError, recordCompletion } = useReadingProgress();

  const selectedReading = selectedReadingId ? getReadingItem(selectedReadingId) : undefined;
  const chapterReadings = selectedReading
    ? getReadingsByChapter(selectedReading.chapter)
    : selectedChapter
      ? getReadingsByChapter(selectedChapter)
      : [];
  const chapterInfo = selectedChapter
    ? READING_CHAPTERS.find((chapter) => chapter.chapter === selectedChapter)
    : undefined;

  const difficultyCounts = useMemo(() => READING_ITEMS.reduce<Record<string, number>>((acc, item) => {
    acc[item.difficulty] = (acc[item.difficulty] ?? 0) + 1;
    return acc;
  }, {}), []);
  const globalProgressStats = useMemo(
    () => getReadingProgressStats(READING_ITEMS, progressByReadingId),
    [progressByReadingId],
  );
  const filteredChapterReadings = useMemo(
    () => chapterReadings.filter((reading) => readingMatchesProgressFilter(progressByReadingId[reading.id], progressFilter)),
    [chapterReadings, progressByReadingId, progressFilter],
  );

  function openChapter(chapter: number) {
    setProgressFilter('all');
    setSelectedReadingId(null);
    setSelectedChapter(chapter);
  }

  function openReading(readingId: string) {
    const item = getReadingItem(readingId);
    if (!item) return;
    setSelectedChapter(item.chapter);
    setSelectedReadingId(item.id);
  }

  if (selectedReading) {
    return <div className="reading-page page">
      <div className="reading-breadcrumb">
        <Link to="/belajar"><BookOpen size={14} /> Belajar</Link>
        <span>/</span>
        <button type="button" onClick={() => {
          setSelectedReadingId(null);
          setSelectedChapter(null);
        }}>Reading</button>
        <span>/</span>
        <button type="button" onClick={() => setSelectedReadingId(null)}>Bab {selectedReading.chapter}</button>
      </div>

      <ReadingEngine
        key={selectedReading.id}
        reading={selectedReading}
        chapterReadings={chapterReadings}
        progress={progressByReadingId[selectedReading.id] ?? null}
        onRecordCompletion={recordCompletion}
        onBackToList={() => setSelectedReadingId(null)}
        onOpenReading={openReading}
      />
    </div>;
  }

  return <div className="reading-page page">
    <div className="reading-breadcrumb">
      <Link to="/belajar"><BookOpen size={14} /> Belajar</Link>
      <span>/</span>
      <span>Reading</span>
      {selectedChapter && <>
        <span>/</span>
        <span>Bab {selectedChapter}</span>
      </>}
    </div>

    {!selectedChapter ? <>
      <header className="reading-page-header page-header">
        <div>
          <p className="eyebrow">KOJAC READING · PHASE 1</p>
          <h1><span>読解</span><small>Reading</small></h1>
          <p>Latih kemampuan memahami bacaan bahasa Jepang secara bertahap berdasarkan kosakata, Kanji, dan pola tata bahasa yang telah dipelajari.</p>
        </div>
        <div className="reading-pilot-badge" aria-label={`${READING_ITEMS.length} bacaan pilot`}>
          <strong>{READING_ITEMS.length}</strong>
          <span>Bacaan Pilot</span>
        </div>
      </header>

      <section className="reading-overview-strip" aria-label="Ringkasan pilot Reading">
        <div><strong>{READING_CHAPTERS.length}</strong><span>Bab Pilot</span></div>
        <div><strong>{difficultyCounts.Mudah ?? 0}</strong><span>Mudah</span></div>
        <div><strong>{difficultyCounts.Sedang ?? 0}</strong><span>Sedang</span></div>
        <div><strong>{difficultyCounts.Menantang ?? 0}</strong><span>Menantang</span></div>
      </section>

      <section className="reading-progress-overview" aria-label="Progress Reading keseluruhan">
        <div><strong>{globalProgressStats.completed}</strong><span>Selesai</span></div>
        <div><strong>{globalProgressStats.mastered}</strong><span>Dikuasai</span></div>
        <div><strong>{globalProgressStats.repeat}</strong><span>Perlu Diulang</span></div>
        <div><strong>{globalProgressStats.averageAccuracy}%</strong><span>Akurasi</span></div>
        <div><strong>{globalProgressStats.progressPercent}%</strong><span>Progress</span></div>
      </section>
      {progressLoading && <p className="reading-progress-system-note">Memuat progress Reading…</p>}
      {progressError && <p className="reading-progress-system-note warning">Progress belum dapat dimuat: {progressError}</p>}

      <div className="reading-section-heading">
        <div>
          <p className="reading-kicker">DOKKAI PER BAB</p>
          <h2>Pilih Bab untuk membaca</h2>
          <p>Reading bersifat kumulatif: bacaan di Bab yang lebih tinggi boleh menggunakan materi dari Bab sebelumnya.</p>
        </div>
      </div>

      <div className="reading-chapter-grid">
        {READING_CHAPTERS.map((chapter) => {
          const difficulties = [...new Set(chapter.items.map((item) => item.difficulty))];
          const chapterProgress = getReadingProgressStats(chapter.items, progressByReadingId);
          return <article className="reading-chapter-card" key={chapter.chapter}>
            <div className="reading-chapter-number"><span>BAB</span><strong>{chapter.chapter}</strong></div>
            <div className="reading-chapter-copy">
              <p>{chapter.items[0]?.jlptLevel ?? 'N5'}</p>
              <h3>{chapter.title}</h3>
              <span>{chapter.description}</span>
              <div className="reading-chapter-meta">
                <strong>{chapter.items.length} Bacaan</strong>
                <span>{difficulties.join(' · ')}</span>
              </div>
              <div className="reading-chapter-progress">
                <div><span>{chapterProgress.completed} selesai</span><span>{chapterProgress.mastered} dikuasai</span>{chapterProgress.repeat > 0 && <span>{chapterProgress.repeat} perlu diulang</span>}</div>
                <div className="reading-progress-bar" aria-label={`Progress Bab ${chapter.chapter} ${chapterProgress.progressPercent}%`}><i style={{ width: `${chapterProgress.progressPercent}%` }} /></div>
                <small>{chapterProgress.averageAccuracy}% rata-rata akurasi · {chapterProgress.progressPercent}% progress</small>
              </div>
            </div>
            <button type="button" onClick={() => openChapter(chapter.chapter)}>
              Lihat Bacaan <ChevronRight size={16} />
            </button>
          </article>;
        })}
      </div>
    </> : <>
      <button className="reading-back-chapters" type="button" onClick={() => setSelectedChapter(null)}>
        <ArrowLeft size={17} /> Semua Bab
      </button>

      <header className="reading-chapter-header">
        <div className="reading-chapter-number"><span>BAB</span><strong>{selectedChapter}</strong></div>
        <div>
          <p className="reading-kicker">READING BERBASIS KURIKULUM</p>
          <h1>{chapterInfo?.title ?? `Bab ${selectedChapter}`}</h1>
          <p>{chapterInfo?.description}</p>
        </div>
        <div className="reading-chapter-total"><strong>{chapterReadings.length}</strong><span>Bacaan</span></div>
      </header>

      <section className="reading-chapter-progress-summary">
        {(() => {
          const stats = getReadingProgressStats(chapterReadings, progressByReadingId);
          return <>
            <div><strong>{stats.completed}</strong><span>Selesai</span></div>
            <div><strong>{stats.mastered}</strong><span>Dikuasai</span></div>
            <div><strong>{stats.repeat}</strong><span>Perlu Diulang</span></div>
            <div><strong>{stats.averageAccuracy}%</strong><span>Akurasi</span></div>
            <div><strong>{stats.progressPercent}%</strong><span>Progress Bab</span></div>
          </>;
        })()}
      </section>

      <div className="reading-progress-filter" role="group" aria-label="Filter status Reading">
        {([
          ['all', 'Semua'],
          ['not_started', 'Belum Dibaca'],
          ['completed', 'Selesai'],
          ['repeat', 'Perlu Diulang'],
          ['mastered', 'Dikuasai'],
        ] as const).map(([value, label]) => <button
          key={value}
          type="button"
          className={progressFilter === value ? 'active' : ''}
          aria-pressed={progressFilter === value}
          onClick={() => setProgressFilter(value)}
        >{label}</button>)}
      </div>

      <div className="reading-list-grid">
        {filteredChapterReadings.map((reading) => {
          const targetPatterns = reading.grammarTargets
            .map((id) => getGrammarPattern(id))
            .filter((pattern): pattern is NonNullable<ReturnType<typeof getGrammarPattern>> => Boolean(pattern));
          return <article className="reading-list-card" key={reading.id}>
            <div className="reading-list-card-top">
              <div>
                <p>読解 {reading.order} · {reading.kind}</p>
                <h2>{reading.title}</h2>
              </div>
              <div className="reading-badges">
                <span>{reading.jlptLevel}</span>
                <span>{reading.difficulty}</span>
              </div>
            </div>

            <div className="reading-list-info">
              <span><Clock size={15} /> ±{reading.estimatedReadingTime} menit</span>
              <span><ListChecks size={15} /> {reading.comprehensionQuestions.length} pertanyaan</span>
            </div>

            <div className="reading-target-preview">
              <span>Menggunakan:</span>
              <div>{targetPatterns.slice(0, 3).map((pattern) => <strong key={pattern.id}>{pattern.pattern}</strong>)}</div>
            </div>

            {(() => {
              const progress = progressByReadingId[reading.id];
              const status = getReadingStatusLabel(progress);
              return <div className="reading-list-progress">
                <span className={`reading-status-badge status-${getReadingProgressStatus(progress)}`}>{status}</span>
                {progress && progress.attempts > 0 && <span>Attempt {progress.attempts} · Latest {progress.latest_score}% · Best {progress.best_score}%</span>}
              </div>;
            })()}

            <button className="reading-start-button" type="button" onClick={() => openReading(reading.id)}>
              Mulai Membaca <ChevronRight size={16} />
            </button>
          </article>;
        })}
      </div>
      {filteredChapterReadings.length === 0 && <div className="reading-progress-empty">
        Tidak ada bacaan pada Bab ini yang cocok dengan filter status tersebut.
      </div>}
    </>}
  </div>;
}
