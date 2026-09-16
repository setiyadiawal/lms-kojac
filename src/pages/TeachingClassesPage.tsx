import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  FileText,
  History,
  RefreshCw,
  School,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import '../classroom.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type ClassStatus = 'planned' | 'active' | 'completed' | 'cancelled';
type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';
type WorkspaceMode = 'mine' | 'all';

type TeachingClassRow = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: ClassStatus;
  starts_on: string | null;
  ends_on: string | null;
  program_code: string | null;
  program_name: string | null;
  student_count_active: number;
  student_count_paused: number;
  student_count_total_current: number;
};

type ManagementClassRow = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: ClassStatus;
  program_name: string | null;
  program_code: string | null;
  primary_teacher_id: string | null;
  primary_teacher_name: string | null;
  starts_on: string | null;
  ends_on: string | null;
  student_active_count: number;
  student_paused_count: number;
  report_count: number;
  last_report_date: string | null;
};

type TeachingStudentRow = {
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  enrollment_status: EnrollmentStatus;
  joined_at: string;
  completed_at: string | null;
};

type StudentDetailRow = {
  student_id: string;
  full_name: string | null;
  nickname: string | null;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  class_id: string;
  class_code: string | null;
  class_name: string;
  enrollment_status: EnrollmentStatus;
  joined_at: string;
  completed_at: string | null;
};

const TEACHING_ROLES = new Set<AppRole>(['pengajar', 'administrator', 'manager', 'co_founder', 'founder']);
const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);

const classLabels: Record<ClassStatus, string> = {
  planned: 'Direncanakan',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const enrollmentLabels: Record<EnrollmentStatus, string> = {
  active: 'Aktif',
  paused: 'Dijeda',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return 'Belum ditentukan';
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `Mulai ${formatDate(start)}`;
  return `Sampai ${formatDate(end)}`;
}

function classStatusClass(status: ClassStatus) {
  return `class-status-badge is-${status}`;
}

function enrollmentStatusClass(status: EnrollmentStatus) {
  return `class-status-badge is-${status}`;
}

function SummaryCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="class-summary-card">
      <div className="class-summary-icon">{icon}</div>
      <div className="class-summary-copy">
        <strong className="class-summary-value">{value}</strong>
        <span className="class-summary-label">{label}</span>
      </div>
    </div>
  );
}

function ClassCard({
  row,
  onOpen,
  busy,
  management,
}: {
  row: TeachingClassRow;
  onOpen: () => void;
  busy: boolean;
  management?: ManagementClassRow;
}) {
  return (
    <article className="class-card">
      <div className="class-card-header">
        <div className="class-card-heading">
          <p className="class-card-program">{row.program_name || 'PROGRAM KOJAC'}</p>
          <h3 className="class-card-title">{row.class_name}</h3>
          <span className="class-code-badge">{row.class_code || 'Tanpa kode kelas'}</span>
        </div>
        <span className={classStatusClass(row.class_status)}>{classLabels[row.class_status]}</span>
      </div>

      <div className={`class-info-grid ${management ? 'class-info-grid-management' : ''}`}>
        <div className="class-info-item">
          <span className="class-info-label"><CalendarDays/>Periode</span>
          <strong className="class-info-value">{formatPeriod(row.starts_on, row.ends_on)}</strong>
        </div>
        {management && (
          <div className="class-info-item">
            <span className="class-info-label"><UserRound/>Pengajar Utama</span>
            <strong className="class-info-value">{management.primary_teacher_name || 'Belum ditentukan'}</strong>
          </div>
        )}
        <div className="class-info-item">
          <span className="class-info-label"><UsersRound/>Jumlah Siswa</span>
          <strong className="class-info-value">{row.student_count_total_current} siswa</strong>
          <span className="class-info-subvalue">Aktif {row.student_count_active} · Dijeda {row.student_count_paused}</span>
        </div>
        {management && (
          <div className="class-info-item">
            <span className="class-info-label"><FileText/>Laporan</span>
            <strong className="class-info-value">{management.report_count} laporan</strong>
            <span className="class-info-subvalue">Terakhir {formatDate(management.last_report_date)}</span>
          </div>
        )}
      </div>

      <div className="class-action-row">
        <Link className={management ? 'class-action-secondary' : 'class-action-primary'} to={`/kelas-mengajar/${row.class_id}/laporan`}>
          <FileText size={16}/>{management ? 'Lihat Laporan' : 'Laporan Mengajar'}
        </Link>
        <button className="class-action-secondary" type="button" disabled={busy} onClick={onOpen}>
          <UsersRound size={16}/>{busy ? 'Memuat…' : 'Lihat Siswa'}
        </button>
      </div>
    </article>
  );
}

