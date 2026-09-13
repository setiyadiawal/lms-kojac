import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

export function LoginPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!loading && user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        setMessage('Pendaftaran berhasil. Akun akan masuk ke tahap persetujuan KOJAC.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Terjadi kesalahan.');
    } finally { setBusy(false); }
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
      {message && <div className="notice">{message}</div>}
      <button className="link-btn" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?'Belum punya akun? Daftar':'Sudah punya akun? Masuk'}</button>
    </section>
  </div>;
}
