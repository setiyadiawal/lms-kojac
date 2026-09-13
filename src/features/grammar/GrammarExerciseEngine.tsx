import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  HelpCircle,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import { speakJapanese } from '../hiragana/useHiragana';
import { randomizeBalancedOptionSets } from '../quiz/optionRandomization';
import type { GrammarChapter, GrammarPattern } from './grammarData';
import type { GrammarExercise, GrammarExerciseType } from './grammarExercises';
import './grammar-exercise.css';

export type GrammarPracticeScope = 'pattern' | 'chapter';
export type GrammarPracticeSessionSize = 5 | 10 | 15 | 20 | 'all';

export interface GrammarPracticeChapterSummary {
  chapter: GrammarChapter;
  patterns: GrammarPattern[];
  exerciseCount: number;
  jlptLevels: GrammarPattern['jlptLevel'][];
}

type AttemptRecord = {
  firstTryCorrect: boolean;
  lastCorrect: boolean;
  attempts: number;
  answer: string;
  displayAnswer?: string;
};

type RuntimeToken = {
  id: string;
  text: string;
};

type RuntimeExercise = GrammarExercise & {
  runtimeOptions?: string[];
  runtimeTokens?: RuntimeToken[];
};

type AnswerDrafts = Record<string, string>;
type OrderDrafts = Record<string, string[]>;
type ToggleMap = Record<string, boolean>;

const TYPE_LABELS: Record<GrammarExerciseType, string> = {
  multiple_choice: 'Pilihan Jawaban',
  fill_blank: 'Lengkapi Kalimat',
  pattern_choice: 'Pilih Pola yang Benar',
  conjugation: 'Konjugasi',
  sentence_order: 'Susun Kalimat',
  error_correction: 'Koreksi Kalimat',
};

function normalizeAnswer(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\s\u3000]+/g, '')
    .trim();
}

function shuffleCopy<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function prepareExercise(exercise: GrammarExercise): RuntimeExercise {
  const runtimeOptions = exercise.options ? [...exercise.options] : undefined;
  let runtimeTokens = exercise.tokens
    ? shuffleCopy(exercise.tokens.map((text, index) => ({ id: `${exercise.id}-token-${index}`, text })))
    : undefined;

  if (
    runtimeTokens
    && runtimeTokens.length > 1
    && normalizeAnswer(runtimeTokens.map((token) => token.text).join('')) === normalizeAnswer(exercise.answer)
  ) {
    runtimeTokens = [...runtimeTokens.slice(1), runtimeTokens[0]];
  }

  return { ...exercise, runtimeOptions, runtimeTokens };
}

function runtimeCorrectOption(exercise: RuntimeExercise) {
  const validAnswers = new Set([exercise.answer, ...(exercise.acceptableAnswers ?? [])].map(normalizeAnswer));
  return exercise.runtimeOptions?.find((option) => validAnswers.has(normalizeAnswer(option))) ?? exercise.answer;
}

function prepareRuntimeExercises(exercises: GrammarExercise[]) {
  const prepared = exercises.map(prepareExercise);
  return randomizeBalancedOptionSets(
    prepared,
    (exercise) => exercise.runtimeOptions ?? [],
    runtimeCorrectOption,
    (exercise, runtimeOptions) => ({
      ...exercise,
      runtimeOptions: exercise.runtimeOptions ? runtimeOptions : undefined,
    }),
  );
}

function afterNextPaint(callback: () => void) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
}

function PracticeScopeHeader({
  scope,
  onScopeChange,
}: {
  scope: GrammarPracticeScope;
  onScopeChange?: (scope: GrammarPracticeScope) => void;
}) {
  const interactive = Boolean(onScopeChange);

  return <div className="grammar-practice-scope" aria-label="Scope Latihan Tata Bahasa">
    <button
      type="button"
      className={scope === 'pattern' ? 'active' : ''}
      aria-current={scope === 'pattern' ? 'page' : undefined}
      aria-pressed={interactive ? scope === 'pattern' : undefined}
      aria-disabled={!interactive || undefined}
      tabIndex={interactive ? 0 : -1}
      onClick={() => onScopeChange?.('pattern')}
    >
      Latihan Pola
    </button>
    <button
      type="button"
      className={scope === 'chapter' ? 'active' : ''}
      aria-current={scope === 'chapter' ? 'page' : undefined}
      aria-pressed={interactive ? scope === 'chapter' : undefined}
      aria-disabled={!interactive || undefined}
      tabIndex={interactive ? 0 : -1}
      onClick={() => onScopeChange?.('chapter')}
    >
      Latihan Bab
    </button>
  </div>;
}

