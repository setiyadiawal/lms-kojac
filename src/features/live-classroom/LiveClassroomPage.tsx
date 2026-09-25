import { JaaSMeeting } from '@jitsi/react-sdk';
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  History,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  UsersRound,
  Video,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { LIVE_CLASSROOM_ENABLED } from './config';
import {
  connectBackgroundGoogleDrive,
  startBackgroundRecordingUpload,
  useBackgroundRecordingUpload,
} from '../recordings/backgroundRecordingUpload';
import {
  startLocalClassRecording,
  type LocalRecordingResult,
  type LocalRecordingSession,
} from './localRecording';
import {
  requestLiveClassroomAccess,
  type LiveClassroomAccess,
} from './provider';
import {
  endLiveClassSession,
  getLiveClassAttendance,
  getLiveClassroomState,
  getLiveClassSessionHistory,
  heartbeatLiveClassSession,
  joinLiveClassSession,
  leaveLiveClassSession,
  startLiveClassSession,
  type LiveAttendance,
  type LiveClassroomState,
  type LiveSessionHistory,
} from './session';
import './live-classroom.css';

type JitsiExternalApi = {
  addListener: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
};

function messageForError(error: string) {
  if (error.includes('class_not_found')) return 'Kelas tidak ditemukan.';
  if (error.includes('class_not_active_for_live')) return 'Kelas harus berstatus aktif sebelum sesi Live dimulai.';
  if (error.includes('class_not_active')) return 'Kelas ini belum dapat dimasuki.';
  if (error.includes('student_not_enrolled')) return 'Akun Anda tidak terdaftar sebagai siswa aktif pada kelas ini.';
  if (error.includes('teacher_class_access_denied')) return 'Anda tidak memiliki akses mengajar pada kelas ini.';
  if (error.includes('live_classroom_access_denied')) return 'Akun Anda tidak mempunyai akses ke Live Classroom ini.';
  if (error.includes('account_not_ready')) return 'Akun belum memenuhi syarat untuk menggunakan KOJAC Live.';
  if (error.includes('provider_not_configured')) return 'KOJAC Live belum selesai dikonfigurasi.';
  if (error.includes('session_not_active')) return 'Sesi kelas sudah berakhir atau belum dimulai.';
  if (error.includes('provider_configuration_mismatch')) return 'Provider sesi Live tidak sesuai dengan konfigurasi server.';
  return 'KOJAC Live belum dapat dibuka. Silakan coba lagi.';
}

function formatClock(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) return `${hours}j ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}d`;
  return `${remainingSeconds}d`;
}

