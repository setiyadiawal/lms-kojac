import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  FileVideo2,
  FolderOpen,
  HardDrive,
  Link2,
  LogIn,
  RefreshCw,
  School,
  ShieldCheck,
  Square,
  Upload,
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import '../class-recording-upload.css';
import {
  createAnyoneWithLinkReaderPermission,
  driveFileUrl,
  driveFolderUrl,
  requestGoogleDriveAccessToken,
  uploadClassVideoToGoogleDrive,
} from '../features/recordings/googleDriveUpload';
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
  shareWithLink: boolean;
};

type CompletedUpload = {
  fileId: string;
  fileName: string;
  webViewLink: string;
  folderId: string;
};

const TEACHING_ROLES = new Set<AppRole>([
  'pengajar',
  'administrator',
  'manager',
  'co_founder',
  'founder',
]);

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

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
    shareWithLink: false,
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
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const canTeach = Boolean(role && TEACHING_ROLES.has(role));

  const [classes, setClasses] = useState<TeachingClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<UploadForm>(initialForm);
  const [driveAccessToken, setDriveAccessToken] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState<CompletedUpload | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedClass = useMemo(
    () => classes.find((row) => row.class_id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const loadClasses = useCallback(async () => {
    if (!canTeach) return;

    setLoadingClasses(true);
    setError('');

    const { data, error: loadError } = await supabase.rpc('get_my_teaching_classes');

    if (loadError) {
      console.error('KOJAC upload recording classes failed', loadError);
      setClasses([]);
      setError('Kelas mengajar belum dapat dimuat.');
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
    return () => abortRef.current?.abort();
  }, []);

  const connectDrive = async () => {
    setConnectingDrive(true);
    setError('');
    setMessage('');

    try {
      const token = await requestGoogleDriveAccessToken(GOOGLE_CLIENT_ID);
      setDriveAccessToken(token);
      setMessage('Google Drive terhubung untuk sesi ini.');
    } catch (connectError) {
      console.error('KOJAC Google Drive auth failed', connectError);
      setError(
        connectError instanceof Error
          ? connectError.message
          : 'Google Drive belum dapat dihubungkan.',
      );
    } finally {
      setConnectingDrive(false);
    }
  };

  const onChooseFile = async (nextFile: File | null) => {
    setError('');
    setMessage('');
    setCompleted(null);

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!nextFile.type.startsWith('video/')) {
      setFile(null);
      setError('Pilih file video yang valid.');
      return;
    }

    setFile(nextFile);

    if (!form.title.trim()) {
      const nameWithoutExt = nextFile.name.replace(/\.[^.]+$/, '');
      setForm((current) => ({ ...current, title: nameWithoutExt.slice(0, 160) }));
    }

    const duration = await detectVideoDurationMinutes(nextFile);
    if (duration) {
      setForm((current) => ({ ...current, duration: String(duration) }));
    }
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const uploadVideo = async () => {
    if (!selectedClass) {
      setError('Pilih kelas terlebih dahulu.');
      return;
    }

    if (!file) {
      setError('Pilih video yang akan diupload.');
      return;
    }

    if (!form.title.trim()) {
      setError('Judul rekaman wajib diisi.');
      return;
    }

    const recordedAt = new Date(form.recordedAt);
    if (!Number.isFinite(recordedAt.getTime())) {
      setError('Tanggal rekaman tidak valid.');
      return;
    }

    const duration = form.duration.trim() ? Number(form.duration) : null;
    if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1440)) {
      setError('Durasi harus 1–1440 menit.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadedBytes(0);
    setError('');
    setMessage('');
    setCompleted(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let token = driveAccessToken;

      if (!token) {
        token = await requestGoogleDriveAccessToken(GOOGLE_CLIENT_ID);
        setDriveAccessToken(token);
      }

      const uploaded = await uploadClassVideoToGoogleDrive({
        accessToken: token,
        file,
        classId: selectedClass.class_id,
        className: selectedClass.class_name,
        title: form.title.trim(),
        recordedAt,
        signal: controller.signal,
        onProgress: (percent, bytes) => {
          setProgress(percent);
          setUploadedBytes(bytes);
        },
      });

      if (form.shareWithLink) {
        await createAnyoneWithLinkReaderPermission(
          token,
          uploaded.id,
          controller.signal,
        );
      }

      const { error: recordingError } = await supabase.rpc('create_class_recording', {
        p_class_id: selectedClass.class_id,
        p_title: form.title.trim(),
        p_description: form.description,
        p_drive_file_id: uploaded.id,
        p_recorded_at: recordedAt.toISOString(),
        p_duration_minutes: duration,
        p_is_published: form.isPublished,
      });

      if (recordingError) {
        console.error('KOJAC recording metadata save failed after Drive upload', recordingError);

        const fallbackUrl = uploaded.webViewLink || driveFileUrl(uploaded.id);
        setCompleted({
          fileId: uploaded.id,
          fileName: uploaded.name,
          webViewLink: fallbackUrl,
          folderId: uploaded.folderId,
        });

        setError(
          'Video sudah berhasil masuk Google Drive, tetapi metadata rekaman belum tersimpan di LMS. '
          + 'Gunakan link Drive yang tampil di bawah untuk menambahkannya melalui menu Rekaman Kelas.',
        );
        return;
      }

      setCompleted({
        fileId: uploaded.id,
        fileName: uploaded.name,
        webViewLink: uploaded.webViewLink || driveFileUrl(uploaded.id),
        folderId: uploaded.folderId,
      });

      setMessage('Upload selesai. Video sudah tersimpan di Google Drive dan masuk ke Rekaman Kelas.');
      setFile(null);
      setForm(initialForm());
    } catch (uploadError) {
      if (uploadError instanceof DOMException && uploadError.name === 'AbortError') {
        setError('Upload dibatalkan.');
      } else {
        console.error('KOJAC Google Drive video upload failed', uploadError);
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : 'Upload video ke Google Drive gagal.',
        );
      }
    } finally {
      abortRef.current = null;
      setUploading(false);
    }
  };

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canTeach) return <Navigate to="/" replace />;

  return (
    <div className="page recording-upload-page">
      <header className="recording-upload-header">
        <div>
          <p className="eyebrow">PENGAJAR KOJAC</p>
          <h1 className="title-icon"><CloudUpload/>Upload Video</h1>
          <p>
            Upload rekaman kelas langsung ke Google Drive. Setelah selesai,
            rekaman otomatis masuk ke daftar Rekaman Kelas.
          </p>
        </div>

        <button
          className={`recording-drive-connect ${driveAccessToken ? 'is-connected' : ''}`}
          type="button"
          disabled={connectingDrive || uploading || !GOOGLE_CLIENT_ID}
          onClick={() => void connectDrive()}
        >
          {driveAccessToken ? <CheckCircle2 size={17}/> : <LogIn size={17}/>}
          {driveAccessToken
            ? 'Google Drive Terhubung'
            : connectingDrive
              ? 'Menghubungkan…'
              : 'Hubungkan Google Drive'}
        </button>
      </header>

      {!GOOGLE_CLIENT_ID && (
        <section className="recording-upload-config-warning" role="alert">
          <AlertCircle size={22}/>
          <div>
            <strong>Google OAuth belum dikonfigurasi.</strong>
            <p>
              Tambahkan <code>VITE_GOOGLE_CLIENT_ID</code> pada environment Vercel
              sebelum fitur upload dapat dipakai.
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
              <h2>Upload Rekaman ke Google Drive</h2>
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
                  <span>Video akan dikirim langsung dari browser ke Google Drive.</span>
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
                    void onChooseFile(event.target.files?.[0] ?? null);
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
                Belum ada video dipilih.
              </p>
            )}
          </div>

          <label className="recording-upload-share-option">
            <input
              type="checkbox"
              checked={form.shareWithLink}
              disabled={uploading}
              onChange={(event) => setForm((current) => ({
                ...current,
                shareWithLink: event.target.checked,
              }))}
            />
            <ShieldCheck size={18}/>
            <span>
              <strong>Izinkan siapa saja yang memiliki link untuk menonton</strong>
              <small>
                Opsional dan default OFF. Jika dimatikan, siswa hanya dapat menonton
                bila akun Google mereka sudah diberi akses di Google Drive.
              </small>
            </span>
          </label>

          {uploading && (
            <div className="recording-upload-progress-card">
              <div className="recording-upload-progress-top">
                <div>
                  <HardDrive size={17}/>
                  <span>Uploading ke Google Drive…</span>
                </div>
                <strong>{progress}%</strong>
              </div>

              <div
                className="recording-upload-progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <span style={{ width: `${progress}%` }}/>
              </div>

              <div className="recording-upload-progress-meta">
                <span>{bytesLabel(uploadedBytes)} / {bytesLabel(file?.size ?? 0)}</span>
                <button type="button" onClick={cancelUpload}>
                  <Square size={12}/> Batalkan
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="recording-upload-message is-error" role="alert">
              <AlertCircle size={17}/><span>{error}</span>
            </div>
          )}

          {message && (
            <div className="recording-upload-message is-success" role="status">
              <CheckCircle2 size={17}/><span>{message}</span>
            </div>
          )}

          {completed && (
            <div className="recording-upload-completed">
              <div>
                <CheckCircle2 size={20}/>
                <div>
                  <strong>{completed.fileName}</strong>
                  <span>Google Drive file ID: {completed.fileId}</span>
                </div>
              </div>

              <div className="recording-upload-completed-actions">
                <a href={completed.webViewLink} target="_blank" rel="noreferrer">
                  <ExternalLink size={14}/>Buka Video
                </a>
                <a href={driveFolderUrl(completed.folderId)} target="_blank" rel="noreferrer">
                  <FolderOpen size={14}/>Buka Folder
                </a>
                <button type="button" onClick={() => navigate('/rekaman-kelas')}>
                  <Link2 size={14}/>Rekaman Kelas
                </button>
              </div>
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
                || !GOOGLE_CLIENT_ID
              }
              onClick={() => void uploadVideo()}
            >
              <CloudUpload size={17}/>
              {uploading ? `Uploading ${progress}%` : 'Upload ke Google Drive'}
            </button>
          </div>
        </section>
      )}

      <section className="recording-upload-info">
        <HardDrive size={20}/>
        <div>
          <strong>Penyimpanan Google Drive</strong>
          <p>
            KOJAC membuat folder <b>KOJAC LMS - Rekaman Kelas</b>, lalu subfolder
            per kelas secara otomatis. Access token Google hanya disimpan di memori
            browser selama sesi halaman ini dan tidak disimpan ke database KOJAC.
          </p>
        </div>
      </section>
    </div>
  );
}
