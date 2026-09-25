#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const touched = new Set();

function fail(message) {
  console.error(`\n[KOJAC Invoice Stabilization V1.1.0] ERROR: ${message}\n`);
  process.exit(1);
}
function ok(message) { console.log(`[KOJAC Invoice Stabilization V1.1.0] ${message}`); }
function abs(rel) { return path.join(root, rel); }
function read(rel) {
  if (!fs.existsSync(abs(rel))) fail(`File tidak ditemukan: ${rel}`);
  return fs.readFileSync(abs(rel), 'utf8');
}
function write(rel, content) {
  fs.writeFileSync(abs(rel), content.replace(/\r\n/g, '\n'), 'utf8');
  touched.add(rel);
  ok(`patch ${rel}`);
}
function count(content, needle) { return content.split(needle).length - 1; }
function replaceRequired(rel, before, after, label) {
  let content = read(rel);
  if (content.includes(after)) { ok(`skip ${label} (sudah terpasang)`); return; }
  const found = count(content, before);
  if (found !== 1) fail(`${label}: anchor harus tepat 1, ditemukan ${found} di ${rel}`);
  write(rel, content.replace(before, after));
}

function auditProject() {
  const pkg = JSON.parse(read('package.json'));
  if (pkg.name !== 'kojac-lms-v2') fail(`Project bukan kojac-lms-v2 (name=${pkg.name})`);

  const required = [
    'src/App.tsx',
    'src/components/AppShell.tsx',
    'src/features/invoice/types.ts',
    'src/features/invoice/api.ts',
    'src/features/invoice/invoicePdf.ts',
    'src/features/invoice/invoice.css',
    'src/pages/ManagementInvoicesPage.tsx',
    'src/pages/MyInvoicesPage.tsx',
    'src/pages/InvoiceDetailPage.tsx',
  ];
  required.forEach(read);

  const management = read('src/pages/ManagementInvoicesPage.tsx');
  const types = read('src/features/invoice/types.ts');
  if (!management.includes("recipient_kind:'student'")) fail('Implementasi Invoice V1 tidak terdeteksi.');
  if (!types.includes("'student' | 'institution'")) fail('V1.0.3 RPC contract fix belum terpasang: RecipientKind belum student | institution.');
  if (!management.includes('invoice_id: draft.id || null')) fail('V1.0.3 belum terpasang: edit payload belum memakai invoice_id.');
  if (!management.includes('class_name:draft.class_name_snapshot.trim() || null')) fail('V1.0.3 belum terpasang: payload kelas belum memakai class_name.');

  ok(`Audit actual project PASS · package ${pkg.version ?? '-'}`);
}

function dedupeKnownNavigation() {
  const appRel = 'src/App.tsx';
  let app = read(appRel);
  const invoiceImports = [
    "import { ManagementInvoicesPage } from './pages/ManagementInvoicesPage';",
    "import { MyInvoicesPage } from './pages/MyInvoicesPage';",
    "import { InvoiceDetailPage } from './pages/InvoiceDetailPage';",
  ];
  for (const needle of invoiceImports) {
    const lines = app.split(/\r?\n/); let seen = false; let changed = false;
    app = lines.filter(line => {
      if (line.trim() !== needle) return true;
      if (!seen) { seen = true; return true; }
      changed = true; return false;
    }).join('\n');
    if (!seen) fail(`Import Invoice hilang: ${needle}`);
    if (changed) touched.add(appRel);
  }

  const routeNeedle = 'path="manajemen/invoice"';
  if (count(app, routeNeedle) < 1) fail('Route manajemen/invoice tidak ditemukan.');
  if (count(app, routeNeedle) > 1) {
    let seen = false;
    app = app.split(/\r?\n/).filter(line => {
      if (!line.includes(routeNeedle)) return true;
      if (!seen) { seen = true; return true; }
      return false;
    }).join('\n');
    touched.add(appRel);
  }
  if (touched.has(appRel)) write(appRel, app);

  const shellRel = 'src/components/AppShell.tsx';
  let shell = read(shellRel);
  const menuNeedle = 'label="Invoice Pembayaran"';
  if (count(shell, menuNeedle) < 1) fail('Menu Invoice Pembayaran tidak ditemukan.');
  if (count(shell, menuNeedle) > 1) {
    let seen = false;
    shell = shell.split(/\r?\n/).filter(line => {
      if (!line.includes(menuNeedle)) return true;
      if (!seen) { seen = true; return true; }
      return false;
    }).join('\n');
    write(shellRel, shell);
  }
}

