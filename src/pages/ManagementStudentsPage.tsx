import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../classroom.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type AcademicStatus = 'active' | 'inactive' | 'alumni';
type AccountStatus = 'active' | 'pending' | 'blocked';
type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';
type SortMode = 'name_asc' | 'name_desc' | 'joined_desc';

type StudentClassSummary = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  teacher_id: string | null;
  teacher_name: string;
  enrollment_status: EnrollmentStatus;
  joined_at: string;
};

type StudentDirectoryRow = {
  student_id: string;
  full_name: string | null;
  nickname: string | null;
  academic_status: AcademicStatus;
  account_status: AccountStatus;
  joined_at: string | null;
  class_history_count: number;
  active_classes: StudentClassSummary[];
};

type DirectoryPayload = {
  summary: {
    total_students: number;
    active_students: number;
    inactive_students: number;
    alumni_students: number;
  };
  rows: StudentDirectoryRow[];
  filters: {
    programs: Array<{ id: string; code: string | null; name: string }>;
    classes: Array<{ id: string; code: string | null; name: string; program_id: string | null }>;
    teachers: Array<{ id: string; name: string }>;
  };
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
};

type StudentDetailClass = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: 'planned' | 'active' | 'completed' | 'cancelled';
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  teacher_id: string | null;
  teacher_name: string;
  enrollment_status: EnrollmentStatus;
  joined_at: string;
  completed_at: string | null;
};

type StudentDetail = {
  profile: {
    student_id: string;
    full_name: string | null;
    nickname: string | null;
  };
  academic_status: AcademicStatus;
  account_status: AccountStatus;
  current_classes: StudentDetailClass[];
  class_history: StudentDetailClass[];
};

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);

const academicLabels: Record<AcademicStatus, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  alumni: 'Alumni',
};

const accountLabels: Record<AccountStatus, string> = {
  active: 'Aktif',
  pending: 'Menunggu Approval',
  blocked: 'Diblokir',
};

