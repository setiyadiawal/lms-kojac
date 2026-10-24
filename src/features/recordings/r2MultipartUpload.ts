import { supabase } from '../../lib/supabase';

const DEFAULT_PART_SIZE = 8 * 1024 * 1024;
const MIN_PART_SIZE = 5 * 1024 * 1024;
const MAX_MULTIPART_PARTS = 10_000;
const MAX_PART_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 800;
const MIME_TYPE = 'video/mp4';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const UPLOAD_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/recording-upload-session`
  : '';

type JsonRecord = Record<string, unknown>;

type InitiateResponse = {
  session_token?: unknown;
  expires_at?: unknown;
};

type SignPartResponse = {
  url?: unknown;
  method?: unknown;
  part_number?: unknown;
  expires_at?: unknown;
};

type CompleteResponse = {
  completed?: unknown;
  recording_id?: unknown;
  status?: unknown;
};

type AbortResponse = {
  aborted?: unknown;
  already_finalized?: unknown;
  recording_id?: unknown;
};

export type R2UploadProgressStage =
  | 'initiating'
  | 'signing'
  | 'uploading'
  | 'completing';

export type R2UploadProgress = {
  stage: R2UploadProgressStage;
  partNumber?: number;
  partCount: number;
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
};

export type R2MultipartUploadInput = {
  recordingId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: R2UploadProgress) => void;
};

export type R2MultipartUploadResult = {
  recordingId: string;
  status: 'ready_unpublished';
  partSizeBytes: number;
  partCount: number;
};

export class R2UploadError extends Error {
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
    this.name = 'R2UploadError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export class R2CompleteRetryError extends R2UploadError {
  readonly retryComplete: () => Promise<R2MultipartUploadResult>;
  readonly abortMultipart: () => Promise<void>;

  constructor(
    message: string,
    retryComplete: () => Promise<R2MultipartUploadResult>,
    abortMultipart: () => Promise<void>,
  ) {
    super(message, 'complete_uncertain', 0, true);
    this.name = 'R2CompleteRetryError';
    this.retryComplete = retryComplete;
    this.abortMultipart = abortMultipart;
  }
}

function abortError() {
  return new DOMException('Upload dibatalkan.', 'AbortError');
}

function ensureNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

function partSizeFor(totalBytes: number) {
  const minimumForPartLimit = Math.ceil(totalBytes / MAX_MULTIPART_PARTS);
  const roundedForPartLimit = Math.ceil(minimumForPartLimit / (1024 * 1024))
    * (1024 * 1024);

  return Math.max(
    DEFAULT_PART_SIZE,
    MIN_PART_SIZE,
    roundedForPartLimit,
  );
}

function friendlyMessage(code: string, status: number) {
  if (status === 403 || code === 'forbidden' || code === 'origin_not_allowed') {
    return 'Anda tidak memiliki akses mengunggah rekaman untuk kelas ini.';
  }

  switch (code) {
    case 'unsupported_media_type':
      return 'Format video harus MP4.';
    case 'recording_source_already_exists':
    case 'recording_media_already_attached':
      return 'Rekaman ini sudah memiliki sumber video.';
    case 'recording_must_be_unpublished':
      return 'Rekaman harus berstatus belum dipublikasikan sebelum upload.';
    case 'invalid_upload_session':
      return 'Sesi upload berakhir. Silakan mulai upload kembali.';
    case 'invalid_recording_id':
    case 'recording_not_found':
      return 'Draft rekaman tidak ditemukan.';
    case 'completed_object_size_mismatch':
    case 'recording_attached_media_validation_mismatch':
    case 'recording_attached_media_metadata_mismatch':
      return 'Verifikasi file upload tidak cocok. Jangan mulai upload baru sebelum diperiksa.';
    case 'etag_not_readable':
      return 'Upload part berhasil, tetapi ETag tidak dapat dibaca. Periksa konfigurasi CORS R2.';
    case 'server_configuration_error':
      return 'Konfigurasi layanan upload belum siap.';
    case 'network_failure':
      return 'Upload terputus. Coba lagi.';
    default:
      if (status >= 500) {
        return 'Layanan upload sedang bermasalah. Coba lagi.';
      }
      if (status === 401) {
        return 'Sesi login KOJAC berakhir. Silakan login kembali.';
      }
      return 'Upload video gagal.';
  }
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new R2UploadError(
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
    return value && typeof value === 'object'
      ? value as JsonRecord
      : {};
  } catch {
    return {};
  }
}

async function callUploadSession(
  payload: JsonRecord,
  signal?: AbortSignal,
) {
  ensureNotAborted(signal);

  if (!UPLOAD_ENDPOINT) {
    throw new R2UploadError(
      'Konfigurasi Supabase belum tersedia.',
      'client_configuration_error',
      0,
    );
  }

  const token = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw abortError();

    throw new R2UploadError(
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

    throw new R2UploadError(
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

    const handleAbort = () => {
      xhr.abort();
    };

    xhr.open('PUT', url, true);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onLoaded(Math.min(event.loaded, blob.size));
    };

    xhr.onload = () => {
      const status = xhr.status;

      if (status < 200 || status >= 300) {
        fail(new R2UploadError(
          status === 403
            ? 'Upload ditolak oleh penyimpanan R2.'
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
        fail(new R2UploadError(
          friendlyMessage('etag_not_readable', status),
          'etag_not_readable',
          status,
          false,
        ));
        return;
      }

      cleanup();
      resolve(etag);
    };

    xhr.onerror = () => {
      fail(new R2UploadError(
        friendlyMessage('network_failure', 0),
        'network_failure',
        0,
        true,
      ));
    };

    xhr.onabort = () => {
      fail(abortError());
    };

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
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      lastError = error;

      const retryable = error instanceof R2UploadError
        && error.retryable
        && error.status !== 403;

      if (!retryable || attempt >= MAX_PART_ATTEMPTS) {
        throw error;
      }

      await sleep(RETRY_BASE_DELAY_MS * attempt, signal);
    }
  }

  throw lastError ?? new R2UploadError(
    'Upload part gagal.',
    'part_upload_failed',
  );
}

async function bestEffortAbort(sessionToken: string) {
  try {
    const body = await callUploadSession({
      operation: 'abort',
      session_token: sessionToken,
    }) as AbortResponse;

    if (body.aborted !== true) {
      return;
    }
  } catch {
    // Best-effort cleanup only. Never expose session-bearing details.
  }
}

export async function uploadRecordingToR2(
  input: R2MultipartUploadInput,
): Promise<R2MultipartUploadResult> {
  const { recordingId, file, signal, onProgress } = input;

  ensureNotAborted(signal);

  if (!recordingId) {
    throw new R2UploadError(
      'Draft rekaman tidak tersedia.',
      'invalid_recording_id',
      400,
    );
  }

  if (!file || file.size <= 0) {
    throw new R2UploadError(
      'File video kosong atau tidak dapat dibaca.',
      'invalid_size_bytes',
      400,
    );
  }

  if (!file.name.toLowerCase().endsWith('.mp4')) {
    throw new R2UploadError(
      'Format video harus MP4.',
      'unsupported_media_type',
      415,
    );
  }

  if (file.type && file.type.toLowerCase() !== MIME_TYPE) {
    throw new R2UploadError(
      'Format video harus MP4.',
      'unsupported_media_type',
      415,
    );
  }

  const partSizeBytes = partSizeFor(file.size);
  const partCount = Math.ceil(file.size / partSizeBytes);

  if (partCount < 1 || partCount > MAX_MULTIPART_PARTS) {
    throw new R2UploadError(
      'Jumlah multipart upload tidak valid.',
      'invalid_part_count',
      400,
    );
  }

  onProgress?.({
    stage: 'initiating',
    partCount,
    uploadedBytes: 0,
    totalBytes: file.size,
    percent: 0,
  });

  const initiateBody = await callUploadSession({
    operation: 'initiate',
    recording_id: recordingId,
    filename: file.name,
    mime_type: MIME_TYPE,
    size_bytes: file.size,
  }, signal) as InitiateResponse;

  const sessionToken = typeof initiateBody.session_token === 'string'
    ? initiateBody.session_token
    : '';

  if (!sessionToken) {
    throw new R2UploadError(
      'Sesi upload tidak dapat dibuat.',
      'invalid_upload_session',
      500,
    );
  }

  const completedParts: Array<{ part_number: number; etag: string }> = [];
  let completedBytes = 0;

  const completePayload = {
    operation: 'complete',
    session_token: sessionToken,
    parts: completedParts,
  };

  const finishComplete = async (): Promise<R2MultipartUploadResult> => {
    let body: CompleteResponse;

    try {
      body = await callUploadSession(completePayload) as CompleteResponse;
    } catch (error) {
      const uncertain = error instanceof R2UploadError
        && (error.status === 0 || error.status >= 500);

      if (uncertain) {
        throw new R2CompleteRetryError(
          'Semua part sudah terupload, tetapi penyelesaian belum terkonfirmasi. Coba selesaikan lagi.',
          finishComplete,
          () => bestEffortAbort(sessionToken),
        );
      }

      throw error;
    }

    if (
      body.completed !== true
      || body.recording_id !== recordingId
      || body.status !== 'ready_unpublished'
    ) {
      throw new R2UploadError(
        'Status akhir upload tidak sesuai. Jangan mulai upload baru sebelum diperiksa.',
        'unexpected_complete_state',
        409,
      );
    }

    return {
      recordingId,
      status: 'ready_unpublished',
      partSizeBytes,
      partCount,
    };
  };

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

      const signedBody = await callUploadSession({
        operation: 'sign_part',
        session_token: sessionToken,
        part_number: partNumber,
      }, signal) as SignPartResponse;

      const signedUrl = typeof signedBody.url === 'string'
        ? signedBody.url
        : '';

      if (!signedUrl || signedBody.part_number !== partNumber) {
        throw new R2UploadError(
          'URL upload sementara tidak dapat dibuat.',
          'part_signing_failed',
          500,
        );
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
          const uploadedBytes = Math.min(
            completedBytes + loaded,
            file.size,
          );

          onProgress?.({
            stage: 'uploading',
            partNumber,
            partCount,
            uploadedBytes,
            totalBytes: file.size,
            percent: Math.min(
              100,
              Math.round((uploadedBytes / file.size) * 100),
            ),
          });
        },
      );

      completedBytes = end;
      completedParts.push({
        part_number: partNumber,
        etag,
      });

      onProgress?.({
        stage: 'uploading',
        partNumber,
        partCount,
        uploadedBytes: completedBytes,
        totalBytes: file.size,
        percent: Math.min(
          100,
          Math.round((completedBytes / file.size) * 100),
        ),
      });
    }

    ensureNotAborted(signal);

    onProgress?.({
      stage: 'completing',
      partCount,
      uploadedBytes: file.size,
      totalBytes: file.size,
      percent: 100,
    });

    return await finishComplete();
  } catch (error) {
    if (error instanceof R2CompleteRetryError) {
      throw error;
    }

    await bestEffortAbort(sessionToken);
    throw error;
  }
}
