import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { QuizSoundToggle } from '../quiz/QuizSoundToggle';
import { useQuizSounds } from '../quiz/useQuizSounds';
import type { GrammarReviewRating } from './useGrammarProgress';
import {
  GRAMMAR_CHAPTERS,
  GRAMMAR_PATTERNS,
  type GrammarChapter,
  type GrammarPattern,
} from './grammarData';
import {
  GRAMMAR_EXERCISES,
  type GrammarExercise,
  type GrammarExerciseType,
} from './grammarExercises';
import './grammar-quiz.css';

export type GrammarQuizScope = 'pattern' | 'chapter';
type GrammarQuizCount = number | 'all';
type GrammarQuizReviewMode = 'all' | 'wrong';

type PreparedGrammarQuestion = GrammarExercise & {
  quizOptions: string[];
  quizTokens: string[];
};

type GrammarQuizAttempt = {
  questionId: string;
  userAnswer: string;
  displayAnswer: string;
  correct: boolean;
};

type PatternQuizConfig = {
  scope: 'pattern';
  pattern: GrammarPattern;
  count: GrammarQuizCount;
};

type ChapterQuizConfig = {
  scope: 'chapter';
  chapter: GrammarChapter;
  patterns: GrammarPattern[];
  count: GrammarQuizCount;
};

type GrammarQuizConfig = PatternQuizConfig | ChapterQuizConfig;

type GrammarQuizChapterSummary = {
  chapter: GrammarChapter;
  patterns: GrammarPattern[];
  exerciseCount: number;
  jlptLevels: GrammarPattern['jlptLevel'][];
};

const QUIZ_COUNTS = [5, 10, 15, 20, 25, 30, 40, 50] as const;
const PARTICLE_ANSWERS = new Set(['は', 'も', 'の', 'で', 'に', 'へ', 'を', 'が', 'と', 'から', 'まで']);

function shuffleCopy<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function normalizeQuizAnswer(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[。．.!！?？]+$/g, '');
}

function answersMatch(question: GrammarExercise, userAnswer: string) {
  const normalized = normalizeQuizAnswer(userAnswer);
  const validAnswers = [question.answer, ...(question.acceptableAnswers ?? [])]
    .map(normalizeQuizAnswer);
  return validAnswers.includes(normalized);
}

function prepareQuestion(exercise: GrammarExercise): PreparedGrammarQuestion {
  return {
    ...exercise,
    quizOptions: shuffleCopy(exercise.options ?? []),
    quizTokens: shuffleCopy(exercise.tokens ?? []),
  };
}

function sessionSize(count: GrammarQuizCount, total: number) {
  return count === 'all' ? total : Math.min(count, total);
}

function getCountOptions(total: number): GrammarQuizCount[] {
  const numeric = QUIZ_COUNTS.filter((count) => count <= total);
  return [...numeric, 'all'];
}

function getDefaultCount(total: number): GrammarQuizCount {
  return total >= 10 ? 10 : 'all';
}

function exerciseTypeLabel(exercise: GrammarExercise) {
  if (exercise.type === 'multiple_choice' && PARTICLE_ANSWERS.has(exercise.answer)) return 'Pilih Partikel';
  if (exercise.type === 'multiple_choice') return 'Pilih Jawaban';
  if (exercise.type === 'pattern_choice') return 'Pilih Pola';
  if (exercise.type === 'fill_blank') return 'Lengkapi Kalimat';
  if (exercise.type === 'conjugation') return 'Konjugasi';
  if (exercise.type === 'sentence_order') return 'Susun Kalimat';
  return 'Koreksi Kalimat';
}


function eligibleForPatternQuiz(exercise: GrammarExercise) {
  // In Quiz Pola the target Bunpō is already visible in the session header,
  // so a "Pilih Pola" question would reveal its own answer by context.
  return exercise.type !== 'pattern_choice';
}

function usesChoiceOptions(type: GrammarExerciseType) {
  return type === 'multiple_choice' || type === 'pattern_choice' || type === 'error_correction';
}

