import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { RecordingPlaybackSource } from './playbackSource';

type RecordingVideoPlayerProps = {
  source: RecordingPlaybackSource;
  title: string;
};

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;

function formatMediaTime(value: number, forceHours = false) {
  if (!Number.isFinite(value) || value < 0) return forceHours ? '00:00:00' : '00:00';

  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (forceHours || hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
    || target.tagName === 'BUTTON';
}

export function RecordingVideoPlayer({ source, title }: RecordingVideoPlayerProps) {
const playerRef = useRef<HTMLDivElement>(null);
const videoRef = useRef<HTMLVideoElement>(null);
const controlsRef = useRef<HTMLDivElement>(null);
const playbackIntentRef = useRef(0);
const desiredPlayingRef = useRef(false);
const controlsHideTimerRef = useRef<number | null>(null);
const controlsVisibleRef = useRef(true);
const controlsPointerOverRef = useRef(false);
const controlsFocusWithinRef = useRef(false);
const controlsDraggingRef = useRef(false);
const revealOnlyPointerRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const metadataReady = Number.isFinite(duration) && duration > 0;
  const forceHours = duration >= 3600;

  const syncDuration = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextDuration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : 0;
    setDuration(nextDuration);
    setCurrentTime(Number.isFinite(video.currentTime) ? video.currentTime : 0);
  }, []);

const requestPlay = useCallback(async () => {
  const video = videoRef.current;
  if (!video || hasError) return;

  desiredPlayingRef.current = true;
  const intent = ++playbackIntentRef.current;

  try {
    await video.play();
  } catch (error) {
    const isExpectedCancellation =
      error instanceof DOMException
      && error.name === 'AbortError'
      && playbackIntentRef.current !== intent;

    if (isExpectedCancellation) {
      return;
    }

    desiredPlayingRef.current = false;
    console.error('KOJAC video playback failed', error);
    setHasError(true);
    setIsLoading(false);
  }
}, [hasError]);

const requestPause = useCallback(() => {
  const video = videoRef.current;
  if (!video) return;

  desiredPlayingRef.current = false;
  playbackIntentRef.current += 1;
  video.pause();
}, []);

const togglePlay = useCallback(() => {
  const video = videoRef.current;
  if (!video || hasError) return;

  if (desiredPlayingRef.current || !video.paused) {
    requestPause();
    return;
  }

  void requestPlay();
}, [hasError, requestPause, requestPlay]);

  const skipBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const nextTime = Math.min(video.duration, Math.max(0, video.currentTime + seconds));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.muted) {
      video.muted = false;
      if (video.volume === 0) video.volume = 1;
      return;
    }

    if (video.volume === 0) {
      video.volume = 1;
      video.muted = false;
      return;
    }

    video.muted = true;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (document.fullscreenElement === player) {
        await document.exitFullscreen();
      } else {
        if (document.fullscreenElement) await document.exitFullscreen();
        await player.requestFullscreen();
      }
    } catch (error) {
      console.error('KOJAC video fullscreen failed', error);
    }
  }, []);

