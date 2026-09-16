import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  ChevronUp,
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
import '../classroom.css';

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
  primary_teacher_id: string | null;
  primary_teacher_name: string | null;
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
  teacher_id: string | null;
  primary_teacher_name: string | null;
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

type ReportField = keyof ReportForm | 'time';
type ReportFieldErrors = Partial<Record<ReportField, string>>;

const TEACHING_ROLES = new Set<AppRole>(['pengajar', 'administrator', 'manager', 'co_founder', 'founder']);
const MANAGEMENT_ROLES = new Set<AppRole>(['administrator', 'manager', 'co_founder', 'founder']);

const classLabels: Record<ClassStatus, string> = {
  planned: 'Direncanakan',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

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
  if (errorContains(error, 'substitute_report_date_outside_assignment')) return 'Tanggal laporan berada di luar periode tugas Anda sebagai pengajar pengganti.';
  if (errorContains(error, 'class_not_active_for_report')) return 'Laporan baru hanya dapat dibuat untuk kelas yang sedang aktif.';
  if (errorContains(error, 'report_date_future')) return 'Tanggal laporan tidak boleh melebihi hari ini.';
  if (errorContains(error, 'invalid_report_time')) return 'Waktu selesai harus setelah waktu mulai.';
  if (errorContains(error, 'report_time_required')) return 'Jam mulai dan jam selesai wajib diisi.';
  if (errorContains(error, 'material_required')) return 'Materi yang diajarkan wajib diisi.';
  if (errorContains(error, 'assignment_required')) return 'Tugas / latihan wajib diisi.';
  if (errorContains(error, 'next_plan_required')) return 'Rencana pertemuan berikutnya wajib diisi.';
  if (errorContains(error, 'report_text_too_long')) return 'Isi laporan terlalu panjang. Ringkas lalu coba lagi.';
  if (errorContains(error, 'teaching_report_access_denied')) return 'Anda tidak memiliki izin untuk mengubah laporan ini.';
  if (errorContains(error, 'management_access_required')) return 'Anda tidak memiliki izin untuk melihat laporan kelas ini.';
  return 'Laporan belum dapat diproses. Silakan coba lagi.';
}

function ReportContentBlock({
  label,
  value,
  expanded,
  className = '',
}: {
  label: string;
  value: string | null;
  expanded: boolean;
  className?: string;
}) {
  return (
    <div className={`teaching-report-history-block ${className}`.trim()}>
      <span>{label}</span>
      <p className={expanded ? '' : 'is-clamped'}>{value || '—'}</p>
    </div>
  );
}

