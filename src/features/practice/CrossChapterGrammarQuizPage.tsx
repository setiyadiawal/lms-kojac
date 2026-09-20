import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GrammarQuiz } from '../grammar/GrammarQuiz';
import { useGrammarProgress } from '../grammar/useGrammarProgress';
import './cross-chapter-quiz-page.css';

const MAX_CHAPTER = 35;

function routeChapter(value: string | null, fallback: number) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return fallback;
  return Math.max(1, Math.min(MAX_CHAPTER, numeric));
}

export function CrossChapterGrammarQuizPage() {
  const navigate = useNavigate();
  const grammarProgress = useGrammarProgress();
  const [searchParams] = useSearchParams();

  const startChapter = routeChapter(searchParams.get('start'), 1);
  const rawEnd = routeChapter(searchParams.get('end'), startChapter);
  const endChapter = Math.max(startChapter, rawEnd);

  return (
    <div className="cross-reuse-page">
      <div className="cross-route-toolbar">
        <button
          type="button"
          className="cross-reuse-back"
          onClick={() => navigate('/latihan')}
        >
          <ArrowLeft size={17}/> Kembali ke Latihan
        </button>

        <div className="cross-route-context">
          <span>LATIHAN LINTAS BAB · TATA BAHASA</span>
          <strong>Bab {startChapter}–{endChapter}</strong>
        </div>
      </div>

      {grammarProgress.loading ? (
        <div className="cross-reuse-state" role="status">
          <strong>Menyiapkan progress Tata Bahasa…</strong>
          <span>Quiz akan menggunakan sistem mastery/SRS yang sama dengan menu Belajar.</span>
        </div>
      ) : (
        <GrammarQuiz
          chapterRange={{ start: startChapter, end: endChapter }}
          recordGrammarReview={grammarProgress.recordReview}
        />
      )}

      {grammarProgress.error && !grammarProgress.loading && (
        <div className="cross-reuse-state error" role="status">
          <strong>Perhatian progress Grammar</strong>
          <span>{grammarProgress.error}</span>
        </div>
      )}

      <p className="cross-reuse-safety">
        Jawaban Quiz Lintas Bab memperbarui mastery, SRS, due date, akurasi,
        dan progress Tata Bahasa melalui sistem review yang sama dengan Quiz di menu Belajar.
      </p>
    </div>
  );
}