function selectBalancedChapterQuestions(
  exercises: GrammarExercise[],
  patternIds: string[],
  requestedCount: GrammarQuizCount,
) {
  const target = sessionSize(requestedCount, exercises.length);
  const groups = shuffleCopy(patternIds)
    .map((patternId) => ({
      patternId,
      pool: shuffleCopy(exercises.filter((exercise) => exercise.patternId === patternId)),
    }))
    .filter((group) => group.pool.length > 0);

  const selected: GrammarExercise[] = [];
  let round = 0;

  while (selected.length < target) {
    let added = false;
    for (const group of groups) {
      const exercise = group.pool[round];
      if (!exercise) continue;
      selected.push(exercise);
      added = true;
      if (selected.length === target) break;
    }
    if (!added) break;
    round += 1;
  }

  return shuffleCopy(selected);
}

function scrollNearest(element: HTMLElement | null) {
  if (!element) return;
  window.requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function GrammarQuizScopeSelector({ scope, onChange }: { scope: GrammarQuizScope; onChange: (scope: GrammarQuizScope) => void }) {
  return <div className="grammar-quiz-scope" role="tablist" aria-label="Jenis Quiz Grammar">
    <button
      type="button"
      role="tab"
      aria-selected={scope === 'pattern'}
      className={scope === 'pattern' ? 'active' : ''}
      onClick={() => onChange('pattern')}
    >Quiz Pola</button>
    <button
      type="button"
      role="tab"
      aria-selected={scope === 'chapter'}
      className={scope === 'chapter' ? 'active' : ''}
      onClick={() => onChange('chapter')}
    >Quiz Bab</button>
  </div>;
}

function QuizCountSelector({
  total,
  selected,
  onChange,
  ariaLabel,
}: {
  total: number;
  selected: GrammarQuizCount;
  onChange: (count: GrammarQuizCount) => void;
  ariaLabel: string;
}) {
  return <div className="grammar-quiz-count">
    <span>Jumlah soal</span>
    <div role="group" aria-label={ariaLabel}>
      {getCountOptions(total).map((count) => <button
        type="button"
        key={String(count)}
        className={selected === count ? 'active' : ''}
        aria-pressed={selected === count}
        onClick={() => onChange(count)}
      >{count === 'all' ? 'Semua' : count}</button>)}
    </div>
  </div>;
}

function ExitQuizDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const leaveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const active = document.activeElement;
      if (event.shiftKey && active === cancelRef.current) {
        event.preventDefault();
        leaveRef.current?.focus();
      } else if (!event.shiftKey && active === leaveRef.current) {
        event.preventDefault();
        cancelRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return <div className="grammar-quiz-dialog-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onCancel();
  }}>
    <section
      className="grammar-quiz-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grammar-quiz-exit-title"
      aria-describedby="grammar-quiz-exit-copy"
    >
      <h2 id="grammar-quiz-exit-title">Keluar dari Quiz?</h2>
      <p id="grammar-quiz-exit-copy">Progress Quiz sesi ini akan hilang jika Anda kembali ke Menu Quiz.</p>
      <div>
        <button ref={cancelRef} type="button" className="grammar-quiz-dialog-stay" onClick={onCancel}>Tetap Quiz</button>
        <button ref={leaveRef} type="button" className="grammar-quiz-dialog-leave" onClick={onConfirm}>Kembali ke Menu Quiz</button>
      </div>
    </section>
  </div>;
}

