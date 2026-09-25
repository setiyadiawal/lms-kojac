import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const changed = [];
const notes = [];
function fail(msg){ console.error(`\n[FAIL] ${msg}`); process.exit(1); }
function file(rel){ return path.join(root, rel); }
function read(rel){ const p=file(rel); if(!fs.existsSync(p)) fail(`File wajib tidak ditemukan: ${rel}`); return fs.readFileSync(p,'utf8'); }
function write(rel,src){ fs.writeFileSync(file(rel),src,'utf8'); if(!changed.includes(rel)) changed.push(rel); }
function replaceOnce(src,oldText,newText,label,{required=false}={}){
  if(src.includes(newText)) return src;
  if(!src.includes(oldText)){
    if(required) fail(`Anchor tidak cocok: ${label}`);
    return src;
  }
  return src.replace(oldText,newText);
}
function appendOnce(src,marker,block){ return src.includes(marker) ? src : `${src.trimEnd()}\n\n${block.trim()}\n`; }
function count(src,needle){ return src.split(needle).length-1; }
function patch(rel,fn){ const before=read(rel); const after=fn(before); if(after!==before) write(rel,after); }

console.log('KOJAC Management Reporting Stabilization V1.0.0');
console.log('Mode: frontend-only stabilization; NO Supabase CLI / migration / reset.');
if(!fs.existsSync(file('package.json')) || !fs.existsSync(file('src'))) fail('Jalankan installer dari root project KOJAC LMS.');

const protectedSlipFiles = ['src/pages/HonorSlipPage.tsx','src/honor-slip.css'];
for(const rel of protectedSlipFiles){ if(fs.existsSync(file(rel))) notes.push(`PROTECTED ${rel}`); }

// ---------------------------------------------------------------------------
// 1) Honor payment administration: remove new-KWT behavior from UI, modal safety.
// ---------------------------------------------------------------------------
patch('src/pages/ManagementHonorPaymentsPage.tsx', source => {
  source = replaceOnce(source,
    `      String(row.slip_number||'').toLowerCase().includes(needle) ||\n      String(row.receipt_number||'').toLowerCase().includes(needle)`,
    `      String(row.slip_number||'').toLowerCase().includes(needle) ||\n      String(row.payment_reference||'').toLowerCase().includes(needle)`,
    'search honor payment');
  source = replaceOnce(source,
    `    const result=data as {receipt_number?:string};\n    setSelected(null);\n    setMessage(\`Pembayaran tersimpan\${result.receipt_number?\` · \${result.receipt_number}\`:''}.\`);`,
    `    const result=data as {already_recorded?:boolean};\n    setSelected(null);\n    setMessage(result.already_recorded?'Pembayaran sebelumnya sudah tercatat.':'Pembayaran honor tersimpan.');`,
    'payment result contract');
  source = source.replace('Pusat administrasi pembayaran honor pengajar, rekening, slip, dan nomor kwitansi.','Pusat administrasi pembayaran honor pengajar, rekening, slip, referensi transfer, dan status pembayaran.');
  source = source.replace('placeholder="Cari pengajar / slip / kwitansi"','placeholder="Cari pengajar / slip / referensi"');
  source = source.replace(`                <th>Kwitansi</th>\n`, '');
  source = source.replace(`                <td>\n                  <strong>{row.receipt_number||'—'}</strong>\n                </td>\n`, '');
  source = source.replace('Setelah disimpan, payroll menjadi <strong>Dibayar</strong> dan sistem menerbitkan nomor kwitansi otomatis.','Setelah disimpan, payroll menjadi <strong>Dibayar</strong>. Nomor KWT tidak diterbitkan untuk pembayaran baru; record legacy tetap dipertahankan di audit trail.');
  if(!source.includes('KOJAC_PAYMENT_MODAL_LOCK')){
    const anchor=`  useEffect(()=>{if(!authLoading&&canManage)void load();},[authLoading,canManage,load]);`;
    const effect=`${anchor}\n\n  // KOJAC_PAYMENT_MODAL_LOCK\n  useEffect(()=>{\n    if(!selected)return undefined;\n    const previous=document.body.style.overflow;\n    document.body.style.overflow='hidden';\n    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)setSelected(null);};\n    document.addEventListener('keydown',onKeyDown);\n    return()=>{document.removeEventListener('keydown',onKeyDown);document.body.style.overflow=previous;};\n  },[selected,busy]);`;
    if(!source.includes(anchor)) fail('Anchor useEffect Pembayaran Honor tidak cocok.');
    source=source.replace(anchor,effect);
  }
  if(source.includes('sistem menerbitkan nomor kwitansi otomatis')) fail('KWT aktif masih tertinggal di Pembayaran Honor.');
  return source;
});

