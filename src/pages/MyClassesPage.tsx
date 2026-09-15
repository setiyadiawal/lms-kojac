import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  History,
  PauseCircle,
  RefreshCw,
  School,
  UserRound,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

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

function badgeStyle(status: EnrollmentStatus): React.CSSProperties {
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

function ActiveClassCard({ row }: { row: MyClassRow }) {
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
        <span className="status" style={{ ...badgeStyle(row.enrollment_status), borderStyle: 'solid', borderWidth: 1 }}>
          {enrollmentLabels[row.enrollment_status]}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 9, alignItems: 'start' }}>
          <UserRound size={18}/><div><small style={{ color: 'var(--muted)' }}>Pengajar</small><strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{row.teacher_name || 'Belum ditentukan'}</strong></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 9, alignItems: 'start' }}>
          <CalendarDays size={18}/><div><small style={{ color: 'var(--muted)' }}>Periode</small><strong style={{ display: 'block' }}>{formatPeriod(row.starts_on, row.ends_on)}</strong></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 9, alignItems: 'start' }}>
          <BookOpenCheck size={18}/><div><small style={{ color: 'var(--muted)' }}>Bergabung</small><strong style={{ display: 'block' }}>{formatDate(row.joined_at)}</strong></div>
        </div>
      </div>

      <div style={{ marginTop: 16, paddingTop: 13, borderTop: '1px solid #eee4e6', color: 'var(--muted)', fontSize: 13 }}>
        Status kelas: <strong style={{ color: 'var(--ink)' }}>{classLabels[row.class_status]}</strong>
      </div>
    </article>
  );
}

function HistoryRow({ row }: { row: MyClassRow }) {
  return (
    <article style={{ border: '1px solid #eadfe1', borderRadius: 12, padding: 15, background: '#fff', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{row.class_name}</strong>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{row.program_name || 'Program KOJAC'} · {row.class_code || 'Tanpa kode'}</span>
        </div>
        <span className="status" style={{ ...badgeStyle(row.enrollment_status), borderStyle: 'solid', borderWidth: 1 }}>
          {enrollmentLabels[row.enrollment_status]}
        </span>
      </div>
      <div style={{ marginTop: 9, color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
        Pengajar: {row.teacher_name || 'Belum ditentukan'} · Bergabung {formatDate(row.joined_at)}
        {row.completed_at ? ` · Selesai ${formatDate(row.completed_at)}` : ''}
      </div>
    </article>
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

  const activeRows = useMemo(() => rows.filter((row) => row.enrollment_status === 'active' || row.enrollment_status === 'paused'), [rows]);
  const historyRows = useMemo(() => rows.filter((row) => row.enrollment_status === 'completed' || row.enrollment_status === 'cancelled'), [rows]);
  const activeCount = useMemo(() => rows.filter((row) => row.enrollment_status === 'active').length, [rows]);
  const pausedCount = useMemo(() => rows.filter((row) => row.enrollment_status === 'paused').length, [rows]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (role !== 'siswa') return <Navigate to="/" replace />;

  return (
    <div className="page" style={{ minWidth: 0 }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">PROGRAM KOJAC</p>
          <h1 className="title-icon"><School/>Kelas Saya</h1>
          <p>Lihat program dan kelas KOJAC yang terhubung dengan akun Anda.</p>
        </div>
      </div>

      <section className="stats-grid" aria-label="Ringkasan kelas" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <SummaryItem icon={<BookOpenCheck size={20}/>} value={activeCount} label="Kelas Aktif" />
        <SummaryItem icon={<PauseCircle size={20}/>} value={pausedCount} label="Kelas Dijeda" />
        <SummaryItem icon={<History size={20}/>} value={historyRows.length} label="Riwayat Kelas" />
      </section>

      {loading ? (
        <div className="panel" style={{ marginTop: 20, textAlign: 'center', padding: 32 }}>Memuat kelas Anda…</div>
      ) : error ? (
        <div className="panel" style={{ marginTop: 20, textAlign: 'center', padding: 28 }}>
          <p style={{ marginTop: 0 }}>Data kelas belum dapat dimuat. Silakan coba lagi.</p>
          <button className="ghost-btn" type="button" onClick={() => void loadClasses()}><RefreshCw size={16}/> Muat Ulang</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="panel" style={{ marginTop: 20, textAlign: 'center', padding: 34 }}>
          <School size={34} style={{ marginBottom: 10 }}/>
          <h2 style={{ margin: '0 0 8px' }}>Belum ada kelas yang terhubung dengan akun Anda.</h2>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.65 }}>
            Jika Anda sudah terdaftar sebagai peserta kelas KOJAC, silakan hubungi admin agar akun Anda dihubungkan ke kelas.
          </p>
        </div>
      ) : (
        <>
          <section style={{ marginTop: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <p className="eyebrow">KELAS BERJALAN</p>
              <h2 style={{ margin: '4px 0 0' }}>Kelas Aktif & Dijeda</h2>
            </div>
            {activeRows.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14 }}>
                {activeRows.map((row) => <ActiveClassCard key={row.class_id} row={row}/>) }
              </div>
            ) : (
              <div className="panel" style={{ padding: 20, color: 'var(--muted)' }}>Tidak ada kelas aktif atau dijeda saat ini.</div>
            )}
          </section>

          {historyRows.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div style={{ marginBottom: 12 }}>
                <p className="eyebrow">RIWAYAT</p>
                <h2 style={{ margin: '4px 0 0' }}>Riwayat Kelas</h2>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {historyRows.map((row) => <HistoryRow key={row.class_id} row={row}/>) }
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