function StudentRow({ row, onOpen }: { row: TeachingStudentRow; onOpen: () => void }) {
  const displayName = row.full_name?.trim() || row.nickname?.trim() || 'Siswa KOJAC';
  return (
    <button className="class-student-row class-student-row-button" type="button" onClick={onOpen}>
      <div className="class-student-name">
        <strong>{displayName}</strong>
        {row.nickname && row.nickname !== displayName && <span>{row.nickname}</span>}
      </div>
      <div className="class-student-meta">
        <span className={enrollmentStatusClass(row.enrollment_status)}>{enrollmentLabels[row.enrollment_status]}</span>
        <span>
          Bergabung {formatDate(row.joined_at)}
          {row.completed_at ? ` · Selesai ${formatDate(row.completed_at)}` : ''}
        </span>
        <ChevronRight className="class-student-chevron" size={18} aria-hidden="true"/>
      </div>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="class-skeleton-grid" aria-label="Memuat kelas mengajar" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div className="class-skeleton-card" key={item}>
          <div className="class-skeleton-block is-short" />
          <div className="class-skeleton-block is-title" />
          <div className="class-skeleton-block is-medium" />
          <div className="class-skeleton-fields">
            <div className="class-skeleton-field" />
            <div className="class-skeleton-field" />
          </div>
        </div>
      ))}
    </div>
  );
}

function managementToTeachingRow(row: ManagementClassRow): TeachingClassRow {
  return {
    class_id: row.class_id,
    class_code: row.class_code,
    class_name: row.class_name,
    class_status: row.class_status,
    starts_on: row.starts_on,
    ends_on: row.ends_on,
    program_code: row.program_code,
    program_name: row.program_name,
    student_count_active: row.student_active_count,
    student_count_paused: row.student_paused_count,
    student_count_total_current: row.student_active_count + row.student_paused_count,
  };
}

