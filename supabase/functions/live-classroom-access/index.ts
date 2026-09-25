import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';

const PRODUCTION_ORIGIN = 'https://lms.kojac.id';
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const teachingRoles = new Set([
  'pengajar',
  'administrator',
  'manager',
  'co_founder',
  'founder',
]);

const managementRoles = new Set([
  'administrator',
  'manager',
  'co_founder',
  'founder',
]);

function safeOrigin(value: string | undefined | null) {
  if (!value) return '';
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

function isLocalDevelopmentOrigin(origin: string) {
  if (!origin) return false;

  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && (
        parsed.hostname === 'localhost'
        || parsed.hostname === '127.0.0.1'
        || parsed.hostname === '[::1]'
      )
    );
  } catch {
    return false;
  }
}

function corsOrigin(request: Request) {
  const requestOrigin = safeOrigin(request.headers.get('Origin'));
  const configuredOrigin = safeOrigin(Deno.env.get('KOJAC_APP_URL'));
  const allowedOrigins = new Set([
    PRODUCTION_ORIGIN,
    configuredOrigin,
  ].filter(Boolean));

  if (!requestOrigin) return PRODUCTION_ORIGIN;
  if (allowedOrigins.has(requestOrigin)) return requestOrigin;
  if (isLocalDevelopmentOrigin(requestOrigin)) return requestOrigin;

  console.warn('KOJAC Live blocked origin', requestOrigin);
  return '';
}

