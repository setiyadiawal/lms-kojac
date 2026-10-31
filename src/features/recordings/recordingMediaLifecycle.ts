import { supabase } from '../../lib/supabase';

const DEFAULT_PART_SIZE = 8 * 1024 * 1024;
const MIN_PART_SIZE = 5 * 1024 * 1024;
const MAX_MULTIPART_PARTS = 10_000;
const MAX_PART_ATTEMPTS = 3;
const MAX_COMPLETE_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 800;
const MIME_TYPE = 'video/mp4';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const LIFECYCLE_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/recording-media-lifecycle`
  : '';

type JsonRecord = Record<string, unknown>;

type InitiateResponse = {
  session_token?: unknown;
};

type SignPartResponse = {
  url?: unknown;
  part_number?: unknown;
};

type ReplaceCompleteResponse = {
  replaced?: unknown;
  recording_id?: unknown;
  status?: unknown;
  cleanup_scheduled?: unknown;
  cleanup_job_id?: unknown;
  cleanup_not_before?: unknown;
};

type DeleteResponse = {
  deleted?: unknown;
  recording_id?: unknown;
  source_type?: unknown;
  cleanup_job_id?: unknown;
  cleanup_status?: unknown;
  cleanup_error?: unknown;
};

type CleanupResponse = {
  cleanup_job_id?: unknown;
  cleanup_status?: unknown;
  cleanup_error?: unknown;
};

type CleanupDueResponse = {
  cleanup_due?: unknown;
  examined_count?: unknown;
  cleaned_count?: unknown;
  pending_count?: unknown;
  protected_count?: unknown;
};

export type RecordingLifecycleProgressStage =
  | 'initiating'
  | 'signing'
  | 'uploading'
  | 'completing';

export type RecordingLifecycleProgress = {
  stage: RecordingLifecycleProgressStage;
  partNumber?: number;
  partCount: number;
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
};

export type ReplaceRecordingVideoInput = {
  recordingId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: RecordingLifecycleProgress) => void;
};

export type ReplaceRecordingVideoResult = {
  recordingId: string;
  status: 'ready_unpublished';
  partSizeBytes: number;
  partCount: number;
  cleanupScheduled: boolean;
  cleanupJobId: string | null;
  cleanupNotBefore: string | null;
};

export type DeleteRecordingLifecycleResult = {
  recordingId: string;
  sourceType: 'draft' | 'drive' | 'r2' | 'dual';
  cleanupJobId: string | null;
  cleanupStatus: 'not_required' | 'completed' | 'pending' | 'protected';
  cleanupError: string | null;
};

export type CleanupRetryResult = {
  cleanupJobId: string;
  cleanupStatus: 'completed' | 'pending' | 'protected';
  cleanupError: string | null;
};

export type CleanupDueResult = {
  examinedCount: number;
  cleanedCount: number;
  pendingCount: number;
  protectedCount: number;
};

export class RecordingLifecycleError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    code: string,
    status = 0,
    retryable = false,
  ) {
    super(message);
    this.name = 'RecordingLifecycleError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function abortError() {
  return new DOMException('Proses dibatalkan.', 'AbortError');
}

function ensureNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

function partSizeFor(totalBytes: number) {
  const minimumForPartLimit = Math.ceil(totalBytes / MAX_MULTIPART_PARTS);
  const roundedForPartLimit = Math.ceil(minimumForPartLimit / (1024 * 1024))
    * (1024 * 1024);

  return Math.max(DEFAULT_PART_SIZE, MIN_PART_SIZE, roundedForPartLimit);
}

function friendlyMessage(code: string, status: number) {
  if (status === 403 || code === 'forbidden' || code === 'origin_not_allowed') {
    return 'Anda tidak memiliki akses untuk mengelola media rekaman ini.';
  }

  switch (code) {
    case 'recording_must_be_unpublished_for_replace':
    case 'recording_must_be_unpublished_for_delete':
      return 'Batalkan publikasi rekaman terlebih dahulu.';
    case 'recording_source_required_for_replace':
      return 'Draft tanpa sumber video tidak menggunakan Ganti Video. Gunakan alur upload rekaman.';
    case 'recording_replace_state_changed':
    case 'recording_delete_state_changed':
    case 'recording_lifecycle_state_changed':
      return 'Rekaman berubah sejak proses dimulai. Muat ulang data sebelum mencoba lagi.';
    case 'unsupported_media_type':
      return 'Format video pengganti harus MP4.';
    case 'invalid_replace_session':
      return 'Sesi penggantian video berakhir. Mulai kembali dari rekaman terbaru.';
    case 'etag_not_readable':
      return 'Upload part berhasil, tetapi ETag tidak dapat dibaca. Periksa CORS R2.';
    case 'completed_object_size_mismatch':
    case 'completed_object_mime_mismatch':
      return 'Verifikasi video pengganti tidak cocok. Video lama tetap dipertahankan.';
    case 'cleanup_not_ready':
      return 'Cleanup belum memasuki waktu aman untuk dijalankan.';
    case 'cleanup_object_authoritative':
      return 'Cleanup dihentikan karena object masih menjadi media authoritative.';
    case 'server_configuration_error':
      return 'Konfigurasi layanan media lifecycle belum siap.';
    case 'network_failure':
      return 'Koneksi terputus. Coba lagi.';
    case 'replace_complete_uncertain':
      return 'Upload selesai, tetapi hasil penggantian belum dapat dikonfirmasi. Muat ulang daftar rekaman sebelum mencoba lagi.';
    default:
      if (status === 401) return 'Sesi login KOJAC berakhir. Silakan login kembali.';
      if (status >= 500) return 'Layanan media lifecycle sedang bermasalah. Coba lagi.';
      return 'Operasi media rekaman gagal.';
  }
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new RecordingLifecycleError(
      'Sesi login KOJAC berakhir. Silakan login kembali.',
      'unauthorized',
      401,
    );
  }

  return data.session.access_token;
}

async function readJson(response: Response): Promise<JsonRecord> {
  try {
    const value = await response.json();
    return value && typeof value === 'object' ? value as JsonRecord : {};
  } catch {
    return {};
  }
}

async function callLifecycle(
  payload: JsonRecord,
  signal?: AbortSignal,
) {
  ensureNotAborted(signal);

  if (!LIFECYCLE_ENDPOINT) {
    throw new RecordingLifecycleError(
      'Konfigurasi Supabase belum tersedia.',
      'client_configuration_error',
    );
  }

  const token = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(LIFECYCLE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    if (signal?.aborted) throw abortError();
    throw new RecordingLifecycleError(
      friendlyMessage('network_failure', 0),
      'network_failure',
      0,
      true,
    );
  }

  const body = await readJson(response);

  if (!response.ok) {
    const code = typeof body.error === 'string'
      ? body.error
      : `http_${response.status}`;

    throw new RecordingLifecycleError(
      friendlyMessage(code, response.status),
      code,
      response.status,
      response.status >= 500,
    );
  }

  return body;
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(abortError());
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function uploadPartOnce(
  url: string,
  blob: Blob,
  signal: AbortSignal | undefined,
  onLoaded: (loaded: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const xhr = new XMLHttpRequest();

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbort);
      xhr.upload.onprogress = null;
      xhr.onload = null;
      xhr.onerror = null;
      xhr.onabort = null;
    };

    const fail = (error: unknown) => {
      cleanup();
      reject(error);
    };

    const handleAbort = () => xhr.abort();

    xhr.open('PUT', url, true);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onLoaded(Math.min(event.loaded, blob.size));
    };

    xhr.onload = () => {
      const status = xhr.status;

      if (status < 200 || status >= 300) {
        fail(new RecordingLifecycleError(
          status === 403
            ? 'Upload pengganti ditolak oleh penyimpanan R2.'
            : status >= 500
              ? 'Upload part terputus di sisi penyimpanan. Coba lagi.'
              : `Upload part gagal (HTTP ${status}).`,
          status === 403 ? 'signed_put_forbidden' : `signed_put_http_${status}`,
          status,
          status >= 500,
        ));
        return;
      }

      const etag = xhr.getResponseHeader('ETag');
      if (!etag) {
        fail(new RecordingLifecycleError(
          friendlyMessage('etag_not_readable', status),
          'etag_not_readable',
          status,
        ));
        return;
      }

      cleanup();
      resolve(etag);
    };

    xhr.onerror = () => {
      fail(new RecordingLifecycleError(
        friendlyMessage('network_failure', 0),
        'network_failure',
        0,
        true,
      ));
    };

    xhr.onabort = () => fail(abortError());

    signal?.addEventListener('abort', handleAbort, { once: true });
    xhr.send(blob);
  });
}

async function uploadPartWithRetry(
  url: string,
  blob: Blob,
  signal: AbortSignal | undefined,
  onLoaded: (loaded: number) => void,
) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_PART_ATTEMPTS; attempt += 1) {
    ensureNotAborted(signal);

    try {
      return await uploadPartOnce(url, blob, signal, onLoaded);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      lastError = error;

      const retryable = error instanceof RecordingLifecycleError
        && error.retryable
        && error.status !== 403;

      if (!retryable || attempt >= MAX_PART_ATTEMPTS) throw error;
      await sleep(RETRY_BASE_DELAY_MS * attempt, signal);
    }
  }

  throw lastError ?? new RecordingLifecycleError('Upload part gagal.', 'part_upload_failed');
}

async function bestEffortAbortReplace(sessionToken: string) {
  try {
    await callLifecycle({
      operation: 'replace_abort',
      session_token: sessionToken,
    });
  } catch {
    // Best effort only. Server/Cloudflare lifecycle remains the final fallback.
  }
}

async function completeReplaceWithRetry(
  payload: JsonRecord,
): Promise<JsonRecord> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_COMPLETE_ATTEMPTS; attempt += 1) {
    try {
      return await callLifecycle(payload);
    } catch (error) {
      lastError = error;

      const retryable = error instanceof RecordingLifecycleError
        && (error.status === 0 || error.status >= 500);

      if (!retryable) throw error;
      if (attempt < MAX_COMPLETE_ATTEMPTS) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
    }
  }

  throw new RecordingLifecycleError(
    friendlyMessage('replace_complete_uncertain', 0),
    'replace_complete_uncertain',
    0,
    true,
  );
}

export async function replaceRecordingVideo(
  input: ReplaceRecordingVideoInput,
): Promise<ReplaceRecordingVideoResult> {
  const { recordingId, file, signal, onProgress } = input;

  ensureNotAborted(signal);

  if (!recordingId) {
    throw new RecordingLifecycleError('Rekaman tidak tersedia.', 'invalid_recording_id', 400);
  }
  if (!file || file.size <= 0) {
    throw new RecordingLifecycleError('File video kosong atau tidak dapat dibaca.', 'invalid_size_bytes', 400);
  }
  if (!file.name.toLowerCase().endsWith('.mp4')) {
    throw new RecordingLifecycleError('Format video pengganti harus MP4.', 'unsupported_media_type', 415);
  }
  if (file.type && file.type.toLowerCase() !== MIME_TYPE) {
    throw new RecordingLifecycleError('Format video pengganti harus MP4.', 'unsupported_media_type', 415);
  }

  const partSizeBytes = partSizeFor(file.size);
  const partCount = Math.ceil(file.size / partSizeBytes);

  if (partCount < 1 || partCount > MAX_MULTIPART_PARTS) {
    throw new RecordingLifecycleError('Jumlah multipart tidak valid.', 'invalid_part_count', 400);
  }

  onProgress?.({
    stage: 'initiating',
    partCount,
    uploadedBytes: 0,
    totalBytes: file.size,
    percent: 0,
  });

  const initiate = await callLifecycle({
    operation: 'replace_initiate',
    recording_id: recordingId,
    filename: file.name,
    mime_type: MIME_TYPE,
    size_bytes: file.size,
  }, signal) as InitiateResponse;

  const sessionToken = typeof initiate.session_token === 'string'
    ? initiate.session_token
    : '';

  if (!sessionToken) {
    throw new RecordingLifecycleError('Sesi penggantian video tidak dapat dibuat.', 'invalid_replace_session', 500);
  }

  const completedParts: Array<{ part_number: number; etag: string }> = [];
  let completedBytes = 0;
  let completing = false;

  try {
    for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
      ensureNotAborted(signal);

      onProgress?.({
        stage: 'signing',
        partNumber,
        partCount,
        uploadedBytes: completedBytes,
        totalBytes: file.size,
        percent: Math.round((completedBytes / file.size) * 100),
      });

      const signed = await callLifecycle({
        operation: 'replace_sign_part',
        session_token: sessionToken,
        part_number: partNumber,
      }, signal) as SignPartResponse;

      const signedUrl = typeof signed.url === 'string' ? signed.url : '';
      if (!signedUrl || signed.part_number !== partNumber) {
        throw new RecordingLifecycleError('URL upload sementara tidak dapat dibuat.', 'part_signing_failed', 500);
      }

      const start = (partNumber - 1) * partSizeBytes;
      const end = Math.min(start + partSizeBytes, file.size);
      const blob = file.slice(start, end, '');

      onProgress?.({
        stage: 'uploading',
        partNumber,
        partCount,
        uploadedBytes: completedBytes,
        totalBytes: file.size,
        percent: Math.round((completedBytes / file.size) * 100),
      });

      const etag = await uploadPartWithRetry(
        signedUrl,
        blob,
        signal,
        (loaded) => {
          const uploadedBytes = Math.min(completedBytes + loaded, file.size);
          onProgress?.({
            stage: 'uploading',
            partNumber,
            partCount,
            uploadedBytes,
            totalBytes: file.size,
            percent: Math.min(100, Math.round((uploadedBytes / file.size) * 100)),
          });
        },
      );

      completedBytes = end;
      completedParts.push({ part_number: partNumber, etag });
    }

    ensureNotAborted(signal);
    completing = true;

    onProgress?.({
      stage: 'completing',
      partCount,
      uploadedBytes: file.size,
      totalBytes: file.size,
      percent: 100,
    });

    const body = await completeReplaceWithRetry({
      operation: 'replace_complete',
      session_token: sessionToken,
      parts: completedParts,
    }) as ReplaceCompleteResponse;

    if (
      body.replaced !== true
      || body.recording_id !== recordingId
      || body.status !== 'ready_unpublished'
    ) {
      throw new RecordingLifecycleError(
        'Status akhir penggantian video tidak sesuai. Muat ulang rekaman sebelum mencoba lagi.',
        'unexpected_replace_complete_state',
        409,
      );
    }

    return {
      recordingId,
      status: 'ready_unpublished',
      partSizeBytes,
      partCount,
      cleanupScheduled: body.cleanup_scheduled === true,
      cleanupJobId: typeof body.cleanup_job_id === 'string' ? body.cleanup_job_id : null,
      cleanupNotBefore: typeof body.cleanup_not_before === 'string' ? body.cleanup_not_before : null,
    };
  } catch (error) {
    if (!completing) {
      await bestEffortAbortReplace(sessionToken);
    }
    throw error;
  }
}

export async function deleteRecordingLifecycle(
  recordingId: string,
): Promise<DeleteRecordingLifecycleResult> {
  const body = await callLifecycle({
    operation: 'delete_recording',
    recording_id: recordingId,
  }) as DeleteResponse;

  if (body.deleted !== true || body.recording_id !== recordingId) {
    throw new RecordingLifecycleError('Status akhir penghapusan tidak sesuai.', 'unexpected_delete_state', 500);
  }

  const sourceType = body.source_type;
  if (sourceType !== 'draft' && sourceType !== 'drive' && sourceType !== 'r2' && sourceType !== 'dual') {
    throw new RecordingLifecycleError('Tipe sumber penghapusan tidak dikenali.', 'unexpected_delete_source', 500);
  }

  const cleanupStatus = body.cleanup_status;
  if (
    cleanupStatus !== 'not_required'
    && cleanupStatus !== 'completed'
    && cleanupStatus !== 'pending'
    && cleanupStatus !== 'protected'
  ) {
    throw new RecordingLifecycleError('Status cleanup tidak dikenali.', 'unexpected_cleanup_state', 500);
  }

  return {
    recordingId,
    sourceType,
    cleanupJobId: typeof body.cleanup_job_id === 'string' ? body.cleanup_job_id : null,
    cleanupStatus,
    cleanupError: typeof body.cleanup_error === 'string' ? body.cleanup_error : null,
  };
}

export async function retryRecordingMediaCleanup(
  cleanupJobId: string,
): Promise<CleanupRetryResult> {
  const body = await callLifecycle({
    operation: 'cleanup_retry',
    cleanup_job_id: cleanupJobId,
  }) as CleanupResponse;

  const status = body.cleanup_status;
  if (status !== 'completed' && status !== 'pending' && status !== 'protected') {
    throw new RecordingLifecycleError('Status cleanup tidak dikenali.', 'unexpected_cleanup_state', 500);
  }

  return {
    cleanupJobId,
    cleanupStatus: status,
    cleanupError: typeof body.cleanup_error === 'string' ? body.cleanup_error : null,
  };
}

export async function runDueRecordingMediaCleanup(
  limit = 5,
): Promise<CleanupDueResult> {
  const normalizedLimit = Number.isInteger(limit)
    ? Math.min(20, Math.max(1, limit))
    : 5;

  const body = await callLifecycle({
    operation: 'cleanup_due',
    limit: normalizedLimit,
  }) as CleanupDueResponse;

  if (body.cleanup_due !== true) {
    throw new RecordingLifecycleError(
      'Status lazy cleanup tidak dikenali.',
      'unexpected_cleanup_due_state',
      500,
    );
  }

  const numberValue = (value: unknown) => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : 0
  );

  return {
    examinedCount: numberValue(body.examined_count),
    cleanedCount: numberValue(body.cleaned_count),
    pendingCount: numberValue(body.pending_count),
    protectedCount: numberValue(body.protected_count),
  };
}
