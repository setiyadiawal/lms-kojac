import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Inbox,
  MessageSquareText,
  RefreshCw,
  Save,
  Search,
  Tag,
  UserRound,
  X,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../classroom.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type FeedbackStatus = 'baru' | 'diproses' | 'selesai';
type FeedbackCategory = 'kritik' | 'saran' | 'bug' | 'materi' | 'fitur' | 'lainnya';

type FeedbackSummary = {
  total_feedback: number;
  new_feedback: number;
  processing_feedback: number;
  completed_feedback: number;
};

type FeedbackRow = {
  feedback_id: string;
  sender_name: string;
  category: FeedbackCategory;
  title: string | null;
  message: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
};

type FeedbackPayload = {
  summary: FeedbackSummary;
  rows: FeedbackRow[];
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
};

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);

const STATUS_OPTIONS: Array<{ value: FeedbackStatus; label: string }> = [
  { value: 'baru', label: 'Baru' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'selesai', label: 'Selesai' },
];

const CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: 'kritik', label: 'Kritik' },
  { value: 'saran', label: 'Saran' },
  { value: 'bug', label: 'Laporan Bug' },
  { value: 'materi', label: 'Masalah Materi' },
  { value: 'fitur', label: 'Permintaan Fitur' },
  { value: 'lainnya', label: 'Lainnya' },
];

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  baru: 'Baru',
  diproses: 'Diproses',
  selesai: 'Selesai',
};

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  kritik: 'Kritik',
  saran: 'Saran',
  bug: 'Laporan Bug',
  materi: 'Masalah Materi',
  fitur: 'Permintaan Fitur',
  lainnya: 'Lainnya',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function messagePreview(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 155 ? `${clean.slice(0, 152)}…` : clean;
}

function statusClass(status: FeedbackStatus) {
  return `feedback-inbox-status is-${status}`;
}

function SummaryCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <article className="class-summary-card feedback-inbox-summary-card">
      <div className="class-summary-icon">{icon}</div>
      <div className="class-summary-copy">
        <strong className="class-summary-value">{value}</strong>
        <span className="class-summary-label">{label}</span>
      </div>
    </article>
  );
}

function InboxSkeleton() {
  return (
    <div className="feedback-inbox-skeleton" aria-busy="true" aria-label="Memuat kritik dan saran">
      <div className="feedback-inbox-skeleton-summary">
        {[0, 1, 2, 3].map((item) => <div key={item}/>) }
      </div>
      <div className="feedback-inbox-skeleton-filter"/>
      <div className="feedback-inbox-skeleton-list">
        {[0, 1, 2].map((item) => <div key={item}/>) }
      </div>
    </div>
  );
}

function MobileFeedbackCard({ row, onOpen }: { row: FeedbackRow; onOpen: () => void }) {
  return (
    <article className="feedback-inbox-mobile-card">
      <header>
        <div>
          <span>{CATEGORY_LABELS[row.category]}</span>
          <h3>{row.title?.trim() || 'Tanpa judul'}</h3>
          <small>{row.sender_name}</small>
        </div>
        <span className={statusClass(row.status)}>{STATUS_LABELS[row.status]}</span>
      </header>
      <p>{messagePreview(row.message)}</p>
      <div className="feedback-inbox-mobile-meta">
        <CalendarDays size={14}/>
        <span>{formatDate(row.created_at)}</span>
      </div>
      <button className="class-action-secondary feedback-inbox-detail-button" type="button" onClick={onOpen}>
        <Eye size={15}/> Lihat Detail
      </button>
    </article>
  );
}

