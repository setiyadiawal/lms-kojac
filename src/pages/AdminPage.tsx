import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Eye,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  School,
  ShieldCheck,
  Trash2,
  UserRoundCog,
  UsersRound,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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

type ProgramRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ClassRow = {
  id: string;
  program_id: string | null;
  code: string | null;
  name: string;
  description: string | null;
  teacher_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  created_at: string;
};

type StudentEnrollmentDetail = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: ClassRow['status'];
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  starts_on: string | null;
  ends_on: string | null;
  joined_at: string;
  completed_at: string | null;
  enrollment_status: 'active' | 'paused' | 'completed' | 'cancelled';
};

type TeachingClassDetail = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: ClassRow['status'];
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  starts_on: string | null;
  ends_on: string | null;
  student_count: number;
};

type AdminUserDetail = {
  profile: {
    user_id: string;
    full_name: string | null;
    nickname: string | null;
    email: string | null;
    birth_date: string | null;
  };
  account: {
    email_verified: boolean;
    is_approved: boolean;
    is_blocked: boolean;
  };
  role: AppRole;
  enrollments: StudentEnrollmentDetail[];
  teaching_classes: TeachingClassDetail[];
};

type ProgramForm = {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
};

type ClassForm = {
  program_id: string;
  code: string;
  name: string;
  description: string;
  teacher_id: string;
  starts_on: string;
  ends_on: string;
  status: ClassRow['status'];
};

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);
const TEACHER_ROLES = new Set<AppRole>(['pengajar', 'administrator', 'manager', 'co_founder', 'founder']);
const ENROLLMENT_STATUSES: StudentEnrollmentDetail['enrollment_status'][] = ['active', 'paused', 'completed', 'cancelled'];
const CLASS_STATUSES: ClassRow['status'][] = ['planned', 'active', 'completed', 'cancelled'];

const emptyProgramForm: ProgramForm = { code: '', name: '', description: '', is_active: true };
const emptyClassForm: ClassForm = {
  program_id: '',
  code: '',
  name: '',
  description: '',
  teacher_id: '',
  starts_on: '',
  ends_on: '',
  status: 'planned',
};

const modalBackdropStyle = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 120,
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  background: 'rgba(35,20,24,.58)',
};

const modalCardStyle = {
  width: 'min(100%,760px)',
  maxHeight: '92vh',
  overflowY: 'auto' as const,
  background: '#fff',
  border: '1px solid #ead7da',
  borderRadius: 18,
  padding: 26,
  boxShadow: '0 24px 70px rgba(45,18,24,.28)',
};

function isEmailNotVerifiedError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: string; details?: string; hint?: string; code?: string };
  return [candidate.message, candidate.details, candidate.hint, candidate.code]
    .some((value) => value?.toLowerCase().includes('email_not_verified'));
}

function errorContains(error: unknown, marker: string) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: string; details?: string; hint?: string; code?: string };
  return [candidate.message, candidate.details, candidate.hint, candidate.code]
    .some((value) => value?.toLowerCase().includes(marker.toLowerCase()));
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    active: 'Aktif',
    paused: 'Dijeda',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    planned: 'Direncanakan',
  };
  return labels[value] ?? value;
}

const assignableBy: Record<AppRole, AppRole[]> = {
  umum: [],
  siswa: [],
  pengajar: [],
  staff: [],
  administrator: ['umum','siswa','pengajar'],
  manager: ['umum','siswa','pengajar','administrator'],
  co_founder: ['umum','siswa','pengajar','administrator','manager'],
  founder: ['umum','siswa','pengajar','administrator','manager','co_founder','founder'],
};

