import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AwsClient } from 'npm:aws4fetch@1.0.20';

const PRODUCTION_ORIGIN = 'https://lms.kojac.id';
const DEVELOPMENT_ORIGIN = 'http://localhost:5174';
const DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60;
const MIN_SESSION_TTL_SECONDS = 60 * 60;
const MAX_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_PART_URL_TTL_SECONDS = 15 * 60;
const MIN_PART_URL_TTL_SECONDS = 5 * 60;
const MAX_PART_URL_TTL_SECONDS = 60 * 60;
const MAX_MULTIPART_PARTS = 10_000;
const MIME_TYPE = 'video/mp4';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type LifecycleContext = {
  recording_id: string;
  class_id: string;
  is_published: boolean;
  has_drive_source: boolean;
  has_media_source: boolean;
  media_mime_type: string | null;
  media_size_bytes: number | string | null;
  updated_at: string;
};

type ReplaceSession = {
  version: 1;
  user_id: string;
  recording_id: string;
  class_id: string;
  object_key: string;
  upload_id: string;
  mime_type: typeof MIME_TYPE;
  size_bytes: number;
  expected_updated_at: string;
  expected_has_drive_source: boolean;
  expected_has_media_source: boolean;
  issued_at: number;
  expires_at: number;
};

type CompletedPart = {
  part_number: number;
  etag: string;
};

type CleanupAuthorization = {
  cleanup_job_id: string;
  class_id: string;
  reason: string;
  status: string;
  attempt_count: number;
  not_before: string;
  completed_at: string | null;
};

type CleanupClaim = {
  cleanup_job_id: string;
  object_key: string | null;
  reason: string;
  attempt_count: number;
};

type DueCleanupRow = {
  cleanup_job_id: string;
};

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

function numericEnv(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const configured = Number(Deno.env.get(name));
  if (!Number.isFinite(configured)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(configured)));
}

function encodedObjectKey(value: string) {
  return value
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function objectUrl(endpoint: URL, bucket: string, objectKey: string) {
  const url = new URL(endpoint);
  url.pathname = `/${encodeURIComponent(bucket)}/${encodedObjectKey(objectKey)}`;
  return url;
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

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function createSessionToken(session: ReplaceSession, secret: string) {
  const payloadBytes = encoder.encode(JSON.stringify(session));
  const payload = bytesToBase64Url(payloadBytes);
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, payloadBytes);
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function parseSessionToken(token: string, secret: string) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  let payloadBytes: Uint8Array;
  let signatureBytes: Uint8Array;
  try {
    payloadBytes = base64UrlToBytes(parts[0]);
    signatureBytes = base64UrlToBytes(parts[1]);
  } catch {
    return null;
  }

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    payloadBytes,
  );
  if (!valid) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(payloadBytes));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const value = parsed as Partial<ReplaceSession>;

  if (
    value.version !== 1
    || typeof value.user_id !== 'string'
    || typeof value.recording_id !== 'string'
    || typeof value.class_id !== 'string'
    || typeof value.object_key !== 'string'
    || typeof value.upload_id !== 'string'
    || value.mime_type !== MIME_TYPE
    || typeof value.size_bytes !== 'number'
    || !Number.isSafeInteger(value.size_bytes)
    || value.size_bytes <= 0
    || typeof value.expected_updated_at !== 'string'
    || typeof value.expected_has_drive_source !== 'boolean'
    || typeof value.expected_has_media_source !== 'boolean'
    || typeof value.issued_at !== 'number'
    || typeof value.expires_at !== 'number'
    || !uuidPattern.test(value.user_id)
    || !uuidPattern.test(value.recording_id)
    || !uuidPattern.test(value.class_id)
    || value.upload_id.length < 1
    || value.upload_id.length > 4096
    || value.expires_at <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  const expectedPrefix = `recordings/${value.recording_id}/source-`;
  if (
    !value.object_key.startsWith(expectedPrefix)
    || !/^recordings\/[0-9a-f-]{36}\/source-[0-9a-f-]{36}\.mp4$/i.test(value.object_key)
  ) {
    return null;
  }

  return value as ReplaceSession;
}

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function xmlValue(xml: string, tag: string) {
  const expression = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
  const match = xml.match(expression);
  if (!match) return '';
  return match[1]
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function normalizeEtag(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 256 || /[\r\n<>]/.test(trimmed)) return '';
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed;
  return `"${trimmed.replaceAll('"', '')}"`;
}

