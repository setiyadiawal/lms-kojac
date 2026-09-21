import { supabase } from '../../lib/supabase';

export type LiveClassroomProvider = 'jaas';

export type LiveClassroomAccess = {
  provider: LiveClassroomProvider;
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
    throw new Error('live_classroom_access_failed');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (
    data?.provider !== 'jaas'
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
