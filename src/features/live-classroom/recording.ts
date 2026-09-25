import { supabase } from '../../lib/supabase';

export type LiveRecordingJobStatus =
  | 'recording'
  | 'processing'
  | 'ready'
  | 'imported'
  | 'expired'
  | 'failed';

type LiveRecordingJobRow = {
  job_id: string;
  live_session_id: string;
  class_id: string;
  class_name: string;
  class_code: string | null;
  status: LiveRecordingJobStatus;
  provider: string;
  provider_recording_session_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  uploaded_at: string | null;
  source_url: string | null;
  source_url_expires_at: string | null;
  duration_seconds: number | null;
  imported_recording_id: string | null;
  error_message: string | null;
};

export type LiveRecordingJob = {
  jobId: string;
  liveSessionId: string;
  classId: string;
  className: string;
  classCode: string | null;
  status: LiveRecordingJobStatus;
  provider: string;
  providerRecordingSessionId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  uploadedAt: string | null;
  sourceUrl: string | null;
  sourceUrlExpiresAt: string | null;
  durationSeconds: number | null;
  importedRecordingId: string | null;
  errorMessage: string | null;
};

export async function getMyLiveRecordingJobs(limit = 30): Promise<LiveRecordingJob[]> {
  const { data, error } = await supabase.rpc('get_my_live_recording_jobs', {
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message || 'live_recording_jobs_load_failed');
  }

  return ((data ?? []) as LiveRecordingJobRow[]).map((row) => ({
    jobId: row.job_id,
    liveSessionId: row.live_session_id,
    classId: row.class_id,
    className: row.class_name,
    classCode: row.class_code,
    status: row.status,
    provider: row.provider,
    providerRecordingSessionId: row.provider_recording_session_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    uploadedAt: row.uploaded_at,
    sourceUrl: row.source_url,
    sourceUrlExpiresAt: row.source_url_expires_at,
    durationSeconds:
      row.duration_seconds === null ? null : Number(row.duration_seconds),
    importedRecordingId: row.imported_recording_id,
    errorMessage: row.error_message,
  }));
}
