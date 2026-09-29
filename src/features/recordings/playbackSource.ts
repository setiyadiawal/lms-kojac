import { supabase } from '../../lib/supabase';

export type RecordingPlaybackSource = {
  url: string;
  type: string;
  expiresAt: string;
};

type PlaybackSourceResponse = {
  available?: boolean;
  source?: RecordingPlaybackSource;
  error?: string;
};

export async function getRecordingPlaybackSource(
  recordingId: string,
): Promise<RecordingPlaybackSource | null> {
  const { data, error } = await supabase.functions.invoke<PlaybackSourceResponse>(
    'recording-playback-source',
    {
      body: { recording_id: recordingId },
    },
  );

  if (error) {
    throw new Error(error.message || 'Sumber pemutaran rekaman belum tersedia.');
  }

  if (!data?.available || !data.source?.url) {
    return null;
  }

  return data.source;
}
