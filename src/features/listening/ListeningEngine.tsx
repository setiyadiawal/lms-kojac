import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Headphones,
  Languages,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react';
import type { ListeningItem, ListeningQuestion, ListeningSegment } from './listeningData';
import { getListeningTurnText } from './listeningData';
import { useListeningSpeech, type ListeningSpeed } from './useListeningSpeech';
import { LISTENING_MASTERY_THRESHOLD, type ListeningProgress } from './useListeningProgress';

const QUESTION_TYPE_LABEL: Record<ListeningQuestion['type'], string> = {
  direct: 'Informasi Langsung',
  who_when_where: 'Siapa / Kapan / Di Mana',
  next_action: 'Tindakan Berikutnya',
  reason: 'Alasan',
  matching: 'Pernyataan yang Sesuai',
  response: 'Respons yang Tepat',
};

const SPEEDS: ListeningSpeed[] = [0.75, 1, 1.25];
type Phase = 'listening' | 'result' | 'review';
type ReviewMode = 'all' | 'wrong';

type ListeningEngineProps = {
  listening: ListeningItem;
  chapterItems: ListeningItem[];
  progress?: ListeningProgress | null;
  isProgressPersistenceAvailable?: boolean;
  onRecordCompletion?: (
    listeningId: string,
    chapterNumber: number,
    score: number,
    correct: number,
    wrong: number,
    totalQuestions: number,
    sessionId: string,
  ) => Promise<ListeningProgress | null>;
  onBackToList: () => void;
  onOpenListening: (id: string) => void;
};

function renderSegments(segments: ListeningSegment[], showFurigana: boolean) {
  return segments.map((segment, index) => {
    if (!showFurigana || !segment.reading) return <span key={`${segment.text}-${index}`}>{segment.text}</span>;
    return <ruby key={`${segment.text}-${index}`}>{segment.text}<rt>{segment.reading}</rt></ruby>;
  });
}

function createListeningSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `listening-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function needsScroll(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < 12 || rect.bottom > height - 12;
}

function AudioPlayer({ listening, compact = false }: { listening: ListeningItem; compact?: boolean }) {
  const speech = useListeningSpeech();
  const [playedOnce, setPlayedOnce] = useState(false);

  function playFromStart() {
    setPlayedOnce(true);
    speech.stop();
    requestAnimationFrame(() => speech.play(listening.speakerTurns));
  }

  return <section className={`listening-audio-card ${compact ? 'compact' : ''}`} aria-label={`Audio ${listening.title}`}>
    <div className="listening-audio-heading">
      <div className="listening-audio-icon"><Headphones size={22} /></div>
      <div>
        <span>LISTENING AUDIO</span>
        <strong>{listening.title}</strong>
        <small>±{listening.estimatedDuration} detik · {speech.voiceSummary}</small>
      </div>
    </div>

    <div className="listening-audio-controls">
      <button
        className="listening-audio-primary"
        type="button"
        aria-label={speech.status === 'playing' ? 'Pause audio Listening' : speech.status === 'paused' ? 'Lanjutkan audio Listening' : 'Putar audio Listening'}
        onClick={() => {
          if (speech.status === 'playing' || speech.status === 'paused') speech.togglePause();
          else {
            setPlayedOnce(true);
            speech.play(listening.speakerTurns);
          }
        }}
        disabled={!speech.supported}
      >
        {speech.status === 'playing' ? <Pause size={18} /> : <Play size={18} />}
        {speech.status === 'playing' ? 'Pause' : speech.status === 'paused' ? 'Lanjutkan' : 'Putar Audio'}
      </button>
      <button type="button" onClick={playFromStart} disabled={!speech.supported || !playedOnce} aria-label="Putar ulang audio Listening">
        <RotateCcw size={16} /> Putar Ulang
      </button>
      <button type="button" onClick={speech.stop} disabled={speech.status === 'idle' || speech.status === 'unsupported'} aria-label="Hentikan audio Listening">
        <X size={16} /> Stop
      </button>
    </div>

    <div className="listening-speed-control" role="group" aria-label="Kecepatan audio">
      <span>Kecepatan</span>
      {SPEEDS.map((value) => <button
        key={value}
        type="button"
        className={speech.speed === value ? 'active' : ''}
        aria-pressed={speech.speed === value}
        onClick={() => speech.changeSpeed(value)}
        disabled={!speech.supported}
      >{value}×</button>)}
    </div>

    {speech.error && <p className="listening-audio-error" role="status">{speech.error}</p>}
  </section>;
}

export function ListeningEngine({
  listening,
  chapterItems,
  progress,
  isProgressPersistenceAvailable,
  onRecordCompletion,
  onBackToList,
  onOpenListening,
}: ListeningEngineProps) {
  const [phase, setPhase] = useState<Phase>('listening');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewMode, setReviewMode] = useState<ReviewMode>('all');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [savedSessionProgress, setSavedSessionProgress] = useState<ListeningProgress | null>(null);
  const [progressSaveState, setProgressSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);

  const questionRef = useRef<HTMLElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  const reviewRef = useRef<HTMLElement | null>(null);
  const exitCancelRef = useRef<HTMLButtonElement | null>(null);
  const exitTriggerRef = useRef<HTMLElement | null>(null);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const completionSaveStartedRef = useRef(false);
  const completionSessionIdRef = useRef(createListeningSessionId());

  const questions = listening.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.reduce((count, question) => count + (answers[question.id] === question.correctAnswer ? 1 : 0), 0);
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const resultAttemptCount = savedSessionProgress?.attempt_count ?? ((progress?.attempt_count ?? 0) + 1);
  const resultBestScore = savedSessionProgress?.best_score ?? Math.max(progress?.best_score ?? 0, score);
  const resultMastered = resultBestScore >= LISTENING_MASTERY_THRESHOLD;
  const position = chapterItems.findIndex((item) => item.id === listening.id);
  const previous = position > 0 ? chapterItems[position - 1] : undefined;
  const next = position >= 0 && position < chapterItems.length - 1 ? chapterItems[position + 1] : undefined;

  const reviewQuestions = useMemo(() => reviewMode === 'all'
    ? questions
    : questions.filter((question) => answers[question.id] !== question.correctAnswer), [answers, questions, reviewMode]);
  const activeReview = reviewQuestions[reviewIndex];

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
      const dialog = document.querySelector<HTMLElement>('.listening-exit-dialog');
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled)')) : [];
      if (!focusable.length) return;
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
    if (answeredCount === 0 || phase !== 'listening') {
      action();
      return;
    }
    exitTriggerRef.current = trigger ?? null;
    pendingNavigationRef.current = action;
    setExitDialogOpen(true);
  }

  function cancelExit() {
    setExitDialogOpen(false);
    pendingNavigationRef.current = null;
    requestAnimationFrame(() => exitTriggerRef.current?.focus({ preventScroll: true }));
  }

  function confirmExit() {
    const action = pendingNavigationRef.current;
    setExitDialogOpen(false);
    pendingNavigationRef.current = null;
    action?.();
  }

  function submitAnswer(answer: string) {
    if (!currentQuestion || currentAnswer) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const feedback = feedbackRef.current;
      if (!feedback) return;
      feedback.focus({ preventScroll: true });
      if (needsScroll(feedback)) feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
  }

  function persistCompletion() {
    if (!isProgressPersistenceAvailable || !onRecordCompletion || completionSaveStartedRef.current) return;

    const recordCompletion = onRecordCompletion;
    const sessionId = completionSessionIdRef.current;
    completionSaveStartedRef.current = true;
    setProgressSaveState('saving');
    setProgressSaveError(null);

    void recordCompletion(
      listening.id,
      listening.chapter,
      score,
      correctCount,
      questions.length - correctCount,
      questions.length,
      sessionId,
    ).then((savedProgress) => {
      if (completionSessionIdRef.current !== sessionId) return;
      if (!savedProgress) {
        setProgressSaveState('idle');
        return;
      }
      setSavedSessionProgress(savedProgress);
      setProgressSaveState('saved');
    }).catch((saveError) => {
      if (completionSessionIdRef.current !== sessionId) return;
      setProgressSaveError(saveError instanceof Error ? saveError.message : 'Progress Listening belum berhasil disimpan.');
      setProgressSaveState('error');
    });
  }

  function goNext() {
    if (!currentAnswer) return;
    if (currentQuestionIndex === questions.length - 1) {
      persistCompletion();
      setPhase('result');
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }
    setCurrentQuestionIndex((index) => index + 1);
    requestAnimationFrame(() => questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function restart() {
    setPhase('listening');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setReviewMode('all');
    setReviewIndex(0);
    setShowTranscript(false);
    setShowFurigana(false);
    setShowTranslation(false);
    setSavedSessionProgress(null);
    setProgressSaveState('idle');
    setProgressSaveError(null);
    completionSaveStartedRef.current = false;
    completionSessionIdRef.current = createListeningSessionId();
    requestAnimationFrame(() => questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function openReview(mode: ReviewMode) {
    setReviewMode(mode);
    setReviewIndex(0);
    setShowTranscript(false);
    setShowFurigana(false);
    setShowTranslation(false);
    setPhase('review');
    requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function backToResult() {
    setPhase('result');
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const transcriptPanel = <section className="listening-transcript-tools" aria-label="Transcript dan terjemahan Listening">
    <div className="listening-transcript-actions">
      <button type="button" className={showTranscript ? 'active' : ''} aria-pressed={showTranscript} onClick={() => {
        setShowTranscript((value) => !value);
        if (showTranscript) {
          setShowFurigana(false);
          setShowTranslation(false);
        }
      }}><FileText size={15} /> {showTranscript ? 'Sembunyikan Transcript' : 'Lihat Transcript'}</button>
      {showTranscript && <button type="button" className={showFurigana ? 'active' : ''} aria-pressed={showFurigana} onClick={() => setShowFurigana((value) => !value)}>
        <Languages size={15} /> {showFurigana ? 'Sembunyikan Furigana' : 'Tampilkan Furigana'}
      </button>}
      {showTranscript && <button type="button" className={showTranslation ? 'active' : ''} aria-pressed={showTranslation} onClick={() => setShowTranslation((value) => !value)}>
        {showTranslation ? 'Sembunyikan Terjemahan' : 'Lihat Terjemahan'}
      </button>}
    </div>

    {showTranscript && <div className={`listening-transcript ${showFurigana ? 'show-furigana' : ''}`}>
      {listening.speakerTurns.map((turn, index) => <div className="listening-transcript-turn" key={`${listening.id}-turn-${index}`}>
        <strong>{turn.speaker}</strong>
        <p>{renderSegments(turn.segments, showFurigana)}</p>
      </div>)}
    </div>}

    {showTranscript && showTranslation && <div className="listening-translation">
      <span>Terjemahan Indonesia</span>
      {listening.translation.map((paragraph, index) => <p key={`${listening.id}-translation-${index}`}>{paragraph}</p>)}
    </div>}
  </section>;

  if (phase === 'review' && activeReview) {
    const userAnswer = answers[activeReview.id];
    const isCorrect = userAnswer === activeReview.correctAnswer;
    return <div className="listening-engine listening-review-shell" ref={reviewRef as React.RefObject<HTMLDivElement>}>
      <section className="listening-review-summary">
        <p className="listening-kicker">REVIEW LISTENING</p>
        <h2>{reviewMode === 'all' ? 'Lihat Hasil Jawaban' : 'Lihat Soal yang Salah'}</h2>
        <p>{listening.title} · {reviewQuestions.length} pertanyaan</p>
      </section>

      <AudioPlayer listening={listening} compact />
      {transcriptPanel}

      <article className="listening-review-card">
        <div className="listening-review-meta">
          <span>Soal {reviewIndex + 1}</span>
          <span>{QUESTION_TYPE_LABEL[activeReview.type]}</span>
        </div>
        <h3>{activeReview.prompt}</h3>
        <div className="listening-review-answer-grid">
          <div><span>Jawaban Kamu</span><strong>{userAnswer ?? '—'}</strong></div>
          <div><span>Jawaban Benar</span><strong>{activeReview.correctAnswer}</strong></div>
        </div>
        <div className={`listening-review-status ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
          {isCorrect ? <Check size={17} /> : <X size={17} />} <strong>{isCorrect ? 'Benar' : 'Belum tepat'}</strong>
        </div>
        <section className="listening-review-explanation">
          <span>Penjelasan</span>
          <p>{activeReview.explanation}</p>
          {activeReview.evidence && <blockquote><span>Bagian transcript yang relevan</span><p>{activeReview.evidence}</p></blockquote>}
        </section>
      </article>

      <nav className="listening-review-nav" aria-label="Navigasi review Listening">
        <button type="button" disabled={reviewIndex === 0} onClick={() => setReviewIndex((index) => Math.max(0, index - 1))}>
          <ChevronLeft size={16} /> Sebelumnya
        </button>
        <strong>{reviewIndex + 1} / {reviewQuestions.length}</strong>
        <button type="button" disabled={reviewIndex === reviewQuestions.length - 1} onClick={() => setReviewIndex((index) => Math.min(reviewQuestions.length - 1, index + 1))}>
          Selanjutnya <ChevronRight size={16} />
        </button>
      </nav>
      <button className="listening-back-result" type="button" onClick={backToResult}><ArrowLeft size={16} /> Kembali ke Hasil Listening</button>
    </div>;
  }

  if (phase === 'result') {
    return <div className="listening-engine">
      <section className="listening-result-card" ref={resultRef}>
        <div className="listening-result-icon"><Headphones size={27} /></div>
        <p className="listening-kicker">LISTENING SELESAI</p>
        <h2>{listening.title}</h2>
        <p>Bab {listening.chapter} · {listening.jlptLevel} · {listening.difficulty}</p>
        <div className="listening-result-score"><span>Pemahaman</span><strong>{score}%</strong></div>
        {isProgressPersistenceAvailable && <p role="status">
          {progressSaveState === 'saving' && 'Menyimpan progress…'}
          {progressSaveState === 'saved' && `Progress tersimpan · Percobaan ${resultAttemptCount} · Best ${resultBestScore}%${resultMastered ? ' · Dikuasai' : ''}`}
          {progressSaveState === 'error' && `Hasil tetap aman. Progress belum tersimpan${progressSaveError ? `: ${progressSaveError}` : '.'}`}
        </p>}
        <div className="listening-result-stats">
          <div><strong>{questions.length}</strong><span>Pertanyaan</span></div>
          <div><strong>{correctCount}</strong><span>Benar</span></div>
          <div><strong>{questions.length - correctCount}</strong><span>Salah</span></div>
        </div>
        <div className="listening-result-actions">
          <button className="listening-primary-action" type="button" onClick={() => openReview('all')}><ListChecks size={17} /> Lihat Hasil Jawaban</button>
          {questions.length - correctCount > 0 && <button type="button" onClick={() => openReview('wrong')}>Lihat Soal yang Salah</button>}
          <button type="button" onClick={restart}><RotateCcw size={16} /> Ulangi Listening</button>
          <button type="button" onClick={onBackToList}><ArrowLeft size={16} /> Kembali ke Daftar Listening</button>
        </div>
      </section>

      <AudioPlayer listening={listening} compact />
      {transcriptPanel}
    </div>;
  }

  return <div className="listening-engine">
    <button className="listening-back-list" type="button" onClick={(event) => askBeforeLeaving(onBackToList, event.currentTarget)}>
      <ArrowLeft size={17} /> Kembali ke Daftar Listening
    </button>

    <header className="listening-session-header">
      <div>
        <p className="listening-kicker">聴解 {listening.order} · {listening.type.toUpperCase()}</p>
        <h2>{listening.title}</h2>
        <div className="listening-meta-line"><span>{listening.jlptLevel}</span><span>{listening.difficulty}</span><span>±{listening.estimatedDuration} detik</span><span>{listening.speakerTurns.length > 1 ? `${new Set(listening.speakerTurns.map((turn) => turn.speaker)).size} speaker` : '1 speaker'}</span></div>
      </div>
      <div className="listening-question-counter"><span>SOAL</span><strong>{currentQuestionIndex + 1} / {questions.length}</strong></div>
    </header>

    <AudioPlayer listening={listening} />
    <p className="listening-transcript-lock"><FileText size={14} /> Transcript dan terjemahan tersedia setelah Listening selesai.</p>

    <section className="listening-question-card" ref={questionRef} aria-labelledby="listening-question-title">
      <div className="listening-question-topline"><span>{QUESTION_TYPE_LABEL[currentQuestion.type]}</span><strong>{answeredCount} dari {questions.length} dijawab</strong></div>
      <div className="listening-question-progress" aria-hidden="true"><i style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} /></div>
      <h3 id="listening-question-title">{currentQuestion.prompt}</h3>
      <div className="listening-question-options">
        {currentQuestion.options.map((option) => {
          const selected = currentAnswer === option;
          return <button key={option} type="button" className={selected ? 'selected' : ''} disabled={Boolean(currentAnswer)} onClick={() => submitAnswer(option)}>{option}</button>;
        })}
      </div>
      {currentAnswer && <div ref={feedbackRef} tabIndex={-1} className={`listening-question-feedback ${currentAnswer === currentQuestion.correctAnswer ? 'correct' : 'wrong'}`}>
        {currentAnswer === currentQuestion.correctAnswer ? <Check size={18} /> : <X size={18} />}
        <strong>{currentAnswer === currentQuestion.correctAnswer ? 'Benar' : 'Belum tepat'}</strong>
        <span>Pembahasan lengkap dan transcript tersedia setelah Listening selesai.</span>
      </div>}
      <div className="listening-question-actions">
        <span>Dengarkan ulang audio kapan pun diperlukan.</span>
        <button type="button" disabled={!currentAnswer} onClick={goNext}>{currentQuestionIndex === questions.length - 1 ? 'Lihat Hasil' : 'Selanjutnya'} <ChevronRight size={16} /></button>
      </div>
    </section>

    <nav className="listening-item-navigation" aria-label={`Navigasi Listening Bab ${listening.chapter}`}>
      <button type="button" disabled={!previous} onClick={(event) => previous && askBeforeLeaving(() => onOpenListening(previous.id), event.currentTarget)}><ChevronLeft size={16} /> Listening Sebelumnya</button>
      <strong>Listening {position + 1} / {chapterItems.length}</strong>
      <button type="button" disabled={!next} onClick={(event) => next && askBeforeLeaving(() => onOpenListening(next.id), event.currentTarget)}>Listening Selanjutnya <ChevronRight size={16} /></button>
    </nav>

    {exitDialogOpen && <div className="listening-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) cancelExit();
    }}>
      <div className="listening-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="listening-exit-title" aria-describedby="listening-exit-description">
        <h3 id="listening-exit-title">Keluar dari Listening?</h3>
        <p id="listening-exit-description">Jawaban sesi ini akan hilang jika Anda keluar sekarang.</p>
        <div>
          <button ref={exitCancelRef} type="button" onClick={cancelExit}>Tetap Mendengarkan</button>
          <button className="danger" type="button" onClick={confirmExit}>Keluar</button>
        </div>
      </div>
    </div>}
  </div>;
}
