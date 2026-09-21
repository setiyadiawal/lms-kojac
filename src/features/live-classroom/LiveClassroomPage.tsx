import { JaaSMeeting } from '@jitsi/react-sdk';
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { LIVE_CLASSROOM_ENABLED } from './config';
import {
  requestLiveClassroomAccess,
  type LiveClassroomAccess,
} from './provider';
import './live-classroom.css';

function messageForError(error: string) {
  if (error === 'class_not_found') return 'Kelas tidak ditemukan.';
  if (error === 'class_not_active') return 'Kelas ini belum dapat dimasuki.';
  if (error === 'student_not_enrolled') return 'Akun Anda tidak terdaftar sebagai siswa aktif pada kelas ini.';
  if (error === 'teacher_class_access_denied') return 'Anda tidak memiliki akses mengajar pada kelas ini.';
  if (error === 'account_not_ready') return 'Akun belum memenuhi syarat untuk menggunakan KOJAC Live.';
  if (error === 'provider_not_configured') return 'KOJAC Live belum selesai dikonfigurasi.';
  return 'KOJAC Live belum dapat dibuka. Silakan coba lagi.';
}

export function LiveClassroomPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();

  const [access, setAccess] = useState<LiveClassroomAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState('');

  const backTarget = role === 'siswa' ? '/kelas-saya' : '/kelas-mengajar';

  const loadAccess = useCallback(async () => {
    if (!LIVE_CLASSROOM_ENABLED) {
      setLoading(false);
      return;
    }

    if (!classId) {
      setErrorCode('class_not_found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorCode('');

    try {
      const nextAccess = await requestLiveClassroomAccess(classId);
      setAccess(nextAccess);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'live_classroom_access_failed';
      setAccess(null);
      setErrorCode(code);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  if (!LIVE_CLASSROOM_ENABLED) {
    return (
      <div className="page live-classroom-page">
        <section className="live-classroom-state">
          <div className="live-classroom-state-icon"><Video size={28}/></div>
          <p className="eyebrow">KOJAC LIVE · BETA</p>
          <h1>Live Classroom belum diaktifkan</h1>
          <p>
            Foundation KOJAC Live sudah terpasang. Aktifkan feature flag setelah
            provider dan token server selesai dikonfigurasi.
          </p>
          <button type="button" onClick={() => navigate(backTarget)}>
            <ArrowLeft size={16}/> Kembali
          </button>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page live-classroom-page">
        <section className="live-classroom-state" aria-busy="true">
          <Loader2 className="live-classroom-spinner" size={30}/>
          <p className="eyebrow">KOJAC LIVE · BETA</p>
          <h1>Menyiapkan kelas…</h1>
          <p>Memverifikasi kelas dan membuat akses meeting yang aman.</p>
        </section>
      </div>
    );
  }

  if (!access || errorCode) {
    return (
      <div className="page live-classroom-page">
        <section className="live-classroom-state" role="alert">
          <div className="live-classroom-state-icon is-error">
            <AlertCircle size={28}/>
          </div>
          <p className="eyebrow">KOJAC LIVE · BETA</p>
          <h1>Kelas belum dapat dibuka</h1>
          <p>{messageForError(errorCode)}</p>
          <div className="live-classroom-state-actions">
            <button type="button" onClick={() => void loadAccess()}>
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
            <p className="eyebrow">KOJAC LIVE · BETA</p>
            <h1>{access.className}</h1>
            <p>
              {access.classCode ? `${access.classCode} · ` : ''}
              Kelas video langsung di dalam KOJAC LMS.
            </p>
          </div>
        </div>

        <div className="live-classroom-role">
          <ShieldCheck size={16}/>
          <span>{access.moderator ? 'Pengajar / Moderator' : 'Siswa'}</span>
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
          getIFrameRef={(iframeRef) => {
            iframeRef.style.width = '100%';
            iframeRef.style.height = '100%';
            iframeRef.style.border = '0';
          }}
          onReadyToClose={() => navigate(backTarget)}
        />
      </section>

      <footer className="live-classroom-footer">
        <span><Video size={14}/> Audio · Video · Screen Share · Chat</span>
        <span className="live-classroom-beta-note">
          Recording server-side belum diaktifkan pada Phase 1A.
        </span>
      </footer>
    </div>
  );
}
