import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Settings2, Shuffle } from 'lucide-react';
import type { KanjiItem, KanjiLevel, KanjiRecordReview, KanjiReviewRating } from './useKanji';
import './kanji-flashcard.css';

type KanjiFlashcardField = 'kanji' | 'meaning' | 'onyomi' | 'kunyomi' | 'examples';
type KanjiFlashcardSidePreferences = Record<KanjiFlashcardField, boolean>;

type KanjiFlashcardPreferences = {
  front: KanjiFlashcardSidePreferences;
  back: KanjiFlashcardSidePreferences;
};

const STORAGE_KEY = 'kanjiFlashcardPreferences';

const FIELD_LABELS: Array<{ key: KanjiFlashcardField; label: string }> = [
  { key: 'kanji', label: 'Kanji' },
  { key: 'meaning', label: 'Arti' },
  { key: 'onyomi', label: 'Onyomi' },
  { key: 'kunyomi', label: 'Kunyomi' },
  { key: 'examples', label: 'Contoh Kosakata' },
];

function createDefaultSide(enabled: Partial<KanjiFlashcardSidePreferences>): KanjiFlashcardSidePreferences {
  return {
    kanji: false,
    meaning: false,
    onyomi: false,
    kunyomi: false,
    examples: false,
    ...enabled,
  };
}

function createDefaultPreferences(): KanjiFlashcardPreferences {
  return {
    front: createDefaultSide({ kanji: true }),
    back: createDefaultSide({
      kanji: true,
      meaning: true,
      onyomi: true,
      kunyomi: true,
      examples: true,
    }),
  };
}

function normalizeSide(value: unknown, fallback: KanjiFlashcardSidePreferences): KanjiFlashcardSidePreferences {
  if (!value || typeof value !== 'object') return fallback;
  const row = value as Record<string, unknown>;
  const normalized = { ...fallback };

  for (const { key } of FIELD_LABELS) {
    if (typeof row[key] === 'boolean') normalized[key] = row[key] as boolean;
  }

  if (activeFieldCount(normalized) === 0) return fallback;
  return normalized;
}

function loadPreferences(): KanjiFlashcardPreferences {
  const fallback = createDefaultPreferences();
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const normalized: KanjiFlashcardPreferences = {
      front: normalizeSide(parsed.front, fallback.front),
      back: normalizeSide(parsed.back, fallback.back),
    };

    // Persist the sanitized shape so old strokeCount/category preferences cannot linger.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return fallback;
  }
}

function savePreferences(preferences: KanjiFlashcardPreferences) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preference persistence is optional; the flashcard still works without localStorage.
  }
}

function activeFieldCount(preferences: KanjiFlashcardSidePreferences) {
  return FIELD_LABELS.reduce((total, field) => total + (preferences[field.key] ? 1 : 0), 0);
}

