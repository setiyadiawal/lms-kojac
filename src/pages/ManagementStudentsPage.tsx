import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
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
import {
  collectAllFilteredStudentRows,
  downloadStudentDirectoryCsv,
  downloadStudentDirectoryXlsx,
  type StudentDirectoryExportMetadata,
} from '../lib/studentDirectoryExport';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type AcademicStatus = 'active' | 'inactive' | 'alumni';
type AccountStatus = 'active' | 'pending' | 'blocked';
type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';
type SortMode = 'name_asc' | 'name_desc' | 'joined_desc';
type ExportFormat = 'xlsx' | 'csv';

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

type ReviewModuleProgress = {
  reviewed: number;
  mastered: number;
  total: number;
  last_activity: string | null;
};

type ReadingModuleProgress = {
  attempted: number;
  mastered: number;
  repeat: number;
  total: null;
  last_activity: string | null;
};

type ListeningModuleProgress = {
  attempted: number;
  completed: number;
  mastered: number;
  total: null;
  last_activity: string | null;
};

type StudentLearningProgress = {
  hiragana: ReviewModuleProgress | null;
  katakana: ReviewModuleProgress | null;
  vocabulary: ReviewModuleProgress | null;
  kanji: ReviewModuleProgress | null;
  grammar: ReviewModuleProgress | null;
  reading: ReadingModuleProgress | null;
  listening: ListeningModuleProgress | null;
  last_learning_activity: string | null;
};

type StudentDetail = {
  profile: {
    student_id: string;
    full_name: string | null;
    nickname: string | null;
  };
  academic_status: AcademicStatus;
  account_status: AccountStatus;
  first_joined_at: string | null;
  current_classes: StudentDetailClass[];
  class_history: StudentDetailClass[];
  learning_progress: StudentLearningProgress;
};

type StudentDetailTab = 'summary' | 'academic' | 'progress';

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

