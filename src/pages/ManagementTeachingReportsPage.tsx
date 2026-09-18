import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../classroom.css';
import '../features/management/teachingReportCenter.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type PeriodFilter = 'current_month' | 'previous_month' | 'last_3_months' | 'all';
type SortMode = 'newest' | 'oldest';

type ReportRow = {
  report_id: string;
  class_id: string;
  class_code: string | null;
  class_name: string;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  teacher_id: string | null;
  teacher_name_snapshot: string;
  report_date: string;
  starts_at: string | null;
  ends_at: string | null;
  recorded_minutes: number;
  material_preview: string;
  updated_at: string;
};

type ReportDetail = {
  report_id: string;
  class_id: string;
  class_code: string | null;
  class_name: string;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  teacher_id: string | null;
  teacher_name_snapshot: string;
  report_date: string;
  starts_at: string | null;
  ends_at: string | null;
  recorded_minutes: number;
  material_summary: string;
  assignment_summary: string;
  next_plan: string;
  evaluation_notes: string | null;
  created_at: string;
  updated_at: string;
};

type DirectoryPayload = {
  has_any_report: boolean;
  summary: {
    total_reports: number;
    reports_current_month: number;
    classes_with_reports: number;
    teachers_reporting: number;
    recorded_minutes_current_month: number;
  };
  rows: ReportRow[];
  filters: {
    programs: Array<{ id: string; code: string | null; name: string }>;
    classes: Array<{ id: string; code: string | null; name: string; program_id: string | null }>;
    teachers: Array<{ id: string; name: string }>;
  };
  period: {
    key: PeriodFilter;
    start_date: string | null;
    end_date_exclusive: string | null;
    current_month_start: string;
    next_month_start: string;
  };
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
};

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: 'current_month', label: 'Bulan Ini' },
  { value: 'previous_month', label: 'Bulan Lalu' },
  { value: 'last_3_months', label: '3 Bulan Terakhir' },
  { value: 'all', label: 'Semua' },
];

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

function shortTime(value: string | null | undefined) {
  if (!value) return '—';
  return value.slice(0, 5);
}

function timeRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return '—';
  return `${shortTime(start)} – ${shortTime(end)}`;
}

function durationLabel(minutes: number | null | undefined) {
  const safe = Math.max(0, Math.trunc(minutes || 0));
  if (safe < 60) return `${safe} menit`;
  const hours = Math.floor(safe / 60);
  const remaining = safe % 60;
  return remaining > 0
    ? `${safe} menit · ${hours} jam ${remaining} menit`
    : `${safe} menit · ${hours} jam`;
}

function ReportSummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="class-summary-card report-center-summary-card">
      <div className="class-summary-copy">
        <strong className="class-summary-value">{value}</strong>
        <span className="class-summary-label">{label}</span>
      </div>
    </article>
  );
}

function ReportCenterSkeleton() {
  return (
    <div className="report-center-skeleton" aria-busy="true" aria-label="Memuat laporan pembelajaran">
      <div className="report-center-skeleton-summary">{[0, 1, 2, 3, 4].map((item) => <div key={item}/>)}</div>
      <div className="report-center-skeleton-filter"/>
      <div className="report-center-skeleton-list">{[0, 1, 2].map((item) => <div key={item}/>)}</div>
    </div>
  );
}

