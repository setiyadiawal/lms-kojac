import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=process.cwd();
const payload=path.join(here,'payload');
function fail(m){console.error(`[ERROR] ${m}`);process.exit(1);}
function read(rel){const p=path.join(root,rel);if(!fs.existsSync(p))fail(`File tidak ditemukan: ${rel}`);return fs.readFileSync(p,'utf8');}
function write(rel,c){const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,c,'utf8');}
function copy(rel){const src=path.join(payload,rel);if(!fs.existsSync(src))fail(`Payload hilang: ${rel}`);write(rel,fs.readFileSync(src,'utf8'));console.log(`[COPY] ${rel}`);}
function patchOnce(src,before,after,label){if(src.includes(after)){console.log(`[SKIP] ${label}`);return src;}if(!src.includes(before))fail(`Anchor tidak ditemukan: ${label}`);console.log(`[PATCH] ${label}`);return src.replace(before,after);}

for(const rel of ['src/App.tsx','src/components/AppShell.tsx','src/lib/supabase.ts','src/types.ts']){
  if(!fs.existsSync(path.join(root,rel)))fail(`Jalankan installer dari root project KOJAC. Missing: ${rel}`);
}

for(const rel of [
  'src/pages/ManagementHonorPage.tsx',
  'src/pages/TeacherHonorPage.tsx',
  'src/pages/HonorSlipPage.tsx',
  'src/teacher-honor-system.css',
  'src/honor-slip.css',
  'supabase/migrations/20260922_teacher_reporting_honor_system.sql',
]) copy(rel);

{
  let s=read('src/App.tsx');
  const anchor=`import { ManagementDashboardPage } from './pages/ManagementDashboardPage';`;
  const replacement=`${anchor}\nimport { ManagementHonorPage } from './pages/ManagementHonorPage';\nimport { TeacherHonorPage } from './pages/TeacherHonorPage';\nimport { HonorSlipPage } from './pages/HonorSlipPage';`;
  s=patchOnce(s,anchor,replacement,'App imports honor');
  s=patchOnce(s,`      <Route path="pengajar/dashboard" element={<TeacherDashboardPage />} />`,`      <Route path="pengajar/dashboard" element={<TeacherDashboardPage />} />\n      <Route path="pengajar/honor" element={<TeacherHonorPage />} />`,'Teacher honor route');
  s=patchOnce(s,`      <Route path="manajemen/laporan-pembelajaran" element={<RoleRoute minimum="administrator"><ManagementTeachingReportsPage /></RoleRoute>} />`,`      <Route path="manajemen/laporan-pembelajaran" element={<RoleRoute minimum="administrator"><ManagementTeachingReportsPage /></RoleRoute>} />\n      <Route path="manajemen/honor" element={<RoleRoute minimum="administrator"><ManagementHonorPage /></RoleRoute>} />`,'Management honor route');
  s=patchOnce(s,`      <Route path="progress" element={<ProgressPage />} />`,`      <Route path="progress" element={<ProgressPage />} />\n      <Route path="honor/slip/:payrollId" element={<HonorSlipPage />} />`,'Slip route');
  write('src/App.tsx',s);
}

{
  let s=read('src/components/AppShell.tsx');
  s=patchOnce(s,`  Video,\n  X,`,`  Video,\n  WalletCards,\n  X,`,'WalletCards icon');
  s=patchOnce(s,`          <NavigationLink to="/pengajar/tugas" label="Tugas Kelas" icon={FileText} onNavigate={onNavigate}/>` ,`          <NavigationLink to="/pengajar/tugas" label="Tugas Kelas" icon={FileText} onNavigate={onNavigate}/>\n          <NavigationLink to="/pengajar/honor" label="Honor Saya" icon={WalletCards} onNavigate={onNavigate}/>`,'Teacher honor nav');
  s=patchOnce(s,`          <NavigationLink to="/manajemen/laporan-pembelajaran" label="Laporan Pembelajaran" icon={FileText} onNavigate={onNavigate}/>` ,`          <NavigationLink to="/manajemen/laporan-pembelajaran" label="Laporan Pembelajaran" icon={FileText} onNavigate={onNavigate}/>\n          <NavigationLink to="/manajemen/honor" label="Pelaporan & Honor" icon={WalletCards} onNavigate={onNavigate}/>`,'Management honor nav');
  write('src/components/AppShell.tsx',s);
}

console.log('');
console.log('[PASS] KOJAC Teacher Reporting & Honor System V1 terpasang.');
console.log('[PASS] Source laporan/honor/slip dan migration baru sudah dibuat.');
console.log('[INFO] Historical migrations tidak disentuh.');
console.log('[INFO] JANGAN menjalankan supabase db push.');
console.log('');
console.log('[NEXT] git diff --check');
console.log('[NEXT] npm run build');
