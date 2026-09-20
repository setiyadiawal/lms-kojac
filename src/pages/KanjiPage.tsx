import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Lightbulb, Search, Speaker, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { speakJapanese } from '../features/hiragana/useHiragana';
import { KanjiFlashcard } from '../features/kanji/KanjiFlashcard';
import { KanjiQuiz } from '../features/kanji/KanjiQuiz';
import { KanjiStrokeOrder } from '../features/kanji/KanjiStrokeOrder';
import { KanjiWritingPractice } from '../features/kanji/KanjiWritingPractice';
import { hasKanjiReview, isKanjiDue, type KanjiItem, type KanjiLevel, type KanjiRelated, useKanji } from '../features/kanji/useKanji';
import '../features/kanji/kanji.css';

const LEVELS: Array<{ level: KanjiLevel; label: string; active: boolean }> = [
  { level: 'N5', label: 'Dasar', active: true },
  { level: 'N4', label: 'Dasar lanjut', active: true },
  { level: 'N3', label: 'Menengah', active: true },
  { level: 'N2', label: 'Menengah lanjut', active: false },
  { level: 'N1', label: 'Mahir', active: false },
];

const CATEGORY_ORDER = ['Angka', 'Waktu', 'Orang', 'Alam', 'Sekolah', 'Bahasa', 'Posisi', 'Tubuh', 'Sifat', 'Aktivitas', 'Kehidupan'];

type CategoryFilter = 'Semua' | string;
type KanjiStudyTab = 'study' | 'flashcard' | 'quiz';
type KanjiProgressFilter = 'all' | 'not_started' | 'learning' | 'mastered' | 'due';

const PROGRESS_FILTERS: Array<{ key: KanjiProgressFilter; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'not_started', label: 'Belum Dipelajari' },
  { key: 'learning', label: 'Sedang Dipelajari' },
  { key: 'mastered', label: 'Dikuasai' },
  { key: 'due', label: 'Perlu Review' },
];

function matchesKanjiProgress(item: KanjiItem, filter: KanjiProgressFilter, nowMs: number) {
  if (filter === 'all') return true;
  if (filter === 'not_started') return !hasKanjiReview(item.progress);
  if (filter === 'learning') return hasKanjiReview(item.progress) && (item.progress?.mastery_score ?? 0) < 80;
  if (filter === 'mastered') return (item.progress?.mastery_score ?? 0) >= 80;
  return isKanjiDue(item.progress, nowMs);
}

export function KanjiPage() {
  const { level: levelParam } = useParams();
  if (!levelParam) return <KanjiLevelIndex />;

  const normalized = levelParam.toUpperCase();
  const level = LEVELS.find((entry) => entry.level === normalized);

  if (!level || !level.active) return <KanjiComingSoon level={normalized} />;
  return <KanjiStudyPage level={level.level} />;
}

function KanjiLevelIndex() {
  return <div className="page kanji-page">
    <div className="kanji-breadcrumb"><Link to="/belajar"><ArrowLeft size={16}/> Belajar</Link><span>/</span><strong>Kanji</strong></div>

    <div className="page-header kanji-main-header">
      <div>
        <p className="eyebrow">KOJAC · KANJI</p>
        <h1><span className="kanji-heading-jp">漢字</span> <span>Kanji</span></h1>
        <p>Level aktif saat ini mencakup JLPT N5 hingga N3. N2 dan N1 akan ditambahkan bertahap setelah data siap.</p>
      </div>
    </div>

    <section className="kanji-level-section" aria-labelledby="kanji-level-title">
      <div className="kanji-section-heading">
        <div><p className="eyebrow">PILIH LEVEL</p><h2 id="kanji-level-title">JLPT Kanji</h2></div>
        <span>Mulai dari N5, lalu lanjutkan bertahap.</span>
      </div>

      <div className="kanji-level-grid">
        {LEVELS.map((entry) => entry.active ? (
          <Link key={entry.level} className="kanji-level-card active" to={`/belajar/kanji/${entry.level.toLowerCase()}`}>
            <span className="kanji-level-kicker">JLPT</span>
            <strong>{entry.level}</strong>
            <small>{entry.label}</small>
            <span className="kanji-level-action">Mulai belajar <ChevronRight size={16}/></span>
          </Link>
        ) : (
          <div key={entry.level} className="kanji-level-card disabled" aria-disabled="true">
            <span className="kanji-level-kicker">JLPT</span>
            <strong>{entry.level}</strong>
            <small>{entry.label}</small>
            <span className="kanji-level-soon">Segera hadir</span>
          </div>
        ))}
      </div>
    </section>
  </div>;
}

