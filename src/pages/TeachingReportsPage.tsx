import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Edit3,
  FileText,
  RefreshCw,
  Save,
  School,
  UserRound,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type ClassStatus = 'planned' | 'active' | 'completed' | 'cancelled';

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

type ClassContext = {
  id: string;
  program_id: string | null;
  code: string | null;
  name: string;
  status: ClassStatus;
  starts_on: string | null;
  ends_on: string | null;
  program_code: string | null;
  program_name: string | null;
};

type TeachingReportRow = {
  report_id: string;
  class_id: string;
  teacher_id: string | null;
  teacher_name: string;
  report_date: string;
  starts_at: string;
  ends_at: string;
  material_summary: string;
  assignment_summary: string;
  next_plan: string;
  evaluation_notes: string | null;
  created_at: string;
  updated_at: string;
};

type ReportForm = {
  report_date: string;
  starts_at: string;
  ends_at: string;
  material_summary: string;
  assignment_summary: string;
  next_plan: string;
  evaluation_notes: string;
};

const TEACHING_ROLES = new Set<AppRole>(['pengajar', 'administrator', 'manager', 'co_founder', 'founder']);
const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyReportForm(): ReportForm {
  return {
    report_date: localToday(),
    starts_at: '',
    ends_at: '',
    material_summary: '',
    assignment_summary: '',
    next_plan: '',
    evaluation_notes: '',
  };
}

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

function shortTime(value: string | null | undefined) {
  if (!value) return '—';
  return value.slice(0, 5);
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function durationText(start: string, end: string) {
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return '—';
  const duration = endMinutes - startMinutes;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  if (hours > 0 && minutes > 0) return `${hours} jam ${minutes} menit`;
  if (hours > 0) return `${hours} jam`;
  return `${minutes} menit`;
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return 'Belum ditentukan';
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `Mulai ${formatDate(start)}`;
  return `Sampai ${formatDate(end)}`;
}

function errorContains(error: unknown, marker: string) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: string; details?: string; hint?: string; code?: string };
  return [candidate.message, candidate.details, candidate.hint, candidate.code]
    .some((value) => value?.toLowerCase().includes(marker.toLowerCase()));
}

function reportErrorMessage(error: unknown) {
  if (errorContains(error, 'teacher_class_access_denied')) return 'Kelas ini tidak ditugaskan kepada akun Anda.';
  if (errorContains(error, 'class_not_active_for_report')) return 'Laporan baru hanya dapat dibuat untuk kelas yang sedang aktif.';
  if (errorContains(error, 'report_date_future')) return 'Tanggal laporan tidak boleh melebihi hari ini.';
  if (errorContains(error, 'invalid_report_time')) return 'Waktu selesai harus setelah waktu mulai.';
  if (errorContains(error, 'report_time_required')) return 'Jam mulai dan jam selesai wajib diisi.';
  if (errorContains(error, 'material_required')) return 'Materi pembelajaran wajib diisi.';
  if (errorContains(error, 'assignment_required')) return 'Tugas wajib diisi.';
  if (errorContains(error, 'next_plan_required')) return 'Rencana pembelajaran berikutnya wajib diisi.';
  if (errorContains(error, 'report_text_too_long')) return 'Isi laporan terlalu panjang. Ringkas lalu coba lagi.';
  if (errorContains(error, 'teaching_report_access_denied')) return 'Anda tidak memiliki izin untuk mengubah laporan ini.';
  if (errorContains(error, 'management_access_required')) return 'Anda tidak memiliki izin untuk melihat laporan kelas ini.';
  return 'Laporan belum dapat diproses. Silakan coba lagi.';
}