function patchApiContract() {
  const rel = 'src/features/invoice/api.ts';
  const replacements = [
    [
      '    class_name_snapshot: textValue(row.class_name_snapshot) || null,',
      '    class_name_snapshot: textValue(row.class_name_snapshot ?? row.class_name) || null,',
      'normalize class_name'
    ],
    [
      '    payment_methods_snapshot: asArray(row.payment_methods_snapshot) as InvoicePaymentMethod[],',
      '    payment_methods_snapshot: asArray(row.payment_methods_snapshot ?? row.payment_methods) as InvoicePaymentMethod[],',
      'normalize payment_methods'
    ],
    [
      '      total_invoices: numberValue(summary.total_invoices ?? rows.length),',
      '      total_invoices: numberValue(summary.total_invoices ?? summary.invoice_count ?? rows.length),',
      'summary invoice_count'
    ],
    [
      '      total_amount: numberValue(summary.total_amount ?? computedTotal),',
      '      total_amount: numberValue(summary.total_amount ?? summary.total_billed ?? computedTotal),',
      'summary total_billed'
    ],
    [
      '      paid_amount: numberValue(summary.paid_amount ?? computedPaid),',
      '      paid_amount: numberValue(summary.paid_amount ?? summary.total_paid ?? computedPaid),',
      'summary total_paid'
    ],
    [
      '      outstanding_amount: numberValue(summary.outstanding_amount ?? (computedTotal - computedPaid)),',
      '      outstanding_amount: numberValue(summary.outstanding_amount ?? summary.total_outstanding ?? (computedTotal - computedPaid)),',
      'summary total_outstanding'
    ],
    [
      '        id: textValue(row.id) || null,\n        source_report_id: textValue(row.source_report_id) || null,',
      '        id: textValue(row.id ?? row.session_id) || null,\n        source_report_id: textValue(row.source_report_id) || null,',
      'session_id return shape'
    ],
    [
      '        id: textValue(row.id),',
      '        id: textValue(row.id ?? row.payment_id),',
      'payment_id return shape'
    ],
  ];
  for (const [before, after, label] of replacements) replaceRequired(rel, before, after, label);
}

