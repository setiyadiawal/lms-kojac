import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Brain, Check, ChevronRight, RotateCcw, Sparkles, Speaker, Target, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type KatakanaVariant, type KatakanaWithProgress, speakJapanese, useKatakana } from '../features/katakana/useKatakana';
import { KatakanaStrokeOrder } from '../features/katakana/KatakanaStrokeOrder';
import { ResponsiveKanaDetail, useResponsiveKanaDetailModal } from '../features/kana/ResponsiveKanaDetail';
import { QuizSoundToggle } from '../features/quiz/QuizSoundToggle';
import { useQuizSounds } from '../features/quiz/useQuizSounds';
import '../features/hiragana/hiragana.css';

type Tab = 'study' | 'flashcard' | 'quiz';
type Filter = 'all' | KatakanaVariant;

const filters: { key: Filter; label: string; count: number }[] = [
  { key: 'all', label: 'Semua', count: 104 },
  { key: 'basic', label: 'Dasar', count: 46 },
  { key: 'dakuten', label: 'Dakuten', count: 20 },
  { key: 'handakuten', label: 'Handakuten', count: 5 },
  { key: 'yoon', label: 'Yōon', count: 33 },
];

const variantLabels: Record<KatakanaVariant, string> = {
  basic: 'Dasar',
  dakuten: 'Dakuten',
  handakuten: 'Handakuten',
  yoon: 'Yōon',
};

function itemSetKey(items: KatakanaWithProgress[]) {
  return items.map((item) => item.id).join('|');
}

export function KatakanaPage() {
  const { items, stats, loading, error, recordReview } = useKatakana();
  const [tab, setTab] = useState<Tab>('study');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => filter === 'all'
    ? items
    : items.filter((item) => item.extra?.variant === filter), [items, filter]);

  return <div className="page kana-page">
    <div className="kana-breadcrumb"><Link to="/belajar"><ArrowLeft size={16}/> Belajar</Link><span>/</span><strong>Katakana</strong></div>
    <div className="page-header kana-header">
      <div><p className="eyebrow">MILESTONE 2B · HURUF JEPANG</p><h1>カタカナ <span>Katakana</span></h1><p>Pelajari bentuk, bunyi, urutan goresan, lalu kuatkan ingatan dengan flashcard dan quiz.</p></div>
      <div className="kana-progress-ring"><strong>{stats.averageMastery}%</strong><span>Mastery</span></div>
    </div>

    <div className="kana-stats">
      <MiniStat value={loading ? '…' : `${stats.mastered}/${stats.total}`} label="Dikuasai" />
      <MiniStat value={loading ? '…' : String(stats.started)} label="Sudah dipelajari" />
      <MiniStat value={loading ? '…' : String(stats.due)} label="Perlu review" />
      <MiniStat value={loading ? '…' : `${stats.accuracy}%`} label="Akurasi" />
    </div>

    {error && <div className="notice">Gagal memuat Katakana: {error}. Pastikan migration <strong>005_katakana_learning.sql</strong> sudah dijalankan.</div>}

    <div className="kana-tabs" role="tablist">
      <button className={tab === 'study' ? 'active' : ''} onClick={() => setTab('study')}><BookOpen size={17}/> Pelajari</button>
      <button className={tab === 'flashcard' ? 'active' : ''} onClick={() => setTab('flashcard')}><Brain size={17}/> Flashcard</button>
      <button className={tab === 'quiz' ? 'active' : ''} onClick={() => setTab('quiz')}><Target size={17}/> Quiz</button>
    </div>

    <div className="kana-filter-row">
      {filters.map((option) => <button key={option.key} onClick={() => setFilter(option.key)} className={filter === option.key ? 'active' : ''}>{option.label}<span>{option.count}</span></button>)}
    </div>

    {loading ? <KanaLoading /> : <>
      {tab === 'study' && <StudyView items={filtered} showSupplementary={filter === 'all'} />}
      {tab === 'flashcard' && <FlashcardView key={`flashcard-${filter}`} items={filtered} onRate={recordReview} />}
      {tab === 'quiz' && <QuizView key={`quiz-${filter}`} items={filtered} onRate={recordReview} />}
    </>}
  </div>;
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function KanaLoading() {
  return <div className="kana-loading"><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/></div>;
}

function StudyView({ items, showSupplementary }: { items: KatakanaWithProgress[]; showSupplementary: boolean }) {
  const availableItems = useMemo(() => showSupplementary ? [...items, ...supplementaryItems] : items, [items, showSupplementary]);
  const [selectedId, setSelectedId] = useState<string | null>(availableItems[0]?.id ?? null);
  const detailModal = useResponsiveKanaDetailModal();

  useEffect(() => {
    if (!availableItems.some((item) => item.id === selectedId)) setSelectedId(availableItems[0]?.id ?? null);
  }, [availableItems, selectedId]);

  const selected = availableItems.find((item) => item.id === selectedId) ?? availableItems[0];
  if (!selected) return <EmptyKana />;

  const supplementary = isSupplementaryItem(selected);
  const selectCharacter = (id: string) => {
    setSelectedId(id);
    detailModal.open();
  };

  return <div className="study-layout">
    <ResponsiveKanaDetail
      isCompact={detailModal.isCompact}
      open={detailModal.isOpen}
      onClose={detailModal.close}
      label={`Detail Katakana ${selected.prompt}`}
    >
    <aside className="kana-detail-card">
      <div className="kana-detail-top">
        <span>{supplementary ? 'Tambahan' : variantLabels[(selected.extra?.variant ?? 'basic') as KatakanaVariant]}</span>
        {supplementary ? <span className="mastery-badge">Suplemen</span> : <MasteryBadge value={selected.progress?.mastery_score ?? 0}/>}
      </div>
      <div className={`kana-hero-character kana-handwritten ${Array.from(selected.prompt).length > 1 ? 'compound' : ''}`}>{selected.prompt}</div>
      <div className="kana-romaji">{selected.reading}</div>
      <button className="audio-btn" onClick={() => speakJapanese(selected.prompt)}><Speaker size={18}/> Dengarkan</button>
      {!supplementary && <KatakanaStrokeOrder text={selected.prompt} />}
      {supplementary ? <div className="detail-list">
        <div><span>Kelompok</span><strong>{selected.extra?.group ?? '—'}</strong></div>
        <div><span>Status</span><strong>Suplemen</strong></div>
      </div> : <>
        <div className="detail-list">
          <div><span>Kelompok</span><strong>{selected.extra?.group ?? '—'}</strong></div>
          <div><span>Review</span><strong>{selected.progress?.repetitions ?? 0}×</strong></div>
          <div><span>Benar</span><strong>{selected.progress?.correct_count ?? 0}</strong></div>
          <div><span>Salah</span><strong>{selected.progress?.wrong_count ?? 0}</strong></div>
        </div>
        <div className="mastery-bar"><span style={{ width: `${selected.progress?.mastery_score ?? 0}%` }}/></div>
      </>}
      <small>{supplementary ? 'Materi tambahan tidak dihitung ke progress, Flashcard, atau Quiz inti.' : 'Mastery naik dari hasil Flashcard dan Quiz, bukan hanya membuka kartu.'}</small>
    </aside>
    </ResponsiveKanaDetail>

    <section>
      <div className="section-heading"><div><p className="eyebrow">DAFTAR HURUF</p><h2>{items.length} karakter</h2></div><span>Susunan mengikuti pola gojūon agar lebih mudah dipelajari.</span></div>
      <KanaStudyChart items={items} selectedId={selected.id} onSelect={selectCharacter} showSupplementary={showSupplementary} />
    </section>
  </div>;
}

