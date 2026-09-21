import { supabase } from '../../lib/supabase';

type LiveClassroomStateRow = {
  class_id: string;
  class_name: string;
  class_code: string | null;
  can_moderate: boolean;
  session_id: string | null;
  session_status: string | null;
  provider: string | null;
  provider_room_name: string | null;
  started_at: string | null;
  started_by_name: string | null;
  late_grace_minutes: number | null;
};

export type LiveClassroomState = {
  classId: string;
  className: string;
  classCode: string | null;
  canModerate: boolean;
  sessionId: string | null;
  sessionStatus: string | null;
  provider: string | null;
  providerRoomName: string | null;
  startedAt: string | null;
  startedByName: string | null;
  lateGraceMinutes: number;
};

type LiveAttendanceRow = {
  user_id: string;
  display_name: string;
  role: string;
  first_joined_at: string;
  last_seen_at: string;
  left_at: string | null;
  duration_seconds: number;
  join_count: number;
  was_late: boolean;
  is_connected: boolean;
};

export type LiveAttendance = {
  userId: string;
  displayName: string;
  role: string;
  firstJoinedAt: string;
  lastSeenAt: string;
  leftAt: string | null;
  durationSeconds: number;
  joinCount: number;
  wasLate: boolean;
  isConnected: boolean;
};

type LiveSessionHistoryRow = {
  session_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  started_by_name: string;
  participant_count: number;
  student_count: number;
  late_student_count: number;
  total_student_minutes: number;
};

export type LiveSessionHistory = {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  startedByName: string;
  participantCount: number;
  studentCount: number;
  lateStudentCount: number;
  totalStudentMinutes: number;
};

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  if (data && typeof data === 'object') return data as T;
  return null;
}

export async function getLiveClassroomState(
  classId: string,
): Promise<LiveClassroomState> {
  const { data, error } = await supabase.rpc('get_live_classroom_state', {
    p_class_id: classId,
  });

  if (error) throw new Error(error.message || 'live_classroom_state_failed');

  const row = firstRow<LiveClassroomStateRow>(data);
  if (!row) throw new Error('live_classroom_state_empty');

  return {
    classId: row.class_id,
    className: row.class_name,
    classCode: row.class_code,
    canModerate: Boolean(row.can_moderate),
    sessionId: row.session_id,
    sessionStatus: row.session_status,
    provider: row.provider,
    providerRoomName: row.provider_room_name,
    startedAt: row.started_at,
    startedByName: row.started_by_name,
    lateGraceMinutes: Number(row.late_grace_minutes ?? 10),
  };
}

export async function startLiveClassSession(classId: string) {
  const { data, error } = await supabase.rpc('start_live_class_session', {
    p_class_id: classId,
  });

  if (error) throw new Error(error.message || 'live_session_start_failed');
  if (typeof data !== 'string' || !data) throw new Error('live_session_start_invalid');
  return data;
}

export async function endLiveClassSession(sessionId: string) {
  const { error } = await supabase.rpc('end_live_class_session', {
    p_session_id: sessionId,
  });

  if (error) throw new Error(error.message || 'live_session_end_failed');
}

export async function joinLiveClassSession(sessionId: string) {
  const { error } = await supabase.rpc('join_live_class_session', {
    p_session_id: sessionId,
  });

  if (error) throw new Error(error.message || 'live_session_join_failed');
}

export async function heartbeatLiveClassSession(sessionId: string) {
  const { error } = await supabase.rpc('heartbeat_live_class_session', {
    p_session_id: sessionId,
  });

  if (error) throw new Error(error.message || 'live_session_heartbeat_failed');
}

export async function leaveLiveClassSession(sessionId: string) {
  const { error } = await supabase.rpc('leave_live_class_session', {
    p_session_id: sessionId,
  });

  if (error) throw new Error(error.message || 'live_session_leave_failed');
}

export async function getLiveClassAttendance(
  sessionId: string,
): Promise<LiveAttendance[]> {
  const { data, error } = await supabase.rpc('get_live_class_attendance', {
    p_session_id: sessionId,
  });

  if (error) throw new Error(error.message || 'live_attendance_load_failed');

  return ((data ?? []) as LiveAttendanceRow[]).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role,
    firstJoinedAt: row.first_joined_at,
    lastSeenAt: row.last_seen_at,
    leftAt: row.left_at,
    durationSeconds: Number(row.duration_seconds ?? 0),
    joinCount: Number(row.join_count ?? 1),
    wasLate: Boolean(row.was_late),
    isConnected: Boolean(row.is_connected),
  }));
}

export async function getLiveClassSessionHistory(
  classId: string,
  limit = 8,
): Promise<LiveSessionHistory[]> {
  const { data, error } = await supabase.rpc('get_live_class_session_history', {
    p_class_id: classId,
    p_limit: limit,
  });

  if (error) throw new Error(error.message || 'live_session_history_failed');

  return ((data ?? []) as LiveSessionHistoryRow[]).map((row) => ({
    sessionId: row.session_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status,
    startedByName: row.started_by_name,
    participantCount: Number(row.participant_count ?? 0),
    studentCount: Number(row.student_count ?? 0),
    lateStudentCount: Number(row.late_student_count ?? 0),
    totalStudentMinutes: Number(row.total_student_minutes ?? 0),
  }));
}


type MyLiveAttendanceHistoryRow = {
  session_id: string;
  session_started_at: string;
  session_ended_at: string | null;
  session_status: string;
  first_joined_at: string;
  last_seen_at: string;
  left_at: string | null;
  duration_seconds: number;
  join_count: number;
  was_late: boolean;
};

export type MyLiveAttendanceHistory = {
  sessionId: string;
  sessionStartedAt: string;
  sessionEndedAt: string | null;
  sessionStatus: string;
  firstJoinedAt: string;
  lastSeenAt: string;
  leftAt: string | null;
  durationSeconds: number;
  joinCount: number;
  wasLate: boolean;
};

export async function getMyLiveClassAttendanceHistory(
  classId: string,
  limit = 20,
): Promise<MyLiveAttendanceHistory[]> {
  const { data, error } = await supabase.rpc('get_my_live_class_attendance_history', {
    p_class_id: classId,
    p_limit: limit,
  });

  if (error) throw new Error(error.message || 'student_attendance_history_failed');

  return ((data ?? []) as MyLiveAttendanceHistoryRow[]).map((row) => ({
    sessionId: row.session_id,
    sessionStartedAt: row.session_started_at,
    sessionEndedAt: row.session_ended_at,
    sessionStatus: row.session_status,
    firstJoinedAt: row.first_joined_at,
    lastSeenAt: row.last_seen_at,
    leftAt: row.left_at,
    durationSeconds: Number(row.duration_seconds ?? 0),
    joinCount: Number(row.join_count ?? 1),
    wasLate: Boolean(row.was_late),
  }));
}
