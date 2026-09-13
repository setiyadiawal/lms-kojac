import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Search, Shuffle, SlidersHorizontal, Speaker } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { speakJapanese } from '../features/hiragana/useHiragana';
import { VocabularyQuiz } from '../features/vocabulary/VocabularyQuiz';
import {
  type VocabularyChapter,
  type VocabularyRecordReview,
  type VocabularyReviewRating,
  type VocabularyWithProgress,
  hasVocabularyReview,
  isVocabularyDue,
  useVocabulary,
} from '../features/vocabulary/useVocabulary';
import '../features/vocabulary/vocabulary.css';

type VocabularyTab = 'study' | 'flashcard' | 'quiz';
type VocabularyProgressFilter = 'all' | 'unlearned' | 'learning' | 'mastered' | 'due';

type VocabularyDisplayPreferences = {
  kana: boolean;
  romaji: boolean;
  arti: boolean;
  jenis: boolean;
  kategori: boolean;
};

type VocabularyFlashcardField = 'kanji' | 'kana' | 'romaji' | 'arti' | 'jenis' | 'kategori';

type VocabularyFlashcardSidePreferences = Record<VocabularyFlashcardField, boolean>;

type VocabularyFlashcardPreferences = {
  front: VocabularyFlashcardSidePreferences;
  back: VocabularyFlashcardSidePreferences;
  audio: boolean;
};

const FLASHCARD_FIELDS: Array<{ key: VocabularyFlashcardField; label: string }> = [
  { key: 'kanji', label: 'Kanji' },
  { key: 'kana', label: 'Kana' },
  { key: 'romaji', label: 'Romaji' },
  { key: 'arti', label: 'Arti' },
  { key: 'jenis', label: 'Jenis' },
  { key: 'kategori', label: 'Kategori' },
];

type VocabularyTableStyle = CSSProperties & {
  '--vocab-columns-desktop': string;
};

const DISPLAY_PREFERENCES_KEY = 'vocabularyDisplayPreferences';
const DEFAULT_DISPLAY_PREFERENCES: VocabularyDisplayPreferences = {
  kana: true,
  romaji: true,
  arti: true,
  jenis: true,
  kategori: true,
};

const FLASHCARD_PREFERENCES_KEY = 'vocabularyFlashcardPreferences';

const PROGRESS_FILTERS: Array<{ key: VocabularyProgressFilter; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'unlearned', label: 'Belum Dipelajari' },
  { key: 'learning', label: 'Sedang Dipelajari' },
  { key: 'mastered', label: 'Dikuasai' },
  { key: 'due', label: 'Perlu Review' },
];

function createDefaultFlashcardPreferences(): VocabularyFlashcardPreferences {
  return {
    front: {
      kanji: true,
      kana: false,
      romaji: false,
      arti: false,
      jenis: false,
      kategori: false,
    },
    back: {
      kanji: true,
      kana: true,
      romaji: true,
      arti: true,
      jenis: true,
      kategori: true,
    },
    audio: true,
  };
}

function chapterStatusLabel(status: VocabularyChapter['status']) {
  if (status === 'mastered') return 'Dikuasai';
  if (status === 'in_progress') return 'Sedang dipelajari';
  return 'Belum mulai';
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('id-ID');
}

function matchesSearch(item: VocabularyWithProgress, query: string) {
  if (!query) return true;
  const haystack = [
    item.prompt,
    item.reading ?? '',
    item.romaji,
    item.meaning_id ?? '',
    item.jenis ?? '',
    item.category ?? '',
  ].join('\n').toLocaleLowerCase('id-ID');
  return haystack.includes(query);
}

function matchesProgressFilter(item: VocabularyWithProgress, filter: VocabularyProgressFilter) {
  if (filter === 'all') return true;

  const hasReview = hasVocabularyReview(item.progress);
  const mastery = item.progress?.mastery_score ?? 0;

  if (filter === 'unlearned') return !hasReview;
  if (filter === 'learning') return hasReview && mastery < 80;
  if (filter === 'mastered') return mastery >= 80;
  return isVocabularyDue(item.progress);
}

function containsKanji(text: string) {
  return /[\u3400-\u9fff々〆ヵヶ]/u.test(text);
}

function shuffleVocabularyDeck(ids: string[]) {
  const next = [...ids];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function loadDisplayPreferences(): VocabularyDisplayPreferences {
  if (typeof window === 'undefined') return DEFAULT_DISPLAY_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(DISPLAY_PREFERENCES_KEY);
    if (!stored) return DEFAULT_DISPLAY_PREFERENCES;

    const parsed = JSON.parse(stored) as Partial<VocabularyDisplayPreferences>;
    return {
      kana: typeof parsed.kana === 'boolean' ? parsed.kana : true,
      romaji: typeof parsed.romaji === 'boolean' ? parsed.romaji : true,
      arti: typeof parsed.arti === 'boolean' ? parsed.arti : true,
      jenis: typeof parsed.jenis === 'boolean' ? parsed.jenis : true,
      kategori: typeof parsed.kategori === 'boolean' ? parsed.kategori : true,
    };
  } catch {
    return DEFAULT_DISPLAY_PREFERENCES;
  }
}

