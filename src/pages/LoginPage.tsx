import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  getVerifyEmailRedirectUrl,
  storePendingVerificationEmail,
} from '../lib/authVerification';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

type RequestedUserType = '' | 'umum' | 'siswa';

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const today = useMemo(localToday, []);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [requestedUserType, setRequestedUserType] = useState<RequestedUserType>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!loading && user) return <Navigate to="/" replace />;

  function validateRegistration() {
    const normalizedFullName = fullName.trim();
    const normalizedNickname = nickname.trim();
    const normalizedEmail = email.trim();

    if (!normalizedFullName) return 'Nama lengkap wajib diisi.';
    if (!normalizedNickname) return 'Nama panggilan wajib diisi.';
    if (!birthDate) return 'Tanggal lahir wajib diisi.';
    if (!isValidBirthDate(birthDate) || birthDate > today) return 'Tanggal lahir tidak valid.';
    if (requestedUserType !== 'umum' && requestedUserType !== 'siswa') return 'Pilih tipe pengguna.';
    if (!normalizedEmail) return 'Email wajib diisi.';
    if (!isValidEmail(normalizedEmail)) return 'Format email tidak valid.';
    if (!password) return 'Kata sandi wajib diisi.';
    if (password.length < 8) return 'Kata sandi minimal 8 karakter.';
    if (!confirmPassword) return 'Konfirmasi kata sandi wajib diisi.';
    if (password !== confirmPassword) return 'Kata sandi dan konfirmasi kata sandi tidak sama.';
    return '';
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setMessage('');

    if (mode === 'register') {
      const validationMessage = validateRegistration();
      if (validationMessage) {
        setMessage(validationMessage);
        return;
      }
    } else {
      const normalizedEmail = email.trim();
      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        setMessage('Masukkan email yang valid.');
        return;
      }
      if (!password) {
        setMessage('Kata sandi wajib diisi.');
        return;
      }
    }

    setBusy(true);
    try {
      const normalizedEmail = email.trim();

      if (mode === 'register') {
        const normalizedFullName = fullName.trim();
        const normalizedNickname = nickname.trim();

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: getVerifyEmailRedirectUrl(),
            data: {
              full_name: normalizedFullName,
              nickname: normalizedNickname,
              birth_date: birthDate,
              requested_user_type: requestedUserType,
            },
          },
        });
        if (error) throw error;
        if (!data.user) throw new Error('Supabase signup did not return a user');

        storePendingVerificationEmail(normalizedEmail);
        navigate('/verify-email', { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error(`KOJAC ${mode} auth failed`, error);
      setMessage(
        mode === 'login'
          ? 'Email atau kata sandi tidak valid. Periksa kembali data Anda.'
          : 'Pendaftaran belum berhasil. Periksa data Anda atau coba lagi beberapa saat.',
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleMode() {
    setMode((current) => current === 'login' ? 'register' : 'login');
    setMessage('');
    setConfirmPassword('');
    setShowConfirmPassword(false);
  }

  return <div className="auth-screen">
    <section className="auth-copy">
      <div className="brand hero-brand"><img className="hero-brand-logo" src="/brand/kojac-wordmark.png" alt="KOJAC — Kuuhaku Online Japanese Class" /></div>
      <h1>From Zero<br/>to <em>Japan.</em></h1>
      <p>LMS bahasa Jepang terstruktur dari huruf dasar hingga persiapan JLPT N1.</p>
      <div className="pill-row"><span>N5 → N1</span><span>Flashcard & SRS</span><span>Progress Tracking</span></div>
    </section>

    <section className="auth-card">
      <p className="eyebrow">KOJAC LMS</p>
      <h2>{mode === 'login' ? 'Selamat datang kembali' : 'Mulai belajar di KOJAC'}</h2>
      <p className="muted">{mode === 'login' ? 'Masuk ke akun pembelajaranmu.' : 'Buat akun. Persetujuan dilakukan oleh tim KOJAC.'}</p>

      <form onSubmit={submit} noValidate className={mode === 'register' ? 'auth-register-form' : undefined}>
        {mode === 'register' && <>
          <div className="auth-field">
            <label htmlFor="register-full-name">Nama Lengkap</label>
            <input id="register-full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={busy}/>
          </div>
          <div className="auth-field">
            <label htmlFor="register-nickname">Nama Panggilan</label>
            <input id="register-nickname" autoComplete="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} disabled={busy}/>
          </div>
          <div className="auth-field">
            <label htmlFor="register-birth-date">Tanggal Lahir</label>
            <input id="register-birth-date" type="date" max={today} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} disabled={busy}/>
          </div>
          <div className="auth-field">
            <label htmlFor="register-user-type">Tipe Pengguna</label>
            <select id="register-user-type" value={requestedUserType} onChange={(event) => setRequestedUserType(event.target.value as RequestedUserType)} disabled={busy}>
              <option value="">Pilih tipe pengguna</option>
              <option value="umum">Umum</option>
              <option value="siswa">Siswa</option>
            </select>
          </div>
        </>}

        <div className="auth-field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy}/>
        </div>

        <div className="auth-field">
          <label htmlFor="auth-password">Kata Sandi</label>
          <div className="auth-password-field">
            <input id="auth-password" type={showPassword ? 'text' : 'password'} minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy}/>
            <button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)} disabled={busy}>
              {showPassword ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}
            </button>
          </div>
        </div>

        {mode === 'register' && <div className="auth-field">
          <label htmlFor="register-confirm-password">Konfirmasi Kata Sandi</label>
          <div className="auth-password-field">
            <input id="register-confirm-password" type={showConfirmPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={busy}/>
            <button type="button" className="auth-password-toggle" aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((current) => !current)} disabled={busy}>
              {showConfirmPassword ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}
            </button>
          </div>
        </div>}

        <button className="primary-btn" disabled={busy}>{busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}</button>
      </form>

      {message && <div className="notice" role="alert">{message}</div>}
      <button className="link-btn" type="button" onClick={toggleMode} disabled={busy}>
        {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
      </button>
    </section>
  </div>;
}