function patchManagementFlow() {
  const rel = 'src/pages/ManagementInvoicesPage.tsx';

  replaceRequired(
    rel,
    '  getManagementInvoiceOverview,\n  getManagementInvoiceSetup,',
    '  getManagementInvoiceOverview,\n  getManagementInvoiceSetup,\n  getInvoiceDetail,',
    'detail API import'
  );

  replaceRequired(
    rel,
    "  function openNew() { setDraft(freshDraft()); setFormOpen(true); setMessage(''); }",
    `  function openNew() { setDraft(freshDraft()); setFormOpen(true); setMessage(''); }\n\n  async function editDraft(row: InvoiceRow) {\n    if (row.status !== 'draft') return;\n    setBusy(true); setMessage('');\n    try {\n      const detail = await getInvoiceDetail(row.id);\n      const firstDate = detail.session_start || detail.invoice_date || today();\n      const lastDate = detail.session_end || firstDate;\n      const fallbackSessions = firstDate === lastDate\n        ? [{ ...emptySession(), session_date:firstDate }]\n        : [{ ...emptySession(), session_date:firstDate }, { ...emptySession(), session_date:lastDate }];\n      setDraft({\n        id:detail.id,\n        recipient_kind:detail.recipient_kind,\n        recipient_user_id:detail.recipient_user_id || '',\n        recipient_name:detail.recipient_name || '',\n        recipient_address:detail.recipient_address || '',\n        recipient_phone:detail.recipient_phone || '',\n        class_id:detail.class_id || '',\n        class_name_snapshot:detail.class_name_snapshot || '',\n        invoice_code:detail.invoice_code || 'JPNPRIVAT',\n        invoice_date:detail.invoice_date || today(),\n        due_date:detail.due_date || today(),\n        pricing_mode:detail.pricing_mode,\n        item_label:detail.item_label || '',\n        quantity:Number(detail.quantity || 1),\n        unit_price:Number(detail.unit_price || 0),\n        additional_amount:Number(detail.additional_amount || 0),\n        notes:detail.notes || '',\n        sessions:detail.sessions.length ? detail.sessions : fallbackSessions,\n      });\n      setFormOpen(true);\n    } catch (error) {\n      console.error('KOJAC edit invoice load failed', error);\n      setMessage('Draft invoice belum dapat dibuka.');\n    } finally { setBusy(false); }\n  }`,
    'Edit Draft flow'
  );

  replaceRequired(
    rel,
    `    if (!draft.recipient_name.trim()) return setMessage('Nama penerima wajib diisi.');\n    if (!draft.invoice_code.trim()) return setMessage('Kode invoice wajib diisi.');\n    if (draft.unit_price <= 0) return setMessage('Tarif harus lebih dari 0.');`,
    `    if (draft.recipient_kind === 'student' && !draft.recipient_user_id) return setMessage('Pilih siswa penerima invoice.');\n    if (!draft.recipient_name.trim()) return setMessage('Nama penerima wajib diisi.');\n    if (!/^[A-Z0-9]{3,20}$/.test(draft.invoice_code.trim().toUpperCase())) return setMessage('Kode invoice harus 3–20 karakter huruf/angka.');\n    if (!draft.item_label.trim()) return setMessage('Deskripsi invoice wajib diisi.');\n    if (!draft.invoice_date || !draft.due_date || draft.due_date < draft.invoice_date) return setMessage('Jatuh tempo tidak boleh sebelum tanggal invoice.');\n    if (draft.pricing_mode === 'hourly' && !draft.class_id) return setMessage('Mode per jam membutuhkan kelas agar rekap sesi dapat diambil dari laporan pembelajaran approved.');\n    if (draft.unit_price <= 0) return setMessage('Tarif harus lebih dari 0.');`,
    'save validation'
  );

  replaceRequired(
    rel,
    `        total_minutes:totalMinutes,\n        session_start:draft.sessions.map(s=>s.session_date).sort()[0] || null,`,
    `        total_minutes:totalMinutes,\n        auto_sessions:draft.pricing_mode==='hourly',\n        session_start:draft.sessions.map(s=>s.session_date).sort()[0] || null,`,
    'hourly auto_sessions contract'
  );

  replaceRequired(
    rel,
    `      setMessage('Draft invoice tersimpan.');\n      setDraft(current=>({...current,id}));\n      await load();`,
    `      const saved = await getInvoiceDetail(id);\n      setMessage('Draft invoice tersimpan.');\n      setDraft(current=>({...current,id,sessions:saved.sessions.length ? saved.sessions : current.sessions}));\n      await load();`,
    'refresh saved server sessions'
  );

  replaceRequired(
    rel,
    `    if(!Number.isFinite(amount)||amount<=0) return setMessage('Nominal pembayaran tidak valid.');\n    const method=prompt('Metode pembayaran','Bank BSI');`,
    `    if(!Number.isFinite(amount)||amount<=0) return setMessage('Nominal pembayaran tidak valid.');\n    if(amount>outstanding) return setMessage('Nominal pembayaran melebihi sisa tagihan.');\n    const method=prompt('Metode pembayaran','Bank BSI');`,
    'client overpay validation'
  );

  replaceRequired(
    rel,
    `           {row.status==='draft' && <button disabled={busy} onClick={()=>void issue(row)}><CheckCircle2 size={14}/> Terbitkan</button>}\n           {!['draft','paid','void'].includes(row.status) && <button disabled={busy} onClick={()=>void payment(row)}><CircleDollarSign size={14}/> Bayar</button>}\n           {!['paid','void'].includes(row.status) && <button disabled={busy} className="danger" onClick={()=>void voidInvoice(row)}><Ban size={14}/> Void</button>}`,
    `           {row.status==='draft' && <button disabled={busy} onClick={()=>void editDraft(row)}><FileText size={14}/> Edit</button>}\n           {row.status==='draft' && <button disabled={busy} onClick={()=>void issue(row)}><CheckCircle2 size={14}/> Terbitkan</button>}\n           {!['draft','paid','void'].includes(row.status) && <button disabled={busy} onClick={()=>void payment(row)}><CircleDollarSign size={14}/> Bayar</button>}\n           {!['paid','void'].includes(row.status) && row.paid_amount<=0 && <button disabled={busy} className="danger" onClick={()=>void voidInvoice(row)}><Ban size={14}/> Void</button>}`,
    'row actions Edit/Void guard'
  );

  replaceRequired(
    rel,
    `        <div className="invoice-session-editor">\n          <div className="invoice-section-title"><div><p className="eyebrow">REKAP SESI</p><h3>Halaman 2</h3></div><button onClick={()=>setDraft(c=>({...c,sessions:[...c.sessions,emptySession()]}))}>+ Tambah Sesi</button></div>`,
    `        <div className="invoice-session-editor">\n          <div className="invoice-section-title"><div><p className="eyebrow">REKAP SESI</p><h3>Halaman 2</h3></div><button onClick={()=>setDraft(c=>({...c,sessions:[...c.sessions,emptySession()]}))}>+ Tambah Sesi</button></div>\n          {draft.pricing_mode==='hourly' && <div className="invoice-notice">Saat disimpan, rekap final diambil otomatis dari Laporan Pembelajaran berstatus approved untuk kelas dan rentang tanggal yang dipilih.</div>}`,
    'auto session UX notice'
  );
}

