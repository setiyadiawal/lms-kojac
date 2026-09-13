import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, RotateCcw } from 'lucide-react';
import { getGrammarPattern, type GrammarPattern } from './grammarData';
import type { GrammarReviewRating } from './useGrammarProgress';
import './grammar-progress.css';

type RatingCount = Record<GrammarReviewRating, number>;

const RATING_OPTIONS: Array<{ rating: GrammarReviewRating; label: string; helper: string }> = [
  { rating: 0, label: 'Lupa', helper: 'Belum bisa mengingat' },
  { rating: 1, label: 'Sulit', helper: 'Ingat, tetapi masih ragu' },
  { rating: 2, label: 'Ingat', helper: 'Bisa mengingat dengan baik' },
  { rating: 3, label: 'Mudah', helper: 'Sangat mudah diingat' },
];

function scrollNearest(element: HTMLElement | null) {
  if (!element) return;
  window.requestAnimationFrame(() => element.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
}

export function GrammarSrsReview({
  patternIds,
  recordReview,
  onClose,
  onOpenPattern,
}: {
  patternIds: string[];
  recordReview: (patternId: string, rating: GrammarReviewRating) => Promise<unknown>;
  onClose: () => void;
  onOpenPattern: (patternId: string) => void;
}) {
  const patterns = useMemo(
    () => patternIds.map((id) => getGrammarPattern(id)).filter((pattern): pattern is GrammarPattern => Boolean(pattern)),
    [patternIds],
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [counts, setCounts] = useState<RatingCount>({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const cardRef = useRef<HTMLElement>(null);

  const pattern = patterns[index];

  async function rate(rating: GrammarReviewRating) {
    if (!pattern || saving) return;
    setSaving(true);
    setError(null);
    try {
      await recordReview(pattern.id, rating);
      setCounts((current) => ({ ...current, [rating]: current[rating] + 1 }));
      if (index + 1 >= patterns.length) {
        setFinished(true);
        window.requestAnimationFrame(() => scrollNearest(cardRef.current));
      } else {
        setIndex((current) => current + 1);
        setRevealed(false);
        window.requestAnimationFrame(() => scrollNearest(cardRef.current));
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan review Grammar.');
    } finally {
      setSaving(false);
    }
  }

  if (!patterns.length) {
    return <section className="grammar-srs-shell" ref={cardRef}>
      <button type="button" className="grammar-srs-back" onClick={onClose}><ArrowLeft size={16}/> Kembali ke Grammar</button>
      <article className="grammar-srs-empty">
        <CheckCircle2 size={30}/>
        <h2>Tidak ada Bunpō yang perlu direview</h2>
        <p>Semua pola yang sudah pernah masuk SRS belum jatuh tempo saat ini.</p>
      </article>
    </section>;
  }

  if (finished) {
    return <section className="grammar-srs-shell" ref={cardRef}>
      <article className="grammar-srs-result">
        <div className="grammar-srs-result-icon"><CheckCircle2 size={30}/></div>
        <p className="grammar-section-kicker">REVIEW SELESAI</p>
        <h2>{patterns.length} pola direview</h2>
        <p>Sesi SRS selesai. Jadwal review berikutnya sudah diperbarui oleh engine KOJAC.</p>
        <div className="grammar-srs-result-stats">
          <div><strong>{counts[0]}</strong><span>Lupa</span></div>
          <div><strong>{counts[1]}</strong><span>Sulit</span></div>
          <div><strong>{counts[2]}</strong><span>Ingat</span></div>
          <div><strong>{counts[3]}</strong><span>Mudah</span></div>
        </div>
        <button type="button" className="grammar-srs-primary" onClick={onClose}>Kembali ke Grammar</button>
      </article>
    </section>;
  }

  return <section className="grammar-srs-shell" ref={cardRef}>
    <button type="button" className="grammar-srs-back" onClick={onClose}><ArrowLeft size={16}/> Kembali ke Grammar</button>

    <header className="grammar-srs-head">
      <div>
        <p className="grammar-section-kicker">SRS GRAMMAR · QUICK REVIEW</p>
        <h2>Review Sekarang</h2>
        <p>Ingat fungsi dan rumus Bunpō sebelum membuka jawabannya.</p>
      </div>
      <div className="grammar-srs-counter"><span>Pola</span><strong>{index + 1} / {patterns.length}</strong></div>
    </header>

    <article className="grammar-srs-card">
      <div className="grammar-srs-meta"><span>{pattern.jlptLevel}</span><span>Bab {pattern.chapter}</span></div>
      <p className="grammar-srs-label">POLA</p>
      <h3>{pattern.pattern}</h3>
      <p className="grammar-srs-prompt">Apa fungsi dan rumus pola ini?</p>

      {!revealed ? <button type="button" className="grammar-srs-primary" onClick={() => setRevealed(true)}>
        Lihat Jawaban <ChevronRight size={17}/>
      </button> : <>
        <div className="grammar-srs-answer">
          <div><span>Arti / Fungsi</span><strong>{pattern.meaning}</strong></div>
          <div><span>Rumus</span><strong>{pattern.formula}</strong></div>
          {pattern.examples[0] && <div className="grammar-srs-example">
            <span>Contoh</span>
            <strong>{pattern.examples[0].japanese}</strong>
            <small>{pattern.examples[0].meaning}</small>
          </div>}
        </div>

        <div className="grammar-srs-rating" aria-label="Nilai ingatan Bunpō">
          {RATING_OPTIONS.map((option) => <button
            type="button"
            key={option.rating}
            disabled={saving}
            onClick={() => void rate(option.rating)}
          >
            <strong>{option.label}</strong>
            <small>{option.helper}</small>
          </button>)}
        </div>

        {saving && <p className="grammar-srs-save-status">Menyimpan progress…</p>}
        {error && <div className="grammar-srs-save-error" role="alert">
          <strong>Progress belum tersimpan.</strong>
          <span>{error}</span>
          <small>Tetap di pola ini lalu pilih rating lagi untuk mencoba kembali.</small>
        </div>}

        <button type="button" className="grammar-srs-study-link" disabled={saving} onClick={() => onOpenPattern(pattern.id)}>
          <BookOpen size={16}/> Pelajari Pola
        </button>
      </>}
    </article>
  </section>;
}
