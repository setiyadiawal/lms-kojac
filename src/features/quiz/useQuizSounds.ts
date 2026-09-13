import { useCallback, useEffect, useState } from 'react';

type QuizSoundName = 'correct' | 'incorrect' | 'complete';

const QUIZ_SOUND_STORAGE_KEY = 'kojacQuizSoundEnabled';
const QUIZ_SOUND_CHANGE_EVENT = 'kojac:quiz-sound-change';

const SOUND_CONFIG: Record<QuizSoundName, { src: string; volume: number }> = {
  correct: { src: '/assets/sounds/quiz-correct.wav', volume: 0.42 },
  incorrect: { src: '/assets/sounds/quiz-wrong.wav', volume: 0.36 },
  complete: { src: '/assets/sounds/quiz-complete.wav', volume: 0.48 },
};

function readQuizSoundEnabled() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(QUIZ_SOUND_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function persistQuizSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUIZ_SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Sound preference is non-critical. Keep the in-memory state if storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<boolean>(QUIZ_SOUND_CHANGE_EVENT, { detail: enabled }));
}

class QuizSoundManager {
  private audio = new Map<QuizSoundName, HTMLAudioElement>();

  preload() {
    if (typeof Audio === 'undefined') return;
    (Object.keys(SOUND_CONFIG) as QuizSoundName[]).forEach((name) => {
      this.getAudio(name);
    });
  }

  stopAll() {
    this.audio.forEach((audio) => {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Some browsers can reject currentTime changes before metadata is ready.
      }
    });
  }

  play(name: QuizSoundName) {
    if (!readQuizSoundEnabled()) return;
    const audio = this.getAudio(name);
    if (!audio) return;

    // Feedback sounds must never stack. A fast next action restarts cleanly instead.
    this.stopAll();
    audio.volume = SOUND_CONFIG[name].volume;
    try {
      audio.currentTime = 0;
    } catch {
      // Safe fallback: play from the browser's current position if reset is unavailable.
    }
    void audio.play().catch(() => {
      // Browser media policy / unsupported playback must never interrupt the quiz.
    });
  }

  private getAudio(name: QuizSoundName) {
    if (typeof Audio === 'undefined') return null;
    const existing = this.audio.get(name);
    if (existing) return existing;

    const next = new Audio(SOUND_CONFIG[name].src);
    next.preload = 'auto';
    next.volume = SOUND_CONFIG[name].volume;
    this.audio.set(name, next);
    next.load();
    return next;
  }
}

const quizSoundManager = new QuizSoundManager();

export function useQuizSounds() {
  const [soundEnabled, setSoundEnabledState] = useState(readQuizSoundEnabled);

  useEffect(() => {
    quizSoundManager.preload();

    function handlePreferenceChange(event: Event) {
      const customEvent = event as CustomEvent<boolean>;
      setSoundEnabledState(typeof customEvent.detail === 'boolean' ? customEvent.detail : readQuizSoundEnabled());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== QUIZ_SOUND_STORAGE_KEY) return;
      setSoundEnabledState(readQuizSoundEnabled());
    }

    window.addEventListener(QUIZ_SOUND_CHANGE_EVENT, handlePreferenceChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(QUIZ_SOUND_CHANGE_EVENT, handlePreferenceChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (!enabled) quizSoundManager.stopAll();
    persistQuizSoundEnabled(enabled);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!soundEnabled);
  }, [setSoundEnabled, soundEnabled]);

  const playCorrect = useCallback(() => quizSoundManager.play('correct'), []);
  const playIncorrect = useCallback(() => quizSoundManager.play('incorrect'), []);
  const playComplete = useCallback(() => quizSoundManager.play('complete'), []);

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    playCorrect,
    playIncorrect,
    playComplete,
  };
}
