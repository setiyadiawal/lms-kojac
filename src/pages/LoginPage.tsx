import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { storePendingVerificationEmail } from '../lib/authVerification';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

export function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!loading && user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setMessage('');
    try {
      if (mode === 'register') {
        const normalizedEmail = email.trim();
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;

        storePendingVerificationEmail(normalizedEmail);
        navigate('/verify-email', { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      console.error(`KOJAC ${mode} auth failed`, error);
      setMessage(
        mode === 'login'
          ? 'Email atau password tidak valid. Periksa kembali data Anda.'
          : 'Pendaftaran belum berhasil. Periksa data Anda atau coba lagi beberapa saat.',
      );
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-screen">
    <section className="auth-copy">
      <div className="brand hero-brand"><div className="brand-mark">空</div><div><strong>KOJAC</strong><span>Kuuhaku Online Japanese Class</span></div></div>
      <h1>From Zero<br/>to <em>Japan.</em></h1>
      <p>LMS bahasa Jepang terstruktur dari huruf dasar hingga persiapan JLPT N1.</p>
      <div className="pill-row"><span>N5 → N1</span><span>Flashcard & SRS</span><span>Progress Tracking</span></div>
    </section>
    <section className="auth-card">
      <p className="eyebrow">KOJAC LMS</p>
      <h2>{mode === 'login' ? 'Selamat datang kembali' : 'Mulai belajar di KOJAC'}</h2>
      <p className="muted">{mode === 'login' ? 'Masuk ke akun pembelajaranmu.' : 'Buat akun. Persetujuan dilakukan oleh tim KOJAC.'}</p>
      <form onSubmit={submit}>
        {mode === 'register' && <label>Nama lengkap<input value={name} onChange={e=>setName(e.target.value)} required /></label>}
        <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required /></label>
        <button className="primary-btn" disabled={busy}>{busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}</button>
      </form>
      {message && <div className="notice" role="alert">{message}</div>}
      <button className="link-btn" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?'Belum punya akun? Daftar':'Sudah punya akun? Masuk'}</button>
    </section>
  </div>;
}