function PracticeExitDialog({
  onCancel,
  onConfirm,
  returnFocusRef,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const leaveButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    stayButtonRef.current?.focus();
  }, []);

  const cancelAndRestoreFocus = () => {
    onCancel();
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelAndRestoreFocus();
      return;
    }

    if (event.key !== 'Tab') return;
    const first = stayButtonRef.current;
    const last = leaveButtonRef.current;
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div className="grammar-practice-exit-backdrop" role="presentation" onMouseDown={cancelAndRestoreFocus}>
    <section
      className="grammar-practice-exit-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grammar-practice-exit-title"
      aria-describedby="grammar-practice-exit-description"
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <h3 id="grammar-practice-exit-title">Keluar dari latihan?</h3>
      <p id="grammar-practice-exit-description">Jawaban dalam sesi latihan ini akan hilang jika Anda kembali ke Menu Latihan.</p>
      <div className="grammar-practice-exit-actions">
        <button ref={stayButtonRef} type="button" className="grammar-practice-exit-stay" onClick={cancelAndRestoreFocus}>
          Tetap Latihan
        </button>
        <button ref={leaveButtonRef} type="button" className="grammar-practice-exit-leave" onClick={onConfirm}>
          Kembali ke Menu Latihan
        </button>
      </div>
    </section>
  </div>;
}

function getSessionSizeOptions(totalExercises: number): GrammarPracticeSessionSize[] {
  const numeric = ([5, 10, 15, 20] as const).filter((size) => size <= totalExercises);
  return [...numeric, 'all'];
}

function getDefaultSessionSize(totalExercises: number): GrammarPracticeSessionSize {
  return totalExercises >= 10 ? 10 : 'all';
}

export function GrammarPracticeLanding({
  scope,
  selectedPattern,
  availablePatterns,
  chapterSummaries,
  chapterSizes,
  onScopeChange,
  onSelectPattern,
  onBackToStudy,
  onChapterSizeChange,
  onStartChapter,
}: {
  scope: GrammarPracticeScope;
  selectedPattern?: GrammarPattern;
  availablePatterns: GrammarPattern[];
  chapterSummaries: GrammarPracticeChapterSummary[];
  chapterSizes: Record<number, GrammarPracticeSessionSize>;
  onScopeChange: (scope: GrammarPracticeScope) => void;
  onSelectPattern: (patternId: string) => void;
  onBackToStudy: () => void;
  onChapterSizeChange: (chapterNumber: number, size: GrammarPracticeSessionSize) => void;
  onStartChapter: (summary: GrammarPracticeChapterSummary) => void;
}) {
  return <section className="grammar-practice-shell grammar-practice-landing">
    <PracticeScopeHeader scope={scope} onScopeChange={onScopeChange} />

    {scope === 'pattern' ? <>
      <div className="grammar-practice-intro">
        <p className="grammar-section-kicker">文法練習 · Phase 3 Pilot</p>
        <h2>Latihan Pola Tata Bahasa</h2>
        <p>
          Latihan bersifat terarah: jawab soal, baca feedback, gunakan petunjuk bila perlu,
          lalu pahami alasan jawabannya sebelum lanjut atau mencoba lagi.
        </p>
      </div>

      {selectedPattern && !availablePatterns.some((pattern) => pattern.id === selectedPattern.id) && <div className="grammar-practice-unavailable">
        <strong>Latihan pilot untuk {selectedPattern.pattern} belum tersedia.</strong>
        <p>Materi Pelajari tetap tersedia. Untuk Phase 3 awal, pilih salah satu pola pilot di bawah.</p>
        <button type="button" onClick={onBackToStudy}><BookOpen size={16} /> Kembali ke Pelajari</button>
      </div>}

      {!selectedPattern && <div className="grammar-practice-unavailable is-neutral">
        <strong>Pilih pola yang ingin dilatih.</strong>
        <p>Phase pilot dimulai dari beberapa pola yang mewakili tipe latihan berbeda.</p>
      </div>}

      <div className="grammar-practice-pattern-grid">
        {availablePatterns.map((pattern) => <button
          type="button"
          key={pattern.id}
          className="grammar-practice-pattern-card"
          onClick={() => onSelectPattern(pattern.id)}
        >
          <span className="grammar-practice-pattern-meta">Bab {pattern.chapter} · {pattern.jlptLevel}</span>
          <strong>{pattern.pattern}</strong>
          <small>{pattern.meaning}</small>
          <span className="grammar-practice-pattern-action">Mulai latihan <ArrowRight size={15} /></span>
        </button>)}
      </div>
    </> : <>
      <div className="grammar-practice-intro">
        <p className="grammar-section-kicker">LATIHAN BAB</p>
        <h2>Pilih Bab untuk berlatih</h2>
        <p>
          Latih campuran Bunpō yang sudah memiliki exercise dalam satu Bab. Soal dipilih tanpa duplikasi
          dan dibagi relatif seimbang antar-pola yang tersedia.
        </p>
      </div>

      <div className="grammar-practice-chapter-grid">
        {chapterSummaries.map((summary) => {
          const chapterNumber = summary.chapter.chapter;
          const selectedSize = chapterSizes[chapterNumber] ?? getDefaultSessionSize(summary.exerciseCount);
          const sizeOptions = getSessionSizeOptions(summary.exerciseCount);
          const previewPatterns = summary.patterns.slice(0, 3);
          const hiddenPatternCount = Math.max(summary.patterns.length - previewPatterns.length, 0);
          const levelLabel = summary.jlptLevels.join(' / ');

          return <article key={chapterNumber} className="grammar-practice-chapter-card">
            <div className="grammar-practice-chapter-card-head">
              <span className="grammar-practice-pattern-meta">BAB {chapterNumber} · {levelLabel}</span>
              <h3>{summary.chapter.title}</h3>
            </div>

            <div className="grammar-practice-chapter-patterns" aria-label={`Pola tersedia di Bab ${chapterNumber}`}>
              {previewPatterns.map((pattern) => <span key={pattern.id}>{pattern.pattern}</span>)}
              {hiddenPatternCount > 0 && <small>+ {hiddenPatternCount} pola lainnya</small>}
            </div>

            <div className="grammar-practice-chapter-stats">
              <span><strong>{summary.patterns.length}</strong> Pola Tata Bahasa</span>
              <span><strong>{summary.exerciseCount}</strong> Latihan tersedia</span>
            </div>

            <div className="grammar-practice-chapter-size">
              <span>Jumlah latihan</span>
              <div role="group" aria-label={`Pilih jumlah latihan Bab ${chapterNumber}`}>
                {sizeOptions.map((size) => <button
                  type="button"
                  key={String(size)}
                  className={selectedSize === size ? 'active' : ''}
                  aria-pressed={selectedSize === size}
                  onClick={() => onChapterSizeChange(chapterNumber, size)}
                >
                  {size === 'all' ? 'Semua' : size}
                </button>)}
              </div>
            </div>

            <button type="button" className="grammar-practice-chapter-start" onClick={() => onStartChapter(summary)}>
              Mulai Latihan <ArrowRight size={15} />
            </button>
          </article>;
        })}
      </div>
    </>}
  </section>;
}

