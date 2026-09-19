const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

const ROOT_FOLDER_NAME = 'KOJAC LMS - Rekaman Kelas';
const ROOT_FOLDER_CACHE_KEY = 'kojac-drive-recordings-root';
const CLASS_FOLDER_CACHE_PREFIX = 'kojac-drive-recordings-class:';

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024; // 8 MiB, multiple of 256 KiB.
const MIN_CHUNK_MULTIPLE = 256 * 1024;

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleAccountsOAuth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: unknown) => void;
  }) => GoogleTokenClient;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleAccountsOAuth2;
      };
    };
  }
}

export type DriveUploadResult = {
  id: string;
  name: string;
  webViewLink: string | null;
  folderId: string;
};

export type UploadVideoToDriveOptions = {
  accessToken: string;
  file: File;
  classId: string;
  className: string;
  title: string;
  recordedAt: Date;
  signal?: AbortSignal;
  onProgress?: (percent: number, uploadedBytes: number, totalBytes: number) => void;
};

function assertOk(response: Response, message: string) {
  if (!response.ok) {
    throw new Error(`${message} (${response.status})`);
  }
}

async function readErrorBody(response: Response) {
  try {
    const json = await response.json() as { error?: { message?: string } };
    return json.error?.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

async function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`,
    );

    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Identity Services gagal dimuat.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services gagal dimuat.'));
    document.head.appendChild(script);
  });

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services tidak tersedia.');
  }
}

export async function requestGoogleDriveAccessToken(clientId: string) {
  if (!clientId.trim()) {
    throw new Error('VITE_GOOGLE_CLIENT_ID belum dikonfigurasi.');
  }

  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;

    if (!oauth2) {
      reject(new Error('Google Identity Services tidak tersedia.'));
      return;
    }

    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(
            response.error_description
              || response.error
              || 'Google Drive tidak memberikan access token.',
          ));
          return;
        }

        resolve(response.access_token);
      },
      error_callback: () => reject(new Error('Login Google Drive dibatalkan atau gagal.')),
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

async function getDriveFile(
  accessToken: string,
  fileId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?fields=id,name,mimeType,trashed,webViewLink`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    },
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Google Drive folder check gagal: ${await readErrorBody(response)}`);
  }

  return response.json() as Promise<{
    id: string;
    name: string;
    mimeType: string;
    trashed?: boolean;
    webViewLink?: string;
  }>;
}

async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId: string | null,
  appProperties: Record<string, string>,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${DRIVE_FILES_API}?fields=id,name,mimeType,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
        appProperties,
      }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Membuat folder Google Drive gagal: ${await readErrorBody(response)}`);
  }

  return response.json() as Promise<{
    id: string;
    name: string;
    webViewLink?: string;
  }>;
}

async function ensureCachedFolder(
  accessToken: string,
  cacheKey: string,
  folderName: string,
  parentId: string | null,
  appProperties: Record<string, string>,
  signal?: AbortSignal,
) {
  const cached = window.localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const existing = await getDriveFile(accessToken, cached, signal);
      if (
        existing
        && !existing.trashed
        && existing.mimeType === 'application/vnd.google-apps.folder'
      ) {
        return existing.id;
      }
    } catch (error) {
      console.warn('KOJAC cached Drive folder check failed', error);
    }

    window.localStorage.removeItem(cacheKey);
  }

  const created = await createDriveFolder(
    accessToken,
    folderName,
    parentId,
    appProperties,
    signal,
  );

  window.localStorage.setItem(cacheKey, created.id);
  return created.id;
}

async function ensureClassRecordingFolder(
  accessToken: string,
  classId: string,
  className: string,
  signal?: AbortSignal,
) {
  const rootId = await ensureCachedFolder(
    accessToken,
    ROOT_FOLDER_CACHE_KEY,
    ROOT_FOLDER_NAME,
    null,
    {
      kojacPurpose: 'classRecordingsRoot',
    },
    signal,
  );

  const safeClassName = className.trim() || 'Kelas KOJAC';

  return ensureCachedFolder(
    accessToken,
    `${CLASS_FOLDER_CACHE_PREFIX}${classId}`,
    safeClassName,
    rootId,
    {
      kojacPurpose: 'classRecordingsClass',
      kojacClassId: classId,
    },
    signal,
  );
}

