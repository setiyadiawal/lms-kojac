import { useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export function PendingPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const blocked = profile?.is_blocked;

  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError('');

    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Gagal keluar dari KOJAC LMS', error);
      setSignOutError('Gagal keluar. Silakan coba lagi.');
      setSigningOut(false);
    }
  };

  return <div className="full-center pending-wrap">
    <div className="pending-card"><ShieldCheck size={38}/><p className="eyebrow">AKUN KOJAC</p>
      <h1>{blocked ? 'Akun sedang dibatasi' : 'Menunggu persetujuan'}</h1>
      <p>{blocked ? 'Hubungi administrator KOJAC untuk informasi lebih lanjut.' : 'Pendaftaranmu sudah tercatat. Setelah disetujui, dashboard dan materi belajar akan terbuka.'}</p>
      {signOutError && <div className="notice">{signOutError}</div>}
      <button type="button" className="ghost-btn" onClick={()=>void handleSignOut()} disabled={signingOut}><LogOut size={17}/> {signingOut ? 'Keluar...' : 'Keluar'}</button>
    </div>
  </div>;
}
