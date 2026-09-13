import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../state/AuthContext';

export function PendingPage() {
  const { profile, signOut } = useAuth();
  const blocked = profile?.is_blocked;
  return <div className="full-center pending-wrap">
    <div className="pending-card"><ShieldCheck size={38}/><p className="eyebrow">AKUN KOJAC</p>
      <h1>{blocked ? 'Akun sedang dibatasi' : 'Menunggu persetujuan'}</h1>
      <p>{blocked ? 'Hubungi administrator KOJAC untuk informasi lebih lanjut.' : 'Pendaftaranmu sudah tercatat. Setelah disetujui, dashboard dan materi belajar akan terbuka.'}</p>
      <button className="ghost-btn" onClick={()=>void signOut()}><LogOut size={17}/> Keluar</button>
    </div>
  </div>;
}
