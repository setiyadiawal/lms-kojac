import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FileVideo2,
  HardDrive,
  History,
  Link2,
  LogIn,
  Plus,
  School,
  Square,
  Upload,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../class-recording-upload.css';
import '../recording-upload-background.css';
import {
  cancelBackgroundUpload,
  clearFinishedBackgroundUpload,
  connectBackgroundGoogleDrive,
  startBackgroundRecordingUpload,
  useBackgroundRecordingUpload,
} from '../features/recordings/backgroundRecordingUpload';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

type TeachingClassRow = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: 'planned' | 'active' | 'completed' | 'cancelled';
  program_name: string | null;
};

type UploadForm = {
  title: string;
  description: string;
  recordedAt: string;
  duration: string;
  isPublished: boolean;
};

type ManualRecordingForm = {
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

function localDateTimeInput(value = new Date()) {
  const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function initialForm(): UploadForm {
  return {
    title: '',
    description: '',
    recordedAt: localDateTimeInput(),
    duration: '',
    isPublished: true,
  };
}

function initialManualForm(): ManualRecordingForm {
  return {
    title: '',
    description: '',
    driveLink: '',
    recordedAt: localDateTimeInput(),
    duration: '',
    isPublished: true,
  };
}

function bytesLabel(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index >= 2 ? 1 : 0)} ${units[index]}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

async function detectVideoDurationMinutes(file: File) {
  return new Promise<number | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      cleanup();

      if (!Number.isFinite(seconds) || seconds <= 0) {
        resolve(null);
        return;
      }

      resolve(Math.max(1, Math.round(seconds / 60)));
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.src = url;
  });
}

