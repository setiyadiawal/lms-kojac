import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  History,
  FileText,
  RefreshCw,
  School,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
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

function classBadgeStyle(status: ClassStatus): React.CSSProperties {
  if (status === 'active') return { background: '#eef8f1', color: '#257142', borderColor: '#cbe8d3' };
  if (status === 'planned') return { background: '#fff8e8', color: '#8a6218', borderColor: '#efdca7' };
  if (status === 'completed') return { background: '#f2f4f8', color: '#48566a', borderColor: '#dbe0e8' };
  return { background: '#fff1f3', color: '#8f2634', borderColor: '#efcbd1' };
}

function enrollmentBadgeStyle(status: EnrollmentStatus): React.CSSProperties {
  if (status === 'active') return { background: '#eef8f1', color: '#257142', borderColor: '#cbe8d3' };
  if (status === 'paused') return { background: '#fff8e8', color: '#8a6218', borderColor: '#efdca7' };
  if (status === 'completed') return { background: '#f2f4f8', color: '#48566a', borderColor: '#dbe0e8' };
  return { background: '#fff1f3', color: '#8f2634', borderColor: '#efcbd1' };
}

function SummaryItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="stat" style={{ minWidth: 0 }}>
      <div className="stat-icon">{icon}</div>
      <div><strong>{value}</strong><span>{label}</span></div>
    </div>
  );
}

function ClassCard({ row, onOpen, busy }: { row: TeachingClassRow; onOpen: () => void; busy: boolean }) {
  return (
    <article className="panel" style={{ padding: 20, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow" style={{ marginBottom: 5 }}>{row.program_name || 'PROGRAM KOJAC'}</p>
          <h3 style={{ margin: 0, overflowWrap: 'anywhere' }}>{row.class_name}</h3>
          <p style={{ margin: '5px 0 0', color: 'var(--muted)', fontSize: 13, overflowWrap: 'anywhere' }}>
            {row.class_code || 'Tanpa kode kelas'}
          </p>
        </div>
        <span className="status" style={{ ...classBadgeStyle(row.class_status), borderStyle: 'solid', borderWidth: 1 }}>
          {classLabels[row.class_status]}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 9, alignItems: 'start' }}>
          <CalendarDays size={18}/>
          <div><small style={{ color: 'var(--muted)' }}>Periode</small><strong style={{ display: 'block' }}>{formatPeriod(row.starts_on, row.ends_on)}</strong></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 9, alignItems: 'start' }}>
          <UsersRound size={18}/>
          <div>
            <small style={{ color: 'var(--muted)' }}>Siswa saat ini</small>
            <strong style={{ display: 'block' }}>{row.student_count_total_current}</strong>
            <span style={{ display: 'block', color: 'var(--muted)', fontSize: 12 }}>
              Aktif {row.student_count_active} · Dijeda {row.student_count_paused}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
        <button className="ghost-btn" type="button" disabled={busy} onClick={onOpen}>
          <UsersRound size={16}/> Lihat Siswa
        </button>
        <Link className="ghost-btn" to={`/kelas-mengajar/${row.class_id}/laporan`}>
          <FileText size={16}/> Laporan Mengajar
        </Link>
      </div>
    </article>
  );
}

