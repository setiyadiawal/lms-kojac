import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Headphones,
  Info,
  Link2,
  ListChecks,
  RotateCcw,
  Search,
  Trophy,
  Volume2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { speakJapanese } from '../features/hiragana/useHiragana';
import {
  GRAMMAR_CHAPTERS,
  GRAMMAR_PATTERNS,
  getGrammarPattern,
  type GrammarJlptLevel,
  type GrammarPattern,
} from '../features/grammar/grammarData';
import { GrammarPractice } from '../features/grammar/GrammarPractice';
import { GrammarQuiz } from '../features/grammar/GrammarQuiz';
import { GrammarSrsReview } from '../features/grammar/GrammarSrsReview';
import {
  hasGrammarReview,
  isGrammarDue,
  useGrammarProgress,
} from '../features/grammar/useGrammarProgress';
import '../features/grammar/grammar.css';
import '../features/grammar/grammar-progress.css';

type LevelFilter = 'ALL' | GrammarJlptLevel;
type ProgressFilter = 'all' | 'unseen' | 'learning' | 'mastered' | 'due';

const LEVELS: Array<{ value: LevelFilter; label: string }> = [
  { value: 'ALL', label: 'Semua' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
];

const PROGRESS_FILTERS: Array<{ value: ProgressFilter; label: string }> = [
  { value: 'all', label: 'Semua Status' },
  { value: 'unseen', label: 'Belum Dipelajari' },
  { value: 'learning', label: 'Sedang Dipelajari' },
  { value: 'mastered', label: 'Dikuasai' },
  { value: 'due', label: 'Perlu Review' },
];

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('id-ID');
}

function matchesSearch(pattern: GrammarPattern, query: string) {
  if (!query) return true;
  const haystack = [
    pattern.pattern,
    pattern.meaning,
    pattern.formula,
    pattern.explanation,
    ...pattern.keywords,
    ...pattern.examples.flatMap((example) => [example.japanese, example.reading, example.meaning]),
  ].join(' ').toLocaleLowerCase('id-ID');
  return haystack.includes(query);
}

