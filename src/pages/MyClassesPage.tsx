import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
  History,
  PauseCircle,
  RefreshCw,
  School,
  Sparkles,
  UserRound,
  Video,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import '../classroom.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { LIVE_CLASSROOM_ENABLED } from '../features/live-classroom/config';

type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';
type ClassStatus = 'planned' | 'active' | 'completed' | 'cancelled';

type MyClassRow = {
  enrollment_status: EnrollmentStatus;
  joined_at: string;
  completed_at: string | null;
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: ClassStatus;
  starts_on: string | null;
  ends_on: string | null;
  program_code: string | null;
  program_name: string | null;
  teacher_name: string | null;
};

const enrollmentLabels: Record<EnrollmentStatus, string> = {
  active: 'Aktif',
  paused: 'Dijeda',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const classLabels: Record<ClassStatus, string> = {
  planned: 'Direncanakan',
  active: 'Aktif',
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

function statusClass(status: EnrollmentStatus | ClassStatus) {
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

function ActiveClassCard({ row }: { row: MyClassRow }) {
  return (
    <article className="class-card">
      <div className="class-card-header">
        <div className="class-card-heading">
          <p className="class-card-program">{row.program_name || 'PROGRAM KOJAC'}</p>
          <h3 className="class-card-title">{row.class_name}</h3>
          <span className="class-code-badge">{row.class_code || 'Tanpa kode kelas'}</span>
        </div>
        <span className={statusClass(row.enrollment_status)}>
          {enrollmentLabels[row.enrollment_status]}
        </span>
      </div>

      <div className="class-info-grid">
        <div className="class-info-item">
          <span className="class-info-label"><UserRound/>Pengajar</span>
          <strong className="class-info-value">{row.teacher_name || 'Belum ditentukan'}</strong>
        </div>
        <div className="class-info-item">
          <span className="class-info-label"><CalendarDays/>Periode</span>
          <strong className="class-info-value">{formatPeriod(row.starts_on, row.ends_on)}</strong>
        </div>
        <div className="class-info-item">
          <span className="class-info-label"><BookOpenCheck/>Bergabung</span>
          <strong className="class-info-value">{formatDate(row.joined_at)}</strong>
        </div>
        <div className="class-info-item">
          <span className="class-info-label"><School/>Status Kelas</span>
          <span className="class-info-value"><span className={statusClass(row.class_status)}>{classLabels[row.class_status]}</span></span>
        </div>
      </div>
      {LIVE_CLASSROOM_ENABLED
        && row.enrollment_status === 'active'
        && row.class_status === 'active' && (
          <div className="class-action-row">
            <Link className="class-action-primary" to={`/kelas-live/${row.class_id}`}>
              <Video size={16}/>Masuk Kelas Live
            </Link>
          </div>
        )}
    </article>
  );
}

function HistoryRow({ row }: { row: MyClassRow }) {
  return (
    <article className="class-history-row">
      <div className="class-history-main">
        <strong className="class-history-title">{row.class_name}</strong>
        <span className="class-history-program">
          {row.program_name || 'Program KOJAC'} · {row.class_code || 'Tanpa kode'}
        </span>
      </div>

      <div className="class-history-meta">
        <span>Pengajar <strong>{row.teacher_name || 'Belum ditentukan'}</strong></span>
        <span>Periode <strong>{formatPeriod(row.starts_on, row.ends_on)}</strong></span>
        <span>Bergabung <strong>{formatDate(row.joined_at)}</strong></span>
        <span>Status kelas <strong>{classLabels[row.class_status]}</strong></span>
      </div>

      <span className={statusClass(row.enrollment_status)}>
        {enrollmentLabels[row.enrollment_status]}
      </span>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="class-skeleton-grid" aria-label="Memuat kelas Anda" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div className="class-skeleton-card" key={item}>
          <div className="class-skeleton-block is-short" />
          <div className="class-skeleton-block is-title" />
          <div className="class-skeleton-block is-medium" />
          <div className="class-skeleton-fields">
            <div className="class-skeleton-field" />
            <div className="class-skeleton-field" />
            <div className="class-skeleton-field" />
            <div className="class-skeleton-field" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MyClassesPage() {
  const { role, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<MyClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadClasses = useCallback(async () => {
    if (role !== 'siswa') return;
    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_my_classes');
    if (loadError) {
      console.error('KOJAC my classes load failed', loadError);
      setRows([]);
      setError(true);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as MyClassRow[]);
    setLoading(false);
  }, [role]);

  useEffect(() => {
    if (!authLoading && role === 'siswa') void loadClasses();
  }, [authLoading, role, loadClasses]);

  const activeRows = useMemo(
    () => rows.filter((row) => row.enrollment_status === 'active' || row.enrollment_status === 'paused'),
    [rows],
  );
  const historyRows = useMemo(
    () => rows.filter((row) => row.enrollment_status === 'completed' || row.enrollment_status === 'cancelled'),
    [rows],
  );
  const activeCount = useMemo(() => rows.filter((row) => row.enrollment_status === 'active').length, [rows]);
  const pausedCount = useMemo(() => rows.filter((row) => row.enrollment_status === 'paused').length, [rows]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (role !== 'siswa') return <Navigate to="/" replace />;

  return (
    <div className="page class-experience-page">
      <header className="class-page-header">
        <div className="class-page-header-copy">
          <p className="eyebrow">KELAS SAYA</p>
          <h1>Kelas Saya</h1>
          <p>Program dan kelas KOJAC yang sedang Anda ikuti.</p>
        </div>
        {activeCount > 0 && (
          <span className="class-context-badge"><Sparkles size={14}/>Program Aktif</span>
        )}
      </header>

      <section className="class-summary-grid" aria-label="Ringkasan kelas">
        <SummaryCard icon={<BookOpenCheck size={20}/>} value={activeCount} label="Kelas Aktif" />
        <SummaryCard icon={<PauseCircle size={20}/>} value={pausedCount} label="Kelas Dijeda" />
        <SummaryCard icon={<History size={20}/>} value={historyRows.length} label="Riwayat Kelas" />
      </section>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <section className="class-state-card" role="alert">
          <div className="class-state-icon"><AlertCircle size={28}/></div>
          <h2>Data kelas belum dapat dimuat.</h2>
          <p>Silakan coba lagi. Jika kendala berlanjut, hubungi admin KOJAC.</p>
          <button className="class-action-secondary" type="button" onClick={() => void loadClasses()}>
            <RefreshCw size={16}/>Coba Lagi
          </button>
        </section>
      ) : rows.length === 0 ? (
        <section className="class-state-card">
          <div className="class-state-icon"><School size={30}/></div>
          <h2>Belum ada kelas yang terhubung.</h2>
          <p>Jika Anda sudah mengikuti program KOJAC, hubungi admin agar akun Anda dihubungkan ke kelas.</p>
        </section>
      ) : (
        <>
          <section className="class-section">
            <div className="class-section-heading">
              <div>
                <p className="eyebrow">KELAS SAAT INI</p>
                <h2>Kelas Aktif & Dijeda</h2>
              </div>
              <span className="class-section-count">{activeRows.length} kelas</span>
            </div>

            {activeRows.length > 0 ? (
              <div className="class-card-grid">
                {activeRows.map((row) => <ActiveClassCard key={row.class_id} row={row}/>) }
              </div>
            ) : (
              <div className="class-state-card" style={{ marginTop: 0, paddingBlock: 26 }}>
                <p style={{ margin: 0 }}>Tidak ada kelas aktif atau dijeda saat ini.</p>
              </div>
            )}
          </section>

          {historyRows.length > 0 && (
            <section className="class-section">
              <div className="class-section-heading">
                <div>
                  <p className="eyebrow">RIWAYAT</p>
                  <h2>Riwayat Kelas</h2>
                </div>
                <span className="class-section-count">{historyRows.length} kelas</span>
              </div>
              <div className="class-history-list">
                {historyRows.map((row) => <HistoryRow key={row.class_id} row={row}/>) }
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