function shuffleDeck(ids: string[]) {
  const next = [...ids];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function sideHasVisibleValue(item: KanjiItem, preferences: KanjiFlashcardSidePreferences) {
  return (
    (preferences.kanji && Boolean(item.prompt)) ||
    (preferences.meaning && Boolean(item.meaning)) ||
    (preferences.onyomi && item.onyomi.length > 0) ||
    (preferences.kunyomi && item.kunyomi.length > 0) ||
    (preferences.examples && item.examples.length > 0)
  );
}

function KanjiFlashcardFields({
  item,
  side,
  preferences,
}: {
  item: KanjiItem;
  side: 'front' | 'back';
  preferences: KanjiFlashcardSidePreferences;
}) {
  const fallbackToKanji = !sideHasVisibleValue(item, preferences);

  return <span className={`kanji-flashcard-fields is-${side}`}>
    {(preferences.kanji || fallbackToKanji) && item.prompt && (
      <span className="kanji-flashcard-field kanji-flashcard-field-kanji">{item.prompt}</span>
    )}

    {preferences.meaning && item.meaning && (
      <span className="kanji-flashcard-field kanji-flashcard-field-meaning">{item.meaning}</span>
    )}

    {preferences.onyomi && item.onyomi.length > 0 && (
      <span className="kanji-flashcard-reading-block">
        <span className="kanji-flashcard-reading-label"><strong>音読み</strong><small>Onyomi</small></span>
        <span className="kanji-flashcard-reading-values">{item.onyomi.join(' · ')}</span>
      </span>
    )}

    {preferences.kunyomi && item.kunyomi.length > 0 && (
      <span className="kanji-flashcard-reading-block">
        <span className="kanji-flashcard-reading-label"><strong>訓読み</strong><small>Kunyomi</small></span>
        <span className="kanji-flashcard-reading-values">{item.kunyomi.join(' · ')}</span>
      </span>
    )}

    {preferences.examples && item.examples.length > 0 && (
      <span className="kanji-flashcard-examples">
        <span className="kanji-flashcard-examples-title">CONTOH KOSAKATA</span>
        <span className="kanji-flashcard-examples-list">
          {item.examples.slice(0, 3).map((example, exampleIndex) => (
            <span className="kanji-flashcard-example" key={`${example.word}-${example.reading}-${exampleIndex}`}>
              <strong>{example.word}</strong>
              <span>{example.reading}</span>
              <small>{example.meaning_id}</small>
            </span>
          ))}
        </span>
      </span>
    )}
  </span>;
}

function PreferenceSection({
  title,
  preferences,
  onChange,
}: {
  title: string;
  preferences: KanjiFlashcardSidePreferences;
  onChange: (field: KanjiFlashcardField, checked: boolean) => void;
}) {
  const count = activeFieldCount(preferences);

  return <section className="kanji-flashcard-settings-section">
    <strong>{title}</strong>
    <div className="kanji-flashcard-settings-grid">
      {FIELD_LABELS.map(({ key, label }) => {
        const locked = preferences[key] && count <= 1;
        return <label key={key} className={locked ? 'is-locked' : ''}>
          <input
            type="checkbox"
            checked={preferences[key]}
            disabled={locked}
            onChange={(event) => onChange(key, event.target.checked)}
          />
          <span>{label}</span>
        </label>;
      })}
    </div>
  </section>;
}

export function KanjiFlashcard({
  items,
  level,
  onRecordReview,
  reviewMode = false,
}: {
  items: KanjiItem[];
  level: KanjiLevel;
  onRecordReview: KanjiRecordReview;
  reviewMode?: boolean;
}) {
  const itemIdsKey = items.map((item) => item.id).join('|');
  const itemIds = useMemo(() => itemIdsKey ? itemIdsKey.split('|') : [], [itemIdsKey]);
  const [deckIds, setDeckIds] = useState<string[]>(() => itemIds);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [preferences, setPreferences] = useState<KanjiFlashcardPreferences>(loadPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratedIds, setRatedIds] = useState<string[]>([]);
  const [reviewComplete, setReviewComplete] = useState(false);
  const settingsRef = useRef<HTMLDetailsElement>(null);
  const ratingInFlightRef = useRef(false);

  useEffect(() => {
    setDeckIds(itemIds);
    setIndex(0);
    setRevealed(false);
    setRatingError(null);
    setRatedIds([]);
    setReviewComplete(false);
  }, [itemIds]);

  useEffect(() => {
    if (!settingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = settingsRef.current;
      if (!menu || !(event.target instanceof Node)) return;
      if (!menu.contains(event.target)) setSettingsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSettingsOpen(false);
      const summary = settingsRef.current?.querySelector('summary');
      if (summary instanceof HTMLElement) summary.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!deckIds.length || settingsOpen || savingRating || reviewComplete) return;
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
  }, [deckIds.length, reviewComplete, savingRating, settingsOpen]);

  const updateSidePreference = (
    side: 'front' | 'back',
    field: KanjiFlashcardField,
    checked: boolean,
  ) => {
    setPreferences((current) => {
      if (!checked && current[side][field] && activeFieldCount(current[side]) <= 1) return current;
      const next: KanjiFlashcardPreferences = {
        ...current,
        [side]: { ...current[side], [field]: checked },
      };
      savePreferences(next);
      return next;
    });
  };

  const resetPreferences = () => {
    const next = createDefaultPreferences();
    savePreferences(next);
    setPreferences(next);
  };

  if (!deckIds.length) {
    return <div className="kanji-flashcard-empty">
      <strong>{reviewMode ? 'Tidak ada Kanji yang perlu direview saat ini.' : 'Belum ada Kanji untuk Flashcard'}</strong>
      <span>{reviewMode ? 'Kanji akan muncul kembali ketika jadwal review berikutnya sudah jatuh tempo.' : 'Flashcard akan menggunakan data Kanji pada level aktif.'}</span>
    </div>;
  }

  if (reviewMode && reviewComplete) {
    return <section className="kanji-flashcard-stage kanji-srs-complete" aria-live="polite">
      <div className="kanji-srs-complete-card">
        <strong>Review SRS selesai</strong>
        <span>{ratedIds.length} Kanji sudah direview dan jadwal berikutnya sudah diperbarui.</span>
      </div>
    </section>;
  }

  const safeIndex = index % deckIds.length;
  const activeId = deckIds[safeIndex];
  const item = items.find((entry) => entry.id === activeId) ?? items[0];
  if (!item) return null;

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

  const shuffleCurrentDeck = () => {
    setDeckIds((current) => shuffleDeck(current));
    setIndex(0);
    setRevealed(false);
    setRatingError(null);
  };

  const submitRating = async (rating: KanjiReviewRating) => {
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
      setRatingError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan review Kanji. Coba lagi.');
    } finally {
      ratingInFlightRef.current = false;
      setSavingRating(false);
    }
  };

  return <section className="kanji-flashcard-stage" aria-label={reviewMode ? `SRS Review Kanji ${level}` : `Flashcard Kanji ${level}`}>
    <div className="kanji-flashcard-topbar">
      <div className="kanji-flashcard-meta">
        <strong>{safeIndex + 1} / {deckIds.length}</strong>
        <span>{reviewMode ? `SRS Review · ${deckIds.length} Kanji due` : `JLPT ${level} · ${deckIds.length} Kanji`}</span>
      </div>

      <details
        ref={settingsRef}
        className="kanji-flashcard-settings"
        open={settingsOpen}
        onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
      >
        <summary><Settings2 size={16}/> Atur Flashcard</summary>
        <div className="kanji-flashcard-settings-popover">
          <PreferenceSection
            title="SISI DEPAN"
            preferences={preferences.front}
            onChange={(field, checked) => updateSidePreference('front', field, checked)}
          />
          <PreferenceSection
            title="SISI BELAKANG"
            preferences={preferences.back}
            onChange={(field, checked) => updateSidePreference('back', field, checked)}
          />
          <button type="button" className="kanji-flashcard-reset" onClick={resetPreferences}>
            <RotateCcw size={15}/> Reset Flashcard
          </button>
        </div>
      </details>
    </div>

    <button
      type="button"
      className={`kanji-flashcard${revealed ? ' revealed' : ''}`}
      onClick={() => {
        if (savingRating) return;
        setRevealed((current) => !current);
        setRatingError(null);
      }}
      aria-pressed={revealed}
      aria-label={revealed ? 'Sisi jawaban. Klik untuk kembali ke soal.' : 'Sisi soal. Klik untuk melihat jawaban.'}
    >
      <span className="kanji-flashcard-inner" aria-hidden="true">
        <span className="kanji-flashcard-face kanji-flashcard-front">
          <KanjiFlashcardFields item={item} side="front" preferences={preferences.front}/>
          <span className="kanji-flashcard-hint">Klik / tap untuk melihat jawaban</span>
        </span>
        <span className="kanji-flashcard-face kanji-flashcard-back">
          <span className="kanji-flashcard-back-label">JAWABAN</span>
          <KanjiFlashcardFields item={item} side="back" preferences={preferences.back}/>
          <span className="kanji-flashcard-hint">Nilai ingatanmu setelah melihat jawaban</span>
        </span>
      </span>
    </button>

    {revealed && <div className="kanji-srs-rating" aria-label="Rating SRS Kanji">
      <button type="button" disabled={savingRating || alreadyRatedInReview} onClick={() => void submitRating(0)}>Lupa</button>
      <button type="button" disabled={savingRating || alreadyRatedInReview} onClick={() => void submitRating(1)}>Sulit</button>
      <button type="button" disabled={savingRating || alreadyRatedInReview} onClick={() => void submitRating(2)}>Ingat</button>
      <button type="button" disabled={savingRating || alreadyRatedInReview} onClick={() => void submitRating(3)}>Mudah</button>
    </div>}

    {savingRating && <div className="kanji-srs-saving" role="status">Menyimpan review…</div>}
    {ratingError && <div className="kanji-srs-error" role="alert">{ratingError}</div>}
    {alreadyRatedInReview && revealed && <div className="kanji-srs-saving">Kanji ini sudah dinilai pada sesi SRS ini.</div>}

    <div className="kanji-flashcard-controls" aria-label="Navigasi Flashcard Kanji">
      <button type="button" onClick={goPrevious} disabled={deckIds.length <= 1 || savingRating}>← Sebelumnya</button>
      <button type="button" className="kanji-flashcard-shuffle" onClick={shuffleCurrentDeck} disabled={deckIds.length <= 1 || savingRating}><Shuffle size={16}/> Acak</button>
      <button type="button" onClick={goNext} disabled={deckIds.length <= 1 || savingRating}>Selanjutnya →</button>
    </div>
  </section>;
}

