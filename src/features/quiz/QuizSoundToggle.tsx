import { Volume2, VolumeX } from 'lucide-react';
import './quiz-sounds.css';

export function QuizSoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const label = enabled ? 'Matikan sound effect Quiz' : 'Aktifkan sound effect Quiz';

  return <button
    type="button"
    className={`quiz-sfx-toggle ${enabled ? 'is-on' : 'is-off'}`}
    onClick={onToggle}
    aria-label={label}
    aria-pressed={enabled}
    title={label}
  >
    {enabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
    <span className="quiz-sfx-sr-only">{enabled ? 'Sound effect aktif' : 'Sound effect nonaktif'}</span>
  </button>;
}