type StudyChartProps = {
  items: KatakanaWithProgress[];
  selectedId: string;
  onSelect: (id: string) => void;
  showSupplementary: boolean;
};

type ChartRow = {
  key: string;
  label: string;
  columns: Array<KatakanaWithProgress | null>;
};


function supplementaryItem(id: string, prompt: string, reading: string, group: string, sortOrder: number): KatakanaWithProgress {
  return {
    id: `supplementary:${id}`,
    prompt,
    reading,
    extra: { group, sort_order: sortOrder },
    progress: null,
  };
}

const supplementaryRows: ChartRow[] = [
  {
    key: 'additional-w',
    label: 'W',
    columns: [
      null,
      supplementaryItem('wi', 'ウィ', 'wi', 'W', 1001),
      null,
      supplementaryItem('we', 'ウェ', 'we', 'W', 1002),
      supplementaryItem('wo', 'ウォ', 'wo', 'W', 1003),
    ],
  },
  {
    key: 'additional-v',
    label: 'V',
    columns: [
      supplementaryItem('va', 'ヴァ', 'va', 'V', 1010),
      supplementaryItem('vi', 'ヴィ', 'vi', 'V', 1011),
      supplementaryItem('vu', 'ヴ', 'vu', 'V', 1012),
      supplementaryItem('ve', 'ヴェ', 've', 'V', 1013),
      supplementaryItem('vo', 'ヴォ', 'vo', 'V', 1014),
    ],
  },
  {
    key: 'additional-ts',
    label: 'TS',
    columns: [
      supplementaryItem('tsa', 'ツァ', 'tsa', 'TS', 1020),
      supplementaryItem('tsi', 'ツィ', 'tsi', 'TS', 1021),
      null,
      supplementaryItem('tse', 'ツェ', 'tse', 'TS', 1022),
      supplementaryItem('tso', 'ツォ', 'tso', 'TS', 1023),
    ],
  },
  {
    key: 'additional-th',
    label: 'TH',
    columns: [
      null,
      supplementaryItem('thi', 'ティ', 'thi', 'TH', 1030),
      supplementaryItem('thu', 'テュ', 'thu', 'TH', 1031),
      null,
      null,
    ],
  },
  {
    key: 'additional-tw',
    label: 'TW',
    columns: [
      null,
      null,
      supplementaryItem('twu', 'トゥ', 'twu', 'TW', 1040),
      null,
      null,
    ],
  },
  {
    key: 'additional-dh',
    label: 'DH',
    columns: [
      null,
      supplementaryItem('dhi', 'ディ', 'dhi', 'DH', 1050),
      supplementaryItem('dhu', 'デュ', 'dhu', 'DH', 1051),
      null,
      null,
    ],
  },
  {
    key: 'additional-dw',
    label: 'DW',
    columns: [
      null,
      null,
      supplementaryItem('dwu', 'ドゥ', 'dwu', 'DW', 1060),
      null,
      null,
    ],
  },
  {
    key: 'additional-f',
    label: 'F',
    columns: [
      supplementaryItem('fa', 'ファ', 'fa', 'F', 1070),
      supplementaryItem('fi', 'フィ', 'fi', 'F', 1071),
      supplementaryItem('fyu', 'フュ', 'fyu', 'F', 1072),
      supplementaryItem('fe', 'フェ', 'fe', 'F', 1073),
      supplementaryItem('fo', 'フォ', 'fo', 'F', 1074),
    ],
  },
];

const supplementaryItems = supplementaryRows.flatMap((row) => row.columns.filter((item): item is KatakanaWithProgress => item !== null));

function isSupplementaryItem(item: KatakanaWithProgress) {
  return item.id.startsWith('supplementary:');
}

const basicFiveColumnRows: Array<{ key: string; label: string; groups: Array<string | null> }> = [
  { key: 'vokal', label: 'Vokal', groups: ['vokal'] },
  { key: 'k', label: 'K', groups: ['k'] },
  { key: 's', label: 'S', groups: ['s'] },
  { key: 't', label: 'T', groups: ['t'] },
  { key: 'n', label: 'N', groups: ['n'] },
  { key: 'h', label: 'H', groups: ['h'] },
  { key: 'm', label: 'M', groups: ['m'] },
  { key: 'y', label: 'Y', groups: ['y'] },
  { key: 'r', label: 'R', groups: ['r'] },
  { key: 'w', label: 'W / ン', groups: ['w', 'n-special'] },
];

function bySortOrder(a: KatakanaWithProgress, b: KatakanaWithProgress) {
  return (a.extra?.sort_order ?? 9999) - (b.extra?.sort_order ?? 9999);
}

function basicRows(items: KatakanaWithProgress[]): ChartRow[] {
  const basic = items.filter((item) => item.extra?.variant === 'basic');
  return basicFiveColumnRows.map((row) => {
    const groupItems = basic.filter((item) => row.groups.includes(item.extra?.group ?? null)).sort(bySortOrder);
    if (row.key === 'y') {
      const lookup = new Map(groupItems.map((item) => [item.reading, item]));
      return { key: row.key, label: row.label, columns: [lookup.get('ya') ?? null, null, lookup.get('yu') ?? null, null, lookup.get('yo') ?? null] };
    }
    if (row.key === 'w') {
      const lookup = new Map(groupItems.map((item) => [item.reading, item]));
      return { key: row.key, label: row.label, columns: [lookup.get('wa') ?? null, null, lookup.get('wo') ?? null, null, lookup.get('n') ?? null] };
    }
    return { key: row.key, label: row.label, columns: [...groupItems, ...Array(Math.max(0, 5 - groupItems.length)).fill(null)].slice(0, 5) };
  }).filter((row) => row.columns.some(Boolean));
}