function verifyStatic() {
  const api = read('src/features/invoice/api.ts');
  const management = read('src/pages/ManagementInvoicesPage.tsx');
  const app = read('src/App.tsx');
  const shell = read('src/components/AppShell.tsx');
  const pdf = read('src/features/invoice/invoicePdf.ts');

  const apiChecks = [
    'row.class_name_snapshot ?? row.class_name',
    'row.payment_methods_snapshot ?? row.payment_methods',
    'summary.invoice_count',
    'summary.total_billed',
    'summary.total_paid',
    'summary.total_outstanding',
    'row.id ?? row.session_id',
    'row.id ?? row.payment_id',
  ];
  for (const needle of apiChecks) if (!api.includes(needle)) fail(`API contract verification gagal: ${needle}`);

  const managementChecks = [
    'getInvoiceDetail,',
    'async function editDraft(row: InvoiceRow)',
    "auto_sessions:draft.pricing_mode==='hourly'",
    'amount>outstanding',
    'row.paid_amount<=0',
  ];
  for (const needle of managementChecks) if (!management.includes(needle)) fail(`Management verification gagal: ${needle}`);

  if (count(app, 'path="manajemen/invoice"') !== 1) fail('Route manajemen/invoice harus tepat 1.');
  if (count(shell, 'label="Invoice Pembayaran"') !== 1) fail('Menu Invoice Pembayaran harus tepat 1.');
  if (pdf.includes('.replaceAll(')) fail('replaceAll() masih ditemukan di invoicePdf.ts.');
  if (management.includes('.at(-1)')) fail('Array.at(-1) masih ditemukan di ManagementInvoicesPage.tsx.');

  ok('Static stabilization verification PASS');
}

auditProject();
dedupeKnownNavigation();
patchApiContract();
patchManagementFlow();
verifyStatic();

console.log('\nPATCH SELESAI. File yang berubah:');
for (const rel of touched) console.log(`  - ${rel}`);
console.log(`\nVALIDATION WAJIB:\n  git diff --check\n  npm run build\n\nJika BUILD PASS:\n  npm run dev\n\nRuntime smoke test minimal:\n  1. Management → Invoice Pembayaran\n  2. Create Draft → Student\n  3. Reload → Edit Draft\n  4. Create Draft → Institution\n  5. Hourly dengan kelas + laporan approved\n  6. Per Student\n  7. Issue → nomor INV permanen\n  8. Detail + PDF halaman 1/2\n  9. Partial Payment → payment history tampil\n  10. Full Payment → Lunas\n  11. Login siswa → Tagihan Saya → Detail\n  12. Void invoice tanpa pembayaran\n  13. Console + Network normal flow bersih\n\nJANGAN:\n  - supabase db push\n  - replay migration\n  - reset Supabase\n  - ubah Slip Honor\n`);
