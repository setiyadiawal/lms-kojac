import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  RefreshCw,
  School,
  Search,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import '../classroom.css';
import '../features/management/teacherManagement.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { APP_ROLE_LABEL, type AppRole } from '../types';

type AccountStatus = 'active' | 'pending' | 'blocked';
type TeachingStatus = 'teaching' | 'no_active';
type ClassStatus = 'planned' | 'active' | 'completed' | 'cancelled';
type Relationship = 'primary' | 'substitute';
type SortMode = 'name_asc' | 'name_desc' | 'activity_desc' | 'class_count_desc';
type DetailTab = 'summary' | 'classes' | 'workload' | 'history' | 'reports';

type DirectoryClass = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  class_status: ClassStatus;
  relationship: Relationship;
};

type TeacherRow = {
  teacher_id: string;
  full_name: string | null;
  nickname: string | null;
  role: AppRole | null;
  account_status: AccountStatus;
  teaching_status: TeachingStatus;
  current_class_count: number;
  active_student_count: number;
  report_count: number;
  last_report_date: string | null;
  last_report_updated_at: string | null;
  current_classes: DirectoryClass[];
};

type DirectoryPayload = {
  summary: {
    total_teachers: number;
    active_account_teachers: number;
    currently_teaching: number;
    without_active_class: number;
  };
  rows: TeacherRow[];
  filters: {
    roles: Array<{ value: AppRole }>;
    programs: Array<{ id: string; code: string | null; name: string }>;
    classes: Array<{ id: string; code: string | null; name: string; program_id: string | null }>;
  };
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
};

type TeacherCurrentClass = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: ClassStatus;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  relationship: Relationship;
  student_active_count: number;
  class_starts_on: string | null;
  class_ends_on: string | null;
  assignment_starts_on: string | null;
  assignment_ends_on: string | null;
};

type TeacherHistoryRow = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: ClassStatus;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  relationship: Relationship;
  assignment_id: string | null;
  relationship_starts_on: string | null;
  relationship_ends_on: string | null;
  assignment_is_active: boolean | null;
  history_state: 'planned' | 'historical' | 'upcoming' | 'inactive' | 'other';
};

type TeacherReportRow = {
  report_id: string;
  class_id: string;
  class_code: string | null;
  class_name: string;
  program_name: string | null;
  teacher_name_snapshot: string;
  report_date: string;
  material_summary: string;
  updated_at: string;
};

type TeacherWorkloadClass = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  relationship: Relationship;
  active_student_count: number;
  reports_current_month: number;
  reported_minutes_current_month: number;
  last_report_date: string | null;
  class_starts_on: string | null;
  class_ends_on: string | null;
  assignment_starts_on: string | null;
  assignment_ends_on: string | null;
};

type TeacherWorkload = {
  primary_class_count: number;
  substitute_class_count: number;
  current_class_count: number;
  active_student_count: number;
  reports_current_month: number;
  reported_minutes_current_month: number;
  last_report_date: string | null;
  month_start: string;
  next_month_start: string;
  classes: TeacherWorkloadClass[];
};

type TeacherDetail = {
  profile: {
    teacher_id: string;
    full_name: string | null;
    nickname: string | null;
  };
  role: AppRole | null;
  account_status: AccountStatus;
  teaching_status: TeachingStatus;
  current_class_count: number;
  active_student_count: number;
  report_count: number;
  last_report_date: string | null;
  current_classes: TeacherCurrentClass[];
  history: TeacherHistoryRow[];
  recent_reports: TeacherReportRow[];
  workload: TeacherWorkload;
};

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);

const accountLabels: Record<AccountStatus, string> = {
  active: 'Aktif',
  pending: 'Menunggu Approval',
  blocked: 'Diblokir',
};

const teachingLabels: Record<TeachingStatus, string> = {
  teaching: 'Sedang Mengajar',
  no_active: 'Tidak Ada Kelas Aktif',
};

const classStatusLabels: Record<ClassStatus, string> = {
  planned: 'Direncanakan',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const relationshipLabels: Record<Relationship, string> = {
  primary: 'Pengajar Utama',
  substitute: 'Pengajar Pengganti',
};

const historyStateLabels: Record<TeacherHistoryRow['history_state'], string> = {
  planned: 'Direncanakan',
  historical: 'Riwayat',
  upcoming: 'Akan Datang',
  inactive: 'Dinonaktifkan',
  other: 'Penugasan',
};

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'name_asc', label: 'Nama A–Z' },
  { value: 'name_desc', label: 'Nama Z–A' },
  { value: 'activity_desc', label: 'Aktivitas Terbaru' },
  { value: 'class_count_desc', label: 'Kelas Aktif Terbanyak' },
];