function groupedRows(items: KatakanaWithProgress[], variant: KatakanaVariant): ChartRow[] {
  const variantItems = items.filter((item) => item.extra?.variant === variant);
  const groupNames: string[] = [];
  for (const item of variantItems) {
    const group = item.extra?.group ?? 'lainnya';
    if (!groupNames.includes(group)) groupNames.push(group);
  }
  return groupNames.map((group) => ({
    key: `${variant}-${group}`,
    label: group.toUpperCase(),
    columns: variantItems.filter((item) => (item.extra?.group ?? 'lainnya') === group).sort(bySortOrder),
  }));
}

function KanaStudyChart({ items, selectedId, onSelect, showSupplementary }: StudyChartProps) {
  const variants = new Set(items.map((item) => (item.extra?.variant ?? 'basic') as KatakanaVariant));
  const sections: Array<{ variant: KatakanaVariant; title: string; columns: 3 | 5; rows: ChartRow[] }> = [];

  if (variants.has('basic')) sections.push({ variant: 'basic', title: 'Katakana Dasar', columns: 5, rows: basicRows(items) });
  if (variants.has('dakuten')) sections.push({ variant: 'dakuten', title: 'Dakuten', columns: 5, rows: groupedRows(items, 'dakuten') });
  if (variants.has('handakuten')) sections.push({ variant: 'handakuten', title: 'Handakuten', columns: 5, rows: groupedRows(items, 'handakuten') });
  if (variants.has('yoon')) sections.push({ variant: 'yoon', title: 'Yōon', columns: 3, rows: groupedRows(items, 'yoon') });

  return <div className="kana-study-chart">
    {sections.map((section) => <div className={`kana-chart-section chart-${section.variant}`} key={section.variant}>
      {sections.length > 1 && <div className="kana-chart-title"><strong>{section.title}</strong><span>{section.variant === 'yoon' ? 'ャ · ュ · ョ' : 'a · i · u · e · o'}</span></div>}
      <div className="kana-chart-table">
        {section.rows.map((row) => <div className={`kana-chart-row cols-${section.columns}`} key={row.key}>
          <span className="kana-row-label">{row.label}</span>
          <div className={`kana-chart-cells cols-${section.columns}`}>
            {row.columns.map((item, index) => item ? <KanaCell key={item.id} item={item} selected={item.id === selectedId} onSelect={onSelect} /> : <span key={`${row.key}-blank-${index}`} className="kana-cell-placeholder" aria-hidden="true" />)}
          </div>
        </div>)}
      </div>
    </div>)}
    {showSupplementary && <div className="kana-chart-section chart-additional">
      <div className="kana-chart-title"><strong>Tambahan</strong><span>a · i · u · e · o</span></div>
      <div className="kana-chart-table">
        {supplementaryRows.map((row) => <div className="kana-chart-row cols-5" key={row.key}>
          <span className="kana-row-label">{row.label}</span>
          <div className="kana-chart-cells cols-5">
            {row.columns.map((item, index) => item ? <KanaCell key={item.id} item={item} selected={item.id === selectedId} onSelect={onSelect} /> : <span key={`${row.key}-blank-${index}`} className="kana-cell-placeholder" aria-hidden="true" />)}
          </div>
        </div>)}
      </div>
    </div>}
  </div>;
}

function KanaCell({ item, selected, onSelect }: { item: KatakanaWithProgress; selected: boolean; onSelect: (id: string) => void }) {
  const mastery = item.progress?.mastery_score ?? 0;
  const compound = Array.from(item.prompt).length > 1;
  return <button onClick={() => onSelect(item.id)} className={`hiragana-cell ${selected ? 'selected' : ''} ${mastery >= 80 ? 'mastered' : ''} ${compound ? 'compound' : ''}`}>
    <span className="kana-char kana-handwritten">{item.prompt}</span>
    <span className="kana-reading">{item.reading}</span>
    <span className="cell-mastery"><i style={{ width: `${mastery}%` }}/></span>
  </button>;
}

function MasteryBadge({ value }: { value: number }) {
  const label = value >= 80 ? 'Dikuasai' : value >= 40 ? 'Berkembang' : value > 0 ? 'Mulai' : 'Baru';
  return <span className={`mastery-badge m-${label.toLowerCase()}`}>{label} · {value}%</span>;
}

