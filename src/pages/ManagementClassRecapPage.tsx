import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  FileText,
  Filter,
  RefreshCw,
  School,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import '../classroom.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type ClassStatus = 'planned' | 'active' | 'completed' | 'cancelled';
type ReportPeriod = 'month' | '30d' | '3m' | 'all';

type RecapSummary = {
  active_class_count: number;
  active_student_count: number;
  reports_this_month: number;
  active_teacher_count: number;
};

type RecapSubstitute = {
  assignment_id: string;
  teacher_id: string;
  teacher_name: string;
  starts_on: string;
  ends_on: string;
};

type RecapClassRow = {
  class_id: string;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  class_code: string | null;
  class_name: string;
  class_status: ClassStatus;
  primary_teacher_id: string | null;
  primary_teacher_name: string;
  starts_on: string | null;
  ends_on: string | null;
  student_active_count: number;
  student_paused_count: number;
  report_count: number;
  last_report_date: string | null;
  last_report_teacher_id: string | null;
  last_report_teacher_name: string | null;
  active_substitutes: RecapSubstitute[];
};

type RecapProgramOption = { id: string; code: string | null; name: string };
type RecapClassOption = { id: string; code: string | null; name: string; program_id: string | null };
type RecapTeacherOption = { id: string; name: string };

type RecapPayload = {
  summary: RecapSummary;
  period: {
    key: ReportPeriod;
    start_date: string | null;
    end_date_exclusive: string | null;
  };
  rows: RecapClassRow[];
  filters: {
    programs: RecapProgramOption[];
    classes: RecapClassOption[];
    teachers: RecapTeacherOption[];
  };
};

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);

const periodOptions: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'month', label: 'Bulan ini' },
  { value: '30d', label: '30 hari terakhir' },
  { value: '3m', label: '3 bulan terakhir' },
  { value: 'all', label: 'Semua' },
];

const classStatusLabels: Record<ClassStatus, string> = {
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
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return 'Belum ditentukan';
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `Mulai ${formatDate(start)}`;
  return `Sampai ${formatDate(end)}`;
}

function SummaryCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <article className="class-summary-card class-recap-summary-card">
      <div className="class-summary-icon">{icon}</div>
      <div className="class-summary-copy">
        <strong className="class-summary-value">{value}</strong>
        <span className="class-summary-label">{label}</span>
      </div>
    </article>
  );
}

function SubstituteSummary({ substitutes }: { substitutes: RecapSubstitute[] }) {
  if (substitutes.length === 0) return <span className="class-recap-muted">Tidak ada</span>;

  return (
    <div className="class-recap-substitute-list">
      {substitutes.map((substitute) => (
        <div className="class-recap-substitute" key={substitute.assignment_id}>
          <strong>{substitute.teacher_name}</strong>
          <span>{formatPeriod(substitute.starts_on, substitute.ends_on)}</span>
        </div>
      ))}
    </div>
  );
}

function RecapSkeleton() {
  return (
    <div className="class-recap-skeleton" aria-busy="true" aria-label="Memuat rekap kelas">
      <div className="class-recap-skeleton-summary">
        {[0, 1, 2, 3].map((item) => <div key={item}/>) }
      </div>
      <div className="class-recap-skeleton-filters"/>
      <div className="class-recap-skeleton-list">
        {[0, 1, 2].map((item) => <div key={item}/>) }
      </div>
    </div>
  );
}