function KanjiComingSoon({ level }: { level: string }) {
  return <div className="page kanji-page">
    <div className="kanji-breadcrumb"><Link to="/belajar/kanji"><ArrowLeft size={16}/> Kanji</Link><span>/</span><strong>{level}</strong></div>
    <div className="empty-state">
      <BookOpen size={34}/>
      <h2>Kanji {level} segera hadir</h2>
      <p>Level ini belum diaktifkan. KOJAC sedang menyiapkan data berikutnya secara bertahap agar kualitas materi tetap konsisten.</p>
    </div>
  </div>;
}

function KanjiStudyPage({ level }: { level: KanjiLevel }) {
  const { items, categories, stats, progressNowMs, loading, error, recordReview } = useKanji(level);
  const [activeTab, setActiveTab] = useState<KanjiStudyTab>('study');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('Semua');
  const [progressFilter, setProgressFilter] = useState<KanjiProgressFilter>('all');
  const [selected, setSelected] = useState<KanjiItem | null>(null);
  const [srsReviewIds, setSrsReviewIds] = useState<string[] | null>(null);

  const orderedCategories = useMemo(() => [...categories].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b, 'id');
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }), [categories]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      if (category !== 'Semua' && item.category !== category) return false;
      if (!matchesKanjiProgress(item, progressFilter, progressNowMs)) return false;
      if (!needle) return true;

      const searchable = [
        item.prompt,
        item.meaning,
        ...item.onyomi,
        ...item.kunyomi,
        ...item.examples.flatMap((example) => [example.word, example.reading, example.romaji, example.meaning_id]),
      ].join(' ').toLowerCase();

      return searchable.includes(needle);
    });
  }, [items, category, progressFilter, progressNowMs, query]);

  useEffect(() => {
    if (!selected) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selected]);

  return <div className="page kanji-page">
    <div className="kanji-breadcrumb">
      <Link to="/belajar"><ArrowLeft size={16}/> Belajar</Link>
      <span>/</span>
      <Link to="/belajar/kanji">Kanji</Link>
      <span>/</span>
      <strong>{level}</strong>
    </div>

    <div className="page-header kanji-study-header">
      <div>
        <p className="eyebrow">KANJI · JLPT {level}</p>
        <h1><span className="kanji-heading-jp">漢字</span> <span>{level}</span></h1>
        <p>Pelajari Kanji dasar melalui arti, 音読み (Onyomi), 訓読み (Kunyomi), jumlah goresan, dan contoh kosakata.</p>
      </div>
      <div className="kanji-count-badge"><strong>{loading ? '…' : items.length}</strong><span>Kanji</span></div>
    </div>

    <div className="kanji-progress-strip" aria-label={`Progress Kanji ${level}`}>
      <span><strong>{stats.total}</strong>Total</span>
      <span><strong>{stats.started}</strong>Dipelajari</span>
      <span><strong>{stats.mastered}</strong>Dikuasai</span>
      <span><strong>{stats.due}</strong>Perlu Review</span>
      <span><strong>{stats.accuracy}%</strong>Akurasi</span>
      <span><strong>{stats.averageMastery}%</strong>Mastery</span>
    </div>

    <div className="kanji-tabs" role="tablist" aria-label="Mode belajar Kanji">
      <button
        className={activeTab === 'study' ? 'active' : ''}
        type="button"
        aria-selected={activeTab === 'study'}
        onClick={() => { setActiveTab('study'); setSelected(null); setSrsReviewIds(null); }}
      ><BookOpen size={17}/> Pelajari</button>
      <button
        className={activeTab === 'flashcard' ? 'active' : ''}
        type="button"
        aria-selected={activeTab === 'flashcard'}
        onClick={() => { setActiveTab('flashcard'); setSelected(null); setSrsReviewIds(null); }}
      >Flashcard</button>
      <button
        className={activeTab === 'quiz' ? 'active' : ''}
        type="button"
        aria-selected={activeTab === 'quiz'}
        onClick={() => { setActiveTab('quiz'); setSelected(null); setSrsReviewIds(null); }}
      >Quiz</button>
    </div>

    {activeTab === 'study' && <div className="kanji-srs-entry" aria-live="polite">
      <div>
        <strong>Perlu Review</strong>
        <span>{stats.due > 0 ? `${stats.due} Kanji sudah jatuh tempo.` : 'Tidak ada Kanji yang perlu direview saat ini.'}</span>
      </div>
      <button
        type="button"
        disabled={stats.due === 0}
        onClick={() => {
          const dueIds = items
            .filter((item) => isKanjiDue(item.progress, progressNowMs))
            .map((item) => item.id);
          setSrsReviewIds(dueIds);
          setActiveTab('flashcard');
          setSelected(null);
        }}
      >
        Review Sekarang{stats.due > 0 ? ` · ${stats.due}` : ''}
      </button>
    </div>}

    {error && <div className="notice">Gagal memuat Kanji {level}: {error}. Pastikan migration dataset untuk level ini sudah dijalankan.</div>}

    {activeTab === 'flashcard' ? (
      loading ? <KanjiGridSkeleton /> : <KanjiFlashcard
        key={`kanji-flashcard-${level}-${srsReviewIds ? 'srs' : 'normal'}`}
        items={srsReviewIds ? items.filter((item) => srsReviewIds.includes(item.id)) : items}
        level={level}
        onRecordReview={recordReview}
        reviewMode={Boolean(srsReviewIds)}
      />
    ) : activeTab === 'quiz' ? (
      loading ? <KanjiGridSkeleton /> : <KanjiQuiz key={`kanji-quiz-${level}`} items={items} level={level} onRecordReview={recordReview}/>
    ) : <>
      <div className="kanji-controls">
        <label className="kanji-search">
          <Search size={18}/>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari Kanji, arti, Onyomi, Kunyomi, atau contoh kosakata…"
            aria-label="Cari Kanji"
          />
        </label>
        <span className="kanji-result-count">{loading ? 'Memuat…' : `${filtered.length} dari ${items.length} Kanji`}</span>
      </div>

      <div className="kanji-category-row" aria-label="Filter kategori Kanji">
        <button type="button" className={category === 'Semua' ? 'active' : ''} onClick={() => setCategory('Semua')}>Semua</button>
        {orderedCategories.map((name) => <button key={name} type="button" className={category === name ? 'active' : ''} onClick={() => setCategory(name)}>{name}</button>)}
      </div>

      <div className="kanji-progress-filter-row" role="group" aria-label="Filter progress Kanji">
        {PROGRESS_FILTERS.map((option) => <button
          key={option.key}
          type="button"
          className={progressFilter === option.key ? 'active' : ''}
          aria-pressed={progressFilter === option.key}
          onClick={() => setProgressFilter(option.key)}
        >{option.label}</button>)}
      </div>

      {loading ? <KanjiGridSkeleton /> : filtered.length ? (
        <div className="kanji-grid">
          {filtered.map((item) => <button key={item.id} type="button" className="kanji-card" onClick={() => setSelected(item)} aria-label={`Buka detail Kanji ${item.prompt}, ${item.meaning}`}>
            <span className="kanji-card-char">{item.prompt}</span>
            <span className="kanji-card-meaning">{item.meaning}</span>
            <span className="kanji-card-category">{item.category}</span>
          </button>)}
        </div>
      ) : (
        <div className="kanji-empty-filter"><Search size={28}/><strong>Tidak ada Kanji yang cocok</strong><span>Coba ubah kata pencarian atau kategori.</span></div>
      )}

      {selected && <KanjiDetailDialog key={selected.id} item={selected} items={items} onClose={() => setSelected(null)} onSelect={setSelected} />}
    </>}
  </div>;
}

