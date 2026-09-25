import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  FileVideo2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMyLiveRecordingJobs,
  type LiveRecordingJob,
  type LiveRecordingJobStatus,
} from './recording';
import './pending-live-recordings.css';

const statusLabels: Record<LiveRecordingJobStatus, string> = {
  recording: 'Sedang direkam',
  processing: 'Diproses JaaS',
  ready: 'Siap disimpan',
  imported: 'Sudah tersimpan',
  expired: 'Link JaaS kedaluwarsa',
  failed: 'Gagal',
};

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return 'Durasi belum tersedia';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}j ${minutes % 60}m`;
  }
  return `${minutes}m ${remaining}d`;
}

function statusIcon(status: LiveRecordingJobStatus) {
  if (status === 'imported') return <CheckCircle2 size={17}/>;
  if (status === 'failed' || status === 'expired') return <AlertCircle size={17}/>;
  if (status === 'recording') return <FileVideo2 size={17}/>;
  return <Clock3 size={17}/>;
}

export function PendingLiveRecordingsPanel({
  onPrepare,
}: {
  onPrepare: (job: LiveRecordingJob) => void;
}) {
  const [rows, setRows] = useState<LiveRecordingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    try {
      const nextRows = await getMyLiveRecordingJobs(30);
      setRows(nextRows);
    } catch (loadError) {
      console.error('KOJAC live recording inbox load failed', loadError);
      setError('Inbox rekaman Live belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActive = useMemo(
    () => rows.some((row) => row.status === 'recording' || row.status === 'processing'),
    [rows],
  );

  useEffect(() => {
    if (!hasActive) return;

    const interval = window.setInterval(() => {
      void load();
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [hasActive, load]);

  if (!loading && rows.length === 0 && !error) return null;

  return (
    <section className="live-recording-inbox panel">
      <div className="live-recording-inbox-heading">
        <div>
          <p className="eyebrow">KOJAC LIVE RECORDING</p>
          <h2>Rekaman Live</h2>
          <p>
            JaaS menyimpan hasil rekaman sementara. Simpan MP4 ke Google Drive
            sebelum link provider kedaluwarsa.
          </p>
        </div>

        <button type="button" onClick={() => void load()}>
          <RefreshCw size={15}/> Perbarui
        </button>
      </div>

      {loading ? (
        <div className="live-recording-inbox-state">Memuat rekaman Live…</div>
      ) : error ? (
        <div className="live-recording-inbox-state is-error">
          <AlertCircle size={18}/>{error}
        </div>
      ) : (
        <div className="live-recording-inbox-list">
          {rows.map((row) => (
            <article className={`is-${row.status}`} key={row.jobId}>
              <div className="live-recording-inbox-main">
                <div className="live-recording-inbox-title">
                  {statusIcon(row.status)}
                  <div>
                    <strong>{row.className}</strong>
                    <span>
                      {row.classCode || 'Kelas KOJAC'} · {formatDateTime(row.startedAt)}
                    </span>
                  </div>
                </div>

                <div className="live-recording-inbox-meta">
                  <span>{statusLabels[row.status]}</span>
                  <span>{formatDuration(row.durationSeconds)}</span>
                  {row.sourceUrlExpiresAt && row.status === 'ready' && (
                    <span>Kedaluwarsa {formatDateTime(row.sourceUrlExpiresAt)}</span>
                  )}
                </div>

                {row.errorMessage && (
                  <p className="live-recording-inbox-error">{row.errorMessage}</p>
                )}
              </div>

              <div className="live-recording-inbox-actions">
                {row.status === 'ready' && row.sourceUrl && (
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="live-recording-download"
                  >
                    <Download size={15}/> Download MP4
                  </a>
                )}

                {row.status === 'ready' && (
                  <button
                    type="button"
                    className="live-recording-prepare"
                    onClick={() => onPrepare(row)}
                  >
                    <Upload size={15}/> Siapkan Upload
                  </button>
                )}

                {row.status === 'imported' && (
                  <span className="live-recording-imported">
                    <CheckCircle2 size={15}/> Tersimpan di Rekaman Kelas
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
