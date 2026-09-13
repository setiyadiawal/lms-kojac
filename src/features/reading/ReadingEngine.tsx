import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  ListChecks,
  RotateCcw,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGrammarPattern } from '../grammar/grammarData';
import { randomizeQuestionOptions } from '../quiz/optionRandomization';
import type { ReadingItem, ReadingParagraph } from './readingData';
import { getReadingProgressStatus, type ReadingProgress } from './useReadingProgress';

const QUESTION_TYPE_LABEL: Record<string, string> = {
  direct: 'Informasi Langsung',
  context: 'Makna dalam Konteks',
  who_when_where: 'Siapa / Kapan / Di Mana',
  sequence: 'Urutan Kejadian',
  inference: 'Kesimpulan Sederhana',
  author_intent: 'Maksud Penulis',
};

type ReviewMode = 'all' | 'wrong';
type Phase = 'reading' | 'result' | 'review';

type ReadingEngineProps = {
  reading: ReadingItem;
  chapterReadings: ReadingItem[];
  progress: ReadingProgress | null;
  onRecordCompletion: (readingId: string, readingTitle: string, correctCount: number, totalQuestions: number, sessionId: string) => Promise<ReadingProgress>;
  onBackToList: () => void;
  onOpenReading: (readingId: string) => void;
};

function renderParagraph(paragraph: ReadingParagraph, showFurigana: boolean) {
  return paragraph.map((segment, index) => {
    if (!segment.reading || !showFurigana) return <span key={`${segment.text}-${index}`}>{segment.text}</span>;
    return <ruby key={`${segment.text}-${index}`}>
      {segment.text}
      <rt>{segment.reading}</rt>
    </ruby>;
  });
}

function createReadingSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `reading-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function needsScrollIntoView(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < 12 || rect.bottom > viewportHeight - 12;
}

export function ReadingEngine({
  reading,
  chapterReadings,
  progress,
  onRecordCompletion,
  onBackToList,
  onOpenReading,
}: ReadingEngineProps) {
  const [showFurigana, setShowFurigana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  const [phase, setPhase] = useState<Phase>('reading');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewMode, setReviewMode] = useState<ReviewMode>('all');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [savedSessionProgress, setSavedSessionProgress] = useState<ReadingProgress | null>(null);
  const [progressSaveState, setProgressSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);
  const [questions, setQuestions] = useState(() => randomizeQuestionOptions(reading.comprehensionQuestions));

  const questionCardRef = useRef<HTMLElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  const reviewRef = useRef<HTMLElement | null>(null);
  const exitCancelRef = useRef<HTMLButtonElement | null>(null);
  const exitTriggerRef = useRef<HTMLElement | null>(null);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const completionSaveStartedRef = useRef(false);
  const completionSessionIdRef = useRef(createReadingSessionId());

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.reduce(
    (total, question) => total + (answers[question.id] === question.correctAnswer ? 1 : 0),
    0,
  );
  const wrongCount = answeredCount - correctCount;
  const comprehensionScore = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

  const predictedAttempt = (progress?.attempts ?? 0) + 1;
  const resultAttempt = savedSessionProgress?.attempts ?? predictedAttempt;
  const resultBestScore = savedSessionProgress?.best_score ?? Math.max(progress?.best_score ?? 0, comprehensionScore);
  const resultStatus = getReadingProgressStatus({
    reading_id: reading.id,
    reading_title: reading.title,
    attempts: resultAttempt,
    completed: true,
    latest_score: comprehensionScore,
    best_score: resultBestScore,
    latest_correct_count: correctCount,
    total_questions: questions.length,
    first_completed_at: savedSessionProgress?.first_completed_at ?? progress?.first_completed_at ?? null,
    last_completed_at: savedSessionProgress?.last_completed_at ?? progress?.last_completed_at ?? null,
    updated_at: savedSessionProgress?.updated_at ?? progress?.updated_at ?? new Date().toISOString(),
  });
  const resultStatusLabel = resultStatus === 'mastered'
    ? 'Dikuasai'
    : resultStatus === 'repeat'
      ? 'Perlu Diulang'
      : 'Selesai';

  const currentReadingPosition = chapterReadings.findIndex((item) => item.id === reading.id);
  const previousReading = currentReadingPosition > 0 ? chapterReadings[currentReadingPosition - 1] : undefined;
  const nextReading = currentReadingPosition >= 0 && currentReadingPosition < chapterReadings.length - 1
    ? chapterReadings[currentReadingPosition + 1]
    : undefined;

  const grammarTargets = useMemo(
    () => reading.grammarTargets
      .map((id) => getGrammarPattern(id))
      .filter((pattern): pattern is NonNullable<ReturnType<typeof getGrammarPattern>> => Boolean(pattern)),
    [reading.grammarTargets],
  );

  const reviewQuestions = useMemo(() => {
    if (reviewMode === 'all') return questions;
    return questions.filter((question) => answers[question.id] !== question.correctAnswer);
  }, [answers, questions, reviewMode]);
  const activeReviewQuestion = reviewQuestions[reviewIndex];

  useEffect(() => {
    if (!exitDialogOpen) return;
    exitCancelRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExitDialogOpen(false);
        requestAnimationFrame(() => exitTriggerRef.current?.focus({ preventScroll: true }));
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('.reading-exit-dialog');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled)'));
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [exitDialogOpen]);

  function askBeforeLeaving(action: () => void, trigger?: HTMLElement | null) {
    if (phase !== 'reading' || answeredCount === 0) {
      action();
      return;
    }
    pendingNavigationRef.current = action;
    exitTriggerRef.current = trigger ?? null;
    setExitDialogOpen(true);
  }

  function cancelExit() {
    pendingNavigationRef.current = null;
    setExitDialogOpen(false);
    requestAnimationFrame(() => exitTriggerRef.current?.focus({ preventScroll: true }));
  }

  function confirmExit() {
    const action = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setExitDialogOpen(false);
    action?.();
  }

  function submitAnswer(answer: string) {
    if (!currentQuestion || currentAnswer) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }));

    requestAnimationFrame(() => {
      const feedback = feedbackRef.current;
      if (feedback && needsScrollIntoView(feedback)) {
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  async function saveCompletion() {
    if (completionSaveStartedRef.current || progressSaveState === 'saving') return;
    const sessionId = completionSessionIdRef.current;
    completionSaveStartedRef.current = true;
    setProgressSaveState('saving');
    setProgressSaveError(null);

    try {
      const saved = await onRecordCompletion(reading.id, reading.title, correctCount, questions.length, sessionId);
      if (completionSessionIdRef.current !== sessionId) return;
      setSavedSessionProgress(saved);
      setProgressSaveState('saved');
    } catch (saveError) {
      if (completionSessionIdRef.current !== sessionId) return;
      completionSaveStartedRef.current = false;
      setProgressSaveState('error');
      setProgressSaveError(saveError instanceof Error ? saveError.message : 'Progress belum berhasil disimpan.');
    }
  }

  function goToNextQuestion() {
    if (!currentQuestion || !currentAnswer) return;
    if (currentQuestionIndex === questions.length - 1) {
      setPhase('result');
      void saveCompletion();
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }

    setCurrentQuestionIndex((index) => index + 1);
    requestAnimationFrame(() => questionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function restartReading() {
    completionSaveStartedRef.current = false;
    completionSessionIdRef.current = createReadingSessionId();
    setSavedSessionProgress(null);
    setProgressSaveState('idle');
    setProgressSaveError(null);
    setQuestions(randomizeQuestionOptions(reading.comprehensionQuestions));
    setAnswers({});
    setCurrentQuestionIndex(0);
    setReviewIndex(0);
    setReviewMode('all');
    setPhase('reading');
    setShowTranslation(false);
    requestAnimationFrame(() => questionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function openReview(mode: ReviewMode) {
    setReviewMode(mode);
    setReviewIndex(0);
    setPhase('review');
    requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function backToResult() {
    setPhase('result');
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  if (phase === 'review' && activeReviewQuestion) {
    const userAnswer = answers[activeReviewQuestion.id] ?? '—';
    const isCorrect = userAnswer === activeReviewQuestion.correctAnswer;

    return <div className="reading-engine reading-review-shell" ref={reviewRef as React.RefObject<HTMLDivElement>}>
      <section className="reading-review-summary">
        <p className="reading-kicker">REVIEW HASIL READING</p>
        <h2>{reviewMode === 'all' ? 'Lihat Hasil Jawaban' : 'Lihat Soal yang Salah'}</h2>
        <p>{reading.title} · {reviewQuestions.length} pertanyaan</p>
      </section>

      <article className="reading-review-card">
        <div className="reading-review-meta">
          <span>Soal {reviewIndex + 1}</span>
          <span>{QUESTION_TYPE_LABEL[activeReviewQuestion.type]}</span>
          <span>{reading.jlptLevel}</span>
        </div>
        <h3>{activeReviewQuestion.prompt}</h3>

        <div className="reading-review-answer-grid">
          <div>
            <span>Jawaban Kamu</span>
            <strong>{userAnswer}</strong>
          </div>
          <div>
            <span>Jawaban Benar</span>
            <strong>{activeReviewQuestion.correctAnswer}</strong>
          </div>
        </div>

        <div className={`reading-review-status ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
          {isCorrect ? <Check size={17} /> : <X size={17} />}
          <strong>{isCorrect ? 'Benar' : 'Belum tepat'}</strong>
        </div>

        <section className="reading-review-explanation">
          <span>Penjelasan</span>
          <p>{activeReviewQuestion.explanation}</p>
          {activeReviewQuestion.evidence && <blockquote>
            <span>Bagian bacaan yang relevan</span>
            <p>{activeReviewQuestion.evidence}</p>
          </blockquote>}
        </section>
      </article>

      <nav className="reading-review-nav" aria-label="Navigasi review Reading">
        <button
          type="button"
          onClick={() => setReviewIndex((index) => Math.max(0, index - 1))}
          disabled={reviewIndex === 0}
        >
          <ChevronLeft size={16} /> Sebelumnya
        </button>
        <strong>{reviewIndex + 1} / {reviewQuestions.length}</strong>
        <button
          type="button"
          onClick={() => setReviewIndex((index) => Math.min(reviewQuestions.length - 1, index + 1))}
          disabled={reviewIndex === reviewQuestions.length - 1}
        >
          Selanjutnya <ChevronRight size={16} />
        </button>
      </nav>

      <button className="reading-back-result" type="button" onClick={backToResult}>
        <ArrowLeft size={16} /> Kembali ke Hasil Reading
      </button>
    </div>;
  }

  if (phase === 'result') {
    return <div className="reading-engine">
      <section className="reading-result-card" ref={resultRef}>
        <div className="reading-result-icon"><BookOpen size={26} /></div>
        <p className="reading-kicker">READING SELESAI</p>
        <h2>{reading.title}</h2>
        <p>Bab {reading.chapter} · {reading.jlptLevel} · {reading.difficulty}</p>

        <div className="reading-result-score">
          <span>Pemahaman</span>
          <strong>{comprehensionScore}%</strong>
        </div>

        <div className="reading-result-stats">
          <div><strong>{questions.length}</strong><span>Pertanyaan</span></div>
          <div><strong>{correctCount}</strong><span>Benar</span></div>
          <div><strong>{questions.length - correctCount}</strong><span>Salah</span></div>
        </div>

        <section className="reading-result-progress" aria-label="Progress Reading">
          <div><span>Attempt</span><strong>ke-{resultAttempt}</strong></div>
          <div><span>Nilai kali ini</span><strong>{comprehensionScore}%</strong></div>
          <div><span>Terbaik</span><strong>{resultBestScore}%</strong></div>
          <div><span>Status</span><strong className={`status-${resultStatus}`}>{resultStatusLabel}</strong></div>
        </section>

        {progressSaveState === 'saving' && <p className="reading-progress-save-note">Menyimpan progress Reading…</p>}
        {progressSaveState === 'saved' && <p className="reading-progress-save-note success">Progress Reading tersimpan.</p>}
        {progressSaveState === 'error' && <div className="reading-progress-save-error" role="status">
          <span>Progress belum berhasil disimpan.</span>
          {progressSaveError && <small>{progressSaveError}</small>}
          <button type="button" onClick={() => void saveCompletion()}>Coba Lagi</button>
        </div>}

        <div className="reading-result-actions">
          <button className="reading-primary-action" type="button" onClick={() => openReview('all')}>
            <ListChecks size={17} /> Lihat Hasil Jawaban
          </button>
          {questions.length - correctCount > 0 && <button type="button" onClick={() => openReview('wrong')}>
            Lihat Soal yang Salah
          </button>}
          <button type="button" onClick={restartReading}><RotateCcw size={16} /> Baca Ulang</button>
          <button type="button" onClick={onBackToList}><ArrowLeft size={16} /> Kembali ke Daftar Bacaan</button>
        </div>
      </section>
    </div>;
  }

  return <div className="reading-engine">
    <button
      className="reading-back-list"
      type="button"
      onClick={(event) => askBeforeLeaving(onBackToList, event.currentTarget)}
    >
      <ArrowLeft size={17} /> Kembali ke Daftar Bacaan
    </button>

    <article className="reading-passage-card">
      <header className="reading-passage-header">
        <div>
          <p className="reading-kicker">読解 {reading.order} · {reading.kind}</p>
          <h2>{reading.title}</h2>
          <div className="reading-meta-line">
            <span>{reading.jlptLevel}</span>
            <span>{reading.difficulty}</span>
            <span>±{reading.estimatedReadingTime} menit</span>
          </div>
        </div>
        <div className="reading-support-toggles" aria-label="Bantuan membaca">
          <button
            className={showFurigana ? 'active' : ''}
            type="button"
            aria-pressed={showFurigana}
            onClick={() => setShowFurigana((value) => !value)}
          >
            <Languages size={15} /> {showFurigana ? 'Sembunyikan Furigana' : 'Lihat Furigana'}
          </button>
          <button
            className={showTranslation ? 'active' : ''}
            type="button"
            aria-pressed={showTranslation}
            onClick={() => setShowTranslation((value) => !value)}
          >
            {showTranslation ? 'Sembunyikan Terjemahan' : 'Lihat Terjemahan'}
          </button>
        </div>
      </header>

      <section className={`reading-passage-text ${showFurigana ? 'show-furigana' : ''}`} aria-label="Teks bacaan Jepang">
        {reading.passage.map((paragraph, index) => <p key={`${reading.id}-paragraph-${index}`}>
          {renderParagraph(paragraph, showFurigana)}
        </p>)}
      </section>

      {showTranslation && <section className="reading-translation" aria-label="Terjemahan bacaan">
        <span>Terjemahan Indonesia</span>
        {reading.translation.map((paragraph, index) => <p key={`${reading.id}-translation-${index}`}>{paragraph}</p>)}
      </section>}

      <div className="reading-support-grid">
        <section className="reading-support-card">
          <button
            className="reading-support-heading"
            type="button"
            onClick={() => setShowVocabulary((value) => !value)}
            aria-expanded={showVocabulary}
          >
            <span><BookOpen size={17} /> Kosakata Penting</span>
            <strong>{reading.vocabularyHelp.length}</strong>
          </button>
          {showVocabulary && <div className="reading-vocab-list">
            {reading.vocabularyHelp.map((item) => <div key={`${reading.id}-${item.japanese}`}>
              <strong>{item.japanese}</strong>
              <span>{item.reading}</span>
              <small>{item.meaning}</small>
            </div>)}
          </div>}
        </section>

        <section className="reading-support-card">
          <button
            className="reading-support-heading"
            type="button"
            onClick={() => setShowGrammar((value) => !value)}
            aria-expanded={showGrammar}
          >
            <span><ListChecks size={17} /> Pola Tata Bahasa</span>
            <strong>{grammarTargets.length}</strong>
          </button>
          {showGrammar && <div className="reading-grammar-list">
            {grammarTargets.map((pattern) => <div key={pattern.id}>
              <div>
                <strong>{pattern.pattern}</strong>
                <span>{pattern.meaning}</span>
                <small>{pattern.formula}</small>
              </div>
            </div>)}
            <Link className="reading-grammar-module-link" to="/belajar/tata-bahasa">
              Buka modul Tata Bahasa <ArrowRight size={14} />
            </Link>
          </div>}
        </section>
      </div>
    </article>

    <section className="reading-question-card" ref={questionCardRef} aria-labelledby="reading-question-title">
      <div className="reading-question-topline">
        <div>
          <span>PERTANYAAN</span>
          <strong>{currentQuestionIndex + 1} / {questions.length}</strong>
        </div>
        <small>{QUESTION_TYPE_LABEL[currentQuestion.type]}</small>
      </div>
      <div className="reading-question-progress" aria-hidden="true">
        <i style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
      </div>
      <h3 id="reading-question-title">{currentQuestion.prompt}</h3>

      <div className="reading-question-options">
        {currentQuestion.options.map((option) => {
          const selected = currentAnswer === option;
          const selectedCorrect = selected && currentAnswer === currentQuestion.correctAnswer;
          const selectedWrong = selected && currentAnswer !== currentQuestion.correctAnswer;
          return <button
            key={option}
            type="button"
            className={`${selected ? 'selected' : ''} ${selectedCorrect ? 'correct' : ''} ${selectedWrong ? 'wrong' : ''}`}
            disabled={Boolean(currentAnswer)}
            onClick={() => submitAnswer(option)}
          >
            {option}
          </button>;
        })}
      </div>

      {currentAnswer && <div
        ref={feedbackRef}
        className={`reading-question-feedback ${currentAnswer === currentQuestion.correctAnswer ? 'correct' : 'wrong'}`}
        tabIndex={-1}
      >
        {currentAnswer === currentQuestion.correctAnswer ? <Check size={18} /> : <X size={18} />}
        <strong>{currentAnswer === currentQuestion.correctAnswer ? 'Benar' : 'Belum tepat'}</strong>
        <span>Pembahasan lengkap tersedia setelah Reading selesai.</span>
      </div>}

      <div className="reading-question-actions">
        <span>{answeredCount} dari {questions.length} dijawab</span>
        <button type="button" onClick={goToNextQuestion} disabled={!currentAnswer}>
          {currentQuestionIndex === questions.length - 1 ? 'Lihat Hasil' : 'Selanjutnya'} <ChevronRight size={16} />
        </button>
      </div>
    </section>

    <nav className="reading-item-navigation" aria-label={`Navigasi bacaan Bab ${reading.chapter}`}>
      <button
        type="button"
        disabled={!previousReading}
        onClick={(event) => previousReading && askBeforeLeaving(() => onOpenReading(previousReading.id), event.currentTarget)}
      >
        <ChevronLeft size={16} /> Bacaan Sebelumnya
      </button>
      <strong>Bacaan {currentReadingPosition + 1} / {chapterReadings.length}</strong>
      <button
        type="button"
        disabled={!nextReading}
        onClick={(event) => nextReading && askBeforeLeaving(() => onOpenReading(nextReading.id), event.currentTarget)}
      >
        Bacaan Selanjutnya <ChevronRight size={16} />
      </button>
    </nav>

    {exitDialogOpen && <div className="reading-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) cancelExit();
    }}>
      <div
        className="reading-exit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-exit-title"
        aria-describedby="reading-exit-description"
      >
        <h3 id="reading-exit-title">Keluar dari Reading?</h3>
        <p id="reading-exit-description">Jawaban sesi ini akan hilang jika Anda keluar sekarang.</p>
        <div>
          <button ref={exitCancelRef} type="button" onClick={cancelExit}>Tetap Membaca</button>
          <button className="danger" type="button" onClick={confirmExit}>Keluar</button>
        </div>
      </div>
    </div>}
  </div>;
}
