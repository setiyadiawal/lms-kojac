import { useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, ShieldCheck, UserRoundCog, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type AdminUser = {
  user_id: string;
  full_name: string | null;
  is_approved: boolean;
  is_blocked: boolean;
  role: AppRole;
};

type ApprovalNotificationResult = {
  email_sent?: boolean;
  warning?: string;
};

type LoadUsersOptions = {
  silent?: boolean;
  clearMessage?: boolean;
};

const assignableBy: Record<AppRole, AppRole[]> = {
  umum: [], siswa: [], pengajar: [],
  administrator: ['umum','siswa','pengajar'],
  co_founder: ['umum','siswa','pengajar','administrator'],
  founder: ['umum','siswa','pengajar','administrator','co_founder','founder'],
};

export function AdminPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function loadUsers(options: LoadUsersOptions = {}) {
    const { silent = false, clearMessage = true } = options;
    if (!silent) setLoading(true);
    if (clearMessage) setMessage('');

    const [profiles, roles] = await Promise.all([
      supabase.from('profiles').select('user_id,full_name,is_approved,is_blocked').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id,role'),
    ]);

    if (profiles.error || roles.error) {
      console.error('Gagal memuat daftar user KOJAC', profiles.error ?? roles.error);
      setMessage('Daftar pengguna belum dapat dimuat. Silakan coba lagi.');
      if (!silent) setLoading(false);
      return;
    }

    const roleMap = new Map((roles.data ?? []).map(row => [row.user_id, row.role as AppRole]));
    setUsers((profiles.data ?? []).map(row => ({ ...row, role: roleMap.get(row.user_id) ?? 'umum' })));
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    void loadUsers();

    const refreshOnFocus = () => {
      void loadUsers({ silent: true, clearMessage: false });
    };

    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, []);

  const pendingCount = useMemo(() => users.filter(u => !u.is_approved && !u.is_blocked).length, [users]);
  const choices = role ? assignableBy[role] : [];

  async function approval(user: AdminUser, approved: boolean, blocked: boolean) {
    if (busyId) return;
    setBusyId(user.user_id);
    setMessage('');

    const isInitialApproval = approved && !blocked && !user.is_approved && !user.is_blocked;

    if (isInitialApproval) {
      const { error: approvalError } = await supabase.rpc('set_user_approval', {
        p_target_user: user.user_id,
        p_approved: true,
        p_blocked: false,
      });

      if (approvalError) {
        console.error('KOJAC account approval failed', approvalError);
        setMessage('Akun belum dapat disetujui. Silakan coba lagi.');
        setBusyId(null);
        return;
      }

      // Approval database adalah source of truth. Update lokal dulu supaya UI tidak
      // bergantung pada keberhasilan email notification, lalu sinkronkan dari DB.
      setUsers(current => current.map(item => item.user_id === user.user_id
        ? {
            ...item,
            is_approved: true,
            is_blocked: false,
            role: item.role === 'umum' ? 'siswa' : item.role,
          }
        : item));

      await loadUsers({ silent: true, clearMessage: false });

      const { data, error: notificationError } = await supabase.functions.invoke('approve-user-notify', {
        body: { target_user_id: user.user_id },
      });

      const result = (data ?? {}) as ApprovalNotificationResult;
      if (notificationError || result.email_sent !== true) {
        console.error('KOJAC approval notification failed', notificationError ?? result.warning ?? 'unknown notification failure');
        setMessage('Akun berhasil disetujui, tetapi email pemberitahuan belum berhasil dikirim.');
      } else {
        setMessage('Akun berhasil disetujui dan email pemberitahuan telah dikirim.');
      }

      setBusyId(null);
      return;
    }

    const { error } = await supabase.rpc('set_user_approval', {
      p_target_user: user.user_id,
      p_approved: approved,
      p_blocked: blocked,
    });

    if (error) {
      console.error('KOJAC approval status update failed', error);
      setMessage('Status akun belum dapat diperbarui. Silakan coba lagi.');
    } else {
      await loadUsers({ silent: true, clearMessage: false });
    }
    setBusyId(null);
  }

  async function changeRole(user: AdminUser, nextRole: AppRole) {
    if (nextRole === user.role || busyId) return;
    setBusyId(user.user_id); setMessage('');
    const { error } = await supabase.rpc('set_user_role', {
      p_target_user: user.user_id,
      p_new_role: nextRole,
    });
    if (error) {
      console.error('KOJAC role update failed', error);
      setMessage('Role pengguna belum dapat diperbarui. Silakan coba lagi.');
    } else {
      await loadUsers({ silent: true, clearMessage: false });
    }
    setBusyId(null);
  }

  return <div className="page">
    <div className="page-header">
      <div><p className="eyebrow">ADMINISTRATION</p><h1 className="title-icon"><ShieldCheck/>User Management</h1><p>Approval, blokir akun, dan role dikontrol oleh RPC aman di database.</p></div>
      <button className="ghost-btn" type="button" onClick={()=>void loadUsers()}><RefreshCw size={16}/> Muat ulang</button>
    </div>
    <div className="admin-summary"><div><strong>{users.length}</strong><span>Total akun</span></div><div><strong>{pendingCount}</strong><span>Menunggu approval</span></div><div><strong>{users.filter(u=>u.is_blocked).length}</strong><span>Diblokir</span></div></div>
    {message && <div className="notice">{message}</div>}
    <div className="table-card">
      {loading ? <div className="table-empty">Memuat pengguna…</div> : users.length===0 ? <div className="table-empty">Belum ada akun.</div> :
      <div className="table-scroll"><table><thead><tr><th>Nama</th><th>Status</th><th>Role</th><th>Aksi</th></tr></thead><tbody>{users.map(user=><tr key={user.user_id}>
        <td><strong>{user.full_name || 'Tanpa nama'}</strong><small>{user.user_id.slice(0,8)}…</small></td>
        <td><span className={`status ${user.is_blocked?'blocked':user.is_approved?'approved':'pending'}`}>{user.is_blocked?'Diblokir':user.is_approved?'Aktif':'Pending'}</span></td>
        <td><select value={user.role} disabled={busyId===user.user_id || choices.length===0} onChange={e=>void changeRole(user,e.target.value as AppRole)}>{Array.from(new Set([user.role,...choices])).map(r=><option key={r} value={r}>{r}</option>)}</select></td>
        <td><div className="action-row">{!user.is_approved && !user.is_blocked && <button className="mini ok" type="button" disabled={busyId===user.user_id} onClick={()=>void approval(user,true,false)}><Check size={15}/> Setujui</button>}{user.is_approved && !user.is_blocked && <button className="mini" type="button" disabled={busyId===user.user_id} onClick={()=>void approval(user,false,true)}><X size={15}/> Blokir</button>}{user.is_blocked && <button className="mini ok" type="button" disabled={busyId===user.user_id} onClick={()=>void approval(user,true,false)}><UserRoundCog size={15}/> Aktifkan</button>}</div></td>
      </tr>)}</tbody></table></div>}
    </div>
  </div>;
}