export function UploadClassRecordingPage() {
  const { user, role, loading: authLoading } = useAuth();
  const canTeach = Boolean(role && TEACHING_ROLES.has(role));

  const uploadState = useBackgroundRecordingUpload(user?.id);

  const [classes, setClasses] = useState<TeachingClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<UploadForm>(initialForm);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [pageError, setPageError] = useState('');
  const [pageMessage, setPageMessage] = useState('');
  const [manualForm, setManualForm] = useState<ManualRecordingForm>(initialManualForm);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualMessage, setManualMessage] = useState('');
  const handledSuccessId = useRef<string | null>(null);

  const selectedClass = useMemo(
    () => classes.find((row) => row.class_id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const loadClasses = useCallback(async () => {
    if (!canTeach) return;

    setLoadingClasses(true);
    setPageError('');

    const { data, error } = await supabase.rpc('get_my_teaching_classes');

    if (error) {
      console.error('KOJAC upload recording classes failed', error);
      setClasses([]);
      setPageError('Kelas mengajar belum dapat dimuat.');
      setLoadingClasses(false);
      return;
    }

    const rows = (data ?? []) as TeachingClassRow[];
    setClasses(rows);

    setSelectedClassId((current) => {
      if (current && rows.some((row) => row.class_id === current)) return current;

      return rows.find((row) => row.class_status === 'active')?.class_id
        ?? rows[0]?.class_id
        ?? '';
    });

    setLoadingClasses(false);
  }, [canTeach]);

  useEffect(() => {
    if (!authLoading && canTeach) void loadClasses();
  }, [authLoading, canTeach, loadClasses]);

  useEffect(() => {
    if (
      uploadState.job?.status === 'success'
      && handledSuccessId.current !== uploadState.job.id
    ) {
      handledSuccessId.current = uploadState.job.id;
      setFile(null);
      setForm(initialForm());
      setPageError('');
      setPageMessage('Video berhasil diupload dan sudah masuk Rekaman Kelas.');
    }
  }, [uploadState.job]);

  const connectDrive = async () => {
    setPageError('');
    setPageMessage('');

    try {
      await connectBackgroundGoogleDrive();
      setPageMessage(
        'Google Drive terhubung. Koneksi tetap aktif setelah refresh selama sesi Google masih berlaku.',
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Google Drive belum dapat dihubungkan.',
      );
    }
  };

  const chooseFile = async (nextFile: File | null) => {
    setPageError('');
    setPageMessage('');
    clearFinishedBackgroundUpload();

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!nextFile.type.startsWith('video/')) {
      setFile(null);
      setPageError('Pilih file video yang valid.');
      return;
    }

    setFile(nextFile);

    if (!form.title.trim()) {
      setForm((current) => ({
        ...current,
        title: nextFile.name.replace(/\.[^.]+$/, '').slice(0, 160),
      }));
    }

    const duration = await detectVideoDurationMinutes(nextFile);
    if (duration) {
      setForm((current) => ({
        ...current,
        duration: String(duration),
      }));
    }
  };

  const uploadVideo = async () => {
    setPageError('');
    setPageMessage('');

    if (!uploadState.driveConnected) {
      setPageError('Hubungkan Google Drive terlebih dahulu.');
      return;
    }

    if (!selectedClass) {
      setPageError('Pilih kelas terlebih dahulu.');
      return;
    }

    if (!file) {
      setPageError('Pilih video yang akan diupload.');
      return;
    }

    if (!form.title.trim()) {
      setPageError('Judul rekaman wajib diisi.');
      return;
    }

    const recordedAt = new Date(form.recordedAt);
    if (!Number.isFinite(recordedAt.getTime())) {
      setPageError('Tanggal rekaman tidak valid.');
      return;
    }

    const duration = form.duration.trim() ? Number(form.duration) : null;

    if (
      duration !== null
      && (!Number.isInteger(duration) || duration < 1 || duration > 1440)
    ) {
      setPageError('Durasi harus 1–1440 menit.');
      return;
    }

    try {
      await startBackgroundRecordingUpload({
        file,
        classId: selectedClass.class_id,
        className: selectedClass.class_name,
        title: form.title.trim(),
        description: form.description,
        recordedAt,
        durationMinutes: duration,
        isPublished: form.isPublished,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setPageMessage('Upload dibatalkan.');
        return;
      }

      setPageError(
        error instanceof Error
          ? error.message
          : 'Upload video gagal.',
      );
    }
  };

  const addManualRecording = async () => {
    setManualMessage('');

    if (!selectedClass) {
      setManualMessage('Pilih kelas terlebih dahulu.');
      return;
    }

    if (!manualForm.title.trim()) {
      setManualMessage('Judul rekaman wajib diisi.');
      return;
    }

    const fileId = extractDriveFileId(manualForm.driveLink);
    if (!fileId) {
      setManualMessage('Link Google Drive atau File ID tidak valid.');
      return;
    }

    const recordedAt = new Date(manualForm.recordedAt);
    if (!Number.isFinite(recordedAt.getTime())) {
      setManualMessage('Tanggal rekaman tidak valid.');
      return;
    }

    const duration = manualForm.duration.trim()
      ? Number(manualForm.duration)
      : null;

    if (
      duration !== null
      && (!Number.isInteger(duration) || duration < 1 || duration > 1440)
    ) {
      setManualMessage('Durasi harus 1–1440 menit.');
      return;
    }

    setManualSaving(true);

    const { error } = await supabase.rpc('create_class_recording', {
      p_class_id: selectedClass.class_id,
      p_title: manualForm.title.trim(),
      p_description: manualForm.description,
      p_drive_file_id: fileId,
      p_recorded_at: recordedAt.toISOString(),
      p_duration_minutes: duration,
      p_is_published: manualForm.isPublished,
    });

    setManualSaving(false);

    if (error) {
      console.error('KOJAC manual recording create failed', error);
      setManualMessage('Rekaman belum dapat ditambahkan. Periksa data lalu coba lagi.');
      return;
    }

    setManualForm(initialManualForm());
    setManualMessage('Rekaman berhasil ditambahkan ke Rekaman Kelas.');
  };

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canTeach) return <Navigate to="/" replace />;

  const uploading = uploadState.job?.status === 'uploading';

  return (
    <div className="page recording-upload-page">
      <header className="recording-upload-header">
        <div>
          <p className="eyebrow">PENGAJAR KOJAC</p>
          <h1 className="title-icon"><CloudUpload/>Upload Video</h1>
          <p>
            Upload rekaman kelas ke penyimpanan video KOJAC.
            Anda boleh membuka menu LMS lain selama proses upload berjalan.
          </p>
        </div>

        <button
          className={`recording-drive-connect ${uploadState.driveConnected ? 'is-connected' : ''}`}
          type="button"
          disabled={
            uploadState.connectingDrive
            || uploading
            || uploadState.driveConnected
            || !uploadState.googleClientConfigured
          }
          onClick={() => void connectDrive()}
        >
          {uploadState.driveConnected
            ? <CheckCircle2 size={17}/>
            : <LogIn size={17}/>}
          {uploadState.driveConnected
            ? 'Google Drive Terhubung'
            : uploadState.connectingDrive
              ? 'Menghubungkan…'
              : 'Hubungkan Google Drive'}
        </button>
      </header>

      {!uploadState.googleClientConfigured && (
        <section className="recording-upload-config-warning" role="alert">
          <AlertCircle size={22}/>
          <div>
            <strong>Google OAuth belum dikonfigurasi.</strong>
            <p>
              Tambahkan <code>VITE_GOOGLE_CLIENT_ID</code> pada environment Vercel.
            </p>
          </div>
        </section>
      )}

      {loadingClasses ? (
        <div className="recording-upload-loading">Memuat kelas mengajar…</div>
      ) : classes.length === 0 ? (
        <section className="recording-upload-empty">
          <School size={30}/>
          <h2>Belum ada kelas mengajar.</h2>
          <p>Upload video tersedia setelah akun Anda memiliki kelas.</p>
        </section>
      ) : (
        <section className="recording-upload-panel panel">
          <div className="recording-upload-section-heading">
            <div>
              <p className="eyebrow">VIDEO BARU</p>
              <h2>Upload Rekaman Kelas</h2>
            </div>
            <span>Video tidak disimpan di Supabase.</span>
          </div>

          <div className="recording-upload-form-grid">
            <label>
              Kelas
              <select
                value={selectedClassId}
                disabled={uploading}
                onChange={(event) => setSelectedClassId(event.target.value)}
              >
                {classes.map((row) => (
                  <option key={row.class_id} value={row.class_id}>
                    {row.program_name || 'Program KOJAC'} — {row.class_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Tanggal & Jam Kelas
              <input
                type="datetime-local"
                value={form.recordedAt}
                disabled={uploading}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  recordedAt: event.target.value,
                }))}
              />
            </label>

            <label className="is-wide">
              Judul Rekaman
              <input
                maxLength={160}
                value={form.title}
                disabled={uploading}
                placeholder="Contoh: Bab 12 — Bentuk て"
                onChange={(event) => setForm((current) => ({
                  ...current,
                  title: event.target.value,
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
                disabled={uploading}
                placeholder="Terdeteksi otomatis jika memungkinkan"
                onChange={(event) => setForm((current) => ({
                  ...current,
                  duration: event.target.value,
                }))}
              />
            </label>

            <label className="recording-upload-toggle">
              <input
                type="checkbox"
                checked={form.isPublished}
                disabled={uploading}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  isPublished: event.target.checked,
                }))}
              />
              <span>
                <strong>Publikasikan ke Rekaman Kelas</strong>
                <small>Matikan jika video belum siap ditonton siswa.</small>
              </span>
            </label>

            <label className="is-wide">
              Deskripsi
              <textarea
                rows={4}
                maxLength={5000}
                value={form.description}
                disabled={uploading}
                placeholder="Materi yang dibahas pada pertemuan ini…"
                onChange={(event) => setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))}
              />
            </label>
          </div>

          <div className="recording-upload-file-block">
            <div className="recording-upload-file-heading">
              <div>
                <FileVideo2 size={19}/>
                <div>
                  <strong>File Video</strong>
                  <span>Video dikirim langsung dari browser tanpa melalui Supabase.</span>
                </div>
              </div>

              <label className="recording-upload-file-button">
                <Upload size={15}/>
                Pilih Video
                <input
                  type="file"
                  accept="video/*"
                  disabled={uploading}
                  onChange={(event) => {
                    void chooseFile(event.target.files?.[0] ?? null);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>

            {file ? (
              <div className="recording-upload-selected-file">
                <FileVideo2 size={20}/>
                <div>
                  <strong>{file.name}</strong>
                  <span>{bytesLabel(file.size)} · {file.type || 'video'}</span>
                </div>
              </div>
            ) : (
              <p className="recording-upload-no-file">
                {uploading
                  ? 'Upload sedang berjalan di background.'
                  : 'Belum ada video dipilih.'}
              </p>
            )}
          </div>

          {uploadState.job && (
            <div className={`recording-upload-job-card is-${uploadState.job.status}`}>
              <div className="recording-upload-progress-top">
                <div>
                  {uploadState.job.status === 'success'
                    ? <CheckCircle2 size={17}/>
                    : uploadState.job.status === 'error'
                      ? <AlertCircle size={17}/>
                      : <HardDrive size={17}/>}
                  <span>{uploadState.job.message}</span>
                </div>
                {uploading && <strong>{uploadState.job.progress}%</strong>}
              </div>

              {uploading && (
                <>
                  <div
                    className="recording-upload-progress-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={uploadState.job.progress}
                  >
                    <span style={{ width: `${uploadState.job.progress}%` }}/>
                  </div>

                  <div className="recording-upload-progress-meta">
                    <span>
                      {bytesLabel(uploadState.job.uploadedBytes)}
                      {' / '}
                      {bytesLabel(uploadState.job.totalBytes)}
                    </span>
                    <button type="button" onClick={cancelBackgroundUpload}>
                      <Square size={12}/> Batalkan
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {pageError && (
            <div className="recording-upload-message is-error" role="alert">
              <AlertCircle size={17}/><span>{pageError}</span>
            </div>
          )}

          {pageMessage && (
            <div className="recording-upload-message is-success" role="status">
              <CheckCircle2 size={17}/><span>{pageMessage}</span>
            </div>
          )}

          <div className="recording-upload-actions">
            <button
              type="button"
              className="recording-upload-primary"
              disabled={
                uploading
                || !file
                || !selectedClass
                || !form.title.trim()
                || !uploadState.driveConnected
              }
              onClick={() => void uploadVideo()}
            >
              <CloudUpload size={17}/>
              {uploading
                ? `Uploading ${uploadState.job?.progress ?? 0}%`
                : 'Upload Video'}
            </button>
          </div>
        </section>
      )}

      {classes.length > 0 && (
        <section className="recording-upload-panel panel recording-manual-add-panel">
          <div className="recording-upload-section-heading">
            <div>
              <p className="eyebrow">TAMBAH REKAMAN</p>
              <h2><Link2 size={19}/> Tambahkan dari Google Drive</h2>
            </div>
            <span>Gunakan untuk video yang sudah tersedia sebelumnya.</span>
          </div>

          <div className="recording-upload-form-grid">
            <label>
              Kelas
              <select
                value={selectedClassId}
                disabled={manualSaving || uploading}
                onChange={(event) => setSelectedClassId(event.target.value)}
              >
                {classes.map((row) => (
                  <option key={row.class_id} value={row.class_id}>
                    {row.program_name || 'Program KOJAC'} — {row.class_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Tanggal & Jam Kelas
              <input
                type="datetime-local"
                value={manualForm.recordedAt}
                disabled={manualSaving}
                onChange={(event) => setManualForm((current) => ({
                  ...current,
                  recordedAt: event.target.value,
                }))}
              />
            </label>

            <label className="is-wide">
              Judul Rekaman
              <input
                maxLength={160}
                value={manualForm.title}
                disabled={manualSaving}
                placeholder="Contoh: Bab 12 — Bentuk て"
                onChange={(event) => setManualForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))}
              />
            </label>

            <label className="is-wide">
              Link Google Drive / File ID
              <input
                value={manualForm.driveLink}
                disabled={manualSaving}
                placeholder="Tempel link video Google Drive atau File ID"
                onChange={(event) => setManualForm((current) => ({
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
                value={manualForm.duration}
                disabled={manualSaving}
                placeholder="120"
                onChange={(event) => setManualForm((current) => ({
                  ...current,
                  duration: event.target.value,
                }))}
              />
            </label>

            <label className="recording-upload-toggle">
              <input
                type="checkbox"
                checked={manualForm.isPublished}
                disabled={manualSaving}
                onChange={(event) => setManualForm((current) => ({
                  ...current,
                  isPublished: event.target.checked,
                }))}
              />
              <span>
                <strong>Publikasikan ke Rekaman Kelas</strong>
                <small>Matikan jika rekaman belum siap ditonton siswa.</small>
              </span>
            </label>

            <label className="is-wide">
              Deskripsi
              <textarea
                rows={4}
                maxLength={5000}
                value={manualForm.description}
                disabled={manualSaving}
                placeholder="Ringkasan materi pada pertemuan ini…"
                onChange={(event) => setManualForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))}
              />
            </label>
          </div>

          {manualMessage && (
            <div className="recording-upload-message is-success" role="status">
              <CheckCircle2 size={17}/><span>{manualMessage}</span>
            </div>
          )}

          <div className="recording-upload-actions">
            <button
              type="button"
              className="recording-upload-primary"
              disabled={manualSaving || !manualForm.title.trim() || !manualForm.driveLink.trim()}
              onClick={() => void addManualRecording()}
            >
              <Plus size={17}/>
              {manualSaving ? 'Menambahkan…' : 'Tambah Rekaman'}
            </button>
          </div>
        </section>
      )}

      {uploadState.history.length > 0 && (
        <section className="recording-upload-recent panel">
          <div className="recording-upload-recent-heading">
            <History size={18}/>
            <div>
              <strong>Upload Terakhir</strong>
              <span>Tetap tersedia setelah halaman di-refresh.</span>
            </div>
          </div>

          <div className="recording-upload-recent-list">
            {uploadState.history.map((row) => (
              <div
                className={`recording-upload-recent-item is-${row.status}`}
                key={row.id}
              >
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.className} · {row.fileName}</span>
                  <small>{row.message}</small>
                </div>
                <time dateTime={row.finishedAt}>
                  {formatDateTime(row.finishedAt)}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="recording-upload-info">
        <HardDrive size={20}/>
        <div>
          <strong>Upload tetap berjalan saat pindah menu</strong>
          <p>
            Anda dapat membuka menu lain selama upload berlangsung.
            Jangan me-refresh atau menutup browser ketika upload masih aktif;
            browser akan memberikan peringatan agar proses tidak terputus.
          </p>
        </div>
      </section>
    </div>
  );
}