function corsHeaders(request: Request) {
  const origin = corsOrigin(request);
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function jakartaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function privateKeyPem() {
  const direct = Deno.env.get('JAAS_PRIVATE_KEY')?.trim();
  if (direct) return direct.replaceAll('\\n', '\n');

  const encoded = Deno.env.get('JAAS_PRIVATE_KEY_B64')?.trim();
  if (!encoded) return '';

  try {
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes).trim();
  } catch {
    return '';
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== 'POST') {
    return json(request, { error: 'method_not_allowed' }, 405);
  }

  if (!corsOrigin(request)) {
    return json(request, { error: 'origin_not_allowed' }, 403);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json(request, { error: 'unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('KOJAC Live missing Supabase runtime configuration');
    return json(request, { error: 'server_configuration_error' }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  const caller = authData.user;

  if (authError || !caller) {
    return json(request, { error: 'unauthorized' }, 401);
  }

  let payload: { class_id?: string };
  try {
    payload = await request.json();
  } catch {
    return json(request, { error: 'invalid_request' }, 400);
  }

  const classId = payload.class_id?.trim() ?? '';
  if (!uuidPattern.test(classId)) {
    return json(request, { error: 'invalid_class_id' }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [
    { data: profile, error: profileError },
    { data: roleRow, error: roleError },
    { data: classRow, error: classError },
  ] = await Promise.all([
    serviceClient
      .from('profiles')
      .select('full_name,nickname,avatar_url,is_approved,is_blocked')
      .eq('user_id', caller.id)
      .maybeSingle(),
    serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle(),
    serviceClient
      .from('classes')
      .select('id,name,code,status,teacher_id')
      .eq('id', classId)
      .maybeSingle(),
  ]);

  if (profileError || roleError) {
    console.error('KOJAC Live account lookup failed', profileError, roleError);
    return json(request, { error: 'server_lookup_failed' }, 500);
  }

  if (classError) {
    console.error('KOJAC Live class lookup failed', classError);
    return json(request, { error: 'server_lookup_failed' }, 500);
  }

  if (!profile || !roleRow) {
    return json(request, { error: 'account_not_ready' }, 403);
  }

  if (!profile.is_approved || profile.is_blocked) {
    return json(request, { error: 'account_not_ready' }, 403);
  }

  if (!classRow) {
    return json(request, { error: 'class_not_found' }, 404);
  }

  const role = String(roleRow.role);
  let moderator = false;

  if (role === 'siswa') {
    if (classRow.status !== 'active') {
      return json(request, { error: 'class_not_active' }, 409);
    }

    const { data: enrollment, error: enrollmentError } = await serviceClient
      .from('class_enrollments')
      .select('class_id')
      .eq('class_id', classId)
      .eq('user_id', caller.id)
      .eq('status', 'active')
      .maybeSingle();

    if (enrollmentError) {
      console.error('KOJAC Live enrollment lookup failed', enrollmentError);
      return json(request, { error: 'server_lookup_failed' }, 500);
    }

    if (!enrollment) {
      return json(request, { error: 'student_not_enrolled' }, 403);
    }
  } else if (teachingRoles.has(role)) {
    if (!['planned', 'active'].includes(classRow.status)) {
      return json(request, { error: 'class_not_active' }, 409);
    }

    let canTeach = managementRoles.has(role) || classRow.teacher_id === caller.id;

    if (!canTeach && role === 'pengajar') {
      const today = jakartaDate();
      const { data: substitute, error: substituteError } = await serviceClient
        .from('class_teacher_assignments')
        .select('id')
        .eq('class_id', classId)
        .eq('teacher_id', caller.id)
        .eq('is_active', true)
        .lte('starts_on', today)
        .gte('ends_on', today)
        .limit(1)
        .maybeSingle();

      if (substituteError) {
        console.error('KOJAC Live substitute lookup failed', substituteError);
        return json(request, { error: 'server_lookup_failed' }, 500);
      }

      canTeach = Boolean(substitute);
    }

    if (!canTeach) {
      return json(request, { error: 'teacher_class_access_denied' }, 403);
    }

    moderator = true;
  } else {
    return json(request, { error: 'live_classroom_access_denied' }, 403);
  }

  const { data: liveState, error: liveStateError } = await callerClient
    .rpc('get_live_classroom_state', { p_class_id: classId })
    .maybeSingle();

  if (liveStateError) {
    console.error('KOJAC Live session lookup failed', liveStateError);
    return json(request, { error: 'server_lookup_failed' }, 500);
  }

  if (!liveState?.session_id || liveState.session_status !== 'active') {
    return json(request, { error: 'session_not_active' }, 409);
  }

  const provider = String(liveState.provider ?? '').trim();
  const roomName = String(liveState.provider_room_name ?? '').trim();
  const configuredProvider = (Deno.env.get('LIVE_CLASSROOM_PROVIDER') || 'jaas').trim();

  if (!provider || !roomName || provider !== configuredProvider) {
    return json(request, { error: 'provider_configuration_mismatch' }, 503);
  }

  if (provider !== 'jaas') {
    return json(request, { error: 'provider_not_supported' }, 503);
  }

  const appId = Deno.env.get('JAAS_APP_ID')?.trim() ?? '';
  const apiKeyId = Deno.env.get('JAAS_API_KEY_ID')?.trim() ?? '';
  const privateKey = privateKeyPem();

  if (!appId || !apiKeyId || !privateKey) {
    console.error('KOJAC Live JaaS configuration incomplete');
    return json(request, { error: 'provider_not_configured' }, 503);
  }

  const displayName =
    profile.nickname?.trim()
    || profile.full_name?.trim()
    || 'Pengguna KOJAC';

  const recordingEnabled =
    moderator && Deno.env.get('JAAS_RECORDING_ENABLED') === 'true';

  const now = Math.floor(Date.now() / 1000);

  try {
    const signingKey = await importPKCS8(privateKey, 'RS256');

    const token = await new SignJWT({
      room: roomName,
      context: {
        user: {
          id: caller.id,
          name: displayName,
          email: caller.email ?? '',
          avatar: profile.avatar_url ?? '',
          moderator: moderator ? 'true' : 'false',
        },
        features: {
          livestreaming: false,
          recording: recordingEnabled ? 'true' : 'false',
          transcription: false,
          'outbound-call': false,
        },
        room: {
          regex: false,
        },
      },
    })
      .setProtectedHeader({
        alg: 'RS256',
        kid: apiKeyId,
        typ: 'JWT',
      })
      .setAudience('jitsi')
      .setIssuer('chat')
      .setSubject(appId)
      .setNotBefore(now - 10)
      .setExpirationTime(now + 4 * 60 * 60)
      .sign(signingKey);

    return json(request, {
      provider: 'jaas',
      session_id: liveState.session_id,
      app_id: appId,
      room_name: roomName,
      jwt: token,
      class_name: classRow.name,
      class_code: classRow.code,
      display_name: displayName,
      email: caller.email ?? '',
      avatar_url: profile.avatar_url,
      moderator,
      recording_enabled: recordingEnabled,
    });
  } catch (error) {
    console.error('KOJAC Live JWT signing failed', error);
    return json(request, { error: 'provider_token_failed' }, 500);
  }
});
