import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  Headphones,
  Loader2,
  RotateCcw,
  SquareCheckBig,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import {
  buildJlptSimulation,
  type JlptSimulationLevel,
  type JlptSimulationQuestion,
  type JlptSimulationSection,
} from '../features/jlpt/jlptSimulationBank';
import './jlpt-simulation.css';

type Phase = 'setup' | 'loading' | 'exam' | 'result' | 'error';

type JlptResult = {
  level: JlptSimulationLevel;
  correct: number;
  total: number;
  completedAt: string;
  bySection: Record<JlptSimulationSection, { correct: number; total: number }>;
};

const SESSION_KEY = 'kojac-jlpt-mini-simulation-last-result';
const DURATION_SECONDS = 35 * 60;

const SECTION_LABEL: Record<JlptSimulationSection, string> = {
  language: 'Language Knowledge',
  reading: 'Reading / 読解',
  listening: 'Listening / 聴解',
};

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function percent(correct: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((100 * correct) / total);
}

function loadLastResult(): JlptResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as JlptResult;
  } catch {
    return null;
  }
}

export function JlptSimulationPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [level, setLevel] = useState<JlptSimulationLevel>('N5');
  const [questions, setQuestions] = useState<JlptSimulationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Set<string>>(() => new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(DURATION_SECONDS);
  const [audioPlays, setAudioPlays] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<JlptResult | null>(() => loadLastResult());

  const current = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  const sectionStats = useMemo(() => {
    const base: Record<JlptSimulationSection, { total: number; answered: number }> = {
      language: { total: 0, answered: 0 },
      reading: { total: 0, answered: 0 },
      listening: { total: 0, answered: 0 },
    };

    for (const question of questions) {
      base[question.section].total += 1;
      if (answers[question.id]) base[question.section].answered += 1;
    }

    return base;
  }, [answers, questions]);

  useEffect(() => {
    if (phase !== 'exam') return undefined;

    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'exam' && remainingSeconds === 0 && questions.length > 0) {
      submitExam(true);
    }
  }, [remainingSeconds, phase, questions.length]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const startSimulation = async () => {
    setPhase('loading');
    setErrorMessage('');
    setAnswers({});
    setFlags(new Set());
    setAudioPlays({});
    setCurrentIndex(0);
    setRemainingSeconds(DURATION_SECONDS);

    try {
      const bank = await buildJlptSimulation(level);
      setQuestions(bank);
      setPhase('exam');
    } catch (error) {
      console.error('JLPT simulation bank failed', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Bank simulasi belum dapat dimuat.',
      );
      setPhase('error');
    }
  };

  const chooseAnswer = (answer: string) => {
    if (!current) return;
    setAnswers((state) => ({ ...state, [current.id]: answer }));
  };

  const toggleFlag = () => {
    if (!current) return;
    setFlags((state) => {
      const next = new Set(state);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
  };

  const playListening = () => {
    if (!current?.listeningScript) return;
    const used = audioPlays[current.id] ?? 0;
    if (used >= 2) return;

    setAudioPlays((state) => ({
      ...state,
      [current.id]: used + 1,
    }));

    if (current.audioUrl) {
      const audio = new Audio(current.audioUrl);
      void audio.play();
      return;
    }

    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.listeningScript);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.92;

    const voice = window.speechSynthesis
      .getVoices()
      .find((entry) => entry.lang.toLowerCase().startsWith('ja'));
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  };

  const submitExam = (automatic = false) => {
    if (!automatic && unansweredCount > 0) {
      const ok = window.confirm(
        `Masih ada ${unansweredCount} soal belum dijawab. Tetap akhiri simulasi?`,
      );
      if (!ok) return;
    }

    const bySection: JlptResult['bySection'] = {
      language: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 },
      listening: { correct: 0, total: 0 },
    };

    let correct = 0;

    for (const question of questions) {
      bySection[question.section].total += 1;
      if (answers[question.id] === question.correctAnswer) {
        correct += 1;
        bySection[question.section].correct += 1;
      }
    }

    const nextResult: JlptResult = {
      level,
      correct,
      total: questions.length,
      completedAt: new Date().toISOString(),
      bySection,
    };

    setResult(nextResult);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextResult));
    window.speechSynthesis?.cancel();
    setPhase('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetToSetup = () => {
    window.speechSynthesis?.cancel();
    setQuestions([]);
    setAnswers({});
    setFlags(new Set());
    setAudioPlays({});
    setCurrentIndex(0);
    setRemainingSeconds(DURATION_SECONDS);
    setPhase('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (phase === 'loading') {
    return (
      <div className="page jlpt-simulation-page">
        <div className="jlpt-state-card">
          <Loader2 className="jlpt-spin" size={28}/>
          <h1>Menyiapkan Simulasi {level}</h1>
          <p>Menyusun 30 soal dari bank materi KOJAC existing.</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="page jlpt-simulation-page">
        <div className="jlpt-state-card jlpt-state-error">
          <AlertTriangle size={28}/>
          <h1>Simulasi belum dapat dimulai</h1>
          <p>{errorMessage}</p>
          <button type="button" className="primary-btn" onClick={resetToSetup}>
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="page jlpt-simulation-page">
        <div className="page-header">
          <div>
            <p className="eyebrow">KOJAC MOCK EXAM</p>
            <h1>Simulasi JLPT</h1>
            <p>
              Mini simulasi berbasis bank soal existing KOJAC. Hasil berupa raw accuracy,
              bukan skor resmi JLPT.
            </p>
          </div>
        </div>

        <section className="jlpt-setup-grid">
          {(['N5', 'N4'] as JlptSimulationLevel[]).map((entry) => (
            <button
              key={entry}
              type="button"
              className={`jlpt-level-card ${level === entry ? 'active' : ''}`}
              onClick={() => setLevel(entry)}
            >
              <span>JLPT LEVEL</span>
              <strong>{entry}</strong>
              <small>
                {entry === 'N5'
                  ? 'Fondasi kana, kosakata, kanji, grammar, reading, dan listening dasar.'
                  : 'Materi lanjutan KOJAC menuju target JLPT N4.'}
              </small>
            </button>
          ))}
        </section>

        <section className="jlpt-blueprint panel">
          <div className="jlpt-blueprint-title">
            <Trophy size={22}/>
            <div>
              <p className="eyebrow">MINI SIMULASI · PHASE 1</p>
              <h2>30 soal · 35 menit</h2>
            </div>
          </div>

          <div className="jlpt-blueprint-grid">
            <div><strong>14</strong><span>Language Knowledge</span></div>
            <div><strong>8</strong><span>Reading / 読解</span></div>
            <div><strong>8</strong><span>Listening / 聴解</span></div>
          </div>

          <ul>
            <li>Vocabulary, Kanji, dan Grammar diambil dari source existing level yang dipilih.</li>
            <li>Reading dan Listening memakai pertanyaan yang sudah memiliki jawaban serta penjelasan.</li>
            <li>Listening dapat diputar maksimal 2 kali per soal pada mini simulasi ini.</li>
            <li>Hasil tidak mengubah SRS, mastery, atau progress modul.</li>
          </ul>

          <button type="button" className="primary-btn jlpt-start-btn" onClick={() => void startSimulation()}>
            Mulai Simulasi {level}
            <ArrowRight size={17}/>
          </button>
        </section>

        {result && (
          <section className="jlpt-last-result panel">
            <div>
              <p className="eyebrow">HASIL TERAKHIR SESI INI</p>
              <h2>{result.level} · {result.correct}/{result.total}</h2>
            </div>
            <strong>{percent(result.correct, result.total)}%</strong>
          </section>
        )}
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="page jlpt-simulation-page">
        <div className="page-header jlpt-result-header">
          <div>
            <p className="eyebrow">HASIL MINI SIMULASI</p>
            <h1>JLPT {result.level}</h1>
            <p>
              Ini adalah raw accuracy latihan KOJAC, bukan scaled score atau keputusan kelulusan JLPT resmi.
            </p>
          </div>
          <button type="button" className="ghost-btn" onClick={resetToSetup}>
            <RotateCcw size={16}/> Simulasi baru
          </button>
        </div>

        <section className="jlpt-result-score panel">
          <div className="jlpt-result-main">
            <Trophy size={28}/>
            <strong>{percent(result.correct, result.total)}%</strong>
            <span>{result.correct} benar dari {result.total} soal</span>
          </div>

          <div className="jlpt-result-sections">
            {(Object.keys(result.bySection) as JlptSimulationSection[]).map((section) => {
              const row = result.bySection[section];
              return (
                <div key={section}>
                  <span>{SECTION_LABEL[section]}</span>
                  <strong>{row.correct}/{row.total}</strong>
                  <small>{percent(row.correct, row.total)}%</small>
                </div>
              );
            })}
          </div>
        </section>

        <section className="jlpt-review-section">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">REVIEW</p>
              <h2>Review Jawaban</h2>
            </div>
            <p>Periksa jawaban salah dan penjelasan dari bank soal existing.</p>
          </div>

          <div className="jlpt-review-list">
            {questions.map((question, index) => {
              const chosen = answers[question.id];
              const correct = chosen === question.correctAnswer;

              return (
                <article className={`jlpt-review-card ${correct ? 'correct' : 'wrong'}`} key={question.id}>
                  <div className="jlpt-review-heading">
                    {correct ? <CheckCircle2 size={18}/> : <XCircle size={18}/>}
                    <div>
                      <span>Soal {index + 1} · {question.category}</span>
                      <strong>{question.prompt}</strong>
                    </div>
                  </div>
                  <p><b>Jawaban Anda:</b> {chosen ?? 'Tidak dijawab'}</p>
                  {!correct && <p><b>Jawaban benar:</b> {question.correctAnswer}</p>}
                  <p className="jlpt-review-explanation">{question.explanation}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  if (!current) return null;

  const usedPlays = audioPlays[current.id] ?? 0;

  return (
    <div className="page jlpt-simulation-page">
      <header className="jlpt-exam-topbar">
        <div>
          <span>JLPT {level} · Mini Simulasi</span>
          <strong>Soal {currentIndex + 1} / {questions.length}</strong>
        </div>
        <div className={`jlpt-timer ${remainingSeconds <= 300 ? 'warning' : ''}`}>
          <Clock3 size={17}/>
          <strong>{formatTime(remainingSeconds)}</strong>
        </div>
      </header>

      <div className="jlpt-exam-layout">
        <aside className="jlpt-question-nav">
          <div className="jlpt-nav-summary">
            <span>{answeredCount} dijawab</span>
            <span>{unansweredCount} belum</span>
            <span>{flags.size} ditandai</span>
          </div>

          <div className="jlpt-number-grid">
            {questions.map((question, index) => {
              const answered = Boolean(answers[question.id]);
              const flagged = flags.has(question.id);
              return (
                <button
                  key={question.id}
                  type="button"
                  className={[
                    index === currentIndex ? 'current' : '',
                    answered ? 'answered' : '',
                    flagged ? 'flagged' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Buka soal ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="jlpt-section-progress">
            {(Object.keys(sectionStats) as JlptSimulationSection[]).map((section) => (
              <div key={section}>
                <span>{SECTION_LABEL[section]}</span>
                <strong>{sectionStats[section].answered}/{sectionStats[section].total}</strong>
              </div>
            ))}
          </div>

          <button type="button" className="danger-outline-btn jlpt-finish-btn" onClick={() => submitExam(false)}>
            <SquareCheckBig size={16}/> Akhiri Simulasi
          </button>
        </aside>

        <main className="jlpt-question-card">
          <div className="jlpt-question-meta">
            <div>
              <span>{SECTION_LABEL[current.section]}</span>
              <strong>{current.category}</strong>
            </div>
            <button
              type="button"
              className={flags.has(current.id) ? 'flagged' : ''}
              onClick={toggleFlag}
            >
              <Flag size={15}/>
              {flags.has(current.id) ? 'Ditandai' : 'Tandai'}
            </button>
          </div>

          {current.passage && (
            <div className="jlpt-reading-passage">
              <p className="eyebrow">TEKS BACAAN</p>
              <p>{current.passage}</p>
            </div>
          )}

          {current.section === 'listening' && (
            <div className="jlpt-listening-panel">
              <div>
                <Headphones size={21}/>
                <div>
                  <strong>Audio Listening</strong>
                  <span>Maksimal 2 kali · telah diputar {usedPlays}/2</span>
                </div>
              </div>
              <button
                type="button"
                onClick={playListening}
                disabled={usedPlays >= 2}
              >
                <Volume2 size={16}/>
                Putar Audio
              </button>
            </div>
          )}

          <h2 className="jlpt-question-prompt">{current.prompt}</h2>

          <div className="jlpt-option-list">
            {current.options.map((option, index) => (
              <button
                type="button"
                key={`${current.id}-${option}`}
                className={answers[current.id] === option ? 'selected' : ''}
                onClick={() => chooseAnswer(option)}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                <strong>{option}</strong>
              </button>
            ))}
          </div>

          <div className="jlpt-question-actions">
            <button
              type="button"
              className="ghost-btn"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            >
              <ArrowLeft size={16}/> Sebelumnya
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}
              >
                Berikutnya <ArrowRight size={16}/>
              </button>
            ) : (
              <button type="button" className="primary-btn" onClick={() => submitExam(false)}>
                Selesai <SquareCheckBig size={16}/>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
