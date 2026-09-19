import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileImage,
  FileText,
  RefreshCw,
  Save,
  School,
  UsersRound,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../assignment-system.css';
import {
  listAssignmentPhotos,
  type AssignmentPhoto,
} from '../features/assignments/assignmentPhotos';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type ClassStatus = 'planned' | 'active' | 'completed' | 'cancelled';
type AssignmentStatus = 'draft' | 'published' | 'closed';
type SubmissionStatus = 'not_submitted' | 'submitted' | 'reviewed';

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

type TeacherAssignmentRow = {
  assignment_id: string;
  title: string;
  instructions: string;
  due_at: string | null;
  assignment_status: AssignmentStatus;
  created_at: string;
  updated_at: string;
  student_count: number;
  submission_count: number;
  reviewed_count: number;
  late_count: number;
};

type SubmissionRow = {
  student_id: string;
  full_name: string | null;
  nickname: string | null;
  enrollment_status: string;
  submission_status: SubmissionStatus;
  answer_text: string | null;
  submitted_at: string | null;
  is_late: boolean;
  score: number | null;
  feedback: string | null;
  reviewed_at: string | null;
};

type AssignmentForm = {
  title: string;
  instructions: string;
  dueAt: string;
  status: AssignmentStatus;
};

type ReviewDraft = {
  score: string;
  feedback: string;
};

const TEACHING_ROLES = new Set<AppRole>(['pengajar', 'administrator', 'manager', 'co_founder', 'founder']);

const emptyForm: AssignmentForm = {
  title: '',
  instructions: '',
  dueAt: '',
  status: 'published',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Tanpa tenggat';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function toLocalInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function displayName(row: SubmissionRow) {
  return row.full_name?.trim() || row.nickname?.trim() || 'Siswa KOJAC';
}