function KanjiGridSkeleton() {
  return <div className="kanji-grid kanji-grid-loading" aria-hidden="true">
    {Array.from({ length: 18 }, (_, index) => <div key={index}/>) }
  </div>;
}

function HighlightKanji({ text, target }: { text: string; target: string }) {
  const parts = text.split(target);
  if (parts.length === 1) return <>{text}</>;

  return <>{parts.map((part, index) => <Fragment key={`${part}-${index}`}>
    {part}
    {index < parts.length - 1 && <mark className="kanji-target-highlight">{target}</mark>}
  </Fragment>)}</>;
}

const RELATION_LABELS: Record<KanjiRelated['relation'], string> = {
  same_radical: 'Radikal sama',
  similar_shape: 'Bentuk mirip',
  shared_component: 'Komponen sama',
  concept_related: 'Makna terkait',
};

const SPECIAL_CONCEPT_RELATED: Record<string, Array<{ kanji: string; note: string }>> = {
  金: [
    { kanji: '円', note: 'Sama-sama sering muncul dalam konteks uang dan harga.' },
    { kanji: '買', note: 'Membeli berkaitan langsung dengan penggunaan uang.' },
    { kanji: '高', note: 'Sering dipakai saat membicarakan harga yang tinggi.' },
  ],
  電: [
    { kanji: '気', note: 'Bersama membentuk 電気 (listrik).' },
    { kanji: '話', note: 'Bersama membentuk 電話 (telepon).' },
    { kanji: '雨', note: 'Bagian 雨 tampak di atas 電.' },
  ],
};