function matchesProgressFilter(
  pattern: GrammarPattern,
  filter: ProgressFilter,
  progress: ReturnType<typeof useGrammarProgress>,
) {
  if (filter === 'all') return true;
  const item = progress.itemByPatternId.get(pattern.id);
  const review = item?.progress;
  if (filter === 'unseen') return !hasGrammarReview(review);
  if (filter === 'learning') return hasGrammarReview(review) && (review?.mastery_score ?? 0) < 80;
  if (filter === 'mastered') return (review?.mastery_score ?? 0) >= 80;
  return isGrammarDue(review, progress.progressNowMs);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedJapanese({ text, highlights }: { text: string; highlights: string[] }) {
  const tokens = [...new Set(highlights.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!tokens.length) return <>{text}</>;
  const regex = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'g');
  return <>{text.split(regex).map((part, index) => tokens.includes(part)
    ? <mark className="grammar-highlight" key={`${part}-${index}`}>{part}</mark>
    : <span key={`${part}-${index}`}>{part}</span>)}</>;
}

type GrammarChapterNavItem = {
  chapter: number;
  title: string;
};

function GrammarDetail({
  pattern,
  onBack,
  onOpenRelated,
  previousPattern,
  nextPattern,
  patternPosition,
  patternCount,
  previousChapter,
  nextChapter,
  onOpenChapter,
}: {
  pattern: GrammarPattern;
  onBack: () => void;
  onOpenRelated: (id: string) => void;
  previousPattern?: GrammarPattern;
  nextPattern?: GrammarPattern;
  patternPosition: number;
  patternCount: number;
  previousChapter?: GrammarChapterNavItem;
  nextChapter?: GrammarChapterNavItem;
  onOpenChapter: (chapter: number) => void;
}) {
  const related = pattern.relatedPatterns
    .map((id) => getGrammarPattern(id))
    .filter((item): item is GrammarPattern => Boolean(item));

  return <div className="grammar-detail-wrap">
    <button className="grammar-back" type="button" onClick={onBack}>
      <ArrowLeft size={17} /> Kembali ke daftar pola
    </button>

    <article className="grammar-detail-card">
      <section className="grammar-detail-hero" aria-labelledby="grammar-pattern-title">
        <p className="grammar-section-kicker">Pola Tata Bahasa</p>
        <h2 id="grammar-pattern-title">{pattern.pattern}</h2>
        <p className="grammar-detail-meaning">{pattern.meaning}</p>
        <div className="grammar-badges">
          <span>{pattern.jlptLevel}</span>
          <span>Bab {pattern.chapter}</span>
        </div>
      </section>

      <section className="grammar-detail-section">
        <div className="grammar-section-title"><BookOpen size={18} /><h3>Arti / Fungsi</h3></div>
        <p>{pattern.meaning}</p>
      </section>

      <section className="grammar-detail-section">
        <div className="grammar-section-title"><span className="grammar-formula-icon">式</span><h3>Rumus</h3></div>
        <div className="grammar-formula">{pattern.formula}</div>
      </section>

      <section className="grammar-detail-section">
        <div className="grammar-section-title"><Info size={18} /><h3>Penjelasan</h3></div>
        <p>{pattern.explanation}</p>
      </section>

      <section className="grammar-detail-section">
        <div className="grammar-section-title"><Headphones size={18} /><h3>Contoh Kalimat</h3></div>
        <div className="grammar-example-list">
          {pattern.examples.map((example, index) => <div className="grammar-example" key={`${pattern.id}-example-${index}`}>
            <div className="grammar-example-top">
              <span className="grammar-example-number">{index + 1}</span>
              <button
                className="grammar-audio-btn"
                type="button"
                onClick={() => speakJapanese(example.japanese)}
                aria-label={`Dengarkan contoh ${index + 1}`}
              >
                <Volume2 size={15} /> Dengarkan
              </button>
            </div>
            <p className="grammar-example-japanese">
              <HighlightedJapanese text={example.japanese} highlights={example.highlight} />
            </p>
            <p className="grammar-example-reading">{example.reading}</p>
            <p className="grammar-example-meaning">{example.meaning}</p>
          </div>)}
        </div>
      </section>

      {pattern.notes.length > 0 && <section className="grammar-detail-section grammar-note-section">
        <div className="grammar-section-title"><Info size={18} /><h3>Catatan Penting</h3></div>
        <ul>{pattern.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      </section>}

      {pattern.commonMistakes.length > 0 && <section className="grammar-detail-section grammar-mistake-section">
        <div className="grammar-section-title"><AlertTriangle size={18} /><h3>Kesalahan Umum</h3></div>
        <div className="grammar-mistake-list">
          {pattern.commonMistakes.map((item, index) => <div className="grammar-mistake" key={`${pattern.id}-mistake-${index}`}>
            <div><span>SALAH</span><p className="grammar-wrong">{item.wrong}</p></div>
            <div><span>BENAR</span><p className="grammar-correct">{item.correct}</p></div>
            <p>{item.explanation}</p>
          </div>)}
        </div>
      </section>}

      {related.length > 0 && <section className="grammar-detail-section">
        <div className="grammar-section-title"><Link2 size={18} /><h3>Pola Terkait</h3></div>
        <div className="grammar-related-grid">
          {related.map((item) => <button type="button" key={item.id} onClick={() => onOpenRelated(item.id)}>
            <span><strong>{item.pattern}</strong><small>{item.meaning}</small></span>
            <span className="grammar-related-meta">{item.jlptLevel} · Bab {item.chapter}</span>
            <ChevronRight size={17} />
          </button>)}
        </div>
      </section>}
    </article>

    <div className="grammar-navigation-stack">
      <nav className="grammar-pattern-nav" aria-label={`Navigasi pola Tata Bahasa Bab ${pattern.chapter}`}>
        <div className="grammar-nav-block-heading">
          <span>Navigasi Pola</span>
          <small>Bab {pattern.chapter}</small>
        </div>
        <div className="grammar-pattern-nav-grid">
          <button
            type="button"
            className="grammar-pattern-nav-btn grammar-pattern-nav-prev"
            disabled={!previousPattern}
            onClick={() => previousPattern && onOpenRelated(previousPattern.id)}
          >
            <span className="grammar-pattern-nav-direction"><ArrowLeft size={17} /> Pola Sebelumnya</span>
            <strong>{previousPattern?.pattern ?? 'Pola pertama'}</strong>
            <small>{previousPattern?.meaning ?? 'Tidak ada pola sebelumnya di Bab ini'}</small>
          </button>

          <div className="grammar-pattern-position" aria-label={`Pola ${patternPosition} dari ${patternCount}`}>
            <span>Pola</span>
            <strong>{patternPosition} / {patternCount}</strong>
          </div>

          <button
            type="button"
            className="grammar-pattern-nav-btn grammar-pattern-nav-next"
            disabled={!nextPattern}
            onClick={() => nextPattern && onOpenRelated(nextPattern.id)}
          >
            <span className="grammar-pattern-nav-direction">Pola Selanjutnya <ArrowRight size={17} /></span>
            <strong>{nextPattern?.pattern ?? 'Pola terakhir'}</strong>
            <small>{nextPattern?.meaning ?? 'Tidak ada pola berikutnya di Bab ini'}</small>
          </button>
        </div>
      </nav>

      <nav className="grammar-chapter-nav" aria-label="Navigasi Bab Tata Bahasa">
        <div className="grammar-nav-block-heading grammar-nav-block-heading-secondary">
          <span>Navigasi Bab</span>
          <small>Berpindah langsung antar Bab</small>
        </div>
        <div className="grammar-chapter-nav-grid">
          <button
            type="button"
            className="grammar-chapter-nav-btn grammar-chapter-nav-prev"
            disabled={!previousChapter}
            onClick={() => previousChapter && onOpenChapter(previousChapter.chapter)}
          >
            <span className="grammar-chapter-nav-direction"><ArrowLeft size={16} /> Bab Sebelumnya</span>
            <strong>{previousChapter ? `Bab ${previousChapter.chapter}` : 'Bab pertama'}</strong>
            <small>{previousChapter?.title ?? 'Tidak ada Bab sebelumnya'}</small>
          </button>

          <button type="button" className="grammar-all-chapters-btn" onClick={onBack}>
            <BookOpen size={16} />
            <span>Semua Bab</span>
          </button>

          <button
            type="button"
            className="grammar-chapter-nav-btn grammar-chapter-nav-next"
            disabled={!nextChapter}
            onClick={() => nextChapter && onOpenChapter(nextChapter.chapter)}
          >
            <span className="grammar-chapter-nav-direction">Bab Selanjutnya <ArrowRight size={16} /></span>
            <strong>{nextChapter ? `Bab ${nextChapter.chapter}` : 'Bab terakhir'}</strong>
            <small>{nextChapter?.title ?? 'Tidak ada Bab berikutnya'}</small>
          </button>
        </div>
      </nav>
    </div>
  </div>;
}

export function GrammarPage() {
  const [mode, setMode] = useState<'learn' | 'practice' | 'quiz'>('learn');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [srsReviewPatternIds, setSrsReviewPatternIds] = useState<string[] | null>(null);
  const grammarProgress = useGrammarProgress();
  const selectedPattern = selectedPatternId ? getGrammarPattern(selectedPatternId) : undefined;
  const normalizedQuery = normalizeSearch(query);

  const levelCounts = useMemo(() => {
    const counts = new Map<GrammarJlptLevel, number>();
    for (const pattern of GRAMMAR_PATTERNS) counts.set(pattern.jlptLevel, (counts.get(pattern.jlptLevel) ?? 0) + 1);
    return counts;
  }, []);

  const availableChapters = useMemo(() => {
    const chaptersWithPatterns = new Set(GRAMMAR_PATTERNS.map((pattern) => pattern.chapter));
    return GRAMMAR_CHAPTERS
      .filter((chapter) => chaptersWithPatterns.has(chapter.chapter))
      .slice()
      .sort((a, b) => a.chapter - b.chapter);
  }, []);

  const selectedChapterIndex = selectedPattern
    ? availableChapters.findIndex((chapter) => chapter.chapter === selectedPattern.chapter)
    : -1;
  const previousChapter = selectedChapterIndex > 0 ? availableChapters[selectedChapterIndex - 1] : undefined;
  const nextChapter = selectedChapterIndex >= 0 && selectedChapterIndex < availableChapters.length - 1
    ? availableChapters[selectedChapterIndex + 1]
    : undefined;

  const selectedChapterPatterns = selectedPattern
    ? GRAMMAR_PATTERNS
      .filter((pattern) => pattern.chapter === selectedPattern.chapter)
      .slice()
      .sort((a, b) => a.order - b.order)
    : [];
  const selectedPatternIndex = selectedPattern
    ? selectedChapterPatterns.findIndex((pattern) => pattern.id === selectedPattern.id)
    : -1;
  const previousPattern = selectedPatternIndex > 0 ? selectedChapterPatterns[selectedPatternIndex - 1] : undefined;
  const nextPattern = selectedPatternIndex >= 0 && selectedPatternIndex < selectedChapterPatterns.length - 1
    ? selectedChapterPatterns[selectedPatternIndex + 1]
    : undefined;

  const filteredPatterns = useMemo(() => GRAMMAR_PATTERNS.filter((pattern) => {
    const matchesLevel = level === 'ALL' || pattern.jlptLevel === level;
    return matchesLevel
      && matchesSearch(pattern, normalizedQuery)
      && matchesProgressFilter(pattern, progressFilter, grammarProgress);
  }), [grammarProgress, level, normalizedQuery, progressFilter]);

  const backToAllChapters = () => {
    setSelectedPatternId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPattern = (id: string) => {
    setSelectedPatternId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openChapter = (chapterNumber: number) => {
    const firstPattern = GRAMMAR_PATTERNS
      .filter((pattern) => pattern.chapter === chapterNumber)
      .sort((a, b) => a.order - b.order)[0];

    if (!firstPattern) return;
    setSelectedPatternId(firstPattern.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <div className="page grammar-page">
    <div className="grammar-breadcrumb">
      <Link to="/belajar"><ArrowLeft size={15} /> Belajar</Link>
      <span>/</span>
      <span>Tata Bahasa</span>
    </div>

    <div className="page-header grammar-header">
      <div>
        <p className="eyebrow">KOJAC LMS · GRAMMAR N5 → N4</p>
        <h1><span lang="ja">文法</span><small>Tata Bahasa</small></h1>
        <p>Pelajari pola tata bahasa Jepang secara bertahap, lengkap dengan rumus, fungsi, contoh kalimat, catatan penggunaan, dan latihan.</p>
      </div>
      <div className="grammar-pilot-badge">
        <strong>{GRAMMAR_PATTERNS.length}</strong>
        <span>Pola Aktif</span>
      </div>
    </div>

    <div className="grammar-mode-tabs" role="tablist" aria-label="Mode Tata Bahasa">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'learn'}
        className={mode === 'learn' ? 'active' : ''}
        onClick={() => { setMode('learn'); setSrsReviewPatternIds(null); }}
      >
        <BookOpen size={16} /> Pelajari
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'practice'}
        className={mode === 'practice' ? 'active' : ''}
        onClick={() => { setMode('practice'); setSrsReviewPatternIds(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      >
        <ListChecks size={16} /> Latihan
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'quiz'}
        className={mode === 'quiz' ? 'active' : ''}
        onClick={() => { setMode('quiz'); setSrsReviewPatternIds(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      >
        <Trophy size={16} /> Quiz
      </button>
    </div>

    {mode === 'practice' ? <GrammarPractice
      activePattern={selectedPattern}
      onChoosePattern={(id) => { setSelectedPatternId(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      onBackToPracticeMenu={() => { setSelectedPatternId(null); setMode('practice'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      onBackToLearn={() => { setMode('learn'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      onOpenPatternForLearn={(id) => { setSelectedPatternId(id); setMode('learn'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
    /> : mode === 'quiz' ? <GrammarQuiz recordGrammarReview={grammarProgress.recordReview}/> : srsReviewPatternIds ? <GrammarSrsReview
      patternIds={srsReviewPatternIds}
      recordReview={grammarProgress.recordReview}
      onClose={() => { setSrsReviewPatternIds(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      onOpenPattern={(id) => { setSrsReviewPatternIds(null); setSelectedPatternId(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
    /> : selectedPattern ? <GrammarDetail
      pattern={selectedPattern}
      onBack={backToAllChapters}
      onOpenRelated={openPattern}
      previousPattern={previousPattern}
      nextPattern={nextPattern}
      patternPosition={selectedPatternIndex + 1}
      patternCount={selectedChapterPatterns.length}
      previousChapter={previousChapter}
      nextChapter={nextChapter}
      onOpenChapter={openChapter}
    /> : <>
      <section className="grammar-progress-panel" aria-label="Progress Grammar">
        <div className="grammar-progress-panel-top">
          <div>
            <h2>Progress Grammar</h2>
            <p>Mastery berasal dari Quiz dan Review SRS. Latihan tidak mengubah progress formal.</p>
          </div>
          {grammarProgress.stats.due > 0 && <button
            type="button"
            className="grammar-progress-review-btn"
            disabled={grammarProgress.loading}
            onClick={() => setSrsReviewPatternIds(grammarProgress.dueItems.map((item) => item.pattern.id))}
          >
            <RotateCcw size={16}/> Review Sekarang · {grammarProgress.stats.due} Pola
          </button>}
        </div>

        <div className="grammar-progress-stats">
          <div><strong>{grammarProgress.stats.started} / {grammarProgress.stats.total}</strong><span>Dipelajari</span></div>
          <div><strong>{grammarProgress.stats.mastered}</strong><span>Dikuasai</span></div>
          <div><strong>{grammarProgress.stats.due}</strong><span>Perlu Review</span></div>
          <div><strong>{grammarProgress.stats.accuracy}%</strong><span>Akurasi</span></div>
          <div><strong>{grammarProgress.stats.averageMastery}%</strong><span>Mastery</span></div>
        </div>

        <div className="grammar-progress-filter-wrap">
          <span>Status</span>
          <div className="grammar-progress-filter" role="group" aria-label="Filter progress Grammar">
            {PROGRESS_FILTERS.map((item) => <button
              type="button"
              key={item.value}
              className={progressFilter === item.value ? 'active' : ''}
              disabled={Boolean(grammarProgress.error) && item.value !== 'all'}
              onClick={() => setProgressFilter(item.value)}
            >{item.label}</button>)}
          </div>
        </div>

        {grammarProgress.error && <div className="grammar-progress-error" role="status">
          <AlertTriangle size={16}/>
          <span><strong>Progress Grammar belum siap.</strong> {grammarProgress.error}</span>
        </div>}
      </section>

      <div className="grammar-controls" aria-label="Pencarian dan filter Tata Bahasa">
        <label className="grammar-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari pola, arti, fungsi, atau kata kunci…"
            aria-label="Cari pola Tata Bahasa"
          />
          {query && <button type="button" onClick={() => setQuery('')}>Hapus</button>}
        </label>
        <div className="grammar-level-filter" aria-label="Filter level JLPT">
          {LEVELS.map((item) => {
            const count = item.value === 'ALL' ? GRAMMAR_PATTERNS.length : (levelCounts.get(item.value) ?? 0);
            const unavailable = item.value !== 'ALL' && count === 0;
            return <button
              type="button"
              key={item.value}
              className={level === item.value ? 'active' : ''}
              disabled={unavailable}
              onClick={() => setLevel(item.value)}
              title={unavailable ? `${item.label} belum tersedia pada materi Grammar saat ini` : undefined}
            >{item.label}<span>{count}</span></button>;
          })}
        </div>
      </div>

      <div className="grammar-summary-line">
        <span>{filteredPatterns.length} pola ditemukan</span>
        <span>Struktur utama: Bab KOJAC · Metadata: JLPT Level</span>
      </div>

      <div className="grammar-chapter-list">
        {GRAMMAR_CHAPTERS.map((chapter) => {
          const allChapterPatterns = GRAMMAR_PATTERNS.filter((pattern) => pattern.chapter === chapter.chapter);
          const chapterPatterns = filteredPatterns.filter((pattern) => pattern.chapter === chapter.chapter);
          if (!chapterPatterns.length) return null;
          return <section className="grammar-chapter-card" key={chapter.chapter}>
            <div className="grammar-chapter-heading">
              <div className="grammar-chapter-number"><span>BAB</span><strong>{chapter.chapter}</strong></div>
              <div>
                <h2>{chapter.title}</h2>
                <p>{chapter.description}</p>
              </div>
              <div className="grammar-chapter-count">
                <strong>{chapterPatterns.length}</strong>
                <span>{chapterPatterns.length === allChapterPatterns.length ? 'Pola Tata Bahasa' : `dari ${allChapterPatterns.length} pola`}</span>
              </div>
            </div>

            {grammarProgress.mappedCount > 0 && (() => {
              const chapterProgress = grammarProgress.chapterStats.get(chapter.chapter);
              if (!chapterProgress) return null;
              return <div className="grammar-chapter-progress-grid" aria-label={`Progress Bab ${chapter.chapter}`}>
                <div><span>Dipelajari</span><strong>{chapterProgress.started} / {chapterProgress.total}</strong></div>
                <div><span>Dikuasai</span><strong>{chapterProgress.mastered}</strong></div>
                <div><span>Review</span><strong>{chapterProgress.due}</strong></div>
                <div><span>Akurasi</span><strong>{chapterProgress.accuracy}%</strong></div>
                <div><span>Mastery</span><strong>{chapterProgress.averageMastery}%</strong></div>
              </div>;
            })()}

            <div className="grammar-pattern-list">
              {chapterPatterns.map((pattern) => <button type="button" className="grammar-pattern-row" key={pattern.id} onClick={() => openPattern(pattern.id)}>
                <span className="grammar-pattern-order">{String(pattern.order).padStart(2, '0')}</span>
                <span className="grammar-pattern-copy">
                  <strong>{pattern.pattern}</strong>
                  <small>{pattern.meaning}</small>
                </span>
                <span className="grammar-pattern-level">{pattern.jlptLevel}</span>
                <ChevronRight size={18} />
              </button>)}
            </div>
          </section>;
        })}
      </div>

      {filteredPatterns.length === 0 && <div className="grammar-empty">
        <Search size={30} />
        <h2>Pola tidak ditemukan</h2>
        <p>Coba kata kunci lain atau kembalikan filter ke Semua.</p>
        <button type="button" onClick={() => { setQuery(''); setLevel('ALL'); setProgressFilter('all'); }}>Reset pencarian</button>
      </div>}
    </>}
  </div>;
}
