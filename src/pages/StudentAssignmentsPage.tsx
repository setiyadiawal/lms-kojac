import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  Save,
  School,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../assignment-system.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

type AssignmentStatus = 'published' | 'closed';
type SubmissionStatus = 'not_submitted' | 'submitted' | 'reviewed';

type StudentAssignmentRow = {
  assignment_id: string;
  class_id: string;
  class_name: string;
  class_code: string | null;
  title: string;
  instructions: string;
  due_at: string | null;
  assignment_status: AssignmentStatus;
  created_at: string;
  submission_status: SubmissionStatus;
  answer_text: string | null;
  submitted_at: string | null;
  is_late: boolean;
  score: number | null;
  feedback: string | null;
  reviewed_at: string | null;
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

function statusLabel(status: SubmissionStatus) {
  if (status === 'reviewed') return 'Sudah Dinilai';
  if (status === 'submitted') return 'Sudah Dikumpulkan';
  return 'Belum Dikumpulkan';
}

export function StudentAssignmentsPage() {
  const { role, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignmentRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messageById, setMessageById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAssignments = useCallback(async () => {
    if (role !== 'siswa') return;

    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_my_assignments');

    if (loadError) {
      console.error('KOJAC student assignments load failed', loadError);
      setAssignments([]);
      setError(true);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as StudentAssignmentRow[];
    setAssignments(rows);
    setAnswers(Object.fromEntries(rows.map((row) => [row.assignment_id, row.answer_text ?? ''])));
    setLoading(false);
  }, [role]);

  useEffect(() => {
    if (!authLoading && role === 'siswa') void loadAssignments();
  }, [authLoading, role, loadAssignments]);

  const summary = useMemo(() => ({
    pending: assignments.filter((row) => row.assignment_status === 'published' && row.submission_status === 'not_submitted').length,
    submitted: assignments.filter((row) => row.submission_status === 'submitted').length,
    reviewed: assignments.filter((row) => row.submission_status === 'reviewed').length,
  }), [assignments]);

  const submitAnswer = async (row: StudentAssignmentRow) => {
    const answer = (answers[row.assignment_id] ?? '').trim();
    if (!answer) {
      setMessageById((current) => ({ ...current, [row.assignment_id]: 'Jawaban tidak boleh kosong.' }));
      return;
    }

    setSavingId(row.assignment_id);
    setMessageById((current) => ({ ...current, [row.assignment_id]: '' }));

    const { error: submitError } = await supabase.rpc('submit_my_assignment', {
      p_assignment_id: row.assignment_id,
      p_answer_text: answer,
    });

    if (submitError) {
      console.error('KOJAC assignment submission failed', submitError);
      setMessageById((current) => ({
        ...current,
        [row.assignment_id]: 'Jawaban belum dapat dikirim. Silakan coba lagi.',
      }));
      setSavingId(null);
      return;
    }

    setMessageById((current) => ({
      ...current,
      [row.assignment_id]: 'Jawaban berhasil dikirim.',
    }));
    setSavingId(null);
    await loadAssignments();
  };

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (role !== 'siswa') return <Navigate to="/" replace />;

  return (
    <div className="page assignment-page">
      <header className="assignment-page-header">
        <div>
          <p className="eyebrow">SISWA KOJAC</p>
          <h1 className="title-icon"><FileText/>Tugas Saya</h1>
          <p>Lihat tugas kelas, kirim jawaban, dan pantau nilai serta feedback pengajar.</p>
        </div>
      </header>

      <section className="assignment-summary-grid" aria-label="Ringkasan tugas">
        <div className="assignment-summary-card">
          <Clock3 size={20}/>
          <div><strong>{summary.pending}</strong><span>Belum Dikumpulkan</span></div>
        </div>
        <div className="assignment-summary-card">
          <FileText size={20}/>
          <div><strong>{summary.submitted}</strong><span>Menunggu Penilaian</span></div>
        </div>
        <div className="assignment-summary-card">
          <CheckCircle2 size={20}/>
          <div><strong>{summary.reviewed}</strong><span>Sudah Dinilai</span></div>
        </div>
      </section>

      {loading ? (
        <div className="assignment-loading-grid" aria-label="Memuat tugas">
          {[0, 1, 2].map((item) => <div key={item} className="assignment-skeleton"/>)}
        </div>
      ) : error ? (
        <section className="assignment-state-card" role="alert">
          <AlertCircle size={28}/>
          <h2>Tugas belum dapat dimuat.</h2>
          <p>Data tugas Anda tidak berubah. Silakan coba lagi.</p>
          <button className="assignment-secondary-button" type="button" onClick={() => void loadAssignments()}>
            <RefreshCw size={16}/> Coba Lagi
          </button>
        </section>
      ) : assignments.length === 0 ? (
        <section className="assignment-state-card">
          <School size={30}/>
          <h2>Belum ada tugas kelas.</h2>
          <p>Tugas yang dipublikasikan pengajar akan muncul di halaman ini.</p>
        </section>
      ) : (
        <div className="student-assignment-list">
          {assignments.map((row) => {
            const isOpen = row.assignment_status === 'published';
            const isOverdue = Boolean(row.due_at && new Date(row.due_at).getTime() < Date.now());
            const hasReview = row.submission_status === 'reviewed';

            return (
              <article className="student-assignment-card" key={row.assignment_id}>
                <div className="student-assignment-card-header">
                  <div>
                    <p className="assignment-class-name">{row.class_name}</p>
                    <h2>{row.title}</h2>
                    <div className="assignment-meta-row">
                      <span><School size={14}/>{row.class_code || 'Tanpa kode kelas'}</span>
                      <span><CalendarDays size={14}/>{formatDateTime(row.due_at)}</span>
                    </div>
                  </div>

                  <span className={`assignment-status-badge is-${row.submission_status}`}>
                    {statusLabel(row.submission_status)}
                  </span>
                </div>

                {row.instructions && (
                  <div className="assignment-instructions">
                    <strong>Instruksi</strong>
                    <p>{row.instructions}</p>
                  </div>
                )}

                {isOverdue && isOpen && (
                  <div className="assignment-notice is-warning">
                    Tenggat telah lewat. Jawaban masih dapat dikirim dan akan ditandai terlambat.
                  </div>
                )}

                {row.is_late && (
                  <div className="assignment-notice is-warning">
                    Pengumpulan terakhir tercatat terlambat.
                  </div>
                )}

                {hasReview && (
                  <div className="assignment-review-box">
                    <div>
                      <span>Nilai</span>
                      <strong>{row.score ?? '—'} / 100</strong>
                    </div>
                    <div>
                      <span>Feedback Pengajar</span>
                      <p>{row.feedback || 'Tidak ada catatan tambahan.'}</p>
                    </div>
                  </div>
                )}

                <div className="assignment-answer-field">
                  <label htmlFor={`answer-${row.assignment_id}`}>Jawaban</label>
                  <textarea
                    id={`answer-${row.assignment_id}`}
                    rows={6}
                    maxLength={20000}
                    value={answers[row.assignment_id] ?? ''}
                    disabled={!isOpen || savingId === row.assignment_id}
                    placeholder="Tulis jawaban tugas di sini…"
                    onChange={(event) => {
                      const value = event.target.value;
                      setAnswers((current) => ({ ...current, [row.assignment_id]: value }));
                      setMessageById((current) => ({ ...current, [row.assignment_id]: '' }));
                    }}
                  />
                  <div className="assignment-answer-help">
                    <span>{(answers[row.assignment_id] ?? '').length.toLocaleString('id-ID')} / 20.000 karakter</span>
                    {row.submitted_at && <span>Terakhir dikirim: {formatDateTime(row.submitted_at)}</span>}
                  </div>
                </div>

                {hasReview && isOpen && (
                  <p className="assignment-resubmit-note">
                    Jika jawaban dikirim ulang, nilai dan feedback sebelumnya akan kembali menunggu review pengajar.
                  </p>
                )}

                {messageById[row.assignment_id] && (
                  <div className="assignment-form-message" role="status">
                    {messageById[row.assignment_id]}
                  </div>
                )}

                <div className="assignment-card-actions">
                  {isOpen ? (
                    <button
                      className="assignment-primary-button"
                      type="button"
                      disabled={savingId === row.assignment_id}
                      onClick={() => void submitAnswer(row)}
                    >
                      <Save size={16}/>
                      {savingId === row.assignment_id
                        ? 'Mengirim…'
                        : row.submission_status === 'not_submitted'
                          ? 'Kirim Jawaban'
                          : 'Kirim Ulang'}
                    </button>
                  ) : (
                    <span className="assignment-closed-note">Tugas sudah ditutup oleh pengajar.</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
