import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  RefreshCw,
  School,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import '../teacher-dashboard.css';
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
  primary_teacher_id: string | null;
  primary_teacher_name: string | null;
  student_count_active: number;
  student_count_paused: number;
  student_count_total_current: number;
};

type StudentProgressRow = {
  student_id: string;
  full_name: string | null;
  nickname: string | null;
  enrollment_status: EnrollmentStatus;
  joined_at: string;
  overall_percent: number;
  modules_active: number;
  hiragana_percent: number;
  katakana_percent: number;
  vocabulary_percent: number;
  kanji_percent: number;
  grammar_percent: number;
  reading_percent: number;
  listening_percent: number;
  last_learning_activity: string | null;
};

const TEACHING_ROLES = new Set<AppRole>(['pengajar', 'administrator', 'manager', 'co_founder', 'founder']);

const CLASS_STATUS_LABEL: Record<ClassStatus, string> = {
  planned: 'Direncanakan',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active: 'Aktif',
  paused: 'Dijeda',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const MODULES = [
  ['Hiragana', 'hiragana_percent'],
  ['Katakana', 'katakana_percent'],
  ['Kosakata', 'vocabulary_percent'],
  ['Kanji', 'kanji_percent'],
  ['Tata Bahasa', 'grammar_percent'],
  ['Reading', 'reading_percent'],
  ['Listening', 'listening_percent'],
] as const;

function safePercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Belum ada aktivitas';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Belum ada aktivitas';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function displayName(row: StudentProgressRow) {
  return row.full_name?.trim() || row.nickname?.trim() || 'Siswa KOJAC';
}

function ClassSummaryCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="teacher-dashboard-summary-card">
      <div className="teacher-dashboard-summary-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function StudentProgressCard({ row }: { row: StudentProgressRow }) {
  const overall = safePercent(row.overall_percent);

  return (
    <article className="teacher-student-progress-card">
      <div className="teacher-student-progress-header">
        <div className="teacher-student-identity">
          <div className="teacher-student-avatar" aria-hidden="true">
            <UserRound size={18}/>
          </div>
          <div>
            <h3>{displayName(row)}</h3>
            {row.nickname && row.nickname !== displayName(row) && <span>{row.nickname}</span>}
          </div>
        </div>

        <span className={`teacher-enrollment-status is-${row.enrollment_status}`}>
          {ENROLLMENT_STATUS_LABEL[row.enrollment_status]}
        </span>
      </div>

      <div className="teacher-student-overview">
        <div className="teacher-student-overall">
          <strong>{overall}%</strong>
          <span>Overall Progress</span>
        </div>
        <div className="teacher-student-meta">
          <span><BookOpenCheck size={14}/>{row.modules_active} / 7 modul aktif</span>
          <span><Clock3 size={14}/>{formatDateTime(row.last_learning_activity)}</span>
        </div>
      </div>

      <div className="teacher-student-module-grid">
        {MODULES.map(([label, key]) => {
          const percent = safePercent(row[key]);
          return (
            <div className="teacher-student-module" key={key}>
              <div>
                <span>{label}</span>
                <strong>{percent}%</strong>
              </div>
              <div className="teacher-student-module-track" aria-hidden="true">
                <span style={{ width: `${percent}%` }}/>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function TeacherDashboardPage() {
  const { role, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<TeachingClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState<StudentProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [classError, setClassError] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(false);

  const canTeach = Boolean(role && TEACHING_ROLES.has(role));

  const loadClasses = useCallback(async () => {
    if (!role || !TEACHING_ROLES.has(role)) return;

    setLoading(true);
    setClassError(false);

    const { data, error } = await supabase.rpc('get_my_teaching_classes');

    if (error) {
      console.error('Teacher dashboard classes load failed', error);
      setClasses([]);
      setClassError(true);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as TeachingClassRow[];
    setClasses(rows);
    setSelectedClassId((current) => {
      if (current && rows.some((row) => row.class_id === current)) return current;
      return rows.find((row) => row.class_status === 'active')?.class_id
        ?? rows.find((row) => row.class_status === 'planned')?.class_id
        ?? rows[0]?.class_id
        ?? '';
    });
    setLoading(false);
  }, [role]);

  const loadStudentProgress = useCallback(async (classId: string) => {
    if (!classId) {
      setStudents([]);
      return;
    }

    setStudentsLoading(true);
    setStudentsError(false);

    const { data, error } = await supabase.rpc('get_my_class_student_progress', {
      p_class_id: classId,
    });

    if (error) {
      console.error('Teacher dashboard student progress load failed', error);
      setStudents([]);
      setStudentsError(true);
      setStudentsLoading(false);
      return;
    }

    setStudents((data ?? []) as StudentProgressRow[]);
    setStudentsLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && canTeach) void loadClasses();
  }, [authLoading, canTeach, loadClasses]);

  useEffect(() => {
    if (selectedClassId) void loadStudentProgress(selectedClassId);
    else setStudents([]);
  }, [selectedClassId, loadStudentProgress]);

  const selectedClass = useMemo(
    () => classes.find((row) => row.class_id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const activeClassCount = useMemo(
    () => classes.filter((row) => row.class_status === 'active').length,
    [classes],
  );

  const plannedClassCount = useMemo(
    () => classes.filter((row) => row.class_status === 'planned').length,
    [classes],
  );

  const activeStudentEnrollments = useMemo(
    () => classes.reduce((sum, row) => sum + row.student_count_active, 0),
    [classes],
  );

  const averageProgress = useMemo(() => {
    if (students.length === 0) return 0;
    return Math.round(
      students.reduce((sum, row) => sum + safePercent(row.overall_percent), 0) / students.length,
    );
  }, [students]);

  const recentActivityCount = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return students.filter((row) => {
      if (!row.last_learning_activity) return false;
      const timestamp = new Date(row.last_learning_activity).getTime();
      return Number.isFinite(timestamp) && timestamp >= threshold;
    }).length;
  }, [students]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canTeach) return <Navigate to="/" replace />;

  return (
    <div className="page teacher-dashboard-page">
      <header className="teacher-dashboard-header">
        <div>
          <p className="eyebrow">PENGAJAR KOJAC</p>
          <h1 className="title-icon"><LayoutDashboard/>Dashboard Pengajar</h1>
          <p>Pantau kelas yang Anda ajar dan progress belajar siswa tanpa mengubah data pembelajaran mereka.</p>
        </div>
        <Link className="teacher-dashboard-secondary-link" to="/kelas-mengajar">
          <School size={16}/> Kelas Mengajar
        </Link>
      </header>

      <section className="teacher-dashboard-summary-grid" aria-label="Ringkasan pengajar">
        <ClassSummaryCard icon={<School size={20}/>} value={activeClassCount} label="Kelas Aktif"/>
        <ClassSummaryCard icon={<CalendarDays size={20}/>} value={plannedClassCount} label="Kelas Direncanakan"/>
        <ClassSummaryCard icon={<UsersRound size={20}/>} value={activeStudentEnrollments} label="Enrollment Siswa Aktif"/>
        <ClassSummaryCard icon={<FileText size={20}/>} value={classes.length} label="Total Kelas Saya"/>
      </section>

      {loading ? (
        <section className="teacher-dashboard-state-card">
          <div className="teacher-dashboard-skeleton"/>
          <div className="teacher-dashboard-skeleton"/>
        </section>
      ) : classError ? (
        <section className="teacher-dashboard-state-card" role="alert">
          <AlertCircle size={28}/>
          <h2>Kelas mengajar belum dapat dimuat.</h2>
          <p>Data tidak berubah. Silakan coba lagi.</p>
          <button type="button" className="teacher-dashboard-secondary-link" onClick={() => void loadClasses()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </section>
      ) : classes.length === 0 ? (
        <section className="teacher-dashboard-state-card">
          <School size={30}/>
          <h2>Belum ada kelas yang ditugaskan.</h2>
          <p>Dashboard akan aktif setelah akun Anda ditugaskan sebagai pengajar utama atau pengajar pengganti.</p>
        </section>
      ) : (
        <>
          <section className="teacher-dashboard-class-section">
            <div className="teacher-dashboard-section-heading">
              <div>
                <p className="eyebrow">KELAS SAYA</p>
                <h2>Pilih kelas untuk melihat progress siswa</h2>
              </div>
              <span>{classes.length} kelas</span>
            </div>

            <div className="teacher-dashboard-class-tabs" role="tablist" aria-label="Pilih kelas mengajar">
              {classes.map((row) => (
                <button
                  key={row.class_id}
                  type="button"
                  role="tab"
                  aria-selected={selectedClassId === row.class_id}
                  className={selectedClassId === row.class_id ? 'is-active' : ''}
                  onClick={() => setSelectedClassId(row.class_id)}
                >
                  <span>{row.program_name || 'Program KOJAC'}</span>
                  <strong>{row.class_name}</strong>
                  <small>{CLASS_STATUS_LABEL[row.class_status]}</small>
                </button>
              ))}
            </div>
          </section>

          {selectedClass && (
            <section className="teacher-dashboard-class-overview panel">
              <div className="teacher-dashboard-class-title">
                <div>
                  <p className="eyebrow">{selectedClass.program_name || 'PROGRAM KOJAC'}</p>
                  <h2>{selectedClass.class_name}</h2>
                  <p>
                    {selectedClass.class_code || 'Tanpa kode kelas'}
                    {' · '}
                    {formatDate(selectedClass.starts_on)} – {formatDate(selectedClass.ends_on)}
                  </p>
                </div>
                <span className={`teacher-class-status is-${selectedClass.class_status}`}>
                  {CLASS_STATUS_LABEL[selectedClass.class_status]}
                </span>
              </div>

              <div className="teacher-dashboard-class-metrics">
                <ClassSummaryCard
                  icon={<BarChart3 size={19}/>}
                  value={studentsLoading ? '…' : `${averageProgress}%`}
                  label="Rata-rata Progress"
                />
                <ClassSummaryCard
                  icon={<UsersRound size={19}/>}
                  value={studentsLoading ? '…' : students.length}
                  label="Siswa dalam Scope"
                />
                <ClassSummaryCard
                  icon={<Clock3 size={19}/>}
                  value={studentsLoading ? '…' : recentActivityCount}
                  label="Aktif 7 Hari Terakhir"
                />
              </div>

              <div className="teacher-dashboard-class-actions">
                <Link to="/kelas-mengajar" className="teacher-dashboard-secondary-link">
                  <UsersRound size={16}/> Detail Kelas
                </Link>
                <Link
                  to={`/kelas-mengajar/${selectedClass.class_id}/laporan`}
                  className="teacher-dashboard-primary-link"
                >
                  <FileText size={16}/> Laporan Mengajar <ChevronRight size={15}/>
                </Link>
              </div>
            </section>
          )}

          <section className="teacher-dashboard-students-section">
            <div className="teacher-dashboard-section-heading">
              <div>
                <p className="eyebrow">PROGRESS SISWA</p>
                <h2>Progress akademik siswa</h2>
              </div>
              <span>{studentsLoading ? 'Memuat…' : `${students.length} siswa`}</span>
            </div>

            {studentsLoading ? (
              <div className="teacher-student-loading-grid" aria-label="Memuat progress siswa">
                {[0, 1, 2].map((item) => <div key={item} className="teacher-dashboard-skeleton student"/>)}
              </div>
            ) : studentsError ? (
              <div className="teacher-dashboard-state-card" role="alert">
                <AlertCircle size={26}/>
                <h2>Progress siswa belum dapat dimuat.</h2>
                <p>Scope kelas tetap aman. Silakan coba lagi.</p>
                <button
                  type="button"
                  className="teacher-dashboard-secondary-link"
                  onClick={() => void loadStudentProgress(selectedClassId)}
                >
                  <RefreshCw size={16}/> Coba Lagi
                </button>
              </div>
            ) : students.length === 0 ? (
              <div className="teacher-dashboard-state-card">
                <UsersRound size={28}/>
                <h2>Belum ada siswa dalam scope kelas ini.</h2>
              </div>
            ) : (
              <div className="teacher-student-progress-grid">
                {students.map((row) => <StudentProgressCard key={row.student_id} row={row}/>)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