const retryPlayback = useCallback(() => {
  const video = videoRef.current;
  if (!video) return;

  desiredPlayingRef.current = false;
  playbackIntentRef.current += 1;

  setHasError(false);
  setIsLoading(true);
  setHasStarted(false);
  setIsPlaying(false);
  setCurrentTime(0);

  video.load();
}, []);

  const clearControlsHideTimer = useCallback(() => {
    if (controlsHideTimerRef.current !== null) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  }, []);

  const setControlsVisibility = useCallback((visible: boolean) => {
    controlsVisibleRef.current = visible;
    setControlsVisible(visible);
  }, []);

  const controlsInteractionActive = useCallback(() => (
    controlsPointerOverRef.current
    || controlsFocusWithinRef.current
    || controlsDraggingRef.current
  ), []);

  const releaseNonKeyboardControlFocus = useCallback(() => {
    const controls = controlsRef.current;
    const activeElement = document.activeElement;

    if (
      !controls
      || !(activeElement instanceof HTMLElement)
      || !controls.contains(activeElement)
    ) {
      return;
    }

    const isKeyboardFocus = activeElement.matches(':focus-visible');
    const isOpenableSelect = activeElement.tagName === 'SELECT';

    if (!isKeyboardFocus && !isOpenableSelect) {
      activeElement.blur();
    }
  }, []);

  const scheduleControlsHide = useCallback(() => {
    clearControlsHideTimer();

    if (
      !isPlaying
      || !hasStarted
      || hasError
      || isLoading
      || controlsInteractionActive()
    ) {
      setControlsVisibility(true);
      return;
    }

    controlsHideTimerRef.current = window.setTimeout(() => {
      controlsHideTimerRef.current = null;

      if (
        desiredPlayingRef.current
        && !hasError
        && !isLoading
        && !controlsInteractionActive()
      ) {
        releaseNonKeyboardControlFocus();
        setControlsVisibility(false);
      }
    }, 2800);
  }, [
    clearControlsHideTimer,
    controlsInteractionActive,
    hasError,
    hasStarted,
    isLoading,
    isPlaying,
    releaseNonKeyboardControlFocus,
    setControlsVisibility,
  ]);

  const revealControls = useCallback(() => {
    setControlsVisibility(true);
    scheduleControlsHide();
  }, [scheduleControlsHide, setControlsVisibility]);

  const beginRangeInteraction = useCallback((event: React.PointerEvent<HTMLInputElement>) => {
    controlsDraggingRef.current = true;
    clearControlsHideTimer();
    setControlsVisibility(true);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional; interaction remains safe without it.
    }
  }, [clearControlsHideTimer, setControlsVisibility]);

  const endRangeInteraction = useCallback((event: React.PointerEvent<HTMLInputElement>) => {
    controlsDraggingRef.current = false;

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer capture may already have been released by the browser.
    }

    scheduleControlsHide();
  }, [scheduleControlsHide]);

useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  desiredPlayingRef.current = false;
  playbackIntentRef.current += 1;
  clearControlsHideTimer();
  controlsPointerOverRef.current = false;
  controlsFocusWithinRef.current = false;
  controlsDraggingRef.current = false;
  revealOnlyPointerRef.current = false;
  setControlsVisibility(true);

  setIsPlaying(false);
  setHasStarted(false);
  setIsLoading(true);
  setHasError(false);
  setCurrentTime(0);
  setDuration(0);
  setPlaybackRate(1);
  setMuted(false);
  setVolume(1);

  video.playbackRate = 1;
  video.muted = false;
  video.volume = 1;
  video.load();

  return () => {
    clearControlsHideTimer();
    desiredPlayingRef.current = false;
    playbackIntentRef.current += 1;
    video.pause();
  };
}, [clearControlsHideTimer, setControlsVisibility, source.url]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    clearControlsHideTimer();

    if (!isPlaying || !hasStarted || hasError || isLoading) {
      setControlsVisibility(true);
      return;
    }

    setControlsVisibility(true);
    scheduleControlsHide();

    return clearControlsHideTimer;
  }, [
    clearControlsHideTimer,
    hasError,
    hasStarted,
    isLoading,
    isPlaying,
    scheduleControlsHide,
    setControlsVisibility,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      switch (event.key.toLowerCase()) {
        case ' ':
        case 'k':
          event.preventDefault();
          revealControls();
          void togglePlay();
          break;
        case 'arrowleft':
          event.preventDefault();
          revealControls();
          skipBy(-10);
          break;
        case 'arrowright':
          event.preventDefault();
          revealControls();
          skipBy(10);
          break;
        case 'm':
          event.preventDefault();
          revealControls();
          toggleMute();
          break;
        case 'f':
          event.preventDefault();
          revealControls();
          void toggleFullscreen();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [revealControls, skipBy, toggleFullscreen, toggleMute, togglePlay]);

  const currentDisplay = formatMediaTime(currentTime, forceHours);
  const durationDisplay = formatMediaTime(duration, forceHours);

  return (
    <div
      ref={playerRef}
      className={`class-recording-custom-player ${isFullscreen ? 'is-player-fullscreen' : ''}`}
      role="group"
      aria-label={`Pemutar video ${title}`}
      onPointerMove={() => revealControls()}
    >
      <video
        ref={videoRef}
        src={source.url}
        controls={false}
        playsInline
        preload="metadata"
        aria-label={title}
        onPointerDown={() => {
          revealOnlyPointerRef.current = Boolean(
            desiredPlayingRef.current && !controlsVisibleRef.current,
          );
          revealControls();
        }}
        onClick={() => {
          if (revealOnlyPointerRef.current) {
            revealOnlyPointerRef.current = false;
            return;
          }

          revealControls();
          void togglePlay();
        }}
        onLoadStart={() => {
          setIsLoading(true);
          setHasError(false);
        }}
        onLoadedMetadata={() => {
          syncDuration();
          setIsLoading(false);
        }}
        onDurationChange={syncDuration}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
onPlay={() => {
  desiredPlayingRef.current = true;
  setIsPlaying(true);
  setHasStarted(true);
  setHasError(false);
}}
        onPause={() => {
          desiredPlayingRef.current = false;
          setIsPlaying(false);
        }}
        onPlaying={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onSeeking={() => setIsLoading(true)}
        onSeeked={() => setIsLoading(false)}
onEnded={() => {
  desiredPlayingRef.current = false;
  setIsPlaying(false);
  setCurrentTime(videoRef.current?.duration || duration);
}}
        onVolumeChange={(event) => {
          setMuted(event.currentTarget.muted);
          setVolume(event.currentTarget.volume);
        }}
        onRateChange={(event) => setPlaybackRate(event.currentTarget.playbackRate)}
        onError={() => {
          setIsPlaying(false);
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {isLoading && !hasError && (
        <div className="class-recording-player-loading" role="status" aria-label="Video sedang dimuat">
          <LoaderCircle size={30} aria-hidden="true"/>
        </div>
      )}

      {!hasStarted && !isLoading && !hasError && (
        <button
          type="button"
          className="class-recording-player-center-play"
          aria-label="Putar video"
          title="Putar"
          onClick={() => {
            revealControls();
            void togglePlay();
          }}
        >
          <Play size={34} fill="currentColor" aria-hidden="true"/>
        </button>
      )}

      {hasError && (
        <div className="class-recording-player-error" role="alert">
          <strong>Video tidak dapat diputar.</strong>
          <button type="button" onClick={retryPlayback}>Coba lagi</button>
        </div>
      )}

      <div
        ref={controlsRef}
        className={`class-recording-player-controls ${controlsVisible ? '' : 'is-hidden'}`}
        role="group"
        aria-label="Kontrol video"
        onPointerEnter={() => {
          controlsPointerOverRef.current = true;
          clearControlsHideTimer();
          setControlsVisibility(true);
        }}
        onPointerLeave={() => {
          controlsPointerOverRef.current = false;
          scheduleControlsHide();
        }}
        onFocusCapture={(event) => {
          const target = event.target;
          controlsFocusWithinRef.current = target instanceof HTMLElement
            && (target.matches(':focus-visible') || target.tagName === 'SELECT');

          clearControlsHideTimer();
          setControlsVisibility(true);
        }}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget;
          if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;

          controlsFocusWithinRef.current = false;
          scheduleControlsHide();
        }}
      >
        <div className="class-recording-player-timeline-row">
          <span className="class-recording-player-time" aria-label={`Waktu saat ini ${currentDisplay}`}>
            {currentDisplay}
          </span>
          <input
            className="class-recording-player-timeline"
            type="range"
            min={0}
            max={metadataReady ? duration : 1}
            step={0.1}
            value={metadataReady ? Math.min(currentTime, duration) : 0}
            disabled={!metadataReady || hasError}
            aria-label="Posisi video"
            aria-valuemin={0}
            aria-valuemax={metadataReady ? duration : 0}
            aria-valuenow={metadataReady ? Math.min(currentTime, duration) : 0}
            aria-valuetext={`${currentDisplay} dari ${durationDisplay}`}
            onPointerDown={beginRangeInteraction}
            onPointerUp={endRangeInteraction}
            onPointerCancel={endRangeInteraction}
            onChange={(event) => {
              revealControls();
              const video = videoRef.current;
              if (!video || !metadataReady) return;
              const nextTime = Number(event.currentTarget.value);
              if (!Number.isFinite(nextTime)) return;
              video.currentTime = nextTime;
              setCurrentTime(nextTime);
            }}
          />
          <span className="class-recording-player-time" aria-label={`Durasi ${durationDisplay}`}>
            {durationDisplay}
          </span>
        </div>

        <div className="class-recording-player-actions-row">
          <div className="class-recording-player-actions-group">
            <button
              type="button"
              className="class-recording-player-control"
              aria-label={isPlaying ? 'Jeda video' : 'Putar video'}
              title={isPlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
              onClick={() => void togglePlay()}
              disabled={hasError}
            >
              {isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}
            </button>

            <button
              type="button"
              className="class-recording-player-control is-skip"
              aria-label="Mundur 10 detik"
              title="Mundur 10 detik (←)"
              onClick={() => skipBy(-10)}
              disabled={!metadataReady || hasError}
            >
              <RotateCcw size={20}/><small>10</small>
            </button>

            <button
              type="button"
              className="class-recording-player-control is-skip"
              aria-label="Maju 10 detik"
              title="Maju 10 detik (→)"
              onClick={() => skipBy(10)}
              disabled={!metadataReady || hasError}
            >
              <RotateCw size={20}/><small>10</small>
            </button>
          </div>

          <div className="class-recording-player-actions-group is-right">
            <button
              type="button"
              className="class-recording-player-control"
              aria-label={muted || volume === 0 ? 'Aktifkan suara' : 'Bisukan suara'}
              title={muted || volume === 0 ? 'Aktifkan suara (M)' : 'Bisukan suara (M)'}
              onClick={toggleMute}
              disabled={hasError}
            >
              {muted || volume === 0 ? <VolumeX size={20}/> : <Volume2 size={20}/>} 
            </button>

            <input
              className="class-recording-player-volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              disabled={hasError}
              aria-label="Volume"
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={volume}
              onPointerDown={beginRangeInteraction}
              onPointerUp={endRangeInteraction}
              onPointerCancel={endRangeInteraction}
              onChange={(event) => {
                revealControls();
                const video = videoRef.current;
                if (!video) return;
                const nextVolume = Number(event.currentTarget.value);
                if (!Number.isFinite(nextVolume)) return;
                video.volume = Math.min(1, Math.max(0, nextVolume));
                if (video.volume > 0 && video.muted) video.muted = false;
              }}
            />

            <select
              className="class-recording-player-speed"
              aria-label="Kecepatan pemutaran"
              title="Kecepatan pemutaran"
              value={playbackRate}
              disabled={hasError}
              onChange={(event) => {
                revealControls();
                const video = videoRef.current;
                if (!video) return;
                const nextRate = Number(event.currentTarget.value);
                if (!SPEED_OPTIONS.includes(nextRate as (typeof SPEED_OPTIONS)[number])) return;
                video.playbackRate = nextRate;
              }}
            >
              {SPEED_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>{rate}×</option>
              ))}
            </select>

            <button
              type="button"
              className="class-recording-player-control"
              aria-label={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
              title={isFullscreen ? 'Keluar Fullscreen (F)' : 'Fullscreen (F)'}
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