function saveDisplayPreferences(preferences: VocabularyDisplayPreferences) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISPLAY_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Preferensi tampilan bersifat opsional; UI tetap bekerja jika storage browser tidak tersedia.
  }
}

function booleanPreference(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function loadFlashcardPreferences(): VocabularyFlashcardPreferences {
  const defaults = createDefaultFlashcardPreferences();
  if (typeof window === 'undefined') return defaults;

  try {
    const stored = window.localStorage.getItem(FLASHCARD_PREFERENCES_KEY);
    if (!stored) return defaults;

    const parsed = JSON.parse(stored) as Partial<VocabularyFlashcardPreferences>;
    const front = (parsed.front ?? {}) as Partial<VocabularyFlashcardSidePreferences>;
    const back = (parsed.back ?? {}) as Partial<VocabularyFlashcardSidePreferences>;

    return {
      front: {
        kanji: booleanPreference(front.kanji, defaults.front.kanji),
        kana: booleanPreference(front.kana, defaults.front.kana),
        romaji: booleanPreference(front.romaji, defaults.front.romaji),
        arti: booleanPreference(front.arti, defaults.front.arti),
        jenis: booleanPreference(front.jenis, defaults.front.jenis),
        kategori: booleanPreference(front.kategori, defaults.front.kategori),
      },
      back: {
        kanji: booleanPreference(back.kanji, defaults.back.kanji),
        kana: booleanPreference(back.kana, defaults.back.kana),
        romaji: booleanPreference(back.romaji, defaults.back.romaji),
        arti: booleanPreference(back.arti, defaults.back.arti),
        jenis: booleanPreference(back.jenis, defaults.back.jenis),
        kategori: booleanPreference(back.kategori, defaults.back.kategori),
      },
      audio: booleanPreference(parsed.audio, defaults.audio),
    };
  } catch {
    return defaults;
  }
}

function saveFlashcardPreferences(preferences: VocabularyFlashcardPreferences) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FLASHCARD_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Preferensi Flashcard bersifat opsional; Flashcard tetap bekerja jika storage browser tidak tersedia.
  }
}

function visibleFlashcardFieldCount(preferences: VocabularyFlashcardSidePreferences) {
  return FLASHCARD_FIELDS.reduce((count, field) => count + (preferences[field.key] ? 1 : 0), 0);
}

function flashcardSideData(item: VocabularyWithProgress, preferences: VocabularyFlashcardSidePreferences) {
  const hasKanji = containsKanji(item.prompt);
  const kana = item.reading || item.prompt;
  const values: Record<VocabularyFlashcardField, string> = {
    kanji: hasKanji ? item.prompt : '',
    kana,
    romaji: item.romaji || '',
    arti: item.meaning_id || '',
    jenis: item.jenis || '',
    kategori: item.category || '',
  };
  const hasVisibleValue = FLASHCARD_FIELDS.some(({ key }) => preferences[key] && Boolean(values[key]));
  const useKanaFallback = !hasVisibleValue && Boolean(kana);

  return { kana, values, useKanaFallback };
}

function flashcardSideAriaText(item: VocabularyWithProgress, preferences: VocabularyFlashcardSidePreferences) {
  const { values, useKanaFallback } = flashcardSideData(item, preferences);
  const parts: string[] = [];

  if (preferences.kanji && values.kanji) parts.push(values.kanji);
  if (useKanaFallback) parts.push(values.kana);
  if (preferences.kana && values.kana) parts.push(values.kana);
  if (preferences.romaji && values.romaji) parts.push(values.romaji);
  if (preferences.arti && values.arti) parts.push(values.arti);
  if (preferences.jenis && values.jenis) parts.push(values.jenis);
  if (preferences.kategori && values.kategori) parts.push(values.kategori);

  return parts.join(', ');
}

function vocabularyTableStyle(preferences: VocabularyDisplayPreferences): VocabularyTableStyle {
  const desktopColumns = [
    '58px',
    'minmax(100px, .82fr)',
  ];

  if (preferences.kana) desktopColumns.push('minmax(120px, .95fr)');
  if (preferences.romaji) desktopColumns.push('minmax(112px, .86fr)');
  if (preferences.arti) desktopColumns.push('minmax(200px, 1.5fr)');
  if (preferences.jenis) desktopColumns.push('minmax(72px, .52fr)');
  if (preferences.kategori) desktopColumns.push('minmax(110px, .82fr)');

  desktopColumns.push('minmax(124px, auto)');

  return {
    '--vocab-columns-desktop': desktopColumns.join(' '),
  };
}

