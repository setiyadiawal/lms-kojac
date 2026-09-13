import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getListeningTurnText, type ListeningSpeakerTurn } from './listeningData';

export type ListeningPlaybackStatus = 'idle' | 'playing' | 'paused' | 'unsupported';
export type ListeningSpeed = 0.75 | 1 | 1.25;

function japaneseVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [] as SpeechSynthesisVoice[];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('ja'));
}

function speakerVoiceIndex(speaker: string, voiceCount: number) {
  if (voiceCount <= 1) return 0;
  let hash = 0;
  for (let index = 0; index < speaker.length; index += 1) hash = ((hash << 5) - hash + speaker.charCodeAt(index)) | 0;
  return Math.abs(hash) % Math.min(voiceCount, 3);
}

export function useListeningSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => japaneseVoices());
  const [status, setStatus] = useState<ListeningPlaybackStatus>(supported ? 'idle' : 'unsupported');
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<ListeningSpeed>(1);
  const playbackTokenRef = useRef(0);
  const turnsRef = useRef<ListeningSpeakerTurn[]>([]);
  const speedRef = useRef<ListeningSpeed>(1);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const refresh = () => setVoices(japaneseVoices());
    refresh();
    synth.addEventListener?.('voiceschanged', refresh);
    return () => {
      playbackTokenRef.current += 1;
      synth.cancel();
      synth.removeEventListener?.('voiceschanged', refresh);
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    playbackTokenRef.current += 1;
    window.speechSynthesis.cancel();
    setStatus('idle');
    setError(null);
  }, [supported]);

  const play = useCallback((turns: ListeningSpeakerTurn[], speedOverride?: ListeningSpeed) => {
    if (!supported) {
      setStatus('unsupported');
      setError('Browser ini belum mendukung text-to-speech.');
      return false;
    }

    const cleanTurns = turns.filter((turn) => getListeningTurnText(turn).trim().length > 0);
    if (!cleanTurns.length) {
      setError('Script Listening kosong.');
      return false;
    }

    const synth = window.speechSynthesis;
    synth.cancel();
    playbackTokenRef.current += 1;
    const token = playbackTokenRef.current;
    turnsRef.current = cleanTurns;
    setError(null);
    setStatus('playing');

    const availableVoices = japaneseVoices();
    if (availableVoices.length) setVoices(availableVoices);
    const activeRate = speedOverride ?? speedRef.current;

    const speakTurn = (index: number) => {
      if (token !== playbackTokenRef.current) return;
      if (index >= cleanTurns.length) {
        setStatus('idle');
        return;
      }

      const turn = cleanTurns[index];
      const utterance = new SpeechSynthesisUtterance(getListeningTurnText(turn));
      utterance.lang = 'ja-JP';
      utterance.rate = activeRate;
      utterance.pitch = 1;
      if (availableVoices.length) utterance.voice = availableVoices[speakerVoiceIndex(turn.speaker, availableVoices.length)];
      utterance.onend = () => speakTurn(index + 1);
      utterance.onerror = (event) => {
        if (token !== playbackTokenRef.current || event.error === 'canceled' || event.error === 'interrupted') return;
        setError('Audio Jepang gagal diputar. Coba gunakan browser yang memiliki voice ja-JP.');
        setStatus('idle');
      };
      synth.speak(utterance);
    };

    speakTurn(0);
    return true;
  }, [supported]);

  const togglePause = useCallback(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (status === 'playing') {
      synth.pause();
      setStatus('paused');
      return;
    }
    if (status === 'paused') {
      synth.resume();
      setStatus('playing');
    }
  }, [status, supported]);

  const changeSpeed = useCallback((nextSpeed: ListeningSpeed) => {
    setSpeed(nextSpeed);
    speedRef.current = nextSpeed;
    if (status === 'playing' || status === 'paused') {
      const currentTurns = turnsRef.current;
      stop();
      if (currentTurns.length) requestAnimationFrame(() => play(currentTurns, nextSpeed));
    }
  }, [play, status, stop]);

  const voiceSummary = useMemo(() => {
    if (!supported) return 'TTS tidak didukung';
    if (voices.length >= 2) return `${voices.length} voice Jepang · multi-speaker aktif`;
    if (voices.length === 1) return '1 voice Jepang · fallback single-speaker';
    return 'Voice ja-JP belum terdeteksi · browser akan mencoba fallback ja-JP';
  }, [supported, voices.length]);

  return {
    supported,
    status,
    error,
    speed,
    voiceCount: voices.length,
    voiceSummary,
    play,
    togglePause,
    stop,
    changeSpeed,
  };
}
