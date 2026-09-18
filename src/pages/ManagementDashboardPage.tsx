import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  FileText,
  Inbox,
  RefreshCw,
  School,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import '../classroom.css';
import '../features/management/managementDashboard.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type ManagementDashboardPayload = {
  summary: {
    total_students: number;
    active_students: number;
    operational_teachers: number;
    active_classes: number;
    reports_current_month: number;
    new_feedback: number;
  };
  student_status: {
    active: number;
    alumni: number;
    inactive: number;
  };
  feedback_status: {
    total: number;
    baru: number;
    diproses: number;
    selesai: number;
  };
  operational_status: {
    pending_approval_accounts: number;
    blocked_accounts: number;
    active_classes_without_primary_teacher: number;
    currently_teaching: number;
  };
  active_classes: Array<{
    class_id: string;
    program_id: string | null;
    program_code: string | null;
    program_name: string | null;
    class_code: string | null;
    class_name: string;
    primary_teacher_id: string | null;
    primary_teacher_name: string;
    active_student_count: number;
    last_report_date: string | null;
    starts_on: string | null;
    ends_on: string | null;
  }>;
  recent_reports: Array<{
    report_id: string;
    class_id: string;
    class_code: string | null;
    class_name: string;
    program_name: string | null;
    teacher_id: string | null;
    teacher_name_snapshot: string;
    report_date: string;
    material_preview: string;
    updated_at: string;
  }>;
  generated_at: string;
};

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);