function sessionElapsed(startedAt: string | null, now: number) {
  if (!startedAt) return '00:00';
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return '00:00';

  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export function LiveClassroomPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();

  const [classState, setClassState] = useState<LiveClassroomState | null>(null);
  const [access, setAccess] = useState<LiveClassroomAccess | null>(null);
  const [attendance, setAttendance] = useState<LiveAttendance[]>([]);
  const [historyRows, setHistoryRows] = useState<LiveSessionHistory[]>([]);
  const [stateLoading, setStateLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [meetingJoined, setMeetingJoined] = useState(false);
  const [localRecordingSession, setLocalRecordingSession] = useState<LocalRecordingSession | null>(null);
  const [localRecordingResult, setLocalRecordingResult] = useState<LocalRecordingResult | null>(null);
  const [localRecordingBusy, setLocalRecordingBusy] = useState(false);
  const [localRecordingMessage, setLocalRecordingMessage] = useState('');
  const [localUploadBusy, setLocalUploadBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const uploadState = useBackgroundRecordingUpload(user?.id);

  const apiRef = useRef<JitsiExternalApi | null>(null);
  const apiCleanupRef = useRef<(() => void) | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const attendanceSessionRef = useRef<string | null>(null);

  const backTarget = role === 'siswa' ? '/kelas-saya' : '/kelas-mengajar';

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const markLeave = useCallback(async () => {
    const sessionId = attendanceSessionRef.current;
    if (!sessionId) return;

    attendanceSessionRef.current = null;
    stopHeartbeat();

    try {
      await leaveLiveClassSession(sessionId);
    } catch (error) {
      console.warn('KOJAC Live attendance leave failed', error);
    }
  }, [stopHeartbeat]);

  const markJoined = useCallback(async (sessionId: string) => {
    if (attendanceSessionRef.current === sessionId) return;

    try {
      await joinLiveClassSession(sessionId);
      attendanceSessionRef.current = sessionId;
      stopHeartbeat();

      heartbeatRef.current = window.setInterval(() => {
        void heartbeatLiveClassSession(sessionId).catch((error) => {
          console.warn('KOJAC Live attendance heartbeat failed', error);
        });
      }, 15_000);
    } catch (error) {
      console.error('KOJAC Live attendance join failed', error);
    }
  }, [stopHeartbeat]);

  const loadHistory = useCallback(async (targetClassId: string) => {
    try {
      const rows = await getLiveClassSessionHistory(targetClassId, 8);
      setHistoryRows(rows);
    } catch (error) {
      console.warn('KOJAC Live session history load failed', error);
    }
  }, []);

  const loadState = useCallback(async (quiet = false) => {
    if (!LIVE_CLASSROOM_ENABLED) {
      setStateLoading(false);
      return;
    }

    if (!classId) {
      setErrorCode('class_not_found');
      setStateLoading(false);
      return;
    }

    if (!quiet) setStateLoading(true);

    try {
      const nextState = await getLiveClassroomState(classId);
      setClassState(nextState);
      setErrorCode('');

      if (nextState.canModerate) {
        void loadHistory(classId);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : 'live_classroom_state_failed';
      setClassState(null);
      setAccess(null);
      setErrorCode(code);
    } finally {
      if (!quiet) setStateLoading(false);
    }
  }, [classId, loadHistory]);

  const loadAttendance = useCallback(async (sessionId: string) => {
    try {
      const rows = await getLiveClassAttendance(sessionId);
      setAttendance(rows);
    } catch (error) {
      console.warn('KOJAC Live attendance load failed', error);
    }
  }, []);

  useEffect(() => {
    void loadState(false);
  }, [loadState]);

  useEffect(() => {
    if (!classState) return;

    const shouldPoll = Boolean(classState.sessionId) || !classState.canModerate;
    if (!shouldPoll) return;

    const interval = window.setInterval(() => {
      void loadState(true);
    }, classState.sessionId ? 20_000 : 10_000);

    return () => window.clearInterval(interval);
  }, [classState?.canModerate, classState?.sessionId, loadState]);

  useEffect(() => {
    if (!classState?.sessionId) {
      setAccess(null);
      setAccessLoading(false);
      return;
    }

    let active = true;
    const sessionId = classState.sessionId;

    setAccessLoading(true);
    setErrorCode('');

    requestLiveClassroomAccess(classState.classId)
      .then((nextAccess) => {
        if (!active) return;

        if (nextAccess.sessionId !== sessionId) {
          setAccess(null);
          setErrorCode('live_session_changed');
          void loadState(true);
          return;
        }

        setAccess(nextAccess);
      })
      .catch((error) => {
        if (!active) return;
        const code = error instanceof Error ? error.message : 'live_classroom_access_failed';
        setAccess(null);
        setErrorCode(code);
      })
      .finally(() => {
        if (active) setAccessLoading(false);
      });

    return () => {
      active = false;
    };
  }, [classState?.classId, classState?.sessionId, loadState]);

  useEffect(() => {
    const sessionId = classState?.sessionId;
    if (!sessionId || !classState.canModerate) {
      setAttendance([]);
      return;
    }

    void loadAttendance(sessionId);
    const interval = window.setInterval(() => {
      void loadAttendance(sessionId);
    }, attendanceOpen ? 3_000 : 8_000);

    return () => window.clearInterval(interval);
  }, [
    attendanceOpen,
    classState?.canModerate,
    classState?.sessionId,
    loadAttendance,
  ]);

  useEffect(() => {
    if (!classState?.sessionId) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [classState?.sessionId]);

  useEffect(() => () => {
    apiCleanupRef.current?.();
    apiCleanupRef.current = null;
    stopHeartbeat();
    const sessionId = attendanceSessionRef.current;
    attendanceSessionRef.current = null;

    if (sessionId) {
      void leaveLiveClassSession(sessionId).catch(() => undefined);
    }
  }, [stopHeartbeat]);

  const bindJitsiApi = useCallback((api: JitsiExternalApi) => {
    apiCleanupRef.current?.();
    apiRef.current = api;

    const sessionId = classState?.sessionId;
    if (!sessionId) return;

    const onJoined = () => {
      setMeetingJoined(true);
      void markJoined(sessionId);
      if (classState.canModerate) void loadAttendance(sessionId);
    };

    const onLeft = () => {
      setMeetingJoined(false);
      void markLeave();
      if (classState.canModerate) void loadAttendance(sessionId);
    };

    const refreshAttendanceAfterParticipantChange = () => {
      if (!classState.canModerate) return;

      window.setTimeout(() => {
        void loadAttendance(sessionId);
      }, 350);

      window.setTimeout(() => {
        void loadAttendance(sessionId);
      }, 1_200);
    };

    api.addListener('videoConferenceJoined', onJoined);
    api.addListener('videoConferenceLeft', onLeft);
    api.addListener('participantJoined', refreshAttendanceAfterParticipantChange);
    api.addListener('participantLeft', refreshAttendanceAfterParticipantChange);

    apiCleanupRef.current = () => {
      api.removeListener('videoConferenceJoined', onJoined);
      api.removeListener('videoConferenceLeft', onLeft);
      api.removeListener('participantJoined', refreshAttendanceAfterParticipantChange);
      api.removeListener('participantLeft', refreshAttendanceAfterParticipantChange);
    };
  }, [
    classState?.canModerate,
    classState?.sessionId,
    loadAttendance,
    markJoined,
    markLeave,
  ]);

  const startSession = async () => {
    if (!classId || sessionBusy) return;

    setSessionBusy(true);
    setErrorCode('');

    try {
      await startLiveClassSession(classId);
      await loadState(false);
    } catch (error) {
      setErrorCode(error instanceof Error ? error.message : 'live_session_start_failed');
    } finally {
      setSessionBusy(false);
    }
  };

  const finishLocalRecording = useCallback(async (
    targetSession: LocalRecordingSession,
  ) => {
    setLocalRecordingBusy(true);
    setLocalRecordingMessage('Menyelesaikan file recording…');

    try {
      const result = await targetSession.stop();
      setLocalRecordingResult(result);
      setLocalRecordingSession(null);
      setLocalRecordingMessage('Recording selesai dan file WebM sudah didownload.');
    } catch (error) {
      console.error('KOJAC local recording stop failed', error);
      setLocalRecordingMessage(
        error instanceof Error
          ? error.message
          : 'Recording lokal belum dapat diselesaikan.',
      );
    } finally {
      setLocalRecordingBusy(false);
    }
  }, []);

  const beginLocalRecording = async () => {
    if (
      !classState?.canModerate
      || !meetingJoined
      || localRecordingSession
      || localRecordingBusy
    ) return;

    const confirmed = window.confirm(
      'Mulai recording lokal KOJAC?\n\nPada dialog Chrome berikutnya:\n1. Pilih TAB KOJAC Live\n2. WAJIB aktifkan "Bagikan audio tab"\n3. Izinkan mikrofon pengajar',
    );
    if (!confirmed) return;

    setLocalRecordingBusy(true);
    setLocalRecordingMessage('');

    try {
      const date = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()).replace(/[,:]/g, '-').replace(/\s+/g, '_');

      const targetSession = await startLocalClassRecording({
        suggestedName: `KOJAC Live - ${classState.className} - ${date}`,
      });

      setLocalRecordingSession(targetSession);
      setLocalRecordingResult(null);
      setLocalRecordingMessage('Recording lokal aktif.');

      targetSession.screenTrack.addEventListener('ended', () => {
        void finishLocalRecording(targetSession);
      }, { once: true });
    } catch (error) {
      const cancelled =
        error instanceof DOMException && error.name === 'AbortError';

      if (!cancelled) {
        console.error('KOJAC local recording start failed', error);
        setLocalRecordingMessage(
          error instanceof Error
            ? error.message
            : 'Recording lokal belum dapat dimulai.',
        );
      }
    } finally {
      setLocalRecordingBusy(false);
    }
  };

  const stopLocalRecording = async () => {
    if (!localRecordingSession) return;
    await finishLocalRecording(localRecordingSession);
  };

  const uploadLocalRecording = async () => {
    if (!localRecordingResult || !classState || localUploadBusy) return;

    setLocalUploadBusy(true);
    setLocalRecordingMessage('');

    try {
      if (!uploadState.driveConnected) {
        await connectBackgroundGoogleDrive();
      }

      await startBackgroundRecordingUpload({
        file: localRecordingResult.file,
        classId: classState.classId,
        className: classState.className,
        title: `KOJAC Live — ${classState.className}`,
        description: 'Rekaman KOJAC Live Classroom.',
        recordedAt: localRecordingResult.startedAt,
        durationMinutes: Math.max(
          1,
          Math.round(localRecordingResult.durationSeconds / 60),
        ),
        isPublished: true,
      });

      await localRecordingResult.cleanup();
      setLocalRecordingResult(null);
      setLocalRecordingMessage(
        'Recording berhasil diupload ke Google Drive dan masuk Rekaman Kelas.',
      );
    } catch (error) {
      console.error('KOJAC local recording upload failed', error);
      setLocalRecordingMessage(
        error instanceof Error
          ? error.message
          : 'Upload recording belum berhasil.',
      );
    } finally {
      setLocalUploadBusy(false);
    }
  };

  const endSession = async () => {
    const sessionId = classState?.sessionId;
    if (!sessionId || sessionBusy) return;

    const confirmed = window.confirm(
      'Akhiri sesi KOJAC Live untuk semua peserta?\n\nAbsensi akan ditutup dan peserta tidak dapat masuk kembali ke sesi ini.',
    );
    if (!confirmed) return;

    setSessionBusy(true);

    try {
      if (localRecordingSession) {
        await finishLocalRecording(localRecordingSession);
      }

      await endLiveClassSession(sessionId);

      try {
        apiRef.current?.executeCommand('endConference');
      } catch (error) {
        console.warn('KOJAC Live endConference command unavailable', error);
        try {
          apiRef.current?.executeCommand('hangup');
        } catch {
          // Server session tetap sudah ditutup.
        }
      }

      await markLeave();
      setAccess(null);
      setAttendanceOpen(false);
      await loadState(false);
    } catch (error) {
      setErrorCode(error instanceof Error ? error.message : 'live_session_end_failed');
    } finally {
      setSessionBusy(false);
    }
  };

  const closeMeeting = async () => {
    if (localRecordingSession) {
      const confirmed = window.confirm(
        'Recording lokal masih aktif. Hentikan recording dan keluar dari kelas?',
      );
      if (!confirmed) return;

      await finishLocalRecording(localRecordingSession);
    }

    await markLeave();
    navigate(backTarget);
  };

  if (!LIVE_CLASSROOM_ENABLED) {
    return (
      <div className="page live-classroom-page">
        <section className="live-classroom-state">
          <div className="live-classroom-state-icon"><Video size={28}/></div>
          <p className="eyebrow">KOJAC LIVE · BETA</p>
          <h1>Live Classroom belum diaktifkan</h1>
          <p>Aktifkan feature flag KOJAC Live untuk menggunakan ruang kelas video.</p>
          <button type="button" onClick={() => navigate(backTarget)}>
            <ArrowLeft size={16}/> Kembali
          </button>
        </section>
      </div>
    );
  }

  if (stateLoading) {
    return (
      <div className="page live-classroom-page">
        <section className="live-classroom-state" aria-busy="true">
          <Loader2 className="live-classroom-spinner" size={30}/>
          <p className="eyebrow">KOJAC LIVE · PHASE 2</p>
          <h1>Memeriksa sesi kelas…</h1>
          <p>KOJAC sedang memverifikasi kelas dan status sesi Live.</p>
        </section>
      </div>
    );
  }

  if (!classState) {
    return (
      <div className="page live-classroom-page">
        <section className="live-classroom-state" role="alert">
          <div className="live-classroom-state-icon is-error"><AlertCircle size={28}/></div>
          <p className="eyebrow">KOJAC LIVE · PHASE 2</p>
          <h1>Kelas belum dapat dibuka</h1>
          <p>{messageForError(errorCode)}</p>
          <div className="live-classroom-state-actions">
            <button type="button" onClick={() => void loadState(false)}>
              <RefreshCw size={16}/> Coba Lagi
            </button>
            <button className="secondary" type="button" onClick={() => navigate(backTarget)}>
              <ArrowLeft size={16}/> Kembali
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!classState.sessionId) {
    return (
      <div className="page live-classroom-page">
        <section className="live-session-lobby">
          <button className="live-classroom-back" type="button" onClick={() => navigate(backTarget)}>
            <ArrowLeft size={17}/> Kembali
          </button>

          <div className="live-session-lobby-card">
            <div className="live-classroom-state-icon">
              {classState.canModerate ? <Play size={27}/> : <Clock3 size={27}/>}
            </div>

            <p className="eyebrow">KOJAC LIVE · PHASE 2</p>
            <h1>{classState.className}</h1>
            <p className="live-session-lobby-code">
              {classState.classCode || 'Kelas KOJAC'}
            </p>

            {classState.canModerate ? (
              <>
                <h2>Siap memulai kelas?</h2>
                <p>
                  Sesi resmi akan dibuat terlebih dahulu. Absensi siswa mulai dicatat
                  saat mereka benar-benar bergabung ke video conference.
                </p>
                <button
                  className="live-session-start-button"
                  type="button"
                  disabled={sessionBusy}
                  onClick={() => void startSession()}
                >
                  {sessionBusy
                    ? <><Loader2 className="live-classroom-spinner" size={17}/> Memulai…</>
                    : <><Play size={17}/> Mulai Kelas Live</>}
                </button>
              </>
            ) : (
              <>
                <h2>Menunggu pengajar memulai kelas</h2>
                <p>
                  Halaman ini akan memeriksa sesi secara otomatis. Anda dapat tetap
                  berada di sini sampai pengajar memulai kelas.
                </p>
                <button
                  className="live-session-refresh-button"
                  type="button"
                  onClick={() => void loadState(false)}
                >
                  <RefreshCw size={16}/> Periksa Sekarang
                </button>
              </>
            )}

            {errorCode && (
              <p className="live-session-inline-error" role="alert">
                {messageForError(errorCode)}
              </p>
            )}
          </div>

          {classState.canModerate && historyRows.length > 0 && (
            <section className="live-session-history">
              <div className="live-session-section-heading">
                <div>
                  <p className="eyebrow">RIWAYAT LIVE</p>
                  <h2>Pertemuan Sebelumnya</h2>
                </div>
                <History size={20}/>
              </div>

              <div className="live-session-history-list">
                {historyRows.map((row) => (
                  <article key={row.sessionId}>
                    <div>
                      <strong>{formatDateTime(row.startedAt)}</strong>
                      <span>Dimulai oleh {row.startedByName}</span>
                    </div>
                    <div className="live-session-history-metrics">
                      <span>{row.studentCount} siswa</span>
                      <span>{row.lateStudentCount} terlambat</span>
                      <span>{row.totalStudentMinutes} menit siswa</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    );
  }

  if (accessLoading || !access) {
    return (
      <div className="page live-classroom-page">
        <section className="live-classroom-state" aria-busy={accessLoading}>
          {errorCode
            ? <div className="live-classroom-state-icon is-error"><AlertCircle size={28}/></div>
            : <Loader2 className="live-classroom-spinner" size={30}/>}
          <p className="eyebrow">KOJAC LIVE · PHASE 2</p>
          <h1>{errorCode ? 'Meeting belum dapat dibuka' : 'Menyiapkan meeting…'}</h1>
          <p>
            {errorCode
              ? messageForError(errorCode)
              : 'Sesi sudah aktif. KOJAC sedang membuat akses meeting yang aman.'}
          </p>
          {errorCode && (
            <div className="live-classroom-state-actions">
              <button type="button" onClick={() => void loadState(false)}>
                <RefreshCw size={16}/> Coba Lagi
              </button>
              <button className="secondary" type="button" onClick={() => navigate(backTarget)}>
                <ArrowLeft size={16}/> Kembali
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page live-classroom-page">
      <header className="live-classroom-header">
        <div className="live-classroom-header-main">
          <button
            className="live-classroom-back"
            type="button"
            onClick={() => navigate(backTarget)}
          >
            <ArrowLeft size={17}/> Kembali
          </button>

          <div>
            <p className="eyebrow">KOJAC LIVE · PHASE 2</p>
            <h1>{access.className}</h1>
            <p>
              {access.classCode ? `${access.classCode} · ` : ''}
              Dimulai {formatClock(classState.startedAt)}
              {classState.startedByName ? ` oleh ${classState.startedByName}` : ''}
            </p>
          </div>
        </div>

        <div className="live-classroom-header-actions">
          <div className="live-session-running">
            <span className="live-session-dot" aria-hidden="true"/>
            <strong>LIVE</strong>
            <span>{sessionElapsed(classState.startedAt, now)}</span>
          </div>

          {classState.canModerate && (
            <button
              className="live-session-attendance-button"
              type="button"
              onClick={() => setAttendanceOpen(true)}
            >
              <UsersRound size={16}/>
              Kehadiran
              <span>{attendance.filter((row) => row.role === 'siswa').length}</span>
            </button>
          )}

          {classState.canModerate && (
            <button
              className={`live-local-recording-button ${localRecordingSession ? 'is-active' : ''}`}
              type="button"
              disabled={!meetingJoined || localRecordingBusy}
              title={!meetingJoined ? 'Gabung ke meeting terlebih dahulu' : undefined}
              onClick={() => {
                if (localRecordingSession) {
                  void stopLocalRecording();
                } else {
                  void beginLocalRecording();
                }
              }}
            >
              {localRecordingSession ? <Square size={13}/> : <Video size={15}/>}
              {localRecordingBusy
                ? 'Memproses…'
                : !meetingJoined
                  ? 'Gabung dulu'
                  : localRecordingSession
                    ? 'Stop Rekam'
                    : 'Rekam Lokal'}
            </button>
          )}

          <div className="live-classroom-role">
            <ShieldCheck size={16}/>
            <span>{access.moderator ? 'Moderator' : 'Siswa'}</span>
          </div>

          {classState.canModerate && (
            <button
              className="live-session-end-button"
              type="button"
              disabled={sessionBusy}
              onClick={() => void endSession()}
            >
              <Square size={14}/>
              {sessionBusy ? 'Mengakhiri…' : 'Akhiri Kelas'}
            </button>
          )}
        </div>
      </header>

      <section className="live-classroom-stage" aria-label="KOJAC Live Classroom">
        <JaaSMeeting
          appId={access.appId}
          roomName={access.roomName}
          jwt={access.jwt}
          lang="id"
          userInfo={{
            displayName: access.displayName,
            email: access.email,
          }}
          configOverwrite={{
            prejoinPageEnabled: true,
            enableWelcomePage: false,
            disableDeepLinking: true,
            disableInviteFunctions: true,
          }}
          interfaceConfigOverwrite={{
            MOBILE_APP_PROMO: false,
            TILE_VIEW_MAX_COLUMNS: 4,
          }}
          onApiReady={(externalApi) => bindJitsiApi(externalApi as unknown as JitsiExternalApi)}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.width = '100%';
            iframeRef.style.height = '100%';
            iframeRef.style.border = '0';
          }}
          onReadyToClose={() => {
            void closeMeeting();
          }}
        />
      </section>

      <footer className="live-classroom-footer">
        <span><Video size={14}/> Audio · Video · Screen Share · Chat</span>
        <span className="live-classroom-beta-note">
          Kehadiran otomatis aktif · toleransi terlambat {classState.lateGraceMinutes} menit
          {localRecordingSession ? ' · REKAM LOKAL AKTIF' : ''}
        </span>
      </footer>

      {classState.canModerate && (localRecordingResult || localRecordingMessage) && (
        <aside className="live-local-recording-result" role="status">
          <div className="live-local-recording-result-copy">
            <strong>
              {localRecordingResult
                ? 'Recording Lokal Selesai'
                : localRecordingSession
                  ? 'Recording Lokal Aktif'
                  : 'KOJAC Local Recording'}
            </strong>
            <span>{localRecordingMessage}</span>
            {localRecordingResult && (
              <small>
                {Math.max(1, Math.round(localRecordingResult.durationSeconds / 60))} menit
                {' · '}
                {(localRecordingResult.bytes / 1024 / 1024).toFixed(1)} MB
                {' · '}
                {localRecordingResult.fileName}
              </small>
            )}
          </div>

          {localRecordingResult && (
            <button
              type="button"
              disabled={localUploadBusy || uploadState.job?.status === 'uploading'}
              onClick={() => void uploadLocalRecording()}
            >
              {localUploadBusy || uploadState.job?.status === 'uploading'
                ? 'Mengupload…'
                : 'Upload ke Google Drive'}
            </button>
          )}

          {!localRecordingSession && !localRecordingResult && (
            <button
              type="button"
              className="is-dismiss"
              onClick={() => setLocalRecordingMessage('')}
            >
              Tutup
            </button>
          )}
        </aside>
      )}

      {attendanceOpen && classState.canModerate && (
        <div
          className="live-attendance-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Kehadiran KOJAC Live"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAttendanceOpen(false);
          }}
        >
          <aside className="live-attendance-panel">
            <header>
              <div>
                <p className="eyebrow">KEHADIRAN LIVE</p>
                <h2>{classState.className}</h2>
              </div>
              <button type="button" aria-label="Tutup" onClick={() => setAttendanceOpen(false)}>
                <X size={19}/>
              </button>
            </header>

            <div className="live-attendance-summary">
              <div>
                <strong>{attendance.filter((row) => row.role === 'siswa').length}</strong>
                <span>Siswa masuk</span>
              </div>
              <div>
                <strong>{attendance.filter((row) => row.role === 'siswa' && row.isConnected).length}</strong>
                <span>Online</span>
              </div>
              <div>
                <strong>{attendance.filter((row) => row.role === 'siswa' && row.wasLate).length}</strong>
                <span>Terlambat</span>
              </div>
            </div>

            <div className="live-attendance-list">
              {attendance.length === 0 ? (
                <div className="live-attendance-empty">
                  Belum ada peserta yang bergabung ke meeting.
                </div>
              ) : attendance.map((row) => (
                <article key={row.userId}>
                  <div className="live-attendance-person">
                    <span className={`live-attendance-online ${row.isConnected ? 'is-online' : ''}`}/>
                    <div>
                      <strong>{row.displayName}</strong>
                      <span>{row.role === 'siswa' ? 'Siswa' : 'Pengajar / Moderator'}</span>
                    </div>
                  </div>

                  <div className="live-attendance-meta">
                    <span>Masuk {formatClock(row.firstJoinedAt)}</span>
                    <span>{formatDuration(row.durationSeconds)}</span>
                    {row.joinCount > 1 && <span>{row.joinCount}× masuk</span>}
                    {row.wasLate && <span className="is-late">Terlambat</span>}
                  </div>
                </article>
              ))}
            </div>

            <button
              className="live-attendance-refresh"
              type="button"
              onClick={() => void loadAttendance(classState.sessionId!)}
            >
              <RefreshCw size={15}/> Perbarui Kehadiran
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
