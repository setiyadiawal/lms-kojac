import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '../../lib/supabase';
import {
  createAnyoneWithLinkReaderPermission,
  requestGoogleDriveAccessToken,
  uploadClassVideoToGoogleDrive,
} from './googleDriveUpload';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

const TOKEN_PREFIX = 'kojac:gdrive-upload-token:';
const HISTORY_PREFIX = 'kojac:gdrive-upload-history:';
const ACTIVE_PREFIX = 'kojac:gdrive-upload-active:';

const TOKEN_LIFETIME_MS = 50 * 60 * 1000;
const HISTORY_LIMIT = 5;

type StoredToken = {
  token: string;
  expiresAt: number;
};

export type UploadHistoryItem = {
  id: string;
  title: string;
  className: string;
  fileName: string;
  status: 'success' | 'error' | 'cancelled' | 'interrupted';
  message: string;
  finishedAt: string;
};

export type BackgroundUploadJob = {
  id: string;
  title: string;
  className: string;
  fileName: string;
  status: 'uploading' | 'success' | 'error' | 'cancelled';
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  message: string;
};

export type StartBackgroundUploadInput = {
  file: File;
  classId: string;
  className: string;
  title: string;
  description: string;
  recordedAt: Date;
  durationMinutes: number | null;
  isPublished: boolean;
};

type UploadState = {
  googleClientConfigured: boolean;
  driveConnected: boolean;
  connectingDrive: boolean;
  job: BackgroundUploadJob | null;
  history: UploadHistoryItem[];
};

type ActiveMarker = {
  id: string;
  title: string;
  className: string;
  fileName: string;
  startedAt: string;
};

let activeUserId: string | null = null;
let abortController: AbortController | null = null;
let audioContext: AudioContext | null = null;
let toastTimer: number | null = null;

let state: UploadState = {
  googleClientConfigured: Boolean(GOOGLE_CLIENT_ID),
  driveConnected: false,
  connectingDrive: false,
  job: null,
  history: [],
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
  renderGlobalUi();
}

function updateState(next: Partial<UploadState>) {
  state = { ...state, ...next };
  emit();
}

function tokenKey(userId: string) {
  return `${TOKEN_PREFIX}${userId}`;
}

function historyKey(userId: string) {
  return `${HISTORY_PREFIX}${userId}`;
}

function activeKey(userId: string) {
  return `${ACTIVE_PREFIX}${userId}`;
}

