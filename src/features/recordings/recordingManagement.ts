import { supabase } from '../../lib/supabase';

export type ManageableRecordingRow = {
  recording_id: string;
  class_id: string;
  class_code: string | null;
  class_name: string;
  program_name: string | null;
  title: string;
  description: string;
  created_by: string | null;
  uploader_display_name: string | null;
  recorded_at: string;
  duration_minutes: number | null;
  is_published: boolean;
  has_drive_source: boolean;
  has_media_source: boolean;
  media_mime_type: string | null;
  media_size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

export type RecordingManagementStatus = 'draft' | 'ready' | 'published';
export type RecordingManagementSource = 'r2' | 'drive' | 'none';

export type UpdateRecordingMetadataInput = {
  recordingId: string;
  title: string;
  description: string;
  recordedAt: string;
  durationMinutes: number | null;
};

export async function loadManageableRecordings(classId: string) {
  const { data, error } = await supabase.rpc('get_manageable_class_recordings', {
    p_class_id: classId,
  });

  if (error) throw error;
  return (data ?? []) as ManageableRecordingRow[];
}

export async function updateRecordingMetadata(input: UpdateRecordingMetadataInput) {
  const { error } = await supabase.rpc('update_class_recording_metadata', {
    p_recording_id: input.recordingId,
    p_title: input.title,
    p_description: input.description,
    p_recorded_at: input.recordedAt,
    p_duration_minutes: input.durationMinutes,
  });

  if (error) throw error;
}

export async function setRecordingPublished(recordingId: string, isPublished: boolean) {
  const { error } = await supabase.rpc('set_class_recording_published', {
    p_recording_id: recordingId,
    p_is_published: isPublished,
  });

  if (error) throw error;
}

export function deriveRecordingStatus(
  row: Pick<ManageableRecordingRow, 'is_published' | 'has_drive_source' | 'has_media_source'>,
): RecordingManagementStatus {
  if (row.is_published) return 'published';
  if (row.has_drive_source || row.has_media_source) return 'ready';
  return 'draft';
}

export function recordingStatusLabel(status: RecordingManagementStatus) {
  if (status === 'published') return 'Dipublikasikan';
  if (status === 'ready') return 'Siap / Belum Dipublikasikan';
  return 'Draft';
}

export function deriveRecordingSource(
  row: Pick<ManageableRecordingRow, 'has_drive_source' | 'has_media_source'>,
): RecordingManagementSource {
  if (row.has_media_source) return 'r2';
  if (row.has_drive_source) return 'drive';
  return 'none';
}

export function recordingSourceLabel(source: RecordingManagementSource) {
  if (source === 'r2') return 'R2';
  if (source === 'drive') return 'Legacy Drive';
  return 'Tidak Ada Sumber';
}

export function formatRecordingFileSize(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes / 1024;
  let unit = units[0];

  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }

  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${unit}`;
}