function parseCompletedParts(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_MULTIPART_PARTS) {
    return null;
  }

  const parts: CompletedPart[] = [];
  const seen = new Set<number>();

  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const candidate = item as { part_number?: unknown; etag?: unknown };
    const partNumber = Number(candidate.part_number);
    const etag = typeof candidate.etag === 'string' ? normalizeEtag(candidate.etag) : '';

    if (
      !Number.isInteger(partNumber)
      || partNumber < 1
      || partNumber > MAX_MULTIPART_PARTS
      || seen.has(partNumber)
      || !etag
    ) {
      return null;
    }

    seen.add(partNumber);
    parts.push({ part_number: partNumber, etag });
  }

  parts.sort((left, right) => left.part_number - right.part_number);

  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index].part_number !== index + 1) return null;
  }

  return parts;
}

function completionXml(parts: CompletedPart[]) {
  const body = parts
    .map((part) => (
      `<Part><PartNumber>${part.part_number}</PartNumber><ETag>${xmlEscape(part.etag)}</ETag></Part>`
    ))
    .join('');
  return `<CompleteMultipartUpload>${body}</CompleteMultipartUpload>`;
}

async function signedFetch(signer: AwsClient, request: Request) {
  const signedRequest = await signer.sign(request);
  return fetch(signedRequest);
}

function rowFromRpc<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] ?? null) as T | null;
  if (data && typeof data === 'object') return data as T;
  return null;
}