function fileExtension(file: File) {
  const match = file.name.match(/(\.[A-Za-z0-9]{1,10})$/);
  return match?.[1]?.toLowerCase() || '';
}

function buildDriveFileName(
  file: File,
  className: string,
  title: string,
  recordedAt: Date,
) {
  const date = recordedAt.toISOString().slice(0, 10);
  const ext = fileExtension(file);
  const base = `KOJAC - ${className} - ${title} - ${date}`
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  return `${base}${ext}`;
}

async function initiateResumableUpload(
  options: UploadVideoToDriveOptions,
  folderId: string,
) {
  const mimeType = options.file.type || 'application/octet-stream';
  const driveFileName = buildDriveFileName(
    options.file,
    options.className,
    options.title,
    options.recordedAt,
  );

  const response = await fetch(
    `${DRIVE_UPLOAD_API}?uploadType=resumable&fields=id,name,mimeType,size,webViewLink,parents`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(options.file.size),
      },
      body: JSON.stringify({
        name: driveFileName,
        mimeType,
        parents: [folderId],
        appProperties: {
          kojacPurpose: 'classRecording',
          kojacClassId: options.classId,
        },
      }),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Memulai upload Google Drive gagal: ${await readErrorBody(response)}`);
  }

  const sessionUrl = response.headers.get('Location');
  if (!sessionUrl) {
    throw new Error('Google Drive tidak mengembalikan resumable upload URL.');
  }

  return sessionUrl;
}

function normalizedChunkSize(value = DEFAULT_CHUNK_SIZE) {
  return Math.max(
    MIN_CHUNK_MULTIPLE,
    Math.floor(value / MIN_CHUNK_MULTIPLE) * MIN_CHUNK_MULTIPLE,
  );
}

async function uploadChunks(
  sessionUrl: string,
  file: File,
  signal?: AbortSignal,
  onProgress?: UploadVideoToDriveOptions['onProgress'],
) {
  const chunkSize = normalizedChunkSize();
  let start = 0;

  while (start < file.size) {
    const endExclusive = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, endExclusive);

    const response = await fetch(sessionUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${start}-${endExclusive - 1}/${file.size}`,
      },
      body: chunk,
      signal,
    });

    if (response.status === 308) {
      start = endExclusive;
      onProgress?.(
        Math.round((start / file.size) * 100),
        start,
        file.size,
      );
      continue;
    }

    if (response.ok) {
      const result = await response.json() as {
        id: string;
        name: string;
        webViewLink?: string;
      };

      onProgress?.(100, file.size, file.size);
      return result;
    }

    throw new Error(`Upload Google Drive gagal: ${await readErrorBody(response)}`);
  }

  throw new Error('Upload Google Drive selesai tanpa metadata file.');
}

export async function uploadClassVideoToGoogleDrive(
  options: UploadVideoToDriveOptions,
): Promise<DriveUploadResult> {
  if (!options.file.type.startsWith('video/')) {
    throw new Error('File yang dipilih harus berupa video.');
  }

  if (options.file.size <= 0) {
    throw new Error('File video kosong.');
  }

  const folderId = await ensureClassRecordingFolder(
    options.accessToken,
    options.classId,
    options.className,
    options.signal,
  );

  const sessionUrl = await initiateResumableUpload(options, folderId);
  const result = await uploadChunks(
    sessionUrl,
    options.file,
    options.signal,
    options.onProgress,
  );

  return {
    id: result.id,
    name: result.name,
    webViewLink: result.webViewLink || null,
    folderId,
  };
}

export async function createAnyoneWithLinkReaderPermission(
  accessToken: string,
  fileId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?fields=id,type,role`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        type: 'anyone',
        role: 'reader',
        allowFileDiscovery: false,
      }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Mengatur izin Google Drive gagal: ${await readErrorBody(response)}`);
  }
}

export function driveFolderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

export function driveFileUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}