export function VocabularyPage() {
  const { chapterNumber: chapterParam } = useParams<{ chapterNumber?: string }>();
  const { chapters, loading, error, uncategorizedCount, recordReview } = useVocabulary();
  const parsedChapter = chapterParam ? Number(chapterParam) : null;
  const chapterNumber = parsedChapter !== null && Number.isInteger(parsedChapter) && parsedChapter > 0
    ? parsedChapter
    : null;

  if (loading) return <VocabularyLoading />;

  if (chapterParam) {
    const chapter = chapterNumber === null
      ? undefined
      : chapters.find((entry) => entry.number === chapterNumber);
    return <VocabularyChapterPage chapter={chapter} error={error} onRecordReview={recordReview} />;
  }

  return <VocabularyChapterList chapters={chapters} error={error} uncategorizedCount={uncategorizedCount} />;
}

function VocabularyChapterList({
  chapters,
  error,
  uncategorizedCount,
}: {
  chapters: VocabularyChapter[];
  error: string | null;
  uncategorizedCount: number;
}) {
  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.total, 0);

  return <div className="page vocabulary-page">
    <div className="vocab-breadcrumb"><Link to="/belajar"><ArrowLeft size={16}/> Belajar</Link><span>/</span><strong>Kosakata</strong></div>
    <div className="page-header vocab-header">
      <div>
        <p className="eyebrow">VOCABULARY · PER BAB</p>
        <h1>Kosakata <span>Vocabulary</span></h1>
        <p>Pelajari kosakata secara bertahap berdasarkan bab, lalu kuatkan ingatan dengan Flashcard, Quiz, dan SRS.</p>
      </div>
      <div className="vocab-summary-badge"><strong>{totalWords}</strong><span>Total kosakata</span></div>
    </div>

    {error && <div className="notice">Gagal memuat Kosakata: {error}</div>}
    {uncategorizedCount > 0 && <div className="notice">Ada {uncategorizedCount} item Vocabulary yang belum memiliki <strong>extra.chapter_number</strong>, sehingga belum ditampilkan di daftar Bab.</div>}

    {chapters.length === 0 ? <div className="empty-state">
      <BookOpen size={34}/>
      <h2>Belum ada data Kosakata</h2>
      <p>Fondasi halaman sudah siap. Bab akan muncul otomatis setelah item <strong>vocabulary</strong> yang dipublikasikan memiliki metadata bab.</p>
    </div> : <div className="vocab-chapter-grid">
      {chapters.map((chapter) => <article className="vocab-chapter-card" key={chapter.number}>
        <div className="vocab-chapter-card-top">
          <div><span className="vocab-chapter-kicker">BAB {chapter.number}</span><h2>{chapter.title}</h2></div>
          <span className={`vocab-status ${chapter.status.replace('_', '-')}`}>{chapterStatusLabel(chapter.status)}</span>
        </div>

        <p className="vocab-chapter-count"><strong>{chapter.total}</strong> Kosakata</p>
        <div className="vocab-progress-label"><span>Progress</span><strong>{chapter.averageMastery}%</strong></div>
        <div className="vocab-progress-track"><span style={{ width: `${chapter.averageMastery}%` }}/></div>

        <div className="vocab-chapter-meta">
          <div><strong>{chapter.started}</strong><span>Dipelajari</span></div>
          <div><strong>{chapter.mastered}</strong><span>Dikuasai</span></div>
          <div><strong>{chapter.due}</strong><span>Perlu review</span></div>
          <div><strong>{chapter.accuracy}%</strong><span>Akurasi</span></div>
        </div>

        <Link className="vocab-chapter-link" to={`/belajar/kosakata/${chapter.number}`}>
          {chapter.status === 'not_started' ? 'Mulai Belajar' : 'Lanjut Belajar'} <ChevronRight size={16}/>
        </Link>
      </article>)}
    </div>}
  </div>;
}