function mapRpcError(message: string) {
  if (/recording_not_found/i.test(message)) return { status: 404, error: 'recording_not_found' };
  if (/recording_cleanup_job_not_found/i.test(message)) return { status: 404, error: 'cleanup_job_not_found' };
  if (/recording_manage_access_denied|teacher_class_access_denied/i.test(message)) {
    return { status: 403, error: 'forbidden' };
  }
  if (/recording_must_be_unpublished_for_replace/i.test(message)) {
    return { status: 409, error: 'recording_must_be_unpublished_for_replace' };
  }
  if (/recording_must_be_unpublished_for_delete/i.test(message)) {
    return { status: 409, error: 'recording_must_be_unpublished_for_delete' };
  }
  if (/recording_source_required_for_replace/i.test(message)) {
    return { status: 409, error: 'recording_source_required_for_replace' };
  }
  if (/recording_replace_state_changed/i.test(message)) {
    return { status: 409, error: 'recording_replace_state_changed' };
  }
  if (/recording_delete_state_changed/i.test(message)) {
    return { status: 409, error: 'recording_delete_state_changed' };
  }
  if (/recording_replace_expected_state_required|recording_delete_expected_state_required/i.test(message)) {
    return { status: 409, error: 'recording_lifecycle_state_changed' };
  }
  if (/recording_cleanup_not_ready/i.test(message)) {
    return { status: 409, error: 'cleanup_not_ready' };
  }
  if (/recording_cleanup_object_authoritative/i.test(message)) {
    return { status: 409, error: 'cleanup_object_authoritative' };
  }
  if (/recording_media_object_key_invalid|recording_cleanup_object_key_invalid/i.test(message)) {
    return { status: 400, error: 'invalid_object_key' };
  }
  return { status: 500, error: 'recording_lifecycle_failed' };
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
  const r2AccountId = Deno.env.get('R2_ACCOUNT_ID')?.trim();
  const r2AccessKeyId = Deno.env.get('R2_UPLOAD_ACCESS_KEY_ID')?.trim();
  const r2SecretAccessKey = Deno.env.get('R2_UPLOAD_SECRET_ACCESS_KEY')?.trim();
  const r2Bucket = Deno.env.get('R2_BUCKET_NAME')?.trim();
  const r2EndpointRaw = Deno.env.get('R2_ENDPOINT')?.trim();
  const r2Region = Deno.env.get('R2_REGION')?.trim() || 'auto';
  const sessionSecret = Deno.env.get('RECORDING_UPLOAD_SESSION_SECRET')?.trim();

  if (
    !supabaseUrl
    || !anonKey
    || !serviceRoleKey
    || !r2AccountId
    || !r2AccessKeyId
    || !r2SecretAccessKey
    || !r2Bucket
    || !r2EndpointRaw
    || !sessionSecret
    || sessionSecret.length < 32
  ) {
    console.error('KOJAC recording media lifecycle missing server configuration');
    return json(request, { error: 'server_configuration_error' }, 500);
  }

  const r2Endpoint = validatedR2Endpoint(r2AccountId, r2EndpointRaw);
  if (!r2Endpoint) {
    console.error('KOJAC recording media lifecycle has invalid R2 endpoint configuration');
    return json(request, { error: 'server_configuration_error' }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) {
    return json(request, { error: 'unauthorized' }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json(request, { error: 'invalid_request' }, 400);
  }

  const operation = typeof payload.operation === 'string'
    ? payload.operation.trim().toLowerCase()
    : '';

  const signer = new AwsClient({
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
    service: 's3',
    region: r2Region,
  });

  const sessionTtlSeconds = numericEnv(
    'RECORDING_UPLOAD_SESSION_TTL_SECONDS',
    DEFAULT_SESSION_TTL_SECONDS,
    MIN_SESSION_TTL_SECONDS,
    MAX_SESSION_TTL_SECONDS,
  );
  const partUrlTtlSeconds = numericEnv(
    'R2_UPLOAD_PART_TTL_SECONDS',
    DEFAULT_PART_URL_TTL_SECONDS,
    MIN_PART_URL_TTL_SECONDS,
    MAX_PART_URL_TTL_SECONDS,
  );

  const getLifecycleContext = async (recordingId: string) => {
    const { data, error } = await callerClient.rpc('get_class_recording_lifecycle_context', {
      p_recording_id: recordingId,
    });

    if (error) {
      const mapped = mapRpcError(error.message || '');
      return { context: null, response: json(request, { error: mapped.error }, mapped.status) };
    }

    const row = rowFromRpc<LifecycleContext>(data);
    if (!row?.recording_id) {
      return { context: null, response: json(request, { error: 'recording_not_found' }, 404) };
    }

    return { context: row, response: null };
  };

  const objectKeyIsAuthoritative = async (objectKey: string) => {
    const { data, error } = await adminClient.rpc(
      'is_recording_media_object_authoritative_verified',
      { p_object_key: objectKey },
    );

    if (error) return { authoritative: false, error };
    return { authoritative: data === true, error: null };
  };

  const candidateIsAuthoritative = async (session: ReplaceSession) => (
    objectKeyIsAuthoritative(session.object_key)
  );

  const enqueueCandidateCleanup = async (session: ReplaceSession) => {
    const { data, error } = await adminClient.rpc('enqueue_recording_media_candidate_cleanup', {
      p_recording_id: session.recording_id,
      p_class_id: session.class_id,
      p_object_key: session.object_key,
    });

    if (error) {
      console.error('KOJAC candidate cleanup could not be queued', {
        recording_id: session.recording_id,
        error: error.message,
      });
      return null;
    }

    return typeof data === 'string' ? data : null;
  };

  const deleteCandidateObjectBestEffort = async (
    session: ReplaceSession,
    reason: string,
  ) => {
    const authority = await candidateIsAuthoritative(session);
    if (authority.error) {
      console.error('KOJAC candidate cleanup deferred because authoritative DB state could not be verified', {
        recording_id: session.recording_id,
        reason,
      });
      await enqueueCandidateCleanup(session);
      return 'queued' as const;
    }
    if (authority.authoritative) {
      console.error('KOJAC candidate cleanup skipped because object is authoritative', {
        recording_id: session.recording_id,
        reason,
      });
      return 'authoritative' as const;
    }

    const candidateUrl = objectUrl(r2Endpoint, r2Bucket, session.object_key);

    try {
      const deleteResponse = await signedFetch(
        signer,
        new Request(candidateUrl, { method: 'DELETE' }),
      );

      if (deleteResponse.ok || deleteResponse.status === 404) {
        return 'deleted' as const;
      }

      console.error('KOJAC candidate cleanup rejected', {
        recording_id: session.recording_id,
        reason,
        status: deleteResponse.status,
      });
    } catch (error) {
      console.error('KOJAC candidate cleanup failed', {
        recording_id: session.recording_id,
        reason,
        error,
      });
    }

    await enqueueCandidateCleanup(session);
    return 'queued' as const;
  };

  const abortReplaceMultipartBestEffort = async (
    session: ReplaceSession,
    reason: string,
  ) => {
    const abortUrl = objectUrl(r2Endpoint, r2Bucket, session.object_key);
    abortUrl.searchParams.set('uploadId', session.upload_id);

    try {
      const abortResponse = await signedFetch(
        signer,
        new Request(abortUrl, { method: 'DELETE' }),
      );

      if (abortResponse.ok) return 'aborted' as const;
      if (abortResponse.status === 404) {
        return deleteCandidateObjectBestEffort(session, reason);
      }

      console.error('KOJAC replace multipart abort rejected', {
        recording_id: session.recording_id,
        reason,
        status: abortResponse.status,
      });
      return 'failed' as const;
    } catch (error) {
      console.error('KOJAC replace multipart abort failed', {
        recording_id: session.recording_id,
        reason,
        error,
      });
      return 'failed' as const;
    }
  };

  const runCleanupJob = async (cleanupJobId: string) => {
    const { data: claimData, error: claimError } = await adminClient.rpc(
      'claim_recording_media_cleanup',
      { p_cleanup_job_id: cleanupJobId },
    );

    if (claimError) {
      const mapped = mapRpcError(claimError.message || '');

      if (mapped.error === 'cleanup_object_authoritative') {
        await adminClient.rpc('fail_recording_media_cleanup', {
          p_cleanup_job_id: cleanupJobId,
          p_last_error: 'cleanup_object_authoritative',
        });
      }

      return {
        status: mapped.error === 'cleanup_not_ready' ? 'pending' : 'protected',
        error: mapped.error,
      } as const;
    }

    const claim = rowFromRpc<CleanupClaim>(claimData);
    if (!claim?.cleanup_job_id) {
      return { status: 'pending', error: 'cleanup_claim_failed' } as const;
    }

    if (!claim.object_key) {
      return { status: 'completed', error: null } as const;
    }

    // Second exact-key authoritative check immediately before finalized R2 DELETE.
    // If DB state cannot be verified, protect the object and keep the durable job pending.
    const authority = await objectKeyIsAuthoritative(claim.object_key);
    if (authority.error) {
      await adminClient.rpc('fail_recording_media_cleanup', {
        p_cleanup_job_id: cleanupJobId,
        p_last_error: 'authoritative_state_verification_failed',
      });
      return {
        status: 'protected',
        error: 'authoritative_state_verification_failed',
      } as const;
    }

    if (authority.authoritative) {
      await adminClient.rpc('fail_recording_media_cleanup', {
        p_cleanup_job_id: cleanupJobId,
        p_last_error: 'cleanup_object_authoritative',
      });
      return { status: 'protected', error: 'cleanup_object_authoritative' } as const;
    }

    const targetUrl = objectUrl(r2Endpoint, r2Bucket, claim.object_key);

    try {
      const deleteResponse = await signedFetch(
        signer,
        new Request(targetUrl, { method: 'DELETE' }),
      );

      if (deleteResponse.ok || deleteResponse.status === 404) {
        const { error: completeError } = await adminClient.rpc(
          'complete_recording_media_cleanup',
          { p_cleanup_job_id: cleanupJobId },
        );

        if (completeError) {
          console.error('KOJAC cleanup completion state update failed', {
            cleanup_job_id: cleanupJobId,
            error: completeError.message,
          });
          return { status: 'pending', error: 'cleanup_state_update_failed' } as const;
        }

        return { status: 'completed', error: null } as const;
      }

      const errorCode = `r2_delete_http_${deleteResponse.status}`;
      await adminClient.rpc('fail_recording_media_cleanup', {
        p_cleanup_job_id: cleanupJobId,
        p_last_error: errorCode,
      });
      return { status: 'pending', error: errorCode } as const;
    } catch (error) {
      await adminClient.rpc('fail_recording_media_cleanup', {
        p_cleanup_job_id: cleanupJobId,
        p_last_error: 'r2_delete_network_failure',
      });
      console.error('KOJAC cleanup R2 delete failed', {
        cleanup_job_id: cleanupJobId,
        error,
      });
      return { status: 'pending', error: 'r2_delete_network_failure' } as const;
    }
  };

  if (operation === 'replace_initiate') {
    const recordingId = typeof payload.recording_id === 'string'
      ? payload.recording_id.trim()
      : '';
    const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
    const mimeType = typeof payload.mime_type === 'string' ? payload.mime_type.trim() : '';
    const sizeBytes = Number(payload.size_bytes);

    if (!uuidPattern.test(recordingId)) {
      return json(request, { error: 'invalid_recording_id' }, 400);
    }
    if (!filename || filename.length > 255 || !filename.toLowerCase().endsWith('.mp4')) {
      return json(request, { error: 'invalid_filename' }, 400);
    }
    if (mimeType !== MIME_TYPE) {
      return json(request, { error: 'unsupported_media_type' }, 415);
    }
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
      return json(request, { error: 'invalid_size_bytes' }, 400);
    }

    const { context, response } = await getLifecycleContext(recordingId);
    if (response || !context) return response!;

    if (context.is_published) {
      return json(request, { error: 'recording_must_be_unpublished_for_replace' }, 409);
    }
    if (!context.has_drive_source && !context.has_media_source) {
      return json(request, { error: 'recording_source_required_for_replace' }, 409);
    }

    const uploadVersion = crypto.randomUUID();
    const objectKey = `recordings/${recordingId}/source-${uploadVersion}.mp4`;
    const initiateUrl = objectUrl(r2Endpoint, r2Bucket, objectKey);
    initiateUrl.searchParams.set('uploads', '');

    let initiateResponse: Response;
    try {
      initiateResponse = await signedFetch(
        signer,
        new Request(initiateUrl, {
          method: 'POST',
          headers: { 'Content-Type': MIME_TYPE },
        }),
      );
    } catch (error) {
      console.error('KOJAC replacement multipart initiate failed', error);
      return json(request, { error: 'multipart_initiate_failed' }, 502);
    }

    const initiateBody = await initiateResponse.text();
    if (!initiateResponse.ok || /<Error[>\s]/i.test(initiateBody)) {
      console.error('KOJAC replacement multipart initiate rejected', initiateResponse.status);
      return json(request, { error: 'multipart_initiate_failed' }, 502);
    }

    const uploadId = xmlValue(initiateBody, 'UploadId');
    if (!uploadId) {
      return json(request, { error: 'multipart_initiate_failed' }, 502);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const session: ReplaceSession = {
      version: 1,
      user_id: authData.user.id,
      recording_id: context.recording_id,
      class_id: context.class_id,
      object_key: objectKey,
      upload_id: uploadId,
      mime_type: MIME_TYPE,
      size_bytes: sizeBytes,
      expected_updated_at: context.updated_at,
      expected_has_drive_source: context.has_drive_source,
      expected_has_media_source: context.has_media_source,
      issued_at: nowSeconds,
      expires_at: nowSeconds + sessionTtlSeconds,
    };

    const sessionToken = await createSessionToken(session, sessionSecret);
    return json(request, {
      session_token: sessionToken,
      expires_at: new Date(session.expires_at * 1000).toISOString(),
    });
  }

  if (operation === 'delete_recording') {
    const recordingId = typeof payload.recording_id === 'string'
      ? payload.recording_id.trim()
      : '';

    if (!uuidPattern.test(recordingId)) {
      return json(request, { error: 'invalid_recording_id' }, 400);
    }

    // Caller-authorized lifecycle context is the browser-facing permission boundary.
    const { context, response } = await getLifecycleContext(recordingId);
    if (response || !context) return response!;

    if (context.is_published) {
      return json(request, { error: 'recording_must_be_unpublished_for_delete' }, 409);
    }

    // Destructive DB saga is service-role-only and compares the exact state
    // that was authorized above to prevent stale/racing deletes.
    const { data, error } = await adminClient.rpc(
      'delete_class_recording_lifecycle_verified',
      {
        p_recording_id: recordingId,
        p_expected_updated_at: context.updated_at,
        p_expected_has_drive_source: context.has_drive_source,
        p_expected_has_media_source: context.has_media_source,
      },
    );

    if (error) {
      const mapped = mapRpcError(error.message || '');
      return json(request, { error: mapped.error }, mapped.status);
    }

    const result = rowFromRpc<{
      cleanup_job_id: string | null;
      cleanup_required: boolean;
      source_type: string;
    }>(data);

    if (!result) {
      return json(request, { error: 'recording_delete_state_invalid' }, 500);
    }

    if (!result.cleanup_required || !result.cleanup_job_id) {
      return json(request, {
        deleted: true,
        recording_id: recordingId,
        source_type: result.source_type,
        cleanup_status: 'not_required',
      });
    }

    const cleanup = await runCleanupJob(result.cleanup_job_id);
    return json(request, {
      deleted: true,
      recording_id: recordingId,
      source_type: result.source_type,
      cleanup_job_id: result.cleanup_job_id,
      cleanup_status: cleanup.status,
      ...(cleanup.error ? { cleanup_error: cleanup.error } : {}),
    });
  }

  if (operation === 'cleanup_retry') {
    const cleanupJobId = typeof payload.cleanup_job_id === 'string'
      ? payload.cleanup_job_id.trim()
      : '';

    if (!uuidPattern.test(cleanupJobId)) {
      return json(request, { error: 'invalid_cleanup_job_id' }, 400);
    }

    const { data, error } = await callerClient.rpc('authorize_recording_media_cleanup', {
      p_cleanup_job_id: cleanupJobId,
    });

    if (error) {
      const mapped = mapRpcError(error.message || '');
      return json(request, { error: mapped.error }, mapped.status);
    }

    const authorizationRow = rowFromRpc<CleanupAuthorization>(data);
    if (!authorizationRow?.cleanup_job_id) {
      return json(request, { error: 'cleanup_job_not_found' }, 404);
    }

    if (authorizationRow.status === 'completed') {
      return json(request, {
        cleanup_job_id: cleanupJobId,
        cleanup_status: 'completed',
      });
    }

    if (new Date(authorizationRow.not_before).getTime() > Date.now()) {
      return json(request, {
        error: 'cleanup_not_ready',
        not_before: authorizationRow.not_before,
      }, 409);
    }

    const cleanup = await runCleanupJob(cleanupJobId);
    return json(request, {
      cleanup_job_id: cleanupJobId,
      cleanup_status: cleanup.status,
      ...(cleanup.error ? { cleanup_error: cleanup.error } : {}),
    });
  }

  if (operation === 'cleanup_due') {
    const requestedLimit = Number(payload.limit);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(20, Math.max(1, requestedLimit))
      : 5;

    const { data, error } = await callerClient.rpc(
      'get_due_recording_media_cleanup_jobs',
      { p_limit: limit },
    );

    if (error) {
      const mapped = mapRpcError(error.message || '');
      return json(request, { error: mapped.error }, mapped.status);
    }

    const rows = (Array.isArray(data) ? data : []) as DueCleanupRow[];
    let cleanedCount = 0;
    let pendingCount = 0;
    let protectedCount = 0;

    for (const row of rows.slice(0, limit)) {
      if (!row?.cleanup_job_id || !uuidPattern.test(row.cleanup_job_id)) continue;

      const cleanup = await runCleanupJob(row.cleanup_job_id);
      if (cleanup.status === 'completed') cleanedCount += 1;
      else if (cleanup.status === 'protected') protectedCount += 1;
      else pendingCount += 1;
    }

    return json(request, {
      cleanup_due: true,
      examined_count: Math.min(rows.length, limit),
      cleaned_count: cleanedCount,
      pending_count: pendingCount,
      protected_count: protectedCount,
    });
  }

  const sessionToken = typeof payload.session_token === 'string'
    ? payload.session_token.trim()
    : '';
  const session = sessionToken
    ? await parseSessionToken(sessionToken, sessionSecret)
    : null;

  if (!session || session.user_id !== authData.user.id) {
    return json(request, { error: 'invalid_replace_session' }, 401);
  }

  if (operation === 'replace_sign_part') {
    const { context, response } = await getLifecycleContext(session.recording_id);
    if (response || !context) return response!;

    if (context.class_id !== session.class_id) {
      return json(request, { error: 'recording_replace_state_changed' }, 409);
    }
    if (context.is_published) {
      return json(request, { error: 'recording_must_be_unpublished_for_replace' }, 409);
    }
    if (!context.has_drive_source && !context.has_media_source) {
      return json(request, { error: 'recording_source_required_for_replace' }, 409);
    }
    if (context.updated_at !== session.expected_updated_at) {
      return json(request, { error: 'recording_replace_state_changed' }, 409);
    }

    const partNumber = Number(payload.part_number);
    if (
      !Number.isInteger(partNumber)
      || partNumber < 1
      || partNumber > MAX_MULTIPART_PARTS
    ) {
      return json(request, { error: 'invalid_part_number' }, 400);
    }

    const partUrl = objectUrl(r2Endpoint, r2Bucket, session.object_key);
    partUrl.searchParams.set('partNumber', String(partNumber));
    partUrl.searchParams.set('uploadId', session.upload_id);
    partUrl.searchParams.set('X-Amz-Expires', String(partUrlTtlSeconds));

    try {
      const signedRequest = await signer.sign(
        new Request(partUrl, { method: 'PUT' }),
        { aws: { signQuery: true } },
      );

      return json(request, {
        url: signedRequest.url,
        method: 'PUT',
        part_number: partNumber,
        expires_at: new Date(Date.now() + partUrlTtlSeconds * 1000).toISOString(),
      });
    } catch (error) {
      console.error('KOJAC replacement part signing failed', error);
      return json(request, { error: 'part_signing_failed' }, 500);
    }
  }

  if (operation === 'replace_abort') {
    const result = await abortReplaceMultipartBestEffort(session, 'client_replace_abort');
    return json(request, {
      aborted: true,
      recording_id: session.recording_id,
      cleanup_status: result,
    });
  }

  if (operation !== 'replace_complete') {
    return json(request, { error: 'operation_not_supported' }, 400);
  }

  // Final caller authorization/state gate. Replacement sessions can outlive a
  // class-management assignment, so JWT + session ownership alone are not
  // sufficient at COMPLETE time. Re-run the caller-authorized lifecycle
  // context before finalizing multipart or attempting the authoritative swap.
  const {
    context: completeContext,
    response: completeContextResponse,
  } = await getLifecycleContext(session.recording_id);

  if (completeContextResponse || !completeContext) {
    await abortReplaceMultipartBestEffort(
      session,
      'replace_complete_authorization_recheck_failed',
    );
    return completeContextResponse!;
  }

  const completeStateMatchesSession =
    completeContext.recording_id === session.recording_id
    && completeContext.class_id === session.class_id
    && !completeContext.is_published
    && (completeContext.has_drive_source || completeContext.has_media_source)
    && completeContext.updated_at === session.expected_updated_at
    && completeContext.has_drive_source === session.expected_has_drive_source
    && completeContext.has_media_source === session.expected_has_media_source;

  if (!completeStateMatchesSession) {
    // Preserve idempotent/ambiguous retry safety. If an earlier COMPLETE already
    // committed this exact candidate, it is authoritative and must never be
    // deleted merely because updated_at/source state now differs from session
    // expectations. No new destructive action is performed in this branch.
    const authority = await candidateIsAuthoritative(session);
    if (!authority.error && authority.authoritative) {
      return json(request, {
        replaced: true,
        recording_id: session.recording_id,
        status: completeContext.is_published ? 'published' : 'ready_unpublished',
        cleanup_scheduled: session.expected_has_media_source,
      });
    }

    await abortReplaceMultipartBestEffort(
      session,
      'replace_complete_state_changed',
    );

    if (completeContext.is_published) {
      return json(request, { error: 'recording_must_be_unpublished_for_replace' }, 409);
    }

    return json(request, { error: 'recording_replace_state_changed' }, 409);
  }

  const parts = parseCompletedParts(payload.parts);
  if (!parts) {
    return json(request, { error: 'invalid_completed_parts' }, 400);
  }

  const finalObjectUrl = objectUrl(r2Endpoint, r2Bucket, session.object_key);

  const headObject = async () => {
    try {
      return await signedFetch(
        signer,
        new Request(finalObjectUrl, { method: 'HEAD' }),
      );
    } catch (error) {
      console.error('KOJAC replacement HEAD failed', error);
      return null;
    }
  };

  let headResponse = await headObject();

  if (!headResponse || headResponse.status === 404) {
    const completeUrl = objectUrl(r2Endpoint, r2Bucket, session.object_key);
    completeUrl.searchParams.set('uploadId', session.upload_id);

    let completeResponse: Response;
    try {
      completeResponse = await signedFetch(
        signer,
        new Request(completeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/xml' },
          body: completionXml(parts),
        }),
      );
    } catch (error) {
      console.error('KOJAC replacement multipart complete failed', error);
      return json(request, { error: 'multipart_complete_failed' }, 502);
    }

    const completeBody = await completeResponse.text();
    if (!completeResponse.ok || /<Error[>\s]/i.test(completeBody)) {
      console.error('KOJAC replacement multipart complete rejected', completeResponse.status);
      return json(request, { error: 'multipart_complete_failed' }, 502);
    }

    headResponse = await headObject();
  }

  if (!headResponse?.ok) {
    return json(request, { error: 'completed_object_verification_failed' }, 502);
  }

  const actualSize = Number(headResponse.headers.get('Content-Length'));
  if (!Number.isSafeInteger(actualSize) || actualSize !== session.size_bytes) {
    await deleteCandidateObjectBestEffort(session, 'replacement_size_mismatch');
    return json(request, { error: 'completed_object_size_mismatch' }, 409);
  }

  const actualMime = (headResponse.headers.get('Content-Type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (actualMime !== MIME_TYPE) {
    await deleteCandidateObjectBestEffort(session, 'replacement_mime_mismatch');
    return json(request, { error: 'completed_object_mime_mismatch' }, 409);
  }

  const { data: commitData, error: commitError } = await adminClient.rpc(
    'commit_class_recording_media_replacement_verified',
    {
      p_recording_id: session.recording_id,
      p_expected_updated_at: session.expected_updated_at,
      p_expected_has_drive_source: session.expected_has_drive_source,
      p_expected_has_media_source: session.expected_has_media_source,
      p_new_media_object_key: session.object_key,
      p_new_media_mime_type: MIME_TYPE,
      p_new_media_size_bytes: session.size_bytes,
    },
  );

  if (commitError) {
    const authority = await candidateIsAuthoritative(session);
    if (!authority.error && authority.authoritative) {
      return json(request, {
        replaced: true,
        recording_id: session.recording_id,
        status: 'ready_unpublished',
        cleanup_scheduled: session.expected_has_media_source,
      });
    }

    await deleteCandidateObjectBestEffort(session, 'replacement_commit_failed');
    const mapped = mapRpcError(commitError.message || '');
    return json(request, { error: mapped.error }, mapped.status);
  }

  const commit = rowFromRpc<{
    cleanup_job_id: string | null;
    cleanup_not_before: string | null;
    already_committed: boolean;
  }>(commitData);

  if (!commit) {
    const authority = await candidateIsAuthoritative(session);
    if (!authority.error && authority.authoritative) {
      return json(request, {
        replaced: true,
        recording_id: session.recording_id,
        status: 'ready_unpublished',
        cleanup_scheduled: session.expected_has_media_source,
      });
    }

    await deleteCandidateObjectBestEffort(session, 'replacement_commit_state_invalid');
    return json(request, { error: 'replacement_commit_state_invalid' }, 500);
  }

  return json(request, {
    replaced: true,
    recording_id: session.recording_id,
    status: 'ready_unpublished',
    cleanup_scheduled: Boolean(commit.cleanup_job_id),
    cleanup_job_id: commit.cleanup_job_id,
    cleanup_not_before: commit.cleanup_not_before,
    already_committed: commit.already_committed,
  });
});