type GrammarExerciseEngineProps = {
  scope: GrammarPracticeScope;
  pattern?: GrammarPattern;
  chapter?: GrammarChapter;
  chapterPatterns?: GrammarPattern[];
  exercises: GrammarExercise[];
  nextPattern?: GrammarPattern;
  onBackToPracticeMenu: () => void;
  onOpenNextPattern: (patternId: string) => void;
};

export function GrammarExerciseEngine({
  scope,
  pattern,
  chapter,
  chapterPatterns = [],
  exercises,
  nextPattern,
  onBackToPracticeMenu,
  onOpenNextPattern,
}: GrammarExerciseEngineProps) {
  const [runtimeExercises, setRuntimeExercises] = useState(() => prepareRuntimeExercises(exercises));
  const sessionPatterns = useMemo(
    () => scope === 'chapter' ? chapterPatterns : pattern ? [pattern] : [],
    [scope, chapterPatterns, pattern],
  );
  const patternById = useMemo(
    () => new Map(sessionPatterns.map((item) => [item.id, item])),
    [sessionPatterns],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [records, setRecords] = useState<Record<string, AttemptRecord>>({});
  const [answerDrafts, setAnswerDrafts] = useState<AnswerDrafts>({});
  const [orderDrafts, setOrderDrafts] = useState<OrderDrafts>({});
  const [hintOpen, setHintOpen] = useState<ToggleMap>({});
  const [readingOpen, setReadingOpen] = useState<ToggleMap>({});
  const [retrying, setRetrying] = useState<ToggleMap>({});
  const [retryOptionOverrides, setRetryOptionOverrides] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [resultReviewOpen, setResultReviewOpen] = useState(false);
  const [resultReviewIndex, setResultReviewIndex] = useState(0);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const exerciseCardRef = useRef<HTMLElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const resultReviewCardRef = useRef<HTMLElement>(null);

  const baseExercise = runtimeExercises[currentIndex];
  const exercise = baseExercise && retryOptionOverrides[baseExercise.id]
    ? { ...baseExercise, runtimeOptions: retryOptionOverrides[baseExercise.id] }
    : baseExercise;
  const exercisePattern = exercise ? patternById.get(exercise.patternId) ?? pattern : pattern;
  const record = exercise ? records[exercise.id] : undefined;
  const isRetrying = exercise ? Boolean(retrying[exercise.id]) : false;
  const answerDraft = exercise ? answerDrafts[exercise.id] ?? '' : '';
  const orderDraft = exercise ? orderDrafts[exercise.id] ?? [] : [];

  const firstTryCorrect = useMemo(
    () => Object.values(records).filter((item) => item.firstTryCorrect).length,
    [records],
  );
  const needsReview = exercises.length - firstTryCorrect;
  const answeredCount = Object.keys(records).length;
  const resultReviewExercises = runtimeExercises.filter((item) => Boolean(records[item.id]));
  const resultReviewExercise = resultReviewExercises[resultReviewIndex];
  const resultReviewRecord = resultReviewExercise ? records[resultReviewExercise.id] : undefined;
  const resultReviewPattern = resultReviewExercise
    ? patternById.get(resultReviewExercise.patternId) ?? pattern
    : pattern;
  const resultReviewCorrect = resultReviewExercises.filter((item) => records[item.id]?.lastCorrect).length;
  const chapterPatternResults = useMemo(() => sessionPatterns
    .map((sessionPattern) => {
      const patternExercises = runtimeExercises.filter((item) => item.patternId === sessionPattern.id);
      if (patternExercises.length === 0) return null;
      const correct = patternExercises.filter((item) => records[item.id]?.firstTryCorrect).length;
      return {
        pattern: sessionPattern,
        total: patternExercises.length,
        correct,
        needsReview: patternExercises.length - correct,
      };
    })
    .filter((item): item is { pattern: GrammarPattern; total: number; correct: number; needsReview: number } => Boolean(item)),
  [records, runtimeExercises, sessionPatterns]);
  const weakestChapterPatterns = useMemo(() => chapterPatternResults
    .filter((item) => item.needsReview > 0)
    .slice()
    .sort((a, b) => (a.correct / a.total) - (b.correct / b.total) || b.needsReview - a.needsReview)
    .slice(0, 3),
  [chapterPatternResults]);

  const requestExit = () => {
    if (answeredCount === 0) {
      onBackToPracticeMenu();
      return;
    }
    setExitDialogOpen(true);
  };

  const confirmExit = () => {
    setExitDialogOpen(false);
    onBackToPracticeMenu();
  };

  const scrollToExerciseCard = () => {
    afterNextPaint(() => {
      exerciseCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  };

  const scrollToSummary = () => {
    afterNextPaint(() => {
      summaryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  };

  const ensureFeedbackVisible = () => {
    afterNextPaint(() => {
      const feedback = feedbackRef.current;
      if (!feedback) return;

      feedback.focus({ preventScroll: true });
      const rect = feedback.getBoundingClientRect();
      const viewportPadding = 16;
      const viewportBottom = window.innerHeight - viewportPadding;
      const outsideViewport = rect.top < viewportPadding || rect.bottom > viewportBottom;

      if (outsideViewport) {
        feedback.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    });
  };

  const openResultReview = () => {
    if (!finished || resultReviewExercises.length === 0) return;
    setResultReviewIndex(0);
    setResultReviewOpen(true);
    afterNextPaint(() => {
      resultReviewCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  };

  const closeResultReview = () => {
    setResultReviewOpen(false);
    afterNextPaint(() => {
      summaryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  };

  const moveResultReview = (direction: -1 | 1) => {
    setResultReviewIndex((current) => {
      const next = Math.min(Math.max(current + direction, 0), resultReviewExercises.length - 1);
      return next;
    });
    afterNextPaint(() => {
      resultReviewCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  };

  if (!exercise) {
    return <section className="grammar-practice-shell grammar-practice-session">
      <button type="button" className="grammar-practice-exit-button" onClick={onBackToPracticeMenu}>
        <ArrowLeft size={16} /> Kembali ke Menu Latihan
      </button>
      <div className="grammar-practice-unavailable">
        <strong>Belum ada latihan untuk sesi ini.</strong>
        <button type="button" onClick={onBackToPracticeMenu}><ArrowLeft size={16} /> Kembali ke Menu Latihan</button>
      </div>
    </section>;
  }

  const selectedOrderText = orderDraft
    .map((tokenId) => exercise.runtimeTokens?.find((token) => token.id === tokenId)?.text ?? '')
    .join('');
  const currentAnswer = exercise.type === 'sentence_order' ? selectedOrderText : answerDraft;
  const validAnswers = [exercise.answer, ...(exercise.acceptableAnswers ?? [])].map(normalizeAnswer);
  const canSubmit = exercise.type === 'sentence_order'
    ? Boolean(exercise.runtimeTokens?.length) && orderDraft.length === exercise.runtimeTokens?.length
    : Boolean(answerDraft.trim());
  const hasCompletedCurrent = Boolean(record) && !isRetrying;

  const submitAnswer = () => {
    if (!canSubmit || hasCompletedCurrent) return;
    const correct = validAnswers.includes(normalizeAnswer(currentAnswer));

    setRecords((current) => {
      const existing = current[exercise.id];
      return {
        ...current,
        [exercise.id]: {
          firstTryCorrect: existing?.firstTryCorrect ?? correct,
          lastCorrect: correct,
          attempts: (existing?.attempts ?? 0) + 1,
          answer: currentAnswer,
          displayAnswer: exercise.type === 'sentence_order'
            ? orderDraft
              .map((tokenId) => exercise.runtimeTokens?.find((token) => token.id === tokenId)?.text ?? '')
              .filter(Boolean)
              .join(' / ')
            : currentAnswer,
        },
      };
    });
    setRetrying((current) => ({ ...current, [exercise.id]: false }));
    ensureFeedbackVisible();
  };

  const startRetry = () => {
    if (exercise.runtimeOptions?.length) {
      const [retryExercise] = randomizeBalancedOptionSets(
        [exercise],
        (item) => item.runtimeOptions ?? [],
        runtimeCorrectOption,
        (item, runtimeOptions) => ({ ...item, runtimeOptions }),
      );
      if (retryExercise?.runtimeOptions) {
        setRetryOptionOverrides((current) => ({ ...current, [exercise.id]: retryExercise.runtimeOptions! }));
      }
    }
    setRetrying((current) => ({ ...current, [exercise.id]: true }));
    setAnswerDrafts((current) => ({ ...current, [exercise.id]: '' }));
    setOrderDrafts((current) => ({ ...current, [exercise.id]: [] }));
  };

  const movePrevious = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((value) => value - 1);
    scrollToExerciseCard();
  };

  const moveNext = () => {
    if (!hasCompletedCurrent) return;
    if (currentIndex === runtimeExercises.length - 1) {
      setFinished(true);
      scrollToSummary();
      return;
    }
    setCurrentIndex((value) => value + 1);
    scrollToExerciseCard();
  };

  const restart = () => {
    setRuntimeExercises(prepareRuntimeExercises(exercises));
    setCurrentIndex(0);
    setRecords({});
    setAnswerDrafts({});
    setOrderDrafts({});
    setHintOpen({});
    setReadingOpen({});
    setRetrying({});
    setRetryOptionOverrides({});
    setResultReviewOpen(false);
    setResultReviewIndex(0);
    setFinished(false);
    scrollToExerciseCard();
  };

  const choosePiece = (tokenId: string) => {
    if (hasCompletedCurrent || orderDraft.includes(tokenId)) return;
    setOrderDrafts((current) => ({
      ...current,
      [exercise.id]: [...(current[exercise.id] ?? []), tokenId],
    }));
  };

  const removePiece = (tokenId: string) => {
    if (hasCompletedCurrent) return;
    setOrderDrafts((current) => ({
      ...current,
      [exercise.id]: (current[exercise.id] ?? []).filter((value) => value !== tokenId),
    }));
  };

  if (resultReviewOpen && resultReviewExercise && resultReviewRecord) {
    const displayedUserAnswer = resultReviewRecord.displayAnswer || resultReviewRecord.answer || '—';

    return <section className="grammar-practice-shell grammar-practice-result-review">
      <div className="grammar-practice-review-head">
        <p className="grammar-section-kicker">Review Hasil Latihan</p>
        <h2>{scope === 'chapter' ? `Bab ${chapter?.chapter}` : pattern?.pattern}</h2>
        <p>{scope === 'chapter' ? chapter?.title : 'Semua jawaban dari sesi latihan yang baru selesai.'}</p>
        <div className="grammar-practice-review-stats" aria-label="Ringkasan review hasil latihan">
          <span><strong>{resultReviewExercises.length}</strong> Jawaban</span>
          <span><strong>{resultReviewCorrect}</strong> Benar</span>
          <span><strong>{resultReviewExercises.length - resultReviewCorrect}</strong> Belum Tepat</span>
        </div>
      </div>

      <article ref={resultReviewCardRef} className="grammar-practice-review-card">
        <div className="grammar-exercise-meta">
          <span>{TYPE_LABELS[resultReviewExercise.type]}</span>
          <small>
            Soal {resultReviewIndex + 1}
            {resultReviewPattern ? ` · ${resultReviewPattern.pattern} · ${resultReviewPattern.jlptLevel} · Bab ${resultReviewPattern.chapter}` : ''}
          </small>
        </div>
        {scope === 'chapter' && resultReviewPattern && <div className="grammar-exercise-pattern-context is-review">
          <span>Pola</span><strong>{resultReviewPattern.pattern}</strong>
        </div>}

        <p className="grammar-exercise-instruction">{resultReviewExercise.instruction}</p>
        <div className="grammar-exercise-question" lang={/[\u3040-\u30ff\u3400-\u9fff]/.test(resultReviewExercise.prompt) ? 'ja' : undefined}>
          {resultReviewExercise.prompt}
        </div>
        {resultReviewExercise.context && <p className="grammar-exercise-context">{resultReviewExercise.context}</p>}

        <div className={`grammar-practice-review-status ${resultReviewRecord.lastCorrect ? 'is-correct' : 'is-wrong'}`}>
          {resultReviewRecord.lastCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <strong>{resultReviewRecord.lastCorrect ? 'Benar' : 'Belum tepat'}</strong>
        </div>

        <div className="grammar-practice-review-answer-grid">
          <div>
            <span>{resultReviewExercise.type === 'sentence_order' ? 'Susunan kamu' : 'Jawaban kamu'}</span>
            <strong>{displayedUserAnswer}</strong>
          </div>
          <div>
            <span>Jawaban benar</span>
            <strong>{resultReviewExercise.answer}</strong>
          </div>
        </div>

        {resultReviewExercise.resultSentence && <div className="grammar-practice-review-complete">
          <span>Kalimat lengkap</span>
          <strong>{resultReviewExercise.resultSentence}</strong>
        </div>}

        <div className="grammar-practice-review-explanation">
          <span>Penjelasan</span>
          <p>{resultReviewExercise.explanation}</p>
          {resultReviewExercise.transformationSteps?.length ? <div className="grammar-exercise-transform">
            <span>Alur perubahan</span>
            <div>{resultReviewExercise.transformationSteps.map((step, index) => <div key={`${resultReviewExercise.id}-review-step-${index}`}>
              <strong>{step}</strong>
              {index < resultReviewExercise.transformationSteps!.length - 1 && <ArrowRight size={13} />}
            </div>)}</div>
          </div> : null}
        </div>
      </article>

      <nav className="grammar-practice-review-nav" aria-label="Navigasi review hasil latihan">
        <button type="button" disabled={resultReviewIndex === 0} onClick={() => moveResultReview(-1)}>
          <ArrowLeft size={16} /> Sebelumnya
        </button>
        <span>{resultReviewIndex + 1} / {resultReviewExercises.length}</span>
        <button
          type="button"
          disabled={resultReviewIndex === resultReviewExercises.length - 1}
          onClick={() => moveResultReview(1)}
        >
          Selanjutnya <ArrowRight size={16} />
        </button>
      </nav>

      <div className="grammar-practice-review-back-action">
        <button type="button" className="grammar-practice-secondary" onClick={closeResultReview}>
          <ArrowLeft size={16} /> Kembali ke Hasil Latihan
        </button>
      </div>
    </section>;
  }

  if (finished) {
    return <section className="grammar-practice-shell grammar-practice-result">
      <div ref={summaryRef} className="grammar-practice-summary">
        <div className="grammar-practice-summary-icon"><CheckCircle2 size={28} /></div>
        <p className="grammar-section-kicker">{scope === 'chapter' ? 'Latihan Bab Selesai' : 'Latihan Selesai'}</p>
        <h2>{scope === 'chapter' ? `Bab ${chapter?.chapter}` : pattern?.pattern}</h2>
        {scope === 'chapter' && chapter && <p className="grammar-practice-summary-chapter-title">{chapter.title}</p>}
        <p className="grammar-practice-summary-lead">Ringkasan ini membantu menentukan bagian yang perlu dipelajari kembali, bukan nilai ujian.</p>

        <div className="grammar-practice-summary-grid">
          <div><strong>{exercises.length}</strong><span>Total latihan</span></div>
          <div><strong>{firstTryCorrect}</strong><span>Benar pada percobaan pertama</span></div>
          <div><strong>{needsReview}</strong><span>Perlu dipelajari kembali</span></div>
        </div>

        {scope === 'chapter' && <div className="grammar-practice-pattern-results">
          <div className="grammar-practice-pattern-results-head">
            <span>HASIL PER POLA</span>
            <small>Benar pada percobaan pertama</small>
          </div>
          <div className="grammar-practice-pattern-results-list">
            {chapterPatternResults.map((item) => <div key={item.pattern.id}>
              <span>{item.pattern.pattern}</span>
              <strong>{item.correct} / {item.total}</strong>
            </div>)}
          </div>
          {weakestChapterPatterns.length > 0 && <div className="grammar-practice-strengthen">
            <span>Perlu diperkuat:</span>
            <div>{weakestChapterPatterns.map((item) => <strong key={item.pattern.id}>{item.pattern.pattern}</strong>)}</div>
          </div>}
        </div>}

        <div className="grammar-practice-summary-actions">
          <button type="button" className="grammar-practice-primary" onClick={openResultReview}>
            <Eye size={16} /> Lihat Hasil Jawaban
          </button>
          <button type="button" className="grammar-practice-secondary" onClick={restart}>
            <RotateCcw size={16} /> Ulangi Latihan
          </button>
          <button type="button" className="grammar-practice-secondary" onClick={onBackToPracticeMenu}>
            <ArrowLeft size={16} /> Kembali ke Menu Latihan
          </button>
          {nextPattern && <button
            type="button"
            className="grammar-practice-secondary"
            onClick={() => onOpenNextPattern(nextPattern.id)}
          >
            Pelajari Pola Selanjutnya <ArrowRight size={16} />
          </button>}
        </div>
      </div>
    </section>;
  }

  return <section className="grammar-practice-shell grammar-practice-session">
    <button
      ref={backButtonRef}
      type="button"
      className="grammar-practice-exit-button"
      onClick={requestExit}
      aria-haspopup={answeredCount > 0 ? 'dialog' : undefined}
    >
      <ArrowLeft size={16} /> Kembali ke Menu Latihan
    </button>

    {exitDialogOpen && <PracticeExitDialog
      onCancel={() => setExitDialogOpen(false)}
      onConfirm={confirmExit}
      returnFocusRef={backButtonRef}
    />}

    <div className="grammar-practice-head">
      <div>
        <p className="grammar-section-kicker">文法練習 · {scope === 'chapter' ? 'Latihan Bab' : 'Latihan Pola'}</p>
        <h2>{scope === 'chapter' ? `Bab ${chapter?.chapter}` : pattern?.pattern}</h2>
        <p>{scope === 'chapter' ? chapter?.title : pattern?.meaning}</p>
      </div>
      <div className="grammar-practice-progress" aria-label={`Latihan ${currentIndex + 1} dari ${runtimeExercises.length}`}>
        <span>Latihan</span>
        <strong>{currentIndex + 1} / {runtimeExercises.length}</strong>
      </div>
    </div>

    <article ref={exerciseCardRef} className="grammar-exercise-card">
      <div className="grammar-exercise-meta">
        <span>{TYPE_LABELS[exercise.type]}</span>
        <small>{exercisePattern ? `${exercisePattern.jlptLevel} · Bab ${exercisePattern.chapter}` : `Bab ${chapter?.chapter}`}</small>
      </div>

      {scope === 'chapter' && exercisePattern && exercise.type !== 'pattern_choice' && <div className="grammar-exercise-pattern-context">
        <span>Pola</span><strong>{exercisePattern.pattern}</strong>
      </div>}

      <p className="grammar-exercise-instruction">{exercise.instruction}</p>
      <div className="grammar-exercise-question" lang={/[\u3040-\u30ff\u3400-\u9fff]/.test(exercise.prompt) ? 'ja' : undefined}>
        {exercise.prompt}
      </div>
      {exercise.context && <p className="grammar-exercise-context">{exercise.context}</p>}

      <div className="grammar-exercise-tools">
        {exercise.hint && <button
          type="button"
          onClick={() => setHintOpen((current) => ({ ...current, [exercise.id]: !current[exercise.id] }))}
          aria-expanded={Boolean(hintOpen[exercise.id])}
        >
          <HelpCircle size={15} /> Petunjuk
        </button>}
        {exercise.reading && <button
          type="button"
          onClick={() => setReadingOpen((current) => ({ ...current, [exercise.id]: !current[exercise.id] }))}
          aria-expanded={Boolean(readingOpen[exercise.id])}
        >
          <Eye size={15} /> Lihat Bacaan
        </button>}
      </div>

      {exercise.hint && hintOpen[exercise.id] && <div className="grammar-exercise-hint">{exercise.hint}</div>}
      {exercise.reading && readingOpen[exercise.id] && <div className="grammar-exercise-reading">{exercise.reading}</div>}

      {exercise.type === 'sentence_order' ? <div className="grammar-order-wrap">
        <div className="grammar-order-answer" aria-label="Susunan jawaban">
          {orderDraft.length === 0 && <span className="grammar-order-placeholder">Klik potongan di bawah untuk menyusun jawaban.</span>}
          {orderDraft.map((tokenId) => {
            const token = exercise.runtimeTokens?.find((item) => item.id === tokenId);
            if (!token) return null;
            return <button
              type="button"
              key={`chosen-${token.id}`}
              disabled={hasCompletedCurrent}
              onClick={() => removePiece(token.id)}
            >
              {token.text}
            </button>;
          })}
        </div>
        <div className="grammar-order-pieces" aria-label="Potongan kalimat tersedia">
          {exercise.runtimeTokens?.map((token) => <button
            type="button"
            key={token.id}
            disabled={hasCompletedCurrent || orderDraft.includes(token.id)}
            onClick={() => choosePiece(token.id)}
          >
            {token.text}
          </button>)}
        </div>
        <button
          type="button"
          className="grammar-order-reset"
          disabled={hasCompletedCurrent || orderDraft.length === 0}
          onClick={() => setOrderDrafts((current) => ({ ...current, [exercise.id]: [] }))}
        >
          <RotateCcw size={14} /> Ulangi / Reset
        </button>
      </div> : exercise.runtimeOptions?.length ? <div className="grammar-exercise-options" role="group" aria-label="Pilihan jawaban">
        {exercise.runtimeOptions.map((option) => {
          const selected = answerDraft === option;
          const isCorrectOption = hasCompletedCurrent && normalizeAnswer(option) === normalizeAnswer(exercise.answer);
          const isWrongSelected = hasCompletedCurrent && selected && !record?.lastCorrect;
          return <button
            type="button"
            key={option}
            disabled={hasCompletedCurrent}
            className={[
              selected ? 'is-selected' : '',
              isCorrectOption ? 'is-correct' : '',
              isWrongSelected ? 'is-wrong' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setAnswerDrafts((current) => ({ ...current, [exercise.id]: option }))}
          >
            {option}
          </button>;
        })}
      </div> : <input
        className="grammar-exercise-input"
        value={answerDraft}
        disabled={hasCompletedCurrent}
        onChange={(event) => setAnswerDrafts((current) => ({ ...current, [exercise.id]: event.target.value }))}
        placeholder="Masukkan jawaban…"
        autoComplete="off"
      />}

      {!hasCompletedCurrent && <button
        type="button"
        className="grammar-exercise-submit"
        disabled={!canSubmit}
        onClick={submitAnswer}
      >
        Periksa Jawaban
      </button>}

      {hasCompletedCurrent && record && <div
        ref={feedbackRef}
        tabIndex={-1}
        className={`grammar-exercise-feedback ${record.lastCorrect ? 'is-correct' : 'is-wrong'}`}
        aria-live="polite"
      >
        <div className="grammar-exercise-feedback-title">
          {record.lastCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <strong>{record.lastCorrect ? 'Benar!' : 'Belum tepat.'}</strong>
        </div>
        {scope === 'chapter' && exercisePattern && <p className="grammar-exercise-feedback-pattern"><span>Pola yang digunakan:</span> {exercisePattern.pattern}</p>}
        {!record.lastCorrect && <p><span>Jawaban benar:</span> {exercise.answer}</p>}
        {exercise.resultSentence && normalizeAnswer(exercise.resultSentence) !== normalizeAnswer(exercise.answer) && <p>
          <span>Kalimat lengkap:</span> {exercise.resultSentence}
        </p>}
        <p><span>Penjelasan:</span> {exercise.explanation}</p>
        {exercise.transformationSteps?.length ? <div className="grammar-exercise-transform">
          <span>Alur perubahan</span>
          <div>{exercise.transformationSteps.map((step, index) => <div key={`${exercise.id}-step-${index}`}>
            <strong>{step}</strong>
            {index < exercise.transformationSteps!.length - 1 && <ArrowRight size={13} />}
          </div>)}</div>
        </div> : null}
        {exercise.audioText && <button type="button" className="grammar-feedback-audio" onClick={() => speakJapanese(exercise.audioText ?? '')}>
          <Volume2 size={15} /> Dengarkan kalimat benar
        </button>}
        {!record.lastCorrect && <button type="button" className="grammar-practice-retry" onClick={startRetry}>
          <RotateCcw size={15} /> Coba Lagi
        </button>}
      </div>}
    </article>

    <nav className="grammar-exercise-nav" aria-label="Navigasi latihan pola">
      <button type="button" disabled={currentIndex === 0} onClick={movePrevious}>
        <ArrowLeft size={16} /> Sebelumnya
      </button>
      <span>{currentIndex + 1} / {runtimeExercises.length}</span>
      <button type="button" disabled={!hasCompletedCurrent} onClick={moveNext}>
        {currentIndex === runtimeExercises.length - 1 ? 'Lihat Ringkasan' : 'Selanjutnya'} <ArrowRight size={16} />
      </button>
    </nav>

  </section>;
}
