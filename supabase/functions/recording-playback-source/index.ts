import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AwsClient } from 'npm:aws4fetch@1.0.20';

const PRODUCTION_ORIGIN = 'https://lms.kojac.id';
const DEVELOPMENT_ORIGIN = 'http://localhost:5174';
const DEFAULT_TTL_SECONDS = 6 * 60 * 60;
const MIN_TTL_SECONDS = 60 * 60;
const MAX_TTL_SECONDS = 7 * 24 * 60 * 60;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function corsOrigin(request: Request) {
  const requestOrigin = safeOrigin(request.headers.get('Origin'));
  const allowedOrigins = new Set([
    PRODUCTION_ORIGIN,
    DEVELOPMENT_ORIGIN,
  ]);

  if (!requestOrigin) return PRODUCTION_ORIGIN;
  return allowedOrigins.has(requestOrigin) ? requestOrigin : '';
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

function encodedObjectKey(value: string) {
  return value
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function playbackTtlSeconds() {
  const configured = Number(Deno.env.get('R2_PLAYBACK_TTL_SECONDS'));
  if (!Number.isFinite(configured)) return DEFAULT_TTL_SECONDS;
  return Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, Math.floor(configured)));
}

function validatedR2Endpoint(accountId: string, rawEndpoint: string) {
  let endpoint: URL;
  try {
    endpoint = new URL(rawEndpoint.trim());
  } catch {
    return null;
  }

  if (
    endpoint.protocol !== 'https:'
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash
    || (endpoint.pathname !== '/' && endpoint.pathname !== '')
  ) {
    return null;
  }

  const hostname = endpoint.hostname.toLowerCase();
  const account = accountId.toLowerCase();
  const validHosts = new Set([
    `${account}.r2.cloudflarestorage.com`,
    `${account}.eu.r2.cloudflarestorage.com`,
    `${account}.us.r2.cloudflarestorage.com`,
    `${account}.fedramp.r2.cloudflarestorage.com`,
  ]);

  if (!validHosts.has(hostname)) return null;
  endpoint.pathname = '/';
  return endpoint;
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
  const r2AccountId = Deno.env.get('R2_ACCOUNT_ID')?.trim();
  const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')?.trim();
  const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')?.trim();
  const r2Bucket = Deno.env.get('R2_BUCKET_NAME')?.trim();
  const r2EndpointRaw = Deno.env.get('R2_ENDPOINT')?.trim();
  const r2Region = Deno.env.get('R2_REGION')?.trim() || 'auto';

  if (
    !supabaseUrl
    || !anonKey
    || !r2AccountId
    || !r2AccessKeyId
    || !r2SecretAccessKey
    || !r2Bucket
    || !r2EndpointRaw
  ) {
    console.error('KOJAC recording playback source missing server configuration');
    return json(request, { error: 'server_configuration_error' }, 500);
  }

  const r2Endpoint = validatedR2Endpoint(r2AccountId, r2EndpointRaw);
  if (!r2Endpoint) {
    console.error('KOJAC recording playback source has invalid R2 endpoint configuration');
    return json(request, { error: 'server_configuration_error' }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) {
    return json(request, { error: 'unauthorized' }, 401);
  }

  let payload: { recording_id?: string };
  try {
    payload = await request.json();
  } catch {
    return json(request, { error: 'invalid_request' }, 400);
  }

  const recordingId = payload.recording_id?.trim() ?? '';
  if (!uuidPattern.test(recordingId)) {
    return json(request, { error: 'invalid_recording_id' }, 400);
  }

  const { data, error } = await callerClient.rpc('get_recording_playback_locator', {
    p_recording_id: recordingId,
  });

  if (error) {
    const message = error.message || '';
    if (/recording_not_found/i.test(message)) {
      return json(request, { error: 'recording_not_found' }, 404);
    }
    if (/recording_access_denied|student_access_required|teacher_class_access_denied/i.test(message)) {
      return json(request, { error: 'forbidden' }, 403);
    }

    console.error('KOJAC recording playback locator failed', error);
    return json(request, { error: 'playback_lookup_failed' }, 500);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const objectKey = typeof row?.media_object_key === 'string'
    ? row.media_object_key.trim()
    : '';

  if (!objectKey) {
    return json(request, { available: false }, 200);
  }

  const ttlSeconds = playbackTtlSeconds();
  const objectUrl = new URL(r2Endpoint);
  objectUrl.pathname = `/${encodeURIComponent(r2Bucket)}/${encodedObjectKey(objectKey)}`;
  objectUrl.searchParams.set('X-Amz-Expires', String(ttlSeconds));

  const signer = new AwsClient({
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
    service: 's3',
    region: r2Region,
  });

  const signedRequest = await signer.sign(
    new Request(objectUrl, { method: 'GET' }),
    { aws: { signQuery: true } },
  );

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  return json(request, {
    available: true,
    source: {
      url: signedRequest.url,
      type: typeof row?.media_mime_type === 'string' && row.media_mime_type
        ? row.media_mime_type
        : 'video/mp4',
      expiresAt,
    },
  });
});