export function ManagementFeedbackPage() {
  const { role, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<FeedbackPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<FeedbackRow | null>(null);
  const [statusDraft, setStatusDraft] = useState<FeedbackStatus>('baru');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusMessageTone, setStatusMessageTone] = useState<'success' | 'error'>('success');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const canManage = Boolean(role && MANAGEMENT_ROLES.has(role));

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadFeedback = useCallback(async () => {
    if (!role || !MANAGEMENT_ROLES.has(role)) return;
    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_management_feedback', {
      p_status: status || null,
      p_category: category || null,
      p_search: debouncedSearch || null,
      p_page: page,
      p_page_size: pageSize,
    });

    if (loadError) {
      console.error('KOJAC management feedback load failed', loadError);
      setError(true);
      setLoading(false);
      return;
    }

    const next = data as FeedbackPayload | null;
    setPayload(next ?? {
      summary: { total_feedback: 0, new_feedback: 0, processing_feedback: 0, completed_feedback: 0 },
      rows: [],
      pagination: { page, page_size: pageSize, total_rows: 0, total_pages: 0 },
    });
    setLoading(false);
  }, [role, status, category, debouncedSearch, page, pageSize]);

  useEffect(() => {
    if (!authLoading && canManage) void loadFeedback();
  }, [authLoading, canManage, loadFeedback]);

  useEffect(() => {
    if (!selected) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingStatus) setSelected(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected, savingStatus]);

  useEffect(() => {
    if (!payload || payload.pagination.total_pages === 0) return;
    if (page > payload.pagination.total_pages) setPage(payload.pagination.total_pages);
  }, [payload, page]);

  function resetToFirstPage() {
    setPage(1);
  }

  function openDetail(row: FeedbackRow) {
    setSelected(row);
    setStatusDraft(row.status);
    setStatusMessage('');
    setStatusMessageTone('success');
  }

  async function saveStatus() {
    if (!selected || savingStatus) return;
    if (statusDraft === selected.status) {
      setStatusMessage('Status tidak berubah.');
      setStatusMessageTone('success');
      return;
    }

    setSavingStatus(true);
    setStatusMessage('');

    const { data, error: updateError } = await supabase.rpc('update_feedback_status', {
      p_feedback_id: selected.feedback_id,
      p_status: statusDraft,
    });

    if (updateError) {
      console.error('KOJAC feedback status update failed', updateError);
      setStatusMessage('Status belum dapat diperbarui. Silakan coba lagi.');
      setStatusMessageTone('error');
      setSavingStatus(false);
      return;
    }

    const result = data as { status?: FeedbackStatus; updated_at?: string } | null;
    const nextStatus = result?.status ?? statusDraft;
    setSelected((current) => current ? {
      ...current,
      status: nextStatus,
      updated_at: result?.updated_at ?? current.updated_at,
    } : current);
    setStatusDraft(nextStatus);
    setStatusMessage('Status masukan berhasil diperbarui.');
    setStatusMessageTone('success');
    await loadFeedback();
    setSavingStatus(false);
  }

  const summary = payload?.summary ?? {
    total_feedback: 0,
    new_feedback: 0,
    processing_feedback: 0,
    completed_feedback: 0,
  };
  const rows = payload?.rows ?? [];
  const pagination = payload?.pagination ?? { page, page_size: pageSize, total_rows: 0, total_pages: 0 };
  const hasActiveFilter = Boolean(status || category || search.trim());
  const canGoPrevious = page > 1;
  const canGoNext = pagination.total_pages > 0 && page < pagination.total_pages;

  const resultLabel = useMemo(() => {
    if (pagination.total_rows === 0) return '0 masukan';
    const start = (pagination.page - 1) * pagination.page_size + 1;
    const end = Math.min(start + rows.length - 1, pagination.total_rows);
    return `${start}–${end} dari ${pagination.total_rows} masukan`;
  }, [pagination, rows.length]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canManage) return <Navigate to="/" replace />;

  return (
    <div className="page class-experience-page feedback-inbox-page">
      <header className="class-page-header feedback-inbox-header">
        <div className="class-page-header-copy">
          <p className="eyebrow">MANAJEMEN KOJAC</p>
          <h1>Kritik &amp; Saran Masuk</h1>
          <p>Baca masukan pengguna dan pantau status penanganannya.</p>
        </div>
      </header>

      {!payload && loading ? (
        <InboxSkeleton/>
      ) : error && !payload ? (
        <section className="class-state-card" role="alert">
          <div className="class-state-icon"><AlertCircle size={28}/></div>
          <h2>Data kritik dan saran belum dapat dimuat.</h2>
          <p>Silakan coba lagi.</p>
          <button className="class-action-secondary" type="button" onClick={() => void loadFeedback()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </section>
      ) : (
        <>
          <section className="class-summary-grid feedback-inbox-summary-grid" aria-label="Ringkasan kritik dan saran">
            <SummaryCard icon={<MessageSquareText size={20}/>} value={summary.total_feedback} label="Total Masukan"/>
            <SummaryCard icon={<Inbox size={20}/>} value={summary.new_feedback} label="Baru"/>
            <SummaryCard icon={<Clock3 size={20}/>} value={summary.processing_feedback} label="Diproses"/>
            <SummaryCard icon={<CheckCircle2 size={20}/>} value={summary.completed_feedback} label="Selesai"/>
          </section>

          <section className="feedback-inbox-filter-card" aria-label="Filter kritik dan saran">
            <div className="feedback-inbox-filter-heading">
              <div><Filter size={17}/><strong>Filter Masukan</strong></div>
              {loading && <span>Memuat data…</span>}
            </div>
            <div className="feedback-inbox-filter-grid">
              <label>
                <span>Status</span>
                <select value={status} onChange={(event) => { setStatus(event.target.value); resetToFirstPage(); }}>
                  <option value="">Semua status</option>
                  {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label>
                <span>Kategori</span>
                <select value={category} onChange={(event) => { setCategory(event.target.value); resetToFirstPage(); }}>
                  <option value="">Semua kategori</option>
                  {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className="feedback-inbox-search-field">
                <span>Cari</span>
                <div>
                  <Search size={16}/>
                  <input
                    type="search"
                    value={search}
                    placeholder="Pengirim, judul, atau isi pesan"
                    onChange={(event) => { setSearch(event.target.value); resetToFirstPage(); }}
                  />
                </div>
              </label>
            </div>
          </section>

          {error && payload && (
            <div className="notice feedback-inbox-inline-error" role="alert">
              Data terbaru belum dapat dimuat. Data sebelumnya tetap ditampilkan.
              <button type="button" onClick={() => void loadFeedback()}>Coba Lagi</button>
            </div>
          )}

          <section className="class-section feedback-inbox-section">
            <div className="class-section-heading">
              <div>
                <p className="eyebrow">FEEDBACK INBOX</p>
                <h2>Masukan Pengguna</h2>
              </div>
              <span className="class-section-count">{resultLabel}</span>
            </div>

            {rows.length === 0 ? (
              <div className="class-state-card feedback-inbox-empty">
                <MessageSquareText size={28}/>
                <h3>{hasActiveFilter ? 'Tidak ada masukan yang sesuai dengan filter.' : 'Belum ada kritik atau saran yang masuk.'}</h3>
              </div>
            ) : (
              <>
                <div className="feedback-inbox-desktop-list">
                  <div className="feedback-inbox-desktop-head" aria-hidden="true">
                    <span>Kategori</span>
                    <span>Judul</span>
                    <span>Pengirim</span>
                    <span>Tanggal</span>
                    <span>Status</span>
                    <span>Preview Pesan</span>
                    <span>Aksi</span>
                  </div>
                  {rows.map((row) => (
                    <article className="feedback-inbox-desktop-row" key={row.feedback_id}>
                      <div><span className="feedback-inbox-category">{CATEGORY_LABELS[row.category]}</span></div>
                      <div><strong>{row.title?.trim() || 'Tanpa judul'}</strong></div>
                      <div><strong>{row.sender_name}</strong></div>
                      <div><span>{formatDate(row.created_at)}</span></div>
                      <div><span className={statusClass(row.status)}>{STATUS_LABELS[row.status]}</span></div>
                      <div><p>{messagePreview(row.message)}</p></div>
                      <div>
                        <button className="class-action-secondary feedback-inbox-detail-button" type="button" onClick={() => openDetail(row)}>
                          <Eye size={15}/> Lihat Detail
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="feedback-inbox-mobile-list">
                  {rows.map((row) => <MobileFeedbackCard key={row.feedback_id} row={row} onOpen={() => openDetail(row)}/>) }
                </div>
              </>
            )}

            <div className="feedback-inbox-pagination" aria-label="Pagination kritik dan saran">
              <div>
                <span>Tampilkan</span>
                <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>per halaman</span>
              </div>
              <div>
                <button className="class-action-secondary" type="button" disabled={!canGoPrevious || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Sebelumnya
                </button>
                <span>Halaman {pagination.total_pages === 0 ? 0 : pagination.page} / {pagination.total_pages}</span>
                <button className="class-action-secondary" type="button" disabled={!canGoNext || loading} onClick={() => setPage((current) => current + 1)}>
                  Berikutnya
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {selected && (
        <div className="feedback-inbox-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingStatus) setSelected(null);
        }}>
          <section className="feedback-inbox-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-inbox-detail-title">
            <header className="feedback-inbox-modal-header">
              <div>
                <p className="eyebrow">DETAIL MASUKAN</p>
                <h2 id="feedback-inbox-detail-title">{selected.title?.trim() || 'Tanpa judul'}</h2>
                <span>{CATEGORY_LABELS[selected.category]}</span>
              </div>
              <button ref={closeButtonRef} className="feedback-inbox-modal-close" type="button" aria-label="Tutup detail" disabled={savingStatus} onClick={() => setSelected(null)}>
                <X size={20}/>
              </button>
            </header>

            <div className="feedback-inbox-detail-content">
              <div className="feedback-inbox-detail-meta-grid">
                <div><span><UserRound size={14}/>Pengirim</span><strong>{selected.sender_name}</strong></div>
                <div><span><Tag size={14}/>Kategori</span><strong>{CATEGORY_LABELS[selected.category]}</strong></div>
                <div><span><CalendarDays size={14}/>Tanggal</span><strong>{formatDate(selected.created_at)}</strong></div>
                <div><span><Clock3 size={14}/>Status</span><strong><span className={statusClass(selected.status)}>{STATUS_LABELS[selected.status]}</span></strong></div>
              </div>

              <section className="feedback-inbox-message-section">
                <h3>Pesan</h3>
                <p>{selected.message}</p>
              </section>

              <section className="feedback-inbox-status-editor" aria-label="Ubah status masukan">
                <div>
                  <h3>Status Penanganan</h3>
                  <p>Tandai progres penanganan tanpa menghapus riwayat masukan.</p>
                </div>
                <div className="feedback-inbox-status-controls">
                  <select value={statusDraft} disabled={savingStatus} onChange={(event) => { setStatusDraft(event.target.value as FeedbackStatus); setStatusMessage(''); }}>
                    {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <button className="class-action-primary" type="button" disabled={savingStatus} onClick={() => void saveStatus()}>
                    <Save size={15}/>{savingStatus ? 'Menyimpan…' : 'Simpan Status'}
                  </button>
                </div>
                {statusMessage && (
                  <div className={`notice feedback-inbox-status-message ${statusMessageTone === 'error' ? '' : 'success'}`} role={statusMessageTone === 'error' ? 'alert' : 'status'}>
                    {statusMessage}
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
