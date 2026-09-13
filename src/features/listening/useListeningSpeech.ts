import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getListeningTurnText, type ListeningSegment, type ListeningSpeakerTurn } from './listeningData';

export type ListeningPlaybackStatus = 'idle' | 'playing' | 'paused' | 'unsupported';
export type ListeningSpeed = 0.75 | 1 | 1.25;

const JAPANESE_LOCALE = 'ja-JP';
const SPEAKER_CHANGE_GAP_MS = 140;
const KANJI_PATTERN = /\p{Script=Han}/u;

function voiceLocaleRank(voice: SpeechSynthesisVoice) {
  const lang = voice.lang.toLowerCase();
  if (lang === 'ja-jp') return 0;
  if (lang.startsWith('ja-')) return 1;
  return 2;
}

function stableVoiceKey(voice: SpeechSynthesisVoice) {
  return [voice.voiceURI || '', voice.name || '', voice.lang || ''].join('\u0000').toLowerCase();
}

function japaneseVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [] as SpeechSynthesisVoice[];
  return window.speechSynthesis.getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith('ja'))
    .sort((left, right) => voiceLocaleRank(left) - voiceLocaleRank(right) || stableVoiceKey(left).localeCompare(stableVoiceKey(right)));
}

function edgePunctuation(text: string, reading: string) {
  const leading = text.match(/^[\s\p{P}\p{S}]+/u)?.[0] ?? '';
  const trailing = text.match(/[\s\p{P}\p{S}]+$/u)?.[0] ?? '';
  return `${leading}${reading}${trailing}`;
}

function getListeningSegmentSpeechText(segment: ListeningSegment) {
  const reading = segment.reading?.trim();
  if (!reading || !KANJI_PATTERN.test(segment.text)) return segment.text;
  return edgePunctuation(segment.text, reading);
}

function getListeningTurnSpeechText(turn: ListeningSpeakerTurn) {
  return turn.segments.map(getListeningSegmentSpeechText).join('');
}

function uniqueSpeakers(turns: ListeningSpeakerTurn[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  turns.forEach((turn) => {
    if (seen.has(turn.speaker)) return;
    seen.add(turn.speaker);
    result.push(turn.speaker);
  });
  return result;
}

function singleVoiceProsody(speakerIndex: number, baseRate: number) {
  if (speakerIndex % 3 === 1) return { rate: baseRate * 1.02, pitch: 0.97 };
  if (speakerIndex % 3 === 2) return { rate: baseRate * 0.98, pitch: 1.03 };
  return { rate: baseRate, pitch: 1 };
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
  const pausedRef = useRef(false);
  const turnTimerRef = useRef<number | null>(null);
  const pendingTurnStartRef = useRef<(() => void) | null>(null);

  const clearTurnTimer = useCallback(() => {
    if (turnTimerRef.current === null) return;
    window.clearTimeout(turnTimerRef.current);
    turnTimerRef.current = null;
  }, []);

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
      pausedRef.current = false;
      pendingTurnStartRef.current = null;
      clearTurnTimer();
      synth.cancel();
      synth.removeEventListener?.('voiceschanged', refresh);
    };
  }, [clearTurnTimer, supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    playbackTokenRef.current += 1;
    pausedRef.current = false;
    pendingTurnStartRef.current = null;
    clearTurnTimer();
    window.speechSynthesis.cancel();
    setStatus('idle');
    setError(null);
  }, [clearTurnTimer, supported]);

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
    clearTurnTimer();
    pendingTurnStartRef.current = null;
    pausedRef.current = false;
    synth.cancel();
    playbackTokenRef.current += 1;
    const token = playbackTokenRef.current;
    turnsRef.current = cleanTurns;
    setError(null);
    setStatus('playing');

    const availableVoices = japaneseVoices();
    setVoices(availableVoices);
    const activeRate = speedOverride ?? speedRef.current;
    const speakerOrder = uniqueSpeakers(cleanTurns);
    const speakerIndex = new Map(speakerOrder.map((speaker, index) => [speaker, index]));
    const speakerVoices = new Map<string, SpeechSynthesisVoice>();
    if (availableVoices.length) {
      speakerOrder.forEach((speaker, index) => {
        speakerVoices.set(speaker, availableVoices[index % availableVoices.length]);
      });
    }

    const speakTurn = (index: number) => {
      if (token !== playbackTokenRef.current) return;
      if (index >= cleanTurns.length) {
        setStatus('idle');
        return;
      }

      const turn = cleanTurns[index];
      const currentSpeakerIndex = speakerIndex.get(turn.speaker) ?? 0;
      const utterance = new SpeechSynthesisUtterance(getListeningTurnSpeechText(turn));
      utterance.lang = JAPANESE_LOCALE;
      utterance.rate = activeRate;
      utterance.pitch = 1;

      const assignedVoice = speakerVoices.get(turn.speaker);
      if (assignedVoice) utterance.voice = assignedVoice;

      if (availableVoices.length === 1 && speakerOrder.length > 1) {
        const prosody = singleVoiceProsody(currentSpeakerIndex, activeRate);
        utterance.rate = prosody.rate;
        utterance.pitch = prosody.pitch;
      }

      utterance.onend = () => {
        if (token !== playbackTokenRef.current) return;
        const nextIndex = index + 1;
        if (nextIndex >= cleanTurns.length) {
          setStatus('idle');
          return;
        }
        const speakerChanged = cleanTurns[nextIndex].speaker !== turn.speaker;
        if (!speakerChanged) {
          speakTurn(nextIndex);
          return;
        }
        turnTimerRef.current = window.setTimeout(() => {
          turnTimerRef.current = null;
          if (pausedRef.current) {
            pendingTurnStartRef.current = () => speakTurn(nextIndex);
            return;
          }
          speakTurn(nextIndex);
        }, SPEAKER_CHANGE_GAP_MS);
      };
      utterance.onerror = (event) => {
        if (token !== playbackTokenRef.current || event.error === 'canceled' || event.error === 'interrupted') return;
        clearTurnTimer();
        setError('Audio Jepang gagal diputar. Coba gunakan browser yang memiliki voice ja-JP.');
        setStatus('idle');
      };
      synth.speak(utterance);
    };

    speakTurn(0);
    return true;
  }, [clearTurnTimer, supported]);

  const togglePause = useCallback(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (status === 'playing') {
      pausedRef.current = true;
      synth.pause();
      setStatus('paused');
      return;
    }
    if (status === 'paused') {
      pausedRef.current = false;
      synth.resume();
      const pendingTurnStart = pendingTurnStartRef.current;
      pendingTurnStartRef.current = null;
      if (pendingTurnStart) pendingTurnStart();
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