// ---------------------------------------------------------------------------
// 2) Pelaporan & Honor: payment must go through dedicated administration flow.
// Also repair older RPC profile payload if old patch was not installed.
// ---------------------------------------------------------------------------
patch('src/pages/ManagementHonorPage.tsx', source => {
  source = replaceOnce(source,
    ` async function saveProfile(){if(!selected)return;setBusy(true);const {error:e}=await supabase.rpc('save_management_teacher_payroll_profile',{p_teacher_id:selected.teacher_id,...profile});setBusy(false);if(e){console.error(e);setMessage('Profil belum tersimpan.');return;}setMessage('Profil administrasi tersimpan.');await open(selected,'config');await load();}`,
    ` async function saveProfile(){if(!selected)return;setBusy(true);const {error:e}=await supabase.rpc('save_management_teacher_payroll_profile',{p_teacher_id:selected.teacher_id,p_team_name:profile.team_name,p_domicile:profile.domicile,p_phone:profile.phone,p_bank_name:profile.bank_name,p_bank_account_name:profile.bank_account_name,p_bank_account_number:profile.bank_account_number,p_payment_method:profile.payment_method,p_notes:profile.notes||null});setBusy(false);if(e){console.error(e);setMessage('Profil belum tersimpan.');return;}setMessage('Profil administrasi tersimpan.');await open(selected,'config');await load();}`,
    'profile RPC payload');
  source = source.replaceAll(`k.replaceAll('_',' ')`,`k.replace(/_/g,' ')`);
  source = source.replace(/ async function paid\(\)\{[^\n]*mark_management_teacher_payroll_paid[^\n]*\}\n?/g,'');
  source = source.replace(
    `{payroll.payroll.status==='finalized'&&<button className="honor-primary" onClick={()=>void paid()}>Tandai Dibayar</button>}`,
    `{payroll.payroll.status==='finalized'&&<Link className="honor-primary" to="/manajemen/pembayaran-honor">Buka Pembayaran Honor</Link>}`
  );
  if(source.includes('mark_management_teacher_payroll_paid')) fail('Flow pembayaran lama masih aktif di Pelaporan & Honor.');
  return source;
});

// ---------------------------------------------------------------------------
// 3) Monthly report: final != new official document number. Preserve legacy number display.
// ---------------------------------------------------------------------------
patch('src/pages/ManagementTeacherMonthlyReportPage.tsx', source => {
  source = source.replace('Finalkan laporan bulanan? Snapshot dan nomor laporan akan dikunci.','Finalkan laporan bulanan? Snapshot laporan akan dikunci dan tidak dapat diedit lagi.');
  source = replaceOnce(source,
    `    const {data,error}=await supabase.rpc('finalize_management_teacher_monthly_report',{p_monthly_report_id:reportId});\n    setBusy(false);\n    if(error){console.error(error);setMessage('Laporan bulanan belum dapat difinalkan.');return;}\n    setMessage(\`Laporan final: \${String(data)}\`);`,
    `    const {error}=await supabase.rpc('finalize_management_teacher_monthly_report',{p_monthly_report_id:reportId});\n    setBusy(false);\n    if(error){console.error(error);setMessage('Laporan bulanan belum dapat difinalkan.');return;}\n    setMessage('Laporan bulanan berhasil difinalkan.');`,
    'monthly finalize result');
  source = source.replace(`{p.saved_report?.report_number&&<strong>{p.saved_report.report_number}</strong>}`,
    `{p.saved_report?.report_number&&<strong>Nomor legacy: {p.saved_report.report_number}</strong>}`);
  if(source.includes('Laporan final: ${String(data)}')) fail('Monthly report masih menganggap RPC finalize mengembalikan nomor baru.');
  return source;
});