function FlashcardView({ items, onRate }: { items: KatakanaWithProgress[]; onRate: (id: string, rating: 0 | 1 | 2 | 3) => Promise<unknown> }) {
  const setKey = itemSetKey(items);
  const [deckIds, setDeckIds] = useState<string[]>(() => buildFlashcardDeck(items));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setDeckIds(buildFlashcardDeck(items));
    setIndex(0);
    setRevealed(false);
    setActionError(null);
  // Progress updates must NOT reset the deck. Only a different set/filter of kana does.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setKey]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!deckIds.length) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setIndex((current) => (current - 1 + deckIds.length) % deckIds.length);
        setRevealed(false);
        setActionError(null);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setIndex((current) => (current + 1) % deckIds.length);
        setRevealed(false);
        setActionError(null);
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setRevealed((current) => !current);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deckIds.length]);

  if (!deckIds.length) return <EmptyKana />;
  const safeIndex = index % deckIds.length;
  const cardId = deckIds[safeIndex];
  const card = items.find((item) => item.id === cardId) ?? items[0];
  if (!card) return <EmptyKana />;

  function goPrevious() {
    setIndex((current) => (current - 1 + deckIds.length) % deckIds.length);
    setRevealed(false);
    setActionError(null);
  }

  function goNext() {
    setIndex((current) => (current + 1) % deckIds.length);
    setRevealed(false);
    setActionError(null);
  }

  function shuffleDeck() {
    setDeckIds((current) => shuffleFlashcardDeck(current));
    setIndex(0);
    setRevealed(false);
    setActionError(null);
  }

  async function rate(rating: 0 | 1 | 2 | 3) {
    setSaving(true);
    setActionError(null);
    try {
      await onRate(card.id, rating);
      setIndex((current) => (current + 1) % deckIds.length);
      setRevealed(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gagal menyimpan review.');
    } finally { setSaving(false); }
  }

  const variant = variantLabels[(card.extra?.variant ?? 'basic') as KatakanaVariant];
  const group = card.extra?.group?.toUpperCase() ?? '—';

  return <div className="flashcard-stage">
    <div className="flashcard-meta"><span>{safeIndex + 1} / {deckIds.length}</span><span>Mastery {card.progress?.mastery_score ?? 0}%</span></div>
    <button
      type="button"
      className={`flashcard ${revealed ? 'revealed' : ''}`}
      onClick={() => setRevealed((current) => !current)}
      aria-pressed={revealed}
      aria-label={revealed ? `${card.prompt}, ${card.reading}. Klik untuk kembali ke sisi depan.` : `${card.prompt}. Klik untuk melihat jawaban.`}
    >
      <span className="flashcard-inner" aria-hidden="true">
        <span className="flashcard-face flashcard-front">
          <span className={`flash-kana kana-handwritten ${Array.from(card.prompt).length > 1 ? 'compound' : ''}`}>{card.prompt}</span>
          <span className="flash-hint">Klik / tap kartu untuk melihat jawaban</span>
        </span>
        <span className="flashcard-face flashcard-back">
          <span className={`flash-kana flash-kana-back kana-handwritten ${Array.from(card.prompt).length > 1 ? 'compound' : ''}`}>{card.prompt}</span>
          <span className="flash-reading">{card.reading}</span>
          <span className="flash-answer-meta">{variant} · Kelompok {group}</span>
          <span className="flash-hint">Klik / tap lagi untuk kembali</span>
        </span>
      </span>
    </button>

    <div className="flashcard-controls" aria-label="Navigasi flashcard">
      <button type="button" className="flash-prev" disabled={saving} onClick={goPrevious}>← Sebelumnya</button>
      <button type="button" className="flash-shuffle" disabled={saving} onClick={shuffleDeck}>Acak</button>
      <button type="button" className="flash-next" disabled={saving} onClick={goNext}>Selanjutnya →</button>
    </div>

    <button className="flash-audio" onClick={() => speakJapanese(card.prompt)}><Speaker size={17}/> Dengarkan pengucapan</button>
    {actionError && <div className="notice">Gagal menyimpan progres: {actionError}</div>}
    {revealed && <div className="rating-row">
      <button disabled={saving} onClick={() => void rate(0)}><strong>Lupa</strong><span>10 menit</span></button>
      <button disabled={saving} onClick={() => void rate(1)}><strong>Sulit</strong><span>1 hari</span></button>
      <button disabled={saving} onClick={() => void rate(2)}><strong>Ingat</strong><span>adaptif</span></button>
      <button disabled={saving} onClick={() => void rate(3)}><strong>Mudah</strong><span>lebih lama</span></button>
    </div>}
  </div>;
}

function buildFlashcardDeck(items: KatakanaWithProgress[]) {
  const now = Date.now();
  return [...items]
    .sort((a, b) => {
      const aDue = !a.progress || new Date(a.progress.due_at).getTime() <= now ? 0 : 1;
      const bDue = !b.progress || new Date(b.progress.due_at).getTime() <= now ? 0 : 1;
      return aDue - bDue || (a.progress?.mastery_score ?? 0) - (b.progress?.mastery_score ?? 0);
    })
    .map((item) => item.id);
}