function formatDate(value: string | null | undefined) {
  if (!value) return 'Belum ada laporan.';
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

function formatGeneratedAt(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function SummaryCard({
  value,
  label,
  to,
  icon,
}: {
  value: number;
  label: string;
  to: string;
  icon: React.ReactNode;
}) {
  return (
    <Link className="management-dashboard-summary-card" to={to}>
      <div className="management-dashboard-summary-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
      <ArrowRight size={15}/>
    </Link>
  );
}

function CompositionRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const width = percent(value, total);
  return (
    <div className="management-dashboard-composition-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="management-dashboard-composition-track" aria-hidden="true">
        <i style={{ width: `${width}%` }}/>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="management-dashboard-skeleton" aria-busy="true" aria-label="Memuat dashboard manajemen">
      <div className="management-dashboard-skeleton-summary">
        {[0, 1, 2, 3, 4, 5].map((item) => <div key={item}/>)}
      </div>
      <div className="management-dashboard-skeleton-panels">
        {[0, 1, 2, 3].map((item) => <div key={item}/>)}
      </div>
    </div>
  );
}

export function ManagementDashboardPage() {
  const { role, loading: authLoading } = useAuth();
  const canManage = Boolean(role && MANAGEMENT_ROLES.has(role));

  const [payload, setPayload] = useState<ManagementDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestSequence = useRef(0);

  const loadDashboard = useCallback(async () => {
    if (!role || !MANAGEMENT_ROLES.has(role)) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_management_dashboard_overview');

    if (requestId !== requestSequence.current) return;

    if (loadError) {
      console.error('KOJAC management dashboard load failed', loadError);
      setError(true);
      setLoading(false);
      return;
    }

    setPayload(data as ManagementDashboardPayload);
    setLoading(false);
  }, [role]);

  useEffect(() => {
    if (!authLoading && canManage) void loadDashboard();
  }, [authLoading, canManage, loadDashboard]);

  const studentTotal = payload?.summary.total_students ?? 0;
  const feedbackTotal = payload?.feedback_status.total ?? 0;

  const activeClasses = useMemo(() => payload?.active_classes ?? [], [payload]);
  const recentReports = useMemo(() => payload?.recent_reports ?? [], [payload]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canManage) return <Navigate to="/" replace/>;

  return (
    <div className="page class-experience-page management-dashboard-page">
      <header className="class-page-header management-dashboard-header">
        <div className="class-page-header-copy">
          <p className="eyebrow">MANAJEMEN KOJAC</p>
          <h1>Dashboard Manajemen</h1>
          <p>Ringkasan operasional siswa, pengajar, kelas, laporan, dan masukan KOJAC.</p>
        </div>
        <div className="management-dashboard-header-actions">
          {payload && <span>Data diperbarui {formatGeneratedAt(payload.generated_at)}</span>}
          <button
            type="button"
            className="class-action-secondary"
            disabled={loading}
            onClick={() => void loadDashboard()}
          >
            <RefreshCw size={15}/> {loading ? 'Memuat…' : 'Muat Ulang'}
          </button>
        </div>
      </header>

      {!payload && loading ? (
        <DashboardSkeleton/>
      ) : error && !payload ? (
        <section className="class-state-card" role="alert">
          <div className="class-state-icon"><AlertCircle size={28}/></div>
          <h2>Dashboard manajemen belum dapat dimuat.</h2>
          <button className="class-action-secondary" type="button" onClick={() => void loadDashboard()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </section>
      ) : payload ? (
        <>
          {error && (
            <div className="notice management-dashboard-inline-error" role="alert">
              Data terbaru belum dapat dimuat. Ringkasan sebelumnya tetap ditampilkan.
              <button type="button" onClick={() => void loadDashboard()}>Coba Lagi</button>
            </div>
          )}

          <section className="management-dashboard-summary-grid" aria-label="Ringkasan operasional KOJAC">
            <SummaryCard value={payload.summary.total_students} label="Total Siswa" to="/manajemen/siswa" icon={<UsersRound size={19}/>}/>
            <SummaryCard value={payload.summary.active_students} label="Siswa Aktif" to="/manajemen/siswa" icon={<UserCheck size={19}/>}/>
            <SummaryCard value={payload.summary.operational_teachers} label="Pengajar Operasional" to="/manajemen/pengajar" icon={<School size={19}/>}/>
            <SummaryCard value={payload.summary.active_classes} label="Kelas Aktif" to="/rekap-kelas" icon={<BookOpenCheck size={19}/>}/>
            <SummaryCard value={payload.summary.reports_current_month} label="Laporan Bulan Ini" to="/manajemen/laporan-pembelajaran" icon={<FileText size={19}/>}/>
            <SummaryCard value={payload.summary.new_feedback} label="Kritik & Saran Baru" to="/manajemen/kritik-saran" icon={<Inbox size={19}/>}/>
          </section>

          <section className="management-dashboard-overview-grid">
            <article className="management-dashboard-panel">
              <header>
                <div>
                  <p className="eyebrow">KOMPOSISI</p>
                  <h2>Status Siswa</h2>
                </div>
                <Link to="/manajemen/siswa">Lihat Siswa <ArrowRight size={14}/></Link>
              </header>

              {studentTotal === 0 ? (
                <p className="management-dashboard-empty-copy">Belum ada siswa KOJAC.</p>
              ) : (
                <div className="management-dashboard-composition-list">
                  <CompositionRow label="Aktif" value={payload.student_status.active} total={studentTotal}/>
                  <CompositionRow label="Alumni" value={payload.student_status.alumni} total={studentTotal}/>
                  <CompositionRow label="Nonaktif" value={payload.student_status.inactive} total={studentTotal}/>
                </div>
              )}
            </article>

            <article className="management-dashboard-panel">
              <header>
                <div>
                  <p className="eyebrow">MASUKAN</p>
                  <h2>Kritik &amp; Saran</h2>
                </div>
                <Link to="/manajemen/kritik-saran">Lihat Inbox <ArrowRight size={14}/></Link>
              </header>

              {feedbackTotal === 0 ? (
                <p className="management-dashboard-empty-copy">Belum ada kritik &amp; saran.</p>
              ) : (
                <div className="management-dashboard-feedback-grid">
                  <div><span>Baru</span><strong>{payload.feedback_status.baru}</strong></div>
                  <div><span>Diproses</span><strong>{payload.feedback_status.diproses}</strong></div>
                  <div><span>Selesai</span><strong>{payload.feedback_status.selesai}</strong></div>
                </div>
              )}
            </article>
          </section>

          <section className="management-dashboard-panel">
            <header>
              <div>
                <p className="eyebrow">FAKTUAL</p>
                <h2>Data untuk Ditinjau</h2>
              </div>
            </header>

            <div className="management-dashboard-operational-grid">
              <Link to="/admin">
                <span>Akun Menunggu Approval</span>
                <strong>{payload.operational_status.pending_approval_accounts}</strong>
              </Link>
              <Link to="/admin">
                <span>Akun Diblokir</span>
                <strong>{payload.operational_status.blocked_accounts}</strong>
              </Link>
              <Link to="/rekap-kelas">
                <span>Kelas Aktif Tanpa Pengajar Utama</span>
                <strong>{payload.operational_status.active_classes_without_primary_teacher}</strong>
              </Link>
              <Link to="/manajemen/pengajar">
                <span>Pengajar Sedang Mengajar</span>
                <strong>{payload.operational_status.currently_teaching}</strong>
              </Link>
            </div>
          </section>

          <section className="management-dashboard-two-column">
            <article className="management-dashboard-panel management-dashboard-active-classes">
              <header>
                <div>
                  <p className="eyebrow">OPERASIONAL KELAS</p>
                  <h2>Kelas Aktif</h2>
                </div>
                <Link to="/rekap-kelas">Lihat Rekap <ArrowRight size={14}/></Link>
              </header>

              {activeClasses.length === 0 ? (
                <p className="management-dashboard-empty-copy">Belum ada kelas aktif.</p>
              ) : (
                <div className="management-dashboard-class-list">
                  {activeClasses.map((item) => (
                    <article key={item.class_id} className="management-dashboard-class-card">
                      <div className="management-dashboard-class-title">
                        <span>{item.program_name || 'Program KOJAC'}</span>
                        <strong>{item.class_name}</strong>
                        <small>{item.class_code || 'Tanpa kode'}</small>
                      </div>
                      <div className="management-dashboard-class-meta">
                        <div><span>Pengajar Utama</span><strong>{item.primary_teacher_name}</strong></div>
                        <div><span>Siswa Aktif</span><strong>{item.active_student_count}</strong></div>
                        <div><span>Laporan Terakhir</span><strong>{formatDate(item.last_report_date)}</strong></div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="management-dashboard-panel management-dashboard-reports">
              <header>
                <div>
                  <p className="eyebrow">AKTIVITAS TERBARU</p>
                  <h2>Laporan Pembelajaran</h2>
                </div>
                <Link to="/manajemen/laporan-pembelajaran">Lihat Semua <ArrowRight size={14}/></Link>
              </header>

              {recentReports.length === 0 ? (
                <p className="management-dashboard-empty-copy">Belum ada laporan pembelajaran.</p>
              ) : (
                <div className="management-dashboard-report-list">
                  {recentReports.map((report) => (
                    <article key={report.report_id} className="management-dashboard-report-card">
                      <div>
                        <span>{formatDate(report.report_date)}</span>
                        <strong>{report.class_name}</strong>
                        <small>{report.program_name || 'Program KOJAC'}{report.class_code ? ` · ${report.class_code}` : ''}</small>
                      </div>
                      <div>
                        <span>{report.teacher_name_snapshot || 'Pengajar KOJAC'}</span>
                        <p>{report.material_preview || '—'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>

          <p className="management-dashboard-readonly-note">
            Dashboard ini hanya menampilkan ringkasan operasional. Perubahan data tetap dilakukan melalui halaman management yang sesuai.
          </p>
        </>
      ) : null}
    </div>
  );
}