patch('src/pages/TeacherMonthlyReportsPage.tsx', source => {
  source = source.replace(`{r.report_number||'Nomor belum tersedia'}`,`{r.report_number?\`Nomor legacy: \${r.report_number}\`:'Final · tanpa nomor dokumen resmi'}`);
  return source;
});

patch('src/pages/TeacherMonthlyReportPrintPage.tsx', source => {
  source = source.replaceAll(`{detail.report_number||'DRAFT'}`,`{detail.report_number?\`LEGACY · \${detail.report_number}\`:(detail.status==='finalized'?'FINAL':'DRAFT')}`);
  return source;
});

// ---------------------------------------------------------------------------
// 4) Document registry: active official types are honor_slip, letter, invoice.
// Legacy receipt/monthly remain visible, but cannot be issued/reactivated/voided here.
// ---------------------------------------------------------------------------
patch('src/pages/ManagementDocumentNumbersPage.tsx', source => {
  if(!source.includes('OFFICIAL_DOCUMENT_TYPES')){
    const anchor=`const MANAGEMENT_ROLES = new Set<AppRole>(['administrator','manager','co_founder','founder']);`;
    const add=`${anchor}\nconst OFFICIAL_DOCUMENT_TYPES = new Set(['honor_slip','letter','invoice']);\nconst LEGACY_DOCUMENT_TYPES = new Set(['receipt','teacher_monthly_report']);`;
    if(!source.includes(anchor)) fail('Anchor role Nomor Dokumen tidak cocok.');
    source=source.replace(anchor,add);
  }
  source = source.replace(`      activeTypes:payload.settings.filter(x=>x.is_active).length,`,`      activeTypes:payload.settings.filter(x=>x.is_active&&OFFICIAL_DOCUMENT_TYPES.has(x.document_type)).length,`);
  if(!source.includes(`if(!OFFICIAL_DOCUMENT_TYPES.has(issueForm.document_type)||issueForm.document_type==='honor_slip')`)){
    source=source.replace(`  async function issueNumber(){\n    if(!issueForm.reference_label.trim()){`,`  async function issueNumber(){\n    if(!OFFICIAL_DOCUMENT_TYPES.has(issueForm.document_type)||issueForm.document_type==='honor_slip'){\n      setMessage('Jenis dokumen ini tidak dapat diterbitkan manual.');\n      return;\n    }\n    if(!issueForm.reference_label.trim()){`);
  }
  if(!source.includes(`if(LEGACY_DOCUMENT_TYPES.has(editing.document_type))`)){
    source=source.replace(`  async function saveSetting(){\n    if(!editing)return;`,`  async function saveSetting(){\n    if(!editing)return;\n    if(LEGACY_DOCUMENT_TYPES.has(editing.document_type)){\n      setMessage('Jenis dokumen legacy bersifat nonaktif dan hanya dipertahankan untuk audit trail.');\n      setEditing(null);\n      return;\n    }`);
  }
  source = source.replace(`    if(row.document_type==='honor_slip')return;`,`    if(!OFFICIAL_DOCUMENT_TYPES.has(row.document_type)||row.document_type==='honor_slip')return;`);
  source = source.replace('Satu pusat nomor untuk slip honor, surat, kwitansi, tagihan, dan dokumen KOJAC berikutnya.','Register nomor resmi KOJAC untuk Surat, Slip Honor, dan Invoice Pembayaran. Record legacy tetap tersedia untuk audit trail.');
  source = source.replace('Slip Honor dibuat otomatis ketika payroll difinalkan. Form ini untuk Surat, Kwitansi, Tagihan, dan tipe non-slip lainnya.','Slip Honor dibuat otomatis ketika payroll difinalkan. Penerbitan manual hanya tersedia untuk Surat dan Invoice Pembayaran.');
  source = source.replace(`{payload.settings.filter(x=>x.document_type!=='honor_slip'&&x.is_active).map(x=>`,`{payload.settings.filter(x=>x.is_active&&OFFICIAL_DOCUMENT_TYPES.has(x.document_type)&&x.document_type!=='honor_slip').map(x=>`);
  source = source.replace(`<span className={s.is_active?'doc-type-status':'doc-type-status is-off'}>\n              {s.is_active?'Aktif':'Nonaktif'}\n            </span>\n            <button className="doc-secondary" onClick={()=>setEditing({...s})}>\n              <Settings2 size={14}/> Atur\n            </button>`,
`<span className={s.is_active?'doc-type-status':'doc-type-status is-off'}>\n              {LEGACY_DOCUMENT_TYPES.has(s.document_type)?'Legacy / Nonaktif':s.is_active?'Aktif':'Nonaktif'}\n            </span>\n            <button className="doc-secondary" disabled={LEGACY_DOCUMENT_TYPES.has(s.document_type)} onClick={()=>setEditing({...s})}>\n              <Settings2 size={14}/> {LEGACY_DOCUMENT_TYPES.has(s.document_type)?'Legacy':'Atur'}\n            </button>`);
  source = source.replace(`{row.document_type!=='honor_slip'&&row.status==='issued'&&`,`{OFFICIAL_DOCUMENT_TYPES.has(row.document_type)&&row.document_type!=='honor_slip'&&row.status==='issued'&&`);
  if(!source.includes('KOJAC_DOC_MODAL_LOCK')){
    const anchor=`  useEffect(()=>{if(!authLoading&&canManage)void load();},[authLoading,canManage,load]);`;
    const effect=`${anchor}\n\n  // KOJAC_DOC_MODAL_LOCK\n  useEffect(()=>{\n    if(!editing)return undefined;\n    const previous=document.body.style.overflow;\n    document.body.style.overflow='hidden';\n    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)setEditing(null);};\n    document.addEventListener('keydown',onKeyDown);\n    return()=>{document.removeEventListener('keydown',onKeyDown);document.body.style.overflow=previous;};\n  },[editing,busy]);`;
    if(!source.includes(anchor)) fail('Anchor modal Nomor Dokumen tidak cocok.');
    source=source.replace(anchor,effect);
  }
  return source;
});