function MobileRecapCard({ row }: { row: RecapClassRow }) {
  return (
    <article className="class-recap-mobile-card">
      <header className="class-recap-mobile-header">
        <div>
          <p>{row.program_name || 'PROGRAM KOJAC'}</p>
          <h3>{row.class_name}</h3>
          <span>{row.class_code || 'Tanpa kode kelas'}</span>
        </div>
        <span className={`class-status-badge is-${row.class_status}`}>{classStatusLabels[row.class_status]}</span>
      </header>

      <div className="class-recap-mobile-grid">
        <div>
          <span>Pengajar Utama</span>
          <strong>{row.primary_teacher_name || 'Belum ditentukan'}</strong>
        </div>
        <div>
          <span>Periode Kelas</span>
          <strong>{formatPeriod(row.starts_on, row.ends_on)}</strong>
        </div>
        <div>
          <span>Siswa</span>
          <strong>Aktif {row.student_active_count} · Dijeda {row.student_paused_count}</strong>
        </div>
        <div>
          <span>Laporan</span>
          <strong>{row.report_count}</strong>
          <small>
            {row.last_report_date
              ? `Terakhir ${formatDate(row.last_report_date)} · ${row.last_report_teacher_name || 'Pengajar KOJAC'}`
              : 'Belum ada laporan pada periode ini'}
          </small>
        </div>
        <div className="is-wide">
          <span>Pengganti Aktif</span>
          <SubstituteSummary substitutes={row.active_substitutes}/>
        </div>
      </div>

      <Link className="class-action-secondary class-recap-report-link" to={`/kelas-mengajar/${row.class_id}/laporan`}>
        <FileText size={15}/> Lihat Laporan
      </Link>
    </article>
  );
}