function VocabularyChapterPage({
  chapter,
  error,
  onRecordReview,
}: {
  chapter: VocabularyChapter | undefined;
  error: string | null;
  onRecordReview: VocabularyRecordReview;
}) {
  const [activeTab, setActiveTab] = useState<VocabularyTab>('study');
  const [query, setQuery] = useState('');
  const [progressFilter, setProgressFilter] = useState<VocabularyProgressFilter>('all');
  const [displayPreferences, setDisplayPreferences] = useState<VocabularyDisplayPreferences>(loadDisplayPreferences);
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
  const [srsReviewIds, setSrsReviewIds] = useState<string[] | null>(null);
  const displayMenuRef = useRef<HTMLDetailsElement>(null);
  const normalizedQuery = normalizeSearch(query);
  const filteredItems = useMemo(
    () => chapter?.items.filter((item) => (
      matchesSearch(item, normalizedQuery) && matchesProgressFilter(item, progressFilter)
    )) ?? [],
    [chapter, normalizedQuery, progressFilter],
  );
  const tableStyle = useMemo(() => vocabularyTableStyle(displayPreferences), [displayPreferences]);

  useEffect(() => {
    if (!isDisplayMenuOpen || activeTab !== 'study') return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = displayMenuRef.current;
      if (!menu || !(event.target instanceof Node)) return;
      if (!menu.contains(event.target)) setIsDisplayMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsDisplayMenuOpen(false);

      const summary = displayMenuRef.current?.querySelector('summary');
      if (summary instanceof HTMLElement) summary.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, isDisplayMenuOpen]);

  const updateDisplayPreference = (key: keyof VocabularyDisplayPreferences, checked: boolean) => {
    setDisplayPreferences((current) => {
      const next = { ...current, [key]: checked };
      saveDisplayPreferences(next);
      return next;
    });
  };

  const resetDisplayPreferences = () => {
    const next = { ...DEFAULT_DISPLAY_PREFERENCES };
    saveDisplayPreferences(next);
    setDisplayPreferences(next);
  };

  if (!chapter) {
    return <div className="page vocabulary-page">
      <div className="vocab-breadcrumb"><Link to="/belajar/kosakata"><ArrowLeft size={16}/> Kosakata</Link></div>
      <div className="empty-state"><BookOpen size={34}/><h2>Bab tidak ditemukan</h2><p>Bab ini belum tersedia atau belum memiliki data Kosakata yang dipublikasikan.</p></div>
    </div>;
  }

  return <div className="page vocabulary-page">
    <div className="vocab-breadcrumb">
      <Link to="/belajar"><ArrowLeft size={16}/> Belajar</Link><span>/</span>
      <Link to="/belajar/kosakata">Kosakata</Link><span>/</span><strong>Bab {chapter.number}</strong>
    </div>

    <div className="page-header vocab-header">
      <div>
        <p className="eyebrow">BAB {chapter.number} · VOCABULARY</p>
        <h1>{chapter.title}</h1>
        <p>{chapter.total} kosakata · {chapter.started} dipelajari · {chapter.mastered} dikuasai · {chapter.due} perlu review · {chapter.accuracy}% akurasi</p>
      </div>
      <div className="vocab-summary-badge"><strong>{chapter.averageMastery}%</strong><span>Progress bab</span></div>
    </div>

    {error && <div className="notice">Gagal memuat Kosakata: {error}</div>}

    <div className="vocab-tabs" role="tablist" aria-label="Mode belajar Vocabulary">
      <button
        type="button"
        className={activeTab === 'study' ? 'active' : ''}
        aria-selected={activeTab === 'study'}
        onClick={() => { setActiveTab('study'); setSrsReviewIds(null); setIsDisplayMenuOpen(false); }}
      >Pelajari</button>
      <button
        type="button"
        className={activeTab === 'flashcard' ? 'active' : ''}
        aria-selected={activeTab === 'flashcard'}
        onClick={() => { setActiveTab('flashcard'); setSrsReviewIds(null); setIsDisplayMenuOpen(false); }}
      >Flashcard</button>
      <button
        type="button"
        className={activeTab === 'quiz' ? 'active' : ''}
        aria-selected={activeTab === 'quiz'}
        onClick={() => { setActiveTab('quiz'); setSrsReviewIds(null); setIsDisplayMenuOpen(false); }}
      >Quiz</button>
    </div>

    {activeTab === 'study' && <div className="vocab-srs-entry" aria-live="polite">
      <div>
        <strong>Perlu Review</strong>
        <span>{chapter.due > 0 ? `${chapter.due} kosakata sudah jatuh tempo.` : 'Tidak ada kosakata yang perlu direview saat ini.'}</span>
      </div>
      <button
        type="button"
        disabled={chapter.due === 0}
        onClick={() => {
          const dueIds = chapter.items
            .filter((item) => isVocabularyDue(item.progress))
            .map((item) => item.id);
          setSrsReviewIds(dueIds);
          setActiveTab('flashcard');
          setIsDisplayMenuOpen(false);
        }}
      >
        Review Sekarang{chapter.due > 0 ? ` · ${chapter.due}` : ''}
      </button>
    </div>}

    {activeTab === 'flashcard' ? (
      <VocabularyFlashcardView
        key={`vocabulary-flashcard-${chapter.number}-${srsReviewIds ? 'srs' : 'normal'}`}
        items={srsReviewIds
          ? chapter.items.filter((item) => srsReviewIds.includes(item.id))
          : chapter.items}
        onRecordReview={onRecordReview}
        reviewMode={Boolean(srsReviewIds)}
      />
    ) : activeTab === 'quiz' ? (
      <VocabularyQuiz
        key={`vocabulary-quiz-${chapter.number}`}
        items={chapter.items}
        onRecordReview={onRecordReview}
      />
    ) : <>
    <div className="vocab-list-controls">
      <div className="vocab-search-wrap">
        <Search size={18}/>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari Kanji, Kana, Romaji, arti, jenis, atau kategori…"
          aria-label="Cari kosakata"
        />
      </div>

      <details
        ref={displayMenuRef}
        className="vocab-display-menu"
        open={isDisplayMenuOpen}
        onToggle={(event) => setIsDisplayMenuOpen(event.currentTarget.open)}
      >
        <summary><SlidersHorizontal size={16}/> Atur Tampilan</summary>
        <div className="vocab-display-popover">
          <strong>Pilih kolom</strong>
          <label>
            <input
              type="checkbox"
              checked={displayPreferences.kana}
              onChange={(event) => updateDisplayPreference('kana', event.target.checked)}
            />
            <span>Tampilkan Kana</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={displayPreferences.romaji}
              onChange={(event) => updateDisplayPreference('romaji', event.target.checked)}
            />
            <span>Tampilkan Romaji</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={displayPreferences.arti}
              onChange={(event) => updateDisplayPreference('arti', event.target.checked)}
            />
            <span>Tampilkan Arti</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={displayPreferences.jenis}
              onChange={(event) => updateDisplayPreference('jenis', event.target.checked)}
            />
            <span>Tampilkan Jenis</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={displayPreferences.kategori}
              onChange={(event) => updateDisplayPreference('kategori', event.target.checked)}
            />
            <span>Tampilkan Kategori</span>
          </label>
          <button type="button" className="vocab-display-reset" onClick={resetDisplayPreferences}>Reset Tampilan</button>
        </div>
      </details>
    </div>

    <div className="vocab-progress-filters" role="group" aria-label="Filter progress kosakata">
      {PROGRESS_FILTERS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={progressFilter === key ? 'active' : ''}
          aria-pressed={progressFilter === key}
          onClick={() => setProgressFilter(key)}
        >
          {label}
        </button>
      ))}
    </div>

    <section className="vocab-list-card">
      <div className="vocab-list-head">
        <div><p className="eyebrow">DAFTAR KOSAKATA</p><h2>{filteredItems.length} dari {chapter.total}</h2></div>
        <span>Pelajari Kanji, Kana, Romaji, arti, jenis, kategori, dan pengucapan dalam satu daftar.</span>
      </div>

      {filteredItems.length === 0 ? <div className="vocab-inline-empty"><strong>Kosakata tidak ditemukan</strong><span>{progressFilter === 'all' ? 'Coba kata kunci lain.' : 'Tidak ada kosakata yang cocok dengan filter progress dan pencarian saat ini.'}</span></div> : <div className="vocab-table" role="table" aria-label={`Daftar kosakata Bab ${chapter.number}`} style={tableStyle}>
        <div className="vocab-table-head" role="row">
          <span role="columnheader">No.</span>
          <span role="columnheader">Kanji</span>
          {displayPreferences.kana && <span role="columnheader">Kana</span>}
          {displayPreferences.romaji && <span role="columnheader">Romaji</span>}
          {displayPreferences.arti && <span role="columnheader">Arti</span>}
          {displayPreferences.jenis && <span role="columnheader">Jenis</span>}
          {displayPreferences.kategori && <span role="columnheader">Kategori</span>}
          <span role="columnheader">Audio</span>
        </div>
        <div className="vocab-list" role="rowgroup">
          {filteredItems.map((item) => <VocabularyRow key={item.id} item={item} displayPreferences={displayPreferences}/>)}
        </div>
      </div>}
    </section>
    </>}
  </div>;
}

