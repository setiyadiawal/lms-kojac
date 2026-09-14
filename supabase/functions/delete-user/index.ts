import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PRODUCTION_ORIGIN = 'https://lms.kojac.id';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const roleRank: Record<string, number> = {
  umum: 0,
  siswa: 1,
  pengajar: 2,
  administrator: 3,
  co_founder: 4,
  founder: 5,
};

const deleteRoles = new Set(['administrator', 'co_founder', 'founder']);

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
    console.error('KOJAC delete-user missing Supabase runtime configuration');
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

  let payload: { target_user_id?: string };
  try {
    payload = await request.json();
  } catch {
    return json(request, { error: 'invalid_request' }, 400);
  }

  const targetUserId = payload.target_user_id?.trim() ?? '';
  if (!uuidPattern.test(targetUserId)) {
    return json(request, { error: 'invalid_target' }, 400);
  }

  if (targetUserId === caller.id) {
    return json(request, { error: 'self_delete_forbidden' }, 403);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: callerRoleRow, error: callerRoleError }, { data: targetRoleRow, error: targetRoleError }, { data: targetProfile, error: targetProfileError }] = await Promise.all([
    serviceClient.from('user_roles').select('role').eq('user_id', caller.id).maybeSingle(),
    serviceClient.from('user_roles').select('role').eq('user_id', targetUserId).maybeSingle(),
    serviceClient.from('profiles').select('full_name,nickname').eq('user_id', targetUserId).maybeSingle(),
  ]);

  if (callerRoleError || !callerRoleRow || !deleteRoles.has(callerRoleRow.role)) {
    return json(request, { error: 'forbidden' }, 403);
  }

  if (targetRoleError || targetProfileError || !targetRoleRow || !targetProfile) {
    return json(request, { error: 'target_not_found' }, 404);
  }

  const callerRank = roleRank[callerRoleRow.role] ?? -1;
  const targetRank = roleRank[targetRoleRow.role] ?? Number.MAX_SAFE_INTEGER;
  if (targetRank >= callerRank) {
    return json(request, { error: 'target_role_not_deletable' }, 403);
  }

  const targetName = (targetProfile.nickname || targetProfile.full_name || 'Tanpa nama').trim();
  const auditDetails = {
    status: 'requested',
    target_user_id_snapshot: targetUserId,
    target_name: targetName,
    target_role: targetRoleRow.role,
  };

  const { data: auditRow, error: auditError } = await serviceClient
    .from('admin_audit_logs')
    .insert({
      actor_id: caller.id,
      action: 'delete_user',
      target_user_id: targetUserId,
      details: auditDetails,
    })
    .select('id')
    .single();

  if (auditError || !auditRow) {
    console.error('KOJAC delete-user could not create audit record', auditError);
    return json(request, { error: 'audit_unavailable' }, 500);
  }

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(targetUserId);

  if (deleteError) {
    console.error('KOJAC delete-user Auth deletion failed', deleteError);
    await serviceClient
      .from('admin_audit_logs')
      .update({ details: { ...auditDetails, status: 'failed' } })
      .eq('id', auditRow.id);
    return json(request, { error: 'delete_failed' }, 500);
  }

  await serviceClient
    .from('admin_audit_logs')
    .update({
      details: {
        ...auditDetails,
        status: 'success',
        deleted_at: new Date().toISOString(),
      },
    })
    .eq('id', auditRow.id);

  return json(request, { deleted: true });
});