function ReportCard({
  row,
  canEdit,
  expanded,
  onEdit,
  onToggle,
}: {
  row: TeachingReportRow;
  canEdit: boolean;
  expanded: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const hasLongContent = [row.material_summary, row.assignment_summary, row.next_plan, row.evaluation_notes ?? '']
    .some((value) => value.length > 120 || value.split('\n').length > 2);

  return (
    <article className={`teaching-report-history-card ${expanded ? 'is-expanded' : ''}`.trim()}>
      <div className="teaching-report-compact-grid">
        <div className="teaching-report-encounter">
          <strong className="teaching-report-encounter-date">{formatDate(row.report_date)}</strong>
          <span className="teaching-report-encounter-teacher">{row.teacher_name || 'Pengajar KOJAC'}</span>
          <div className="teaching-report-time-line">
            <Clock3 size={14}/>
            <span>{shortTime(row.starts_at)}–{shortTime(row.ends_at)}</span>
            <strong>{durationText(row.starts_at, row.ends_at)}</strong>
          </div>
        </div>

        <div className="teaching-report-compact-column">
          <ReportContentBlock label="Materi" value={row.material_summary} expanded={expanded}/>
          <ReportContentBlock label="Tugas" value={row.assignment_summary} expanded={expanded}/>
        </div>

        <div className="teaching-report-compact-column">
          <ReportContentBlock label="Rencana" value={row.next_plan} expanded={expanded}/>
          <ReportContentBlock label="Evaluasi" value={row.evaluation_notes} expanded={expanded} className="is-evaluation"/>
        </div>

        <div className="teaching-report-row-actions">
          {canEdit && (
            <button className="class-action-secondary teaching-report-edit-button" type="button" onClick={onEdit}>
              <Edit3 size={15}/> Edit
            </button>
          )}
          {hasLongContent && (
            <button className="teaching-report-detail-toggle" type="button" onClick={onToggle} aria-expanded={expanded}>
              {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {expanded ? 'Ringkas' : 'Lihat Detail'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ReportPageSkeleton() {
  return (
    <div className="teaching-report-skeleton" aria-label="Memuat laporan kelas">
      <div className="teaching-report-skeleton-hero"/>
      <div className="teaching-report-skeleton-form">
        <div/>
        <div/>
        <div className="is-wide"/>
        <div className="is-wide is-tall"/>
        <div className="is-wide is-tall"/>
      </div>
    </div>
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
  const [fieldErrors, setFieldErrors] = useState<ReportFieldErrors>({});
  const [editingReport, setEditingReport] = useState<TeachingReportRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [formMessageTone, setFormMessageTone] = useState<'success' | 'error'>('error');
  const [expandedReportIds, setExpandedReportIds] = useState<Set<string>>(() => new Set());

  const canTeach = Boolean(role && TEACHING_ROLES.has(role));
  const teacherDisplayName = profile?.full_name?.trim() || 'Pengajar KOJAC';

  const loadPage = useCallback(async () => {
    if (!classId || !role || !TEACHING_ROLES.has(role)) return;
    setLoading(true);
    setPageError('');

    const classPromise = supabase
      .from('classes')
      .select('id,program_id,code,name,status,starts_on,ends_on,teacher_id')
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
      setPageError('Laporan belum dapat dimuat.');
      setLoading(false);
      return;
    }

    if (ownClassesResult.error) {
      console.error('KOJAC teaching report own classes failed', ownClassesResult.error);
      setPageError('Laporan belum dapat dimuat.');
      setLoading(false);
      return;
    }

    if (reportsResult.error) {
      console.error('KOJAC teaching reports load failed', reportsResult.error);
      setPageError('Laporan belum dapat dimuat.');
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
      teacher_id: string | null;
    };

    const ownRows = (ownClassesResult.data ?? []) as TeachingClassRow[];
    const ownContext = ownRows.find((row) => row.class_id === classId) ?? null;
    let programCode: string | null = ownContext?.program_code ?? null;
    let programName: string | null = ownContext?.program_name ?? null;
    let primaryTeacherName: string | null = ownContext?.primary_teacher_name ?? null;

    if (!primaryTeacherName && MANAGEMENT_ROLES.has(role)) {
      const { data: overviewData, error: overviewError } = await supabase.rpc('get_management_classes_overview');
      if (!overviewError) {
        const managementClass = ((overviewData ?? []) as Array<{
          class_id: string;
          primary_teacher_id: string | null;
          primary_teacher_name: string | null;
        }>).find((row) => row.class_id === classId);
        if (managementClass?.primary_teacher_id === classRow.teacher_id) {
          primaryTeacherName = managementClass.primary_teacher_name;
        }
      }
    }
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
      primary_teacher_name: primaryTeacherName || 'Belum ditentukan',
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
  const classTeacherName = classContext?.primary_teacher_name || 'Belum ditentukan';
  const durationPreview = form.starts_at && form.ends_at ? durationText(form.starts_at, form.ends_at) : '—';

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canTeach || !classId) return <Navigate to="/" replace />;

  function updateFormField<K extends keyof ReportForm>(field: K, value: ReportForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field] && !((field === 'starts_at' || field === 'ends_at') && current.time)) return current;
      const next = { ...current };
      delete next[field];
      if (field === 'starts_at' || field === 'ends_at') delete next.time;
      return next;
    });
    if (formMessageTone === 'error' && formMessage) setFormMessage('');
  }

  function resetForm() {
    setEditingReport(null);
    setForm(emptyReportForm());
    setFieldErrors({});
    setFormMessage('');
    setFormMessageTone('error');
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
    setFieldErrors({});
    setFormMessage('');
    setFormMessageTone('error');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateForm() {
    const errors: ReportFieldErrors = {};
    if (!form.report_date) errors.report_date = 'Tanggal mengajar wajib diisi.';
    else if (form.report_date > localToday()) errors.report_date = 'Tanggal laporan tidak boleh melebihi hari ini.';

    if (!form.starts_at) errors.starts_at = 'Jam mulai wajib diisi.';
    if (!form.ends_at) errors.ends_at = 'Jam selesai wajib diisi.';
    if (form.starts_at && form.ends_at) {
      const start = minutesFromTime(form.starts_at);
      const end = minutesFromTime(form.ends_at);
      if (start === null || end === null || end <= start) errors.time = 'Waktu selesai harus setelah waktu mulai.';
    }

    if (!form.material_summary.trim()) errors.material_summary = 'Materi yang diajarkan wajib diisi.';
    if (!form.assignment_summary.trim()) errors.assignment_summary = 'Tugas / latihan wajib diisi.';
    if (!form.next_plan.trim()) errors.next_plan = 'Rencana pertemuan berikutnya wajib diisi.';

    setFieldErrors(errors);
    return Object.values(errors)[0] ?? '';
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    if (saving || !classId) return;
    const validation = validateForm();
    if (validation) {
      setFormMessage(validation);
      setFormMessageTone('error');
      return;
    }

    setSaving(true);
    setFormMessage('');
    setFormMessageTone('error');

    const args = {
      p_report_date: form.report_date,
      p_starts_at: form.starts_at,
      p_ends_at: form.ends_at,
      p_material_summary: form.material_summary.trim(),
      p_assignment_summary: form.assignment_summary.trim(),
      p_next_plan: form.next_plan.trim(),
      p_evaluation_notes: form.evaluation_notes.trim() || null,
    };

    const wasEditing = Boolean(editingReport);
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
      setFormMessageTone('error');
      setSaving(false);
      return;
    }

    setEditingReport(null);
    setForm(emptyReportForm());
    setFieldErrors({});
    setFormMessage(wasEditing ? 'Perubahan laporan berhasil disimpan.' : 'Laporan berhasil disimpan.');
    setFormMessageTone('success');
    await loadPage();
    setSaving(false);
  }

  function toggleReport(reportId: string) {
    setExpandedReportIds((current) => {
      const next = new Set(current);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  }

  const showForm = editingReport !== null || canCreateForCurrentClass;

  return (
    <div className="page class-experience-page teaching-report-page">
      <div className="class-page-header teaching-report-page-header">
        <div className="class-page-header-copy">
          <p className="eyebrow">PENGAJAR KOJAC</p>
          <h1 className="title-icon"><FileText/>Laporan Mengajar</h1>
          <p>Catat materi, tugas, evaluasi, dan rencana pembelajaran setelah kelas selesai.</p>
        </div>
        <Link className="class-action-secondary teaching-report-back" to="/kelas-mengajar">
          <ArrowLeft size={16}/> Kelas Mengajar
        </Link>
      </div>

      {loading ? (
        <ReportPageSkeleton/>
      ) : pageError ? (
        <div className="class-state-card teaching-report-error" role="alert">
          <div className="class-state-icon"><AlertTriangle size={28}/></div>
          <h2>Laporan belum dapat dimuat.</h2>
          <p>Silakan coba lagi. Detail teknis tidak ditampilkan di halaman ini.</p>
          <button className="class-action-secondary" type="button" onClick={() => void loadPage()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </div>
      ) : classContext ? (
        <>
          <section className="teaching-report-context-card" aria-label="Ringkasan kelas">
            <div className="teaching-report-context-heading">
              <div>
                <p className="class-card-program">{classContext.program_name || 'PROGRAM KOJAC'}</p>
                <h2>{classContext.name}</h2>
                <span className="class-code-badge">{classContext.code || 'Tanpa kode kelas'}</span>
              </div>
              <span className={`class-status-badge is-${classContext.status}`}>{classLabels[classContext.status]}</span>
            </div>
            <div className="teaching-report-context-grid">
              <div>
                <span><UserRound size={15}/>Pengajar Utama</span>
                <strong>{classTeacherName}</strong>
              </div>
              <div>
                <span><CalendarDays size={15}/>Periode</span>
                <strong>{formatPeriod(classContext.starts_on, classContext.ends_on)}</strong>
              </div>
              <div>
                <span><School size={15}/>Status</span>
                <strong>{classLabels[classContext.status]}</strong>
              </div>
            </div>
          </section>

          {showForm ? (
            <section className="teaching-report-form-shell" aria-labelledby="teaching-report-form-title">
              <div className="teaching-report-form-header">
                <div>
                  <p className="eyebrow">{editingReport ? 'EDIT LAPORAN' : 'LAPORAN PERTEMUAN'}</p>
                  <h2 id="teaching-report-form-title">{editingReport ? 'Edit Laporan' : 'Buat Laporan Mengajar'}</h2>
                  <p>{editingReport ? 'Perbarui catatan pertemuan tanpa menghapus riwayat laporan.' : 'Isi laporan singkat setelah kegiatan belajar mengajar selesai.'}</p>
                </div>
                {editingReport && (
                  <button className="class-action-secondary" type="button" disabled={saving} onClick={resetForm}>
                    Batal Edit
                  </button>
                )}
              </div>

              <form className="teaching-report-form" onSubmit={submitReport} noValidate>
                <section className="teaching-report-form-section">
                  <div className="teaching-report-form-section-heading">
                    <span className="teaching-report-section-icon"><CalendarDays size={18}/></span>
                    <div><h3>Informasi Pertemuan</h3><p>Waktu dan konteks pertemuan yang telah dilaksanakan.</p></div>
                  </div>

                  <div className="teaching-report-form-grid two-columns">
                    <div className="teaching-report-field">
                      <label htmlFor="report-teacher">Pengajar</label>
                      <input id="report-teacher" value={editingReport?.teacher_name || teacherDisplayName} readOnly />
                    </div>
                    <div className="teaching-report-field">
                      <label htmlFor="report-date">Tanggal Mengajar</label>
                      <input
                        id="report-date"
                        type="date"
                        max={localToday()}
                        value={form.report_date}
                        disabled={saving}
                        aria-invalid={Boolean(fieldErrors.report_date)}
                        aria-describedby={fieldErrors.report_date ? 'report-date-error' : undefined}
                        onChange={(event) => updateFormField('report_date', event.target.value)}
                        required
                      />
                      {fieldErrors.report_date && <span id="report-date-error" className="teaching-report-field-error">{fieldErrors.report_date}</span>}
                    </div>
                  </div>

                  <div className="teaching-report-field">
                    <label htmlFor="report-class">Kelas</label>
                    {editingReport ? (
                      <input id="report-class" value={`${classContext.program_name || 'Program KOJAC'} — ${classContext.name}`} readOnly />
                    ) : (
                      <select id="report-class" value={classId} disabled={saving} onChange={(event) => navigate(`/kelas-mengajar/${event.target.value}/laporan`)}>
                        {ownActiveClasses.map((row) => (
                          <option key={row.class_id} value={row.class_id}>{row.program_name || 'Program KOJAC'} — {row.class_name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="teaching-report-form-grid time-grid">
                    <div className="teaching-report-field">
                      <label htmlFor="report-start">Jam Mulai</label>
                      <input
                        id="report-start"
                        type="time"
                        value={form.starts_at}
                        disabled={saving}
                        aria-invalid={Boolean(fieldErrors.starts_at || fieldErrors.time)}
                        onChange={(event) => updateFormField('starts_at', event.target.value)}
                        required
                      />
                      {fieldErrors.starts_at && <span className="teaching-report-field-error">{fieldErrors.starts_at}</span>}
                    </div>
                    <div className="teaching-report-field">
                      <label htmlFor="report-end">Jam Selesai</label>
                      <input
                        id="report-end"
                        type="time"
                        value={form.ends_at}
                        disabled={saving}
                        aria-invalid={Boolean(fieldErrors.ends_at || fieldErrors.time)}
                        aria-describedby={fieldErrors.time ? 'report-time-error' : undefined}
                        onChange={(event) => updateFormField('ends_at', event.target.value)}
                        required
                      />
                      {fieldErrors.ends_at && <span className="teaching-report-field-error">{fieldErrors.ends_at}</span>}
                      {fieldErrors.time && <span id="report-time-error" className="teaching-report-field-error">{fieldErrors.time}</span>}
                    </div>
                    <div className="teaching-report-duration" aria-live="polite">
                      <Clock3 size={18}/><div><span>Durasi</span><strong>{durationPreview}</strong></div>
                    </div>
                  </div>
                </section>

                <section className="teaching-report-form-section">
                  <div className="teaching-report-form-section-heading">
                    <span className="teaching-report-section-icon"><BookOpenCheck size={18}/></span>
                    <div><h3>Pembelajaran</h3><p>Catat materi, tugas, dan arah pembelajaran berikutnya.</p></div>
                  </div>

                  <div className="teaching-report-field">
                    <label htmlFor="report-material">Materi yang Diajarkan</label>
                    <textarea
                      id="report-material"
                      rows={5}
                      maxLength={10000}
                      value={form.material_summary}
                      disabled={saving}
                      aria-invalid={Boolean(fieldErrors.material_summary)}
                      aria-describedby={fieldErrors.material_summary ? 'report-material-error' : 'report-material-help'}
                      onChange={(event) => updateFormField('material_summary', event.target.value)}
                      required
                    />
                    <span id="report-material-help" className="teaching-report-helper">Contoh: Bab 10 pola ～てもいいです, kosakata aktivitas sehari-hari.</span>
                    {fieldErrors.material_summary && <span id="report-material-error" className="teaching-report-field-error">{fieldErrors.material_summary}</span>}
                  </div>

                  <div className="teaching-report-field">
                    <label htmlFor="report-assignment">Tugas / Latihan</label>
                    <textarea
                      id="report-assignment"
                      rows={4}
                      maxLength={10000}
                      value={form.assignment_summary}
                      disabled={saving}
                      aria-invalid={Boolean(fieldErrors.assignment_summary)}
                      onChange={(event) => updateFormField('assignment_summary', event.target.value)}
                      required
                    />
                    <span className="teaching-report-helper">Contoh: kerjakan latihan Bab 10 dan hafalkan 20 kosakata.</span>
                    {fieldErrors.assignment_summary && <span className="teaching-report-field-error">{fieldErrors.assignment_summary}</span>}
                  </div>

                  <div className="teaching-report-field">
                    <label htmlFor="report-next-plan">Rencana Pertemuan Berikutnya</label>
                    <textarea
                      id="report-next-plan"
                      rows={4}
                      maxLength={10000}
                      value={form.next_plan}
                      disabled={saving}
                      aria-invalid={Boolean(fieldErrors.next_plan)}
                      onChange={(event) => updateFormField('next_plan', event.target.value)}
                      required
                    />
                    <span className="teaching-report-helper">Contoh: lanjut Bab 11 dan latihan percakapan.</span>
                    {fieldErrors.next_plan && <span className="teaching-report-field-error">{fieldErrors.next_plan}</span>}
                  </div>
                </section>

                <section className="teaching-report-form-section">
                  <div className="teaching-report-form-section-heading">
                    <span className="teaching-report-section-icon"><FileText size={18}/></span>
                    <div><h3>Evaluasi</h3><p>Catatan tambahan untuk perkembangan dan tindak lanjut pembelajaran.</p></div>
                  </div>
                  <div className="teaching-report-field">
                    <label htmlFor="report-evaluation">Evaluasi / Catatan Tambahan <span className="teaching-report-optional">Opsional</span></label>
                    <textarea
                      id="report-evaluation"
                      rows={4}
                      maxLength={10000}
                      value={form.evaluation_notes}
                      disabled={saving}
                      onChange={(event) => updateFormField('evaluation_notes', event.target.value)}
                    />
                    <span className="teaching-report-helper">Catatan perkembangan siswa, kendala belajar, atau hal penting lainnya. Contoh: beberapa siswa masih perlu latihan membaca dan kosakata.</span>
                  </div>
                </section>

                {formMessage && (
                  <div className={`teaching-report-notice is-${formMessageTone}`} role={formMessageTone === 'error' ? 'alert' : 'status'}>
                    {formMessage}
                  </div>
                )}

                <div className="teaching-report-form-actions">
                  {editingReport && (
                    <button className="class-action-secondary" type="button" disabled={saving} onClick={resetForm}>
                      Batal Edit
                    </button>
                  )}
                  <button className="class-action-primary teaching-report-save" type="submit" disabled={saving}>
                    <Save size={17}/> {saving ? 'Menyimpan…' : editingReport ? 'Simpan Perubahan' : 'Simpan Laporan'}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="teaching-report-readonly-note">
              <FileText size={20}/>
              <p>
                {ownCurrentClass
                  ? 'Kelas ini sudah tidak aktif. Laporan lama tetap dapat dilihat dan laporan milik Anda tetap dapat diedit.'
                  : 'Anda dapat melihat laporan kelas ini, tetapi hanya pengajar yang ditugaskan pada kelas aktif yang dapat membuat laporan.'}
              </p>
            </section>
          )}

          <section className="teaching-report-history-section">
            <div className="class-section-heading">
              <div>
                <p className="eyebrow">RIWAYAT LAPORAN</p>
                <h2>Riwayat kegiatan belajar mengajar kelas ini.</h2>
              </div>
              <span className="class-section-count">{reports.length} laporan</span>
            </div>

            {reports.length === 0 ? (
              <div className="class-state-card teaching-report-empty-state">
                <div className="class-state-icon"><FileText size={28}/></div>
                <h2>Belum ada laporan mengajar.</h2>
                <p>Laporan yang disimpan setelah mengajar akan muncul di sini.</p>
              </div>
            ) : (
              <div className="teaching-report-history-list">
                {reports.map((row) => (
                  <ReportCard
                    key={row.report_id}
                    row={row}
                    canEdit={Boolean(user && ownCurrentClass && row.teacher_id === user.id)}
                    expanded={expandedReportIds.has(row.report_id)}
                    onEdit={() => beginEdit(row)}
                    onToggle={() => toggleReport(row.report_id)}
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