export function ManagementClassRecapPage() {
  const { role, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<RecapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('month');
  const [programId, setProgramId] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classStatus, setClassStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const canManage = Boolean(role && MANAGEMENT_ROLES.has(role));

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadRecap = useCallback(async () => {
    if (!role || !MANAGEMENT_ROLES.has(role)) return;
    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_management_class_recap', {
      p_report_period: reportPeriod,
      p_program_id: programId || null,
      p_class_id: classId || null,
      p_teacher_id: teacherId || null,
      p_class_status: classStatus || null,
      p_search: debouncedSearch || null,
    });

    if (loadError) {
      console.error('KOJAC management class recap load failed', loadError);
      setError(true);
      setLoading(false);
      return;
    }

    const next = data as RecapPayload | null;
    setPayload(next ?? {
      summary: { active_class_count: 0, active_student_count: 0, reports_this_month: 0, active_teacher_count: 0 },
      period: { key: reportPeriod, start_date: null, end_date_exclusive: null },
      rows: [],
      filters: { programs: [], classes: [], teachers: [] },
    });
    setLoading(false);
  }, [role, reportPeriod, programId, classId, teacherId, classStatus, debouncedSearch]);

  useEffect(() => {
    if (!authLoading && canManage) void loadRecap();
  }, [authLoading, canManage, loadRecap]);

  const classOptions = useMemo(() => {
    const options = payload?.filters.classes ?? [];
    return programId ? options.filter((item) => item.program_id === programId) : options;
  }, [payload, programId]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canManage) return <Navigate to="/" replace />;

  const summary = payload?.summary ?? {
    active_class_count: 0,
    active_student_count: 0,
    reports_this_month: 0,
    active_teacher_count: 0,
  };
  const rows = payload?.rows ?? [];

  return (
    <div className="page class-experience-page class-recap-page">
      <header className="class-page-header class-recap-header">
        <div className="class-page-header-copy">
          <p className="eyebrow">MANAJEMEN KOJAC</p>
          <h1>Rekap Kelas</h1>
          <p>Pantau aktivitas kelas dan laporan pembelajaran KOJAC.</p>
        </div>
      </header>

      {!payload && loading ? (
        <RecapSkeleton/>
      ) : error && !payload ? (
        <section className="class-state-card" role="alert">
          <div className="class-state-icon"><AlertCircle size={28}/></div>
          <h2>Data rekap belum dapat dimuat.</h2>
          <p>Silakan coba lagi.</p>
          <button className="class-action-secondary" type="button" onClick={() => void loadRecap()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </section>
      ) : (
        <>
          <section className="class-summary-grid class-recap-summary-grid" aria-label="Ringkasan rekap kelas">
            <SummaryCard icon={<School size={20}/>} value={summary.active_class_count} label="Kelas Aktif"/>
            <SummaryCard icon={<UsersRound size={20}/>} value={summary.active_student_count} label="Siswa Aktif"/>
            <SummaryCard icon={<FileText size={20}/>} value={summary.reports_this_month} label="Laporan Bulan Ini"/>
            <SummaryCard icon={<UserRound size={20}/>} value={summary.active_teacher_count} label="Pengajar Aktif"/>
          </section>

          <section className="class-recap-filter-card" aria-label="Filter rekap kelas">
            <div className="class-recap-filter-heading">
              <div>
                <Filter size={17}/>
                <strong>Filter Rekap</strong>
              </div>
              {loading && <span>Memuat data…</span>}
            </div>

            <div className="class-recap-filter-grid">
              <label>
                <span>Periode laporan</span>
                <select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value as ReportPeriod)}>
                  {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label>
                <span>Program</span>
                <select
                  value={programId}
                  onChange={(event) => {
                    setProgramId(event.target.value);
                    setClassId('');
                  }}
                >
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
                <span>Pengajar</span>
                <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
                  <option value="">Semua pengajar</option>
                  {(payload?.filters.teachers ?? []).map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status kelas</span>
                <select value={classStatus} onChange={(event) => setClassStatus(event.target.value)}>
                  <option value="">Semua status</option>
                  <option value="planned">Direncanakan</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </label>

              <label className="class-recap-search-field">
                <span>Cari kelas</span>
                <div>
                  <Search size={16}/>
                  <input
                    type="search"
                    value={search}
                    placeholder="Nama atau kode kelas"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </label>
            </div>
          </section>

          {error && payload && (
            <div className="notice class-recap-inline-error" role="alert">
              Data terbaru belum dapat dimuat. Data sebelumnya tetap ditampilkan.
              <button type="button" onClick={() => void loadRecap()}>Coba Lagi</button>
            </div>
          )}

          <section className="class-section class-recap-section">
            <div className="class-section-heading">
              <div>
                <p className="eyebrow">MONITORING KELAS</p>
                <h2>Data Kelas</h2>
              </div>
              <span className="class-section-count">{rows.length} kelas</span>
            </div>

            {rows.length === 0 ? (
              <div className="class-state-card class-recap-empty">
                <School size={28}/>
                <p>Tidak ada kelas yang sesuai dengan filter.</p>
              </div>
            ) : (
              <>
                <div className="class-recap-desktop-list" aria-label="Tabel rekap kelas">
                  <div className="class-recap-desktop-head" aria-hidden="true">
                    <span>Program</span>
                    <span>Kelas</span>
                    <span>Status</span>
                    <span>Pengajar Utama</span>
                    <span>Siswa</span>
                    <span>Laporan</span>
                    <span>Pengganti Aktif</span>
                    <span>Aksi</span>
                  </div>
                  {rows.map((row) => (
                    <article className="class-recap-desktop-row" key={row.class_id}>
                      <div>
                        <strong>{row.program_name || '—'}</strong>
                        <small>{row.program_code || 'Tanpa kode program'}</small>
                      </div>
                      <div>
                        <strong>{row.class_name}</strong>
                        <small>{row.class_code || 'Tanpa kode'} · {formatPeriod(row.starts_on, row.ends_on)}</small>
                      </div>
                      <div><span className={`class-status-badge is-${row.class_status}`}>{classStatusLabels[row.class_status]}</span></div>
                      <div><strong>{row.primary_teacher_name || 'Belum ditentukan'}</strong></div>
                      <div>
                        <strong>{row.student_active_count} aktif</strong>
                        <small>{row.student_paused_count} dijeda</small>
                      </div>
                      <div>
                        <strong>{row.report_count} laporan</strong>
                        <small>
                          {row.last_report_date
                            ? `${formatDate(row.last_report_date)} · ${row.last_report_teacher_name || 'Pengajar KOJAC'}`
                            : 'Belum ada pada periode ini'}
                        </small>
                      </div>
                      <div><SubstituteSummary substitutes={row.active_substitutes}/></div>
                      <div>
                        <Link className="class-action-secondary class-recap-report-link" to={`/kelas-mengajar/${row.class_id}/laporan`}>
                          <FileText size={14}/> Lihat Laporan
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="class-recap-mobile-list">
                  {rows.map((row) => <MobileRecapCard key={row.class_id} row={row}/>) }
                </div>
              </>
            )}
          </section>

          <footer className="class-recap-footnote">
            <CalendarDays size={15}/>
            <span>Jumlah laporan mengikuti filter periode laporan. Ringkasan “Laporan Bulan Ini” selalu memakai bulan kalender saat ini di Asia/Jakarta.</span>
          </footer>
        </>
      )}
    </div>
  );
}