type ResolvedRelated = KanjiRelated & {
  meaning: string;
  level?: KanjiLevel;
  localItem: KanjiItem | null;
};

function relatedForItem(item: KanjiItem, items: KanjiItem[]): ResolvedRelated[] {
  const byPrompt = new Map(items.map((entry) => [entry.prompt, entry]));
  const result: ResolvedRelated[] = [];
  const seen = new Set<string>([item.prompt]);

  const addRelation = (relation: KanjiRelated) => {
    if (seen.has(relation.kanji)) return;
    const localItem = byPrompt.get(relation.kanji) ?? null;
    const meaning = localItem?.meaning || relation.meaning || 'Referensi Kanji';
    const level = localItem?.level || relation.level;
    seen.add(relation.kanji);
    result.push({ ...relation, meaning, level, localItem });
  };

  item.relatedKanji.forEach(addRelation);

  for (const relation of SPECIAL_CONCEPT_RELATED[item.prompt] ?? []) {
    if (result.length >= 4) break;
    addRelation({ kanji: relation.kanji, relation: 'concept_related', note: relation.note });
  }

  for (const candidate of items) {
    if (result.length >= 4) break;
    if (candidate.category !== item.category || seen.has(candidate.prompt)) continue;
    addRelation({
      kanji: candidate.prompt,
      relation: 'concept_related',
      note: `Satu tema pembelajaran: ${item.category}.`,
    });
  }

  return result.slice(0, 4);
}

function defaultMnemonic(item: KanjiItem) {
  const anchor = item.examples[0];
  if (anchor) {
    return `Cara mudah mengingat: kaitkan bentuk 「${item.prompt}」 dengan arti “${item.meaning}”, lalu gunakan 「${anchor.word}」 (${anchor.meaning_id}) sebagai jangkar ingatan.`;
  }
  return `Cara mudah mengingat: lihat bentuk 「${item.prompt}」 sambil mengucapkan arti “${item.meaning}” beberapa kali saat menulisnya.`;
}

