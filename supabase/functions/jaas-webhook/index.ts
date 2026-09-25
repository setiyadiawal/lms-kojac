import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type WebhookPayload = {
  idempotencyKey?: string;
  eventType?: string;
  sessionId?: string;
  timestamp?: number;
  appId?: string;
  fqn?: string;
  data?: Record<string, unknown>;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function decodeBase64(value: string) {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
) {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(',');
  let timestamp = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }

  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isFinite(timestampNumber) || signatures.length === 0) {
    return false;
  }

  if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > 300) {
    return false;
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const expected = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  ));

  for (const candidate of signatures) {
    const actual = decodeBase64(candidate);
    if (!actual || actual.length !== expected.length) continue;

    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) {
      difference |= expected[index] ^ actual[index];
    }

    if (difference === 0) return true;
  }

  return false;
}

function dateFromMillis(value: unknown) {
  const millis = Number(value);
  if (!Number.isFinite(millis) || millis <= 0) return null;
  return new Date(millis).toISOString();
}

function roomNameFromFqn(fqn: string) {
  const slash = fqn.indexOf('/');
  if (slash < 0 || slash === fqn.length - 1) return '';
  return fqn.slice(slash + 1);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const secret = Deno.env.get('JAAS_WEBHOOK_SECRET')?.trim() ?? '';
  const expectedAppId = Deno.env.get('JAAS_APP_ID')?.trim() ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!secret || !expectedAppId || !supabaseUrl || !serviceRoleKey) {
    console.error('KOJAC JaaS webhook configuration incomplete');
    return json({ error: 'webhook_not_configured' }, 503);
  }

  const rawBody = await request.text();
  const signatureValid = await verifySignature(
    rawBody,
    request.headers.get('X-Jaas-Signature'),
    secret,
  );

  if (!signatureValid) {
    console.warn('KOJAC JaaS webhook rejected invalid signature');
    return json({ error: 'invalid_signature' }, 401);
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const idempotencyKey = payload.idempotencyKey?.trim() ?? '';
  const eventType = payload.eventType?.trim() ?? '';
  const fqn = payload.fqn?.trim() ?? '';
  const appId = payload.appId?.trim() ?? '';

  if (!idempotencyKey || !eventType || !fqn || !appId) {
    return json({ error: 'invalid_payload' }, 400);
  }

  if (appId !== expectedAppId) {
    return json({ error: 'app_id_mismatch' }, 403);
  }

  const supported = new Set([
    'RECORDING_STARTED',
    'RECORDING_ENDED',
    'RECORDING_UPLOADED',
  ]);

  if (!supported.has(eventType)) {
    return json({ ok: true, ignored: true });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const privateDb = serviceClient.schema('private');

  const { data: existingEvent, error: existingEventError } = await privateDb
    .from('jaas_webhook_events')
    .select('idempotency_key')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingEventError) {
    console.error('KOJAC JaaS webhook idempotency lookup failed', existingEventError);
    return json({ error: 'server_lookup_failed' }, 500);
  }

  if (existingEvent) {
    return json({ ok: true, duplicate: true });
  }

  const roomName = roomNameFromFqn(fqn);
  if (!roomName) {
    return json({ error: 'invalid_room_name' }, 400);
  }

  const { data: liveSession, error: sessionError } = await privateDb
    .from('live_class_sessions')
    .select('id,class_id,provider,provider_room_name')
    .eq('provider', 'jaas')
    .eq('provider_room_name', roomName)
    .maybeSingle();

  if (sessionError) {
    console.error('KOJAC JaaS webhook live session lookup failed', sessionError);
    return json({ error: 'server_lookup_failed' }, 500);
  }

  if (!liveSession) {
    console.warn('KOJAC JaaS webhook ignored unknown room', roomName);
    return json({ ok: true, ignored: true });
  }

  const eventTimestamp = Number(payload.timestamp);
  const eventIso = dateFromMillis(eventTimestamp) ?? new Date().toISOString();
  const providerMeetingSessionId = payload.sessionId?.trim() || null;
  const data = payload.data ?? {};
  const recordingSessionId =
    typeof data.recordingSessionId === 'string'
      ? data.recordingSessionId.trim()
      : null;

  if (eventType === 'RECORDING_STARTED') {
    const { data: currentJob, error: currentJobError } = await privateDb
      .from('live_recording_jobs')
      .select('id,status')
      .eq('live_session_id', liveSession.id)
      .eq('provider_meeting_session_id', providerMeetingSessionId)
      .in('status', ['recording', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentJobError) {
      console.error('KOJAC JaaS recording start lookup failed', currentJobError);
      return json({ error: 'recording_lookup_failed' }, 500);
    }

    if (!currentJob) {
      const { error: insertError } = await privateDb
        .from('live_recording_jobs')
        .insert({
          live_session_id: liveSession.id,
          class_id: liveSession.class_id,
          provider: 'jaas',
          provider_room_name: roomName,
          provider_meeting_session_id: providerMeetingSessionId,
          status: 'recording',
          started_at: eventIso,
          last_event_timestamp: Number.isFinite(eventTimestamp) ? eventTimestamp : null,
        });

      if (insertError) {
        console.error('KOJAC JaaS recording start insert failed', insertError);
        return json({ error: 'recording_insert_failed' }, 500);
      }
    }
  }

  if (eventType === 'RECORDING_ENDED') {
    const { data: currentJob, error: currentJobError } = await privateDb
      .from('live_recording_jobs')
      .select('id,status')
      .eq('live_session_id', liveSession.id)
      .eq('provider_meeting_session_id', providerMeetingSessionId)
      .in('status', ['recording', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentJobError) {
      console.error('KOJAC JaaS recording end lookup failed', currentJobError);
      return json({ error: 'recording_lookup_failed' }, 500);
    }

    if (currentJob) {
      const { error: updateError } = await privateDb
        .from('live_recording_jobs')
        .update({
          status: 'processing',
          ended_at: eventIso,
          updated_at: new Date().toISOString(),
          last_event_timestamp: Number.isFinite(eventTimestamp) ? eventTimestamp : null,
        })
        .eq('id', currentJob.id);

      if (updateError) {
        console.error('KOJAC JaaS recording end update failed', updateError);
        return json({ error: 'recording_update_failed' }, 500);
      }
    }
  }

  if (eventType === 'RECORDING_UPLOADED') {
    const sourceUrl =
      typeof data.preAuthenticatedLink === 'string'
        ? data.preAuthenticatedLink.trim()
        : '';

    if (!sourceUrl) {
      return json({ error: 'recording_url_missing' }, 400);
    }

    let job: { id: string; status: string } | null = null;

    if (recordingSessionId) {
      const { data: byRecordingId, error: byRecordingIdError } = await privateDb
        .from('live_recording_jobs')
        .select('id,status')
        .eq('provider', 'jaas')
        .eq('provider_recording_session_id', recordingSessionId)
        .maybeSingle();

      if (byRecordingIdError) {
        console.error('KOJAC JaaS recording uploaded id lookup failed', byRecordingIdError);
        return json({ error: 'recording_lookup_failed' }, 500);
      }

      job = byRecordingId;
    }

    if (!job) {
      const { data: latestJob, error: latestJobError } = await privateDb
        .from('live_recording_jobs')
        .select('id,status')
        .eq('live_session_id', liveSession.id)
        .eq('provider_meeting_session_id', providerMeetingSessionId)
        .in('status', ['recording', 'processing', 'ready'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestJobError) {
        console.error('KOJAC JaaS recording uploaded lookup failed', latestJobError);
        return json({ error: 'recording_lookup_failed' }, 500);
      }

      job = latestJob;
    }

    const durationSec = Number(data.durationSec);
    const startIso = dateFromMillis(data.startTimestamp);
    const endIso = dateFromMillis(data.endTimestamp);
    const expiresBase = Number.isFinite(eventTimestamp) ? eventTimestamp : Date.now();
    const expiresAt = new Date(expiresBase + 24 * 60 * 60 * 1000).toISOString();

    const values = {
      provider_recording_session_id: recordingSessionId,
      status: 'ready',
      started_at: startIso ?? eventIso,
      ended_at: endIso,
      uploaded_at: eventIso,
      source_url: sourceUrl,
      source_url_expires_at: expiresAt,
      duration_seconds: Number.isFinite(durationSec) && durationSec >= 0
        ? Math.round(durationSec)
        : null,
      initiator_id:
        typeof data.initiatorId === 'string' ? data.initiatorId : null,
      is_shared:
        typeof data.share === 'boolean' ? data.share : null,
      last_event_timestamp: Number.isFinite(eventTimestamp) ? eventTimestamp : null,
      updated_at: new Date().toISOString(),
    };

    if (job) {
      if (job.status !== 'imported') {
        const { error: updateError } = await privateDb
          .from('live_recording_jobs')
          .update(values)
          .eq('id', job.id);

        if (updateError) {
          console.error('KOJAC JaaS recording uploaded update failed', updateError);
          return json({ error: 'recording_update_failed' }, 500);
        }
      }
    } else {
      const { error: insertError } = await privateDb
        .from('live_recording_jobs')
        .insert({
          live_session_id: liveSession.id,
          class_id: liveSession.class_id,
          provider: 'jaas',
          provider_room_name: roomName,
          provider_meeting_session_id: providerMeetingSessionId,
          ...values,
        });

      if (insertError) {
        console.error('KOJAC JaaS recording uploaded insert failed', insertError);
        return json({ error: 'recording_insert_failed' }, 500);
      }
    }
  }

  const { error: idempotencyInsertError } = await privateDb
    .from('jaas_webhook_events')
    .insert({
      idempotency_key: idempotencyKey,
      event_type: eventType,
      event_timestamp: Number.isFinite(eventTimestamp) ? eventTimestamp : null,
    });

  if (idempotencyInsertError?.code !== '23505') {
    if (idempotencyInsertError) {
      console.error('KOJAC JaaS webhook idempotency insert failed', idempotencyInsertError);
      return json({ error: 'idempotency_write_failed' }, 500);
    }
  }

  return json({ ok: true });
});