// ---------------------------------------------------------------------------
// 5) Invoice modal: body lock + Escape. Functional V1.1.0 contract remains untouched.
// ---------------------------------------------------------------------------
patch('src/pages/ManagementInvoicesPage.tsx', source => {
  if(!source.includes('KOJAC_INVOICE_MODAL_LOCK')){
    const anchor=`  useEffect(()=>{ if(!authLoading && canManage) void load(); },[authLoading,canManage,load]);`;
    const effect=`${anchor}\n\n  // KOJAC_INVOICE_MODAL_LOCK\n  useEffect(()=>{\n    if(!formOpen)return undefined;\n    const previous=document.body.style.overflow;\n    document.body.style.overflow='hidden';\n    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)setFormOpen(false);};\n    document.addEventListener('keydown',onKeyDown);\n    return()=>{document.removeEventListener('keydown',onKeyDown);document.body.style.overflow=previous;};\n  },[formOpen,busy]);`;
    if(!source.includes(anchor)) fail('Anchor modal Invoice tidak cocok. Pastikan Invoice Stabilization V1.1.0 sudah terpasang.');
    source=source.replace(anchor,effect);
  }
  return source;
});

// ---------------------------------------------------------------------------
// 6) UI normalization: scoped overrides only. No global redesign.
// ---------------------------------------------------------------------------
const uiFiles = {
  'src/teacher-honor-system.css': `/* KOJAC_REPORTING_UI_NORMALIZATION_V1 */\n.honor-system-page{font-family:inherit;color:var(--ink,#22191a)}\n.honor-summary-grid span,.honor-heading>span,.honor-table-wrap td small,.honor-report-list header span,.report-grid span,.form-grid label>span,.money-grid span,.pay-lines,.teacher-honor-period span,.teacher-honor-money span,.teacher-honor-money small{font-size:12px}\n.honor-table-wrap th,.honor-report-list b{font-size:11px}\n.report-grid p,.honor-primary,.honor-secondary,.honor-notice{font-size:13px}\n.honor-primary,.honor-secondary{min-height:40px;padding:9px 13px}\n.honor-card,.honor-report-list>article,.money-grid div{border-color:var(--line,#e7ddde);box-shadow:0 6px 20px rgba(66,30,39,.04)}\n@media(max-width:600px){.honor-system-page{padding-left:18px;padding-right:18px}.honor-primary,.honor-secondary{width:auto;min-height:42px}}`,
  'src/honor-payment-administration.css': `/* KOJAC_REPORTING_UI_NORMALIZATION_V1 */\n.honor-payment-page{font-family:inherit;color:var(--ink,#22191a)}\n.honor-payment-filters span,.honor-payment-summary span,.honor-payment-summary small,.honor-payment-table th,.honor-payment-table td,.honor-payment-table td small,.honor-payment-modal>header span,.honor-payment-modal-total span,.honor-payment-destination span,.honor-payment-form label>span,.honor-payment-modal-info{font-size:12px}\n.honor-payment-primary,.honor-payment-secondary,.honor-payment-notice{font-size:13px}\n.honor-payment-primary,.honor-payment-secondary{min-height:40px;padding:9px 13px}\n.honor-payment-table td{line-height:1.45}.honor-payment-status{font-size:12px}\n.honor-payment-modal{border:1px solid var(--line,#e7ddde)}\n@media(max-width:700px){.honor-payment-page{padding-left:18px;padding-right:18px}.honor-payment-header,.honor-payment-toolbar{align-items:stretch}.honor-payment-filters,.honor-payment-tools{width:100%;flex-wrap:wrap}.honor-payment-search{flex:1 1 100%}}`,
  'src/document-numbering.css': `/* KOJAC_REPORTING_UI_NORMALIZATION_V1 */\n.doc-number-page{font-family:inherit;color:var(--ink,#22191a)}\n.doc-number-summary span,.doc-helper,.doc-form label>span,.doc-notice,.doc-setting-list article span,.doc-table th,.doc-table td,.doc-table td small{font-size:12px}\n.doc-primary,.doc-secondary,.doc-icon{font-size:13px;min-height:40px}\n.doc-primary,.doc-secondary{padding:9px 13px}.doc-type-status,.doc-status{font-size:12px}\n.doc-card{border-color:var(--line,#e7ddde);box-shadow:0 6px 20px rgba(66,30,39,.04)}\n@media(max-width:700px){.doc-number-page{padding-left:18px;padding-right:18px}.doc-number-header{align-items:stretch}.doc-number-layout{grid-template-columns:1fr}}`,
  'src/teacher-monthly-report.css': `/* KOJAC_REPORTING_UI_NORMALIZATION_V1 */\n.monthly-report-page{font-family:inherit;color:var(--ink,#22191a)}\n.monthly-report-filters span,.monthly-summary span,.monthly-card-heading span,.monthly-status-stack strong,.monthly-metrics-grid span,.monthly-payroll-grid span,.monthly-table th,.monthly-table td,.monthly-session-list header span,.monthly-session-grid span,.monthly-session-grid p,.monthly-notice,.teacher-monthly-period span{font-size:12px}\n.monthly-status{font-size:12px}.monthly-primary,.monthly-secondary{font-size:13px;min-height:40px;padding:9px 13px}\n.monthly-report-card,.teacher-monthly-list article{border-color:var(--line,#e7ddde);box-shadow:0 6px 20px rgba(66,30,39,.04)}\n@media(max-width:700px){.monthly-report-page{padding-left:18px;padding-right:18px}.monthly-report-header{align-items:stretch}.monthly-report-filters{width:100%;flex-wrap:wrap}}`,
  'src/features/invoice/invoice.css': `/* KOJAC_REPORTING_UI_NORMALIZATION_V1 */\n.invoice-page,.invoice-management-page,.invoice-detail-page{font-family:inherit;color:var(--ink,#22191a)}\n.invoice-card>span,.invoice-status,.invoice-info-grid span,.invoice-info-grid small,.invoice-note p,.invoice-table th,.invoice-table td,.invoice-payment-list span,.invoice-payment-list small,.invoice-empty,.invoice-toolbar label>span,.invoice-notice,.invoice-list-row span,.invoice-list-row strong,.invoice-row-main span,.invoice-row-main strong,.invoice-row-actions button,.invoice-state,.invoice-form-grid span,.invoice-session-editor .invoice-section-title button,.invoice-session-row strong,.invoice-session-row button,.invoice-form-summary span{font-size:12px}\n.invoice-btn{font-size:13px;min-height:40px;padding:9px 13px}.invoice-row-actions button{min-height:36px;padding:7px 10px}\n.invoice-panel,.invoice-card,.invoice-modal{border-color:var(--line,#e7ddde)}\n@media(max-width:700px){.invoice-page,.invoice-management-page,.invoice-detail-page{padding-left:18px;padding-right:18px}.invoice-toolbar{align-items:stretch}.invoice-toolbar>*{min-width:0}}`
};
for(const [rel,block] of Object.entries(uiFiles)) patch(rel, source => appendOnce(source,'KOJAC_REPORTING_UI_NORMALIZATION_V1',block));