function KanjiDetailDialog({ item, items, onClose, onSelect }: { item: KanjiItem; items: KanjiItem[]; onClose: () => void; onSelect: (item: KanjiItem) => void }) {
  const related = relatedForItem(item, items);
  return <div className="kanji-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="kanji-dialog" role="dialog" aria-modal="true" aria-labelledby="kanji-detail-title" onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="kanji-dialog-close" onClick={onClose} aria-label="Tutup detail Kanji"><X size={20}/></button>

      <div className="kanji-detail-hero">
        <div className="kanji-detail-char" aria-hidden="true">{item.prompt}</div>
        <div>
          <p className="eyebrow">JLPT {item.level} · URUTAN {item.sortOrder}</p>
          <h2 id="kanji-detail-title">{item.meaning}</h2>
          <div className="kanji-detail-tags"><span>{item.category}</span><span>{item.strokeCount} goresan</span></div>
        </div>
      </div>

      <div className="kanji-reading-grid">
        <ReadingBlock labelJa="音読み" labelId="Onyomi" readings={item.onyomi} />
        <ReadingBlock labelJa="訓読み" labelId="Kunyomi" readings={item.kunyomi} />
      </div>

      <p className="kanji-detail-note">Reading diprioritaskan untuk pembelajaran dasar. Kanji tunggal tidak diberi satu audio khusus karena satu Kanji dapat memiliki lebih dari satu cara baca.</p>

      <div className="kanji-example-section">
        <div className="kanji-example-heading"><div><p className="eyebrow">CONTOH KOSAKATA</p><h3>Penggunaan Kanji</h3></div><span>{item.examples.length} contoh</span></div>
        <div className="kanji-example-list">
          {item.examples.map((example, index) => <div className="kanji-example-row" key={`${example.word}-${example.reading}-${index}`}>
            <div className="kanji-example-main">
              <strong>{example.word}</strong>
              <span>{example.reading}</span>
              {example.romaji && <small>{example.romaji}</small>}
            </div>
            <div className="kanji-example-meaning">{example.meaning_id}</div>
            <button type="button" className="kanji-example-audio" onClick={() => speakJapanese(example.word)} aria-label={`Dengarkan ${example.word}`} title="Dengarkan"><Speaker size={18}/><span>Dengarkan</span></button>
          </div>)}
        </div>
      </div>

      <div className="kanji-sentence-section">
        <div className="kanji-example-heading">
          <div><p className="eyebrow">例文 · CONTOH KALIMAT</p><h3>Kanji dalam Konteks</h3></div>
          <span>{item.sentences.length ? `${item.sentences.length} contoh` : 'Belum tersedia'}</span>
        </div>

        {item.sentences.length ? <div className="kanji-sentence-list">
          {item.sentences.map((sentence, index) => <article className="kanji-sentence-card" key={`${sentence.japanese}-${index}`}>
            <div className="kanji-sentence-copy">
              <strong className="kanji-sentence-japanese"><HighlightKanji text={sentence.japanese} target={item.prompt} /></strong>
              <span className="kanji-sentence-reading">{sentence.reading}</span>
              <p>{sentence.meaning}</p>
            </div>
            <button type="button" className="kanji-sentence-audio" onClick={() => speakJapanese(sentence.japanese)} aria-label={`Dengarkan contoh kalimat ${index + 1}`} title="Dengarkan kalimat"><Speaker size={18}/><span>Dengarkan</span></button>
          </article>)}
        </div> : <div className="kanji-sentence-empty">Contoh kalimat belum tersedia untuk Kanji ini. Pastikan migration <strong>011_kanji_n5_example_sentences.sql</strong> sudah dijalankan.</div>}
      </div>

      <section className="kanji-related-section" aria-labelledby={`kanji-related-${item.id}`}>
        <div className="kanji-learning-heading">
          <div><p className="eyebrow">KANJI TERKAIT</p><h3 id={`kanji-related-${item.id}`}>Hubungkan Bentuk & Makna</h3></div>
          <span>{related.length} referensi</span>
        </div>

        <div className="kanji-related-grid">
          {related.map((entry) => {
            const body = <>
              <div className="kanji-related-topline">
                <strong>{entry.kanji}</strong>
                {entry.level && entry.level !== item.level && <span className="kanji-related-level">{entry.level}</span>}
              </div>
              <span className="kanji-related-meaning">{entry.meaning}</span>
              <span className={`kanji-relation-badge relation-${entry.relation}`}>{RELATION_LABELS[entry.relation]}</span>
              <small>{entry.note}</small>
            </>;

            return entry.localItem ? <button
              key={`${entry.kanji}-${entry.relation}`}
              type="button"
              className="kanji-related-card is-clickable"
              onClick={() => onSelect(entry.localItem!)}
              aria-label={`Buka detail Kanji terkait ${entry.kanji}, ${entry.meaning}`}
            >{body}</button> : <div key={`${entry.kanji}-${entry.relation}`} className="kanji-related-card is-reference">{body}</div>;
          })}
        </div>
      </section>

      <section className="kanji-mnemonic-section" aria-labelledby={`kanji-mnemonic-${item.id}`}>
        <div className="kanji-learning-heading">
          <div><p className="eyebrow">TIPS MENGHAFAL</p><h3 id={`kanji-mnemonic-${item.id}`}>Cara Mudah Mengingat</h3></div>
          <Lightbulb size={20} aria-hidden="true" />
        </div>

        <div className="kanji-mnemonic-card">
          {item.mnemonic?.components.length ? <div className="kanji-mnemonic-components">
            <span>Komponen visual</span>
            <div>{item.mnemonic.components.map((component) => <span key={`${component.symbol}-${component.meaning}`}><strong>{component.symbol}</strong>{component.meaning}</span>)}</div>
          </div> : null}
          <div className="kanji-mnemonic-tip"><Lightbulb size={18} aria-hidden="true"/><p>{item.mnemonic?.tip || defaultMnemonic(item)}</p></div>
          <p className="kanji-mnemonic-disclaimer">Mnemonic belajar untuk membantu memori visual, bukan klaim etimologi atau asal-usul Kanji.</p>
        </div>
      </section>

      <KanjiStrokeOrder character={item.prompt} expectedStrokeCount={item.strokeCount} />
      <KanjiWritingPractice character={item.prompt} />
    </section>
  </div>;
}

function ReadingBlock({ labelJa, labelId, readings }: { labelJa: string; labelId: string; readings: string[] }) {
  return <div className="kanji-reading-card">
    <div><strong>{labelJa}</strong><span>{labelId}</span></div>
    {readings.length ? <div className="kanji-reading-values">{readings.map((reading) => <span key={reading}>{reading}</span>)}</div> : <p className="kanji-no-reading">Tidak ada reading utama yang perlu diprioritaskan pada tahap ini.</p>}
  </div>;
}