export function ManagementTeachingReportsPage() {
  const { role, loading: authLoading } = useAuth();
  const canManage = Boolean(role && MANAGEMENT_ROLES.has(role));

  const [payload, setPayload] = useState<DirectoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [period, setPeriod] = useState<PeriodFilter>('current_month');
  const [programId, setProgramId] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [period, programId, classId, teacherId, sort, debouncedSearch, pageSize]);

  const loadReports = useCallback(async () => {
    if (!role || !MANAGEMENT_ROLES.has(role)) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_management_teaching_reports', {
      p_period: period,
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
      console.error('KOJAC management report center load failed', loadError);
      setError(true);
      setLoading(false);
      return;
    }

    setPayload(data as DirectoryPayload);
    setLoading(false);
  }, [role, period, programId, classId, teacherId, sort, debouncedSearch, page, pageSize]);

  useEffect(() => {
    if (!authLoading && canManage) void loadReports();
  }, [authLoading, canManage, loadReports]);

  const classOptions = useMemo(() => {
    const options = payload?.filters.classes ?? [];
    return programId ? options.filter((item) => item.program_id === programId) : options;
  }, [payload, programId]);

  const closeDetail = useCallback(() => {
    setSelectedRow(null);
    setDetail(null);
    setDetailError(false);
    setDetailLoading(false);
  }, []);

  const openDetail = useCallback(async (row: ReportRow) => {
    setSelectedRow(row);
    setDetail(null);
    setDetailError(false);
    setDetailLoading(true);

    const { data, error: loadError } = await supabase.rpc('get_management_teaching_report_detail', {
      p_report_id: row.report_id,
    });

    if (loadError) {
      console.error('KOJAC management report detail failed', loadError);
      setDetailError(true);
      setDetailLoading(false);
      return;
    }

    setDetail(data as ReportDetail);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedRow) return undefined;
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
  }, [selectedRow, closeDetail]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canManage) return <Navigate to="/" replace/>;

  const summary = payload?.summary ?? {
    total_reports: 0,
    reports_current_month: 0,
    classes_with_reports: 0,
    teachers_reporting: 0,
    recorded_minutes_current_month: 0,
  };
  const rows = payload?.rows ?? [];
  const pagination = payload?.pagination ?? {
    page,
    page_size: pageSize,
    total_rows: 0,
    total_pages: 0,
  };
  const hasAnyReport = payload?.has_any_report ?? false;

  return (
    <div className="page class-experience-page report-center-page">
      <header className="class-page-header report-center-header">
        <div className="class-page-header-copy">
          <p className="eyebrow">MANAJEMEN KOJAC</p>
          <h1>Laporan Pembelajaran</h1>
          <p>Pantau laporan kegiatan belajar mengajar KOJAC dalam satu tempat.</p>
        </div>
      </header>

      {!payload && loading ? (
        <ReportCenterSkeleton/>
      ) : error && !payload ? (
        <section className="class-state-card" role="alert">
          <div className="class-state-icon"><AlertCircle size={28}/></div>
          <h2>Laporan pembelajaran belum dapat dimuat.</h2>
          <p>Silakan coba lagi.</p>
          <button className="class-action-secondary" type="button" onClick={() => void loadReports()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </section>
      ) : (
        <>
          <section className="class-summary-grid report-center-summary-grid" aria-label="Ringkasan laporan pembelajaran">
            <ReportSummaryCard label="Total Laporan" value={summary.total_reports}/>
            <ReportSummaryCard label="Laporan Bulan Ini" value={summary.reports_current_month}/>
            <ReportSummaryCard label="Kelas dengan Laporan" value={summary.classes_with_reports}/>
            <ReportSummaryCard label="Pengajar yang Melapor" value={summary.teachers_reporting}/>
            <ReportSummaryCard label="Durasi Tercatat Bulan Ini" value={durationLabel(summary.recorded_minutes_current_month)}/>
          </section>

          <section className="report-center-filter-card" aria-label="Filter laporan pembelajaran">
            <div className="report-center-filter-heading">
              <div><Filter size={17}/><strong>Filter Laporan</strong></div>
              {loading && <span>Memuat data…</span>}
            </div>

            <div className="report-center-filter-grid">
              <label>
                <span>Periode</span>
                <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}>
                  {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
                <span>Pengajar</span>
                <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
                  <option value="">Semua pengajar</option>
                  {(payload?.filters.teachers ?? []).map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Urutkan</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                </select>
              </label>

              <label className="report-center-search-field">
                <span>Cari laporan</span>
                <div>
                  <Search size={16}/>
                  <input
                    type="search"
                    value={search}
                    placeholder="Materi, tugas, rencana, kelas, atau pengajar"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </label>
            </div>
          </section>

          {error && payload && (
            <div className="notice report-center-inline-error" role="alert">
              Laporan pembelajaran belum dapat dimuat.
              <button type="button" onClick={() => void loadReports()}>Coba Lagi</button>
            </div>
          )}

          <section className="class-section report-center-section">
            <div className="class-section-heading">
              <div>
                <p className="eyebrow">CENTRAL REPORT DIRECTORY</p>
                <h2>Laporan Pembelajaran</h2>
              </div>
              <span className="class-section-count">{pagination.total_rows} laporan</span>
            </div>

            {rows.length === 0 ? (
              <div className="class-state-card report-center-empty">
                <FileText size={28}/>
                <h3>{hasAnyReport ? 'Tidak ada laporan yang sesuai dengan filter.' : 'Belum ada laporan pembelajaran.'}</h3>
              </div>
            ) : (
              <>
                <div className="report-center-desktop-list">
                  <div className="report-center-desktop-head" aria-hidden="true">
                    <span>Tanggal</span>
                    <span>Program / Kelas</span>
                    <span>Pengajar</span>
                    <span>Waktu</span>
                    <span>Durasi Tercatat</span>
                    <span>Materi</span>
                    <span>Aksi</span>
                  </div>

                  {rows.map((row) => (
                    <article className="report-center-desktop-row" key={row.report_id}>
                      <div><strong>{formatDate(row.report_date)}</strong></div>
                      <div>
                        <strong>{row.program_name || 'Program KOJAC'}</strong>
                        <small>{row.class_name}{row.class_code ? ` · ${row.class_code}` : ''}</small>
                      </div>
                      <div>
                        <strong>{row.teacher_name_snapshot || 'Pengajar KOJAC'}</strong>
                        {!row.teacher_id && <small>Snapshot historis</small>}
                      </div>
                      <div><strong>{timeRange(row.starts_at, row.ends_at)}</strong></div>
                      <div><strong>{durationLabel(row.recorded_minutes)}</strong></div>
                      <div><p>{row.material_preview || '—'}</p></div>
                      <div>
                        <button className="class-action-secondary report-center-detail-button" type="button" onClick={() => void openDetail(row)}>
                          <FileText size={14}/> Lihat Detail
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="report-center-mobile-list">
                  {rows.map((row) => (
                    <article className="report-center-mobile-card" key={row.report_id}>
                      <header>
                        <div>
                          <span>{formatDate(row.report_date)}</span>
                          <strong>{row.class_name}</strong>
                          <small>{row.program_name || 'Program KOJAC'}{row.class_code ? ` · ${row.class_code}` : ''}</small>
                        </div>
                        <CalendarDays size={18}/>
                      </header>

                      <div className="report-center-mobile-meta">
                        <div><span>Pengajar</span><strong>{row.teacher_name_snapshot || 'Pengajar KOJAC'}</strong></div>
                        <div><span>Waktu</span><strong>{timeRange(row.starts_at, row.ends_at)}</strong></div>
                        <div><span>Durasi</span><strong>{durationLabel(row.recorded_minutes)}</strong></div>
                      </div>

                      <div className="report-center-mobile-material">
                        <span>Materi</span>
                        <p>{row.material_preview || '—'}</p>
                      </div>

                      <button className="class-action-secondary report-center-detail-button" type="button" onClick={() => void openDetail(row)}>
                        <FileText size={14}/> Lihat Detail
                      </button>
                    </article>
                  ))}
                </div>

                <div className="report-center-pagination" aria-label="Pagination laporan pembelajaran">
                  <div>
                    <label htmlFor="report-center-page-size">Tampilkan</label>
                    <select id="report-center-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>laporan / halaman</span>
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

      {selectedRow && (
        <div className="report-center-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
          <section className="report-center-modal" role="dialog" aria-modal="true" aria-labelledby="report-center-detail-title">
            <header className="report-center-modal-header">
              <div>
                <p className="eyebrow">DETAIL LAPORAN</p>
                <h2 id="report-center-detail-title">{selectedRow.class_name}</h2>
                <span>{formatDate(selectedRow.report_date)} · {selectedRow.teacher_name_snapshot}</span>
              </div>
              <button ref={closeButtonRef} type="button" className="report-center-modal-close" aria-label="Tutup detail laporan" onClick={closeDetail}>
                <X size={20}/>
              </button>
            </header>

            {detailLoading ? (
              <div className="report-center-detail-loading" aria-busy="true"><div/><div/><div/></div>
            ) : detailError || !detail ? (
              <div className="class-state-card">
                <AlertCircle size={28}/>
                <h3>Detail laporan belum dapat dimuat.</h3>
                <button className="class-action-secondary" type="button" onClick={() => void openDetail(selectedRow)}>
                  <RefreshCw size={15}/> Coba Lagi
                </button>
              </div>
            ) : (
              <div className="report-center-detail-content">
                <section className="report-center-detail-summary">
                  <div><span>Tanggal</span><strong>{formatDate(detail.report_date)}</strong></div>
                  <div><span>Program</span><strong>{detail.program_name || '—'}</strong></div>
                  <div><span>Kelas</span><strong>{detail.class_name}</strong></div>
                  <div><span>Kode Kelas</span><strong>{detail.class_code || '—'}</strong></div>
                  <div><span>Pengajar</span><strong>{detail.teacher_name_snapshot || 'Pengajar KOJAC'}</strong></div>
                  <div><span>Waktu Mulai</span><strong>{shortTime(detail.starts_at)}</strong></div>
                  <div><span>Waktu Selesai</span><strong>{shortTime(detail.ends_at)}</strong></div>
                  <div><span>Durasi Tercatat</span><strong>{durationLabel(detail.recorded_minutes)}</strong></div>
                </section>

                <div className="report-center-duration-note">
                  <Clock3 size={16}/>
                  <span>Durasi Tercatat berasal dari waktu pada laporan pembelajaran dan bukan catatan jam kerja atau absensi.</span>
                </div>

                <section className="report-center-detail-sections">
                  <article><span>Materi</span><p>{detail.material_summary || '—'}</p></article>
                  <article><span>Tugas / Assignment</span><p>{detail.assignment_summary || '—'}</p></article>
                  <article><span>Rencana Berikutnya</span><p>{detail.next_plan || '—'}</p></article>
                  <article><span>Catatan Evaluasi</span><p>{detail.evaluation_notes || '—'}</p></article>
                </section>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