const sortLabels: Record<SortMode, string> = {
  name_asc: 'Nama A–Z',
  name_desc: 'Nama Z–A',
  joined_desc: 'Terbaru Bergabung',
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


function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percent(part: number, total: number) {
  return total > 0 ? clampPercent((part / total) * 100) : 0;
}

function ReviewProgressCard({
  title,
  metric,
}: {
  title: string;
  metric: ReviewModuleProgress | null;
}) {
  if (!metric) {
    return (
      <article className="student-360-progress-card">
        <header><h4>{title}</h4></header>
        <p className="student-360-progress-empty">Belum tersedia.</p>
      </article>
    );
  }

  const coverage = percent(metric.reviewed, metric.total);
  const mastery = percent(metric.mastered, metric.total);
  const hasActivity = metric.reviewed > 0;

  return (
    <article className="student-360-progress-card">
      <header>
        <h4>{title}</h4>
        <span>{metric.total.toLocaleString('id-ID')} materi published</span>
      </header>

      {!hasActivity && <p className="student-360-progress-empty">Belum ada aktivitas.</p>}

      <div className="student-360-progress-stats">
        <div><span>Dipelajari</span><strong>{metric.reviewed.toLocaleString('id-ID')}</strong></div>
        <div><span>Dikuasai</span><strong>{metric.mastered.toLocaleString('id-ID')}</strong></div>
        <div><span>Total</span><strong>{metric.total.toLocaleString('id-ID')}</strong></div>
      </div>

      <div className="student-360-progress-bars">
        <div>
          <div><span>Cakupan</span><strong>{coverage}%</strong></div>
          <div className="student-360-progress-track"><i style={{ width: `${coverage}%` }}/></div>
        </div>
        <div>
          <div><span>Penguasaan</span><strong>{mastery}%</strong></div>
          <div className="student-360-progress-track is-mastery"><i style={{ width: `${mastery}%` }}/></div>
        </div>
      </div>

      <small>Aktivitas terakhir: {formatDate(metric.last_activity)}</small>
    </article>
  );
}

function ReadingProgressCard({ metric }: { metric: ReadingModuleProgress | null }) {
  if (!metric) {
    return <article className="student-360-progress-card"><header><h4>Reading</h4></header><p className="student-360-progress-empty">Belum tersedia.</p></article>;
  }
  const hasActivity = metric.attempted > 0;
  return (
    <article className="student-360-progress-card">
      <header><h4>Reading</h4><span>Metric completion & skor tersimpan</span></header>
      {!hasActivity && <p className="student-360-progress-empty">Belum ada aktivitas.</p>}
      <div className="student-360-progress-stats">
        <div><span>Dikerjakan</span><strong>{metric.attempted}</strong></div>
        <div><span>Dikuasai</span><strong>{metric.mastered}</strong></div>
        <div><span>Perlu Diulang</span><strong>{metric.repeat}</strong></div>
      </div>
      <p className="student-360-progress-note">Total materi tidak dihitung di RPC agar denominator source-code tidak disamakan secara palsu dengan data progress database.</p>
      <small>Aktivitas terakhir: {formatDate(metric.last_activity)}</small>
    </article>
  );
}

function ListeningProgressCard({ metric }: { metric: ListeningModuleProgress | null }) {
  if (!metric) {
    return <article className="student-360-progress-card"><header><h4>Listening</h4></header><p className="student-360-progress-empty">Belum tersedia.</p></article>;
  }
  const hasActivity = metric.attempted > 0;
  return (
    <article className="student-360-progress-card">
      <header><h4>Listening</h4><span>Metric attempt, completion & skor tersimpan</span></header>
      {!hasActivity && <p className="student-360-progress-empty">Belum ada aktivitas.</p>}
      <div className="student-360-progress-stats">
        <div><span>Dikerjakan</span><strong>{metric.attempted}</strong></div>
        <div><span>Selesai</span><strong>{metric.completed}</strong></div>
        <div><span>Dikuasai</span><strong>{metric.mastered}</strong></div>
      </div>
      <p className="student-360-progress-note">Total materi tidak dihitung di RPC agar denominator source-code tidak disamakan secara palsu dengan data progress database.</p>
      <small>Aktivitas terakhir: {formatDate(metric.last_activity)}</small>
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
  const [detailTab, setDetailTab] = useState<StudentDetailTab>('summary');
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportMessage, setExportMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
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

  const exportStudents = useCallback(async (format: ExportFormat) => {
    if (!payload || exportingFormat || loading || payload.pagination.total_rows === 0) return;

    // Capture the exact directory filter state at export start.
    const snapshot = {
      academicStatus,
      programId,
      classId,
      teacherId,
      search: debouncedSearch,
      sort,
    };

    const metadata: StudentDirectoryExportMetadata = {
      academicStatus: snapshot.academicStatus
        ? academicLabels[snapshot.academicStatus as AcademicStatus]
        : 'Semua status',
      program: snapshot.programId
        ? payload.filters.programs.find((item) => item.id === snapshot.programId)?.name || 'Program terpilih'
        : 'Semua program',
      className: snapshot.classId
        ? payload.filters.classes.find((item) => item.id === snapshot.classId)?.name || 'Kelas terpilih'
        : 'Semua kelas',
      teacher: snapshot.teacherId
        ? payload.filters.teachers.find((item) => item.id === snapshot.teacherId)?.name || 'Pengajar terpilih'
        : 'Semua pengajar',
      search: snapshot.search || '—',
      sort: sortLabels[snapshot.sort],
      exportedAt: new Date(),
    };

    setExportingFormat(format);
    setExportMessage(null);

    try {
      const exportRows = await collectAllFilteredStudentRows(async (exportPage, exportPageSize) => {
        const { data, error: exportError } = await supabase.rpc('get_management_students', {
          p_student_status: snapshot.academicStatus || null,
          p_program_id: snapshot.programId || null,
          p_class_id: snapshot.classId || null,
          p_teacher_id: snapshot.teacherId || null,
          p_search: snapshot.search || null,
          p_sort: snapshot.sort,
          p_page: exportPage,
          p_page_size: exportPageSize,
        });

        if (exportError) throw exportError;
        return data as DirectoryPayload;
      });

      if (format === 'xlsx') downloadStudentDirectoryXlsx(exportRows, metadata);
      else downloadStudentDirectoryCsv(exportRows, metadata.exportedAt);

      setExportMessage({ kind: 'success', text: 'Data siswa berhasil diekspor.' });
    } catch (exportError) {
      console.error('KOJAC student directory export failed', exportError);
      setExportMessage({ kind: 'error', text: 'Data siswa belum dapat diekspor. Silakan coba lagi.' });
    } finally {
      setExportingFormat(null);
    }
  }, [
    academicStatus, classId, debouncedSearch, exportingFormat, loading, payload, programId, sort, teacherId,
  ]);

  const closeDetail = useCallback(() => {
    setSelectedStudent(null);
    setDetail(null);
    setDetailError(false);
    setDetailLoading(false);
    setDetailTab('summary');
  }, []);

  const openDetail = useCallback(async (row: StudentDirectoryRow) => {
    setSelectedStudent(row);
    setDetail(null);
    setDetailError(false);
    setDetailTab('summary');
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
              <div className="student-management-filter-actions">
                {loading && <span>Memuat data…</span>}
                <button
                  className="class-action-secondary student-management-export-button"
                  type="button"
                  disabled={Boolean(exportingFormat) || loading || pagination.total_rows === 0}
                  onClick={() => void exportStudents('xlsx')}
                >
                  <FileSpreadsheet size={15}/>
                  {exportingFormat === 'xlsx' ? 'Mengekspor...' : 'Export Excel'}
                </button>
                <button
                  className="class-action-secondary student-management-export-button"
                  type="button"
                  disabled={Boolean(exportingFormat) || loading || pagination.total_rows === 0}
                  onClick={() => void exportStudents('csv')}
                >
                  <Download size={15}/>
                  {exportingFormat === 'csv' ? 'Mengekspor...' : 'Export CSV'}
                </button>
              </div>
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

          {exportMessage && (
            <div className={`notice student-management-export-message is-${exportMessage.kind}`} role={exportMessage.kind === 'error' ? 'alert' : 'status'}>
              {exportMessage.text}
            </div>
          )}

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
                <span>Student 360 · akademik dan progress LMS read-only</span>
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
              <div className="student-management-detail-content student-360-content">
                <div className="student-360-tabs" role="tablist" aria-label="Detail siswa">
                  <button type="button" role="tab" aria-selected={detailTab === 'summary'} className={detailTab === 'summary' ? 'active' : ''} onClick={() => setDetailTab('summary')}>Ringkasan</button>
                  <button type="button" role="tab" aria-selected={detailTab === 'academic'} className={detailTab === 'academic' ? 'active' : ''} onClick={() => setDetailTab('academic')}>Akademik</button>
                  <button type="button" role="tab" aria-selected={detailTab === 'progress'} className={detailTab === 'progress' ? 'active' : ''} onClick={() => setDetailTab('progress')}>Progress LMS</button>
                </div>

                {detailTab === 'summary' && (
                  <section className="student-360-tab-panel" role="tabpanel">
                    <div className="student-management-detail-profile student-360-summary-grid">
                      <div><span>Nama Lengkap</span><strong>{detail.profile.full_name || '—'}</strong></div>
                      <div><span>Nama Panggilan</span><strong>{detail.profile.nickname || '—'}</strong></div>
                      <div><span>Status Akademik</span><AcademicBadge status={detail.academic_status}/></div>
                      <div><span>Status Akun</span><strong>{accountLabels[detail.account_status]}</strong></div>
                      <div><span>Pertama Bergabung</span><strong>{formatDate(detail.first_joined_at)}</strong></div>
                      <div><span>Aktivitas Belajar Terakhir</span><strong>{formatDate(detail.learning_progress.last_learning_activity)}</strong></div>
                    </div>
                    <p className="student-360-readonly-note">Data pada Student 360 hanya untuk pemantauan. Perubahan enrollment, akun, kelas, dan progress tetap dilakukan melalui workflow existing yang berwenang.</p>
                  </section>
                )}

                {detailTab === 'academic' && (
                  <section className="student-360-tab-panel" role="tabpanel">
                    <section className="student-management-detail-section">
                      <div className="student-management-detail-section-heading"><BookOpenCheck size={17}/><div><h3>Kelas Saat Ini</h3><p>Enrollment aktif dan dijeda. Multi-class didukung.</p></div></div>
                      {detail.current_classes.length === 0
                        ? <p className="student-management-detail-empty">Tidak ada kelas aktif atau dijeda.</p>
                        : <div className="student-management-detail-class-list">{detail.current_classes.map((row) => <DetailClassCard key={`${row.class_id}-${row.enrollment_status}`} row={row}/>)}</div>}
                    </section>

                    <section className="student-management-detail-section">
                      <div className="student-management-detail-section-heading"><BookOpenCheck size={17}/><div><h3>Riwayat Akademik</h3><p>Active/paused ditampilkan lebih dahulu, kemudian completed/cancelled terbaru. Histori tidak dihapus.</p></div></div>
                      {detail.class_history.length === 0
                        ? <p className="student-management-detail-empty">Belum ada riwayat kelas.</p>
                        : <div className="student-management-detail-class-list">{detail.class_history.map((row) => <DetailClassCard key={`${row.class_id}-${row.enrollment_status}`} row={row}/>)}</div>}
                    </section>
                  </section>
                )}

                {detailTab === 'progress' && (
                  <section className="student-360-tab-panel" role="tabpanel">
                    <div className="student-360-progress-heading">
                      <div>
                        <h3>Progress LMS</h3>
                        <p>Setiap metric mengikuti definisi progress modul existing. Tidak ada overall percentage gabungan.</p>
                      </div>
                      <span>Terakhir: {formatDate(detail.learning_progress.last_learning_activity)}</span>
                    </div>
                    <div className="student-360-progress-grid">
                      <ReviewProgressCard title="Hiragana" metric={detail.learning_progress.hiragana}/>
                      <ReviewProgressCard title="Katakana" metric={detail.learning_progress.katakana}/>
                      <ReviewProgressCard title="Kosakata" metric={detail.learning_progress.vocabulary}/>
                      <ReviewProgressCard title="Kanji" metric={detail.learning_progress.kanji}/>
                      <ReviewProgressCard title="Tata Bahasa" metric={detail.learning_progress.grammar}/>
                      <ReadingProgressCard metric={detail.learning_progress.reading}/>
                      <ListeningProgressCard metric={detail.learning_progress.listening}/>
                    </div>
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
