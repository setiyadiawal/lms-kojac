import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PRODUCTION_ORIGIN = 'https://lms.kojac.id';
const adminRoles = new Set(['administrator', 'co_founder', 'founder']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const configuredOrigin = safeOrigin(Deno.env.get('KOJAC_APP_URL'));
  const allowedOrigins = new Set([
    PRODUCTION_ORIGIN,
    configuredOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean));

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
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function applicationOrigin(request: Request) {
  return safeOrigin(Deno.env.get('KOJAC_APP_URL')) || corsOrigin(request) || PRODUCTION_ORIGIN;
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
    console.error('KOJAC approval notification missing Supabase runtime configuration');
    return json(request, { error: 'server_configuration_error' }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerAuth, error: callerAuthError } = await callerClient.auth.getUser();
  const caller = callerAuth.user;
  if (callerAuthError || !caller) {
    return json(request, { error: 'unauthorized' }, 401);
  }

  const { data: callerRole, error: callerRoleError } = await callerClient
    .from('user_roles')
    .select('role')
    .eq('user_id', caller.id)
    .maybeSingle();

  if (callerRoleError || !callerRole || !adminRoles.has(callerRole.role)) {
    return json(request, { error: 'forbidden' }, 403);
  }

  let payload: { target_user_id?: string };
  try {
    payload = await request.json();
  } catch {
    return json(request, { error: 'invalid_request' }, 400);
  }

  const targetUserId = payload.target_user_id?.trim() ?? '';
  if (!uuidPattern.test(targetUserId) || targetUserId === caller.id) {
    return json(request, { error: 'invalid_target' }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: targetProfile, error: targetProfileError } = await serviceClient
    .from('profiles')
    .select('full_name,nickname,is_approved,is_blocked')
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (targetProfileError || !targetProfile) {
    return json(request, { error: 'target_not_found' }, 404);
  }

  // Notification is secondary. This function never approves or changes the account.
  if (!targetProfile.is_approved || targetProfile.is_blocked) {
    return json(request, { error: 'target_not_approved' }, 409);
  }

  const { data: targetAuthResult, error: targetAuthError } = await serviceClient.auth.admin.getUserById(targetUserId);
  const targetAuthUser = targetAuthResult.user;

  if (targetAuthError || !targetAuthUser?.email) {
    console.error('KOJAC approval notification could not resolve target auth user', targetAuthError);
    return json(request, { error: 'target_auth_unavailable' }, 500);
  }

  if (!targetAuthUser.email_confirmed_at) {
    return json(request, { error: 'email_not_verified' }, 409);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL')?.trim();
  const appOrigin = applicationOrigin(request);

  if (!resendApiKey || !resendFromEmail || !appOrigin) {
    console.error('KOJAC approval email is not fully configured');
    return json(request, { email_sent: false, warning: 'notification_not_configured' }, 503);
  }

  const displayName = (targetProfile.nickname || targetProfile.full_name || 'Siswa KOJAC').trim();
  const safeName = escapeHtml(displayName);
  const loginUrl = `${appOrigin}/login`;

  const html = `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:0;background:#fffff;font-family:Arial,sans-serif;color:#241a1c;">
 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #222;">
  <h2 style="color: #7b1f2f; margin-bottom: 16px;">
    お知らせです！
  </h2>


<p style="margin-top:0;">Halo <strong>${safeName}</strong>,</p>
  
            <p><strong>Selamat !</strong>  Akun LMS KOJAC Anda telah disetujui oleh administrator.</p>
            <p>Anda sekarang dapat masuk ke LMS KOJAC dan mengakses dashboard serta materi belajar.</p>
            <p style="margin:28px 0;">
              <a href="${loginUrl}" style="display:inline-block;background:#7b1f2f;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px;">Masuk ke KOJAC LMS</a>
            </p>
  <p style="font-size: 14px; line-height: 1.6; color: #555;">
    Semoga diberi kemudahan dan kelancaran dalam segala prosesnya. <br>
    <strong>Mari Kita Berjuang Bersama - sama ! </strong>
  </p>

<p>Terima kasih, <br>
Team Kojac</p>

<br
  <p style="margin-top: 28px; font-size: 15px;">
    一緒に一生懸命勉強しましょう！
  </p>

  <p style="font-size: 14px; color: #555;">
    KOJAC — Kuuhaku Online Japanese Class
  </p>
</div>
  </body>
</html>`;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      // Stable per account: retries/rerenders cannot send duplicate approval mail.
      'Idempotency-Key': `kojac-approval-${targetUserId}`,
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [targetAuthUser.email],
      subject: 'Akun KOJAC Anda Telah Disetujui',
      html,
    }),
  });

  if (!resendResponse.ok) {
    const providerError = await resendResponse.text();
    console.error('KOJAC approval email provider error', resendResponse.status, providerError);
    return json(request, { email_sent: false, warning: 'notification_provider_failed' }, 502);
  }

  return json(request, { email_sent: true });
});
