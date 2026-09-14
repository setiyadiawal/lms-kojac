import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const adminRoles = new Set(['administrator', 'co_founder', 'founder']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
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

function normalizeAppOrigin(request: Request) {
  const configured = Deno.env.get('KOJAC_APP_URL')?.trim();
  const candidate = configured || request.headers.get('Origin') || '';
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.origin;
  } catch {
    return '';
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('KOJAC approval function missing Supabase runtime configuration');
    return json({ error: 'server_configuration_error' }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerAuth, error: callerAuthError } = await callerClient.auth.getUser();
  const caller = callerAuth.user;
  if (callerAuthError || !caller) {
    return json({ error: 'unauthorized' }, 401);
  }

  const { data: callerRole, error: callerRoleError } = await callerClient
    .from('user_roles')
    .select('role')
    .eq('user_id', caller.id)
    .maybeSingle();

  if (callerRoleError || !callerRole || !adminRoles.has(callerRole.role)) {
    return json({ error: 'forbidden' }, 403);
  }

  let payload: { target_user_id?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid_request' }, 400);
  }

  const targetUserId = payload.target_user_id?.trim() ?? '';
  if (!uuidPattern.test(targetUserId) || targetUserId === caller.id) {
    return json({ error: 'invalid_target' }, 400);
  }

  const { data: targetProfile, error: targetProfileError } = await callerClient
    .from('profiles')
    .select('user_id,full_name,nickname,is_approved,is_blocked,approved_at')
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (targetProfileError || !targetProfile) {
    return json({ error: 'target_not_found' }, 404);
  }

  if (targetProfile.is_approved && !targetProfile.is_blocked) {
    return json({ approved: true, email_sent: false, already_approved: true });
  }

  if (targetProfile.is_blocked) {
    return json({ error: 'target_blocked' }, 409);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: targetAuthResult, error: targetAuthError } = await serviceClient.auth.admin.getUserById(targetUserId);
  const targetAuthUser = targetAuthResult.user;

  if (targetAuthError || !targetAuthUser?.email) {
    console.error('KOJAC approval notification could not resolve target auth user', targetAuthError);
    return json({ error: 'target_auth_unavailable' }, 500);
  }

  if (!targetAuthUser.email_confirmed_at) {
    return json({ error: 'email_not_verified' }, 409);
  }

  const { error: approvalError } = await callerClient.rpc('set_user_approval', {
    p_target_user: targetUserId,
    p_approved: true,
    p_blocked: false,
  });

  if (approvalError) {
    console.error('KOJAC approval RPC failed', approvalError);
    return json({ error: 'approval_failed' }, 403);
  }

  const { data: approvedProfile, error: approvedProfileError } = await serviceClient
    .from('profiles')
    .select('full_name,nickname,is_approved,is_blocked,approved_at')
    .eq('user_id', targetUserId)
    .single();

  if (approvedProfileError || !approvedProfile?.is_approved || !approvedProfile.approved_at) {
    console.error('KOJAC approval succeeded but updated profile could not be resolved', approvedProfileError);
    return json({ approved: true, email_sent: false, warning: 'notification_state_unavailable' });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL')?.trim();
  const appOrigin = normalizeAppOrigin(request);

  if (!resendApiKey || !resendFromEmail || !appOrigin) {
    console.error('KOJAC approval email is not fully configured');
    return json({ approved: true, email_sent: false, warning: 'notification_not_configured' });
  }

  const displayName = (approvedProfile.nickname || approvedProfile.full_name || 'Siswa KOJAC').trim();
  const safeName = escapeHtml(displayName);
  const loginUrl = `${appOrigin}/login`;
  const approvedAt = new Date(approvedProfile.approved_at).toISOString();
  const idempotencyKey = `kojac-approval/${targetUserId}/${approvedAt}`;

  const html = `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:0;background:#f7f3f4;font-family:Arial,sans-serif;color:#241a1c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f7f3f4;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #eadde0;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:28px 30px;background:#7b1f2f;color:#ffffff;">
            <div style="font-size:13px;letter-spacing:.12em;font-weight:700;">KOJAC LMS</div>
            <div style="font-size:28px;font-weight:800;margin-top:8px;">ようこそ、KOJACへ！</div>
          </td></tr>
          <tr><td style="padding:30px;line-height:1.65;">
            <p style="margin-top:0;">Halo <strong>${safeName}</strong>,</p>
            <p>Akun KOJAC LMS Anda telah disetujui oleh administrator.</p>
            <p>Anda sekarang dapat masuk ke KOJAC LMS dan mengakses dashboard serta materi belajar.</p>
            <p style="margin:28px 0;">
              <a href="${loginUrl}" style="display:inline-block;background:#7b1f2f;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px;">Masuk ke KOJAC LMS</a>
            </p>
            <p style="margin-bottom:0;"><strong>一緒に一生懸命勉強しましょう！</strong></p>
            <p style="margin-top:8px;color:#76666a;">KOJAC — Kuuhaku Online Japanese Class</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
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
    return json({ approved: true, email_sent: false, warning: 'notification_provider_failed' });
  }

  return json({ approved: true, email_sent: true });
});