function shuffleFlashcardDeck(ids: string[]) {
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (shuffled.length > 1 && shuffled.every((id, position) => id === ids[position])) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

type QuizMode = 'kana-romaji' | 'romaji-kana' | 'typing' | 'audio' | 'matching' | 'mixed';
type QuizQuestionKind = Exclude<QuizMode, 'matching' | 'mixed'>;
type QuizCount = 10 | 20 | 30 | 'all';
type QuizReviewView = 'result' | 'summary' | 'questions';

type QuizQuestion = {
  item: KatakanaWithProgress;
  kind: QuizQuestionKind;
  options: string[];
};

type QuizAttempt = {
  item: KatakanaWithProgress;
  kind: QuizQuestionKind | 'matching';
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
};

type MatchingRound = {
  items: KatakanaWithProgress[];
  readings: Array<{ id: string; reading: string }>;
};

const quizModes: Array<{ mode: QuizMode; title: string; description: string }> = [
  { mode: 'kana-romaji', title: 'Katakana → Romaji', description: 'Pilih romaji yang sesuai dengan Katakana.' },
  { mode: 'romaji-kana', title: 'Romaji → Katakana', description: 'Pilih Katakana berdasarkan romaji.' },
  { mode: 'typing', title: 'Ketik Jawaban', description: 'Ketik romaji dari Katakana yang tampil.' },
  { mode: 'audio', title: 'Dengarkan & Pilih', description: 'Dengarkan bunyi lalu pilih Katakana yang benar.' },
  { mode: 'matching', title: 'Matching', description: 'Cocokkan Katakana dan romaji dalam satu ronde.' },
  { mode: 'mixed', title: 'Quiz Campuran', description: 'Jenis pertanyaan berubah secara acak.' },
];

const quizCounts: QuizCount[] = [10, 20, 30, 'all'];

function QuizView({ items, onRate }: { items: KatakanaWithProgress[]; onRate: (id: string, rating: 0 | 1 | 2 | 3) => Promise<unknown> }) {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [count, setCount] = useState<QuizCount>(items.length >= 10 ? 10 : 'all');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [matchingRounds, setMatchingRounds] = useState<MatchingRound[]>([]);
  const [matchingRoundIndex, setMatchingRoundIndex] = useState(0);
  const [matchingSelectedId, setMatchingSelectedId] = useState<string | null>(null);
  const [matchingCompletedIds, setMatchingCompletedIds] = useState<string[]>([]);
  const [matchingMistakeIds, setMatchingMistakeIds] = useState<string[]>([]);
  const [matchingWrongReading, setMatchingWrongReading] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [answerCorrect, setAnswerCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [reviewView, setReviewView] = useState<QuizReviewView>('result');
  const [reviewIndex, setReviewIndex] = useState(0);
  const { soundEnabled, toggleSound, playCorrect, playIncorrect, playComplete } = useQuizSounds();

  const audioSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const setKey = itemSetKey(items);

  useEffect(() => {
    setMode(null);
    setCount(items.length >= 10 ? 10 : 'all');
    setQuestions([]);
    setMatchingRounds([]);
    setMatchingRoundIndex(0);
    setMatchingSelectedId(null);
    setMatchingCompletedIds([]);
    setMatchingMistakeIds([]);
    setMatchingWrongReading(null);
    setIndex(0);
    setSelected(null);
    setTypedAnswer('');
    setAnswered(false);
    setAnswerCorrect(false);
    setScore(0);
    setFinished(false);
    setStarted(false);
    setSaving(false);
    setActionError(null);
    setAttempts([]);
    setReviewView('result');
    setReviewIndex(0);
  // Review progress changes do not alter the item id set, so an answer save will not restart the quiz.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setKey]);

  if (items.length < 4) return <EmptyKana text="Pilih kelompok dengan minimal 4 huruf untuk memulai quiz." />;

  function sessionSize(selectedCount: QuizCount) {
    if (selectedCount === 'all') return items.length;
    return Math.min(selectedCount, items.length);
  }

  function startQuiz() {
    if (!mode) return;
    if (mode === 'audio' && !audioSupported) return;

    const deck = shuffle(items).slice(0, sessionSize(count));
    if (!deck.length) return;

    if (mode === 'matching') {
      setMatchingRounds(buildMatchingRounds(deck));
      setQuestions([]);
    } else {
      const mixedKinds: QuizQuestionKind[] = audioSupported
        ? ['kana-romaji', 'romaji-kana', 'typing', 'audio']
        : ['kana-romaji', 'romaji-kana', 'typing'];
      const next = deck.map((item) => {
        const kind: QuizQuestionKind = mode === 'mixed'
          ? mixedKinds[Math.floor(Math.random() * mixedKinds.length)]
          : mode;
        return {
          item,
          kind,
          options: kind === 'kana-romaji'
            ? buildReadingOptions(item, items)
            : kind === 'romaji-kana' || kind === 'audio'
              ? buildKanaOptions(item, items)
              : [],
        };
      });
      setQuestions(next);
      setMatchingRounds([]);
    }

    setMatchingRoundIndex(0);
    setMatchingSelectedId(null);
    setMatchingCompletedIds([]);
    setMatchingMistakeIds([]);
    setMatchingWrongReading(null);
    setIndex(0);
    setSelected(null);
    setTypedAnswer('');
    setAnswered(false);
    setAnswerCorrect(false);
    setScore(0);
    setFinished(false);
    setStarted(true);
    setSaving(false);
    setActionError(null);
    setAttempts([]);
    setReviewView('result');
    setReviewIndex(0);
  }

  function chooseAnotherQuiz() {
    setMode(null);
    setStarted(false);
    setFinished(false);
    setQuestions([]);
    setMatchingRounds([]);
    setIndex(0);
    setScore(0);
    setSelected(null);
    setTypedAnswer('');
    setAnswered(false);
    setActionError(null);
    setAttempts([]);
    setReviewView('result');
    setReviewIndex(0);
  }

  if (!started) {
    return <div className="quiz-shell quiz-setup">
      <div className="quiz-setup-card">
        <div className="quiz-setup-heading">
          <p className="eyebrow">PILIH JENIS QUIZ</p>
          <h2>Latihan Katakana</h2>
          <p>Pilih cara latihan dan jumlah soal untuk sesi ini.</p>
        </div>

        <div className="quiz-mode-grid">
          {quizModes.map((option, position) => {
            const disabled = option.mode === 'audio' && !audioSupported;
            return <button
              type="button"
              key={option.mode}
              className={mode === option.mode ? 'active' : ''}
              disabled={disabled}
              onClick={() => setMode(option.mode)}
            >
              <span className="quiz-mode-number">{position + 1}</span>
              <span><strong>{option.title}</strong><small>{disabled ? 'Audio browser tidak tersedia.' : option.description}</small></span>
            </button>;
          })}
        </div>

        <div className="quiz-count-block">
          <strong>Jumlah soal</strong>
          <div className="quiz-count-row">
            {quizCounts.map((option) => {
              const disabled = option !== 'all' && option > items.length;
              return <button
                type="button"
                key={String(option)}
                className={count === option ? 'active' : ''}
                disabled={disabled}
                onClick={() => setCount(option)}
              >
                {option === 'all' ? `Semua (${items.length})` : `${option} soal`}
              </button>;
            })}
          </div>
        </div>

        <button type="button" className="primary-btn quiz-start-button" disabled={!mode} onClick={startQuiz}>Mulai Quiz</button>
      </div>
    </div>;
  }

  const total = mode === 'matching'
    ? matchingRounds.reduce((sum, round) => sum + round.items.length, 0)
    : questions.length;
  const wrongAttempts = attempts.filter((attempt) => !attempt.correct);

  if (finished) {
    if (reviewView === 'summary') {
      return <QuizWrongSummary attempts={wrongAttempts} onBack={() => setReviewView('result')} />;
    }

    if (reviewView === 'questions') {
      return <QuizWrongQuestionReview
        attempts={wrongAttempts}
        index={reviewIndex}
        onIndex={setReviewIndex}
        onBack={() => {
          setReviewView('result');
          setReviewIndex(0);
        }}
      />;
    }

    const wrong = Math.max(total - score, 0);
    const pct = total ? Math.round((score / total) * 100) : 0;
    return <div className="quiz-result">
      <div className="result-icon"><Sparkles size={30}/></div>
      <p className="eyebrow">HASIL QUIZ</p>
      <h2>{score}/{total}</h2>
      <strong className="quiz-result-score-label">Nilai: {pct}%</strong>
      <div className="quiz-result-stats"><span><strong>{score}</strong>Benar</span><span><strong>{wrong}</strong>Salah</span><span><strong>{total}</strong>Total</span></div>
      <p>{pct >= 80 ? 'Bagus! Pertahankan dan lanjutkan review berkala.' : 'Ulangi huruf yang masih sulit lalu coba lagi.'}</p>
      <div className="quiz-result-actions">
        <button className="primary-btn" onClick={startQuiz}><RotateCcw size={17}/> Ulangi Quiz</button>
        <button className="ghost-btn" onClick={chooseAnotherQuiz}><Target size={17}/> Pilih Quiz Lain</button>
      </div>
      {wrongAttempts.length > 0 && <div className="quiz-review-actions">
        <span>REVIEW JAWABAN SALAH</span>
        <div>
          <button type="button" className="ghost-btn" onClick={() => setReviewView('summary')}>Rekapan Jawaban Salah</button>
          <button type="button" className="ghost-btn" onClick={() => {
            setReviewIndex(0);
            setReviewView('questions');
          }}>Lihat Soal yang Salah</button>
        </div>
      </div>}
    </div>;
  }

  if (mode === 'matching') {
    const round = matchingRounds[matchingRoundIndex];
    if (!round) return <EmptyKana text="Ronde matching tidak tersedia." />;
    const completedInRound = round.items.filter((item) => matchingCompletedIds.includes(item.id)).length;
    const answeredCount = matchingCompletedIds.length;
    const wrong = answeredCount - score;
    const roundDone = completedInRound === round.items.length;

    async function chooseMatchingReading(reading: string) {
      if (!matchingSelectedId || saving || roundDone) return;
      const item = round.items.find((candidate) => candidate.id === matchingSelectedId);
      if (!item || matchingCompletedIds.includes(item.id)) return;

      if (item.reading !== reading) {
        playIncorrect();
        setMatchingWrongReading(reading);
        setMatchingMistakeIds((current) => current.includes(item.id) ? current : [...current, item.id]);
        setAttempts((current) => {
          const nextAttempt: QuizAttempt = {
            item,
            kind: 'matching',
            options: round.readings.map((entry) => entry.reading),
            userAnswer: reading,
            correctAnswer: item.reading,
            correct: false,
          };
          const existingIndex = current.findIndex((attempt) => attempt.kind === 'matching' && attempt.item.id === item.id);
          if (existingIndex < 0) return [...current, nextAttempt];
          const next = [...current];
          next[existingIndex] = nextAttempt;
          return next;
        });
        return;
      }

      const hadMistake = matchingMistakeIds.includes(item.id);
      playCorrect();
      if (!hadMistake) {
        setScore((value) => value + 1);
        setAttempts((current) => [...current, {
          item,
          kind: 'matching',
          options: round.readings.map((entry) => entry.reading),
          userAnswer: reading,
          correctAnswer: item.reading,
          correct: true,
        }]);
      }
      setMatchingCompletedIds((current) => [...current, item.id]);
      setMatchingSelectedId(null);
      setMatchingWrongReading(null);
      setSaving(true);
      setActionError(null);
      try {
        await onRate(item.id, hadMistake ? 0 : 2);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Gagal menyimpan jawaban.');
      } finally { setSaving(false); }
    }

    function nextMatchingRound() {
      if (!roundDone || saving) return;
      if (matchingRoundIndex + 1 >= matchingRounds.length) {
        playComplete();
        setFinished(true);
      }
      else {
        setMatchingRoundIndex((value) => value + 1);
        setMatchingSelectedId(null);
        setMatchingWrongReading(null);
      }
    }

    return <div className="quiz-shell">
      <QuizTop position={Math.min(answeredCount + 1, total)} completed={answeredCount} total={total} score={score} wrong={wrong} soundEnabled={soundEnabled} onSoundToggle={toggleSound} />
      <div className="quiz-question-card quiz-matching-card">
        <p>Cocokkan Katakana dengan romaji.</p>
        <div className="matching-board">
          <div className="matching-column matching-kana-column">
            {round.items.map((item) => {
              const completed = matchingCompletedIds.includes(item.id);
              return <button
                type="button"
                key={item.id}
                disabled={completed || saving}
                className={`${matchingSelectedId === item.id ? 'selected' : ''} ${completed ? 'completed' : ''}`}
                onClick={() => {
                  setMatchingSelectedId(item.id);
                  setMatchingWrongReading(null);
                }}
              >
                <span className={`kana-handwritten ${Array.from(item.prompt).length > 1 ? 'compound' : ''}`}>{item.prompt}</span>
                {completed && <Check size={17}/>} 
              </button>;
            })}
          </div>
          <div className="matching-column matching-reading-column">
            {round.readings.map((entry) => {
              const completed = matchingCompletedIds.includes(entry.id);
              const wrongState = matchingWrongReading === entry.reading;
              return <button
                type="button"
                key={entry.id}
                disabled={completed || saving || !matchingSelectedId}
                className={`${completed ? 'completed' : ''} ${wrongState ? 'wrong' : ''}`}
                onClick={() => void chooseMatchingReading(entry.reading)}
              >
                {entry.reading}
                {completed && <Check size={17}/>} 
              </button>;
            })}
          </div>
        </div>
        <small className="matching-hint">Pilih Katakana di kiri, lalu pilih romaji pasangannya di kanan.</small>
        {actionError && <div className="notice">Jawaban tersimpan di sesi, tetapi progres gagal disimpan: {actionError}</div>}
        {roundDone && <div className="quiz-feedback ok">
          <strong>Ronde selesai.</strong>
          <button disabled={saving} onClick={nextMatchingRound}>{matchingRoundIndex + 1 === matchingRounds.length ? 'Lihat hasil' : 'Ronde berikutnya'} <ChevronRight size={17}/></button>
        </div>}
      </div>
    </div>;
  }

  const question = questions[index];
  if (!question) return <EmptyKana text="Soal quiz tidak tersedia." />;
  const answeredCount = index + (answered ? 1 : 0);
  const wrong = answeredCount - score;

  async function submitAnswer(value: string) {
    if (answered || saving) return;
    const expected = question.kind === 'kana-romaji' || question.kind === 'typing'
      ? question.item.reading
      : question.item.prompt;
    const normalizedValue = question.kind === 'typing' ? normalizeAnswer(value) : value;
    const normalizedExpected = question.kind === 'typing' ? normalizeAnswer(expected) : expected;
    const correct = normalizedValue === normalizedExpected;
    if (correct) playCorrect();
    else playIncorrect();

    setSelected(value);
    setAnswered(true);
    setAnswerCorrect(correct);
    setAttempts((current) => [...current, {
      item: question.item,
      kind: question.kind,
      options: question.options,
      userAnswer: value,
      correctAnswer: expected,
      correct,
    }]);
    if (correct) setScore((current) => current + 1);
    setSaving(true);
    setActionError(null);
    try {
      await onRate(question.item.id, correct ? 2 : 0);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gagal menyimpan jawaban.');
    } finally { setSaving(false); }
  }

  function next() {
    if (saving) return;
    if (index + 1 >= questions.length) {
      playComplete();
      setFinished(true);
    }
    else {
      setIndex((value) => value + 1);
      setSelected(null);
      setTypedAnswer('');
      setAnswered(false);
      setAnswerCorrect(false);
      setActionError(null);
    }
  }

  const correctDisplay = question.kind === 'kana-romaji' || question.kind === 'typing'
    ? question.item.reading
    : question.item.prompt;

  return <div className="quiz-shell">
    <QuizTop position={index + 1} completed={answeredCount} total={questions.length} score={score} wrong={wrong} soundEnabled={soundEnabled} onSoundToggle={toggleSound} />
    <div className="quiz-question-card">
      <QuizPrompt question={question} />

      {question.kind === 'typing' ? <form className="quiz-type-form" onSubmit={(event) => {
        event.preventDefault();
        if (typedAnswer.trim()) void submitAnswer(typedAnswer);
      }}>
        <input
          type="text"
          value={typedAnswer}
          disabled={answered || saving}
          onChange={(event) => setTypedAnswer(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label="Jawaban romaji"
          placeholder="Ketik romaji…"
        />
        <button type="submit" className="primary-btn" disabled={answered || saving || !typedAnswer.trim()}>Jawab</button>
      </form> : <div className={`quiz-options ${question.kind === 'romaji-kana' || question.kind === 'audio' ? 'kana-options' : ''}`}>
        {question.options.map((option) => {
          const expected = question.kind === 'kana-romaji' ? question.item.reading : question.item.prompt;
          let state = '';
          if (answered && option === expected) state = 'correct';
          else if (answered && option === selected) state = 'wrong';
          const compound = question.kind !== 'kana-romaji' && Array.from(option).length > 1;
          return <button
            type="button"
            disabled={answered || saving}
            className={`${state} ${compound ? 'compound' : ''}`}
            key={option}
            onClick={() => void submitAnswer(option)}
          >
            {option}{state === 'correct' && <Check size={17}/>} {state === 'wrong' && <X size={17}/>} 
          </button>;
        })}
      </div>}

      {actionError && <div className="notice">Jawaban tampil, tetapi progres gagal disimpan: {actionError}</div>}
      {answered && <div className={`quiz-feedback ${answerCorrect ? 'ok' : 'bad'}`}>
        <strong>{answerCorrect ? 'Benar!' : `Salah. Jawaban benar: ${correctDisplay}`}</strong>
        <button disabled={saving} onClick={next}>{index + 1 === questions.length ? 'Lihat hasil' : 'Soal berikutnya'} <ChevronRight size={17}/></button>
      </div>}
    </div>
  </div>;
}


function quizKindLabel(kind: QuizAttempt['kind']) {
  if (kind === 'kana-romaji') return 'Katakana → Romaji';
  if (kind === 'romaji-kana') return 'Romaji → Katakana';
  if (kind === 'typing') return 'Ketik Jawaban';
  if (kind === 'audio') return 'Dengarkan & Pilih';
  return 'Matching';
}

function reviewPrompt(attempt: QuizAttempt) {
  if (attempt.kind === 'romaji-kana') return attempt.item.reading;
  if (attempt.kind === 'audio') return attempt.item.prompt;
  if (attempt.kind === 'matching') return attempt.item.prompt;
  return attempt.item.prompt;
}

function QuizWrongSummary({ attempts, onBack }: { attempts: QuizAttempt[]; onBack: () => void }) {
  return <div className="quiz-shell quiz-review-shell">
    <div className="quiz-review-header">
      <div>
        <p className="eyebrow">REVIEW QUIZ</p>
        <h2>Rekapan Jawaban Salah</h2>
        <p>{attempts.length} jawaban perlu dipelajari kembali.</p>
      </div>
      <button type="button" className="ghost-btn" onClick={onBack}>Kembali ke Hasil</button>
    </div>

    <div className="quiz-wrong-list">
      {attempts.map((attempt, position) => <article className="quiz-wrong-item" key={`${attempt.item.id}-${attempt.kind}-${position}`}>
        <div className="quiz-wrong-item-top">
          <span>{position + 1}</span>
          <small>{quizKindLabel(attempt.kind)}</small>
        </div>
        <div className={`quiz-wrong-prompt ${attempt.kind === 'romaji-kana' ? 'romaji' : 'kana-handwritten'}`}>
          {attempt.kind === 'audio' && <Speaker size={18}/>}
          {reviewPrompt(attempt)}
        </div>
        <div className="quiz-review-answer-grid">
          <div><span>Jawaban kamu</span><strong className="wrong-answer">{attempt.userAnswer || '—'}</strong></div>
          <div><span>Jawaban benar</span><strong className="correct-answer">{attempt.correctAnswer}</strong></div>
        </div>
      </article>)}
    </div>

    <button type="button" className="ghost-btn quiz-review-back" onClick={onBack}>Kembali ke Hasil</button>
  </div>;
}

function QuizWrongQuestionReview({
  attempts,
  index,
  onIndex,
  onBack,
}: {
  attempts: QuizAttempt[];
  index: number;
  onIndex: (value: number) => void;
  onBack: () => void;
}) {
  if (!attempts.length) {
    return <div className="quiz-result">
      <p className="eyebrow">REVIEW QUIZ</p>
      <h2>Tidak ada jawaban salah</h2>
      <button type="button" className="ghost-btn" onClick={onBack}>Kembali ke Hasil</button>
    </div>;
  }

  const safeIndex = Math.min(Math.max(index, 0), attempts.length - 1);
  const attempt = attempts[safeIndex];

  if (attempt.kind === 'matching') {
    return <div className="quiz-shell quiz-review-shell">
      <QuizReviewToolbar onBack={onBack} />
      <div className="quiz-question-card quiz-review-question-card">
        <p>Review pasangan Matching.</p>
        <div className={`quiz-review-main-prompt kana-handwritten ${Array.from(attempt.item.prompt).length > 1 ? 'compound' : ''}`}>{attempt.item.prompt}</div>
        <div className="quiz-review-answer-grid">
          <div><span>Jawaban kamu</span><strong className="wrong-answer">{attempt.userAnswer}</strong></div>
          <div><span>Jawaban benar</span><strong className="correct-answer">{attempt.correctAnswer}</strong></div>
        </div>
      </div>
      <QuizReviewNavigation index={safeIndex} total={attempts.length} onIndex={onIndex} />
    </div>;
  }

  const question: QuizQuestion = {
    item: attempt.item,
    kind: attempt.kind,
    options: attempt.options,
  };

  return <div className="quiz-shell quiz-review-shell">
    <QuizReviewToolbar onBack={onBack} />
    <div className="quiz-question-card quiz-review-question-card">
      <QuizPrompt question={question} />

      {question.kind === 'typing' ? <div className="quiz-review-answer-grid">
        <div><span>Jawaban kamu</span><strong className="wrong-answer">{attempt.userAnswer || '—'}</strong></div>
        <div><span>Jawaban benar</span><strong className="correct-answer">{attempt.correctAnswer}</strong></div>
      </div> : <>
        <div className={`quiz-options quiz-review-options ${question.kind === 'romaji-kana' || question.kind === 'audio' ? 'kana-options' : ''}`}>
          {question.options.map((option) => {
            const isCorrect = option === attempt.correctAnswer;
            const isUserAnswer = option === attempt.userAnswer;
            const compound = question.kind !== 'kana-romaji' && Array.from(option).length > 1;
            return <button
              type="button"
              disabled
              className={`${isCorrect ? 'correct' : ''} ${isUserAnswer && !isCorrect ? 'wrong' : ''} ${compound ? 'compound' : ''}`}
              key={option}
            >
              {option}
              {isCorrect && <Check size={17}/>}
              {isUserAnswer && !isCorrect && <X size={17}/>}
            </button>;
          })}
        </div>
        <div className="quiz-review-answer-grid">
          <div><span>Jawaban kamu</span><strong className="wrong-answer">{attempt.userAnswer || '—'}</strong></div>
          <div><span>Jawaban benar</span><strong className="correct-answer">{attempt.correctAnswer}</strong></div>
        </div>
      </>}
    </div>
    <QuizReviewNavigation index={safeIndex} total={attempts.length} onIndex={onIndex} />
  </div>;
}

function QuizReviewToolbar({ onBack }: { onBack: () => void }) {
  return <div className="quiz-review-toolbar">
    <button type="button" className="ghost-btn" onClick={onBack}>Kembali ke Hasil</button>
    <span>Review soal salah</span>
  </div>;
}

function QuizReviewNavigation({
  index,
  total,
  onIndex,
}: {
  index: number;
  total: number;
  onIndex: (value: number) => void;
}) {
  return <div className="quiz-review-nav" aria-label="Navigasi review jawaban salah">
    <button type="button" disabled={index === 0} onClick={() => onIndex(index - 1)}>← Sebelumnya</button>
    <strong>{index + 1} / {total}</strong>
    <button type="button" disabled={index + 1 >= total} onClick={() => onIndex(index + 1)}>Selanjutnya →</button>
  </div>;
}

function QuizTop({ position, completed, total, score, wrong, soundEnabled, onSoundToggle }: { position: number; completed: number; total: number; score: number; wrong: number; soundEnabled: boolean; onSoundToggle: () => void }) {
  return <div className="quiz-top quiz-top-expanded quiz-sfx-host">
    <span>Soal {position} / {total}</span>
    <div className="quiz-progress"><i style={{ width: `${total ? (completed / total) * 100 : 0}%` }}/></div>
    <strong>Benar: {score}</strong>
    <strong>Salah: {Math.max(wrong, 0)}</strong>
    <QuizSoundToggle enabled={soundEnabled} onToggle={onSoundToggle}/>
  </div>;
}

function QuizPrompt({ question }: { question: QuizQuestion }) {
  if (question.kind === 'romaji-kana') {
    return <>
      <p>Pilih Katakana yang benar.</p>
      <div className="quiz-romaji-prompt">{question.item.reading}</div>
    </>;
  }

  if (question.kind === 'audio') {
    return <>
      <p>Dengarkan bunyi, lalu pilih Katakana yang benar.</p>
      <button type="button" className="quiz-listen-main" onClick={() => speakJapanese(question.item.prompt)}><Speaker size={20}/> Dengarkan</button>
    </>;
  }

  return <>
    <p>{question.kind === 'typing' ? 'Ketik romaji yang benar.' : 'Pilih romaji yang benar.'}</p>
    {question.kind === 'kana-romaji' && <button type="button" className="quiz-sound" onClick={() => speakJapanese(question.item.prompt)}><Speaker size={17}/></button>}
    <div className={`quiz-kana kana-handwritten ${Array.from(question.item.prompt).length > 1 ? 'compound' : ''}`}>{question.item.prompt}</div>
  </>;
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function buildMatchingRounds(deck: KatakanaWithProgress[]): MatchingRound[] {
  if (!deck.length) return [];
  const remaining = [...deck];
  const roundCount = Math.max(1, Math.ceil(deck.length / 6));
  const baseSize = Math.floor(deck.length / roundCount);
  const largerRounds = deck.length % roundCount;
  const rounds: MatchingRound[] = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const targetSize = baseSize + (roundIndex < largerRounds ? 1 : 0);
    const roundItems: KatakanaWithProgress[] = [];
    const usedReadings = new Set<string>();

    for (let candidateIndex = 0; candidateIndex < remaining.length && roundItems.length < targetSize;) {
      const candidate = remaining[candidateIndex];
      if (!usedReadings.has(candidate.reading)) {
        roundItems.push(candidate);
        usedReadings.add(candidate.reading);
        remaining.splice(candidateIndex, 1);
      } else {
        candidateIndex += 1;
      }
    }

    while (roundItems.length < targetSize && remaining.length) {
      roundItems.push(remaining.shift()!);
    }

    rounds.push({
      items: roundItems,
      readings: shuffle(roundItems.map((item) => ({ id: item.id, reading: item.reading }))),
    });
  }

  return rounds;
}

function buildReadingOptions(correct: KatakanaWithProgress, pool: KatakanaWithProgress[]) {
  const others = shuffle(pool.filter((item) => item.id !== correct.id && item.reading !== correct.reading));
  const readings = Array.from(new Set(others.map((item) => item.reading))).slice(0, 3);
  return shuffle([correct.reading, ...readings]);
}

function buildKanaOptions(correct: KatakanaWithProgress, pool: KatakanaWithProgress[]) {
  const others = shuffle(pool.filter((item) => item.id !== correct.id && item.prompt !== correct.prompt));
  const prompts = Array.from(new Set(others.map((item) => item.prompt))).slice(0, 3);
  return shuffle([correct.prompt, ...prompts]);
}

function shuffle<T>(source: T[]) {
  const copy = [...source];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function EmptyKana({ text = 'Belum ada data Katakana pada kelompok ini.' }: { text?: string }) {
  return <div className="empty-state"><BookOpen size={34}/><h2>Belum ada data</h2><p>{text}</p></div>;
}
