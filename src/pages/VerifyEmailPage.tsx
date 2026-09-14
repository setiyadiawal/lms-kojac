import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
  maskEmail,
} from '../lib/authVerification';
import { supabase } from '../lib/supabase';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type Notice = { kind: 'error' | 'success'; text: string } | null;

type AuthLikeError = {
  code?: string;
  message?: string;
  status?: number;
};

function expiredOtp(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const authError = error as AuthLikeError;
  const code = authError.code?.toLowerCase() ?? '';
  const message = authError.message?.toLowerCase() ?? '';
  return code === 'otp_expired' || message.includes('expired') || message.includes('kedaluwarsa');
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const email = getPendingVerificationEmail();
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(email ? RESEND_COOLDOWN_SECONDS : 0);
  const [notice, setNotice] = useState<Notice>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const verifyInFlightRef = useRef(false);
  const resendInFlightRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const token = digits.join('');

  function focusIndex(index: number) {
    inputRefs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus();
  }

  function updateDigit(index: number, value: string) {
    const numeric = value.replace(/\D/g, '');
    if (!numeric) {
      setDigits((current) => current.map((digit, digitIndex) => digitIndex === index ? '' : digit));
      return;
    }

    if (numeric.length > 1) {
      applyPastedDigits(numeric, index);
      return;
    }

    setDigits((current) => current.map((digit, digitIndex) => digitIndex === index ? numeric : digit));
    if (index < OTP_LENGTH - 1) window.requestAnimationFrame(() => focusIndex(index + 1));
  }

  function applyPastedDigits(value: string, startIndex: number) {
    const numeric = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!numeric) return;

    const actualStart = numeric.length === OTP_LENGTH ? 0 : startIndex;
    setDigits((current) => {
      const next = [...current];
      numeric.split('').forEach((digit, offset) => {
        const target = actualStart + offset;
        if (target < OTP_LENGTH) next[target] = digit;
      });
      return next;
    });

    const finalIndex = Math.min(OTP_LENGTH - 1, actualStart + numeric.length - 1);
    window.requestAnimationFrame(() => focusIndex(finalIndex));
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    const pasted = event.clipboardData.getData('text');
    if (!/\d/.test(pasted)) return;
    event.preventDefault();
    applyPastedDigits(pasted, index);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((current) => current.map((digit, digitIndex) => digitIndex === index - 1 ? '' : digit));
      focusIndex(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusIndex(index + 1);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!email || token.length !== OTP_LENGTH || verifyInFlightRef.current) return;

    verifyInFlightRef.current = true;
    setVerifying(true);
    setNotice(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;
      if (!data.session || !data.user) throw new Error('OTP verification did not create a session');

      clearPendingVerificationEmail();
      navigate('/pending', { replace: true });
    } catch (error) {
      console.error('KOJAC email OTP verification failed', error);
      setNotice({
        kind: 'error',
        text: expiredOtp(error)
          ? 'Kode verifikasi sudah kedaluwarsa. Silakan kirim ulang kode baru.'
          : 'Kode verifikasi tidak valid. Periksa kembali kode yang Anda masukkan.',
      });
    } finally {
      verifyInFlightRef.current = false;
      setVerifying(false);
    }
  }

  async function resend() {
    if (!email || cooldown > 0 || resendInFlightRef.current) return;

    resendInFlightRef.current = true;
    setResending(true);
    setNotice(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;

      setNotice({ kind: 'success', text: 'Kode verifikasi baru telah dikirim.' });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array.from({ length: OTP_LENGTH }, () => ''));
      window.requestAnimationFrame(() => focusIndex(0));
    } catch (error) {
      console.error('KOJAC email OTP resend failed', error);
      setNotice({
        kind: 'error',
        text: 'Kode belum dapat dikirim ulang. Tunggu sebentar lalu coba lagi.',
      });
    } finally {
      resendInFlightRef.current = false;
      setResending(false);
    }
  }

  if (!email) {
    return <div className="auth-screen">
      <section className="auth-copy">
        <div className="brand hero-brand"><div className="brand-mark">空</div><div><strong>KOJAC</strong><span>Kuuhaku Online Japanese Class</span></div></div>
        <h1>From Zero<br/>to <em>Japan.</em></h1>
        <p>Verifikasi email adalah langkah pertama sebelum akun masuk ke proses persetujuan KOJAC.</p>
      </section>
      <section className="auth-card verify-email-card">
        <p className="eyebrow">KOJAC LMS</p>
        <h2>Verifikasi Email</h2>
        <div className="notice" role="alert">Sesi verifikasi tidak ditemukan.</div>
        <button className="primary-btn verify-full-button" type="button" onClick={() => navigate('/login', { replace: true })}>
          Kembali ke Pendaftaran
        </button>
      </section>
    </div>;
  }

  return <div className="auth-screen">
    <section className="auth-copy">
      <div className="brand hero-brand"><div className="brand-mark">空</div><div><strong>KOJAC</strong><span>Kuuhaku Online Japanese Class</span></div></div>
      <h1>From Zero<br/>to <em>Japan.</em></h1>
      <p>Verifikasi email terlebih dahulu. Setelah itu akunmu tetap menunggu persetujuan tim KOJAC sebelum materi belajar terbuka.</p>
      <div className="pill-row"><span>Email Verification</span><span>Admin Approval</span><span>Secure Learning</span></div>
    </section>

    <section className="auth-card verify-email-card">
      <p className="eyebrow">KOJAC LMS</p>
      <h2>Verifikasi Email</h2>
      <p className="muted verify-email-copy">Kami telah mengirim kode verifikasi ke <strong>{maskEmail(email)}</strong>.</p>
      <p className="muted verify-email-subtext">Masukkan kode 6 digit yang dikirim ke email Anda.</p>

      <form onSubmit={verify} className="verify-email-form">
        <fieldset className="otp-fieldset" disabled={verifying}>
          <legend>Kode verifikasi 6 digit</legend>
          <div className="otp-inputs" role="group" aria-label="Kode verifikasi 6 digit">
            {digits.map((digit, index) => <input
              key={index}
              ref={(element) => { inputRefs.current[index] = element; }}
              className="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              aria-label={`Digit ${index + 1} dari ${OTP_LENGTH}`}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onPaste={(event) => handlePaste(event, index)}
            />)}
          </div>
        </fieldset>

        <button className="primary-btn" disabled={verifying || token.length !== OTP_LENGTH}>
          {verifying ? 'Memverifikasi…' : 'Verifikasi Email'}
        </button>
      </form>

      {notice && <div className={`notice auth-otp-notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</div>}

      <div className="verify-resend-row">
        {cooldown > 0
          ? <span className="muted verify-resend-countdown">Kirim ulang dalam {formatCountdown(cooldown)}</span>
          : <button className="link-btn verify-resend-button" type="button" disabled={resending} onClick={() => void resend()}>
              {resending ? 'Mengirim…' : 'Kirim Ulang Kode'}
            </button>}
      </div>

      <button className="link-btn verify-back-button" type="button" onClick={() => navigate('/login')}>
        ← Kembali ke Pendaftaran
      </button>
    </section>
  </div>;
}
