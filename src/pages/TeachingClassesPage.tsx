import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
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

type TeachingStudentRow = {
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  enrollment_status: EnrollmentStatus;
  joined_at: string;
  completed_at: string | null;
};

const TEACHING_ROLES = new Set<AppRole>(['pengajar', 'administrator', 'manager', 'co_founder', 'founder']);

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

function ClassCard({ row, onOpen, busy }: { row: TeachingClassRow; onOpen: () => void; busy: boolean }) {
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

      <div className="class-info-grid">
        <div className="class-info-item">
          <span className="class-info-label"><CalendarDays/>Periode</span>
          <strong className="class-info-value">{formatPeriod(row.starts_on, row.ends_on)}</strong>
        </div>
        <div className="class-info-item">
          <span className="class-info-label"><UsersRound/>Jumlah Siswa</span>
          <strong className="class-info-value">{row.student_count_total_current} siswa</strong>
          <span className="class-info-subvalue">Aktif {row.student_count_active} · Dijeda {row.student_count_paused}</span>
        </div>
      </div>

      <div className="class-action-row">
        <Link className="class-action-primary" to={`/kelas-mengajar/${row.class_id}/laporan`}>
          <FileText size={16}/>Laporan Mengajar
        </Link>
        <button className="class-action-secondary" type="button" disabled={busy} onClick={onOpen}>
          <UsersRound size={16}/>{busy ? 'Memuat…' : 'Lihat Siswa'}
        </button>
      </div>
    </article>
  );
}

function StudentRow({ row }: { row: TeachingStudentRow }) {
  const displayName = row.full_name?.trim() || row.nickname?.trim() || 'Siswa KOJAC';
  return (
    <article className="class-student-row">
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
      </div>
    </article>
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

export function TeachingClassesPage() {
  const { role, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<TeachingClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedClass, setSelectedClass] = useState<TeachingClassRow | null>(null);
  const [students, setStudents] = useState<TeachingStudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const canTeach = Boolean(role && TEACHING_ROLES.has(role));

  const loadClasses = useCallback(async () => {
    if (!role || !TEACHING_ROLES.has(role)) return;
    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_my_teaching_classes');
    if (loadError) {
      console.error('KOJAC teaching classes load failed', loadError);
      setClasses([]);
      setError(true);
      setLoading(false);
      return;
    }

    setClasses((data ?? []) as TeachingClassRow[]);
    setLoading(false);
  }, [role]);

  const loadStudents = useCallback(async (classRow: TeachingClassRow) => {
    setSelectedClass(classRow);
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

  const closeStudents = useCallback(() => {
    setSelectedClass(null);
    setStudents([]);
    setStudentsError(false);
    setStudentsLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && canTeach) void loadClasses();
  }, [authLoading, canTeach, loadClasses]);

  useEffect(() => {
    if (!selectedClass) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeStudents();
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedClass, closeStudents]);

  const activeClassCount = useMemo(() => classes.filter((row) => row.class_status === 'active').length, [classes]);
  const plannedClassCount = useMemo(() => classes.filter((row) => row.class_status === 'planned').length, [classes]);
  const totalActiveStudents = useMemo(() => classes.reduce((sum, row) => sum + row.student_count_active, 0), [classes]);
  const currentClasses = useMemo(
    () => classes.filter((row) => row.class_status === 'active' || row.class_status === 'planned'),
    [classes],
  );
  const historyClasses = useMemo(
    () => classes.filter((row) => row.class_status === 'completed' || row.class_status === 'cancelled'),
    [classes],
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
          <p>Kelola kelas yang ditugaskan kepada Anda.</p>
        </div>
      </header>

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
      ) : classes.length === 0 ? (
        <section className="class-state-card">
          <div className="class-state-icon"><School size={30}/></div>
          <h2>Belum ada kelas yang ditugaskan kepada akun Anda.</h2>
          {role === 'pengajar' && (
            <p>Silakan hubungi admin KOJAC jika Anda seharusnya sudah menjadi pengajar suatu kelas.</p>
          )}
        </section>
      ) : (
        <>
          <section className="class-section">
            <div className="class-section-heading">
              <div>
                <p className="eyebrow">KELAS SAAT INI</p>
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
                  <h2>Riwayat Kelas Mengajar</h2>
                </div>
                <span className="class-section-count">{historyClasses.length} kelas</span>
              </div>
              <div className="class-card-grid">
                {historyClasses.map((row) => (
                  <ClassCard
                    key={row.class_id}
                    row={row}
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
                <p className="eyebrow">DAFTAR SISWA</p>
                <h2 id="teaching-students-title">{selectedClass.class_name}</h2>
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
                        {currentStudents.map((row) => <StudentRow key={row.user_id} row={row}/>) }
                      </div>
                    ) : (
                      <div className="class-student-empty">Belum ada siswa aktif atau dijeda pada kelas ini.</div>
                    )}
                  </section>

                  {historyStudents.length > 0 && (
                    <section className="class-student-section">
                      <h3 className="class-student-section-title"><History size={18}/>Riwayat Siswa</h3>
                      <div className="class-student-list">
                        {historyStudents.map((row) => <StudentRow key={row.user_id} row={row}/>) }
                      </div>
                    </section>
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
