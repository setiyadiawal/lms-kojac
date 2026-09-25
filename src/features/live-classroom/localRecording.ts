export type LocalRecordingResult = {
  file: File;
  fileName: string;
  mimeType: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  bytes: number;
  storedInBrowserFileSystem: boolean;
  cleanup: () => Promise<void>;
};

export type LocalRecordingSession = {
  startedAt: Date;
  fileName: string;
  screenTrack: MediaStreamTrack;
  stop: () => Promise<LocalRecordingResult>;
};

type OpfsDirectoryHandle = {
  getFileHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<OpfsFileHandle>;
  removeEntry?: (name: string) => Promise<void>;
};

type OpfsFileHandle = {
  createWritable: () => Promise<OpfsWritable>;
  getFile: () => Promise<File>;
};

type OpfsWritable = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
  abort?: (reason?: unknown) => Promise<void>;
};

function supportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate))
    ?? '';
}

function safeFileName(value: string) {
  const normalized = value
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 170);

  return `${normalized || 'KOJAC Live Recording'}.webm`;
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function createOpfsTarget(fileName: string) {
  const storage = navigator.storage as StorageManager & {
    getDirectory?: () => Promise<OpfsDirectoryHandle>;
  };

  if (!storage.getDirectory) {
    return {
      directory: null as OpfsDirectoryHandle | null,
      fileHandle: null as OpfsFileHandle | null,
      writable: null as OpfsWritable | null,
    };
  }

  try {
    const directory = await storage.getDirectory();
    const fileHandle = await directory.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();

    return { directory, fileHandle, writable };
  } catch (error) {
    console.warn('KOJAC OPFS unavailable, fallback memory chunks', error);
    return {
      directory: null,
      fileHandle: null,
      writable: null,
    };
  }
}

export async function startLocalClassRecording(options: {
  suggestedName: string;
}): Promise<LocalRecordingSession> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Browser ini belum mendukung recording tab.');
  }

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder tidak tersedia pada browser ini.');
  }

  const mimeType = supportedMimeType();
  if (!mimeType) {
    throw new Error('Format recording WebM belum didukung browser ini.');
  }

  const fileName = safeFileName(options.suggestedName);

  let displayStream: MediaStream | null = null;
  let micStream: MediaStream | null = null;
  let mixedStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;

  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 30, max: 30 },
      },
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'include',
      systemAudio: 'include',
    } as unknown as DisplayMediaStreamOptions);

    const screenTrack = displayStream.getVideoTracks()[0];
    if (!screenTrack) {
      throw new Error('Tab KOJAC belum dipilih.');
    }

    if (displayStream.getAudioTracks().length === 0) {
      throw new Error(
        'Audio tab tidak ikut direkam. Ulangi, pilih TAB KOJAC Live dan aktifkan "Bagikan audio tab".',
      );
    }

    micStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    const tabAudioSource = audioContext.createMediaStreamSource(
      new MediaStream(displayStream.getAudioTracks()),
    );
    tabAudioSource.connect(destination);

    if (micStream.getAudioTracks().length > 0) {
      const micSource = audioContext.createMediaStreamSource(
        new MediaStream(micStream.getAudioTracks()),
      );
      micSource.connect(destination);
    }

    mixedStream = new MediaStream([
      screenTrack,
      ...destination.stream.getAudioTracks(),
    ]);

    const opfs = await createOpfsTarget(fileName);
    const chunks: Blob[] = [];
    let totalBytes = 0;
    let writeQueue = Promise.resolve();

    const recorder = new MediaRecorder(mixedStream, {
      mimeType,
      videoBitsPerSecond: 1_600_000,
      audioBitsPerSecond: 128_000,
    });

    recorder.addEventListener('dataavailable', (event) => {
      if (!event.data || event.data.size <= 0) return;

      totalBytes += event.data.size;

      if (opfs.writable) {
        const piece = event.data;
        writeQueue = writeQueue.then(() => opfs.writable!.write(piece));
      } else {
        chunks.push(event.data);
      }
    });

    const startedAt = new Date();
    let stopPromise: Promise<LocalRecordingResult> | null = null;

    const cleanupStreams = async () => {
      stopTracks(mixedStream);
      stopTracks(micStream);
      stopTracks(displayStream);

      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close().catch(() => undefined);
      }
    };

    const stop = () => {
      if (stopPromise) return stopPromise;

      stopPromise = new Promise<LocalRecordingResult>((resolve, reject) => {
        recorder.addEventListener('error', async () => {
          try {
            await opfs.writable?.abort?.();
          } catch {
            // Best effort.
          }

          await cleanupStreams();
          reject(new Error('Recording lokal gagal.'));
        }, { once: true });

        recorder.addEventListener('stop', async () => {
          try {
            await writeQueue;

            const endedAt = new Date();
            let file: File;

            if (opfs.writable && opfs.fileHandle) {
              await opfs.writable.close();
              const stored = await opfs.fileHandle.getFile();
              file = new File([stored], fileName, {
                type: mimeType,
                lastModified: endedAt.getTime(),
              });
            } else {
              file = new File(chunks, fileName, {
                type: mimeType,
                lastModified: endedAt.getTime(),
              });
            }

            await cleanupStreams();
            downloadFile(file);

            resolve({
              file,
              fileName,
              mimeType,
              startedAt,
              endedAt,
              durationSeconds: Math.max(
                1,
                Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
              ),
              bytes: Math.max(totalBytes, file.size),
              storedInBrowserFileSystem: Boolean(opfs.fileHandle),
              cleanup: async () => {
                if (!opfs.directory?.removeEntry) return;
                await opfs.directory.removeEntry(fileName).catch(() => undefined);
              },
            });
          } catch (error) {
            await cleanupStreams();
            reject(error);
          }
        }, { once: true });

        if (recorder.state === 'inactive') {
          reject(new Error('Recorder sudah berhenti.'));
          return;
        }

        try {
          recorder.requestData();
        } catch {
          // Best effort.
        }

        recorder.stop();
      });

      return stopPromise;
    };

    recorder.start(4_000);

    return {
      startedAt,
      fileName,
      screenTrack,
      stop,
    };
  } catch (error) {
    stopTracks(mixedStream);
    stopTracks(micStream);
    stopTracks(displayStream);

    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close().catch(() => undefined);
    }

    throw error;
  }
}
