import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, RefreshCw, ShieldCheck, Trash2, UserRoundCog, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { APP_ROLE_LABEL, APP_ROLE_RANK, USER_MANAGEMENT_ROLES, type AppRole } from '../types';

type AdminUser = {
  user_id: string;
  full_name: string | null;
  is_approved: boolean;
  is_blocked: boolean;
  role: AppRole;
  email_verified: boolean;
};

type ApprovalNotificationResult = {
  email_sent?: boolean;
  warning?: string;
};

type LoadUsersOptions = {
  silent?: boolean;
  clearMessage?: boolean;
};

function isEmailNotVerifiedError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: string; details?: string; hint?: string; code?: string };
  return [candidate.message, candidate.details, candidate.hint, candidate.code]
    .some((value) => value?.toLowerCase().includes('email_not_verified'));
}

const assignableBy: Record<AppRole, AppRole[]> = {
  umum: [],
  siswa: [],
  pengajar: [],
  staff: [],
  administrator: ['umum','siswa','pengajar','staff'],
  manager: ['umum','siswa','pengajar','staff','administrator'],
  co_founder: ['umum','siswa','pengajar','staff','administrator','manager'],
  founder: ['umum','siswa','pengajar','staff','administrator','manager','co_founder','founder'],
};

export function AdminPage() {
  const { role, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  async function loadUsers(options: LoadUsersOptions = {}) {
    const { silent = false, clearMessage = true } = options;
    if (!silent) setLoading(true);
    if (clearMessage) setMessage('');

    const { data, error } = await supabase.rpc('list_admin_users');

    if (error) {
      console.error('Gagal memuat daftar user KOJAC', error);
      setMessage('Daftar pengguna belum dapat dimuat. Silakan coba lagi.');
      if (!silent) setLoading(false);
      return null;
    }

    const nextUsers = ((data ?? []) as AdminUser[]).map((row) => ({
      ...row,
      email_verified: Boolean(row.email_verified),
    }));
    setUsers(nextUsers);
    if (!silent) setLoading(false);
    return nextUsers;
  }

  useEffect(() => {
    void loadUsers();

    const refreshOnFocus = () => {
      void loadUsers({ silent: true, clearMessage: false });
    };

    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, []);

  const pendingCount = useMemo(() => users.filter(u => u.email_verified && !u.is_approved && !u.is_blocked).length, [users]);
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
        if (isEmailNotVerifiedError(approvalError)) {
          setMessage('Email pengguna belum diverifikasi.');
          await loadUsers({ silent: true, clearMessage: false });
        } else {
          console.error('KOJAC account approval failed', approvalError);
          setMessage('Akun belum dapat disetujui. Silakan coba lagi.');
        }
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
      if (isEmailNotVerifiedError(error)) {
        setMessage('Email pengguna belum diverifikasi.');
        await loadUsers({ silent: true, clearMessage: false });
      } else {
        console.error('KOJAC approval status update failed', error);
        setMessage('Status akun belum dapat diperbarui. Silakan coba lagi.');
      }
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

  function canChangeRole(target: AdminUser) {
    if (!role || !currentUser || !USER_MANAGEMENT_ROLES.includes(role)) return false;
    if (target.user_id === currentUser.id) return false;
    if (role === 'founder') return true;
    return APP_ROLE_RANK[target.role] < APP_ROLE_RANK[role];
  }

  function canDeleteAccount(target: AdminUser) {
    if (!role || !currentUser) return false;
    if (!USER_MANAGEMENT_ROLES.includes(role)) return false;
    if (target.user_id === currentUser.id) return false;
    return APP_ROLE_RANK[target.role] < APP_ROLE_RANK[role];
  }

  function openDeleteModal(target: AdminUser) {
    if (!canDeleteAccount(target) || busyId) return;
    setDeleteConfirmation('');
    setMessage('');
    setDeleteTarget(target);
  }

  function closeDeleteModal() {
    if (deleteTarget && busyId === deleteTarget.user_id) return;
    setDeleteTarget(null);
    setDeleteConfirmation('');
  }

  async function deleteAccount() {
    if (!deleteTarget || deleteConfirmation !== 'HAPUS' || busyId) return;

    const targetId = deleteTarget.user_id;
    setBusyId(targetId);
    setMessage('');

    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { target_user_id: targetId },
    });

    const result = (data ?? {}) as { deleted?: boolean };

    if (!error && result.deleted === true) {
      await loadUsers({ silent: true, clearMessage: false });
      setDeleteTarget(null);
      setDeleteConfirmation('');
      setMessage('Akun berhasil dihapus.');
      setBusyId(null);
      return;
    }

    console.error('KOJAC account deletion failed', error ?? 'delete-user did not confirm deletion');
    const refreshedUsers = await loadUsers({ silent: true, clearMessage: false });
    const targetStillExists = refreshedUsers?.some(item => item.user_id === targetId) ?? true;

    if (!targetStillExists) {
      setDeleteTarget(null);
      setDeleteConfirmation('');
      setMessage('Akun berhasil dihapus.');
    } else {
      setMessage('Akun belum berhasil dihapus. Silakan coba lagi.');
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
        <td><span className={`status ${user.is_blocked?'blocked':user.is_approved?'approved':'pending'}`}>{user.is_blocked?'Diblokir':user.is_approved?'Aktif':!user.email_verified?'Belum Verifikasi':'Menunggu Approval'}</span></td>
        <td><select value={user.role} disabled={busyId===user.user_id || choices.length===0 || !canChangeRole(user)} onChange={e=>void changeRole(user,e.target.value as AppRole)}>{Array.from(new Set([user.role,...choices])).map(r=><option key={r} value={r}>{APP_ROLE_LABEL[r]}</option>)}</select></td>
        <td><div className="action-row">{user.email_verified && !user.is_approved && !user.is_blocked && <button className="mini ok" type="button" disabled={busyId===user.user_id} onClick={()=>void approval(user,true,false)}><Check size={15}/> Setujui</button>}{user.is_approved && !user.is_blocked && <button className="mini" type="button" disabled={busyId===user.user_id} onClick={()=>void approval(user,false,true)}><X size={15}/> Blokir</button>}{user.is_blocked && <button className="mini ok" type="button" disabled={busyId===user.user_id} onClick={()=>void approval(user,true,false)}><UserRoundCog size={15}/> Aktifkan</button>}<button className="mini" type="button" style={{ borderColor:'#e4b6bc', color:'#8f2634', background:'#fff6f7' }} disabled={busyId===user.user_id || !canDeleteAccount(user)} title={canDeleteAccount(user) ? 'Hapus akun secara permanen' : 'Anda tidak memiliki izin untuk menghapus akun ini'} onClick={()=>openDeleteModal(user)}><Trash2 size={15}/> Hapus</button></div></td>
      </tr>)}</tbody></table></div>}
    </div>

    {deleteTarget && <div
      role="presentation"
      style={{ position:'fixed', inset:0, zIndex:120, display:'grid', placeItems:'center', padding:20, background:'rgba(35,20,24,.58)' }}
      onMouseDown={(event)=>{ if (event.currentTarget === event.target) closeDeleteModal(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" style={{ width:'min(100%,520px)', background:'#fff', border:'1px solid #ead7da', borderRadius:18, padding:26, boxShadow:'0 24px 70px rgba(45,18,24,.28)' }}>
        <div style={{ width:46, height:46, borderRadius:14, display:'grid', placeItems:'center', background:'#fff0f2', color:'#962d3b', marginBottom:14 }}><AlertTriangle size={23}/></div>
        <p className="eyebrow">TINDAKAN PERMANEN</p>
        <h2 id="delete-account-title" style={{ margin:'5px 0 10px', fontSize:25 }}>Hapus akun?</h2>
        <p style={{ margin:'0 0 14px', color:'var(--muted)', lineHeight:1.6 }}>
          Akun <strong style={{ color:'var(--ink)' }}>{deleteTarget.full_name || 'Tanpa nama'}</strong> ({APP_ROLE_LABEL[deleteTarget.role]}) akan dihapus secara permanen.
        </p>
        <div style={{ padding:'12px 14px', border:'1px solid #efc9cf', background:'#fff7f8', borderRadius:11, color:'#792532', lineHeight:1.55, fontSize:13 }}>
          Semua data belajar, progress, feedback, dan enrollment milik akun ini akan dihapus. History administratif yang relevan tetap dipertahankan tanpa referensi aktif ke akun yang sudah dihapus. Tindakan ini tidak dapat dibatalkan.
        </div>

        <form onSubmit={(event)=>{ event.preventDefault(); void deleteAccount(); }} style={{ marginTop:20 }}>
          <label htmlFor="delete-account-confirmation">Untuk melanjutkan ketik <strong>HAPUS</strong></label>
          <input
            id="delete-account-confirmation"
            autoComplete="off"
            value={deleteConfirmation}
            onChange={(event)=>setDeleteConfirmation(event.target.value)}
            disabled={busyId===deleteTarget.user_id}
            placeholder="HAPUS"
            autoFocus
          />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:9, marginTop:4 }}>
            <button className="ghost-btn" type="button" disabled={busyId===deleteTarget.user_id} onClick={closeDeleteModal}>Batal</button>
            <button type="submit" disabled={deleteConfirmation !== 'HAPUS' || busyId===deleteTarget.user_id} style={{ border:0, borderRadius:10, padding:'10px 14px', fontWeight:800, background:'#962d3b', color:'#fff' }}>
              {busyId===deleteTarget.user_id ? 'Menghapus...' : 'Hapus Akun'}
            </button>
          </div>
        </form>
      </section>
    </div>}
  </div>;
}
