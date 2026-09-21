import { supabase } from '../../lib/supabase';

export type LiveClassroomProvider = 'jaas';

export type LiveClassroomAccess = {
  provider: LiveClassroomProvider;
  sessionId: string;
  appId: string;
  roomName: string;
  jwt: string;
  className: string;
  classCode: string | null;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  moderator: boolean;
};

type LiveClassroomAccessResponse = {
  provider?: string;
  session_id?: string;
  app_id?: string;
  room_name?: string;
  jwt?: string;
  class_name?: string;
  class_code?: string | null;
  display_name?: string;
  email?: string;
  avatar_url?: string | null;
  moderator?: boolean;
  error?: string;
};

async function edgeErrorCode(error: unknown) {
  const context = (error as { context?: Response } | null)?.context;
  if (!(context instanceof Response)) return 'live_classroom_access_failed';

  try {
    const payload = await context.clone().json() as { error?: unknown };
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }
  } catch {
    // Fallback generik bila response bukan JSON.
  }

  return 'live_classroom_access_failed';
}

export async function requestLiveClassroomAccess(
  classId: string,
): Promise<LiveClassroomAccess> {
  const { data, error } = await supabase.functions.invoke<LiveClassroomAccessResponse>(
    'live-classroom-access',
    {
      body: { class_id: classId },
    },
  );

  if (error) {
    throw new Error(await edgeErrorCode(error));
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (
    data?.provider !== 'jaas'
    || !data.session_id
    || !data.app_id
    || !data.room_name
    || !data.jwt
    || !data.class_name
    || !data.display_name
    || !data.email
    || typeof data.moderator !== 'boolean'
  ) {
    throw new Error('live_classroom_invalid_response');
  }

  return {
    provider: 'jaas',
    sessionId: data.session_id,
    appId: data.app_id,
    roomName: data.room_name,
    jwt: data.jwt,
    className: data.class_name,
    classCode: data.class_code ?? null,
    displayName: data.display_name,
    email: data.email,
    avatarUrl: data.avatar_url ?? null,
    moderator: data.moderator,
  };
}
