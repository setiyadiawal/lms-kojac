import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  Edit3,
  Film,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  RefreshCw,
  Save,
  School,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../class-recordings.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type StudentRecordingRow = {
  recording_id: string;
  class_id: string;
  class_name: string;
  class_code: string | null;
  title: string;
  description: string;
  drive_file_id: string;
  recorded_at: string;
  duration_minutes: number | null;
};

type TeacherRecordingRow = StudentRecordingRow & {
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type TeachingClassRow = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: 'planned' | 'active' | 'completed' | 'cancelled';
  program_name: string | null;
};

type RecordingForm = {
  title: string;
  description: string;
  driveLink: string;
  recordedAt: string;
  duration: string;
  isPublished: boolean;
};

const TEACHING_ROLES = new Set<AppRole>([
  'pengajar',
  'administrator',
  'manager',
  'co_founder',
  'founder',
]);

const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;

function localDateTimeInput(value = new Date()) {
  const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function emptyForm(): RecordingForm {
  return {
    title: '',
    description: '',
    driveLink: '',
    recordedAt: localDateTimeInput(),
    duration: '',
    isPublished: true,
  };
}

function extractDriveFileId(value: string) {
  const trimmed = value.trim();
  if (DRIVE_ID_PATTERN.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get('id');
    if (fromQuery && DRIVE_ID_PATTERN.test(fromQuery)) return fromQuery;

    const fileMatch = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
    if (fileMatch?.[1] && DRIVE_ID_PATTERN.test(fileMatch[1])) return fileMatch[1];

    const dMatch = url.pathname.match(/\/d\/([A-Za-z0-9_-]+)/);
    if (dMatch?.[1] && DRIVE_ID_PATTERN.test(dMatch[1])) return dMatch[1];
  } catch {
    return null;
  }

  return null;
}

function drivePreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

function driveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function toLocalInput(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return localDateTimeInput();
  return localDateTimeInput(date);
}

function RecordingViewer({
  row,
  onClose,
}: {
  row: StudentRecordingRow;
  onClose: () => void;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await viewer.requestFullscreen();
      }
    } catch (error) {
      console.error('KOJAC recording fullscreen failed', error);
    }
  }, []);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerRef.current);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'
        || target?.tagName === 'SELECT';

      if (event.key.toLowerCase() === 'f' && !isTyping) {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }

      if (event.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, toggleFullscreen]);

  return (
    <div
      className="class-recording-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Rekaman ${row.title}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !document.fullscreenElement) {
          onClose();
        }
      }}
    >
      <div
        ref={viewerRef}
        className={`class-recording-viewer ${isFullscreen ? 'is-fullscreen' : ''}`}
      >
        <header className="class-recording-viewer-header">
          <div className="class-recording-viewer-heading">
            <span>{row.class_name}</span>
            <strong>{row.title}</strong>
          </div>

          <div className="class-recording-viewer-header-actions">
            <button
              type="button"
              className="class-recording-viewer-action"
              aria-label={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
              title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen (F)'}
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? <Minimize2 size={19}/> : <Maximize2 size={19}/>}
              <span>{isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}</span>
            </button>

            <button
              type="button"
              className="class-recording-viewer-close"
              aria-label="Tutup rekaman"
              title="Tutup (Esc)"
              onClick={onClose}
            >
              <X size={20}/>
            </button>
          </div>
        </header>

        <div className="class-recording-viewer-stage">
          <div className="class-recording-video-shell">
            <iframe
              src={drivePreviewUrl(row.drive_file_id)}
              title={row.title}
              loading="eager"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
            <div
              className="class-recording-drive-popout-mask"
              aria-hidden="true"
            />
          </div>
        </div>

        <footer className="class-recording-viewer-footer">
          <div className="class-recording-viewer-meta">
            <span><CalendarDays size={15}/>{formatDateTime(row.recorded_at)}</span>
            {row.duration_minutes && (
              <span><Clock3 size={15}/>{row.duration_minutes} menit</span>
            )}
          </div>

          <div className="class-recording-viewer-shortcuts" aria-hidden="true">
            <span><kbd>F</kbd> Fullscreen</span>
            <span><kbd>Esc</kbd> Tutup</span>
          </div>
        </footer>

        {row.description && (
          <div className="class-recording-viewer-description">
            <strong>Materi</strong>
            <p>{row.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ClassRecordingsPage() {
  const { role, loading: authLoading } = useAuth();
  const canTeach = Boolean(role && TEACHING_ROLES.has(role));

  const [studentRows, setStudentRows] = useState<StudentRecordingRow[]>([]);
  const [teacherRows, setTeacherRows] = useState<TeacherRecordingRow[]>([]);
  const [teachingClasses, setTeachingClasses] = useState<TeachingClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [viewer, setViewer] = useState<StudentRecordingRow | null>(null);

  const [form, setForm] = useState<RecordingForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const loadStudentRecordings = useCallback(async () => {
    if (role !== 'siswa') return;

    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_my_class_recordings');

    if (loadError) {
      console.error('KOJAC class recordings load failed', loadError);
      setStudentRows([]);
      setError(true);
    } else {
      setStudentRows((data ?? []) as StudentRecordingRow[]);
    }

    setLoading(false);
  }, [role]);

  const loadTeachingClasses = useCallback(async () => {
    if (!canTeach) return;

    setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_my_teaching_classes');

    if (loadError) {
      console.error('KOJAC teaching classes for recordings failed', loadError);
      setTeachingClasses([]);
      setError(true);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as TeachingClassRow[];
    setTeachingClasses(rows);
    setSelectedClassId((current) => {
      if (current && rows.some((row) => row.class_id === current)) return current;
      return rows.find((row) => row.class_status === 'active')?.class_id
        ?? rows[0]?.class_id
        ?? '';
    });
    setLoading(false);
  }, [canTeach]);

  const loadTeacherRecordings = useCallback(async (classId: string) => {
    if (!classId || !canTeach) {
      setTeacherRows([]);
      return;
    }

    setRecordingsLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_teaching_class_recordings', {
      p_class_id: classId,
    });

    if (loadError) {
      console.error('KOJAC teaching recordings load failed', loadError);
      setTeacherRows([]);
      setError(true);
    } else {
      setTeacherRows((data ?? []) as TeacherRecordingRow[]);
    }

    setRecordingsLoading(false);
  }, [canTeach]);

  useEffect(() => {
    if (authLoading) return;
    if (role === 'siswa') void loadStudentRecordings();
    else if (canTeach) void loadTeachingClasses();
  }, [authLoading, role, canTeach, loadStudentRecordings, loadTeachingClasses]);

  useEffect(() => {
    if (canTeach && selectedClassId) {
      void loadTeacherRecordings(selectedClassId);
      setEditingId(null);
      setForm(emptyForm());
      setFormMessage('');
    }
  }, [canTeach, selectedClassId, loadTeacherRecordings]);

  const studentClasses = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; code: string | null }>();

    studentRows.forEach((row) => {
      if (!unique.has(row.class_id)) {
        unique.set(row.class_id, {
          id: row.class_id,
          name: row.class_name,
          code: row.class_code,
        });
      }
    });

    return [...unique.values()];
  }, [studentRows]);

  const visibleStudentRows = useMemo(
    () => studentClassFilter === 'all'
      ? studentRows
      : studentRows.filter((row) => row.class_id === studentClassFilter),
    [studentRows, studentClassFilter],
  );

  const startEdit = (row: TeacherRecordingRow) => {
    setEditingId(row.recording_id);
    setForm({
      title: row.title,
      description: row.description,
      driveLink: driveViewUrl(row.drive_file_id),
      recordedAt: toLocalInput(row.recorded_at),
      duration: row.duration_minutes ? String(row.duration_minutes) : '',
      isPublished: row.is_published,
    });
    setFormMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormMessage('');
  };

  const saveRecording = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const fileId = extractDriveFileId(form.driveLink);
    if (!selectedClassId) {
      setFormMessage('Pilih kelas terlebih dahulu.');
      return;
    }
    if (!form.title.trim()) {
      setFormMessage('Judul rekaman wajib diisi.');
      return;
    }
    if (!fileId) {
      setFormMessage('Link Google Drive atau File ID tidak valid.');
      return;
    }

    const recordedAt = new Date(form.recordedAt);
    if (!Number.isFinite(recordedAt.getTime())) {
      setFormMessage('Tanggal rekaman tidak valid.');
      return;
    }

    const duration = form.duration.trim() ? Number(form.duration) : null;
    if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1440)) {
      setFormMessage('Durasi harus 1–1440 menit.');
      return;
    }

    setSaving(true);
    setFormMessage('');

    const result = editingId
      ? await supabase.rpc('update_class_recording', {
          p_recording_id: editingId,
          p_title: form.title.trim(),
          p_description: form.description,
          p_drive_file_id: fileId,
          p_recorded_at: recordedAt.toISOString(),
          p_duration_minutes: duration,
          p_is_published: form.isPublished,
        })
      : await supabase.rpc('create_class_recording', {
          p_class_id: selectedClassId,
          p_title: form.title.trim(),
          p_description: form.description,
          p_drive_file_id: fileId,
          p_recorded_at: recordedAt.toISOString(),
          p_duration_minutes: duration,
          p_is_published: form.isPublished,
        });

    if (result.error) {
      console.error('KOJAC save class recording failed', result.error);
      setFormMessage('Rekaman belum dapat disimpan. Periksa data lalu coba lagi.');
      setSaving(false);
      return;
    }

    setSaving(false);
    resetForm();
    await loadTeacherRecordings(selectedClassId);
  };

  const deleteRecording = async (row: TeacherRecordingRow) => {
    const confirmed = window.confirm(
      `Hapus "${row.title}" dari daftar Rekaman Kelas?\n\nFile asli di Google Drive tidak akan dihapus.`,
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase.rpc('delete_class_recording', {
      p_recording_id: row.recording_id,
    });

    if (deleteError) {
      console.error('KOJAC delete class recording failed', deleteError);
      return;
    }

    if (editingId === row.recording_id) resetForm();
    await loadTeacherRecordings(selectedClassId);
  };

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;

  if (role !== 'siswa' && !canTeach) {
    return <Navigate to="/" replace />;
  }

  const activeRows: StudentRecordingRow[] = role === 'siswa'
    ? visibleStudentRows
    : teacherRows;

  return (
    <div className="page class-recordings-page">
      <header className="class-recordings-header">
        <div>
          <p className="eyebrow">KOJAC LMS</p>
          <h1 className="title-icon"><Video/>Rekaman Kelas</h1>
          <p>
            {role === 'siswa'
              ? 'Tonton kembali rekaman kelas KOJAC yang tersedia untuk kelas Anda.'
              : 'Kelola dan publikasikan rekaman Google Drive untuk siswa pada kelas Anda.'}
          </p>
        </div>
      </header>

      {role === 'siswa' ? (
        studentClasses.length > 1 && (
          <section className="class-recording-filter panel">
            <label htmlFor="recording-class-filter">Kelas</label>
            <select
              id="recording-class-filter"
              value={studentClassFilter}
              onChange={(event) => setStudentClassFilter(event.target.value)}
            >
              <option value="all">Semua Kelas</option>
              {studentClasses.map((row) => (
                <option value={row.id} key={row.id}>
                  {row.name}{row.code ? ` — ${row.code}` : ''}
                </option>
              ))}
            </select>
          </section>
        )
      ) : (
        <>
          <section className="class-recording-filter panel">
            <label htmlFor="teacher-recording-class">Kelas</label>
            <select
              id="teacher-recording-class"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
            >
              {teachingClasses.map((row) => (
                <option value={row.class_id} key={row.class_id}>
                  {row.program_name || 'Program KOJAC'} — {row.class_name}
                </option>
              ))}
            </select>
          </section>

          {selectedClassId && (
            <section className="class-recording-form panel">
              <div className="class-recording-section-heading">
                <div>
                  <p className="eyebrow">{editingId ? 'EDIT REKAMAN' : 'REKAMAN BARU'}</p>
                  <h2>{editingId ? 'Perbarui Rekaman' : 'Tambahkan Rekaman Google Drive'}</h2>
                </div>
                {editingId && (
                  <button className="class-recording-secondary" type="button" onClick={resetForm}>
                    Batal Edit
                  </button>
                )}
              </div>

              <form onSubmit={saveRecording}>
                <div className="class-recording-form-grid">
                  <label>
                    Judul Rekaman
                    <input
                      maxLength={160}
                      value={form.title}
                      disabled={saving}
                      placeholder="Contoh: Bab 12 — Bentuk て"
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))}
                    />
                  </label>

                  <label>
                    Tanggal & Jam Kelas
                    <input
                      type="datetime-local"
                      value={form.recordedAt}
                      disabled={saving}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        recordedAt: event.target.value,
                      }))}
                    />
                  </label>

                  <label className="is-wide">
                    Link Google Drive / File ID
                    <input
                      value={form.driveLink}
                      disabled={saving}
                      placeholder="https://drive.google.com/file/d/.../view"
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        driveLink: event.target.value,
                      }))}
                    />
                  </label>

                  <label>
                    Durasi (menit)
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={form.duration}
                      disabled={saving}
                      placeholder="120"
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        duration: event.target.value,
                      }))}
                    />
                  </label>

                  <label className="class-recording-publish-toggle">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      disabled={saving}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        isPublished: event.target.checked,
                      }))}
                    />
                    <span>
                      <strong>Publikasikan ke siswa</strong>
                      <small>Matikan jika rekaman belum siap ditonton.</small>
                    </span>
                  </label>

                  <label className="is-wide">
                    Deskripsi
                    <textarea
                      rows={4}
                      maxLength={5000}
                      value={form.description}
                      disabled={saving}
                      placeholder="Ringkasan materi pada pertemuan ini…"
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))}
                    />
                  </label>
                </div>

                {formMessage && (
                  <div className="class-recording-form-message" role="status">
                    {formMessage}
                  </div>
                )}

                <div className="class-recording-form-actions">
                  <button className="class-recording-primary" type="submit" disabled={saving}>
                    {editingId ? <Save size={16}/> : <Plus size={16}/>}
                    {saving
                      ? 'Menyimpan…'
                      : editingId
                        ? 'Simpan Perubahan'
                        : 'Tambah Rekaman'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}

      {loading || recordingsLoading ? (
        <div className="class-recording-loading-grid" aria-label="Memuat rekaman">
          {[0, 1, 2].map((item) => <div className="class-recording-skeleton" key={item}/>)}
        </div>
      ) : error ? (
        <section className="class-recording-state" role="alert">
          <AlertCircle size={30}/>
          <h2>Rekaman belum dapat dimuat.</h2>
          <p>Silakan coba lagi.</p>
          <button
            type="button"
            className="class-recording-secondary"
            onClick={() => {
              if (role === 'siswa') void loadStudentRecordings();
              else if (selectedClassId) void loadTeacherRecordings(selectedClassId);
            }}
          >
            <RefreshCw size={15}/>Coba Lagi
          </button>
        </section>
      ) : role !== 'siswa' && teachingClasses.length === 0 ? (
        <section className="class-recording-state">
          <School size={30}/>
          <h2>Belum ada kelas mengajar.</h2>
          <p>Rekaman dapat ditambahkan setelah akun Anda terhubung ke kelas.</p>
        </section>
      ) : activeRows.length === 0 ? (
        <section className="class-recording-state">
          <Film size={30}/>
          <h2>Belum ada rekaman kelas.</h2>
          <p>
            {role === 'siswa'
              ? 'Rekaman yang dipublikasikan pengajar akan muncul di sini.'
              : 'Tambahkan link video Google Drive menggunakan form di atas.'}
          </p>
        </section>
      ) : (
        <section>
          <div className="class-recording-section-heading">
            <div>
              <p className="eyebrow">DAFTAR REKAMAN</p>
              <h2>{role === 'siswa' ? 'Rekaman Tersedia' : 'Rekaman pada Kelas Ini'}</h2>
            </div>
            <span>{activeRows.length} rekaman</span>
          </div>

          <div className="class-recording-grid">
            {activeRows.map((row) => {
              const teacherRow = role === 'siswa' ? null : row as TeacherRecordingRow;

              return (
                <article className="class-recording-card" key={row.recording_id}>
                  <div className="class-recording-cover">
                    <div className="class-recording-cover-icon"><Play size={28}/></div>
                    <span>GOOGLE DRIVE</span>
                  </div>

                  <div className="class-recording-card-body">
                    <div className="class-recording-card-topline">
                      <span>{row.class_name}</span>
                      {teacherRow && (
                        <span className={`class-recording-status ${teacherRow.is_published ? 'is-published' : 'is-hidden'}`}>
                          {teacherRow.is_published ? 'Dipublikasikan' : 'Disembunyikan'}
                        </span>
                      )}
                    </div>

                    <h3>{row.title}</h3>

                    <div className="class-recording-meta">
                      <span><CalendarDays size={14}/>{formatDateTime(row.recorded_at)}</span>
                      {row.duration_minutes && (
                        <span><Clock3 size={14}/>{row.duration_minutes} menit</span>
                      )}
                    </div>

                    {row.description && <p>{row.description}</p>}

                    <div className="class-recording-actions">
                      <button
                        type="button"
                        className="class-recording-primary"
                        onClick={() => setViewer(row)}
                      >
                        <Play size={15}/>Tonton
                      </button>

                      {teacherRow && (
                        <>
                          <button
                            type="button"
                            className="class-recording-secondary"
                            onClick={() => startEdit(teacherRow)}
                          >
                            <Edit3 size={15}/>Edit
                          </button>
                          <button
                            type="button"
                            className="class-recording-danger"
                            onClick={() => void deleteRecording(teacherRow)}
                          >
                            <Trash2 size={15}/>Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {viewer && (
        <RecordingViewer row={viewer} onClose={() => setViewer(null)}/>
      )}
    </div>
  );
}
