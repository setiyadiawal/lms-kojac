import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  Film,
  FileVideo,
  HardDrive,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  Save,
  School,
  Trash2,
  Upload,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../class-recordings.css';
import '../recording-management.css';
import {
  canDeleteRecordingLifecycle,
  canReplaceRecordingMedia,
  deriveRecordingSource,
  deriveRecordingStatus,
  formatRecordingFileSize,
  loadManageableRecordings,
  recordingSourceLabel,
  recordingStatusLabel,
  setRecordingPublished,
  updateRecordingMetadata,
  type ManageableRecordingRow,
} from '../features/recordings/recordingManagement';
import {
  deleteRecordingLifecycle,
  replaceRecordingVideo,
  retryRecordingMediaCleanup,
  runDueRecordingMediaCleanup,
  type RecordingLifecycleProgress,
} from '../features/recordings/recordingMediaLifecycle';
import { getRecordingPlaybackSource, type RecordingPlaybackSource } from '../features/recordings/playbackSource';
import { RecordingVideoPlayer } from '../features/recordings/RecordingVideoPlayer';
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

type LegacyTeacherRecordingRow = StudentRecordingRow & {
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

type ClassRpcRow = {
  class_id: string;
  class_code: string | null;
  class_name: string;
  class_status: string;
  program_name: string | null;
};

type RecordingForm = {
  title: string;
  description: string;
  recordedAt: string;
  duration: string;
};

const MANAGEMENT_ROLES = new Set<AppRole>([
  'administrator',
  'manager',
  'co_founder',
  'founder',
]);

const TEACHING_ROLES = new Set<AppRole>([
  'pengajar',
  ...MANAGEMENT_ROLES,
]);

function localDateTimeInput(value = new Date()) {
  const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function emptyForm(): RecordingForm {
  return {
    title: '',
    description: '',
    recordedAt: localDateTimeInput(),
    duration: '',
  };
}

function drivePreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

function driveThumbnailUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w960`;
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

function normalizeClassRows(rows: ClassRpcRow[]): TeachingClassRow[] {
  return rows.map((row) => ({
    class_id: row.class_id,
    class_code: row.class_code,
    class_name: row.class_name,
    class_status: row.class_status as TeachingClassRow['class_status'],
    program_name: row.program_name,
  }));
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
  const [playbackState, setPlaybackState] = useState<
    | { status: 'loading' }
    | { status: 'r2'; source: RecordingPlaybackSource }
    | { status: 'drive' }
    | { status: 'error' }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    setPlaybackState({ status: 'loading' });

    void getRecordingPlaybackSource(row.recording_id)
      .then((source) => {
        if (cancelled) return;
        setPlaybackState(source
          ? { status: 'r2', source }
          : { status: 'drive' });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('KOJAC recording playback source resolution failed', error);
        setPlaybackState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [row.recording_id]);

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

  const closeViewer = useCallback(() => {
    const viewer = viewerRef.current;
    const fullscreenElement = document.fullscreenElement;
    const shouldExitFullscreen = Boolean(
      viewer
      && fullscreenElement
      && viewer.contains(fullscreenElement),
    );

    // Tutup viewer adalah authoritative action. Jangan menunggu Fullscreen API
    // sebelum parent state di-reset dan player di-unmount.
    onClose();

    if (shouldExitFullscreen && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // Jika element sudah ter-unmount, browser dapat melepas fullscreen sendiri.
      });
    }
  }, [onClose]);

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

      if (event.key.toLowerCase() === 'f' && !isTyping && playbackState.status === 'drive') {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }

      if (event.key === 'Escape' && !document.fullscreenElement) {
        void closeViewer();
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeViewer, playbackState.status, toggleFullscreen]);

  return (
    <div
      className="class-recording-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Rekaman ${row.title}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !document.fullscreenElement) {
          void closeViewer();
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
            {playbackState.status === 'drive' && (
              <button
                type="button"
                className="class-recording-viewer-action"
                aria-label={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
                title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen (F)'}
                onClick={() => void toggleFullscreen()}
              >
                {isFullscreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
              </button>
            )}

            <button
              type="button"
              className="class-recording-viewer-close"
              aria-label="Tutup rekaman"
              title="Tutup (Esc)"
              onClick={() => void closeViewer()}
            >
              <X size={20}/>
            </button>
          </div>
        </header>

        <div className="class-recording-viewer-stage">
          <div className="class-recording-video-shell">
            {playbackState.status === 'loading' && (
              <div className="class-recording-playback-state" role="status">
                Menyiapkan rekaman…
              </div>
            )}

            {playbackState.status === 'r2' && (
              <RecordingVideoPlayer
                source={playbackState.source}
                title={row.title}
              />
            )}

            {playbackState.status === 'drive' && (
              <>
                <iframe
                  src={drivePreviewUrl(row.drive_file_id)}
                  title={row.title}
                  loading="eager"
                  allow="autoplay; encrypted-media; fullscreen"
                />
                <div
                  className="class-recording-drive-popout-mask"
                  aria-hidden="true"
                />
              </>
            )}

            {playbackState.status === 'error' && (
              <div className="class-recording-playback-state is-error" role="alert">
                Sumber rekaman belum dapat disiapkan. Tutup lalu coba lagi.
              </div>
            )}
          </div>
        </div>

        <footer className="class-recording-viewer-footer">
          <div className="class-recording-viewer-meta">
            <span><CalendarDays size={15}/>{formatDateTime(row.recorded_at)}</span>
            {row.duration_minutes && (
              <span><Clock3 size={15}/>{row.duration_minutes} menit</span>
            )}
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
  const isManagement = Boolean(role && MANAGEMENT_ROLES.has(role));

  const [studentRows, setStudentRows] = useState<StudentRecordingRow[]>([]);
  const [managementRows, setManagementRows] = useState<ManageableRecordingRow[]>([]);
  const [teachingClasses, setTeachingClasses] = useState<TeachingClassRow[]>([]);
  const [playableClassIds, setPlayableClassIds] = useState<Set<string>>(new Set());
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewer, setViewer] = useState<StudentRecordingRow | null>(null);

  const [form, setForm] = useState<RecordingForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [playbackLoadingId, setPlaybackLoadingId] = useState<string | null>(null);
  const [lifecycleBusyId, setLifecycleBusyId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ManageableRecordingRow | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceProgress, setReplaceProgress] = useState<RecordingLifecycleProgress | null>(null);
  const [replaceMessage, setReplaceMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ManageableRecordingRow | null>(null);
  const [pendingCleanupJobId, setPendingCleanupJobId] = useState<string | null>(null);
  const [cleanupRetrying, setCleanupRetrying] = useState(false);
  const cleanupDueTriggeredRef = useRef(false);
  const replaceAbortRef = useRef<AbortController | null>(null);
  const [error, setError] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');

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

    const classRpc = isManagement
      ? 'get_management_classes_overview'
      : 'get_my_teaching_classes';

    const classResult = await supabase.rpc(classRpc);

    if (classResult.error) {
      console.error('KOJAC recording management class load failed', classResult.error);
      setTeachingClasses([]);
      setPlayableClassIds(new Set());
      setError(true);
      setLoading(false);
      return;
    }

    const rows = normalizeClassRows((classResult.data ?? []) as ClassRpcRow[]);
    setTeachingClasses(rows);
    setSelectedClassId((current) => {
      if (current && rows.some((row) => row.class_id === current)) return current;
      return rows.find((row) => row.class_status === 'active')?.class_id
        ?? rows[0]?.class_id
        ?? '';
    });

    if (isManagement) {
      const playableResult = await supabase.rpc('get_my_teaching_classes');
      if (playableResult.error) {
        console.error('KOJAC teacher-scoped playback class load failed', playableResult.error);
        setPlayableClassIds(new Set());
      } else {
        const playableRows = (playableResult.data ?? []) as ClassRpcRow[];
        setPlayableClassIds(new Set(playableRows.map((row) => row.class_id)));
      }
    } else {
      setPlayableClassIds(new Set(rows.map((row) => row.class_id)));
    }

    setLoading(false);
  }, [canTeach, isManagement]);

  const loadManagementRecordings = useCallback(async (classId: string) => {
    if (!classId || !canTeach) {
      setManagementRows([]);
      return;
    }

    setRecordingsLoading(true);
    setError(false);

    try {
      const rows = await loadManageableRecordings(classId);
      setManagementRows(rows);
    } catch (loadError) {
      console.error('KOJAC manageable recordings load failed', loadError);
      setManagementRows([]);
      setError(true);
    } finally {
      setRecordingsLoading(false);
    }
  }, [canTeach]);

  useEffect(() => {
    if (authLoading) return;
    if (role === 'siswa') void loadStudentRecordings();
    else if (canTeach) void loadTeachingClasses();
  }, [authLoading, role, canTeach, loadStudentRecordings, loadTeachingClasses]);

  useEffect(() => {
    if (authLoading || !canTeach || cleanupDueTriggeredRef.current) return;

    cleanupDueTriggeredRef.current = true;

    // Best-effort lazy cleanup: never block Recording Management usability.
    void runDueRecordingMediaCleanup(5).catch((cleanupError) => {
      console.warn('KOJAC due recording media cleanup deferred', cleanupError);
    });
  }, [authLoading, canTeach]);

  useEffect(() => {
    if (canTeach && selectedClassId) {
      void loadManagementRecordings(selectedClassId);
      setEditingId(null);
      setForm(emptyForm());
      setFormMessage('');
      setActionMessage('');
      setReplaceTarget(null);
      setReplaceFile(null);
      setReplaceProgress(null);
      setReplaceMessage('');
      setDeleteTarget(null);
      replaceAbortRef.current?.abort();
      replaceAbortRef.current = null;
    }
  }, [canTeach, selectedClassId, loadManagementRecordings]);

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

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('id-ID');

  const displayStudentRows = [...visibleStudentRows]
    .filter((row) => {
      if (!normalizedSearch) return true;
      return [row.title, row.class_name, row.description]
        .some((value) => value.toLocaleLowerCase('id-ID').includes(normalizedSearch));
    })
    .sort((a, b) => {
      const aTime = new Date(a.recorded_at).getTime();
      const bTime = new Date(b.recorded_at).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

  const displayManagementRows = [...managementRows]
    .filter((row) => {
      if (!normalizedSearch) return true;
      return [
        row.title,
        row.class_name,
        row.class_code ?? '',
        row.program_name ?? '',
        row.description,
        row.uploader_display_name ?? '',
      ].some((value) => value.toLocaleLowerCase('id-ID').includes(normalizedSearch));
    })
    .sort((a, b) => {
      const aTime = new Date(a.recorded_at).getTime();
      const bTime = new Date(b.recorded_at).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

  const startEdit = (row: ManageableRecordingRow) => {
    setEditingId(row.recording_id);
    setForm({
      title: row.title,
      description: row.description,
      recordedAt: toLocalInput(row.recorded_at),
      duration: row.duration_minutes ? String(row.duration_minutes) : '',
    });
    setFormMessage('');
    setActionMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormMessage('');
  };

  const saveRecording = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingId) {
      setFormMessage('Pilih rekaman yang ingin diedit.');
      return;
    }
    if (!form.title.trim()) {
      setFormMessage('Judul rekaman wajib diisi.');
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

    try {
      await updateRecordingMetadata({
        recordingId: editingId,
        title: form.title.trim(),
        description: form.description,
        recordedAt: recordedAt.toISOString(),
        durationMinutes: duration,
      });

      resetForm();
      setActionMessage('Metadata rekaman berhasil diperbarui.');
      await loadManagementRecordings(selectedClassId);
    } catch (saveError) {
      console.error('KOJAC recording metadata update failed', saveError);
      setFormMessage('Metadata rekaman belum dapat disimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const changePublication = async (row: ManageableRecordingRow, nextPublished: boolean) => {
    const status = deriveRecordingStatus(row);
    if (nextPublished && status === 'draft') {
      setActionMessage('Upload video terlebih dahulu sebelum dipublikasikan.');
      return;
    }

    setPublishingId(row.recording_id);
    setActionMessage('');

    try {
      await setRecordingPublished(row.recording_id, nextPublished);
      setActionMessage(nextPublished
        ? 'Rekaman berhasil dipublikasikan.'
        : 'Publikasi rekaman berhasil dibatalkan.');
      await loadManagementRecordings(row.class_id);
    } catch (publishError) {
      console.error('KOJAC recording publish state update failed', publishError);
      setActionMessage('Status publikasi belum dapat diperbarui. Coba lagi.');
    } finally {
      setPublishingId(null);
    }
  };

  const startReplace = (row: ManageableRecordingRow) => {
    const status = deriveRecordingStatus(row);
    const source = deriveRecordingSource(row);

    if (status === 'published') {
      setActionMessage('Batalkan publikasi terlebih dahulu.');
      return;
    }
    if (source === 'none') {
      setActionMessage('Draft tanpa sumber video menggunakan alur Upload Video, bukan Ganti Video.');
      return;
    }

    setDeleteTarget(null);
    setReplaceTarget(row);
    setReplaceFile(null);
    setReplaceProgress(null);
    setReplaceMessage('');
    setActionMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeReplace = () => {
    if (replaceTarget && lifecycleBusyId === replaceTarget.recording_id) {
      if (replaceProgress?.stage === 'completing') return;
      replaceAbortRef.current?.abort();
      return;
    }

    setReplaceTarget(null);
    setReplaceFile(null);
    setReplaceProgress(null);
    setReplaceMessage('');
  };

  const runReplace = async () => {
    if (!replaceTarget || !replaceFile) {
      setReplaceMessage('Pilih satu file MP4 pengganti terlebih dahulu.');
      return;
    }

    if (replaceTarget.is_published) {
      setReplaceMessage('Batalkan publikasi terlebih dahulu.');
      return;
    }

    setLifecycleBusyId(replaceTarget.recording_id);
    setReplaceMessage('');
    setActionMessage('');
    const controller = new AbortController();
    replaceAbortRef.current = controller;

    try {
      const result = await replaceRecordingVideo({
        recordingId: replaceTarget.recording_id,
        file: replaceFile,
        signal: controller.signal,
        onProgress: setReplaceProgress,
      });

      setActionMessage(result.cleanupScheduled
        ? 'Video berhasil diganti. Rekaman tetap belum dipublikasikan. Media R2 lama dijadwalkan cleanup setelah masa aman playback.'
        : 'Video berhasil diganti. Rekaman tetap belum dipublikasikan.');
      setReplaceTarget(null);
      setReplaceFile(null);
      setReplaceProgress(null);
      await loadManagementRecordings(replaceTarget.class_id);
    } catch (replaceError) {
      if (replaceError instanceof DOMException && replaceError.name === 'AbortError') {
        setReplaceMessage('Penggantian video dibatalkan. Video lama tetap digunakan.');
      } else {
        console.error('KOJAC recording video replacement failed', replaceError);
        setReplaceMessage(
          replaceError instanceof Error
            ? replaceError.message
            : 'Video belum dapat diganti. Video lama tetap digunakan.',
        );
      }
    } finally {
      replaceAbortRef.current = null;
      setLifecycleBusyId(null);
    }
  };

  const startDelete = (row: ManageableRecordingRow) => {
    if (row.is_published) {
      setActionMessage('Batalkan publikasi terlebih dahulu.');
      return;
    }

    setReplaceTarget(null);
    setReplaceFile(null);
    setReplaceProgress(null);
    setReplaceMessage('');
    setDeleteTarget(row);
    setActionMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_published) {
      setActionMessage('Batalkan publikasi terlebih dahulu.');
      return;
    }

    setLifecycleBusyId(deleteTarget.recording_id);
    setActionMessage('');

    try {
      const result = await deleteRecordingLifecycle(deleteTarget.recording_id);

      if (result.cleanupStatus === 'pending' || result.cleanupStatus === 'protected') {
        setPendingCleanupJobId(result.cleanupJobId);
        setActionMessage(
          'Rekaman telah dihapus dari KOJAC. Cleanup media R2 tercatat dan masih menunggu penyelesaian.',
        );
      } else if (result.sourceType === 'drive') {
        setPendingCleanupJobId(null);
        setActionMessage(
          'Rekaman telah dihapus dari KOJAC. File asli Google Drive tetap dipertahankan.',
        );
      } else {
        setPendingCleanupJobId(null);
        setActionMessage('Rekaman berhasil dihapus.');
      }

      setDeleteTarget(null);
      if (editingId === deleteTarget.recording_id) resetForm();
      await loadManagementRecordings(deleteTarget.class_id);
    } catch (deleteError) {
      console.error('KOJAC recording lifecycle delete failed', deleteError);
      setActionMessage(
        deleteError instanceof Error
          ? deleteError.message
          : 'Rekaman belum dapat dihapus. Coba lagi.',
      );
    } finally {
      setLifecycleBusyId(null);
    }
  };

  const retryPendingCleanup = async () => {
    if (!pendingCleanupJobId) return;

    setCleanupRetrying(true);
    try {
      const result = await retryRecordingMediaCleanup(pendingCleanupJobId);
      if (result.cleanupStatus === 'completed') {
        setPendingCleanupJobId(null);
        setActionMessage('Cleanup media R2 berhasil diselesaikan.');
      } else {
        setActionMessage('Cleanup media R2 masih tertunda dan tetap tercatat aman untuk retry.');
      }
    } catch (cleanupError) {
      console.error('KOJAC recording cleanup retry failed', cleanupError);
      setActionMessage(
        cleanupError instanceof Error
          ? cleanupError.message
          : 'Cleanup media R2 belum dapat diselesaikan.',
      );
    } finally {
      setCleanupRetrying(false);
    }
  };

  const openManagementPlayback = async (row: ManageableRecordingRow) => {
    const source = deriveRecordingSource(row);
    if (source === 'none' || !playableClassIds.has(row.class_id)) return;

    const baseViewerRow = {
      recording_id: row.recording_id,
      class_id: row.class_id,
      class_name: row.class_name,
      class_code: row.class_code,
      title: row.title,
      description: row.description,
      recorded_at: row.recorded_at,
      duration_minutes: row.duration_minutes,
    };

    if (row.has_media_source) {
      setViewer({ ...baseViewerRow, drive_file_id: '' });
      return;
    }

    setPlaybackLoadingId(row.recording_id);
    setActionMessage('');

    const { data, error: playbackLoadError } = await supabase.rpc(
      'get_teaching_class_recordings',
      { p_class_id: row.class_id },
    );

    if (playbackLoadError) {
      console.error('KOJAC legacy Drive playback detail load failed', playbackLoadError);
      setActionMessage('Rekaman belum dapat dibuka. Coba lagi.');
      setPlaybackLoadingId(null);
      return;
    }

    const legacyRow = ((data ?? []) as LegacyTeacherRecordingRow[])
      .find((item) => item.recording_id === row.recording_id);

    if (!legacyRow?.drive_file_id) {
      setActionMessage('Sumber Legacy Drive tidak ditemukan untuk rekaman ini.');
      setPlaybackLoadingId(null);
      return;
    }

    setViewer(legacyRow);
    setPlaybackLoadingId(null);
  };

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;

  if (role !== 'siswa' && !canTeach) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page class-recordings-page">
      <header className="class-recordings-header">
        <div>
          <p className="eyebrow">KOJAC LMS</p>
          <h1 className="title-icon"><Video/>Rekaman Kelas</h1>
          <p>
            {role === 'siswa'
              ? 'Tonton kembali rekaman kelas KOJAC yang tersedia untuk kelas Anda.'
              : 'Kelola metadata, publikasi, penggantian video, dan lifecycle media rekaman kelas KOJAC.'}
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
            <label htmlFor="teacher-recording-class">
              {isManagement ? 'Kelas yang Dikelola' : 'Kelas'}
            </label>
            <select
              id="teacher-recording-class"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
            >
              {teachingClasses.map((row) => (
                <option value={row.class_id} key={row.class_id}>
                  {row.program_name || 'Program KOJAC'} — {row.class_name}
                  {row.class_code ? ` (${row.class_code})` : ''}
                </option>
              ))}
            </select>
          </section>

          {replaceTarget && (
            <section className="panel recording-lifecycle-panel" aria-label="Ganti video rekaman">
              <div className="class-recording-section-heading">
                <div>
                  <p className="eyebrow">GANTI VIDEO</p>
                  <h2>{replaceTarget.title}</h2>
                </div>
                <button
                  className="class-recording-secondary"
                  type="button"
                  disabled={
                    lifecycleBusyId === replaceTarget.recording_id
                    && replaceProgress?.stage === 'completing'
                  }
                  onClick={closeReplace}
                >
                  {lifecycleBusyId === replaceTarget.recording_id
                    ? (replaceProgress?.stage === 'completing' ? 'Menyelesaikan…' : 'Batalkan Upload')
                    : 'Batal'}
                </button>
              </div>

              <div className="recording-lifecycle-summary">
                <span>
                  <strong>Kelas</strong>
                  <small>{replaceTarget.class_name}{replaceTarget.class_code ? ` — ${replaceTarget.class_code}` : ''}</small>
                </span>
                <span>
                  <strong>Sumber Saat Ini</strong>
                  <small>{recordingSourceLabel(deriveRecordingSource(replaceTarget))}</small>
                </span>
                <span>
                  <strong>Ukuran Saat Ini</strong>
                  <small>{formatRecordingFileSize(replaceTarget.media_size_bytes)}</small>
                </span>
              </div>

              <div className="recording-lifecycle-safe-note">
                Video lama tetap digunakan sampai video baru selesai diverifikasi.
              </div>

              <label className="recording-lifecycle-file">
                Video Pengganti MP4
                <input
                  type="file"
                  accept=".mp4,video/mp4"
                  disabled={lifecycleBusyId === replaceTarget.recording_id}
                  onChange={(event) => {
                    setReplaceFile(event.target.files?.[0] ?? null);
                    setReplaceMessage('');
                  }}
                />
                <small>{replaceFile ? `${replaceFile.name} · ${formatRecordingFileSize(replaceFile.size)}` : 'Pilih satu file MP4.'}</small>
              </label>

              {replaceProgress && (
                <div className="recording-lifecycle-progress" role="status">
                  <div>
                    <strong>
                      {replaceProgress.stage === 'initiating' && 'Menyiapkan upload…'}
                      {replaceProgress.stage === 'signing' && `Menyiapkan part ${replaceProgress.partNumber ?? ''}…`}
                      {replaceProgress.stage === 'uploading' && `Mengunggah ${replaceProgress.percent}%`}
                      {replaceProgress.stage === 'completing' && 'Memverifikasi & mengganti media…'}
                    </strong>
                    <span>{formatRecordingFileSize(replaceProgress.uploadedBytes)} / {formatRecordingFileSize(replaceProgress.totalBytes)}</span>
                  </div>
                  <progress max={100} value={replaceProgress.percent}/>
                </div>
              )}

              {replaceMessage && (
                <div className="recording-lifecycle-feedback" role="status">
                  {replaceMessage}
                </div>
              )}

              <div className="recording-lifecycle-actions">
                <button
                  type="button"
                  className="recording-lifecycle-replace"
                  disabled={!replaceFile || lifecycleBusyId === replaceTarget.recording_id}
                  onClick={() => void runReplace()}
                >
                  <Upload size={16}/>
                  {lifecycleBusyId === replaceTarget.recording_id ? 'Memproses…' : 'Mulai Ganti Video'}
                </button>
              </div>
            </section>
          )}

          {deleteTarget && (
            <section className="panel recording-lifecycle-panel is-delete" aria-label="Konfirmasi hapus rekaman">
              <div className="class-recording-section-heading">
                <div>
                  <p className="eyebrow">HAPUS REKAMAN</p>
                  <h2>{deleteTarget.title}</h2>
                </div>
              </div>

              <div className="recording-lifecycle-delete-warning">
                <strong>Konfirmasi tindakan destruktif</strong>
                <p>
                  {deleteTarget.has_media_source && deleteTarget.has_drive_source
                    ? 'Rekaman akan dihapus dari KOJAC dan media R2 akan masuk proses cleanup. File asli Google Drive tidak akan dihapus.'
                    : deriveRecordingSource(deleteTarget) === 'r2'
                      ? 'Rekaman akan dihapus dari KOJAC dan media R2 akan masuk proses cleanup.'
                      : deriveRecordingSource(deleteTarget) === 'drive'
                        ? 'Rekaman akan dihapus dari KOJAC. File asli Google Drive tidak akan dihapus.'
                        : 'Draft rekaman akan dihapus.'}
                </p>
                <span>Sumber: {recordingSourceLabel(deriveRecordingSource(deleteTarget))}</span>
              </div>

              <div className="recording-lifecycle-actions">
                <button
                  type="button"
                  className="class-recording-secondary"
                  disabled={lifecycleBusyId === deleteTarget.recording_id}
                  onClick={() => setDeleteTarget(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="recording-lifecycle-delete"
                  disabled={lifecycleBusyId === deleteTarget.recording_id}
                  onClick={() => void confirmDelete()}
                >
                  <Trash2 size={16}/>
                  {lifecycleBusyId === deleteTarget.recording_id ? 'Menghapus…' : 'Ya, Hapus Rekaman'}
                </button>
              </div>
            </section>
          )}

          {editingId && (
            <section className="class-recording-form panel class-recording-edit-form recording-management-edit-form">
              <div className="class-recording-section-heading">
                <div>
                  <p className="eyebrow">EDIT METADATA</p>
                  <h2>Perbarui Informasi Rekaman</h2>
                </div>
                <button className="class-recording-secondary" type="button" onClick={resetForm}>
                  Batal Edit
                </button>
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

                  <div className="recording-management-source-lock" role="note">
                    <HardDrive size={17}/>
                    <span>
                      <strong>Sumber video tidak diubah dari editor ini.</strong>
                      <small>R2 / Legacy Drive dan status publikasi dikelola terpisah.</small>
                    </span>
                  </div>

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
                    <Save size={16}/>
                    {saving ? 'Menyimpan…' : 'Simpan Metadata'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}

      {role !== 'siswa' && actionMessage && (
        <div className="recording-management-message recording-lifecycle-message" role="status">
          <span>{actionMessage}</span>
          {pendingCleanupJobId && (
            <button
              type="button"
              className="class-recording-secondary"
              disabled={cleanupRetrying}
              onClick={() => void retryPendingCleanup()}
            >
              <RefreshCw size={14}/>
              {cleanupRetrying ? 'Mencoba Cleanup…' : 'Coba Cleanup Lagi'}
            </button>
          )}
        </div>
      )}

      <section className="class-recording-library-toolbar panel">
        <label className="class-recording-search-field">
          <span>Cari Rekaman</span>
          <input
            type="search"
            value={searchQuery}
            placeholder={role === 'siswa'
              ? 'Cari judul, kelas, atau materi…'
              : 'Cari judul, kelas, program, materi, atau uploader…'}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        <label>
          <span>Urutkan</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
        </label>
      </section>

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
              else if (selectedClassId) void loadManagementRecordings(selectedClassId);
            }}
          >
            <RefreshCw size={15}/>Coba Lagi
          </button>
        </section>
      ) : role !== 'siswa' && teachingClasses.length === 0 ? (
        <section className="class-recording-state">
          <School size={30}/>
          <h2>{isManagement ? 'Belum ada kelas yang dapat dikelola.' : 'Belum ada kelas mengajar.'}</h2>
          <p>
            {isManagement
              ? 'Kelas yang tersedia untuk recording management akan muncul di sini.'
              : 'Rekaman dapat dikelola setelah akun Anda terhubung ke kelas.'}
          </p>
        </section>
      ) : role === 'siswa' && displayStudentRows.length === 0 ? (
        <section className="class-recording-state">
          <Film size={30}/>
          <h2>Belum ada rekaman kelas.</h2>
          <p>
            {visibleStudentRows.length === 0
              ? 'Rekaman yang dipublikasikan pengajar akan muncul di sini.'
              : 'Tidak ada rekaman yang sesuai dengan filter atau pencarian.'}
          </p>
        </section>
      ) : role !== 'siswa' && displayManagementRows.length === 0 ? (
        <section className="class-recording-state">
          <Film size={30}/>
          <h2>Belum ada rekaman pada kelas ini.</h2>
          <p>
            {managementRows.length === 0
              ? 'Draft, rekaman siap, dan rekaman yang dipublikasikan akan muncul di sini.'
              : 'Tidak ada rekaman yang sesuai dengan pencarian.'}
          </p>
        </section>
      ) : role === 'siswa' ? (
        <section>
          <div className="class-recording-section-heading">
            <div>
              <p className="eyebrow">DAFTAR REKAMAN</p>
              <h2>Rekaman Tersedia</h2>
            </div>
            <span>{displayStudentRows.length} rekaman</span>
          </div>

          <div className="class-recording-grid">
            {displayStudentRows.map((row) => (
              <article className="class-recording-card" key={row.recording_id}>
                <div className="class-recording-cover">
                  <img
                    className="class-recording-thumbnail"
                    src={driveThumbnailUrl(row.drive_file_id)}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="class-recording-cover-icon"><Play size={28}/></div>
                  <span>REKAMAN KELAS</span>
                </div>

                <div className="class-recording-card-body">
                  <div className="class-recording-card-topline">
                    <span>{row.class_name}</span>
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
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="class-recording-section-heading">
            <div>
              <p className="eyebrow">RECORDING MANAGEMENT</p>
              <h2>Rekaman pada Kelas Ini</h2>
            </div>
            <span>{displayManagementRows.length} rekaman</span>
          </div>

          <div className="class-recording-grid recording-management-grid">
            {displayManagementRows.map((row) => {
              const status = deriveRecordingStatus(row);
              const source = deriveRecordingSource(row);
              const canPreview = source !== 'none' && playableClassIds.has(row.class_id);
              const publicationBusy = publishingId === row.recording_id;
              const playbackBusy = playbackLoadingId === row.recording_id;
              const lifecycleBusy = lifecycleBusyId === row.recording_id;

              return (
                <article className="class-recording-card recording-management-card" key={row.recording_id}>
                  <div className={`class-recording-cover recording-management-cover is-${source}`}>
                    <div className="class-recording-cover-icon">
                      {source === 'r2' ? <HardDrive size={28}/> : <FileVideo size={28}/>}
                    </div>
                    <span>{recordingSourceLabel(source).toUpperCase()}</span>
                  </div>

                  <div className="class-recording-card-body">
                    <div className="recording-management-badges">
                      <span className={`recording-management-status is-${status}`}>
                        {recordingStatusLabel(status)}
                      </span>
                      <span className={`recording-management-source is-${source}`}>
                        {recordingSourceLabel(source)}
                      </span>
                    </div>

                    <div className="class-recording-card-topline recording-management-classline">
                      <span>{row.class_name}{row.class_code ? ` — ${row.class_code}` : ''}</span>
                    </div>

                    <h3>{row.title}</h3>

                    <div className="recording-management-detail-grid">
                      <span>
                        <School size={14}/>
                        <strong>Program</strong>
                        <small>{row.program_name || 'Program KOJAC'}</small>
                      </span>
                      <span>
                        <UserRound size={14}/>
                        <strong>Uploader</strong>
                        <small>{row.uploader_display_name || 'Tidak tercatat'}</small>
                      </span>
                      <span>
                        <CalendarDays size={14}/>
                        <strong>Rekaman</strong>
                        <small>{formatDateTime(row.recorded_at)}</small>
                      </span>
                      <span>
                        <Clock3 size={14}/>
                        <strong>Durasi</strong>
                        <small>{row.duration_minutes ? `${row.duration_minutes} menit` : '—'}</small>
                      </span>
                      <span>
                        <HardDrive size={14}/>
                        <strong>Ukuran</strong>
                        <small>{formatRecordingFileSize(row.media_size_bytes)}</small>
                      </span>
                    </div>

                    {row.description && <p>{row.description}</p>}

                    {status === 'draft' && (
                      <div className="recording-management-draft-note">
                        Upload video terlebih dahulu sebelum dipublikasikan.
                      </div>
                    )}

                    {source !== 'none' && !canPreview && (
                      <div className="recording-management-playback-note">
                        Preview mengikuti akses pengajar kelas dan tidak diperluas pada Phase 3D.
                      </div>
                    )}

                    {status === 'published' && (
                      <div className="recording-lifecycle-published-note">
                        Batalkan publikasi terlebih dahulu untuk mengganti video atau menghapus rekaman.
                      </div>
                    )}

                    <div className="class-recording-actions recording-management-actions">
                      {canPreview && (
                        <button
                          type="button"
                          className="class-recording-primary"
                          disabled={playbackBusy || lifecycleBusy}
                          onClick={() => void openManagementPlayback(row)}
                        >
                          <Play size={15}/>{playbackBusy ? 'Membuka…' : 'Tonton'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="class-recording-secondary"
                        disabled={saving || publicationBusy || lifecycleBusy}
                        onClick={() => startEdit(row)}
                      >
                        <Edit3 size={15}/>Edit Metadata
                      </button>

                      {status === 'published' ? (
                        <button
                          type="button"
                          className="recording-management-unpublish"
                          disabled={publicationBusy || lifecycleBusy}
                          onClick={() => void changePublication(row, false)}
                        >
                          <EyeOff size={15}/>
                          {publicationBusy ? 'Memproses…' : 'Batalkan Publikasi'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="recording-management-publish"
                          disabled={status === 'draft' || publicationBusy || lifecycleBusy}
                          title={status === 'draft'
                            ? 'Upload video terlebih dahulu sebelum dipublikasikan.'
                            : 'Publikasikan rekaman ke siswa'}
                          onClick={() => void changePublication(row, true)}
                        >
                          <Eye size={15}/>
                          {publicationBusy ? 'Memproses…' : 'Publish'}
                        </button>
                      )}

                      {source !== 'none' && (
                        <button
                          type="button"
                          className="recording-lifecycle-replace-secondary"
                          disabled={!canReplaceRecordingMedia(row) || lifecycleBusy || publicationBusy}
                          title={status === 'published'
                            ? 'Batalkan publikasi terlebih dahulu.'
                            : 'Ganti video dengan kandidat R2 baru'}
                          onClick={() => startReplace(row)}
                        >
                          <Upload size={15}/>Ganti Video
                        </button>
                      )}

                      <button
                        type="button"
                        className="recording-lifecycle-delete-secondary"
                        disabled={!canDeleteRecordingLifecycle(row) || lifecycleBusy || publicationBusy}
                        title={status === 'published'
                          ? 'Batalkan publikasi terlebih dahulu.'
                          : 'Hapus rekaman dari KOJAC'}
                        onClick={() => startDelete(row)}
                      >
                        <Trash2 size={15}/>Hapus Rekaman
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {viewer && (
        <RecordingViewer
          key={viewer.recording_id}
          row={viewer}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