export function AdminPage() {
  const { role, user: currentUser } = useAuth();
  const [section, setSection] = useState<'users' | 'catalog'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [detailTarget, setDetailTarget] = useState<AdminUser | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState('');
  const [newEnrollmentClassId, setNewEnrollmentClassId] = useState('');
  const [enrollmentBusy, setEnrollmentBusy] = useState(false);

  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState('');

  const [programEditorOpen, setProgramEditorOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramRow | null>(null);
  const [programForm, setProgramForm] = useState<ProgramForm>(emptyProgramForm);
  const [programSaving, setProgramSaving] = useState(false);

  const [classEditorOpen, setClassEditorOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [classForm, setClassForm] = useState<ClassForm>(emptyClassForm);
  const [classSaving, setClassSaving] = useState(false);

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

  async function loadCatalog(options: { silent?: boolean } = {}) {
    if (!options.silent) setCatalogLoading(true);
    setCatalogMessage('');

    const [programResult, classResult] = await Promise.all([
      supabase
        .from('programs')
        .select('id,code,name,description,is_active,created_at,updated_at')
        .order('name', { ascending: true }),
      supabase
        .from('classes')
        .select('id,program_id,code,name,description,teacher_id,starts_on,ends_on,is_active,status,created_at')
        .order('created_at', { ascending: false }),
    ]);

    if (programResult.error || classResult.error) {
      console.error('KOJAC program/class catalog load failed', programResult.error ?? classResult.error);
      setCatalogMessage('Data program dan kelas belum dapat dimuat. Silakan coba lagi.');
      if (!options.silent) setCatalogLoading(false);
      return false;
    }

    setPrograms((programResult.data ?? []) as ProgramRow[]);
    setClasses((classResult.data ?? []) as ClassRow[]);
    setCatalogLoaded(true);
    if (!options.silent) setCatalogLoading(false);
    return true;
  }

  useEffect(() => {
    void loadUsers();

    const refreshOnFocus = () => {
      void loadUsers({ silent: true, clearMessage: false });
      if (catalogLoaded) void loadCatalog({ silent: true });
    };

    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [catalogLoaded]);

  useEffect(() => {
    if (section === 'catalog' && !catalogLoaded && !catalogLoading) void loadCatalog();
  }, [section, catalogLoaded, catalogLoading]);

  const pendingCount = useMemo(() => users.filter(u => u.email_verified && !u.is_approved && !u.is_blocked).length, [users]);
  const choices = role ? assignableBy[role] : [];
  const teacherOptions = useMemo(() => users.filter((user) => TEACHER_ROLES.has(user.role)), [users]);
  const teacherNameById = useMemo(() => new Map(users.map((user) => [user.user_id, user.full_name || APP_ROLE_LABEL[user.role]])), [users]);
  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);

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

      setUsers(current => current.map(item => item.user_id === user.user_id
        ? { ...item, is_approved: true, is_blocked: false }
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
      if (errorContains(error, 'active_student_enrollments_exist')) {
        setMessage('Role belum dapat diubah karena siswa masih memiliki kelas aktif.');
      } else if (errorContains(error, 'active_teaching_assignments_exist')) {
        setMessage('Role belum dapat diubah karena pengguna masih menjadi pengajar pada kelas aktif.');
      } else if (errorContains(error, 'staff_role_inactive')) {
        setMessage('Role Staff sedang tidak digunakan di KOJAC.');
      } else {
        console.error('KOJAC role update failed', error);
        setMessage('Role pengguna belum dapat diperbarui. Silakan coba lagi.');
      }
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

  function canViewUserDetail(target: AdminUser) {
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

  async function loadUserDetail(target: AdminUser) {
    if (!canViewUserDetail(target)) return;
    setDetailTarget(target);
    setDetail(null);
    setDetailMessage('');
    setNewEnrollmentClassId('');
    setDetailLoading(true);

    const detailPromise = supabase.rpc('get_admin_user_detail', { p_target_user: target.user_id });
    const catalogPromise = target.role === 'siswa' && !catalogLoaded
      ? loadCatalog({ silent: true })
      : Promise.resolve(true);

    const [{ data, error }] = await Promise.all([detailPromise, catalogPromise]);

    if (error) {
      if (errorContains(error, 'target_detail_not_allowed')) {
        setDetailMessage('Anda tidak memiliki izin untuk melihat detail pengguna ini.');
      } else {
        console.error('KOJAC admin user detail load failed', error);
        setDetailMessage('Detail pengguna belum dapat dimuat. Silakan coba lagi.');
      }
      setDetailLoading(false);
      return;
    }

    setDetail(data as AdminUserDetail);
    setDetailLoading(false);
  }

  function closeUserDetail() {
    if (enrollmentBusy) return;
    setDetailTarget(null);
    setDetail(null);
    setDetailMessage('');
    setNewEnrollmentClassId('');
  }

  async function refreshUserDetail() {
    if (!detailTarget) return;
    const { data, error } = await supabase.rpc('get_admin_user_detail', { p_target_user: detailTarget.user_id });
    if (error) {
      console.error('KOJAC admin user detail refresh failed', error);
      setDetailMessage('Detail pengguna belum dapat diperbarui. Silakan coba lagi.');
      return;
    }
    setDetail(data as AdminUserDetail);
  }

  async function saveEnrollment(classId: string, enrollmentStatus: StudentEnrollmentDetail['enrollment_status']) {
    if (!detailTarget || detailTarget.role !== 'siswa' || enrollmentBusy) return;
    setEnrollmentBusy(true);
    setDetailMessage('');

    const { error } = await supabase.rpc('set_class_enrollment', {
      p_class_id: classId,
      p_user_id: detailTarget.user_id,
      p_status: enrollmentStatus,
    });

    if (error) {
      if (errorContains(error, 'class_not_open_for_enrollment')) {
        setDetailMessage('Enrollment belum dapat diaktifkan karena kelas sudah selesai atau dibatalkan.');
      } else if (errorContains(error, 'student_blocked')) {
        setDetailMessage('Enrollment belum dapat diaktifkan karena akun siswa sedang diblokir.');
      } else if (errorContains(error, 'student_not_active')) {
        setDetailMessage('Enrollment belum dapat diaktifkan karena akun siswa belum aktif/disetujui.');
      } else if (errorContains(error, 'target_must_be_siswa')) {
        setDetailMessage('Enrollment hanya dapat diberikan kepada akun dengan role Siswa.');
      } else if (errorContains(error, 'enrollment_not_found')) {
        setDetailMessage('Enrollment historis tidak ditemukan.');
      } else {
        console.error('KOJAC enrollment update failed', error);
        setDetailMessage('Enrollment belum dapat diperbarui. Silakan coba lagi.');
      }
    } else {
      setDetailMessage('Enrollment berhasil diperbarui.');
      setNewEnrollmentClassId('');
      await refreshUserDetail();
    }
    setEnrollmentBusy(false);
  }

  function openProgramEditor(program?: ProgramRow) {
    setEditingProgram(program ?? null);
    setProgramForm(program ? {
      code: program.code,
      name: program.name,
      description: program.description ?? '',
      is_active: program.is_active,
    } : emptyProgramForm);
    setCatalogMessage('');
    setProgramEditorOpen(true);
  }

  async function saveProgram() {
    if (programSaving) return;
    const code = programForm.code.trim();
    const name = programForm.name.trim();
    if (!code || !name) {
      setCatalogMessage('Kode dan nama program wajib diisi.');
      return;
    }

    setProgramSaving(true);
    setCatalogMessage('');
    const result = editingProgram
      ? await supabase.rpc('update_program', {
          p_program_id: editingProgram.id,
          p_code: code,
          p_name: name,
          p_description: programForm.description,
          p_is_active: programForm.is_active,
        })
      : await supabase.rpc('create_program', {
          p_code: code,
          p_name: name,
          p_description: programForm.description,
        });

    if (result.error) {
      console.error('KOJAC program save failed', result.error);
      setCatalogMessage(errorContains(result.error, 'program_code_exists')
        ? 'Kode program sudah digunakan.'
        : 'Program belum dapat disimpan. Silakan coba lagi.');
    } else {
      setProgramEditorOpen(false);
      setCatalogMessage(editingProgram ? 'Program berhasil diperbarui.' : 'Program berhasil dibuat.');
      await loadCatalog({ silent: true });
    }
    setProgramSaving(false);
  }

  async function toggleProgram(program: ProgramRow) {
    if (busyId) return;
    setBusyId(program.id);
    setCatalogMessage('');
    const { error } = await supabase.rpc('update_program', {
      p_program_id: program.id,
      p_code: program.code,
      p_name: program.name,
      p_description: program.description,
      p_is_active: !program.is_active,
    });
    if (error) {
      console.error('KOJAC program activation update failed', error);
      setCatalogMessage('Status program belum dapat diperbarui. Silakan coba lagi.');
    } else {
      setCatalogMessage(program.is_active ? 'Program dinonaktifkan.' : 'Program diaktifkan.');
      await loadCatalog({ silent: true });
    }
    setBusyId(null);
  }

  function openClassEditor(classRow?: ClassRow) {
    setEditingClass(classRow ?? null);
    setClassForm(classRow ? {
      program_id: classRow.program_id ?? '',
      code: classRow.code ?? '',
      name: classRow.name,
      description: classRow.description ?? '',
      teacher_id: classRow.teacher_id ?? '',
      starts_on: classRow.starts_on ?? '',
      ends_on: classRow.ends_on ?? '',
      status: classRow.status,
    } : emptyClassForm);
    setCatalogMessage('');
    setClassEditorOpen(true);
  }

  async function saveClass() {
    if (classSaving) return;
    if (!classForm.program_id || !classForm.teacher_id || !classForm.name.trim()) {
      setCatalogMessage('Program, nama kelas, dan pengajar wajib diisi.');
      return;
    }
    if (classForm.starts_on && classForm.ends_on && classForm.ends_on < classForm.starts_on) {
      setCatalogMessage('Tanggal selesai kelas tidak boleh sebelum tanggal mulai.');
      return;
    }

    setClassSaving(true);
    setCatalogMessage('');
    const args = {
      p_program_id: classForm.program_id,
      p_code: classForm.code,
      p_name: classForm.name.trim(),
      p_description: classForm.description,
      p_teacher_id: classForm.teacher_id,
      p_starts_on: classForm.starts_on || null,
      p_ends_on: classForm.ends_on || null,
      p_status: classForm.status,
    };
    const result = editingClass
      ? await supabase.rpc('update_class', { p_class_id: editingClass.id, ...args })
      : await supabase.rpc('create_class', args);

    if (result.error) {
      console.error('KOJAC class save failed', result.error);
      if (errorContains(result.error, 'class_code_exists')) setCatalogMessage('Kode kelas sudah digunakan.');
      else if (errorContains(result.error, 'teacher_not_eligible')) setCatalogMessage('Akun yang dipilih tidak dapat menjadi pengajar kelas.');
      else if (errorContains(result.error, 'invalid_class_dates')) setCatalogMessage('Periode kelas tidak valid.');
      else setCatalogMessage('Kelas belum dapat disimpan. Silakan coba lagi.');
    } else {
      setClassEditorOpen(false);
      setCatalogMessage(editingClass ? 'Kelas berhasil diperbarui.' : 'Kelas berhasil dibuat.');
      await loadCatalog({ silent: true });
      if (detailTarget) await refreshUserDetail();
    }
    setClassSaving(false);
  }

  const availableEnrollmentClasses = useMemo(() => {
    const isOpenForEnrollment = (classRow: ClassRow) => classRow.status === 'planned' || classRow.status === 'active';
    if (!detail) return classes.filter(isOpenForEnrollment);
    const enrolled = new Set(detail.enrollments.map((enrollment) => enrollment.class_id));
    return classes.filter((classRow) => isOpenForEnrollment(classRow) && !enrolled.has(classRow.id));
  }, [classes, detail]);

  return <div className="page">
    <div className="page-header">
      <div>
        <p className="eyebrow">ADMINISTRATION</p>
        <h1 className="title-icon"><ShieldCheck/>User & Class Management</h1>
        <p>Role, approval, program, kelas, dan enrollment dikontrol oleh database KOJAC.</p>
      </div>
      <button className="ghost-btn" type="button" onClick={()=>{
        if (section === 'users') void loadUsers();
        else void loadCatalog();
      }}><RefreshCw size={16}/> Muat ulang</button>
    </div>

    <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
      <button className={section === 'users' ? 'primary-btn' : 'ghost-btn'} type="button" onClick={()=>setSection('users')}><UsersRound size={16}/> Pengguna</button>
      <button className={section === 'catalog' ? 'primary-btn' : 'ghost-btn'} type="button" onClick={()=>setSection('catalog')}><School size={16}/> Program & Kelas</button>
    </div>

    {section === 'users' ? <>
      <div className="admin-summary"><div><strong>{users.length}</strong><span>Total akun</span></div><div><strong>{pendingCount}</strong><span>Menunggu approval</span></div><div><strong>{users.filter(u=>u.is_blocked).length}</strong><span>Diblokir</span></div></div>
      {message && <div className="notice">{message}</div>}
      <div className="table-card">
        {loading ? <div className="table-empty">Memuat pengguna…</div> : users.length===0 ? <div className="table-empty">Belum ada akun.</div> :
        <div className="table-scroll"><table><thead><tr><th>Nama</th><th>Status</th><th>Role</th><th>Detail</th><th>Aksi</th></tr></thead><tbody>{users.map(user=><tr key={user.user_id}>
          <td><strong>{user.full_name || 'Tanpa nama'}</strong><small>{user.user_id.slice(0,8)}…</small></td>
          <td><span className={`status ${user.is_blocked?'blocked':user.is_approved?'approved':'pending'}`}>{user.is_blocked?'Diblokir':user.is_approved?'Aktif':!user.email_verified?'Belum Verifikasi':'Menunggu Approval'}</span></td>
          <td><select value={user.role} disabled={busyId===user.user_id || choices.length===0 || !canChangeRole(user)} onChange={e=>void changeRole(user,e.target.value as AppRole)}>{Array.from(new Set([user.role,...choices])).map(r=><option key={r} value={r}>{APP_ROLE_LABEL[r]}</option>)}</select></td>
          <td><button className="mini" type="button" disabled={busyId===user.user_id || !canViewUserDetail(user)} title={canViewUserDetail(user) ? 'Lihat detail pengguna' : 'Anda tidak memiliki izin untuk melihat detail pengguna ini'} onClick={()=>void loadUserDetail(user)}><Eye size={15}/> Lihat Detail</button></td>
          <td><div className="action-row">{user.email_verified && !user.is_approved && !user.is_blocked && <button className="mini ok" type="button" disabled={busyId===user.user_id} onClick={()=>void approval(user,true,false)}><Check size={15}/> Setujui</button>}{user.is_approved && !user.is_blocked && <button className="mini" type="button" disabled={busyId===user.user_id} onClick={()=>void approval(user,false,true)}><X size={15}/> Blokir</button>}{user.is_blocked && <button className="mini ok" type="button" disabled={busyId===user.user_id} onClick={()=>void approval(user,true,false)}><UserRoundCog size={15}/> Aktifkan</button>}<button className="mini" type="button" style={{ borderColor:'#e4b6bc', color:'#8f2634', background:'#fff6f7' }} disabled={busyId===user.user_id || !canDeleteAccount(user)} title={canDeleteAccount(user) ? 'Hapus akun secara permanen' : 'Anda tidak memiliki izin untuk menghapus akun ini'} onClick={()=>openDeleteModal(user)}><Trash2 size={15}/> Hapus</button></div></td>
        </tr>)}</tbody></table></div>}
      </div>
    </> : <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:14 }}>
        <div><h2 style={{ margin:0 }}>Program & Kelas</h2><p style={{ margin:'5px 0 0', color:'var(--muted)' }}>Program adalah jenis layanan; kelas adalah instance nyata yang memiliki pengajar dan periode.</p></div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="ghost-btn" type="button" onClick={()=>openProgramEditor()}><Plus size={16}/> Program</button>
          <button className="primary-btn" type="button" disabled={programs.length===0 || teacherOptions.length===0} onClick={()=>openClassEditor()}><Plus size={16}/> Kelas</button>
        </div>
      </div>
      {catalogMessage && <div className="notice">{catalogMessage}</div>}
      {catalogLoading ? <div className="table-card"><div className="table-empty">Memuat program dan kelas…</div></div> : <>
        <div className="table-card" style={{ marginBottom:18 }}>
          <div style={{ padding:'16px 18px 0' }}><h3 style={{ margin:0 }}>Program</h3></div>
          {programs.length===0 ? <div className="table-empty">Belum ada program. Buat program pertama untuk mulai membuat kelas.</div> : <div className="table-scroll"><table><thead><tr><th>Kode</th><th>Program</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{programs.map(program=><tr key={program.id}>
            <td><strong>{program.code}</strong></td>
            <td><strong>{program.name}</strong><small>{program.description || 'Tanpa deskripsi'}</small></td>
            <td><span className={`status ${program.is_active?'approved':'blocked'}`}>{program.is_active?'Aktif':'Nonaktif'}</span></td>
            <td><div className="action-row"><button className="mini" type="button" onClick={()=>openProgramEditor(program)}><Pencil size={15}/> Edit</button><button className="mini" type="button" disabled={busyId===program.id} onClick={()=>void toggleProgram(program)}>{program.is_active?'Nonaktifkan':'Aktifkan'}</button></div></td>
          </tr>)}</tbody></table></div>}
        </div>

        <div className="table-card">
          <div style={{ padding:'16px 18px 0' }}><h3 style={{ margin:0 }}>Kelas</h3></div>
          {classes.length===0 ? <div className="table-empty">Belum ada kelas.</div> : <div className="table-scroll"><table><thead><tr><th>Kelas</th><th>Program</th><th>Pengajar</th><th>Periode</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{classes.map(classRow=><tr key={classRow.id}>
            <td><strong>{classRow.name}</strong><small>{classRow.code || 'Tanpa kode'}</small></td>
            <td>{classRow.program_id ? programById.get(classRow.program_id)?.name || 'Program tidak ditemukan' : '—'}</td>
            <td>{classRow.teacher_id ? teacherNameById.get(classRow.teacher_id) || 'Pengajar tidak ditemukan' : '—'}</td>
            <td><small>{formatDate(classRow.starts_on)} — {formatDate(classRow.ends_on)}</small></td>
            <td><span className={`status ${classRow.status==='active'?'approved':classRow.status==='cancelled'?'blocked':'pending'}`}>{statusLabel(classRow.status)}</span></td>
            <td><div className="action-row"><button className="mini" type="button" onClick={()=>openClassEditor(classRow)}><Pencil size={15}/> Edit</button><Link className="mini" to={`/kelas-mengajar/${classRow.id}/laporan`}><FileText size={15}/> Laporan</Link></div></td>
          </tr>)}</tbody></table></div>}
        </div>
      </>}
    </>}

    {detailTarget && <div role="presentation" style={modalBackdropStyle} onMouseDown={(event)=>{ if (event.currentTarget===event.target) closeUserDetail(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="user-detail-title" style={modalCardStyle}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'start' }}>
          <div><p className="eyebrow">USER DETAIL</p><h2 id="user-detail-title" style={{ margin:'5px 0 6px' }}>{detailTarget.full_name || 'Tanpa nama'}</h2><p style={{ margin:0, color:'var(--muted)' }}>{APP_ROLE_LABEL[detailTarget.role]}</p></div>
          <button className="ghost-btn" type="button" onClick={closeUserDetail}><X size={17}/> Tutup</button>
        </div>
        {detailMessage && <div className="notice" style={{ marginTop:16 }}>{detailMessage}</div>}
        {detailLoading ? <div className="table-empty">Memuat detail pengguna…</div> : detail ? <div style={{ display:'grid', gap:18, marginTop:20 }}>
          <section>
            <h3 style={{ margin:'0 0 10px' }}>Profile</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
              <div className="table-card" style={{ padding:14 }}><small>Nama Lengkap</small><strong style={{ display:'block', marginTop:5 }}>{detail.profile.full_name || '—'}</strong></div>
              <div className="table-card" style={{ padding:14 }}><small>Nama Panggilan</small><strong style={{ display:'block', marginTop:5 }}>{detail.profile.nickname || '—'}</strong></div>
              <div className="table-card" style={{ padding:14 }}><small>Email</small><strong style={{ display:'block', marginTop:5, wordBreak:'break-word' }}>{detail.profile.email || '—'}</strong></div>
              <div className="table-card" style={{ padding:14 }}><small>Tanggal Lahir</small><strong style={{ display:'block', marginTop:5 }}>{formatDate(detail.profile.birth_date)}</strong></div>
            </div>
          </section>
          <section>
            <h3 style={{ margin:'0 0 10px' }}>Account & Access</h3>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <span className={`status ${detail.account.email_verified?'approved':'pending'}`}>{detail.account.email_verified?'Email Verified':'Belum Verifikasi'}</span>
              <span className={`status ${detail.account.is_approved?'approved':'pending'}`}>{detail.account.is_approved?'Approved':'Belum Approval'}</span>
              <span className={`status ${detail.account.is_blocked?'blocked':'approved'}`}>{detail.account.is_blocked?'Blocked':'Active'}</span>
              <span className="status pending">{APP_ROLE_LABEL[detail.role]}</span>
            </div>
          </section>

          {detail.role === 'siswa' && <section>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:10 }}><h3 style={{ margin:0 }}>Data Akademik</h3><span style={{ color:'var(--muted)', fontSize:13 }}>{detail.enrollments.length} enrollment</span></div>
            <div className="table-card" style={{ marginBottom:12 }}>
              {detail.enrollments.length===0 ? <div className="table-empty">Siswa belum mengikuti kelas.</div> : <div className="table-scroll"><table><thead><tr><th>Program / Kelas</th><th>Pengajar</th><th>Mulai</th><th>Bergabung</th><th>Status</th></tr></thead><tbody>{detail.enrollments.map(enrollment=><tr key={enrollment.class_id}>
                <td><strong>{enrollment.program_name || 'Tanpa program'}</strong><small>{enrollment.class_name}</small></td>
                <td>{enrollment.teacher_name || '—'}</td>
                <td>{formatDate(enrollment.starts_on)}</td>
                <td>{formatDateTime(enrollment.joined_at)}</td>
                <td><select value={enrollment.enrollment_status} disabled={enrollmentBusy} onChange={(event)=>void saveEnrollment(enrollment.class_id,event.target.value as StudentEnrollmentDetail['enrollment_status'])}>{ENROLLMENT_STATUSES.map(status=><option key={status} value={status}>{statusLabel(status)}</option>)}</select></td>
              </tr>)}</tbody></table></div>}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'end', flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 260px' }}><label htmlFor="enroll-class">Tambahkan kelas</label><select id="enroll-class" value={newEnrollmentClassId} disabled={enrollmentBusy || availableEnrollmentClasses.length===0} onChange={(event)=>setNewEnrollmentClassId(event.target.value)}><option value="">Pilih kelas</option>{availableEnrollmentClasses.map(classRow=><option key={classRow.id} value={classRow.id}>{programById.get(classRow.program_id ?? '')?.name || 'Program'} — {classRow.name}</option>)}</select></div>
              <button className="primary-btn" type="button" disabled={!newEnrollmentClassId || enrollmentBusy} onClick={()=>void saveEnrollment(newEnrollmentClassId,'active')}><Plus size={16}/> Enroll Siswa</button>
            </div>
          </section>}

          {detail.role === 'pengajar' && <section>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, marginBottom:10 }}><h3 style={{ margin:0 }}>Kelas yang Diajar</h3><span style={{ color:'var(--muted)', fontSize:13 }}>{detail.teaching_classes.length} kelas</span></div>
            <div className="table-card">{detail.teaching_classes.length===0 ? <div className="table-empty">Belum ada kelas yang ditugaskan.</div> : <div className="table-scroll"><table><thead><tr><th>Kelas</th><th>Program</th><th>Status</th><th>Siswa</th><th>Periode</th></tr></thead><tbody>{detail.teaching_classes.map(classRow=><tr key={classRow.class_id}>
              <td><strong>{classRow.class_name}</strong><small>{classRow.class_code || 'Tanpa kode'}</small></td>
              <td>{classRow.program_name || '—'}</td>
              <td>{statusLabel(classRow.class_status)}</td>
              <td>{classRow.student_count}</td>
              <td>{formatDate(classRow.starts_on)} — {formatDate(classRow.ends_on)}</td>
            </tr>)}</tbody></table></div>}</div>
          </section>}

          {detail.role === 'staff' && <section><div className="notice">Staff tetap terpisah dari data akademik siswa/pengajar. Department atau permission khusus belum dibuat pada Phase 2B.</div></section>}
        </div> : null}
      </section>
    </div>}

    {programEditorOpen && <div role="presentation" style={modalBackdropStyle} onMouseDown={(event)=>{ if (event.currentTarget===event.target && !programSaving) setProgramEditorOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="program-editor-title" style={{ ...modalCardStyle, width:'min(100%,560px)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'start' }}><div><p className="eyebrow">PROGRAM</p><h2 id="program-editor-title" style={{ margin:'5px 0 0' }}>{editingProgram?'Edit Program':'Buat Program'}</h2></div><button className="ghost-btn" type="button" disabled={programSaving} onClick={()=>setProgramEditorOpen(false)}><X size={17}/> Tutup</button></div>
        <form onSubmit={(event)=>{ event.preventDefault(); void saveProgram(); }} style={{ display:'grid', gap:14, marginTop:20 }}>
          <label>Kode Program<input value={programForm.code} disabled={programSaving} onChange={(event)=>setProgramForm(current=>({...current,code:event.target.value}))} placeholder="SP-N4" /></label>
          <label>Nama Program<input value={programForm.name} disabled={programSaving} onChange={(event)=>setProgramForm(current=>({...current,name:event.target.value}))} placeholder="Semi Privat 0–N4/JFT A2" /></label>
          <label>Deskripsi<textarea value={programForm.description} disabled={programSaving} onChange={(event)=>setProgramForm(current=>({...current,description:event.target.value}))} rows={4} /></label>
          {editingProgram && <label style={{ display:'flex', gap:9, alignItems:'center' }}><input type="checkbox" checked={programForm.is_active} disabled={programSaving} onChange={(event)=>setProgramForm(current=>({...current,is_active:event.target.checked}))} /> Program aktif</label>}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}><button className="ghost-btn" type="button" disabled={programSaving} onClick={()=>setProgramEditorOpen(false)}>Batal</button><button className="primary-btn" type="submit" disabled={programSaving}>{programSaving?'Menyimpan...':'Simpan Program'}</button></div>
        </form>
      </section>
    </div>}

    {classEditorOpen && <div role="presentation" style={modalBackdropStyle} onMouseDown={(event)=>{ if (event.currentTarget===event.target && !classSaving) setClassEditorOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="class-editor-title" style={{ ...modalCardStyle, width:'min(100%,640px)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'start' }}><div><p className="eyebrow">CLASS</p><h2 id="class-editor-title" style={{ margin:'5px 0 0' }}>{editingClass?'Edit Kelas':'Buat Kelas'}</h2></div><button className="ghost-btn" type="button" disabled={classSaving} onClick={()=>setClassEditorOpen(false)}><X size={17}/> Tutup</button></div>
        <form onSubmit={(event)=>{ event.preventDefault(); void saveClass(); }} style={{ display:'grid', gap:14, marginTop:20 }}>
          <label>Program<select value={classForm.program_id} disabled={classSaving} onChange={(event)=>setClassForm(current=>({...current,program_id:event.target.value}))}><option value="">Pilih program</option>{programs.map(program=><option key={program.id} value={program.id}>{program.name}{program.is_active?'':' (Nonaktif)'}</option>)}</select></label>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,2fr)', gap:12 }}><label>Kode Kelas<input value={classForm.code} disabled={classSaving} onChange={(event)=>setClassForm(current=>({...current,code:event.target.value}))} placeholder="SP-N4-A" /></label><label>Nama Kelas<input value={classForm.name} disabled={classSaving} onChange={(event)=>setClassForm(current=>({...current,name:event.target.value}))} placeholder="SP-N4 Malam A" /></label></div>
          <label>Deskripsi<textarea value={classForm.description} disabled={classSaving} onChange={(event)=>setClassForm(current=>({...current,description:event.target.value}))} rows={3} /></label>
          <label>Pengajar<select value={classForm.teacher_id} disabled={classSaving} onChange={(event)=>setClassForm(current=>({...current,teacher_id:event.target.value}))}><option value="">Pilih pengajar</option>{teacherOptions.map(teacher=><option key={teacher.user_id} value={teacher.user_id}>{teacher.full_name || 'Tanpa nama'} — {APP_ROLE_LABEL[teacher.role]}</option>)}</select></label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}><label>Tanggal Mulai<input type="date" value={classForm.starts_on} disabled={classSaving} onChange={(event)=>setClassForm(current=>({...current,starts_on:event.target.value}))} /></label><label>Tanggal Selesai<input type="date" value={classForm.ends_on} disabled={classSaving} onChange={(event)=>setClassForm(current=>({...current,ends_on:event.target.value}))} /></label><label>Status<select value={classForm.status} disabled={classSaving} onChange={(event)=>setClassForm(current=>({...current,status:event.target.value as ClassRow['status']}))}>{CLASS_STATUSES.map(status=><option key={status} value={status}>{statusLabel(status)}</option>)}</select></label></div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}><button className="ghost-btn" type="button" disabled={classSaving} onClick={()=>setClassEditorOpen(false)}>Batal</button><button className="primary-btn" type="submit" disabled={classSaving}>{classSaving?'Menyimpan...':'Simpan Kelas'}</button></div>
        </form>
      </section>
    </div>}

    {deleteTarget && <div
      role="presentation"
      style={modalBackdropStyle}
      onMouseDown={(event)=>{ if (event.currentTarget === event.target) closeDeleteModal(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" style={{ ...modalCardStyle, width:'min(100%,520px)' }}>
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