export function GrammarQuiz({
  recordGrammarReview,
}: {
  recordGrammarReview?: (patternId: string, rating: GrammarReviewRating) => Promise<unknown>;
}) {
  const [scope, setScope] = useState<GrammarQuizScope>('pattern');
  const [patternCounts, setPatternCounts] = useState<Record<string, GrammarQuizCount>>({});
  const [chapterCounts, setChapterCounts] = useState<Record<number, GrammarQuizCount>>({});
  const [config, setConfig] = useState<GrammarQuizConfig | null>(null);
  const [questions, setQuestions] = useState<PreparedGrammarQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<GrammarQuizAttempt[]>([]);
  const [typedDraft, setTypedDraft] = useState('');
  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [reviewMode, setReviewMode] = useState<GrammarQuizReviewMode | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [progressSaveFailures, setProgressSaveFailures] = useState(0);
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);
  const [progressPending, setProgressPending] = useState(0);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const questionCardRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const reviewCardRef = useRef<HTMLElement>(null);
  const submittedQuestionIdsRef = useRef(new Set<string>());
  const progressQueueRef = useRef<Promise<void>>(Promise.resolve());
  const progressSessionRef = useRef(0);
  const { soundEnabled, toggleSound, playCorrect, playIncorrect, playComplete } = useQuizSounds();

  const patternById = useMemo(
    () => new Map(GRAMMAR_PATTERNS.map((pattern) => [pattern.id, pattern])),
    [],
  );
  const exercisePatternIds = useMemo(() => new Set(GRAMMAR_EXERCISES.map((exercise) => exercise.patternId)), []);
  const exercisesByPattern = useMemo(() => {
    const map = new Map<string, GrammarExercise[]>();
    for (const exercise of GRAMMAR_EXERCISES) {
      const current = map.get(exercise.patternId) ?? [];
      current.push(exercise);
      map.set(exercise.patternId, current);
    }
    return map;
  }, []);
  const availablePatterns = useMemo(
    () => GRAMMAR_PATTERNS
      .filter((pattern) => (exercisesByPattern.get(pattern.id) ?? []).some(eligibleForPatternQuiz))
      .slice()
      .sort((a, b) => a.chapter - b.chapter || a.order - b.order),
    [exercisesByPattern],
  );
  const chapterSummaries = useMemo<GrammarQuizChapterSummary[]>(() => GRAMMAR_CHAPTERS
    .map((chapter) => {
      const patterns = GRAMMAR_PATTERNS
        .filter((pattern) => pattern.chapter === chapter.chapter && exercisePatternIds.has(pattern.id))
        .slice()
        .sort((a, b) => a.order - b.order);
      const exerciseCount = patterns.reduce((total, pattern) => total + (exercisesByPattern.get(pattern.id)?.length ?? 0), 0);
      if (!exerciseCount) return null;
      return {
        chapter,
        patterns,
        exerciseCount,
        jlptLevels: [...new Set(patterns.map((pattern) => pattern.jlptLevel))],
      };
    })
    .filter((summary): summary is GrammarQuizChapterSummary => Boolean(summary)),
  [exercisePatternIds, exercisesByPattern]);

  const currentQuestion = questions[currentIndex];
  const currentAttempt = currentQuestion
    ? attempts.find((attempt) => attempt.questionId === currentQuestion.id)
    : undefined;
  const score = attempts.filter((attempt) => attempt.correct).length;
  const wrongCount = attempts.length - score;

  const sessionPatterns = useMemo(() => {
    if (!config) return [];
    return config.scope === 'pattern' ? [config.pattern] : config.patterns;
  }, [config]);

  const reviewAttempts = useMemo(() => {
    const source = reviewMode === 'wrong' ? attempts.filter((attempt) => !attempt.correct) : attempts;
    return source;
  }, [attempts, reviewMode]);
  const reviewAttempt = reviewAttempts[reviewIndex];
  const reviewQuestion = reviewAttempt
    ? questions.find((question) => question.id === reviewAttempt.questionId)
    : undefined;
  const reviewPattern = reviewQuestion ? patternById.get(reviewQuestion.patternId) : undefined;

  const chapterPatternResults = useMemo(() => sessionPatterns.map((pattern) => {
    const patternQuestionIds = new Set(questions.filter((question) => question.patternId === pattern.id).map((question) => question.id));
    const patternAttempts = attempts.filter((attempt) => patternQuestionIds.has(attempt.questionId));
    return {
      pattern,
      total: patternAttempts.length,
      correct: patternAttempts.filter((attempt) => attempt.correct).length,
    };
  }).filter((item) => item.total > 0), [attempts, questions, sessionPatterns]);

  function resetSessionState() {
    setCurrentIndex(0);
    setAttempts([]);
    setTypedDraft('');
    setOrderDraft([]);
    setFinished(false);
    setReviewMode(null);
    setReviewIndex(0);
    setExitDialogOpen(false);
    setProgressSaveFailures(0);
    setProgressSaveError(null);
    setProgressPending(0);
    submittedQuestionIdsRef.current.clear();
    progressSessionRef.current += 1;
  }

  function launchQuiz(nextConfig: GrammarQuizConfig) {
    let selectedExercises: GrammarExercise[] = [];

    if (nextConfig.scope === 'pattern') {
      const candidates = (exercisesByPattern.get(nextConfig.pattern.id) ?? []).filter(eligibleForPatternQuiz);
      selectedExercises = shuffleCopy(candidates).slice(0, sessionSize(nextConfig.count, candidates.length));
    } else {
      const patternIds = nextConfig.patterns.map((pattern) => pattern.id);
      const candidates = patternIds.flatMap((patternId) => exercisesByPattern.get(patternId) ?? []);
      selectedExercises = selectBalancedChapterQuestions(candidates, patternIds, nextConfig.count);
    }

    if (!selectedExercises.length) return;

    resetSessionState();
    setConfig(nextConfig);
    setQuestions(selectedExercises.map(prepareQuestion));
    window.requestAnimationFrame(() => scrollNearest(questionCardRef.current));
  }

  function closeSessionToMenu() {
    resetSessionState();
    setConfig(null);
    setQuestions([]);
  }

  function requestExit() {
    if (attempts.length === 0) {
      closeSessionToMenu();
      return;
    }
    setExitDialogOpen(true);
  }

  function cancelExit() {
    setExitDialogOpen(false);
    window.requestAnimationFrame(() => backButtonRef.current?.focus({ preventScroll: true }));
  }

  function queueGrammarProgress(patternId: string, correct: boolean) {
    if (!recordGrammarReview) return;
    const rating: GrammarReviewRating = correct ? 2 : 0;
    const sessionGeneration = progressSessionRef.current;
    setProgressPending((current) => current + 1);
    progressQueueRef.current = progressQueueRef.current.then(async () => {
      try {
        await recordGrammarReview(patternId, rating);
      } catch (saveError) {
        if (sessionGeneration === progressSessionRef.current) {
          setProgressSaveFailures((current) => current + 1);
          setProgressSaveError(saveError instanceof Error ? saveError.message : 'Progress Grammar gagal disimpan.');
        }
      } finally {
        if (sessionGeneration === progressSessionRef.current) {
          setProgressPending((current) => Math.max(0, current - 1));
        }
      }
    });
  }

  function submitAnswer(rawAnswer: string, displayAnswer = rawAnswer) {
    if (!currentQuestion || currentAttempt || submittedQuestionIdsRef.current.has(currentQuestion.id)) return;
    submittedQuestionIdsRef.current.add(currentQuestion.id);
    const correct = answersMatch(currentQuestion, rawAnswer);
    if (correct) playCorrect();
    else playIncorrect();
    setAttempts((current) => [...current, {
      questionId: currentQuestion.id,
      userAnswer: rawAnswer,
      displayAnswer,
      correct,
    }]);
    queueGrammarProgress(currentQuestion.patternId, correct);
  }

  function submitTypedAnswer() {
    if (!typedDraft.trim()) return;
    submitAnswer(typedDraft);
  }

  function submitOrderAnswer() {
    if (!currentQuestion || orderDraft.length === 0) return;
    submitAnswer(orderDraft.join(''), orderDraft.join(' / '));
  }

  function nextQuestion() {
    if (!currentAttempt) return;
    if (currentIndex + 1 >= questions.length) {
      playComplete();
      setFinished(true);
      window.requestAnimationFrame(() => scrollNearest(resultRef.current));
      return;
    }
    setCurrentIndex((index) => index + 1);
    setTypedDraft('');
    setOrderDraft([]);
    window.requestAnimationFrame(() => scrollNearest(questionCardRef.current));
  }

  function restartQuiz() {
    if (!config) return;
    launchQuiz(config);
  }

  function openReview(mode: GrammarQuizReviewMode) {
    setReviewMode(mode);
    setReviewIndex(0);
    window.requestAnimationFrame(() => scrollNearest(reviewCardRef.current));
  }

  function closeReview() {
    setReviewMode(null);
    setReviewIndex(0);
    window.requestAnimationFrame(() => scrollNearest(resultRef.current));
  }

  if (!config) {
    return <section className="grammar-quiz-shell grammar-quiz-menu">
      <GrammarQuizScopeSelector scope={scope} onChange={setScope}/>

      {scope === 'pattern' ? <>
        <div className="grammar-quiz-intro">
          <p className="grammar-section-kicker">文法クイズ · QUIZ POLA</p>
          <h2>Pilih Bunpō untuk diuji</h2>
          <p>Quiz mengukur pemahaman tanpa Petunjuk atau Lihat Bacaan. Pembahasan lengkap tersedia setelah Quiz selesai.</p>
        </div>
        <div className="grammar-quiz-pattern-grid">
          {availablePatterns.map((pattern) => {
            const total = (exercisesByPattern.get(pattern.id) ?? []).filter(eligibleForPatternQuiz).length;
            const selectedCount = patternCounts[pattern.id] ?? getDefaultCount(total);
            return <article className="grammar-quiz-pattern-card" key={pattern.id}>
              <span className="grammar-quiz-meta">BAB {pattern.chapter} · {pattern.jlptLevel}</span>
              <h3>{pattern.pattern}</h3>
              <p>{pattern.meaning}</p>
              <strong className="grammar-quiz-available">{total} soal tersedia</strong>
              <QuizCountSelector
                total={total}
                selected={selectedCount}
                ariaLabel={`Pilih jumlah soal Quiz ${pattern.pattern}`}
                onChange={(count) => setPatternCounts((current) => ({ ...current, [pattern.id]: count }))}
              />
              <button type="button" className="grammar-quiz-start" onClick={() => launchQuiz({
                scope: 'pattern',
                pattern,
                count: selectedCount,
              })}>Mulai Quiz <ArrowRight size={16}/></button>
            </article>;
          })}
        </div>
      </> : <>
        <div className="grammar-quiz-intro">
          <p className="grammar-section-kicker">文法クイズ · QUIZ BAB</p>
          <h2>Pilih Bab untuk diuji</h2>
          <p>Quiz Bab mencampurkan soal dari Bunpō yang sudah memiliki data valid dan membaginya relatif seimbang antar-pola.</p>
        </div>
        <div className="grammar-quiz-chapter-grid">
          {chapterSummaries.map((summary) => {
            const chapterNumber = summary.chapter.chapter;
            const selectedCount = chapterCounts[chapterNumber] ?? getDefaultCount(summary.exerciseCount);
            const preview = summary.patterns.slice(0, 3);
            const hiddenCount = Math.max(summary.patterns.length - preview.length, 0);
            return <article className="grammar-quiz-chapter-card" key={chapterNumber}>
              <span className="grammar-quiz-meta">BAB {chapterNumber} · {summary.jlptLevels.join(' / ')}</span>
              <h3>{summary.chapter.title}</h3>
              <div className="grammar-quiz-pattern-preview">
                {preview.map((pattern) => <span key={pattern.id}>{pattern.pattern}</span>)}
                {hiddenCount > 0 && <small>+ {hiddenCount} pola lainnya</small>}
              </div>
              <div className="grammar-quiz-card-stats">
                <span><strong>{summary.patterns.length}</strong> Pola Tata Bahasa</span>
                <span><strong>{summary.exerciseCount}</strong> Soal tersedia</span>
              </div>
              <QuizCountSelector
                total={summary.exerciseCount}
                selected={selectedCount}
                ariaLabel={`Pilih jumlah soal Quiz Bab ${chapterNumber}`}
                onChange={(count) => setChapterCounts((current) => ({ ...current, [chapterNumber]: count }))}
              />
              <button type="button" className="grammar-quiz-start" onClick={() => launchQuiz({
                scope: 'chapter',
                chapter: summary.chapter,
                patterns: summary.patterns,
                count: selectedCount,
              })}>Mulai Quiz <ArrowRight size={16}/></button>
            </article>;
          })}
        </div>
      </>}
    </section>;
  }

  if (reviewMode) {
    if (!reviewAttempt || !reviewQuestion) {
      return <section className="grammar-quiz-result" ref={resultRef}>
        <h2>Tidak ada soal untuk direview</h2>
        <button type="button" className="grammar-quiz-secondary" onClick={closeReview}>Kembali ke Hasil Quiz</button>
      </section>;
    }

    const safeReviewIndex = Math.min(reviewIndex, reviewAttempts.length - 1);
    const answerLabel = reviewQuestion.type === 'sentence_order' ? 'Susunan kamu' : 'Jawaban kamu';

    return <section className="grammar-quiz-shell grammar-quiz-review">
      <div className="grammar-quiz-review-heading">
        <p className="grammar-section-kicker">REVIEW QUIZ GRAMMAR</p>
        <h2>{reviewMode === 'wrong' ? 'Soal yang Salah' : 'Hasil Jawaban'}</h2>
        <p>{reviewMode === 'wrong' ? `${reviewAttempts.length} soal perlu dipelajari kembali.` : `${reviewAttempts.length} soal dari session Quiz yang baru selesai.`}</p>
      </div>

      <article className="grammar-quiz-review-card" ref={reviewCardRef}>
        <div className="grammar-quiz-review-meta">
          <span>Soal {safeReviewIndex + 1}</span>
          <span>{exerciseTypeLabel(reviewQuestion)}</span>
          {reviewPattern && <span>Pola · {reviewPattern.pattern}</span>}
          {reviewPattern && <span>{reviewPattern.jlptLevel} · Bab {reviewPattern.chapter}</span>}
        </div>
        <p className="grammar-quiz-review-instruction">{reviewQuestion.instruction}</p>
        <div className="grammar-quiz-review-question">{reviewQuestion.prompt}</div>
        {reviewQuestion.context && <p className="grammar-quiz-review-context">{reviewQuestion.context}</p>}

        <div className="grammar-quiz-review-answer-grid">
          <div>
            <span>{answerLabel}</span>
            <strong className={reviewAttempt.correct ? 'correct' : 'wrong'}>{reviewAttempt.displayAnswer || '—'}</strong>
          </div>
          <div>
            <span>Jawaban benar</span>
            <strong className="correct">{reviewQuestion.answer}</strong>
          </div>
        </div>

        <div className={`grammar-quiz-review-status ${reviewAttempt.correct ? 'correct' : 'wrong'}`}>
          {reviewAttempt.correct ? <Check size={17}/> : <X size={17}/>} <strong>{reviewAttempt.correct ? 'Benar' : 'Belum tepat'}</strong>
        </div>

        <div className="grammar-quiz-review-explanation">
          <span>Penjelasan</span>
          <p>{reviewQuestion.explanation}</p>
          {reviewQuestion.transformationSteps && reviewQuestion.transformationSteps.length > 0 && <div className="grammar-quiz-transformation">
            {reviewQuestion.transformationSteps.map((step, index) => <span key={`${step}-${index}`}>
              <strong>{step}</strong>{index + 1 < reviewQuestion.transformationSteps!.length && <ChevronRight size={14}/>} 
            </span>)}
          </div>}
        </div>
      </article>

      <nav className="grammar-quiz-review-nav" aria-label="Navigasi review Quiz Grammar">
        <button type="button" disabled={safeReviewIndex === 0} onClick={() => {
          setReviewIndex((index) => Math.max(0, index - 1));
          window.requestAnimationFrame(() => scrollNearest(reviewCardRef.current));
        }}>← Sebelumnya</button>
        <strong>{safeReviewIndex + 1} / {reviewAttempts.length}</strong>
        <button type="button" disabled={safeReviewIndex + 1 >= reviewAttempts.length} onClick={() => {
          setReviewIndex((index) => Math.min(reviewAttempts.length - 1, index + 1));
          window.requestAnimationFrame(() => scrollNearest(reviewCardRef.current));
        }}>Selanjutnya →</button>
      </nav>
      <button type="button" className="grammar-quiz-review-back" onClick={closeReview}><ArrowLeft size={16}/> Kembali ke Hasil Quiz</button>
    </section>;
  }

  if (finished) {
    const total = questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;
    const wrongAttempts = attempts.filter((attempt) => !attempt.correct);

    return <section className="grammar-quiz-result" ref={resultRef}>
      <div className="grammar-quiz-result-icon"><Trophy size={28}/></div>
      <p className="grammar-section-kicker">{config.scope === 'chapter' ? 'QUIZ BAB SELESAI' : 'QUIZ SELESAI'}</p>
      {config.scope === 'pattern' ? <>
        <h2>{config.pattern.pattern}</h2>
        <p className="grammar-quiz-result-lead">{config.pattern.meaning}</p>
      </> : <>
        <h2>Bab {config.chapter.chapter}</h2>
        <p className="grammar-quiz-result-lead">{config.chapter.title}</p>
      </>}

      <div className="grammar-quiz-result-score">
        <span>Nilai</span>
        <strong>{percentage}</strong>
      </div>
      <div className="grammar-quiz-result-stats">
        <div><strong>{total}</strong><span>Total Soal</span></div>
        <div><strong>{score}</strong><span>Benar</span></div>
        <div><strong>{wrongCount}</strong><span>Salah</span></div>
      </div>

      {progressPending > 0 && <p className="grammar-quiz-progress-save-error">Menyinkronkan {progressPending} update progress Grammar…</p>}
      {progressSaveFailures > 0 && <p className="grammar-quiz-progress-save-error">
        {progressSaveFailures} update progress belum tersimpan. Hasil Quiz tetap aman.
      </p>}

      {config.scope === 'chapter' && <div className="grammar-quiz-pattern-results">
        <div className="grammar-quiz-result-section-title">HASIL PER POLA</div>
        {chapterPatternResults.map((item) => <div key={item.pattern.id}>
          <span>{item.pattern.pattern}</span>
          <strong>{item.correct} / {item.total}</strong>
        </div>)}
      </div>}

      {wrongAttempts.length > 0 && <div className="grammar-quiz-wrong-recap">
        <div>
          <Target size={18}/>
          <span><strong>Rekapan Jawaban Salah</strong><small>{wrongAttempts.length} soal perlu ditinjau kembali.</small></span>
        </div>
        <div className="grammar-quiz-wrong-chips">
          {wrongAttempts.slice(0, 8).map((attempt) => {
            const question = questions.find((item) => item.id === attempt.questionId);
            const targetPattern = question ? patternById.get(question.patternId) : undefined;
            return <span key={attempt.questionId}>{targetPattern?.pattern ?? 'Grammar'}</span>;
          })}
          {wrongAttempts.length > 8 && <span>+{wrongAttempts.length - 8}</span>}
        </div>
      </div>}

      <div className="grammar-quiz-result-actions">
        <button type="button" className="grammar-quiz-primary" onClick={() => openReview('all')}>Lihat Hasil Jawaban</button>
        {wrongAttempts.length > 0 && <button type="button" className="grammar-quiz-secondary" onClick={() => openReview('wrong')}>Lihat Soal yang Salah</button>}
        <button type="button" className="grammar-quiz-secondary" onClick={restartQuiz}><RotateCcw size={16}/> Ulangi Quiz</button>
        <button type="button" className="grammar-quiz-ghost" onClick={closeSessionToMenu}><Target size={16}/> Kembali ke Menu Quiz</button>
      </div>
    </section>;
  }

  if (!currentQuestion) {
    return <section className="grammar-quiz-result">
      <h2>Soal Quiz tidak tersedia</h2>
      <button type="button" className="grammar-quiz-secondary" onClick={closeSessionToMenu}>Kembali ke Menu Quiz</button>
    </section>;
  }

  const currentPattern = patternById.get(currentQuestion.patternId);
  const answered = Boolean(currentAttempt);
  const position = currentIndex + 1;
  const patternNameWouldRevealAnswer = currentQuestion.type === 'pattern_choice';
  const showPatternContext = config.scope === 'chapter' && (!patternNameWouldRevealAnswer || answered);

  return <section className="grammar-quiz-shell grammar-quiz-session">
    <button ref={backButtonRef} type="button" className="grammar-quiz-back" onClick={requestExit}>
      <ArrowLeft size={16}/> Kembali ke Menu Quiz
    </button>

    <header className="grammar-quiz-session-head quiz-sfx-host">
      <div>
        <p className="grammar-section-kicker">文法クイズ · {config.scope === 'chapter' ? 'QUIZ BAB' : 'QUIZ POLA'}</p>
        <h2>{config.scope === 'pattern' ? config.pattern.pattern : `Bab ${config.chapter.chapter}`}</h2>
        <p>{config.scope === 'pattern' ? config.pattern.meaning : config.chapter.title}</p>
      </div>
      <QuizSoundToggle enabled={soundEnabled} onToggle={toggleSound}/>
    </header>

    <div className="grammar-quiz-top">
      <div className="grammar-quiz-progress-copy">
        <strong>Soal {position} / {questions.length}</strong>
        <span>Benar {score} · Salah {wrongCount}</span>
      </div>
      <div className="grammar-quiz-progress" aria-hidden="true"><i style={{ width: `${questions.length ? (attempts.length / questions.length) * 100 : 0}%` }}/></div>
    </div>

    {progressSaveFailures > 0 && <div className="grammar-quiz-progress-save-error" role="status">
      Progress Grammar untuk {progressSaveFailures} jawaban belum tersimpan. Quiz tetap berjalan.
      {progressSaveError && <span title={progressSaveError}> Coba periksa koneksi atau migration SRS Grammar.</span>}
    </div>}

    <article className="grammar-quiz-question-card" ref={questionCardRef}>
      <div className="grammar-quiz-question-meta">
        <span>{exerciseTypeLabel(currentQuestion)}</span>
        {showPatternContext && currentPattern && <small>Pola · {currentPattern.pattern}</small>}
      </div>
      <p className="grammar-quiz-instruction">{currentQuestion.instruction}</p>
      <div className="grammar-quiz-question">{currentQuestion.prompt}</div>
      {currentQuestion.context && <p className="grammar-quiz-context">{currentQuestion.context}</p>}

      {currentQuestion.type === 'sentence_order' ? <div className="grammar-quiz-order">
        <div className="grammar-quiz-order-answer">
          {orderDraft.length === 0 ? <span>Tap potongan kata untuk menyusun jawaban.</span> : orderDraft.map((token, index) => <button
            type="button"
            key={`${token}-${index}`}
            disabled={answered}
            onClick={() => setOrderDraft((current) => current.filter((_, currentIndex) => currentIndex !== index))}
          >{token}</button>)}
        </div>
        <div className="grammar-quiz-order-pieces">
          {currentQuestion.quizTokens.map((token, index) => {
            const usedCount = orderDraft.filter((item) => item === token).length;
            const priorSameCount = currentQuestion.quizTokens.slice(0, index).filter((item) => item === token).length;
            const used = usedCount > priorSameCount;
            return <button
              type="button"
              key={`${token}-${index}`}
              disabled={answered || used}
              onClick={() => setOrderDraft((current) => [...current, token])}
            >{token}</button>;
          })}
        </div>
        {!answered && <div className="grammar-quiz-order-actions">
          <button type="button" className="grammar-quiz-order-reset" disabled={orderDraft.length === 0} onClick={() => setOrderDraft([])}>Reset</button>
          <button type="button" className="grammar-quiz-submit" disabled={orderDraft.length === 0} onClick={submitOrderAnswer}>Jawab</button>
        </div>}
      </div> : usesChoiceOptions(currentQuestion.type) ? <div className="grammar-quiz-options">
        {currentQuestion.quizOptions.map((option) => {
          let state = '';
          if (answered && answersMatch(currentQuestion, option)) state = 'correct';
          else if (answered && currentAttempt?.userAnswer === option) state = 'wrong';
          return <button
            type="button"
            key={option}
            className={state}
            disabled={answered}
            onClick={() => submitAnswer(option)}
          >
            <span>{option}</span>
            {state === 'correct' && <Check size={18}/>} 
            {state === 'wrong' && <X size={18}/>} 
          </button>;
        })}
      </div> : <form className="grammar-quiz-typing" onSubmit={(event) => {
        event.preventDefault();
        submitTypedAnswer();
      }}>
        <input
          type="text"
          value={typedDraft}
          disabled={answered}
          onChange={(event) => setTypedDraft(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="Ketik jawaban…"
          aria-label="Jawaban Quiz Grammar"
        />
        {!answered && <button type="submit" className="grammar-quiz-submit" disabled={!typedDraft.trim()}>Jawab</button>}
      </form>}

      {answered && currentAttempt && <div className={`grammar-quiz-feedback ${currentAttempt.correct ? 'correct' : 'wrong'}`}>
        <div>
          <strong>{currentAttempt.correct ? '✓ Benar!' : '✕ Salah'}</strong>
          {!currentAttempt.correct && <span>Jawaban benar: <b>{currentQuestion.answer}</b></span>}
          {config.scope === 'chapter' && currentPattern && <small>Pola yang diuji: {currentPattern.pattern}</small>}
        </div>
        <button type="button" onClick={nextQuestion}>{currentIndex + 1 === questions.length ? 'Lihat hasil' : 'Selanjutnya'} <ChevronRight size={17}/></button>
      </div>}
    </article>

    {exitDialogOpen && <ExitQuizDialog onCancel={cancelExit} onConfirm={closeSessionToMenu}/>} 
  </section>;
}