const enrollmentLabels: Record<EnrollmentStatus, string> = {
  active: 'Aktif',
  paused: 'Dijeda',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function displayName(row: { full_name: string | null; nickname: string | null }) {
  return row.full_name?.trim() || row.nickname?.trim() || 'Siswa KOJAC';
}

function AcademicBadge({ status }: { status: AcademicStatus }) {
  return <span className={`student-management-status is-${status}`}>{academicLabels[status]}</span>;
}

function SummaryCard({ value, label }: { value: number; label: string }) {
  return (
    <article className="class-summary-card student-management-summary-card">
      <div className="class-summary-icon"><UsersRound size={20}/></div>
      <div className="class-summary-copy">
        <strong className="class-summary-value">{value}</strong>
        <span className="class-summary-label">{label}</span>
      </div>
    </article>
  );
}

function CompactActiveClasses({ classes }: { classes: StudentClassSummary[] }) {
  if (classes.length === 0) return <span className="student-management-muted">Belum ada kelas aktif</span>;
  const visible = classes.slice(0, 2);
  return (
    <div className="student-management-compact-list">
      {visible.map((item) => (
        <div key={item.class_id}>
          <strong>{item.program_name || 'Program KOJAC'}</strong>
          <span>{item.class_name}{item.class_code ? ` · ${item.class_code}` : ''}</span>
        </div>
      ))}
      {classes.length > visible.length && <small>+{classes.length - visible.length} kelas aktif</small>}
    </div>
  );
}

function CompactTeachers({ classes }: { classes: StudentClassSummary[] }) {
  const names = Array.from(new Set(classes.map((item) => item.teacher_name).filter(Boolean)));
  if (names.length === 0) return <span className="student-management-muted">—</span>;
  return (
    <div className="student-management-teacher-list">
      {names.slice(0, 2).map((name) => <span key={name}>{name}</span>)}
      {names.length > 2 && <small>+{names.length - 2} pengajar</small>}
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="student-management-skeleton" aria-busy="true" aria-label="Memuat data siswa">
      <div className="student-management-skeleton-summary">{[0, 1, 2, 3].map((item) => <div key={item}/>)}</div>
      <div className="student-management-skeleton-filter"/>
      <div className="student-management-skeleton-list">{[0, 1, 2, 3].map((item) => <div key={item}/>)}</div>
    </div>
  );
}

function DetailClassCard({ row }: { row: StudentDetailClass }) {
  return (
    <article className="student-management-detail-class">
      <div className="student-management-detail-class-heading">
        <div>
          <p>{row.program_name || 'PROGRAM KOJAC'}</p>
          <h4>{row.class_name}</h4>
          <span>{row.class_code || 'Tanpa kode kelas'}</span>
        </div>
        <span className={`class-status-badge is-${row.enrollment_status}`}>
          {enrollmentLabels[row.enrollment_status]}
        </span>
      </div>
      <div className="student-management-detail-class-meta">
        <span><strong>Pengajar</strong>{row.teacher_name || 'Belum ditentukan'}</span>
        <span><strong>Bergabung</strong>{formatDate(row.joined_at)}</span>
        {row.completed_at && <span><strong>Selesai</strong>{formatDate(row.completed_at)}</span>}
      </div>
    </article>
  );
}

export function ManagementStudentsPage() {
  const { role, loading: authLoading } = useAuth();
  const canManage = Boolean(role && MANAGEMENT_ROLES.has(role));

  const [payload, setPayload] = useState<DirectoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [academicStatus, setAcademicStatus] = useState('');
  const [programId, setProgramId] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [sort, setSort] = useState<SortMode>('name_asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<StudentDirectoryRow | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [academicStatus, programId, classId, teacherId, sort, pageSize, debouncedSearch]);

  const loadDirectory = useCallback(async () => {
    if (!role || !MANAGEMENT_ROLES.has(role)) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_management_students', {
      p_student_status: academicStatus || null,
      p_program_id: programId || null,
      p_class_id: classId || null,
      p_teacher_id: teacherId || null,
      p_search: debouncedSearch || null,
      p_sort: sort,
      p_page: page,
      p_page_size: pageSize,
    });

    if (requestId !== requestSequence.current) return;

    if (loadError) {
      console.error('KOJAC management students load failed', loadError);
      setError(true);
      setLoading(false);
      return;
    }

    setPayload(data as DirectoryPayload);
    setLoading(false);
  }, [role, academicStatus, programId, classId, teacherId, debouncedSearch, sort, page, pageSize]);

  useEffect(() => {
    if (!authLoading && canManage) void loadDirectory();
  }, [authLoading, canManage, loadDirectory]);

  const classOptions = useMemo(() => {
    const options = payload?.filters.classes ?? [];
    return programId ? options.filter((item) => item.program_id === programId) : options;
  }, [payload, programId]);

  const closeDetail = useCallback(() => {
    setSelectedStudent(null);
    setDetail(null);
    setDetailError(false);
    setDetailLoading(false);
  }, []);

  const openDetail = useCallback(async (row: StudentDirectoryRow) => {
    setSelectedStudent(row);
    setDetail(null);
    setDetailError(false);
    setDetailLoading(true);

    const { data, error: loadError } = await supabase.rpc('get_management_student_detail', {
      p_student_id: row.student_id,
    });

    if (loadError) {
      console.error('KOJAC management student detail failed', loadError);
      setDetailError(true);
      setDetailLoading(false);
      return;
    }

    setDetail(data as StudentDetail);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedStudent) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetail();
    };
    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedStudent, closeDetail]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canManage) return <Navigate to="/" replace/>;

  const summary = payload?.summary ?? {
    total_students: 0,
    active_students: 0,
    inactive_students: 0,
    alumni_students: 0,
  };
  const rows = payload?.rows ?? [];
  const pagination = payload?.pagination ?? { page, page_size: pageSize, total_rows: 0, total_pages: 0 };
  const filteredEmpty = summary.total_students > 0;

  return (
    <div className="page class-experience-page student-management-page">
      <header className="class-page-header student-management-header">
        <div className="class-page-header-copy">
          <p className="eyebrow">MANAJEMEN KOJAC</p>
          <h1>Manajemen Siswa</h1>
          <p>Pantau data dan kondisi akademik siswa KOJAC dalam satu tempat.</p>
        </div>
      </header>

      {!payload && loading ? (
        <DirectorySkeleton/>
      ) : error && !payload ? (
        <section className="class-state-card" role="alert">
          <div className="class-state-icon"><AlertCircle size={28}/></div>
          <h2>Data siswa belum dapat dimuat.</h2>
          <p>Silakan coba lagi.</p>
          <button className="class-action-secondary" type="button" onClick={() => void loadDirectory()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </section>
      ) : (
        <>
          <section className="class-summary-grid student-management-summary-grid" aria-label="Ringkasan status akademik siswa">
            <SummaryCard value={summary.total_students} label="Total Siswa"/>
            <SummaryCard value={summary.active_students} label="Siswa Aktif"/>
            <SummaryCard value={summary.inactive_students} label="Siswa Nonaktif"/>
            <SummaryCard value={summary.alumni_students} label="Alumni"/>
          </section>

          <section className="student-management-filter-card" aria-label="Filter siswa">
            <div className="student-management-filter-heading">
              <div><Filter size={17}/><strong>Filter Siswa</strong></div>
              {loading && <span>Memuat data…</span>}
            </div>
            <div className="student-management-filter-grid">
              <label>
                <span>Status Akademik</span>
                <select value={academicStatus} onChange={(event) => setAcademicStatus(event.target.value)}>
                  <option value="">Semua status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                  <option value="alumni">Alumni</option>
                </select>
              </label>

              <label>
                <span>Program</span>
                <select value={programId} onChange={(event) => { setProgramId(event.target.value); setClassId(''); }}>
                  <option value="">Semua program</option>
                  {(payload?.filters.programs ?? []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <label>
                <span>Kelas</span>
                <select value={classId} onChange={(event) => setClassId(event.target.value)}>
                  <option value="">Semua kelas</option>
                  {classOptions.map((option) => <option key={option.id} value={option.id}>{option.name}{option.code ? ` · ${option.code}` : ''}</option>)}
                </select>
              </label>

              <label>
                <span>Pengajar</span>
                <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
                  <option value="">Semua pengajar</option>
                  {(payload?.filters.teachers ?? []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <label>
                <span>Urutkan</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                  <option value="name_asc">Nama A–Z</option>
                  <option value="name_desc">Nama Z–A</option>
                  <option value="joined_desc">Terbaru Bergabung</option>
                </select>
              </label>

              <label className="student-management-search-field">
                <span>Cari siswa</span>
                <div>
                  <Search size={16}/>
                  <input
                    type="search"
                    value={search}
                    placeholder="Nama, panggilan, kode kelas"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </label>
            </div>
          </section>

          {error && payload && (
            <div className="notice student-management-inline-error" role="alert">
              Data terbaru belum dapat dimuat. Data sebelumnya tetap ditampilkan.
              <button type="button" onClick={() => void loadDirectory()}>Coba Lagi</button>
            </div>
          )}

          <section className="class-section student-management-section">
            <div className="class-section-heading">
              <div><p className="eyebrow">DIREKTORI SISWA</p><h2>Siswa</h2></div>
              <span className="class-section-count">{pagination.total_rows} siswa</span>
            </div>

            {rows.length === 0 ? (
              <div className="class-state-card student-management-empty">
                <UsersRound size={28}/>
                <h3>{filteredEmpty ? 'Tidak ada siswa yang sesuai dengan filter.' : 'Belum ada siswa KOJAC.'}</h3>
              </div>
            ) : (
              <>
                <div className="student-management-desktop-list">
                  <div className="student-management-desktop-head" aria-hidden="true">
                    <span>Siswa</span><span>Status</span><span>Program / Kelas</span><span>Pengajar</span><span>Bergabung</span><span>Riwayat</span><span>Aksi</span>
                  </div>
                  {rows.map((row) => (
                    <article className="student-management-desktop-row" key={row.student_id}>
                      <div className="student-management-name-cell">
                        <strong>{displayName(row)}</strong>
                        {row.nickname && row.nickname !== displayName(row) && <small>{row.nickname}</small>}
                      </div>
                      <div><AcademicBadge status={row.academic_status}/></div>
                      <div><CompactActiveClasses classes={row.active_classes}/></div>
                      <div><CompactTeachers classes={row.active_classes}/></div>
                      <div><strong>{formatDate(row.joined_at)}</strong></div>
                      <div><strong>{row.class_history_count}</strong><small>kelas</small></div>
                      <div>
                        <button className="class-action-secondary student-management-detail-button" type="button" onClick={() => void openDetail(row)}>
                          <UserRound size={14}/> Lihat Detail
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="student-management-mobile-list">
                  {rows.map((row) => (
                    <article className="student-management-mobile-card" key={row.student_id}>
                      <header>
                        <div><strong>{displayName(row)}</strong>{row.nickname && row.nickname !== displayName(row) && <span>{row.nickname}</span>}</div>
                        <AcademicBadge status={row.academic_status}/>
                      </header>
                      <div className="student-management-mobile-grid">
                        <div className="is-wide"><span>Program / Kelas Aktif</span><CompactActiveClasses classes={row.active_classes}/></div>
                        <div><span>Pengajar</span><CompactTeachers classes={row.active_classes}/></div>
                        <div><span>Bergabung</span><strong>{formatDate(row.joined_at)}</strong></div>
                        <div><span>Riwayat</span><strong>{row.class_history_count} kelas</strong></div>
                      </div>
                      <button className="class-action-secondary student-management-detail-button" type="button" onClick={() => void openDetail(row)}>
                        <UserRound size={14}/> Lihat Detail
                      </button>
                    </article>
                  ))}
                </div>

                <div className="student-management-pagination" aria-label="Pagination siswa">
                  <div>
                    <label htmlFor="student-page-size">Tampilkan</label>
                    <select id="student-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>siswa / halaman</span>
                  </div>
                  <div>
                    <button type="button" className="class-action-secondary" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                      <ChevronLeft size={15}/> Sebelumnya
                    </button>
                    <span>Halaman {pagination.total_pages === 0 ? 0 : pagination.page} dari {pagination.total_pages}</span>
                    <button type="button" className="class-action-secondary" disabled={page >= pagination.total_pages || loading} onClick={() => setPage((current) => current + 1)}>
                      Selanjutnya <ChevronRight size={15}/>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {selectedStudent && (
        <div className="student-management-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
          <section className="student-management-modal" role="dialog" aria-modal="true" aria-labelledby="student-management-detail-title">
            <header className="student-management-modal-header">
              <div>
                <p className="eyebrow">DETAIL SISWA</p>
                <h2 id="student-management-detail-title">{displayName(selectedStudent)}</h2>
                <span>Ringkasan akademik read-only</span>
              </div>
              <button ref={closeButtonRef} type="button" className="student-management-modal-close" aria-label="Tutup detail siswa" onClick={closeDetail}><X size={20}/></button>
            </header>

            {detailLoading ? (
              <div className="student-management-detail-loading" aria-busy="true"><div/><div/><div/></div>
            ) : detailError || !detail ? (
              <div className="class-state-card">
                <AlertCircle size={28}/><h3>Detail siswa belum dapat dimuat.</h3>
                <button className="class-action-secondary" type="button" onClick={() => void openDetail(selectedStudent)}><RefreshCw size={15}/> Coba Lagi</button>
              </div>
            ) : (
              <div className="student-management-detail-content">
                <section className="student-management-detail-profile">
                  <div><span>Nama Lengkap</span><strong>{detail.profile.full_name || '—'}</strong></div>
                  <div><span>Nama Panggilan</span><strong>{detail.profile.nickname || '—'}</strong></div>
                  <div><span>Status Akademik</span><AcademicBadge status={detail.academic_status}/></div>
                  <div><span>Status Akun</span><strong>{accountLabels[detail.account_status]}</strong></div>
                </section>

                <section className="student-management-detail-section">
                  <div className="student-management-detail-section-heading"><BookOpenCheck size={17}/><div><h3>Kelas Aktif</h3><p>Program dan kelas yang sedang dijalani siswa.</p></div></div>
                  {detail.current_classes.length === 0
                    ? <p className="student-management-detail-empty">Tidak ada kelas aktif.</p>
                    : <div className="student-management-detail-class-list">{detail.current_classes.map((row) => <DetailClassCard key={`${row.class_id}-${row.enrollment_status}`} row={row}/>)}</div>}
                </section>

                <section className="student-management-detail-section">
                  <div className="student-management-detail-section-heading"><BookOpenCheck size={17}/><div><h3>Riwayat Kelas</h3><p>Kelas paused, completed, dan cancelled tetap disimpan sebagai histori.</p></div></div>
                  {detail.class_history.length === 0
                    ? <p className="student-management-detail-empty">Belum ada riwayat kelas.</p>
                    : <div className="student-management-detail-class-list">{detail.class_history.map((row) => <DetailClassCard key={`${row.class_id}-${row.enrollment_status}`} row={row}/>)}</div>}
                </section>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