export function TeacherAssignmentsPage() {
  const { role, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<TeachingClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [photosByStudent, setPhotosByStudent] = useState<Record<string, AssignmentPhoto[]>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [classError, setClassError] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState('');

  const canTeach = Boolean(role && TEACHING_ROLES.has(role));

  const loadClasses = useCallback(async () => {
    if (!role || !TEACHING_ROLES.has(role)) return;

    setLoading(true);
    setClassError(false);

    const { data, error } = await supabase.rpc('get_my_teaching_classes');

    if (error) {
      console.error('KOJAC assignment classes load failed', error);
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

  const loadAssignments = useCallback(async (classId: string) => {
    if (!classId) {
      setAssignments([]);
      return;
    }

    setAssignmentsLoading(true);
    setAssignmentsError(false);

    const { data, error } = await supabase.rpc('get_my_class_assignments', {
      p_class_id: classId,
    });

    if (error) {
      console.error('KOJAC teacher assignments load failed', error);
      setAssignments([]);
      setAssignmentsError(true);
      setAssignmentsLoading(false);
      return;
    }

    setAssignments((data ?? []) as TeacherAssignmentRow[]);
    setAssignmentsLoading(false);
  }, []);

  const loadSubmissions = useCallback(async (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setSubmissionsLoading(true);
    setSubmissionsError(false);
    setPhotosByStudent({});

    const { data, error } = await supabase.rpc('get_assignment_submissions', {
      p_assignment_id: assignmentId,
    });

    if (error) {
      console.error('KOJAC assignment submissions load failed', error);
      setSubmissions([]);
      setSubmissionsError(true);
      setSubmissionsLoading(false);
      return;
    }

    const rows = (data ?? []) as SubmissionRow[];
    setSubmissions(rows);
    setReviewDrafts(Object.fromEntries(rows.map((row) => [
      row.student_id,
      {
        score: row.score === null ? '' : String(row.score),
        feedback: row.feedback ?? '',
      },
    ])));
    setSubmissionsLoading(false);

    const submittedRows = rows.filter((row) => row.submission_status !== 'not_submitted');
    const galleries = await Promise.all(submittedRows.map(async (row) => {
      try {
        const photos = await listAssignmentPhotos(row.student_id, assignmentId);
        return [row.student_id, photos] as const;
      } catch (photoError) {
        console.error('KOJAC teacher assignment photos load failed', photoError);
        return [row.student_id, [] as AssignmentPhoto[]] as const;
      }
    }));

    setPhotosByStudent(Object.fromEntries(galleries));
  }, []);

  useEffect(() => {
    if (!authLoading && canTeach) void loadClasses();
  }, [authLoading, canTeach, loadClasses]);

  useEffect(() => {
    if (selectedClassId) {
      void loadAssignments(selectedClassId);
      setSelectedAssignmentId(null);
      setSubmissions([]);
      setPhotosByStudent({});
      setEditingId(null);
      setForm(emptyForm);
      setFormMessage('');
    }
  }, [selectedClassId, loadAssignments]);

  const summary = useMemo(() => ({
    total: assignments.length,
    published: assignments.filter((row) => row.assignment_status === 'published').length,
    submissions: assignments.reduce((sum, row) => sum + row.submission_count, 0),
    waitingReview: assignments.reduce((sum, row) => sum + Math.max(row.submission_count - row.reviewed_count, 0), 0),
  }), [assignments]);

  const startEdit = (row: TeacherAssignmentRow) => {
    setEditingId(row.assignment_id);
    setForm({
      title: row.title,
      instructions: row.instructions,
      dueAt: toLocalInput(row.due_at),
      status: row.assignment_status,
    });
    setFormMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormMessage('');
  };

  const saveAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedClassId || !form.title.trim()) {
      setFormMessage('Judul tugas wajib diisi.');
      return;
    }

    setSavingAssignment(true);
    setFormMessage('');

    const dueAt = form.dueAt ? new Date(form.dueAt).toISOString() : null;

    const result = editingId
      ? await supabase.rpc('update_class_assignment', {
          p_assignment_id: editingId,
          p_title: form.title.trim(),
          p_instructions: form.instructions,
          p_due_at: dueAt,
          p_status: form.status,
        })
      : await supabase.rpc('create_class_assignment', {
          p_class_id: selectedClassId,
          p_title: form.title.trim(),
          p_instructions: form.instructions,
          p_due_at: dueAt,
          p_status: form.status === 'closed' ? 'published' : form.status,
        });

    if (result.error) {
      console.error('KOJAC assignment save failed', result.error);
      setFormMessage('Tugas belum dapat disimpan. Silakan periksa data dan coba lagi.');
      setSavingAssignment(false);
      return;
    }

    setSavingAssignment(false);
    resetForm();
    await loadAssignments(selectedClassId);
  };

  const saveReview = async (row: SubmissionRow) => {
    const draft = reviewDrafts[row.student_id] ?? { score: '', feedback: '' };
    const score = Number(draft.score);

    if (!Number.isInteger(score) || score < 0 || score > 100) return;

    setSavingReviewId(row.student_id);

    const { error } = await supabase.rpc('review_assignment_submission', {
      p_assignment_id: selectedAssignmentId,
      p_student_id: row.student_id,
      p_score: score,
      p_feedback: draft.feedback,
    });

    if (error) {
      console.error('KOJAC assignment review save failed', error);
      setSavingReviewId(null);
      return;
    }

    setSavingReviewId(null);
    if (selectedAssignmentId) await loadSubmissions(selectedAssignmentId);
    if (selectedClassId) await loadAssignments(selectedClassId);
  };

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canTeach) return <Navigate to="/" replace />;

  return (
    <div className="page assignment-page">
      <header className="assignment-page-header">
        <div>
          <p className="eyebrow">PENGAJAR KOJAC</p>
          <h1 className="title-icon"><FileText/>Tugas Kelas</h1>
          <p>Buat tugas, pantau jawaban teks dan foto, lalu berikan nilai serta feedback kepada siswa dalam scope kelas Anda.</p>
        </div>
      </header>

      {loading ? (
        <div className="assignment-loading-grid">
          {[0, 1].map((item) => <div key={item} className="assignment-skeleton"/>)}
        </div>
      ) : classError ? (
        <section className="assignment-state-card" role="alert">
          <AlertCircle size={28}/>
          <h2>Kelas mengajar belum dapat dimuat.</h2>
          <button className="assignment-secondary-button" type="button" onClick={() => void loadClasses()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </section>
      ) : classes.length === 0 ? (
        <section className="assignment-state-card">
          <School size={30}/>
          <h2>Belum ada kelas yang ditugaskan.</h2>
        </section>
      ) : (
        <>
          <section className="teacher-assignment-class-picker panel">
            <label htmlFor="assignment-class">Kelas</label>
            <select
              id="assignment-class"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
            >
              {classes.map((row) => (
                <option key={row.class_id} value={row.class_id}>
                  {row.program_name || 'Program KOJAC'} — {row.class_name}
                </option>
              ))}
            </select>
          </section>

          <section className="assignment-summary-grid teacher">
            <div className="assignment-summary-card">
              <FileText size={20}/><div><strong>{summary.total}</strong><span>Total Tugas</span></div>
            </div>
            <div className="assignment-summary-card">
              <CalendarDays size={20}/><div><strong>{summary.published}</strong><span>Sedang Dibuka</span></div>
            </div>
            <div className="assignment-summary-card">
              <UsersRound size={20}/><div><strong>{summary.submissions}</strong><span>Pengumpulan</span></div>
            </div>
            <div className="assignment-summary-card">
              <Clock3 size={20}/><div><strong>{summary.waitingReview}</strong><span>Menunggu Review</span></div>
            </div>
          </section>

          <section className="teacher-assignment-form panel">
            <div className="assignment-section-heading">
              <div>
                <p className="eyebrow">{editingId ? 'EDIT TUGAS' : 'TUGAS BARU'}</p>
                <h2>{editingId ? 'Perbarui Tugas' : 'Buat Tugas Kelas'}</h2>
              </div>
              {editingId && (
                <button className="assignment-secondary-button" type="button" onClick={resetForm}>
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={saveAssignment}>
              <div className="assignment-form-field">
                <label htmlFor="assignment-title">Judul Tugas</label>
                <input
                  id="assignment-title"
                  maxLength={160}
                  value={form.title}
                  disabled={savingAssignment}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
              </div>

              <div className="assignment-form-field">
                <label htmlFor="assignment-instructions">Instruksi</label>
                <textarea
                  id="assignment-instructions"
                  rows={5}
                  maxLength={10000}
                  value={form.instructions}
                  disabled={savingAssignment}
                  onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))}
                />
              </div>

              <div className="teacher-assignment-form-grid">
                <div className="assignment-form-field">
                  <label htmlFor="assignment-due">Tenggat</label>
                  <input
                    id="assignment-due"
                    type="datetime-local"
                    value={form.dueAt}
                    disabled={savingAssignment}
                    onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
                  />
                </div>

                <div className="assignment-form-field">
                  <label htmlFor="assignment-status">Status</label>
                  <select
                    id="assignment-status"
                    value={form.status}
                    disabled={savingAssignment}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      status: event.target.value as AssignmentStatus,
                    }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Publikasikan</option>
                    {editingId && <option value="closed">Tutup Tugas</option>}
                  </select>
                </div>
              </div>

              {formMessage && <div className="assignment-form-message" role="status">{formMessage}</div>}

              <div className="assignment-form-actions">
                <button className="assignment-primary-button" type="submit" disabled={savingAssignment}>
                  <Save size={16}/>{savingAssignment ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Buat Tugas'}
                </button>
              </div>
            </form>
          </section>

          <section className="teacher-assignment-list-section">
            <div className="assignment-section-heading">
              <div>
                <p className="eyebrow">DAFTAR TUGAS</p>
                <h2>Tugas pada kelas ini</h2>
              </div>
              <span>{assignmentsLoading ? 'Memuat…' : `${assignments.length} tugas`}</span>
            </div>

            {assignmentsLoading ? (
              <div className="assignment-loading-grid">
                {[0, 1].map((item) => <div key={item} className="assignment-skeleton"/>)}
              </div>
            ) : assignmentsError ? (
              <div className="assignment-state-card" role="alert">
                <AlertCircle size={26}/>
                <h2>Daftar tugas belum dapat dimuat.</h2>
                <button className="assignment-secondary-button" type="button" onClick={() => void loadAssignments(selectedClassId)}>
                  <RefreshCw size={16}/> Coba Lagi
                </button>
              </div>
            ) : assignments.length === 0 ? (
              <div className="assignment-state-card">
                <FileText size={28}/>
                <h2>Belum ada tugas pada kelas ini.</h2>
              </div>
            ) : (
              <div className="teacher-assignment-grid">
                {assignments.map((row) => (
                  <article className="teacher-assignment-card" key={row.assignment_id}>
                    <div className="teacher-assignment-card-header">
                      <div>
                        <span className={`assignment-publish-badge is-${row.assignment_status}`}>
                          {row.assignment_status === 'draft'
                            ? 'Draft'
                            : row.assignment_status === 'published'
                              ? 'Dibuka'
                              : 'Ditutup'}
                        </span>
                        <h3>{row.title}</h3>
                      </div>
                      <span className="assignment-due-label">
                        <CalendarDays size={14}/>{formatDateTime(row.due_at)}
                      </span>
                    </div>

                    {row.instructions && <p className="teacher-assignment-instructions">{row.instructions}</p>}

                    <div className="teacher-assignment-metrics">
                      <span><UsersRound size={14}/><strong>{row.submission_count}/{row.student_count}</strong> mengumpulkan</span>
                      <span><CheckCircle2 size={14}/><strong>{row.reviewed_count}</strong> dinilai</span>
                      <span><Clock3 size={14}/><strong>{row.late_count}</strong> terlambat</span>
                    </div>

                    <div className="assignment-card-actions">
                      <button className="assignment-secondary-button" type="button" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      <button className="assignment-primary-button" type="button" onClick={() => void loadSubmissions(row.assignment_id)}>
                        <UsersRound size={16}/> Pengumpulan
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {selectedAssignmentId && (
            <section className="teacher-submissions-section panel">
              <div className="assignment-section-heading">
                <div>
                  <p className="eyebrow">PENGUMPULAN SISWA</p>
                  <h2>Review Jawaban</h2>
                </div>
                <button
                  className="assignment-secondary-button"
                  type="button"
                  onClick={() => {
                    setSelectedAssignmentId(null);
                    setSubmissions([]);
                    setPhotosByStudent({});
                  }}
                >
                  Tutup
                </button>
              </div>

              {submissionsLoading ? (
                <div className="assignment-loading-grid">
                  {[0, 1].map((item) => <div key={item} className="assignment-skeleton"/>)}
                </div>
              ) : submissionsError ? (
                <div className="assignment-state-card" role="alert">
                  <AlertCircle size={26}/>
                  <h2>Pengumpulan belum dapat dimuat.</h2>
                </div>
              ) : (
                <div className="teacher-submission-list">
                  {submissions.map((row) => {
                    const draft = reviewDrafts[row.student_id] ?? { score: '', feedback: '' };
                    const canReview = row.submission_status !== 'not_submitted';
                    const photos = photosByStudent[row.student_id] ?? [];

                    return (
                      <article className="teacher-submission-card" key={row.student_id}>
                        <div className="teacher-submission-header">
                          <div>
                            <h3>{displayName(row)}</h3>
                            <span>{row.enrollment_status}</span>
                          </div>
                          <span className={`assignment-status-badge is-${row.submission_status}`}>
                            {row.submission_status === 'not_submitted'
                              ? 'Belum Mengumpulkan'
                              : row.submission_status === 'reviewed'
                                ? 'Sudah Dinilai'
                                : 'Sudah Mengumpulkan'}
                          </span>
                        </div>

                        {canReview ? (
                          <>
                            <div className="teacher-submission-answer">
                              <span>Jawaban Siswa</span>
                              <p>{row.answer_text?.trim() || 'Jawaban dikumpulkan dalam bentuk foto.'}</p>
                              <small>
                                {formatDateTime(row.submitted_at)}
                                {row.is_late ? ' · Terlambat' : ''}
                              </small>
                            </div>

                            {photos.length > 0 && (
                              <div className="teacher-submission-photos">
                                <div className="teacher-submission-photo-title">
                                  <FileImage size={15}/>
                                  <strong>Foto Jawaban ({photos.length})</strong>
                                </div>
                                <div className="assignment-photo-grid teacher-view">
                                  {photos.map((photo, index) => (
                                    <div className="assignment-photo-card" key={photo.path}>
                                      <a
                                        href={photo.signedUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={`Buka foto jawaban ${index + 1} dari ${displayName(row)}`}
                                      >
                                        <img src={photo.signedUrl} alt={`Foto jawaban ${index + 1} dari ${displayName(row)}`}/>
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="teacher-review-grid">
                              <div className="assignment-form-field">
                                <label htmlFor={`score-${row.student_id}`}>Nilai 0–100</label>
                                <input
                                  id={`score-${row.student_id}`}
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={draft.score}
                                  disabled={savingReviewId === row.student_id}
                                  onChange={(event) => setReviewDrafts((current) => ({
                                    ...current,
                                    [row.student_id]: { ...draft, score: event.target.value },
                                  }))}
                                />
                              </div>
                              <div className="assignment-form-field">
                                <label htmlFor={`feedback-${row.student_id}`}>Feedback</label>
                                <textarea
                                  id={`feedback-${row.student_id}`}
                                  rows={3}
                                  maxLength={10000}
                                  value={draft.feedback}
                                  disabled={savingReviewId === row.student_id}
                                  onChange={(event) => setReviewDrafts((current) => ({
                                    ...current,
                                    [row.student_id]: { ...draft, feedback: event.target.value },
                                  }))}
                                />
                              </div>
                            </div>

                            <div className="assignment-card-actions">
                              <button
                                className="assignment-primary-button"
                                type="button"
                                disabled={savingReviewId === row.student_id || draft.score === ''}
                                onClick={() => void saveReview(row)}
                              >
                                <Save size={16}/>
                                {savingReviewId === row.student_id ? 'Menyimpan…' : 'Simpan Nilai'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="assignment-notice">Belum ada jawaban untuk direview.</div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
