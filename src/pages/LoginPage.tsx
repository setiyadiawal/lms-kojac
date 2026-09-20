import {
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  Layers3,
  Trophy,
} from 'lucide-react';
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

const MONTH_LABELS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatIsoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${padDatePart(monthIndex + 1)}-${padDatePart(day)}`;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

function formatBirthDateLabel(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return '';

  return `${padDatePart(parsed.day)} / ${padDatePart(parsed.monthIndex + 1)} / ${parsed.year}`;
}

function getCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const previousMonthDays = new Date(year, monthIndex, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstDay + 1;

    if (dayOffset < 1) {
      return {
        year: monthIndex === 0 ? year - 1 : year,
        monthIndex: monthIndex === 0 ? 11 : monthIndex - 1,
        day: previousMonthDays + dayOffset,
        outside: true,
      };
    }

    if (dayOffset > daysInMonth) {
      return {
        year: monthIndex === 11 ? year + 1 : year,
        monthIndex: monthIndex === 11 ? 0 : monthIndex + 1,
        day: dayOffset - daysInMonth,
        outside: true,
      };
    }

    return {
      year,
      monthIndex,
      day: dayOffset,
      outside: false,
    };
  });
}

export function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const today = useMemo(localToday, []);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false);
  const [birthDateView, setBirthDateView] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear() - 18,
      monthIndex: now.getMonth(),
    };
  });
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

  function openBirthDatePicker() {
    const parsed = parseIsoDate(birthDate);

    if (parsed) {
      setBirthDateView({
        year: parsed.year,
        monthIndex: parsed.monthIndex,
      });
    }

    setBirthDatePickerOpen(true);
  }

  function selectBirthDate(year: number, monthIndex: number, day: number) {
    const nextValue = formatIsoDate(year, monthIndex, day);
    if (nextValue > today) return;

    setBirthDate(nextValue);
    setBirthDatePickerOpen(false);
  }

  function changeBirthDateMonth(nextMonthIndex: number) {
    setBirthDateView((current) => {
      if (nextMonthIndex < 0) {
        return { year: current.year - 1, monthIndex: 11 };
      }

      if (nextMonthIndex > 11) {
        return { year: current.year + 1, monthIndex: 0 };
      }

      return { ...current, monthIndex: nextMonthIndex };
    });
  }

  function toggleMode() {
    setMode((current) => current === 'login' ? 'register' : 'login');
    setMessage('');
    setConfirmPassword('');
    setShowConfirmPassword(false);
  }

  return <div className={`auth-screen auth-simple-screen auth-mode-${mode}`}>
    <section className="auth-copy auth-simple-copy" aria-label="KOJAC LMS">
      <div className="auth-simple-copy-inner">
        <div className="brand hero-brand auth-simple-brand">
          <img
            className="hero-brand-logo"
            src="/brand/kojac-wordmark.png"
            alt="KOJAC — Kuuhaku Online Japanese Class"
          />
        </div>

        <div className="auth-simple-kicker">KUUHAKU SYSTEM</div>

        <h1>
          From Zero<br/>
          to <em>Japan.</em>
        </h1>

        <p className="auth-simple-lead">
          Belajar bahasa Jepang lebih terarah dalam satu LMS —
          dari materi, latihan, review, hingga progress dan persiapan ujian.
        </p>

        <div className="auth-selling-grid" aria-label="Fitur utama KOJAC LMS">
          <article>
            <span><BookOpenCheck size={17}/></span>
            <div>
              <strong>Materi Terstruktur</strong>
              <small>Huruf, Kosakata, Kanji, dan Tata Bahasa tersusun bertahap.</small>
            </div>
          </article>

          <article>
            <span><BrainCircuit size={17}/></span>
            <div>
              <strong>Belajar Lebih Efektif</strong>
              <small>Flashcard, SRS, Quiz, dan Latihan Lintas Bab.</small>
            </div>
          </article>

          <article>
            <span><Headphones size={17}/></span>
            <div>
              <strong>Latihan Lengkap</strong>
              <small>Reading, Listening, dan Simulasi JLPT dalam satu sistem.</small>
            </div>
          </article>

          <article>
            <span><Trophy size={17}/></span>
            <div>
              <strong>Progress Terukur</strong>
              <small>Mastery, streak, achievement, tugas, dan rekaman kelas.</small>
            </div>
          </article>
        </div>

        <div className="auth-simple-proof">
          <CheckCircle2 size={15}/>
          <span>Belajar · Latihan · Review · Progress · Ujian</span>
        </div>
      </div>
    </section>

    <section className="auth-card auth-simple-card">
      <div className="auth-simple-form-wrap">
        <p className="eyebrow">KOJAC LMS</p>

        <h2>
          {mode === 'login'
            ? 'Selamat datang kembali'
            : 'Mulai belajar di KOJAC'}
        </h2>

        <p className="muted auth-simple-subtitle">
          {mode === 'login'
            ? 'Masuk ke akun pembelajaranmu.'
            : 'Buat akun untuk memulai perjalanan belajarmu bersama KOJAC.'}
        </p>

        <div className="auth-mobile-selling" aria-label="Fitur KOJAC">
          <span><BookOpenCheck size={13}/> Materi Terstruktur</span>
          <span><Layers3 size={13}/> Flashcard & Latihan</span>
          <span><Trophy size={13}/> Progress Terukur</span>
        </div>

        <form
          onSubmit={submit}
          noValidate
          className={mode === 'register' ? 'auth-register-form' : undefined}
        >
          {mode === 'register' && <>
            <div className="auth-field">
              <label htmlFor="register-full-name">Nama Lengkap</label>
              <input
                id="register-full-name"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={busy}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-nickname">Nama Panggilan</label>
              <input
                id="register-nickname"
                autoComplete="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                disabled={busy}
              />
            </div>

            <div className="auth-field auth-birth-date-field">
              <label htmlFor="register-birth-date-trigger">Tanggal Lahir</label>
              <button
                id="register-birth-date-trigger"
                type="button"
                className={`kojac-date-trigger ${birthDate ? 'has-value' : ''}`}
                onClick={openBirthDatePicker}
                disabled={busy}
                aria-haspopup="dialog"
                aria-expanded={birthDatePickerOpen}
              >
                <span>
                  {birthDate
                    ? formatBirthDateLabel(birthDate)
                    : 'Pilih tanggal lahir'}
                </span>
                <CalendarDays size={18} aria-hidden="true"/>
              </button>

              {birthDatePickerOpen && (
                <div className="kojac-date-picker-layer">
                  <button
                    type="button"
                    className="kojac-date-picker-backdrop"
                    aria-label="Tutup pemilih tanggal"
                    onClick={() => setBirthDatePickerOpen(false)}
                  />

                  <div
                    className="kojac-date-picker"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Pilih tanggal lahir"
                  >
                    <div className="kojac-date-picker-head">
                      <div>
                        <span>TANGGAL LAHIR</span>
                        <strong>
                          {birthDate
                            ? formatBirthDateLabel(birthDate)
                            : 'Belum dipilih'}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="kojac-date-picker-close"
                        onClick={() => setBirthDatePickerOpen(false)}
                        aria-label="Tutup"
                      >
                        ×
                      </button>
                    </div>

                    <div className="kojac-date-picker-controls">
                      <button
                        type="button"
                        className="kojac-date-nav"
                        onClick={() => changeBirthDateMonth(birthDateView.monthIndex - 1)}
                        aria-label="Bulan sebelumnya"
                      >
                        ‹
                      </button>

                      <select
                        aria-label="Pilih bulan"
                        value={birthDateView.monthIndex}
                        onChange={(event) => {
                          setBirthDateView((current) => ({
                            ...current,
                            monthIndex: Number(event.target.value),
                          }));
                        }}
                      >
                        {MONTH_LABELS.map((label, monthIndex) => (
                          <option key={label} value={monthIndex}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="Pilih tahun"
                        value={birthDateView.year}
                        onChange={(event) => {
                          setBirthDateView((current) => ({
                            ...current,
                            year: Number(event.target.value),
                          }));
                        }}
                      >
                        {Array.from(
                          { length: 101 },
                          (_, index) => new Date().getFullYear() - index,
                        ).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="kojac-date-nav"
                        onClick={() => changeBirthDateMonth(birthDateView.monthIndex + 1)}
                        aria-label="Bulan berikutnya"
                      >
                        ›
                      </button>
                    </div>

                    <div className="kojac-date-weekdays" aria-hidden="true">
                      {DAY_LABELS.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>

                    <div className="kojac-date-grid">
                      {getCalendarDays(
                        birthDateView.year,
                        birthDateView.monthIndex,
                      ).map((calendarDay) => {
                        const value = formatIsoDate(
                          calendarDay.year,
                          calendarDay.monthIndex,
                          calendarDay.day,
                        );
                        const selected = value === birthDate;
                        const disabled = value > today;

                        return (
                          <button
                            key={value}
                            type="button"
                            className={[
                              calendarDay.outside ? 'outside' : '',
                              selected ? 'selected' : '',
                            ].filter(Boolean).join(' ')}
                            disabled={disabled}
                            onClick={() => {
                              selectBirthDate(
                                calendarDay.year,
                                calendarDay.monthIndex,
                                calendarDay.day,
                              );
                            }}
                            aria-pressed={selected}
                          >
                            {calendarDay.day}
                          </button>
                        );
                      })}
                    </div>

                    <div className="kojac-date-picker-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setBirthDate('');
                          setBirthDatePickerOpen(false);
                        }}
                      >
                        Hapus
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setBirthDatePickerOpen(false)}
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="register-user-type">Tipe Pengguna</label>
              <select
                id="register-user-type"
                value={requestedUserType}
                onChange={(event) => setRequestedUserType(event.target.value as RequestedUserType)}
                disabled={busy}
              >
                <option value="">Pilih tipe pengguna</option>
                <option value="umum">Umum</option>
                <option value="siswa">Siswa</option>
              </select>
            </div>
          </>}

          <div className="auth-field auth-email-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Kata Sandi</label>
            <div className="auth-password-field">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
                disabled={busy}
              >
                {showPassword ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="register-confirm-password">Konfirmasi Kata Sandi</label>
              <div className="auth-password-field">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  disabled={busy}
                >
                  {showConfirmPassword ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}
                </button>
              </div>
            </div>
          )}

          <button className="primary-btn auth-simple-submit" disabled={busy}>
            {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>

        {message && <div className="notice auth-simple-notice" role="alert">{message}</div>}

        <button
          className="link-btn auth-simple-switch"
          type="button"
          onClick={toggleMode}
          disabled={busy}
        >
          {mode === 'login'
            ? 'Belum punya akun? Daftar'
            : 'Sudah punya akun? Masuk'}
        </button>
      </div>
    </section>
  </div>;
}