function VocabularyRow({
  item,
  displayPreferences,
}: {
  item: VocabularyWithProgress;
  displayPreferences: VocabularyDisplayPreferences;
}) {
  const hasKanji = containsKanji(item.prompt);
  const kana = item.reading || item.prompt;

  const showReading = displayPreferences.kana || displayPreferences.romaji;
  const showMeta = displayPreferences.jenis || displayPreferences.kategori;

  return <div className="vocab-row" role="row">
    <span className="vocab-row-index" role="cell" data-label="No.">{item.sortOrder === 9999 ? '—' : item.sortOrder}</span>
    <div className="vocab-row-main" role="presentation">
      <span className={`vocab-row-kanji${hasKanji ? '' : ' is-placeholder'}`} role="cell" data-label="Kanji"><strong>{hasKanji ? item.prompt : '—'}</strong></span>

      {showReading && <span className="vocab-row-reading" role="presentation">
        {displayPreferences.kana && <span className="vocab-row-kana" role="cell" data-label="Kana"><strong>{kana}</strong></span>}
        {displayPreferences.kana && displayPreferences.romaji && <span className="vocab-reading-separator" aria-hidden="true">·</span>}
        {displayPreferences.romaji && <span className="vocab-row-romaji" role="cell" data-label="Romaji">{item.romaji || '—'}</span>}
      </span>}

      {displayPreferences.arti && <span className="vocab-row-meaning" role="cell" data-label="Arti"><strong>{item.meaning_id || 'Arti belum tersedia'}</strong></span>}

      <div className="vocab-row-footer" role="presentation">
        {showMeta && <span className="vocab-row-meta" role="presentation">
          {displayPreferences.jenis && <span className="vocab-row-jenis" role="cell" data-label="Jenis">{item.jenis ? <span className="vocab-jenis-badge">{item.jenis}</span> : '—'}</span>}
          {displayPreferences.kategori && <span className="vocab-row-category" role="cell" data-label="Kategori">{item.category || '—'}</span>}
        </span>}

        <span className="vocab-row-audio" role="cell" data-label="Audio">
          <button type="button" className="vocab-audio-btn" onClick={() => speakJapanese(kana)} aria-label={`Dengarkan ${kana}`}>
            <Speaker size={16}/><span className="vocab-audio-label">Dengarkan</span>
          </button>
        </span>
      </div>
    </div>
  </div>;
}