function ReportCard({
  row,
  canEdit,
  onEdit,
}: {
  row: TeachingReportRow;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <article className="panel" style={{ padding: 20, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow" style={{ marginBottom: 5 }}>{formatDate(row.report_date)}</p>
          <h3 style={{ margin: 0, overflowWrap: 'anywhere' }}>{row.teacher_name || 'Pengajar KOJAC'}</h3>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            {shortTime(row.starts_at)} – {shortTime(row.ends_at)} · {durationText(row.starts_at, row.ends_at)}
          </p>
        </div>
        {canEdit && (
          <button className="mini" type="button" onClick={onEdit}>
            <Edit3 size={15}/> Edit
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 12, marginTop: 18 }}>
        <div style={{ minWidth: 0 }}>
          <small style={{ color: 'var(--muted)' }}>Materi</small>
          <p style={{ margin: '5px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{row.material_summary}</p>
        </div>
        <div style={{ minWidth: 0 }}>
          <small style={{ color: 'var(--muted)' }}>Tugas</small>
          <p style={{ margin: '5px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{row.assignment_summary}</p>
        </div>
        <div style={{ minWidth: 0 }}>
          <small style={{ color: 'var(--muted)' }}>Rencana Berikutnya</small>
          <p style={{ margin: '5px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{row.next_plan}</p>
        </div>
        <div style={{ minWidth: 0 }}>
          <small style={{ color: 'var(--muted)' }}>Evaluasi / Catatan</small>
          <p style={{ margin: '5px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{row.evaluation_notes || '—'}</p>
        </div>
      </div>
    </article>
  );
}

export function TeachingReportsPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { role, user, profile, loading: authLoading } = useAuth();
  const [classContext, setClassContext] = useState<ClassContext | null>(null);
  const [ownClasses, setOwnClasses] = useState<TeachingClassRow[]>([]);
  const [reports, setReports] = useState<TeachingReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [form, setForm] = useState<ReportForm>(emptyReportForm);
  const [editingReport, setEditingReport] = useState<TeachingReportRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const canTeach = Boolean(role && TEACHING_ROLES.has(role));
  const isManagement = Boolean(role && MANAGEMENT_ROLES.has(role));
  const teacherDisplayName = profile?.full_name?.trim() || 'Pengajar KOJAC';

  const loadPage = useCallback(async () => {
    if (!classId || !role || !TEACHING_ROLES.has(role)) return;
    setLoading(true);
    setPageError('');

    const classPromise = supabase
      .from('classes')
      .select('id,program_id,code,name,status,starts_on,ends_on')
      .eq('id', classId)
      .maybeSingle();
    const ownClassesPromise = supabase.rpc('get_my_teaching_classes');
    const reportsPromise = MANAGEMENT_ROLES.has(role)
      ? supabase.rpc('get_class_teaching_reports', { p_class_id: classId })
      : supabase.rpc('get_my_teaching_reports', { p_class_id: classId });

    const [classResult, ownClassesResult, reportsResult] = await Promise.all([
      classPromise,
      ownClassesPromise,
      reportsPromise,
    ]);

    if (classResult.error || !classResult.data) {
      console.error('KOJAC teaching report class context failed', classResult.error);
      setPageError('Kelas belum dapat dimuat atau tidak tersedia untuk akun Anda.');
      setLoading(false);
      return;
    }

    if (ownClassesResult.error) {
      console.error('KOJAC teaching report own classes failed', ownClassesResult.error);
      setPageError('Data kelas mengajar belum dapat dimuat. Silakan coba lagi.');
      setLoading(false);
      return;
    }

    if (reportsResult.error) {
      console.error('KOJAC teaching reports load failed', reportsResult.error);
      setPageError(reportErrorMessage(reportsResult.error));
      setLoading(false);
      return;
    }

    const classRow = classResult.data as {
      id: string;
      program_id: string | null;
      code: string | null;
      name: string;
      status: ClassStatus;
      starts_on: string | null;
      ends_on: string | null;
    };

    const ownRows = (ownClassesResult.data ?? []) as TeachingClassRow[];
    const ownContext = ownRows.find((row) => row.class_id === classId) ?? null;
    let programCode: string | null = ownContext?.program_code ?? null;
    let programName: string | null = ownContext?.program_name ?? null;
    if (!programName && classRow.program_id) {
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('code,name')
        .eq('id', classRow.program_id)
        .maybeSingle();
      if (!programError && programData) {
        programCode = programData.code;
        programName = programData.name;
      }
    }

    setClassContext({
      ...classRow,
      program_code: programCode,
      program_name: programName,
    });
    setOwnClasses(ownRows);
    setReports((reportsResult.data ?? []) as TeachingReportRow[]);
    setLoading(false);
  }, [classId, role]);

  useEffect(() => {
    if (!authLoading && canTeach) void loadPage();
  }, [authLoading, canTeach, loadPage]);

  const ownCurrentClass = useMemo(
    () => ownClasses.find((row) => row.class_id === classId) ?? null,
    [ownClasses, classId],
  );
  const ownActiveClasses = useMemo(
    () => ownClasses.filter((row) => row.class_status === 'active'),
    [ownClasses],
  );
  const canCreateForCurrentClass = Boolean(ownCurrentClass && ownCurrentClass.class_status === 'active');

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canTeach || !classId) return <Navigate to="/" replace />;

  function resetForm() {
    setEditingReport(null);
    setForm(emptyReportForm());
    setFormMessage('');
  }

  function beginEdit(row: TeachingReportRow) {
    if (!user || row.teacher_id !== user.id) return;
    setEditingReport(row);
    setForm({
      report_date: row.report_date,
      starts_at: shortTime(row.starts_at),
      ends_at: shortTime(row.ends_at),
      material_summary: row.material_summary,
      assignment_summary: row.assignment_summary,
      next_plan: row.next_plan,
      evaluation_notes: row.evaluation_notes ?? '',
    });
    setFormMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateForm() {
    if (!form.report_date) return 'Tanggal wajib diisi.';
    if (form.report_date > localToday()) return 'Tanggal laporan tidak boleh melebihi hari ini.';
    if (!form.starts_at || !form.ends_at) return 'Jam mulai dan jam selesai wajib diisi.';
    const start = minutesFromTime(form.starts_at);
    const end = minutesFromTime(form.ends_at);
    if (start === null || end === null || end <= start) return 'Waktu selesai harus setelah waktu mulai.';
    if (!form.material_summary.trim()) return 'Materi pembelajaran wajib diisi.';
    if (!form.assignment_summary.trim()) return 'Tugas wajib diisi.';
    if (!form.next_plan.trim()) return 'Rencana pembelajaran berikutnya wajib diisi.';
    return '';
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    if (saving || !classId) return;
    const validation = validateForm();
    if (validation) {
      setFormMessage(validation);
      return;
    }

    setSaving(true);
    setFormMessage('');

    const args = {
      p_report_date: form.report_date,
      p_starts_at: form.starts_at,
      p_ends_at: form.ends_at,
      p_material_summary: form.material_summary.trim(),
      p_assignment_summary: form.assignment_summary.trim(),
      p_next_plan: form.next_plan.trim(),
      p_evaluation_notes: form.evaluation_notes.trim() || null,
    };

    const result = editingReport
      ? await supabase.rpc('update_teaching_report', {
          p_report_id: editingReport.report_id,
          ...args,
        })
      : await supabase.rpc('create_teaching_report', {
          p_class_id: classId,
          ...args,
        });

    if (result.error) {
      console.error('KOJAC teaching report save failed', result.error);
      setFormMessage(reportErrorMessage(result.error));
      setSaving(false);
      return;
    }

    setEditingReport(null);
    setForm(emptyReportForm());
    setFormMessage(editingReport ? 'Laporan berhasil diperbarui.' : 'Laporan berhasil disimpan.');
    await loadPage();
    setSaving(false);
  }

  const showForm = editingReport !== null || canCreateForCurrentClass;

  return (
    <div className="page" style={{ minWidth: 0 }}>
      <div className="page-header" style={{ gap: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">PENGAJAR KOJAC</p>
          <h1 className="title-icon"><FileText/>Laporan Belajar Mengajar</h1>
          <p>Catat hasil pembelajaran setelah pertemuan kelas selesai.</p>
        </div>
        <Link className="ghost-btn" to="/kelas-mengajar"><ArrowLeft size={16}/> Kelas Mengajar</Link>
      </div>

      {loading ? (
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>Memuat laporan kelas…</div>
      ) : pageError ? (
        <div className="panel" style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ marginTop: 0 }}>{pageError}</p>
          <button className="ghost-btn" type="button" onClick={() => void loadPage()}><RefreshCw size={16}/> Muat Ulang</button>
        </div>
      ) : classContext ? (
        <>
          <section className="panel" style={{ padding: 20, marginBottom: 18, minWidth: 0 }}>
            <p className="eyebrow">KELAS</p>
            <h2 style={{ margin: '5px 0 4px', overflowWrap: 'anywhere' }}>{classContext.name}</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
              {classContext.program_name || 'Program KOJAC'} · {classContext.code || 'Tanpa kode'} · {formatPeriod(classContext.starts_on, classContext.ends_on)}
            </p>
          </section>

          {showForm ? (
            <section className="panel" style={{ padding: 22, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p className="eyebrow">{editingReport ? 'EDIT LAPORAN' : 'LAPORAN BELAJAR MENGAJAR'}</p>
                  <h2 style={{ margin: '4px 0 0' }}>{editingReport ? 'Perbarui laporan' : 'Buat laporan pertemuan'}</h2>
                </div>
                {editingReport && <button className="ghost-btn" type="button" disabled={saving} onClick={resetForm}>Batal Edit</button>}
              </div>

              <form onSubmit={submitReport} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 12 }}>
                  <label>Nama Pengajar
                    <input value={editingReport?.teacher_name || teacherDisplayName} readOnly />
                  </label>
                  <label>Tanggal
                    <input type="date" max={localToday()} value={form.report_date} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, report_date: event.target.value }))} required />
                  </label>
                </div>

                <label>Kelas
                  {editingReport ? (
                    <input value={`${classContext.program_name || 'Program KOJAC'} — ${classContext.name}`} readOnly />
                  ) : (
                    <select value={classId} disabled={saving} onChange={(event) => navigate(`/kelas-mengajar/${event.target.value}/laporan`)}>
                      {ownActiveClasses.map((row) => (
                        <option key={row.class_id} value={row.class_id}>{row.program_name || 'Program KOJAC'} — {row.class_name}</option>
                      ))}
                    </select>
                  )}
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: 12 }}>
                  <label>Jam Mulai
                    <input type="time" value={form.starts_at} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))} required />
                  </label>
                  <label>Jam Selesai
                    <input type="time" value={form.ends_at} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))} required />
                  </label>
                  <label>Durasi
                    <input value={form.starts_at && form.ends_at ? durationText(form.starts_at, form.ends_at) : '—'} readOnly />
                  </label>
                </div>

                <label>Materi Pembelajaran
                  <textarea rows={4} maxLength={10000} value={form.material_summary} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, material_summary: event.target.value }))} required />
                </label>
                <label>Tugas
                  <textarea rows={3} maxLength={10000} value={form.assignment_summary} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, assignment_summary: event.target.value }))} required />
                </label>
                <label>Rencana Pembelajaran Berikutnya
                  <textarea rows={3} maxLength={10000} value={form.next_plan} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, next_plan: event.target.value }))} required />
                </label>
                <label>Evaluasi / Catatan Tambahan
                  <textarea rows={3} maxLength={10000} value={form.evaluation_notes} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, evaluation_notes: event.target.value }))} />
                </label>

                {formMessage && <div className="notice" role="status">{formMessage}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                  <button className="primary-btn" type="submit" disabled={saving}>
                    <Save size={16}/> {saving ? 'Menyimpan…' : editingReport ? 'Simpan Perubahan' : 'Simpan Laporan'}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="panel" style={{ padding: 20, color: 'var(--muted)' }}>
              {ownCurrentClass
                ? 'Kelas ini sudah tidak aktif. Laporan lama tetap dapat dilihat dan laporan milik Anda tetap dapat diedit.'
                : 'Anda dapat melihat laporan kelas ini, tetapi hanya pengajar yang ditugaskan pada kelas aktif yang dapat membuat laporan.'}
            </section>
          )}

          <section style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <p className="eyebrow">RIWAYAT LAPORAN</p>
                <h2 style={{ margin: '4px 0 0' }}>Pertemuan terbaru</h2>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{reports.length} laporan</span>
            </div>

            {reports.length === 0 ? (
              <div className="panel" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                Belum ada laporan belajar mengajar untuk kelas ini.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {reports.map((row) => (
                  <ReportCard
                    key={row.report_id}
                    row={row}
                    canEdit={Boolean(user && row.teacher_id === user.id)}
                    onEdit={() => beginEdit(row)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