function StudentItem({ row }: { row: TeachingStudentRow }) {
  const displayName = row.full_name?.trim() || row.nickname?.trim() || 'Siswa KOJAC';
  return (
    <article style={{ border: '1px solid #eadfe1', borderRadius: 12, padding: 15, background: '#fff', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{displayName}</strong>
          {row.nickname && row.nickname !== displayName && (
            <span style={{ display: 'block', color: 'var(--muted)', fontSize: 13, overflowWrap: 'anywhere' }}>{row.nickname}</span>
          )}
        </div>
        <span className="status" style={{ ...enrollmentBadgeStyle(row.enrollment_status), borderStyle: 'solid', borderWidth: 1 }}>
          {enrollmentLabels[row.enrollment_status]}
        </span>
      </div>
      <div style={{ marginTop: 9, color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
        Bergabung {formatDate(row.joined_at)}
        {row.completed_at ? ` · Selesai ${formatDate(row.completed_at)}` : ''}
      </div>
    </article>
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

  useEffect(() => {
    if (!authLoading && canTeach) void loadClasses();
  }, [authLoading, canTeach, loadClasses]);

  const activeClassCount = useMemo(() => classes.filter((row) => row.class_status === 'active').length, [classes]);
  const plannedClassCount = useMemo(() => classes.filter((row) => row.class_status === 'planned').length, [classes]);
  const totalActiveStudents = useMemo(() => classes.reduce((sum, row) => sum + row.student_count_active, 0), [classes]);
  const currentClasses = useMemo(() => classes.filter((row) => row.class_status === 'active' || row.class_status === 'planned'), [classes]);
  const historyClasses = useMemo(() => classes.filter((row) => row.class_status === 'completed' || row.class_status === 'cancelled'), [classes]);
  const currentStudents = useMemo(() => students.filter((row) => row.enrollment_status === 'active' || row.enrollment_status === 'paused'), [students]);
  const historyStudents = useMemo(() => students.filter((row) => row.enrollment_status === 'completed' || row.enrollment_status === 'cancelled'), [students]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canTeach) return <Navigate to="/" replace />;

  return (
    <div className="page" style={{ minWidth: 0 }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">PENGAJAR KOJAC</p>
          <h1 className="title-icon"><School/>Kelas Mengajar</h1>
          <p>Lihat kelas KOJAC yang ditugaskan kepada Anda.</p>
        </div>
      </div>

      <section className="stats-grid" aria-label="Ringkasan kelas mengajar" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <SummaryItem icon={<BookOpenCheck size={20}/>} value={activeClassCount} label="Kelas Aktif" />
        <SummaryItem icon={<CalendarDays size={20}/>} value={plannedClassCount} label="Kelas Direncanakan" />
        <SummaryItem icon={<UsersRound size={20}/>} value={totalActiveStudents} label="Total Siswa Aktif" />
      </section>

      {loading ? (
        <div className="panel" style={{ marginTop: 20, textAlign: 'center', padding: 32 }}>Memuat kelas mengajar…</div>
      ) : error ? (
        <div className="panel" style={{ marginTop: 20, textAlign: 'center', padding: 28 }}>
          <p style={{ marginTop: 0 }}>Data kelas mengajar belum dapat dimuat. Silakan coba lagi.</p>
          <button className="ghost-btn" type="button" onClick={() => void loadClasses()}><RefreshCw size={16}/> Muat Ulang</button>
        </div>
      ) : classes.length === 0 ? (
        <div className="panel" style={{ marginTop: 20, textAlign: 'center', padding: 34 }}>
          <School size={34} style={{ marginBottom: 10 }}/>
          <h2 style={{ margin: '0 0 8px' }}>Belum ada kelas yang ditugaskan kepada akun Anda.</h2>
          {role === 'pengajar' && (
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.65 }}>
              Silakan hubungi admin KOJAC jika Anda seharusnya sudah menjadi pengajar suatu kelas.
            </p>
          )}
        </div>
      ) : (
        <>
          <section style={{ marginTop: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <p className="eyebrow">KELAS SAAT INI</p>
              <h2 style={{ margin: '4px 0 0' }}>Kelas Aktif & Direncanakan</h2>
            </div>
            {currentClasses.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14 }}>
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
              <div className="panel" style={{ padding: 20, color: 'var(--muted)' }}>Tidak ada kelas aktif atau direncanakan saat ini.</div>
            )}
          </section>

          {historyClasses.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div style={{ marginBottom: 12 }}>
                <p className="eyebrow">RIWAYAT</p>
                <h2 style={{ margin: '4px 0 0' }}>Riwayat Kelas Mengajar</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 12 }}>
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
        <section className="panel" style={{ marginTop: 28, padding: 22, minWidth: 0 }} aria-live="polite">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">DAFTAR SISWA</p>
              <h2 style={{ margin: '4px 0 0', overflowWrap: 'anywhere' }}>{selectedClass.class_name}</h2>
              <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{selectedClass.class_code || 'Tanpa kode kelas'}</p>
            </div>
            <button className="ghost-btn" type="button" onClick={() => { setSelectedClass(null); setStudents([]); setStudentsError(false); }}>
              Tutup
            </button>
          </div>

          {studentsLoading ? (
            <div style={{ padding: '26px 0', color: 'var(--muted)' }}>Memuat daftar siswa…</div>
          ) : studentsError ? (
            <div style={{ paddingTop: 20 }}>
              <p>Daftar siswa belum dapat dimuat. Silakan coba lagi.</p>
              <button className="ghost-btn" type="button" onClick={() => void loadStudents(selectedClass)}><RefreshCw size={16}/> Muat Ulang</button>
            </div>
          ) : (
            <>
              <div style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><UserRound size={18}/><h3 style={{ margin: 0 }}>Siswa Aktif</h3></div>
                {currentStudents.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>{currentStudents.map((row) => <StudentItem key={row.user_id} row={row}/>)}</div>
                ) : (
                  <div style={{ color: 'var(--muted)', padding: '10px 0' }}>Belum ada siswa aktif atau dijeda pada kelas ini.</div>
                )}
              </div>

              {historyStudents.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><History size={18}/><h3 style={{ margin: 0 }}>Riwayat Siswa</h3></div>
                  <div style={{ display: 'grid', gap: 10 }}>{historyStudents.map((row) => <StudentItem key={row.user_id} row={row}/>)}</div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