export function TeachingClassesPage() {
  const { role, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<WorkspaceMode>('mine');
  const [classes, setClasses] = useState<TeachingClassRow[]>([]);
  const [managementClasses, setManagementClasses] = useState<ManagementClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedClass, setSelectedClass] = useState<TeachingClassRow | null>(null);
  const [students, setStudents] = useState<TeachingStudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<TeachingStudentRow | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetailRow | null>(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [studentDetailError, setStudentDetailError] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const canTeach = Boolean(role && TEACHING_ROLES.has(role));
  const canManage = Boolean(role && MANAGEMENT_ROLES.has(role));

  const loadClasses = useCallback(async () => {
    if (!role || !TEACHING_ROLES.has(role)) return;
    setLoading(true);
    setError(false);

    const ownPromise = supabase.rpc('get_my_teaching_classes');
    const managementPromise = MANAGEMENT_ROLES.has(role)
      ? supabase.rpc('get_management_classes_overview')
      : Promise.resolve({ data: null, error: null });
    const [ownResult, managementResult] = await Promise.all([ownPromise, managementPromise]);

    if (ownResult.error || managementResult.error) {
      console.error('KOJAC teaching classes load failed', ownResult.error ?? managementResult.error);
      setClasses([]);
      setManagementClasses([]);
      setError(true);
      setLoading(false);
      return;
    }

    setClasses((ownResult.data ?? []) as TeachingClassRow[]);
    setManagementClasses((managementResult.data ?? []) as ManagementClassRow[]);
    setLoading(false);
  }, [role]);

  const loadStudents = useCallback(async (classRow: TeachingClassRow) => {
    setSelectedClass(classRow);
    setSelectedStudent(null);
    setStudentDetail(null);
    setStudentDetailError(false);
    setStudents([]);
    setStudentsLoading(true);
    setStudentsError(false);

    const { data, error: loadError } = await supabase.rpc('get_my_class_students', {
      p_class_id: classRow.class_id,
    });

    if (loadError) {
      console.error('KOJAC teaching class students load failed', loadError);
      setStudentsError(true);
      setStudentsLoading(false);
      return;
    }

    setStudents((data ?? []) as TeachingStudentRow[]);
    setStudentsLoading(false);
  }, []);

  const loadStudentDetail = useCallback(async (row: TeachingStudentRow) => {
    if (!selectedClass) return;
    setSelectedStudent(row);
    setStudentDetail(null);
    setStudentDetailLoading(true);
    setStudentDetailError(false);

    const { data, error: loadError } = await supabase.rpc('get_class_student_detail', {
      p_class_id: selectedClass.class_id,
      p_student_id: row.user_id,
    });

    if (loadError) {
      console.error('KOJAC class student detail load failed', loadError);
      setStudentDetailError(true);
      setStudentDetailLoading(false);
      return;
    }

    const detailRows = (data ?? []) as StudentDetailRow[];
    setStudentDetail(detailRows[0] ?? null);
    setStudentDetailError(detailRows.length === 0);
    setStudentDetailLoading(false);
  }, [selectedClass]);

  const backToStudentList = useCallback(() => {
    setSelectedStudent(null);
    setStudentDetail(null);
    setStudentDetailError(false);
    setStudentDetailLoading(false);
  }, []);

  const closeStudents = useCallback(() => {
    setSelectedClass(null);
    setStudents([]);
    setStudentsError(false);
    setStudentsLoading(false);
    setSelectedStudent(null);
    setStudentDetail(null);
    setStudentDetailError(false);
    setStudentDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && canTeach) void loadClasses();
  }, [authLoading, canTeach, loadClasses]);

  useEffect(() => {
    if (!canManage && mode === 'all') setMode('mine');
  }, [canManage, mode]);

  useEffect(() => {
    if (!selectedClass) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedStudent) backToStudentList();
      else closeStudents();
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedClass, selectedStudent, backToStudentList, closeStudents]);

  const displayedClasses = useMemo(
    () => mode === 'all' ? managementClasses.map(managementToTeachingRow) : classes,
    [mode, managementClasses, classes],
  );
  const managementByClassId = useMemo(
    () => new Map(managementClasses.map((row) => [row.class_id, row])),
    [managementClasses],
  );
  const activeClassCount = useMemo(() => displayedClasses.filter((row) => row.class_status === 'active').length, [displayedClasses]);
  const plannedClassCount = useMemo(() => displayedClasses.filter((row) => row.class_status === 'planned').length, [displayedClasses]);
  const totalActiveStudents = useMemo(() => displayedClasses.reduce((sum, row) => sum + row.student_count_active, 0), [displayedClasses]);
  const currentClasses = useMemo(
    () => displayedClasses.filter((row) => row.class_status === 'active' || row.class_status === 'planned'),
    [displayedClasses],
  );
  const historyClasses = useMemo(
    () => displayedClasses.filter((row) => row.class_status === 'completed' || row.class_status === 'cancelled'),
    [displayedClasses],
  );
  const currentStudents = useMemo(
    () => students.filter((row) => row.enrollment_status === 'active' || row.enrollment_status === 'paused'),
    [students],
  );
  const historyStudents = useMemo(
    () => students.filter((row) => row.enrollment_status === 'completed' || row.enrollment_status === 'cancelled'),
    [students],
  );
  const modalActiveCount = useMemo(() => students.filter((row) => row.enrollment_status === 'active').length, [students]);
  const modalPausedCount = useMemo(() => students.filter((row) => row.enrollment_status === 'paused').length, [students]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canTeach) return <Navigate to="/" replace />;

  return (
    <div className="page class-experience-page">
      <header className="class-page-header">
        <div className="class-page-header-copy">
          <p className="eyebrow">PENGAJAR KOJAC</p>
          <h1>Kelas Mengajar</h1>
          <p>{mode === 'all' ? 'Pantau seluruh kelas KOJAC untuk kebutuhan monitoring dan rekap.' : 'Kelola kelas yang ditugaskan kepada Anda.'}</p>
        </div>
      </header>

      {canManage && (
        <div className="class-workspace-tabs" role="tablist" aria-label="Mode kelas mengajar">
          <button type="button" role="tab" aria-selected={mode === 'mine'} className={mode === 'mine' ? 'is-active' : ''} onClick={() => setMode('mine')}>Kelas Saya</button>
          <button type="button" role="tab" aria-selected={mode === 'all'} className={mode === 'all' ? 'is-active' : ''} onClick={() => setMode('all')}>Semua Kelas</button>
        </div>
      )}

      <section className="class-summary-grid" aria-label="Ringkasan kelas mengajar">
        <SummaryCard icon={<BookOpenCheck size={20}/>} value={activeClassCount} label="Kelas Aktif" />
        <SummaryCard icon={<CalendarDays size={20}/>} value={plannedClassCount} label="Kelas Direncanakan" />
        <SummaryCard icon={<UsersRound size={20}/>} value={totalActiveStudents} label="Total Siswa Aktif" />
      </section>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <section className="class-state-card" role="alert">
          <div className="class-state-icon"><AlertCircle size={28}/></div>
          <h2>Data kelas mengajar belum dapat dimuat.</h2>
          <p>Silakan coba lagi. Tidak ada perubahan pada data kelas Anda.</p>
          <button className="class-action-secondary" type="button" onClick={() => void loadClasses()}>
            <RefreshCw size={16}/>Coba Lagi
          </button>
        </section>
      ) : displayedClasses.length === 0 ? (
        <section className="class-state-card">
          <div className="class-state-icon"><School size={30}/></div>
          <h2>{mode === 'all' ? 'Belum ada kelas KOJAC.' : 'Belum ada kelas yang ditugaskan kepada akun Anda.'}</h2>
          {role === 'pengajar' && (
            <p>Silakan hubungi admin KOJAC jika Anda seharusnya sudah menjadi pengajar suatu kelas.</p>
          )}
        </section>
      ) : (
        <>
          <section className="class-section">
            <div className="class-section-heading">
              <div>
                <p className="eyebrow">{mode === 'all' ? 'MONITORING KELAS' : 'KELAS SAAT INI'}</p>
                <h2>Kelas Aktif & Direncanakan</h2>
              </div>
              <span className="class-section-count">{currentClasses.length} kelas</span>
            </div>

            {currentClasses.length > 0 ? (
              <div className="class-card-grid">
                {currentClasses.map((row) => (
                  <ClassCard
                    key={row.class_id}
                    row={row}
                    management={mode === 'all' ? managementByClassId.get(row.class_id) : undefined}
                    busy={studentsLoading && selectedClass?.class_id === row.class_id}
                    onOpen={() => void loadStudents(row)}
                  />
                ))}
              </div>
            ) : (
              <div className="class-state-card" style={{ marginTop: 0, paddingBlock: 26 }}>
                <p style={{ margin: 0 }}>Tidak ada kelas aktif atau direncanakan saat ini.</p>
              </div>
            )}
          </section>

          {historyClasses.length > 0 && (
            <section className="class-section">
              <div className="class-section-heading">
                <div>
                  <p className="eyebrow">RIWAYAT</p>
                  <h2>Riwayat Kelas</h2>
                </div>
                <span className="class-section-count">{historyClasses.length} kelas</span>
              </div>
              <div className="class-card-grid">
                {historyClasses.map((row) => (
                  <ClassCard
                    key={row.class_id}
                    row={row}
                    management={mode === 'all' ? managementByClassId.get(row.class_id) : undefined}
                    busy={studentsLoading && selectedClass?.class_id === row.class_id}
                    onOpen={() => void loadStudents(row)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selectedClass && (
        <div
          className="class-modal-backdrop"
          onClick={(event) => {
            if (event.currentTarget === event.target) closeStudents();
          }}
        >
          <section
            className="class-student-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teaching-students-title"
            aria-describedby="teaching-students-description"
          >
            <header className="class-dialog-header">
              <div style={{ minWidth: 0 }}>
                <p className="eyebrow">{selectedStudent ? 'DETAIL SISWA' : 'DAFTAR SISWA'}</p>
                <h2 id="teaching-students-title">
                  {selectedStudent
                    ? (selectedStudent.full_name?.trim() || selectedStudent.nickname?.trim() || 'Siswa KOJAC')
                    : selectedClass.class_name}
                </h2>
                <p id="teaching-students-description" className="class-dialog-code">
                  {selectedClass.program_name || 'Program KOJAC'} · {selectedClass.class_code || 'Tanpa kode kelas'}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="class-modal-close"
                aria-label="Tutup daftar siswa"
                onClick={closeStudents}
              >
                <X size={19}/>
              </button>
            </header>

            <div className="class-dialog-body">
              {selectedStudent ? (
                <div className="class-student-detail-view">
                  <button className="class-student-detail-back" type="button" onClick={backToStudentList}>
                    <ArrowLeft size={16}/> Kembali ke Daftar Siswa
                  </button>

                  {studentDetailLoading ? (
                    <div className="class-student-detail-grid" aria-busy="true">
                      {[0, 1, 2, 3, 4, 5].map((item) => <div className="class-skeleton-field" key={item}/>) }
                    </div>
                  ) : studentDetailError || !studentDetail ? (
                    <div className="class-state-card" style={{ marginTop: 0, paddingBlock: 26 }} role="alert">
                      <div className="class-state-icon"><AlertCircle size={24}/></div>
                      <h2>Detail siswa belum dapat dimuat.</h2>
                      <p>Silakan coba lagi.</p>
                      <button className="class-action-secondary" type="button" onClick={() => void loadStudentDetail(selectedStudent)}>
                        <RefreshCw size={16}/>Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <div className="class-student-detail-grid">
                      <div className="class-student-detail-item is-wide"><span>Nama Lengkap</span><strong>{studentDetail.full_name || '—'}</strong></div>
                      <div className="class-student-detail-item"><span>Nama Panggilan</span><strong>{studentDetail.nickname || '—'}</strong></div>
                      <div className="class-student-detail-item"><span>Status</span><strong><span className={enrollmentStatusClass(studentDetail.enrollment_status)}>{enrollmentLabels[studentDetail.enrollment_status]}</span></strong></div>
                      <div className="class-student-detail-item"><span>Program</span><strong>{studentDetail.program_name || '—'}</strong></div>
                      <div className="class-student-detail-item"><span>Kelas</span><strong>{studentDetail.class_name}</strong></div>
                      <div className="class-student-detail-item"><span>Bergabung</span><strong>{formatDate(studentDetail.joined_at)}</strong></div>
                      <div className="class-student-detail-item"><span>Selesai</span><strong>{formatDate(studentDetail.completed_at)}</strong></div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="class-student-summary" aria-label="Ringkasan siswa kelas">
                    <div><strong>{modalActiveCount}</strong><span>Siswa Aktif</span></div>
                    <div><strong>{modalPausedCount}</strong><span>Dijeda</span></div>
                  </div>

                  {studentsLoading ? (
                    <div className="class-skeleton-grid" style={{ marginTop: 0 }} aria-busy="true" aria-label="Memuat daftar siswa">
                      {[0, 1, 2].map((item) => (
                        <div className="class-skeleton-field" key={item} style={{ height: 64 }} />
                      ))}
                    </div>
                  ) : studentsError ? (
                    <div className="class-state-card" style={{ marginTop: 0, paddingBlock: 26 }} role="alert">
                      <div className="class-state-icon"><AlertCircle size={24}/></div>
                      <h2>Daftar siswa belum dapat dimuat.</h2>
                      <p>Silakan coba lagi.</p>
                      <button className="class-action-secondary" type="button" onClick={() => void loadStudents(selectedClass)}>
                        <RefreshCw size={16}/>Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <>
                      <section className="class-student-section">
                        <h3 className="class-student-section-title"><UserRound size={18}/>Siswa Aktif</h3>
                        {currentStudents.length > 0 ? (
                          <div className="class-student-list">
                            {currentStudents.map((row) => <StudentRow key={row.user_id} row={row} onOpen={() => void loadStudentDetail(row)}/>) }
                          </div>
                        ) : (
                          <div className="class-student-empty">Belum ada siswa aktif atau dijeda pada kelas ini.</div>
                        )}
                      </section>

                      {historyStudents.length > 0 && (
                        <section className="class-student-section">
                          <h3 className="class-student-section-title"><History size={18}/>Riwayat Siswa</h3>
                          <div className="class-student-list">
                            {historyStudents.map((row) => <StudentRow key={row.user_id} row={row} onOpen={() => void loadStudentDetail(row)}/>) }
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