function displayName(row: Pick<TeacherRow, 'full_name' | 'nickname'> | TeacherDetail['profile']) {
  return row.full_name?.trim() || row.nickname?.trim() || 'Pengajar KOJAC';
}

function roleLabel(role: AppRole | null) {
  if (!role) return 'Tidak tersedia';
  const base = APP_ROLE_LABEL[role];
  return ['umum', 'siswa', 'staff'].includes(role) ? `${base} · Riwayat Mengajar` : base;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : `${value}T00:00:00+07:00`;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return 'Belum ditentukan';
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `Mulai ${formatDate(start)}`;
  return `Sampai ${formatDate(end)}`;
}

function recordedDurationLabel(minutes: number) {
  const safeMinutes = Math.max(0, Math.trunc(minutes || 0));
  if (safeMinutes < 60) return `${safeMinutes} menit`;
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  return remaining > 0
    ? `${safeMinutes} menit · ${hours} jam ${remaining} menit`
    : `${safeMinutes} menit · ${hours} jam`;
}

function materialPreview(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= 170 ? compact : `${compact.slice(0, 167)}…`;
}

function SummaryCard({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <article className="class-summary-card teacher-management-summary-card">
      <div className="class-summary-icon">{icon}</div>
      <div className="class-summary-copy">
        <strong className="class-summary-value">{value}</strong>
        <span className="class-summary-label">{label}</span>
      </div>
    </article>
  );
}

function AccountBadge({ value }: { value: AccountStatus }) {
  return <span className={`teacher-management-account is-${value}`}>{accountLabels[value]}</span>;
}

function TeachingBadge({ value }: { value: TeachingStatus }) {
  return <span className={`teacher-management-teaching is-${value}`}>{teachingLabels[value]}</span>;
}

function RelationshipBadge({ value }: { value: Relationship }) {
  return <span className={`teacher-management-relationship is-${value}`}>{relationshipLabels[value]}</span>;
}

function CompactClasses({ classes }: { classes: DirectoryClass[] }) {
  if (classes.length === 0) return <span className="teacher-management-muted">Tidak ada kelas aktif</span>;
  const visible = classes.slice(0, 2);
  return (
    <div className="teacher-management-compact-classes">
      {visible.map((row) => (
        <div key={`${row.class_id}-${row.relationship}`}>
          <strong>{row.class_name}</strong>
          <small>{row.class_code || 'Tanpa kode'} · {relationshipLabels[row.relationship]}</small>
        </div>
      ))}
      {classes.length > visible.length && <span>+{classes.length - visible.length} kelas</span>}
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="teacher-management-skeleton" aria-busy="true" aria-label="Memuat data pengajar">
      <div className="teacher-management-skeleton-summary">{[0, 1, 2, 3].map((item) => <div key={item}/>)}</div>
      <div className="teacher-management-skeleton-filter"/>
      <div className="teacher-management-skeleton-list">{[0, 1, 2].map((item) => <div key={item}/>)}</div>
    </div>
  );
}