function FlashcardSideFields({
  item,
  side,
  preferences,
}: {
  item: VocabularyWithProgress;
  side: 'front' | 'back';
  preferences: VocabularyFlashcardSidePreferences;
}) {
  const { values, useKanaFallback } = flashcardSideData(item, preferences);
  const kanjiLong = Array.from(values.kanji).length > 5;
  const kanaLong = Array.from(values.kana).length > 10;
  const showMeta = preferences.jenis || preferences.kategori;

  return <span className={`vocab-flashcard-fields is-${side}`}>
    {preferences.kanji && values.kanji && (
      <span className={`vocab-flashcard-field vocab-flashcard-field-kanji${kanjiLong ? ' is-long' : ''}`}>{values.kanji}</span>
    )}

    {useKanaFallback && (
      <span className={`vocab-flashcard-field vocab-flashcard-field-kana is-fallback${kanaLong ? ' is-long' : ''}`}>{values.kana}</span>
    )}

    {preferences.kana && values.kana && (
      <span className={`vocab-flashcard-field vocab-flashcard-field-kana${kanaLong ? ' is-long' : ''}`}>{values.kana}</span>
    )}

    {preferences.romaji && values.romaji && (
      <span className="vocab-flashcard-field vocab-flashcard-field-romaji">{values.romaji}</span>
    )}

    {preferences.arti && (
      <strong className="vocab-flashcard-field vocab-flashcard-field-meaning">{values.arti || 'Arti belum tersedia'}</strong>
    )}

    {showMeta && (
      <span className="vocab-flashcard-field vocab-flashcard-field-meta">
        {preferences.jenis && <span className="vocab-jenis-badge">{values.jenis || '—'}</span>}
        {preferences.kategori && <span>{values.kategori || '—'}</span>}
      </span>
    )}
  </span>;
}

function FlashcardPreferenceSection({
  title,
  preferences,
  onChange,
}: {
  title: string;
  preferences: VocabularyFlashcardSidePreferences;
  onChange: (key: VocabularyFlashcardField, checked: boolean) => void;
}) {
  const activeCount = visibleFlashcardFieldCount(preferences);

  return <section className="vocab-flashcard-settings-section">
    <strong>{title}</strong>
    <div className="vocab-flashcard-settings-grid">
      {FLASHCARD_FIELDS.map(({ key, label }) => {
        const checked = preferences[key];
        const isLastActive = checked && activeCount === 1;

        return <label
          key={key}
          className={isLastActive ? 'is-locked' : undefined}
          title={isLastActive ? 'Minimal satu field harus aktif pada sisi ini.' : undefined}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={isLastActive}
            onChange={(event) => onChange(key, event.target.checked)}
          />
          <span>{label}</span>
        </label>;
      })}
    </div>
  </section>;
}

