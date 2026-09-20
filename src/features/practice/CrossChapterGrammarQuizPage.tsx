import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GrammarQuiz } from '../grammar/GrammarQuiz';
import './cross-chapter-quiz-page.css';

const MAX_CHAPTER = 35;

function routeChapter(value: string | null, fallback: number) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return fallback;
  return Math.max(1, Math.min(MAX_CHAPTER, numeric));
}

export function CrossChapterGrammarQuizPage() {
  const navigate = useNavigate();
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

      <GrammarQuiz
        chapterRange={{ start: startChapter, end: endChapter }}
      />

      <p className="cross-reuse-safety">
        Sesi lintas bab tidak mengubah SRS, mastery, due date, atau progress formal.
      </p>
    </div>
  );
}