export function ManagementTeachersPage() {
  const { role, loading: authLoading } = useAuth();
  const canManage = Boolean(role && MANAGEMENT_ROLES.has(role));

  const [payload, setPayload] = useState<DirectoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [roleFilter, setRoleFilter] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [teachingStatus, setTeachingStatus] = useState('');
  const [programId, setProgramId] = useState('');
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('name_asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null);
  const [detail, setDetail] = useState<TeacherDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('summary');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, accountStatus, teachingStatus, programId, classId, debouncedSearch, sort, pageSize]);

  const loadDirectory = useCallback(async () => {
    if (!role || !MANAGEMENT_ROLES.has(role)) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_management_teachers', {
      p_role: roleFilter || null,
      p_account_status: accountStatus || null,
      p_teaching_status: teachingStatus || null,
      p_program_id: programId || null,
      p_class_id: classId || null,
      p_search: debouncedSearch || null,
      p_sort: sort,
      p_page: page,
      p_page_size: pageSize,
    });

    if (requestId !== requestSequence.current) return;

    if (loadError) {
      console.error('KOJAC management teachers load failed', loadError);
      setError(true);
      setLoading(false);
      return;
    }

    setPayload(data as DirectoryPayload);
    setLoading(false);
  }, [role, roleFilter, accountStatus, teachingStatus, programId, classId, debouncedSearch, sort, page, pageSize]);

  useEffect(() => {
    if (!authLoading && canManage) void loadDirectory();
  }, [authLoading, canManage, loadDirectory]);

  const classOptions = useMemo(() => {
    const options = payload?.filters.classes ?? [];
    return programId ? options.filter((item) => item.program_id === programId) : options;
  }, [payload, programId]);

  const closeDetail = useCallback(() => {
    setSelectedTeacher(null);
    setDetail(null);
    setDetailError(false);
    setDetailLoading(false);
    setDetailTab('summary');
  }, []);

  const openDetail = useCallback(async (row: TeacherRow) => {
    setSelectedTeacher(row);
    setDetail(null);
    setDetailError(false);
    setDetailLoading(true);
    setDetailTab('summary');

    const { data, error: loadError } = await supabase.rpc('get_management_teacher_detail', {
      p_teacher_id: row.teacher_id,
    });

    if (loadError) {
      console.error('KOJAC management teacher detail failed', loadError);
      setDetailError(true);
      setDetailLoading(false);
      return;
    }

    setDetail(data as TeacherDetail);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedTeacher) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetail();
    };
    document.addEventListener('keydown', onKeyDown);
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedTeacher, closeDetail]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canManage) return <Navigate to="/" replace/>;

  const summary = payload?.summary ?? {
    total_teachers: 0,
    active_account_teachers: 0,
    currently_teaching: 0,
    without_active_class: 0,
  };
  const rows = payload?.rows ?? [];
  const pagination = payload?.pagination ?? { page, page_size: pageSize, total_rows: 0, total_pages: 0 };
  const hasAnyTeacher = summary.total_teachers > 0;

  return (
    <div className="page class-experience-page teacher-management-page">
      <header className="class-page-header teacher-management-header">
        <div className="class-page-header-copy">
          <p className="eyebrow">MANAJEMEN KOJAC</p>
          <h1>Manajemen Pengajar</h1>
          <p>Pantau pengajar, kelas, siswa, dan aktivitas mengajar KOJAC.</p>
        </div>
      </header>

      {!payload && loading ? (
        <DirectorySkeleton/>
      ) : error && !payload ? (
        <section className="class-state-card" role="alert">
          <div className="class-state-icon"><AlertCircle size={28}/></div>
          <h2>Data pengajar belum dapat dimuat.</h2>
          <p>Silakan coba lagi.</p>
          <button className="class-action-secondary" type="button" onClick={() => void loadDirectory()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </section>
      ) : (
        <>
          <section className="class-summary-grid teacher-management-summary-grid" aria-label="Ringkasan pengajar">
            <SummaryCard value={summary.total_teachers} label="Total Pengajar" icon={<UsersRound size={20}/>}/>
            <SummaryCard value={summary.active_account_teachers} label="Pengajar Aktif" icon={<UserRound size={20}/>}/>
            <SummaryCard value={summary.currently_teaching} label="Sedang Mengajar" icon={<School size={20}/>}/>
            <SummaryCard value={summary.without_active_class} label="Tanpa Kelas Aktif" icon={<BookOpenCheck size={20}/>}/>
          </section>

          <section className="teacher-management-filter-card" aria-label="Filter pengajar">
            <div className="teacher-management-filter-heading">
              <div><Filter size={17}/><strong>Filter Pengajar</strong></div>
              {loading && <span>Memuat data…</span>}
            </div>

            <div className="teacher-management-filter-grid">
              <label>
                <span>Role</span>
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                  <option value="">Semua role</option>
                  {(payload?.filters.roles ?? []).map((option) => (
                    <option key={option.value} value={option.value}>{roleLabel(option.value)}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status Akun</span>
                <select value={accountStatus} onChange={(event) => setAccountStatus(event.target.value)}>
                  <option value="">Semua status akun</option>
                  <option value="active">Aktif</option>
                  <option value="pending">Menunggu Approval</option>
                  <option value="blocked">Diblokir</option>
                </select>
              </label>

              <label>
                <span>Status Mengajar</span>
                <select value={teachingStatus} onChange={(event) => setTeachingStatus(event.target.value)}>
                  <option value="">Semua status mengajar</option>
                  <option value="teaching">Sedang Mengajar</option>
                  <option value="no_active">Tanpa Kelas Aktif</option>
                </select>
              </label>

              <label>
                <span>Program</span>
                <select value={programId} onChange={(event) => { setProgramId(event.target.value); setClassId(''); }}>
                  <option value="">Semua program</option>
                  {(payload?.filters.programs ?? []).map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Kelas</span>
                <select value={classId} onChange={(event) => setClassId(event.target.value)}>
                  <option value="">Semua kelas</option>
                  {classOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}{option.code ? ` · ${option.code}` : ''}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Urutkan</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                  {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className="teacher-management-search-field">
                <span>Cari pengajar</span>
                <div>
                  <Search size={16}/>
                  <input
                    type="search"
                    value={search}
                    placeholder="Nama, panggilan, atau kode kelas"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </label>
            </div>
          </section>

          {error && payload && (
            <div className="notice teacher-management-inline-error" role="alert">
              Data terbaru belum dapat dimuat. Data sebelumnya tetap ditampilkan.
              <button type="button" onClick={() => void loadDirectory()}>Coba Lagi</button>
            </div>
          )}

          <section className="class-section teacher-management-section">
            <div className="class-section-heading">
              <div><p className="eyebrow">DIRECTORY PENGAJAR</p><h2>Pengajar</h2></div>
              <span className="class-section-count">{pagination.total_rows} pengajar</span>
            </div>

            {rows.length === 0 ? (
              <div className="class-state-card teacher-management-empty">
                <UsersRound size={28}/>
                <h3>{hasAnyTeacher ? 'Tidak ada pengajar yang sesuai dengan filter.' : 'Belum ada pengajar KOJAC.'}</h3>
              </div>
            ) : (
              <>
                <div className="teacher-management-desktop-list">
                  <div className="teacher-management-desktop-head" aria-hidden="true">
                    <span>Pengajar</span>
                    <span>Role</span>
                    <span>Status Akun</span>
                    <span>Kelas Saat Ini</span>
                    <span>Siswa Aktif</span>
                    <span>Laporan</span>
                    <span>Aktivitas Terakhir</span>
                    <span>Aksi</span>
                  </div>
                  {rows.map((row) => (
                    <article className="teacher-management-desktop-row" key={row.teacher_id}>
                      <div className="teacher-management-name-cell">
                        <strong>{displayName(row)}</strong>
                        {row.nickname && row.nickname !== displayName(row) && <small>{row.nickname}</small>}
                        <TeachingBadge value={row.teaching_status}/>
                      </div>
                      <div><strong>{roleLabel(row.role)}</strong></div>
                      <div><AccountBadge value={row.account_status}/></div>
                      <div>
                        <strong>{row.current_class_count} kelas</strong>
                        <CompactClasses classes={row.current_classes}/>
                      </div>
                      <div><strong>{row.active_student_count}</strong><small>siswa</small></div>
                      <div><strong>{row.report_count}</strong><small>laporan</small></div>
                      <div>
                        <strong>{row.last_report_date ? formatDate(row.last_report_date) : 'Belum ada laporan'}</strong>
                      </div>
                      <div>
                        <button className="class-action-secondary teacher-management-detail-button" type="button" onClick={() => void openDetail(row)}>
                          <UserRound size={14}/> Lihat Detail
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="teacher-management-mobile-list">
                  {rows.map((row) => (
                    <article className="teacher-management-mobile-card" key={row.teacher_id}>
                      <header>
                        <div>
                          <strong>{displayName(row)}</strong>
                          <span>{roleLabel(row.role)}</span>
                        </div>
                        <AccountBadge value={row.account_status}/>
                      </header>
                      <div className="teacher-management-mobile-badges"><TeachingBadge value={row.teaching_status}/></div>
                      <div className="teacher-management-mobile-grid">
                        <div className="is-wide"><span>Kelas Saat Ini</span><CompactClasses classes={row.current_classes}/></div>
                        <div><span>Siswa Aktif</span><strong>{row.active_student_count}</strong></div>
                        <div><span>Laporan</span><strong>{row.report_count}</strong></div>
                        <div className="is-wide"><span>Aktivitas Terakhir</span><strong>{row.last_report_date ? formatDate(row.last_report_date) : 'Belum ada laporan'}</strong></div>
                      </div>
                      <button className="class-action-secondary teacher-management-detail-button" type="button" onClick={() => void openDetail(row)}>
                        <UserRound size={14}/> Lihat Detail
                      </button>
                    </article>
                  ))}
                </div>

                <div className="teacher-management-pagination" aria-label="Pagination pengajar">
                  <div>
                    <label htmlFor="teacher-page-size">Tampilkan</label>
                    <select id="teacher-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>pengajar / halaman</span>
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

      {selectedTeacher && (
        <div className="teacher-management-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
          <section className="teacher-management-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-management-detail-title">
            <header className="teacher-management-modal-header">
              <div>
                <p className="eyebrow">TEACHER 360</p>
                <h2 id="teacher-management-detail-title">{displayName(selectedTeacher)}</h2>
                <span>Monitoring aktivitas mengajar read-only.</span>
              </div>
              <button ref={closeButtonRef} type="button" className="teacher-management-modal-close" aria-label="Tutup detail pengajar" onClick={closeDetail}><X size={20}/></button>
            </header>

            {detailLoading ? (
              <div className="teacher-management-detail-loading" aria-busy="true"><div/><div/><div/></div>
            ) : detailError || !detail ? (
              <div className="class-state-card">
                <AlertCircle size={28}/>
                <h3>Detail pengajar belum dapat dimuat.</h3>
                <button className="class-action-secondary" type="button" onClick={() => void openDetail(selectedTeacher)}>
                  <RefreshCw size={15}/> Coba Lagi
                </button>
              </div>
            ) : (
              <div className="teacher-management-detail-content">
                <div className="teacher-management-tabs" role="tablist" aria-label="Teacher 360">
                  <button type="button" role="tab" aria-selected={detailTab === 'summary'} className={detailTab === 'summary' ? 'active' : ''} onClick={() => setDetailTab('summary')}>Ringkasan</button>
                  <button type="button" role="tab" aria-selected={detailTab === 'classes'} className={detailTab === 'classes' ? 'active' : ''} onClick={() => setDetailTab('classes')}>Kelas</button>
                  <button type="button" role="tab" aria-selected={detailTab === 'workload'} className={detailTab === 'workload' ? 'active' : ''} onClick={() => setDetailTab('workload')}>Beban Mengajar</button>
                  <button type="button" role="tab" aria-selected={detailTab === 'history'} className={detailTab === 'history' ? 'active' : ''} onClick={() => setDetailTab('history')}>Riwayat</button>
                  <button type="button" role="tab" aria-selected={detailTab === 'reports'} className={detailTab === 'reports' ? 'active' : ''} onClick={() => setDetailTab('reports')}>Laporan</button>
                </div>

                {detailTab === 'summary' && (
                  <section className="teacher-management-tab-panel" role="tabpanel">
                    <div className="teacher-management-detail-summary">
                      <div><span>Nama Lengkap</span><strong>{detail.profile.full_name || '—'}</strong></div>
                      <div><span>Nama Panggilan</span><strong>{detail.profile.nickname || '—'}</strong></div>
                      <div><span>Role</span><strong>{roleLabel(detail.role)}</strong></div>
                      <div><span>Status Akun</span><AccountBadge value={detail.account_status}/></div>
                      <div><span>Status Mengajar</span><TeachingBadge value={detail.teaching_status}/></div>
                      <div><span>Kelas Saat Ini</span><strong>{detail.current_class_count}</strong></div>
                      <div><span>Siswa Aktif</span><strong>{detail.active_student_count}</strong></div>
                      <div><span>Laporan Mengajar</span><strong>{detail.report_count}</strong></div>
                      <div><span>Aktivitas Terakhir</span><strong>{detail.last_report_date ? formatDate(detail.last_report_date) : 'Belum ada laporan'}</strong></div>
                    </div>
                    <p className="teacher-management-readonly-note">
                      Teacher 360 hanya untuk monitoring. Perubahan role/akun tetap di Pengguna &amp; Kelas; assignment pengajar tetap melalui editor kelas existing.
                    </p>
                  </section>
                )}

                {detailTab === 'classes' && (
                  <section className="teacher-management-tab-panel" role="tabpanel">
                    <div className="teacher-management-tab-heading">
                      <div><h3>Kelas Saat Ini</h3><p>Primary dan substitute ditampilkan sebagai relationship yang berbeda.</p></div>
                      <span>{detail.current_classes.length} kelas</span>
                    </div>
                    {detail.current_classes.length === 0 ? (
                      <p className="teacher-management-detail-empty">Tidak ada kelas aktif saat ini.</p>
                    ) : (
                      <div className="teacher-management-detail-list">
                        {detail.current_classes.map((row) => (
                          <article className="teacher-management-class-card" key={`${row.class_id}-${row.relationship}`}>
                            <header>
                              <div><span>{row.program_name || 'PROGRAM KOJAC'}</span><h4>{row.class_name}</h4><small>{row.class_code || 'Tanpa kode'}</small></div>
                              <RelationshipBadge value={row.relationship}/>
                            </header>
                            <div className="teacher-management-class-meta">
                              <div><span>Status Kelas</span><strong>{classStatusLabels[row.class_status]}</strong></div>
                              <div><span>Siswa Aktif</span><strong>{row.student_active_count}</strong></div>
                              <div><span>Periode Kelas</span><strong>{formatPeriod(row.class_starts_on, row.class_ends_on)}</strong></div>
                              {row.relationship === 'substitute' && (
                                <div><span>Periode Pengganti</span><strong>{formatPeriod(row.assignment_starts_on, row.assignment_ends_on)}</strong></div>
                              )}
                            </div>
                            <Link className="class-action-secondary teacher-management-report-link" to={`/kelas-mengajar/${row.class_id}/laporan`}>
                              <FileText size={14}/> Lihat Laporan Kelas
                            </Link>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {detailTab === 'workload' && (
                  <section className="teacher-management-tab-panel teacher-workload-panel" role="tabpanel">
                    <div className="teacher-management-tab-heading">
                      <div>
                        <h3>Beban &amp; Aktivitas Mengajar</h3>
                        <p>Metric operasional faktual untuk bulan berjalan Asia/Jakarta. Tidak ada skor atau penilaian performa.</p>
                      </div>
                      <span>{formatDate(detail.workload.month_start)} – {formatDate(new Date(new Date(`${detail.workload.next_month_start}T00:00:00+07:00`).getTime() - 86400000).toISOString())}</span>
                    </div>

                    <div className="teacher-workload-summary-grid" aria-label="Ringkasan beban mengajar">
                      <article><span>Kelas Utama</span><strong>{detail.workload.primary_class_count}</strong></article>
                      <article><span>Kelas Pengganti</span><strong>{detail.workload.substitute_class_count}</strong></article>
                      <article><span>Siswa Aktif</span><strong>{detail.workload.active_student_count}</strong></article>
                      <article><span>Laporan Bulan Ini</span><strong>{detail.workload.reports_current_month}</strong></article>
                      <article className="is-duration"><span>Durasi Tercatat</span><strong>{recordedDurationLabel(detail.workload.reported_minutes_current_month)}</strong></article>
                    </div>

                    <div className="teacher-workload-last-report">
                      <CalendarDays size={16}/>
                      <div>
                        <span>Laporan Terakhir</span>
                        <strong>{detail.workload.last_report_date ? formatDate(detail.workload.last_report_date) : 'Belum ada laporan.'}</strong>
                      </div>
                    </div>

                    <p className="teacher-workload-duration-note">
                      Durasi Tercatat hanya berasal dari waktu mulai–selesai yang tersimpan pada laporan mengajar. Ini bukan jam kerja, jadwal, absensi, atau target performa.
                    </p>

                    <div className="teacher-management-tab-heading">
                      <div>
                        <h3>Aktivitas per Kelas</h3>
                        <p>Setiap kelas dihitung satu kali dan relationship Pengajar Utama / Pengajar Pengganti tetap dibedakan.</p>
                      </div>
                      <span>{detail.workload.classes.length} kelas</span>
                    </div>

                    {detail.workload.classes.length === 0 ? (
                      <p className="teacher-management-detail-empty">Tidak ada kelas aktif yang sedang diajar.</p>
                    ) : (
                      <div className="teacher-workload-class-grid">
                        {detail.workload.classes.map((row) => (
                          <article className="teacher-workload-class-card" key={`${row.class_id}-${row.relationship}`}>
                            <header>
                              <div>
                                <span>{row.program_name || 'PROGRAM KOJAC'}</span>
                                <h4>{row.class_name}</h4>
                                <small>{row.class_code || 'Tanpa kode'}</small>
                              </div>
                              <RelationshipBadge value={row.relationship}/>
                            </header>

                            <div className="teacher-workload-class-stats">
                              <div><span>Siswa Aktif</span><strong>{row.active_student_count}</strong></div>
                              <div><span>Laporan Bulan Ini</span><strong>{row.reports_current_month}</strong></div>
                              <div><span>Durasi Tercatat</span><strong>{recordedDurationLabel(row.reported_minutes_current_month)}</strong></div>
                              <div><span>Laporan Terakhir</span><strong>{row.last_report_date ? formatDate(row.last_report_date) : 'Belum ada laporan.'}</strong></div>
                            </div>

                            <div className="teacher-workload-period">
                              <span>{row.relationship === 'substitute' ? 'Periode Pengganti' : 'Periode Kelas'}</span>
                              <strong>
                                {row.relationship === 'substitute'
                                  ? formatPeriod(row.assignment_starts_on, row.assignment_ends_on)
                                  : formatPeriod(row.class_starts_on, row.class_ends_on)}
                              </strong>
                            </div>

                            <Link className="class-action-secondary teacher-management-report-link" to={`/kelas-mengajar/${row.class_id}/laporan`}>
                              <FileText size={14}/> Lihat Laporan Kelas
                            </Link>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {detailTab === 'history' && (
                  <section className="teacher-management-tab-panel" role="tabpanel">
                    <div className="teacher-management-history-warning">
                      <AlertCircle size={17}/>
                      <span>Riwayat Pengajar Utama lama yang sudah diganti tidak dapat direkonstruksi dari model saat ini karena <code>classes.teacher_id</code> hanya menyimpan Pengajar Utama yang sekarang.</span>
                    </div>
                    <div className="teacher-management-tab-heading">
                      <div><h3>Riwayat / Penugasan Lain</h3><p>Menampilkan relationship yang masih dapat dibuktikan dari data existing.</p></div>
                      <span>{detail.history.length} item</span>
                    </div>
                    {detail.history.length === 0 ? (
                      <p className="teacher-management-detail-empty">Belum ada riwayat assignment yang dapat dibuktikan.</p>
                    ) : (
                      <div className="teacher-management-history-list">
                        {detail.history.map((row) => (
                          <article key={`${row.relationship}-${row.assignment_id || row.class_id}`} className="teacher-management-history-card">
                            <div>
                              <span>{row.program_name || 'PROGRAM KOJAC'}</span>
                              <h4>{row.class_name}</h4>
                              <small>{row.class_code || 'Tanpa kode'} · {classStatusLabels[row.class_status]}</small>
                            </div>
                            <div className="teacher-management-history-meta">
                              <RelationshipBadge value={row.relationship}/>
                              <span className="teacher-management-history-state">{historyStateLabels[row.history_state]}</span>
                              <strong>{formatPeriod(row.relationship_starts_on, row.relationship_ends_on)}</strong>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {detailTab === 'reports' && (
                  <section className="teacher-management-tab-panel" role="tabpanel">
                    <div className="teacher-management-tab-heading">
                      <div><h3>Laporan Mengajar Terbaru</h3><p>Identity report memakai <code>teacher_id</code>, bukan pencocokan nama.</p></div>
                      <span>{Math.min(detail.report_count, 10)} / {detail.report_count} laporan</span>
                    </div>
                    {detail.recent_reports.length === 0 ? (
                      <p className="teacher-management-detail-empty">Belum ada laporan mengajar.</p>
                    ) : (
                      <div className="teacher-management-report-list">
                        {detail.recent_reports.map((report) => (
                          <article className="teacher-management-report-card" key={report.report_id}>
                            <header>
                              <div><span>{report.program_name || 'PROGRAM KOJAC'}</span><h4>{report.class_name}</h4><small>{report.class_code || 'Tanpa kode'}</small></div>
                              <strong><CalendarDays size={14}/>{formatDate(report.report_date)}</strong>
                            </header>
                            <p>{materialPreview(report.material_summary)}</p>
                            <Link className="class-action-secondary teacher-management-report-link" to={`/kelas-mengajar/${report.class_id}/laporan`}>
                              <FileText size={14}/> Buka Laporan Kelas
                            </Link>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
