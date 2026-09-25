import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

function read(rel) {
  const target = path.resolve(root, rel);
  if (!fs.existsSync(target)) fail(`File tidak ditemukan: ${rel}`);
  return fs.readFileSync(target, 'utf8');
}

function write(rel, content) {
  const target = path.resolve(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function replaceOnce(content, before, after, label) {
  if (content.includes(after)) return content;
  if (!content.includes(before)) fail(`Anchor tidak ditemukan: ${label}`);
  return content.replace(before, after);
}

const expected = [
  'src/App.tsx',
  'src/pages/MyClassesPage.tsx',
  'src/pages/TeachingClassesPage.tsx',
  'package.json',
  '.env.example',
];

for (const rel of expected) {
  if (!fs.existsSync(path.resolve(root, rel))) {
    fail(`Jalankan installer dari root project KOJAC. Missing: ${rel}`);
  }
}

write("src/features/live-classroom/config.ts", "export const LIVE_CLASSROOM_ENABLED =\n  import.meta.env.VITE_LIVE_CLASSROOM_ENABLED === 'true';\n");
write("src/features/live-classroom/provider.ts", "import { supabase } from '../../lib/supabase';\n\nexport type LiveClassroomProvider = 'jaas';\n\nexport type LiveClassroomAccess = {\n  provider: LiveClassroomProvider;\n  appId: string;\n  roomName: string;\n  jwt: string;\n  className: string;\n  classCode: string | null;\n  displayName: string;\n  email: string;\n  avatarUrl: string | null;\n  moderator: boolean;\n};\n\ntype LiveClassroomAccessResponse = {\n  provider?: string;\n  app_id?: string;\n  room_name?: string;\n  jwt?: string;\n  class_name?: string;\n  class_code?: string | null;\n  display_name?: string;\n  email?: string;\n  avatar_url?: string | null;\n  moderator?: boolean;\n  error?: string;\n};\n\nexport async function requestLiveClassroomAccess(\n  classId: string,\n): Promise<LiveClassroomAccess> {\n  const { data, error } = await supabase.functions.invoke<LiveClassroomAccessResponse>(\n    'live-classroom-access',\n    {\n      body: { class_id: classId },\n    },\n  );\n\n  if (error) {\n    throw new Error('live_classroom_access_failed');\n  }\n\n  if (data?.error) {\n    throw new Error(data.error);\n  }\n\n  if (\n    data?.provider !== 'jaas'\n    || !data.app_id\n    || !data.room_name\n    || !data.jwt\n    || !data.class_name\n    || !data.display_name\n    || !data.email\n    || typeof data.moderator !== 'boolean'\n  ) {\n    throw new Error('live_classroom_invalid_response');\n  }\n\n  return {\n    provider: 'jaas',\n    appId: data.app_id,\n    roomName: data.room_name,\n    jwt: data.jwt,\n    className: data.class_name,\n    classCode: data.class_code ?? null,\n    displayName: data.display_name,\n    email: data.email,\n    avatarUrl: data.avatar_url ?? null,\n    moderator: data.moderator,\n  };\n}\n");
write("src/features/live-classroom/LiveClassroomPage.tsx", "import { JaaSMeeting } from '@jitsi/react-sdk';\nimport {\n  AlertCircle,\n  ArrowLeft,\n  Loader2,\n  RefreshCw,\n  ShieldCheck,\n  Video,\n} from 'lucide-react';\nimport { useCallback, useEffect, useState } from 'react';\nimport { useNavigate, useParams } from 'react-router-dom';\nimport { useAuth } from '../../state/AuthContext';\nimport { LIVE_CLASSROOM_ENABLED } from './config';\nimport {\n  requestLiveClassroomAccess,\n  type LiveClassroomAccess,\n} from './provider';\nimport './live-classroom.css';\n\nfunction messageForError(error: string) {\n  if (error === 'class_not_found') return 'Kelas tidak ditemukan.';\n  if (error === 'class_not_active') return 'Kelas ini belum dapat dimasuki.';\n  if (error === 'student_not_enrolled') return 'Akun Anda tidak terdaftar sebagai siswa aktif pada kelas ini.';\n  if (error === 'teacher_class_access_denied') return 'Anda tidak memiliki akses mengajar pada kelas ini.';\n  if (error === 'account_not_ready') return 'Akun belum memenuhi syarat untuk menggunakan KOJAC Live.';\n  if (error === 'provider_not_configured') return 'KOJAC Live belum selesai dikonfigurasi.';\n  return 'KOJAC Live belum dapat dibuka. Silakan coba lagi.';\n}\n\nexport function LiveClassroomPage() {\n  const { classId } = useParams();\n  const navigate = useNavigate();\n  const { role } = useAuth();\n\n  const [access, setAccess] = useState<LiveClassroomAccess | null>(null);\n  const [loading, setLoading] = useState(true);\n  const [errorCode, setErrorCode] = useState('');\n\n  const backTarget = role === 'siswa' ? '/kelas-saya' : '/kelas-mengajar';\n\n  const loadAccess = useCallback(async () => {\n    if (!LIVE_CLASSROOM_ENABLED) {\n      setLoading(false);\n      return;\n    }\n\n    if (!classId) {\n      setErrorCode('class_not_found');\n      setLoading(false);\n      return;\n    }\n\n    setLoading(true);\n    setErrorCode('');\n\n    try {\n      const nextAccess = await requestLiveClassroomAccess(classId);\n      setAccess(nextAccess);\n    } catch (error) {\n      const code = error instanceof Error ? error.message : 'live_classroom_access_failed';\n      setAccess(null);\n      setErrorCode(code);\n    } finally {\n      setLoading(false);\n    }\n  }, [classId]);\n\n  useEffect(() => {\n    void loadAccess();\n  }, [loadAccess]);\n\n  if (!LIVE_CLASSROOM_ENABLED) {\n    return (\n      <div className=\"page live-classroom-page\">\n        <section className=\"live-classroom-state\">\n          <div className=\"live-classroom-state-icon\"><Video size={28}/></div>\n          <p className=\"eyebrow\">KOJAC LIVE \u00b7 BETA</p>\n          <h1>Live Classroom belum diaktifkan</h1>\n          <p>\n            Foundation KOJAC Live sudah terpasang. Aktifkan feature flag setelah\n            provider dan token server selesai dikonfigurasi.\n          </p>\n          <button type=\"button\" onClick={() => navigate(backTarget)}>\n            <ArrowLeft size={16}/> Kembali\n          </button>\n        </section>\n      </div>\n    );\n  }\n\n  if (loading) {\n    return (\n      <div className=\"page live-classroom-page\">\n        <section className=\"live-classroom-state\" aria-busy=\"true\">\n          <Loader2 className=\"live-classroom-spinner\" size={30}/>\n          <p className=\"eyebrow\">KOJAC LIVE \u00b7 BETA</p>\n          <h1>Menyiapkan kelas\u2026</h1>\n          <p>Memverifikasi kelas dan membuat akses meeting yang aman.</p>\n        </section>\n      </div>\n    );\n  }\n\n  if (!access || errorCode) {\n    return (\n      <div className=\"page live-classroom-page\">\n        <section className=\"live-classroom-state\" role=\"alert\">\n          <div className=\"live-classroom-state-icon is-error\">\n            <AlertCircle size={28}/>\n          </div>\n          <p className=\"eyebrow\">KOJAC LIVE \u00b7 BETA</p>\n          <h1>Kelas belum dapat dibuka</h1>\n          <p>{messageForError(errorCode)}</p>\n          <div className=\"live-classroom-state-actions\">\n            <button type=\"button\" onClick={() => void loadAccess()}>\n              <RefreshCw size={16}/> Coba Lagi\n            </button>\n            <button className=\"secondary\" type=\"button\" onClick={() => navigate(backTarget)}>\n              <ArrowLeft size={16}/> Kembali\n            </button>\n          </div>\n        </section>\n      </div>\n    );\n  }\n\n  return (\n    <div className=\"page live-classroom-page\">\n      <header className=\"live-classroom-header\">\n        <div className=\"live-classroom-header-main\">\n          <button\n            className=\"live-classroom-back\"\n            type=\"button\"\n            onClick={() => navigate(backTarget)}\n          >\n            <ArrowLeft size={17}/> Kembali\n          </button>\n\n          <div>\n            <p className=\"eyebrow\">KOJAC LIVE \u00b7 BETA</p>\n            <h1>{access.className}</h1>\n            <p>\n              {access.classCode ? `${access.classCode} \u00b7 ` : ''}\n              Kelas video langsung di dalam KOJAC LMS.\n            </p>\n          </div>\n        </div>\n\n        <div className=\"live-classroom-role\">\n          <ShieldCheck size={16}/>\n          <span>{access.moderator ? 'Pengajar / Moderator' : 'Siswa'}</span>\n        </div>\n      </header>\n\n      <section className=\"live-classroom-stage\" aria-label=\"KOJAC Live Classroom\">\n        <JaaSMeeting\n          appId={access.appId}\n          roomName={access.roomName}\n          jwt={access.jwt}\n          lang=\"id\"\n          userInfo={{\n            displayName: access.displayName,\n            email: access.email,\n          }}\n          configOverwrite={{\n            prejoinPageEnabled: true,\n            enableWelcomePage: false,\n            disableDeepLinking: true,\n            disableInviteFunctions: true,\n          }}\n          interfaceConfigOverwrite={{\n            MOBILE_APP_PROMO: false,\n            TILE_VIEW_MAX_COLUMNS: 4,\n          }}\n          getIFrameRef={(iframeRef) => {\n            iframeRef.style.width = '100%';\n            iframeRef.style.height = '100%';\n            iframeRef.style.border = '0';\n          }}\n          onReadyToClose={() => navigate(backTarget)}\n        />\n      </section>\n\n      <footer className=\"live-classroom-footer\">\n        <span><Video size={14}/> Audio \u00b7 Video \u00b7 Screen Share \u00b7 Chat</span>\n        <span className=\"live-classroom-beta-note\">\n          Recording server-side belum diaktifkan pada Phase 1A.\n        </span>\n      </footer>\n    </div>\n  );\n}\n");
write("src/features/live-classroom/live-classroom.css", "/* KOJAC LIVE CLASSROOM \u2014 PHASE 1A */\n\n.live-classroom-page{\n  min-width:0;\n  padding-bottom:18px;\n}\n\n.live-classroom-header{\n  display:flex;\n  align-items:flex-end;\n  justify-content:space-between;\n  gap:20px;\n  margin-bottom:14px;\n}\n\n.live-classroom-header-main{\n  min-width:0;\n  display:flex;\n  align-items:flex-start;\n  gap:15px;\n}\n\n.live-classroom-header h1{\n  margin:4px 0 5px;\n  font-size:clamp(24px,2.5vw,36px);\n  line-height:1.08;\n  letter-spacing:-.035em;\n}\n\n.live-classroom-header p:not(.eyebrow){\n  margin:0;\n  color:#75666a;\n  font-size:12px;\n}\n\n.live-classroom-back{\n  flex:0 0 auto;\n  display:inline-flex;\n  align-items:center;\n  gap:6px;\n  min-height:38px;\n  padding:8px 11px;\n  border:1px solid #e3d5d8;\n  border-radius:10px;\n  background:#fff;\n  color:#624d52;\n  font-size:11px;\n  font-weight:800;\n}\n\n.live-classroom-role{\n  flex:0 0 auto;\n  display:inline-flex;\n  align-items:center;\n  gap:7px;\n  padding:8px 11px;\n  border:1px solid #e6d5d8;\n  border-radius:999px;\n  background:#faf5f6;\n  color:#7b1f2f;\n  font-size:10px;\n  font-weight:850;\n}\n\n.live-classroom-stage{\n  width:100%;\n  height:clamp(520px,calc(100dvh - 205px),820px);\n  min-height:520px;\n  overflow:hidden;\n  border:1px solid #dfd3d5;\n  border-radius:16px;\n  background:#151515;\n  box-shadow:0 16px 44px rgba(39,14,19,.08);\n}\n\n.live-classroom-stage>div{\n  width:100%!important;\n  height:100%!important;\n}\n\n.live-classroom-footer{\n  display:flex;\n  align-items:center;\n  justify-content:space-between;\n  gap:12px;\n  padding:10px 2px 0;\n  color:#79696d;\n  font-size:10px;\n}\n\n.live-classroom-footer span{\n  display:inline-flex;\n  align-items:center;\n  gap:6px;\n}\n\n.live-classroom-beta-note{\n  color:#9a858a;\n}\n\n.live-classroom-state{\n  width:min(100%,660px);\n  min-height:420px;\n  margin:clamp(30px,7vh,80px) auto;\n  display:flex;\n  flex-direction:column;\n  align-items:center;\n  justify-content:center;\n  text-align:center;\n  padding:34px;\n  border:1px solid #e5d8da;\n  border-radius:18px;\n  background:#fff;\n  box-shadow:0 18px 50px rgba(50,19,25,.06);\n}\n\n.live-classroom-state-icon{\n  width:52px;\n  height:52px;\n  display:grid;\n  place-items:center;\n  margin-bottom:15px;\n  border-radius:15px;\n  background:#f8eff1;\n  color:#7b1f2f;\n}\n\n.live-classroom-state-icon.is-error{\n  background:#fff1f1;\n  color:#a52a2a;\n}\n\n.live-classroom-state h1{\n  margin:6px 0 9px;\n  font-size:clamp(25px,3vw,34px);\n  letter-spacing:-.035em;\n}\n\n.live-classroom-state>p:not(.eyebrow){\n  max-width:500px;\n  margin:0;\n  color:#75666a;\n  font-size:12px;\n  line-height:1.6;\n}\n\n.live-classroom-state>button,\n.live-classroom-state-actions button{\n  display:inline-flex;\n  align-items:center;\n  justify-content:center;\n  gap:7px;\n  min-height:42px;\n  margin-top:19px;\n  padding:9px 14px;\n  border:1px solid #7b1f2f;\n  border-radius:10px;\n  background:#7b1f2f;\n  color:#fff;\n  font-size:11px;\n  font-weight:800;\n}\n\n.live-classroom-state-actions{\n  display:flex;\n  flex-wrap:wrap;\n  justify-content:center;\n  gap:8px;\n}\n\n.live-classroom-state-actions button.secondary{\n  border-color:#dfd0d3;\n  background:#fff;\n  color:#665256;\n}\n\n.live-classroom-spinner{\n  color:#7b1f2f;\n  animation:live-classroom-spin .9s linear infinite;\n}\n\n@keyframes live-classroom-spin{\n  to{transform:rotate(360deg)}\n}\n\n@media(max-width:760px){\n  .live-classroom-page{\n    padding-inline:10px;\n    padding-bottom:10px;\n  }\n\n  .live-classroom-header{\n    align-items:flex-start;\n    flex-direction:column;\n    gap:10px;\n  }\n\n  .live-classroom-header-main{\n    width:100%;\n    flex-direction:column;\n    gap:9px;\n  }\n\n  .live-classroom-header h1{\n    font-size:25px;\n  }\n\n  .live-classroom-stage{\n    height:calc(100dvh - 230px);\n    min-height:440px;\n    border-radius:13px;\n  }\n\n  .live-classroom-footer{\n    align-items:flex-start;\n    flex-direction:column;\n    gap:4px;\n  }\n}\n\n@media(max-width:420px){\n  .live-classroom-page{\n    padding-inline:6px;\n  }\n\n  .live-classroom-header{\n    margin-bottom:9px;\n  }\n\n  .live-classroom-header p:not(.eyebrow){\n    font-size:10.5px;\n  }\n\n  .live-classroom-stage{\n    height:calc(100dvh - 215px);\n    min-height:410px;\n    border-radius:11px;\n  }\n\n  .live-classroom-state{\n    min-height:360px;\n    padding:24px 17px;\n  }\n}\n\n@media(prefers-reduced-motion:reduce){\n  .live-classroom-spinner{animation:none}\n}\n");
write("supabase/functions/live-classroom-access/index.ts", "import 'jsr:@supabase/functions-js/edge-runtime.d.ts';\nimport { createClient } from 'npm:@supabase/supabase-js@2';\nimport { importPKCS8, SignJWT } from 'npm:jose@5.9.6';\n\nconst PRODUCTION_ORIGIN = 'https://lms.kojac.id';\nconst uuidPattern =\n  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;\n\nconst teachingRoles = new Set([\n  'pengajar',\n  'administrator',\n  'manager',\n  'co_founder',\n  'founder',\n]);\n\nconst managementRoles = new Set([\n  'administrator',\n  'manager',\n  'co_founder',\n  'founder',\n]);\n\nfunction safeOrigin(value: string | undefined | null) {\n  if (!value) return '';\n  try {\n    const parsed = new URL(value.trim());\n    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';\n    return parsed.origin;\n  } catch {\n    return '';\n  }\n}\n\nfunction corsOrigin(request: Request) {\n  const requestOrigin = safeOrigin(request.headers.get('Origin'));\n  const configuredOrigin = safeOrigin(Deno.env.get('KOJAC_APP_URL'));\n  const allowedOrigins = new Set([\n    PRODUCTION_ORIGIN,\n    configuredOrigin,\n    'http://localhost:5173',\n    'http://127.0.0.1:5173',\n  ].filter(Boolean));\n\n  if (!requestOrigin) return PRODUCTION_ORIGIN;\n  return allowedOrigins.has(requestOrigin) ? requestOrigin : '';\n}\n\nfunction corsHeaders(request: Request) {\n  const origin = corsOrigin(request);\n  return {\n    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),\n    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',\n    'Access-Control-Allow-Methods': 'POST, OPTIONS',\n    'Access-Control-Max-Age': '86400',\n    'Vary': 'Origin',\n  };\n}\n\nfunction json(request: Request, body: Record<string, unknown>, status = 200) {\n  return new Response(JSON.stringify(body), {\n    status,\n    headers: {\n      ...corsHeaders(request),\n      'Content-Type': 'application/json; charset=utf-8',\n      'Cache-Control': 'no-store',\n    },\n  });\n}\n\nfunction jakartaDate() {\n  const parts = new Intl.DateTimeFormat('en-CA', {\n    timeZone: 'Asia/Jakarta',\n    year: 'numeric',\n    month: '2-digit',\n    day: '2-digit',\n  }).formatToParts(new Date());\n\n  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));\n  return `${map.year}-${map.month}-${map.day}`;\n}\n\nfunction privateKeyPem() {\n  const direct = Deno.env.get('JAAS_PRIVATE_KEY')?.trim();\n  if (direct) return direct.replaceAll('\\\\n', '\\n');\n\n  const encoded = Deno.env.get('JAAS_PRIVATE_KEY_B64')?.trim();\n  if (!encoded) return '';\n\n  try {\n    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));\n    return new TextDecoder().decode(bytes).trim();\n  } catch {\n    return '';\n  }\n}\n\nDeno.serve(async (request) => {\n  if (request.method === 'OPTIONS') {\n    return new Response(null, { status: 204, headers: corsHeaders(request) });\n  }\n\n  if (request.method !== 'POST') {\n    return json(request, { error: 'method_not_allowed' }, 405);\n  }\n\n  if (!corsOrigin(request)) {\n    return json(request, { error: 'origin_not_allowed' }, 403);\n  }\n\n  const authorization = request.headers.get('Authorization');\n  if (!authorization?.startsWith('Bearer ')) {\n    return json(request, { error: 'unauthorized' }, 401);\n  }\n\n  const supabaseUrl = Deno.env.get('SUPABASE_URL');\n  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');\n  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');\n\n  if (!supabaseUrl || !anonKey || !serviceRoleKey) {\n    console.error('KOJAC Live missing Supabase runtime configuration');\n    return json(request, { error: 'server_configuration_error' }, 500);\n  }\n\n  const callerClient = createClient(supabaseUrl, anonKey, {\n    global: { headers: { Authorization: authorization } },\n    auth: { persistSession: false, autoRefreshToken: false },\n  });\n\n  const { data: authData, error: authError } = await callerClient.auth.getUser();\n  const caller = authData.user;\n\n  if (authError || !caller) {\n    return json(request, { error: 'unauthorized' }, 401);\n  }\n\n  let payload: { class_id?: string };\n  try {\n    payload = await request.json();\n  } catch {\n    return json(request, { error: 'invalid_request' }, 400);\n  }\n\n  const classId = payload.class_id?.trim() ?? '';\n  if (!uuidPattern.test(classId)) {\n    return json(request, { error: 'invalid_class_id' }, 400);\n  }\n\n  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {\n    auth: { persistSession: false, autoRefreshToken: false },\n  });\n\n  const [\n    { data: profile, error: profileError },\n    { data: roleRow, error: roleError },\n    { data: classRow, error: classError },\n  ] = await Promise.all([\n    serviceClient\n      .from('profiles')\n      .select('full_name,nickname,avatar_url,is_approved,is_blocked')\n      .eq('user_id', caller.id)\n      .maybeSingle(),\n    serviceClient\n      .from('user_roles')\n      .select('role')\n      .eq('user_id', caller.id)\n      .maybeSingle(),\n    serviceClient\n      .from('classes')\n      .select('id,name,code,status,teacher_id')\n      .eq('id', classId)\n      .maybeSingle(),\n  ]);\n\n  if (profileError || roleError) {\n    console.error('KOJAC Live account lookup failed', profileError, roleError);\n    return json(request, { error: 'server_lookup_failed' }, 500);\n  }\n\n  if (classError) {\n    console.error('KOJAC Live class lookup failed', classError);\n    return json(request, { error: 'server_lookup_failed' }, 500);\n  }\n\n  if (!profile || !roleRow) {\n    return json(request, { error: 'account_not_ready' }, 403);\n  }\n\n  if (!profile.is_approved || profile.is_blocked) {\n    return json(request, { error: 'account_not_ready' }, 403);\n  }\n\n  if (!classRow) {\n    return json(request, { error: 'class_not_found' }, 404);\n  }\n\n  const role = String(roleRow.role);\n  let moderator = false;\n\n  if (role === 'siswa') {\n    if (classRow.status !== 'active') {\n      return json(request, { error: 'class_not_active' }, 409);\n    }\n\n    const { data: enrollment, error: enrollmentError } = await serviceClient\n      .from('class_enrollments')\n      .select('class_id')\n      .eq('class_id', classId)\n      .eq('user_id', caller.id)\n      .eq('status', 'active')\n      .maybeSingle();\n\n    if (enrollmentError) {\n      console.error('KOJAC Live enrollment lookup failed', enrollmentError);\n      return json(request, { error: 'server_lookup_failed' }, 500);\n    }\n\n    if (!enrollment) {\n      return json(request, { error: 'student_not_enrolled' }, 403);\n    }\n  } else if (teachingRoles.has(role)) {\n    if (!['planned', 'active'].includes(classRow.status)) {\n      return json(request, { error: 'class_not_active' }, 409);\n    }\n\n    let canTeach = managementRoles.has(role) || classRow.teacher_id === caller.id;\n\n    if (!canTeach && role === 'pengajar') {\n      const today = jakartaDate();\n      const { data: substitute, error: substituteError } = await serviceClient\n        .from('class_teacher_assignments')\n        .select('id')\n        .eq('class_id', classId)\n        .eq('teacher_id', caller.id)\n        .eq('is_active', true)\n        .lte('starts_on', today)\n        .gte('ends_on', today)\n        .limit(1)\n        .maybeSingle();\n\n      if (substituteError) {\n        console.error('KOJAC Live substitute lookup failed', substituteError);\n        return json(request, { error: 'server_lookup_failed' }, 500);\n      }\n\n      canTeach = Boolean(substitute);\n    }\n\n    if (!canTeach) {\n      return json(request, { error: 'teacher_class_access_denied' }, 403);\n    }\n\n    moderator = true;\n  } else {\n    return json(request, { error: 'live_classroom_access_denied' }, 403);\n  }\n\n  const provider = (Deno.env.get('LIVE_CLASSROOM_PROVIDER') || 'jaas').trim();\n  if (provider !== 'jaas') {\n    return json(request, { error: 'provider_not_supported' }, 503);\n  }\n\n  const appId = Deno.env.get('JAAS_APP_ID')?.trim() ?? '';\n  const apiKeyId = Deno.env.get('JAAS_API_KEY_ID')?.trim() ?? '';\n  const privateKey = privateKeyPem();\n\n  if (!appId || !apiKeyId || !privateKey) {\n    console.error('KOJAC Live JaaS configuration incomplete');\n    return json(request, { error: 'provider_not_configured' }, 503);\n  }\n\n  const displayName =\n    profile.nickname?.trim()\n    || profile.full_name?.trim()\n    || 'Pengguna KOJAC';\n\n  const roomName = `kojac_${classId.replaceAll('-', '')}`;\n  const now = Math.floor(Date.now() / 1000);\n\n  try {\n    const signingKey = await importPKCS8(privateKey, 'RS256');\n\n    const token = await new SignJWT({\n      room: roomName,\n      context: {\n        user: {\n          id: caller.id,\n          name: displayName,\n          email: caller.email ?? '',\n          avatar: profile.avatar_url ?? '',\n          moderator: moderator ? 'true' : 'false',\n        },\n        features: {\n          livestreaming: false,\n          recording: false,\n          transcription: false,\n          'outbound-call': false,\n        },\n        room: {\n          regex: false,\n        },\n      },\n    })\n      .setProtectedHeader({\n        alg: 'RS256',\n        kid: apiKeyId,\n        typ: 'JWT',\n      })\n      .setAudience('jitsi')\n      .setIssuer('chat')\n      .setSubject(appId)\n      .setNotBefore(now - 10)\n      .setExpirationTime(now + 4 * 60 * 60)\n      .sign(signingKey);\n\n    return json(request, {\n      provider: 'jaas',\n      app_id: appId,\n      room_name: roomName,\n      jwt: token,\n      class_name: classRow.name,\n      class_code: classRow.code,\n      display_name: displayName,\n      email: caller.email ?? '',\n      avatar_url: profile.avatar_url,\n      moderator,\n    });\n  } catch (error) {\n    console.error('KOJAC Live JWT signing failed', error);\n    return json(request, { error: 'provider_token_failed' }, 500);\n  }\n});\n");

// ---------------------------------------------------------
// package.json
// ---------------------------------------------------------
{
  const packagePath = path.resolve(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.dependencies ??= {};
  pkg.dependencies['@jitsi/react-sdk'] = '^1.4.4';
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

// ---------------------------------------------------------
// .env.example
// ---------------------------------------------------------
{
  let env = read('.env.example');
  if (!env.includes('VITE_LIVE_CLASSROOM_ENABLED=')) {
    if (!env.endsWith('\n')) env += '\n';
    env += 'VITE_LIVE_CLASSROOM_ENABLED=false\n';
    write('.env.example', env);
  }
}

// ---------------------------------------------------------
// App.tsx
// ---------------------------------------------------------
{
  let source = read('src/App.tsx');

  source = replaceOnce(
    source,
    "const ListeningPage = lazy(() => import('./pages/ListeningPage').then((module) => ({ default: module.ListeningPage })));\n",
    "const ListeningPage = lazy(() => import('./pages/ListeningPage').then((module) => ({ default: module.ListeningPage })));\nconst LiveClassroomPage = lazy(() => import('./features/live-classroom/LiveClassroomPage').then((module) => ({ default: module.LiveClassroomPage })));\n",
    'App lazy LiveClassroomPage',
  );

  source = replaceOnce(
    source,
    '      <Route path="kelas-mengajar/:classId/laporan" element={<TeachingReportsPage />} />\n',
    '      <Route path="kelas-mengajar/:classId/laporan" element={<TeachingReportsPage />} />\n      <Route path="kelas-live/:classId" element={<LazyModule><LiveClassroomPage /></LazyModule>} />\n',
    'App live classroom route',
  );

  write('src/App.tsx', source);
}

// ---------------------------------------------------------
// MyClassesPage.tsx
// ---------------------------------------------------------
{
  let source = read('src/pages/MyClassesPage.tsx');

  source = replaceOnce(
    source,
    '  Sparkles,\n  UserRound,\n',
    '  Sparkles,\n  UserRound,\n  Video,\n',
    'MyClasses Video icon',
  );

  source = replaceOnce(
    source,
    "import { Navigate } from 'react-router-dom';",
    "import { Link, Navigate } from 'react-router-dom';",
    'MyClasses Link import',
  );

  source = replaceOnce(
    source,
    "import { useAuth } from '../state/AuthContext';\n",
    "import { useAuth } from '../state/AuthContext';\nimport { LIVE_CLASSROOM_ENABLED } from '../features/live-classroom/config';\n",
    'MyClasses live config import',
  );

  if (!source.includes('Masuk Kelas Live')) {
    const start = source.indexOf('function ActiveClassCard');
    const end = source.indexOf('\nfunction HistoryRow', start);
    if (start < 0 || end < 0) fail('ActiveClassCard tidak ditemukan.');

    let segment = source.slice(start, end);
    const articleClose = '    </article>\n  );\n}';

    if (!segment.includes(articleClose)) {
      fail('ActiveClassCard closing anchor tidak ditemukan.');
    }

    segment = segment.replace(
      articleClose,
      `      {LIVE_CLASSROOM_ENABLED
        && row.enrollment_status === 'active'
        && row.class_status === 'active' && (
          <div className="class-action-row">
            <Link className="class-action-primary" to={\`/kelas-live/\${row.class_id}\`}>
              <Video size={16}/>Masuk Kelas Live
            </Link>
          </div>
        )}
    </article>
  );
}`,
    );

    source = source.slice(0, start) + segment + source.slice(end);
  }

  write('src/pages/MyClassesPage.tsx', source);
}

// ---------------------------------------------------------
// TeachingClassesPage.tsx
// ---------------------------------------------------------
{
  let source = read('src/pages/TeachingClassesPage.tsx');

  source = replaceOnce(
    source,
    '  UsersRound,\n  X,\n',
    '  UsersRound,\n  Video,\n  X,\n',
    'TeachingClasses Video icon',
  );

  source = replaceOnce(
    source,
    "import { useAuth } from '../state/AuthContext';\n",
    "import { useAuth } from '../state/AuthContext';\nimport { LIVE_CLASSROOM_ENABLED } from '../features/live-classroom/config';\n",
    'TeachingClasses live config import',
  );

  if (!source.includes('Buka Kelas Live')) {
    const oldActions = `      <div className="class-action-row">
        <Link className={management ? 'class-action-secondary' : 'class-action-primary'} to={\`/kelas-mengajar/\${row.class_id}/laporan\`}>
          <FileText size={16}/>{management ? 'Lihat Laporan' : 'Laporan Mengajar'}
        </Link>
        <button className="class-action-secondary" type="button" disabled={busy} onClick={onOpen}>
          <UsersRound size={16}/>{busy ? 'Memuat…' : 'Lihat Siswa'}
        </button>
      </div>`;

    const newActions = `      <div className="class-action-row">
        {LIVE_CLASSROOM_ENABLED
          && (row.class_status === 'planned' || row.class_status === 'active') && (
            <Link className="class-action-primary" to={\`/kelas-live/\${row.class_id}\`}>
              <Video size={16}/>Buka Kelas Live
            </Link>
          )}
        <Link className="class-action-secondary" to={\`/kelas-mengajar/\${row.class_id}/laporan\`}>
          <FileText size={16}/>{management ? 'Lihat Laporan' : 'Laporan Mengajar'}
        </Link>
        <button className="class-action-secondary" type="button" disabled={busy} onClick={onOpen}>
          <UsersRound size={16}/>{busy ? 'Memuat…' : 'Lihat Siswa'}
        </button>
      </div>`;

    source = replaceOnce(
      source,
      oldActions,
      newActions,
      'TeachingClasses action row',
    );
  }

  write('src/pages/TeachingClassesPage.tsx', source);
}

console.log('[OK] KOJAC Live Classroom Phase 1A foundation terpasang.');
console.log('[OK] Provider abstraction dibuat.');
console.log('[OK] JaaS token dibuat melalui Supabase Edge Function.');
console.log('[OK] JaaS private key tidak berada di frontend.');
console.log('[OK] Button siswa/pengajar dilindungi feature flag.');
console.log('[OK] Tidak ada migration database baru.');
console.log('');
console.log('[NEXT] npm install');
console.log('[NEXT] git diff --check');
console.log('[NEXT] npm run build');
console.log('');
console.log('[PENTING] Jangan aktifkan VITE_LIVE_CLASSROOM_ENABLED=true di production sebelum Edge Function + JaaS secrets siap.');
