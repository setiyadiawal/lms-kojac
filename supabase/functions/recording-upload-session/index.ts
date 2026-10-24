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

type UploadContext = {
  recording_id: string;
  class_id: string;
  is_published: boolean;
  has_drive_source: boolean;
  has_media_source: boolean;
  media_object_key: string | null;
  media_mime_type: string | null;
  media_size_bytes: number | string | null;
};

type UploadSession = {
  version: 1;
  user_id: string;
  recording_id: string;
  object_key: string;
  upload_id: string;
  mime_type: typeof MIME_TYPE;
  size_bytes: number;
  issued_at: number;
  expires_at: number;
};

type CompletedPart = {
  part_number: number;
  etag: string;
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

async function createSessionToken(session: UploadSession, secret: string) {
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
  const value = parsed as Partial<UploadSession>;

  if (
    value.version !== 1
    || typeof value.user_id !== 'string'
    || typeof value.recording_id !== 'string'
    || typeof value.object_key !== 'string'
    || typeof value.upload_id !== 'string'
    || value.mime_type !== MIME_TYPE
    || typeof value.size_bytes !== 'number'
    || !Number.isSafeInteger(value.size_bytes)
    || value.size_bytes <= 0
    || typeof value.issued_at !== 'number'
    || typeof value.expires_at !== 'number'
    || !uuidPattern.test(value.user_id)
    || !uuidPattern.test(value.recording_id)
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

  return value as UploadSession;
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

function mapRpcError(message: string) {
  if (/recording_not_found/i.test(message)) return { status: 404, error: 'recording_not_found' };
  if (/recording_manage_access_denied|teacher_class_access_denied/i.test(message)) {
    return { status: 403, error: 'forbidden' };
  }
  return { status: 500, error: 'recording_lookup_failed' };
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
    console.error('KOJAC recording upload session missing server configuration');
    return json(request, { error: 'server_configuration_error' }, 500);
  }

  const r2Endpoint = validatedR2Endpoint(r2AccountId, r2EndpointRaw);
  if (!r2Endpoint) {
    console.error('KOJAC recording upload session has invalid R2 endpoint configuration');
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

  const getUploadContext = async (recordingId: string) => {
    const { data, error } = await callerClient.rpc('get_class_recording_upload_context', {
      p_recording_id: recordingId,
    });

    if (error) {
      const mapped = mapRpcError(error.message || '');
      return { context: null, response: json(request, { error: mapped.error }, mapped.status) };
    }

    const row = (Array.isArray(data) ? data[0] : data) as UploadContext | null;
    if (!row?.recording_id) {
      return { context: null, response: json(request, { error: 'recording_not_found' }, 404) };
    }

    return { context: row, response: null };
  };

  const contextMatchesSessionMedia = (
    context: UploadContext,
    session: UploadSession,
  ) => {
    if (context.media_object_key !== session.object_key) return false;
    if (context.media_mime_type !== session.mime_type) return false;

    const attachedSize = Number(context.media_size_bytes);
    return Number.isSafeInteger(attachedSize) && attachedSize === session.size_bytes;
  };

  const abortSessionMultipartBestEffort = async (
    session: UploadSession,
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
      if (abortResponse.status === 404) return 'already_finalized_or_missing' as const;

      const body = await abortResponse.text();
      console.error('KOJAC R2 losing multipart abort rejected', {
        reason,
        status: abortResponse.status,
        body: body.slice(0, 500),
      });
      return 'failed' as const;
    } catch (error) {
      console.error('KOJAC R2 losing multipart abort failed', { reason, error });
      return 'failed' as const;
    }
  };

  const deleteSessionCandidateObjectBestEffort = async (
    session: UploadSession,
    reason: string,
  ) => {
    const candidateUrl = objectUrl(r2Endpoint, r2Bucket, session.object_key);

    try {
      const deleteResponse = await signedFetch(
        signer,
        new Request(candidateUrl, { method: 'DELETE' }),
      );

      if (deleteResponse.ok || deleteResponse.status === 404) return true;

      const body = await deleteResponse.text();
      console.error('KOJAC R2 losing candidate cleanup rejected', {
        reason,
        status: deleteResponse.status,
        body: body.slice(0, 500),
      });
      return false;
    } catch (error) {
      console.error('KOJAC R2 losing candidate cleanup failed', { reason, error });
      return false;
    }
  };

  const handleFinalizedValidationFailure = async (
    session: UploadSession,
    errorCode: 'completed_object_size_mismatch' | 'completed_object_mime_mismatch',
  ) => {
    const refreshed = await getUploadContext(session.recording_id);

    if (refreshed.response || !refreshed.context) {
      console.error('KOJAC finalized upload validation failed and authoritative DB state could not be verified; cleanup required', {
        recording_id: session.recording_id,
        error: errorCode,
      });
      return json(request, { error: errorCode }, 409);
    }

    const current = refreshed.context;

    if (current.media_object_key === session.object_key) {
      console.error('KOJAC finalized upload validation failed but candidate object is already authoritative; cleanup intentionally skipped', {
        recording_id: session.recording_id,
        error: errorCode,
      });
      return json(request, { error: 'recording_attached_media_validation_mismatch' }, 409);
    }

    const cleaned = await deleteSessionCandidateObjectBestEffort(
      session,
      errorCode,
    );
    if (!cleaned) {
      console.error('KOJAC finalized invalid upload requires cleanup', {
        recording_id: session.recording_id,
        error: errorCode,
      });
    }

    return json(request, { error: errorCode }, 409);
  };

  if (operation === 'initiate') {
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

    const { context, response } = await getUploadContext(recordingId);
    if (response || !context) return response!;

    if (context.is_published) {
      return json(request, { error: 'recording_must_be_unpublished' }, 409);
    }
    if (context.has_drive_source || context.has_media_source) {
      return json(request, { error: 'recording_source_already_exists' }, 409);
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
      console.error('KOJAC R2 multipart initiate request failed', error);
      return json(request, { error: 'multipart_initiate_failed' }, 502);
    }

    const initiateBody = await initiateResponse.text();
    if (!initiateResponse.ok || /<Error[>\s]/i.test(initiateBody)) {
      console.error('KOJAC R2 multipart initiate rejected', initiateResponse.status, initiateBody.slice(0, 500));
      return json(request, { error: 'multipart_initiate_failed' }, 502);
    }

    const uploadId = xmlValue(initiateBody, 'UploadId');
    if (!uploadId) {
      console.error('KOJAC R2 multipart initiate response missing UploadId');
      return json(request, { error: 'multipart_initiate_failed' }, 502);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const session: UploadSession = {
      version: 1,
      user_id: authData.user.id,
      recording_id: recordingId,
      object_key: objectKey,
      upload_id: uploadId,
      mime_type: MIME_TYPE,
      size_bytes: sizeBytes,
      issued_at: nowSeconds,
      expires_at: nowSeconds + sessionTtlSeconds,
    };

    const sessionToken = await createSessionToken(session, sessionSecret);
    return json(request, {
      session_token: sessionToken,
      expires_at: new Date(session.expires_at * 1000).toISOString(),
    });
  }

  const sessionToken = typeof payload.session_token === 'string'
    ? payload.session_token.trim()
    : '';
  const session = sessionToken
    ? await parseSessionToken(sessionToken, sessionSecret)
    : null;

  if (!session || session.user_id !== authData.user.id) {
    return json(request, { error: 'invalid_upload_session' }, 401);
  }

  const { context, response } = await getUploadContext(session.recording_id);
  if (response || !context) return response!;

  if (operation === 'sign_part') {
    if (context.is_published || context.has_drive_source || context.has_media_source) {
      return json(request, { error: 'recording_not_available_for_upload' }, 409);
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
      console.error('KOJAC R2 multipart part signing failed', error);
      return json(request, { error: 'part_signing_failed' }, 500);
    }
  }

  if (operation === 'complete') {
    if (context.media_object_key) {
      if (context.media_object_key === session.object_key) {
        if (contextMatchesSessionMedia(context, session)) {
          return json(request, {
            completed: true,
            recording_id: session.recording_id,
            status: context.is_published ? 'published' : 'ready_unpublished',
          });
        }

        console.error('KOJAC attached recording media metadata does not match upload session', {
          recording_id: session.recording_id,
        });
        return json(request, { error: 'recording_attached_media_metadata_mismatch' }, 409);
      }

      const abortResult = await abortSessionMultipartBestEffort(
        session,
        'different_media_session_already_attached',
      );
      if (abortResult === 'already_finalized_or_missing') {
        await deleteSessionCandidateObjectBestEffort(
          session,
          'different_media_session_already_attached',
        );
      }
      return json(request, { error: 'recording_media_already_attached' }, 409);
    }

    if (context.has_drive_source) {
      const abortResult = await abortSessionMultipartBestEffort(
        session,
        'drive_source_attached_before_complete',
      );
      if (abortResult === 'already_finalized_or_missing') {
        await deleteSessionCandidateObjectBestEffort(
          session,
          'drive_source_attached_before_complete',
        );
      }
      return json(request, { error: 'recording_not_available_for_upload' }, 409);
    }

    if (context.is_published) {
      return json(request, { error: 'recording_not_available_for_upload' }, 409);
    }

    const parts = parseCompletedParts(payload.parts);
    if (!parts) {
      return json(request, { error: 'invalid_completed_parts' }, 400);
    }

    const finalObjectUrl = objectUrl(r2Endpoint, r2Bucket, session.object_key);

    const headObject = async () => {
      try {
        const response = await signedFetch(
          signer,
          new Request(finalObjectUrl, { method: 'HEAD' }),
        );
        return response;
      } catch (error) {
        console.error('KOJAC R2 HEAD request failed', error);
        return null;
      }
    };

    let headResponse = await headObject();

    if (!headResponse || headResponse.status === 404) {
      const completeUrl = objectUrl(r2Endpoint, r2Bucket, session.object_key);
      completeUrl.searchParams.set('uploadId', session.upload_id);
      const xml = completionXml(parts);

      let completeResponse: Response;
      try {
        completeResponse = await signedFetch(
          signer,
          new Request(completeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/xml' },
            body: xml,
          }),
        );
      } catch (error) {
        console.error('KOJAC R2 multipart complete request failed', error);
        return json(request, { error: 'multipart_complete_failed' }, 502);
      }

      const completeBody = await completeResponse.text();
      if (!completeResponse.ok || /<Error[>\s]/i.test(completeBody)) {
        console.error('KOJAC R2 multipart complete rejected', completeResponse.status, completeBody.slice(0, 500));
        return json(request, { error: 'multipart_complete_failed' }, 502);
      }

      headResponse = await headObject();
    }

    if (!headResponse?.ok) {
      console.error('KOJAC R2 completed object verification failed', headResponse?.status ?? 'network_error');
      return json(request, { error: 'completed_object_verification_failed' }, 502);
    }

    const actualSize = Number(headResponse.headers.get('Content-Length'));
    if (!Number.isSafeInteger(actualSize) || actualSize !== session.size_bytes) {
      console.error('KOJAC R2 completed object size mismatch', {
        expected: session.size_bytes,
        actual: Number.isFinite(actualSize) ? actualSize : null,
      });
      return handleFinalizedValidationFailure(
        session,
        'completed_object_size_mismatch',
      );
    }

    const actualMime = (headResponse.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    if (actualMime && actualMime !== MIME_TYPE) {
      console.error('KOJAC R2 completed object MIME mismatch', actualMime);
      return handleFinalizedValidationFailure(
        session,
        'completed_object_mime_mismatch',
      );
    }

    const { error: attachError } = await adminClient.rpc('attach_class_recording_media_verified', {
      p_recording_id: session.recording_id,
      p_media_object_key: session.object_key,
      p_media_mime_type: MIME_TYPE,
      p_media_size_bytes: session.size_bytes,
    });

    if (attachError) {
      console.error('KOJAC verified recording media attach failed', attachError);

      const refreshed = await getUploadContext(session.recording_id);
      if (refreshed.response || !refreshed.context) {
        console.error('KOJAC media attach failed and authoritative DB state could not be verified; cleanup required', {
          recording_id: session.recording_id,
        });
        return json(request, { error: 'media_attach_state_verification_failed' }, 500);
      }

      const current = refreshed.context;

      if (current.media_object_key === session.object_key) {
        if (contextMatchesSessionMedia(current, session)) {
          return json(request, {
            completed: true,
            recording_id: session.recording_id,
            status: current.is_published ? 'published' : 'ready_unpublished',
          });
        }

        console.error('KOJAC authoritative media key matches session but metadata verification is inconsistent; cleanup intentionally skipped', {
          recording_id: session.recording_id,
        });
        return json(request, { error: 'recording_attached_media_metadata_mismatch' }, 500);
      }

      if (current.media_object_key || current.has_drive_source) {
        const cleaned = await deleteSessionCandidateObjectBestEffort(
          session,
          'different_source_won_after_r2_complete',
        );
        if (!cleaned) {
          console.error('KOJAC losing completed upload requires cleanup', {
            recording_id: session.recording_id,
          });
        }
        return json(request, { error: 'recording_media_already_attached' }, 409);
      }

      const cleaned = await deleteSessionCandidateObjectBestEffort(
        session,
        'attach_failed_without_authoritative_media',
      );
      if (!cleaned) {
        console.error('KOJAC failed completed upload requires cleanup', {
          recording_id: session.recording_id,
        });
      }
      return json(request, { error: 'media_attach_failed' }, 500);
    }

    return json(request, {
      completed: true,
      recording_id: session.recording_id,
      status: 'ready_unpublished',
    });
  }

  if (operation === 'abort') {
    const abortUrl = objectUrl(r2Endpoint, r2Bucket, session.object_key);
    abortUrl.searchParams.set('uploadId', session.upload_id);

    let abortResponse: Response;
    try {
      abortResponse = await signedFetch(
        signer,
        new Request(abortUrl, { method: 'DELETE' }),
      );
    } catch (error) {
      console.error('KOJAC R2 multipart abort request failed', error);
      return json(request, { error: 'multipart_abort_failed' }, 502);
    }

    if (!abortResponse.ok && abortResponse.status !== 404) {
      const body = await abortResponse.text();
      console.error('KOJAC R2 multipart abort rejected', abortResponse.status, body.slice(0, 500));
      return json(request, { error: 'multipart_abort_failed' }, 502);
    }

    return json(request, {
      aborted: true,
      already_finalized: abortResponse.status === 404,
      recording_id: session.recording_id,
    });
  }

  return json(request, { error: 'invalid_operation' }, 400);
});