function readStoredToken(userId: string): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(tokenKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredToken;
    if (
      !parsed.token
      || !Number.isFinite(parsed.expiresAt)
      || parsed.expiresAt <= Date.now()
    ) {
      sessionStorage.removeItem(tokenKey(userId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredToken(userId: string, token: string) {
  const stored: StoredToken = {
    token,
    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
  };

  sessionStorage.setItem(tokenKey(userId), JSON.stringify(stored));
  return stored;
}

function clearStoredToken(userId: string) {
  sessionStorage.removeItem(tokenKey(userId));
}

function readHistory(userId: string): UploadHistoryItem[] {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as UploadHistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeHistory(userId: string, rows: UploadHistoryItem[]) {
  localStorage.setItem(
    historyKey(userId),
    JSON.stringify(rows.slice(0, HISTORY_LIMIT)),
  );
}

function pushHistory(item: UploadHistoryItem) {
  if (!activeUserId) return;

  const current = readHistory(activeUserId);
  const next = [
    item,
    ...current.filter((row) => row.id !== item.id),
  ].slice(0, HISTORY_LIMIT);

  writeHistory(activeUserId, next);
  updateState({ history: next });
}

function writeActiveMarker(userId: string, marker: ActiveMarker) {
  localStorage.setItem(activeKey(userId), JSON.stringify(marker));
}

function clearActiveMarker(userId: string) {
  localStorage.removeItem(activeKey(userId));
}

function recoverInterruptedUpload(userId: string) {
  try {
    const raw = localStorage.getItem(activeKey(userId));
    if (!raw) return;

    const marker = JSON.parse(raw) as ActiveMarker;
    clearActiveMarker(userId);

    const history = readHistory(userId);
    const alreadyRecorded = history.some((row) => row.id === marker.id);

    if (!alreadyRecorded) {
      const interrupted: UploadHistoryItem = {
        id: marker.id,
        title: marker.title,
        className: marker.className,
        fileName: marker.fileName,
        status: 'interrupted',
        message: 'Upload terputus karena halaman di-refresh atau browser ditutup.',
        finishedAt: new Date().toISOString(),
      };

      const next = [interrupted, ...history].slice(0, HISTORY_LIMIT);
      writeHistory(userId, next);
    }
  } catch {
    clearActiveMarker(userId);
  }
}

function currentValidToken() {
  if (!activeUserId) return null;
  return readStoredToken(activeUserId);
}

function looksLikeExpiredGoogleToken(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /401|invalid credentials|invalid token|unauthenticated|login required/i.test(message);
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

function ensureAudioContext() {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
  } catch (error) {
    console.warn('KOJAC upload sound unavailable', error);
  }
}

function playSuccessSound() {
  try {
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    const first = audioContext.createOscillator();
    first.type = 'sine';
    first.frequency.setValueAtTime(659.25, now);
    first.connect(gain);
    first.start(now);
    first.stop(now + 0.2);

    const second = audioContext.createOscillator();
    second.type = 'sine';
    second.frequency.setValueAtTime(880, now + 0.2);
    second.connect(gain);
    second.start(now + 0.2);
    second.stop(now + 0.5);
  } catch (error) {
    console.warn('KOJAC upload completion sound failed', error);
  }
}

function ensureGlobalRoot() {
  let root = document.getElementById('kojac-upload-global-root');

  if (!root) {
    root = document.createElement('div');
    root.id = 'kojac-upload-global-root';
    document.body.appendChild(root);
  }

  return root;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderGlobalUi() {
  const root = ensureGlobalRoot();

  if (state.job?.status === 'uploading') {
    const job = state.job;
    root.innerHTML = `
      <aside class="kojac-upload-floating" aria-live="polite">
        <div class="kojac-upload-floating-title">
          <strong>Upload Video ${job.progress}%</strong>
          <span>${escapeHtml(job.title)}</span>
        </div>
        <div class="kojac-upload-floating-track" role="progressbar"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="${job.progress}">
          <span style="width:${job.progress}%"></span>
        </div>
        <div class="kojac-upload-floating-meta">
          <span>${bytesLabel(job.uploadedBytes)} / ${bytesLabel(job.totalBytes)}</span>
          <button type="button" data-kojac-cancel-upload>Batalkan</button>
        </div>
      </aside>
    `;

    root
      .querySelector<HTMLButtonElement>('[data-kojac-cancel-upload]')
      ?.addEventListener('click', cancelBackgroundUpload);

    return;
  }

  root.innerHTML = '';
}

function showGlobalToast(
  type: 'success' | 'error',
  title: string,
  message: string,
) {
  let toast = document.getElementById('kojac-upload-global-toast');

  if (!toast) {
    toast = document.createElement('aside');
    toast.id = 'kojac-upload-global-toast';
    document.body.appendChild(toast);
  }

  toast.className = `kojac-upload-toast is-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `
    <div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
    <button type="button" aria-label="Tutup">×</button>
  `;

  toast
    .querySelector<HTMLButtonElement>('button')
    ?.addEventListener('click', () => toast?.remove());

  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast?.remove(), 9000);
}

function beforeUnloadHandler(event: BeforeUnloadEvent) {
  if (state.job?.status !== 'uploading') return;

  event.preventDefault();
  event.returnValue = '';
}

window.addEventListener('beforeunload', beforeUnloadHandler);

export function initializeBackgroundUpload(userId: string | null) {
  if (activeUserId === userId) {
    if (userId) {
      updateState({
        driveConnected: Boolean(readStoredToken(userId)),
        history: readHistory(userId),
      });
    }
    return;
  }

  if (activeUserId && state.job?.status === 'uploading') {
    abortController?.abort();
  }

  activeUserId = userId;
  abortController = null;

  if (!userId) {
    state = {
      googleClientConfigured: Boolean(GOOGLE_CLIENT_ID),
      driveConnected: false,
      connectingDrive: false,
      job: null,
      history: [],
    };
    emit();
    return;
  }

  recoverInterruptedUpload(userId);

  state = {
    googleClientConfigured: Boolean(GOOGLE_CLIENT_ID),
    driveConnected: Boolean(readStoredToken(userId)),
    connectingDrive: false,
    job: null,
    history: readHistory(userId),
  };

  emit();
}

export function subscribeBackgroundUpload(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBackgroundUploadSnapshot() {
  return state;
}

export function useBackgroundRecordingUpload(userId: string | null | undefined) {
  useEffect(() => {
    initializeBackgroundUpload(userId ?? null);
  }, [userId]);

  return useSyncExternalStore(
    subscribeBackgroundUpload,
    getBackgroundUploadSnapshot,
    getBackgroundUploadSnapshot,
  );
}

export async function connectBackgroundGoogleDrive() {
  if (!activeUserId) {
    throw new Error('Sesi KOJAC belum tersedia.');
  }

  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID belum dikonfigurasi.');
  }

  ensureAudioContext();

  const existing = currentValidToken();
  if (existing) {
    updateState({ driveConnected: true });
    return;
  }

  updateState({ connectingDrive: true });

  try {
    const token = await requestGoogleDriveAccessToken(GOOGLE_CLIENT_ID);
    writeStoredToken(activeUserId, token);
    updateState({
      driveConnected: true,
      connectingDrive: false,
    });
  } catch (error) {
    updateState({
      driveConnected: false,
      connectingDrive: false,
    });
    throw error;
  }
}

export async function startBackgroundRecordingUpload(
  input: StartBackgroundUploadInput,
) {
  if (!activeUserId) {
    throw new Error('Sesi KOJAC belum tersedia.');
  }

  if (state.job?.status === 'uploading' || abortController) {
    throw new Error('Masih ada upload video yang sedang berjalan.');
  }

  const storedToken = currentValidToken();
  if (!storedToken) {
    updateState({ driveConnected: false });
    throw new Error('Google Drive belum terhubung atau sesi Google sudah berakhir.');
  }

  ensureAudioContext();

  const id = crypto.randomUUID();
  const controller = new AbortController();
  abortController = controller;

  writeActiveMarker(activeUserId, {
    id,
    title: input.title,
    className: input.className,
    fileName: input.file.name,
    startedAt: new Date().toISOString(),
  });

  updateState({
    job: {
      id,
      title: input.title,
      className: input.className,
      fileName: input.file.name,
      status: 'uploading',
      progress: 0,
      uploadedBytes: 0,
      totalBytes: input.file.size,
      message: 'Mengupload video…',
    },
  });

  try {
    const uploaded = await uploadClassVideoToGoogleDrive({
      accessToken: storedToken.token,
      file: input.file,
      classId: input.classId,
      className: input.className,
      title: input.title,
      recordedAt: input.recordedAt,
      signal: controller.signal,
      onProgress: (progress, uploadedBytes, totalBytes) => {
        if (state.job?.id !== id) return;

        updateState({
          job: {
            ...state.job,
            progress,
            uploadedBytes,
            totalBytes,
            message: 'Mengupload video…',
          },
        });
      },
    });

    if (state.job?.id === id) {
      updateState({
        job: {
          ...state.job,
          progress: 100,
          uploadedBytes: input.file.size,
          message: 'Menyiapkan akses video…',
        },
      });
    }

    await createAnyoneWithLinkReaderPermission(
      storedToken.token,
      uploaded.id,
      controller.signal,
    );

    if (state.job?.id === id) {
      updateState({
        job: {
          ...state.job,
          message: 'Menyimpan ke Rekaman Kelas…',
        },
      });
    }

    const { error: recordingError } = await supabase.rpc('create_class_recording', {
      p_class_id: input.classId,
      p_title: input.title,
      p_description: input.description,
      p_drive_file_id: uploaded.id,
      p_recorded_at: input.recordedAt.toISOString(),
      p_duration_minutes: input.durationMinutes,
      p_is_published: input.isPublished,
    });

    if (recordingError) {
      throw new Error(
        `Video berhasil diupload, tetapi pencatatan Rekaman Kelas gagal: ${recordingError.message}`,
      );
    }

    clearActiveMarker(activeUserId);

    const finishedAt = new Date().toISOString();

    pushHistory({
      id,
      title: input.title,
      className: input.className,
      fileName: input.file.name,
      status: 'success',
      message: 'Video berhasil diupload dan sudah masuk Rekaman Kelas.',
      finishedAt,
    });

    updateState({
      job: {
        id,
        title: input.title,
        className: input.className,
        fileName: input.file.name,
        status: 'success',
        progress: 100,
        uploadedBytes: input.file.size,
        totalBytes: input.file.size,
        message: 'Video berhasil diupload dan sudah masuk Rekaman Kelas.',
      },
    });

    playSuccessSound();
    showGlobalToast(
      'success',
      'Video berhasil diupload',
      `${input.title} sudah masuk ke Rekaman Kelas.`,
    );
  } catch (error) {
    const cancelled = error instanceof DOMException && error.name === 'AbortError';

    if (looksLikeExpiredGoogleToken(error)) {
      clearStoredToken(activeUserId);
      updateState({ driveConnected: false });
    }

    clearActiveMarker(activeUserId);

    const message = cancelled
      ? 'Upload dibatalkan.'
      : error instanceof Error
        ? error.message
        : 'Upload video gagal.';

    pushHistory({
      id,
      title: input.title,
      className: input.className,
      fileName: input.file.name,
      status: cancelled ? 'cancelled' : 'error',
      message,
      finishedAt: new Date().toISOString(),
    });

    updateState({
      job: {
        id,
        title: input.title,
        className: input.className,
        fileName: input.file.name,
        status: cancelled ? 'cancelled' : 'error',
        progress: state.job?.progress ?? 0,
        uploadedBytes: state.job?.uploadedBytes ?? 0,
        totalBytes: input.file.size,
        message,
      },
    });

    if (!cancelled) {
      showGlobalToast('error', 'Upload video gagal', message);
    }

    throw error;
  } finally {
    if (abortController === controller) {
      abortController = null;
    }

    renderGlobalUi();
  }
}

export function cancelBackgroundUpload() {
  abortController?.abort();
}

export function clearFinishedBackgroundUpload() {
  if (state.job?.status === 'uploading') return;
  updateState({ job: null });
}