// ---------------------------------------------------------------------------
// 7) Route/sidebar duplicate guard (read-only validation; no risky broad rewrite).
// ---------------------------------------------------------------------------
for(const [rel,needles] of Object.entries({
  'src/App.tsx':['path="manajemen/laporan-pembelajaran"','path="manajemen/invoice"','path="manajemen/honor"','path="manajemen/pembayaran-honor"','path="manajemen/nomor-dokumen"','path="manajemen/laporan-pengajar-bulanan"'],
  'src/components/AppShell.tsx':['to="/manajemen/laporan-pembelajaran"','to="/manajemen/invoice"','to="/manajemen/honor"','to="/manajemen/pembayaran-honor"','to="/manajemen/nomor-dokumen"','to="/manajemen/laporan-pengajar-bulanan"']
})){
  const source=read(rel);
  for(const needle of needles){ const n=count(source,needle); if(n>1) fail(`Duplicate route/menu terdeteksi (${n}x): ${needle} di ${rel}. Hentikan agar tidak menghapus struktur secara spekulatif.`); }
}

// Compatibility audit in reporting scope.
for(const rel of ['src/pages/ManagementHonorPage.tsx','src/pages/ManagementHonorPaymentsPage.tsx','src/pages/ManagementDocumentNumbersPage.tsx','src/pages/ManagementTeacherMonthlyReportPage.tsx','src/pages/ManagementInvoicesPage.tsx']){
  const source=read(rel);
  if(source.includes('.replaceAll(')) fail(`Unsupported replaceAll() masih ditemukan: ${rel}`);
  if(/\.at\s*\(/.test(source)) fail(`Unsupported Array.at() masih ditemukan: ${rel}`);
}

console.log('\n[PASS] Stabilization patch applied.');
console.log('[PASS] Slip Honor generator/style tidak disentuh.');
console.log('[PASS] Tidak ada perintah Supabase/migration yang dijalankan.');
console.log('\nFILES CHANGED:');
for(const rel of changed) console.log(` - ${rel}`);
console.log('\nPROTECTED:');
for(const item of notes) console.log(` - ${item}`);
console.log('\nVALIDATION WAJIB:');
console.log('  git diff --check');
console.log('  npm run build');
console.log('\nSetelah build PASS, lakukan runtime smoke test sesuai checklist project.');
