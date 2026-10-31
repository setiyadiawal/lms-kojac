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
  private preloadAudio = new Map<QuizSoundName, HTMLAudioElement>();
  private activeAudio: HTMLAudioElement | null = null;

  preload() {
    if (typeof Audio === 'undefined') return;

    (Object.keys(SOUND_CONFIG) as QuizSoundName[]).forEach((name) => {
      if (this.preloadAudio.has(name)) return;

      const audio = new Audio(SOUND_CONFIG[name].src);
      audio.preload = 'auto';
      audio.volume = SOUND_CONFIG[name].volume;

      this.preloadAudio.set(name, audio);
      audio.load();
    });
  }

  stopAll() {
    const active = this.activeAudio;
    this.activeAudio = null;
    active?.pause();
  }

  play(name: QuizSoundName) {
    if (!readQuizSoundEnabled() || typeof Audio === 'undefined') return;

    // Fresh element avoids stale Android playback state and currentTime races.
    this.stopAll();

    const config = SOUND_CONFIG[name];
    const audio = new Audio(config.src);

    audio.preload = 'auto';
    audio.volume = config.volume;

    this.activeAudio = audio;

    const release = () => {
      if (this.activeAudio === audio) {
        this.activeAudio = null;
      }

      audio.removeEventListener('ended', release);
      audio.removeEventListener('error', release);
    };

    audio.addEventListener('ended', release);
    audio.addEventListener('error', release);

    try {
      void audio.play().catch((error: unknown) => {
        const wasActive = this.activeAudio === audio;
        release();

        const errorName = error instanceof Error ? error.name : '';

        if (!wasActive && errorName === 'AbortError') return;

        console.warn('[KOJAC Quiz Audio] play() rejected', {
          sound: name,
          error: error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error),
        });
      });
    } catch (error) {
      release();

      console.warn('[KOJAC Quiz Audio] play() failed', {
        sound: name,
        error: error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
      });
    }
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