function VocabularyFlashcardView({
  items,
  onRecordReview,
  reviewMode = false,
}: {
  items: VocabularyWithProgress[];
  onRecordReview: VocabularyRecordReview;
  reviewMode?: boolean;
}) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const [deckIds, setDeckIds] = useState<string[]>(() => itemIds);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [preferences, setPreferences] = useState<VocabularyFlashcardPreferences>(loadFlashcardPreferences);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratedIds, setRatedIds] = useState<string[]>([]);
  const [reviewComplete, setReviewComplete] = useState(false);
  const settingsRef = useRef<HTMLDetailsElement>(null);
  const ratingInFlightRef = useRef(false);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = settingsRef.current;
      if (!menu || !(event.target instanceof Node)) return;
      if (!menu.contains(event.target)) setIsSettingsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsSettingsOpen(false);

      const summary = settingsRef.current?.querySelector('summary');
      if (summary instanceof HTMLElement) summary.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!deckIds.length || isSettingsOpen || savingRating || reviewComplete) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, textarea, select, summary, [contenteditable="true"]')) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setIndex((current) => (current - 1 + deckIds.length) % deckIds.length);
        setRevealed(false);
        setRatingError(null);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setIndex((current) => (current + 1) % deckIds.length);
        setRevealed(false);
        setRatingError(null);
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setRevealed((current) => !current);
        setRatingError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deckIds.length, isSettingsOpen, reviewComplete, savingRating]);

  const updateSidePreference = (
    side: 'front' | 'back',
    key: VocabularyFlashcardField,
    checked: boolean,
  ) => {
    setPreferences((current) => {
      if (!checked && current[side][key] && visibleFlashcardFieldCount(current[side]) <= 1) return current;

      const next: VocabularyFlashcardPreferences = {
        ...current,
        [side]: {
          ...current[side],
          [key]: checked,
        },
      };
      saveFlashcardPreferences(next);
      return next;
    });
  };

  const updateAudioPreference = (checked: boolean) => {
    setPreferences((current) => {
      const next = { ...current, audio: checked };
      saveFlashcardPreferences(next);
      return next;
    });
  };

  const resetFlashcardPreferences = () => {
    const next = createDefaultFlashcardPreferences();
    saveFlashcardPreferences(next);
    setPreferences(next);
  };

  if (!deckIds.length) {
    return <div className="vocab-inline-empty vocab-flashcard-empty">
      <strong>{reviewMode ? 'Tidak ada kosakata yang perlu direview saat ini.' : 'Belum ada kosakata untuk Flashcard'}</strong>
      <span>{reviewMode ? 'SRS akan menampilkan kembali kosakata saat due_at sudah jatuh tempo.' : 'Flashcard akan menggunakan kosakata dari Bab ini.'}</span>
    </div>;
  }

  if (reviewMode && reviewComplete) {
    return <section className="vocab-flashcard-stage vocab-srs-complete" aria-live="polite">
      <div className="vocab-srs-complete-card">
        <strong>Review SRS selesai</strong>
        <span>{ratedIds.length} kosakata sudah direview dan jadwal berikutnya sudah diperbarui.</span>
      </div>
    </section>;
  }

  const safeIndex = index % deckIds.length;
  const activeId = deckIds[safeIndex];
  const item = items.find((entry) => entry.id === activeId) ?? items[0];

  if (!item) return null;

  const kana = item.reading || item.prompt;
  const frontAriaText = flashcardSideAriaText(item, preferences.front) || kana;
  const backAriaText = flashcardSideAriaText(item, preferences.back) || kana;
  const alreadyRatedInReview = reviewMode && ratedIds.includes(item.id);

  const goPrevious = () => {
    setIndex((current) => (current - 1 + deckIds.length) % deckIds.length);
    setRevealed(false);
    setRatingError(null);
  };

  const goNext = () => {
    setIndex((current) => (current + 1) % deckIds.length);
    setRevealed(false);
    setRatingError(null);
  };

  const shuffleDeck = () => {
    setDeckIds((current) => shuffleVocabularyDeck(current));
    setIndex(0);
    setRevealed(false);
    setRatingError(null);
  };

  const submitRating = async (rating: VocabularyReviewRating) => {
    if (!revealed || savingRating || alreadyRatedInReview || ratingInFlightRef.current) return;

    ratingInFlightRef.current = true;
    setSavingRating(true);
    setRatingError(null);

    try {
      await onRecordReview(item.id, rating);

      const nextRated = reviewMode && !ratedIds.includes(item.id)
        ? [...ratedIds, item.id]
        : ratedIds;
      if (reviewMode) setRatedIds(nextRated);

      if (reviewMode && nextRated.length >= deckIds.length) {
        setRevealed(false);
        setReviewComplete(true);
        return;
      }

      if (reviewMode) {
        let nextIndex = (safeIndex + 1) % deckIds.length;
        for (let step = 0; step < deckIds.length; step += 1) {
          if (!nextRated.includes(deckIds[nextIndex])) break;
          nextIndex = (nextIndex + 1) % deckIds.length;
        }
        setIndex(nextIndex);
      } else {
        setIndex((safeIndex + 1) % deckIds.length);
      }
      setRevealed(false);
    } catch (saveError) {
      setRatingError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan review Vocabulary. Coba lagi.');
    } finally {
      ratingInFlightRef.current = false;
      setSavingRating(false);
    }
  };

  return <section className="vocab-flashcard-stage" aria-label={reviewMode ? 'SRS Review Vocabulary' : 'Flashcard Vocabulary'}>
    <div className="vocab-flashcard-topbar">
      <div className="vocab-flashcard-meta">
        <strong>{safeIndex + 1} / {deckIds.length}</strong>
        <span>{reviewMode ? `SRS Review · ${deckIds.length} kosakata due` : `Bab ini · ${deckIds.length} kosakata`}</span>
      </div>

      <details
        ref={settingsRef}
        className="vocab-flashcard-settings"
        open={isSettingsOpen}
        onToggle={(event) => setIsSettingsOpen(event.currentTarget.open)}
      >
        <summary><SlidersHorizontal size={16}/> Atur Flashcard</summary>
        <div className="vocab-flashcard-settings-popover">
          <FlashcardPreferenceSection
            title="SISI DEPAN"
            preferences={preferences.front}
            onChange={(key, checked) => updateSidePreference('front', key, checked)}
          />

          <FlashcardPreferenceSection
            title="SISI BELAKANG"
            preferences={preferences.back}
            onChange={(key, checked) => updateSidePreference('back', key, checked)}
          />

          <label className="vocab-flashcard-audio-setting">
            <input
              type="checkbox"
              checked={preferences.audio}
              onChange={(event) => updateAudioPreference(event.target.checked)}
            />
            <span>Tampilkan Audio</span>
          </label>

          <button type="button" className="vocab-flashcard-reset" onClick={resetFlashcardPreferences}>Reset Flashcard</button>
        </div>
      </details>
    </div>

    <button
      type="button"
      className={`vocab-flashcard${revealed ? ' revealed' : ''}`}
      onClick={() => {
        if (savingRating) return;
        setRevealed((current) => !current);
        setRatingError(null);
      }}
      aria-pressed={revealed}
      aria-label={revealed
        ? `${backAriaText}. Klik untuk kembali ke sisi depan.`
        : `${frontAriaText}. Klik untuk melihat jawaban.`}
    >
      <span className="vocab-flashcard-inner" aria-hidden="true">
        <span className="vocab-flashcard-face vocab-flashcard-front">
          <FlashcardSideFields item={item} side="front" preferences={preferences.front}/>
          <span className="vocab-flashcard-hint">Klik / tap kartu untuk melihat jawaban</span>
        </span>

        <span className="vocab-flashcard-face vocab-flashcard-back">
          <span className="vocab-flashcard-back-label">JAWABAN</span>
          <FlashcardSideFields item={item} side="back" preferences={preferences.back}/>
          <span className="vocab-flashcard-hint">Nilai ingatanmu setelah melihat jawaban</span>
        </span>
      </span>
    </button>

    {revealed && <div className="vocab-srs-rating" aria-label="Rating SRS Vocabulary">
      <button type="button" disabled={savingRating || alreadyRatedInReview} onClick={() => void submitRating(0)}>Lupa</button>
      <button type="button" disabled={savingRating || alreadyRatedInReview} onClick={() => void submitRating(1)}>Sulit</button>
      <button type="button" disabled={savingRating || alreadyRatedInReview} onClick={() => void submitRating(2)}>Ingat</button>
      <button type="button" disabled={savingRating || alreadyRatedInReview} onClick={() => void submitRating(3)}>Mudah</button>
    </div>}

    {savingRating && <div className="vocab-srs-saving" role="status">Menyimpan review…</div>}
    {ratingError && <div className="vocab-srs-error" role="alert">{ratingError}</div>}
    {alreadyRatedInReview && revealed && <div className="vocab-srs-saving">Kosakata ini sudah dinilai pada sesi SRS ini.</div>}

    <div className="vocab-flashcard-controls" aria-label="Navigasi Flashcard Vocabulary">
      <button type="button" className="vocab-flashcard-prev" onClick={goPrevious} disabled={deckIds.length <= 1 || savingRating}>← Sebelumnya</button>
      <button type="button" className="vocab-flashcard-shuffle" onClick={shuffleDeck} disabled={deckIds.length <= 1 || savingRating}><Shuffle size={16}/> Acak</button>
      <button type="button" className="vocab-flashcard-next" onClick={goNext} disabled={deckIds.length <= 1 || savingRating}>Selanjutnya →</button>
    </div>

    {preferences.audio && <button
      type="button"
      className="vocab-flashcard-audio"
      onClick={(event) => {
        event.stopPropagation();
        speakJapanese(kana);
      }}
      aria-label={`Dengarkan ${kana}`}
    >
      <Speaker size={17}/><span className="vocab-flashcard-audio-label">Dengarkan</span>
    </button>}
  </section>;
}

function VocabularyLoading() {
  return <div className="page vocabulary-page">
    <div className="page-header vocab-header"><div><p className="eyebrow">VOCABULARY · PER BAB</p><h1>Kosakata <span>Vocabulary</span></h1><p>Memuat data kosakata…</p></div></div>
    <div className="empty-state"><BookOpen size={34}/><h2>Memuat Kosakata</h2><p>Mohon tunggu sebentar.</p></div>
  </div>;
}
