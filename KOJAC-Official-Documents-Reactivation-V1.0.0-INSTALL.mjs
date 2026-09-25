import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const changed=[];
const migrationRel='supabase/migrations/20260924165000_official_documents_reactivation_v1.sql';
const migrationSql="-- KOJAC Official Documents Reactivation V1.0.0\n-- NEW migration. Do not replay older migrations.\n-- Reactivates receipt + teacher_monthly_report as official numbered documents.\n-- Preserves legacy rows and existing numbering formats.\n\nupdate private.document_number_settings\nset is_active = true\nwhere document_type in ('receipt','teacher_monthly_report');\n\ncreate or replace function private.create_teacher_payroll_payment_record(\n  p_payroll_id uuid,\n  p_payment_date date,\n  p_payment_method text,\n  p_payment_reference text default null,\n  p_notes text default null,\n  p_actor uuid default null\n)\nreturns jsonb\nlanguage plpgsql\nsecurity definer\nset search_path to 'pg_catalog','public','private'\nas $function$\ndeclare\n  v_actor uuid:=coalesce(p_actor,auth.uid());\n  v_teacher uuid;\n  v_teacher_name text;\n  v_status text;\n  v_amount bigint;\n  v_profile jsonb;\n  v_period_start date;\n  v_period_end date;\n  v_existing private.teacher_payroll_payment_records%rowtype;\n  v_payment_method text:=coalesce(nullif(btrim(coalesce(p_payment_method,'')),''),'Transfer');\n  v_date date:=coalesce(p_payment_date,(current_timestamp at time zone 'Asia/Jakarta')::date);\n  v_bank_name text;\n  v_bank_account_name text;\n  v_bank_account_number text;\n  v_id uuid;\n  v_doc uuid;\n  v_receipt text;\nbegin\n  select py.teacher_id,py.status,py.net_amount,py.profile_snapshot,py.period_start,py.period_end,\n         coalesce(nullif(btrim(pr.full_name),''),nullif(btrim(pr.nickname),''),'Pengajar KOJAC')\n  into v_teacher,v_status,v_amount,v_profile,v_period_start,v_period_end,v_teacher_name\n  from private.teacher_payrolls py\n  left join public.profiles pr on pr.user_id=py.teacher_id\n  where py.id=p_payroll_id\n  for update of py;\n\n  if v_teacher is null then raise exception 'payroll_not_found'; end if;\n\n  select * into v_existing\n  from private.teacher_payroll_payment_records\n  where payroll_id=p_payroll_id;\n\n  if found then\n    if v_existing.receipt_number is null then\n      select x.document_id,x.document_number into v_doc,v_receipt\n      from private.issue_document_number(\n        'receipt',\n        v_existing.payment_date,\n        'teacher_payroll:' || p_payroll_id::text,\n        'Kwitansi Honor ' || v_teacher_name,\n        'Honor periode ' || v_period_start::text || ' s.d. ' || v_period_end::text,\n        jsonb_build_object(\n          'payroll_id',p_payroll_id,\n          'teacher_id',v_teacher,\n          'payment_id',v_existing.id,\n          'payment_date',v_existing.payment_date,\n          'amount',v_existing.amount\n        ),\n        v_actor\n      ) x;\n\n      update private.teacher_payroll_payment_records\n      set receipt_number=v_receipt,receipt_document_id=v_doc\n      where id=v_existing.id;\n    else\n      v_receipt:=v_existing.receipt_number;\n    end if;\n\n    return jsonb_build_object(\n      'payment_id',v_existing.id,\n      'receipt_number',v_receipt,\n      'already_recorded',true\n    );\n  end if;\n\n  if v_status not in('finalized','paid') then raise exception 'payroll_not_finalized'; end if;\n  if v_amount<=0 then raise exception 'invalid_payment_amount'; end if;\n\n  v_bank_name:=nullif(btrim(coalesce(v_profile->>'bank_name','')),'');\n  v_bank_account_name:=nullif(btrim(coalesce(v_profile->>'bank_account_name','')),'');\n  v_bank_account_number:=nullif(btrim(coalesce(v_profile->>'bank_account_number','')),'');\n\n  insert into private.teacher_payroll_payment_records(\n    payroll_id,teacher_id,payment_date,amount,payment_method,\n    bank_name,bank_account_name,bank_account_number,\n    payment_reference,notes,receipt_number,receipt_document_id,created_by\n  ) values(\n    p_payroll_id,v_teacher,v_date,v_amount,v_payment_method,\n    v_bank_name,v_bank_account_name,v_bank_account_number,\n    nullif(btrim(coalesce(p_payment_reference,'')),''),\n    nullif(btrim(coalesce(p_notes,'')),''),\n    null,null,v_actor\n  ) returning id into v_id;\n\n  select x.document_id,x.document_number into v_doc,v_receipt\n  from private.issue_document_number(\n    'receipt',\n    v_date,\n    'teacher_payroll:' || p_payroll_id::text,\n    'Kwitansi Honor ' || v_teacher_name,\n    'Honor periode ' || v_period_start::text || ' s.d. ' || v_period_end::text,\n    jsonb_build_object(\n      'payroll_id',p_payroll_id,\n      'teacher_id',v_teacher,\n      'payment_id',v_id,\n      'payment_date',v_date,\n      'amount',v_amount\n    ),\n    v_actor\n  ) x;\n\n  update private.teacher_payroll_payment_records\n  set receipt_number=v_receipt,receipt_document_id=v_doc\n  where id=v_id;\n\n  update private.teacher_payrolls\n  set status='paid',\n      paid_by=coalesce(v_actor,paid_by),\n      paid_at=coalesce(paid_at,now()),\n      paid_on=v_date,\n      payment_note=coalesce(\n        nullif(btrim(coalesce(p_payment_reference,'')),''),\n        nullif(btrim(coalesce(p_notes,'')),''),\n        payment_note\n      ),\n      updated_at=now()\n  where id=p_payroll_id;\n\n  return jsonb_build_object(\n    'payment_id',v_id,\n    'receipt_number',v_receipt,\n    'already_recorded',false\n  );\nend\n$function$;\n\ncreate or replace function public.finalize_management_teacher_monthly_report(p_monthly_report_id uuid)\nreturns text\nlanguage plpgsql\nsecurity definer\nset search_path to 'pg_catalog','public','private'\nas $function$\ndeclare\n  v_actor uuid:=auth.uid();\n  v_teacher uuid;\n  v_teacher_name text;\n  v_month date;\n  v_end date;\n  v_status text;\n  v_existing_number text;\n  v_existing_doc uuid;\n  v_finalized_at timestamptz;\n  v_snapshot jsonb;\n  v_doc uuid;\n  v_number text;\n  v_issue_date date;\nbegin\n  if v_actor is null then raise exception 'authentication_required'; end if;\n  if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;\n\n  select mr.teacher_id,mr.period_start,mr.period_end,mr.status,mr.report_number,mr.report_document_id,mr.finalized_at,\n         coalesce(nullif(btrim(pr.full_name),''),nullif(btrim(pr.nickname),''),'Pengajar KOJAC')\n  into v_teacher,v_month,v_end,v_status,v_existing_number,v_existing_doc,v_finalized_at,v_teacher_name\n  from private.teacher_monthly_reports mr\n  left join public.profiles pr on pr.user_id=mr.teacher_id\n  where mr.id=p_monthly_report_id\n  for update of mr;\n\n  if v_teacher is null then raise exception 'monthly_report_not_found'; end if;\n  if v_status='finalized' and v_existing_number is not null then return v_existing_number; end if;\n\n  if v_status<>'finalized' then\n    v_snapshot:=public.get_management_teacher_monthly_report(v_teacher,v_month);\n  end if;\n\n  v_issue_date:=coalesce((v_finalized_at at time zone 'Asia/Jakarta')::date,(current_timestamp at time zone 'Asia/Jakarta')::date);\n\n  select x.document_id,x.document_number into v_doc,v_number\n  from private.issue_document_number(\n    'teacher_monthly_report',\n    v_issue_date,\n    p_monthly_report_id::text,\n    'Laporan Bulanan Pengajar ' || v_teacher_name,\n    'Periode ' || v_month::text || ' s.d. ' || v_end::text,\n    jsonb_build_object(\n      'monthly_report_id',p_monthly_report_id,\n      'teacher_id',v_teacher,\n      'period_start',v_month,\n      'period_end',v_end\n    ),\n    v_actor\n  ) x;\n\n  update private.teacher_monthly_reports\n  set status='finalized',\n      snapshot=case when v_status='finalized' then snapshot else v_snapshot end,\n      report_number=v_number,\n      report_document_id=v_doc,\n      finalized_by=coalesce(finalized_by,v_actor),\n      finalized_at=coalesce(finalized_at,now()),\n      updated_at=now()\n  where id=p_monthly_report_id;\n\n  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)\n  values(v_actor,'finalize_teacher_monthly_report',v_teacher,jsonb_build_object(\n    'monthly_report_id',p_monthly_report_id,\n    'official_document_number',true,\n    'report_number',v_number\n  ));\n\n  return v_number;\nend\n$function$;\n\n-- Safe repair for any records created while these document types were inactive.\ndo $block$\ndeclare r record; v_doc uuid; v_number text; v_name text;\nbegin\n  for r in\n    select pr.id payment_id,pr.payroll_id,pr.teacher_id,pr.payment_date,pr.amount,\n           py.period_start,py.period_end\n    from private.teacher_payroll_payment_records pr\n    join private.teacher_payrolls py on py.id=pr.payroll_id\n    where pr.receipt_number is null\n  loop\n    select coalesce(nullif(btrim(p.full_name),''),nullif(btrim(p.nickname),''),'Pengajar KOJAC')\n      into v_name from public.profiles p where p.user_id=r.teacher_id;\n    v_name:=coalesce(v_name,'Pengajar KOJAC');\n\n    select x.document_id,x.document_number into v_doc,v_number\n    from private.issue_document_number(\n      'receipt',r.payment_date,'teacher_payroll:'||r.payroll_id::text,\n      'Kwitansi Honor '||v_name,\n      'Honor periode '||r.period_start::text||' s.d. '||r.period_end::text,\n      jsonb_build_object('payroll_id',r.payroll_id,'teacher_id',r.teacher_id,'payment_id',r.payment_id,'payment_date',r.payment_date,'amount',r.amount),\n      null\n    ) x;\n\n    update private.teacher_payroll_payment_records\n    set receipt_number=v_number,receipt_document_id=v_doc\n    where id=r.payment_id and receipt_number is null;\n  end loop;\nend\n$block$;\n\ndo $block$\ndeclare r record; v_doc uuid; v_number text; v_name text; v_issue_date date;\nbegin\n  for r in\n    select id,teacher_id,period_start,period_end,finalized_at\n    from private.teacher_monthly_reports\n    where status='finalized' and report_number is null\n  loop\n    select coalesce(nullif(btrim(p.full_name),''),nullif(btrim(p.nickname),''),'Pengajar KOJAC')\n      into v_name from public.profiles p where p.user_id=r.teacher_id;\n    v_name:=coalesce(v_name,'Pengajar KOJAC');\n    v_issue_date:=coalesce((r.finalized_at at time zone 'Asia/Jakarta')::date,(current_timestamp at time zone 'Asia/Jakarta')::date);\n\n    select x.document_id,x.document_number into v_doc,v_number\n    from private.issue_document_number(\n      'teacher_monthly_report',v_issue_date,r.id::text,\n      'Laporan Bulanan Pengajar '||v_name,\n      'Periode '||r.period_start::text||' s.d. '||r.period_end::text,\n      jsonb_build_object('monthly_report_id',r.id,'teacher_id',r.teacher_id,'period_start',r.period_start,'period_end',r.period_end),\n      null\n    ) x;\n\n    update private.teacher_monthly_reports\n    set report_number=v_number,report_document_id=v_doc,updated_at=now()\n    where id=r.id and report_number is null;\n  end loop;\nend\n$block$;\n";
function fail(m){console.error(`\n[FAIL] ${m}`);process.exit(1);}
function file(rel){return path.resolve(root,rel);}
function read(rel){const p=file(rel);if(!fs.existsSync(p))fail(`File wajib tidak ditemukan: ${rel}`);return fs.readFileSync(p,'utf8');}
function write(rel,c){const p=file(rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,c,'utf8');if(!changed.includes(rel))changed.push(rel);}
function patch(rel,fn){const before=read(rel);const after=fn(before);if(after!==before)write(rel,after);}
function count(src,needle){return src.split(needle).length-1;}
function replaceRequired(src,oldText,newText,label){if(src.includes(newText))return src;if(!src.includes(oldText))fail(`Anchor tidak cocok: ${label}`);return src.replace(oldText,newText);}

console.log('KOJAC Official Documents Reactivation V1.0.0');
console.log('Scope: receipt + teacher_monthly_report only. Slip Honor protected.');
if(!fs.existsSync(file('package.json'))||!fs.existsSync(file('src')))fail('Jalankan installer dari root project KOJAC LMS.');

const required=[
  'src/pages/ManagementHonorPaymentsPage.tsx',
  'src/pages/HonorReceiptPage.tsx',
  'src/pages/ManagementTeacherMonthlyReportPage.tsx',
  'src/pages/TeacherMonthlyReportsPage.tsx',
  'src/pages/TeacherMonthlyReportPrintPage.tsx',
  'src/pages/ManagementDocumentNumbersPage.tsx',
  'src/App.tsx',
  'src/components/AppShell.tsx'
];
for(const rel of required)read(rel);

// Slip Honor is intentionally never read-modify-written by this installer.
const protectedFiles=['src/pages/HonorSlipPage.tsx','src/honor-slip.css'];
for(const rel of protectedFiles){if(fs.existsSync(file(rel)))console.log(`[PROTECTED] ${rel}`);}

// 1) Payment administration: restore official receipt behavior and receipt access.
patch('src/pages/ManagementHonorPaymentsPage.tsx', source=>{
  source=source.replace(
    `      String(row.slip_number||'').toLowerCase().includes(needle) ||\n      String(row.payment_reference||'').toLowerCase().includes(needle)`,
    `      String(row.slip_number||'').toLowerCase().includes(needle) ||\n      String(row.receipt_number||'').toLowerCase().includes(needle) ||\n      String(row.payment_reference||'').toLowerCase().includes(needle)`
  );
  source=source.replace(
    `    const result=data as {already_recorded?:boolean};\n    setSelected(null);\n    setMessage(result.already_recorded?'Pembayaran sebelumnya sudah tercatat.':'Pembayaran honor tersimpan.');`,
    `    const result=data as {receipt_number?:string;already_recorded?:boolean};\n    setSelected(null);\n    const receipt=result.receipt_number?\` · \${result.receipt_number}\`:'';\n    setMessage(result.already_recorded?\`Pembayaran sebelumnya sudah tercatat\${receipt}.\`:\`Pembayaran honor tersimpan\${receipt}.\`);`
  );
  source=source.replace('Pusat administrasi pembayaran honor pengajar, rekening, slip, referensi transfer, dan status pembayaran.','Pusat administrasi pembayaran honor pengajar, rekening, slip, kwitansi resmi, referensi transfer, dan status pembayaran.');
  source=source.replace('placeholder="Cari pengajar / slip / referensi"','placeholder="Cari pengajar / slip / kwitansi / referensi"');

  if(!source.includes('<th>Kwitansi</th>')){
    const anchor='                <th>Status</th>\n                <th/>';
    if(!source.includes(anchor))fail('Anchor kolom Kwitansi tidak cocok.');
    source=source.replace(anchor,'                <th>Status</th>\n                <th>Kwitansi</th>\n                <th/>');
  }
  if(!source.includes(`<strong>{row.receipt_number||'—'}</strong>`)){
    const anchor=`                <td>\n                  <span className={\`honor-payment-status is-\${row.status}\`}>{statusLabel(row.status)}</span>\n                  {row.payment_date&&<small>{fmtDate(row.payment_date)} · {row.payment_method}</small>}\n                  {row.payment_reference&&<small>Ref: {row.payment_reference}</small>}\n                </td>\n                <td>`;
    const repl=`                <td>\n                  <span className={\`honor-payment-status is-\${row.status}\`}>{statusLabel(row.status)}</span>\n                  {row.payment_date&&<small>{fmtDate(row.payment_date)} · {row.payment_method}</small>}\n                  {row.payment_reference&&<small>Ref: {row.payment_reference}</small>}\n                </td>\n                <td><strong>{row.receipt_number||'—'}</strong></td>\n                <td>`;
    if(!source.includes(anchor))fail('Anchor cell Kwitansi tidak cocok.');
    source=source.replace(anchor,repl);
  }
  const slipLink=`                    <Link className="honor-payment-secondary" to={\`/honor/slip/\${row.payroll_id}\`} target="_blank">\n                      <FileText size={14}/> Slip\n                    </Link>`;
  if(!source.includes('/honor/kwitansi/')){
    if(!source.includes(slipLink))fail('Anchor tombol Slip tidak cocok.');
    source=source.replace(slipLink,`${slipLink}\n                    {row.status==='paid'&&row.receipt_number&&\n                      <Link className="honor-payment-secondary" to={\`/honor/kwitansi/\${row.payroll_id}\`} target="_blank" rel="noopener noreferrer">\n                        <ReceiptText size={14}/> Kwitansi\n                      </Link>}`);
  }
  source=source.replace('Setelah disimpan, payroll menjadi <strong>Dibayar</strong>. Nomor KWT tidak diterbitkan untuk pembayaran baru; record legacy tetap dipertahankan di audit trail.','Setelah disimpan, payroll menjadi <strong>Dibayar</strong> dan sistem menerbitkan nomor Kwitansi resmi secara otomatis.');

  if(source.includes('Nomor KWT tidak diterbitkan'))fail('UI pembayaran masih memakai kebijakan KWT inactive.');
  return source;
});

// 2) Monthly report: official number is issued on finalization.
patch('src/pages/ManagementTeacherMonthlyReportPage.tsx', source=>{
  source=source.replace('Finalkan laporan bulanan? Snapshot laporan akan dikunci dan tidak dapat diedit lagi.','Finalkan laporan bulanan? Snapshot dan nomor laporan resmi akan dikunci.');
  source=source.replace(
    `    const {error}=await supabase.rpc('finalize_management_teacher_monthly_report',{p_monthly_report_id:reportId});\n    setBusy(false);\n    if(error){console.error(error);setMessage('Laporan bulanan belum dapat difinalkan.');return;}\n    setMessage('Laporan bulanan berhasil difinalkan.');`,
    `    const {data,error}=await supabase.rpc('finalize_management_teacher_monthly_report',{p_monthly_report_id:reportId});\n    setBusy(false);\n    if(error){console.error(error);setMessage('Laporan bulanan belum dapat difinalkan.');return;}\n    setMessage(\`Laporan final · \${String(data||'nomor belum tersedia')}\`);`
  );
  source=source.replace(`{p.saved_report?.report_number&&<strong>Nomor legacy: {p.saved_report.report_number}</strong>}`,`{p.saved_report?.report_number&&<strong>{p.saved_report.report_number}</strong>}`);
  if(source.includes('Nomor legacy:'))fail('Monthly management masih menandai nomor sebagai legacy.');
  return source;
});

patch('src/pages/TeacherMonthlyReportsPage.tsx', source=>{
  source=source.replace(`{r.report_number?\`Nomor legacy: \${r.report_number}\`:'Final · tanpa nomor dokumen resmi'}`,`{r.report_number||'Nomor belum tersedia'}`);
  return source;
});

patch('src/pages/TeacherMonthlyReportPrintPage.tsx', source=>{
  source=source.replaceAll(`{detail.report_number?\`LEGACY · \${detail.report_number}\`:(detail.status==='finalized'?'FINAL':'DRAFT')}`,`{detail.report_number||(detail.status==='finalized'?'NOMOR BELUM TERBIT':'DRAFT')}`);
  if(source.includes('LEGACY ·'))fail('Print monthly masih menandai nomor sebagai legacy.');
  return source;
});

// 3) Document registry: five official types are active. Receipt/monthly are automatic, not manual issue forms.
patch('src/pages/ManagementDocumentNumbersPage.tsx', source=>{
  const current=`const OFFICIAL_DOCUMENT_TYPES = new Set(['honor_slip','letter','invoice']);\nconst LEGACY_DOCUMENT_TYPES = new Set(['receipt','teacher_monthly_report']);`;
  const active=`const OFFICIAL_DOCUMENT_TYPES = new Set(['honor_slip','letter','invoice','receipt','teacher_monthly_report']);\nconst AUTOMATIC_DOCUMENT_TYPES = new Set(['honor_slip','receipt','teacher_monthly_report']);\nconst MANUAL_DOCUMENT_TYPES = new Set(['letter','invoice']);`;
  if(source.includes(current))source=source.replace(current,active);
  else if(!source.includes('AUTOMATIC_DOCUMENT_TYPES'))fail('Konstanta scope dokumen tidak cocok.');

  source=source.replace(`if(!OFFICIAL_DOCUMENT_TYPES.has(issueForm.document_type)||issueForm.document_type==='honor_slip')`,`if(!MANUAL_DOCUMENT_TYPES.has(issueForm.document_type))`);
  source=source.replace(`if(LEGACY_DOCUMENT_TYPES.has(editing.document_type)){\n      setMessage('Jenis dokumen legacy bersifat nonaktif dan hanya dipertahankan untuk audit trail.');\n      setEditing(null);\n      return;\n    }\n    `,'');
  source=source.replace(`    if(!OFFICIAL_DOCUMENT_TYPES.has(row.document_type)||row.document_type==='honor_slip')return;`,`    if(!MANUAL_DOCUMENT_TYPES.has(row.document_type))return;`);
  source=source.replace('Register nomor resmi KOJAC untuk Surat, Slip Honor, dan Invoice Pembayaran. Record legacy tetap tersedia untuk audit trail.','Register nomor resmi KOJAC untuk Surat, Slip Honor, Invoice Pembayaran, Kwitansi Honor, dan Laporan Bulanan Pengajar.');
  source=source.replace('Slip Honor dibuat otomatis ketika payroll difinalkan. Penerbitan manual hanya tersedia untuk Surat dan Invoice Pembayaran.','Slip Honor, Kwitansi Honor, dan Laporan Bulanan Pengajar diterbitkan otomatis dari flow masing-masing. Penerbitan manual hanya tersedia untuk Surat dan Invoice Pembayaran.');
  source=source.replace(`{payload.settings.filter(x=>x.is_active&&OFFICIAL_DOCUMENT_TYPES.has(x.document_type)&&x.document_type!=='honor_slip').map(x=>`,`{payload.settings.filter(x=>x.is_active&&MANUAL_DOCUMENT_TYPES.has(x.document_type)).map(x=>`);

  const legacyBlock=`<span className={s.is_active?'doc-type-status':'doc-type-status is-off'}>\n              {LEGACY_DOCUMENT_TYPES.has(s.document_type)?'Legacy / Nonaktif':s.is_active?'Aktif':'Nonaktif'}\n            </span>\n            <button className="doc-secondary" disabled={LEGACY_DOCUMENT_TYPES.has(s.document_type)} onClick={()=>setEditing({...s})}>\n              <Settings2 size={14}/> {LEGACY_DOCUMENT_TYPES.has(s.document_type)?'Legacy':'Atur'}\n            </button>`;
  const activeBlock=`<span className={s.is_active?'doc-type-status':'doc-type-status is-off'}>\n              {s.is_active?'Aktif':'Nonaktif'}\n            </span>\n            <button className="doc-secondary" onClick={()=>setEditing({...s})}>\n              <Settings2 size={14}/> Atur\n            </button>`;
  if(source.includes(legacyBlock))source=source.replace(legacyBlock,activeBlock);

  source=source.replace(`{OFFICIAL_DOCUMENT_TYPES.has(row.document_type)&&row.document_type!=='honor_slip'&&row.status==='issued'&&`,`{MANUAL_DOCUMENT_TYPES.has(row.document_type)&&row.status==='issued'&&`);
  source=source.replace(`{LEGACY_DOCUMENT_TYPES.has(s.document_type)?'Legacy / Nonaktif':s.is_active?'Aktif':'Nonaktif'}`,`{s.is_active?'Aktif':'Nonaktif'}`);
  source=source.replace(`disabled={LEGACY_DOCUMENT_TYPES.has(s.document_type)}`,``);
  source=source.replace(`{LEGACY_DOCUMENT_TYPES.has(s.document_type)?'Legacy':'Atur'}`,`Atur`);

  if(source.includes('LEGACY_DOCUMENT_TYPES'))fail('Registry masih memiliki guard legacy untuk receipt/monthly.');
  return source;
});

// 4) Validate existing routes/menu instead of introducing duplicates.
const app=read('src/App.tsx');
const shell=read('src/components/AppShell.tsx');
for(const route of ['honor/kwitansi/:payrollId','manajemen/laporan-pengajar-bulanan','pengajar/laporan-bulanan','laporan-pengajar-bulanan/:reportId']){
  if(count(app,route)!==1)fail(`Route ${route} harus tepat 1, ditemukan ${count(app,route)}.`);
}
if(!shell.includes('laporan-pengajar-bulanan')&&!shell.includes('Laporan Bulanan'))fail('Menu Laporan Bulanan Pengajar tidak ditemukan di AppShell.');

const receiptPage=read('src/pages/HonorReceiptPage.tsx');
if(!receiptPage.includes('receipt_number')||!receiptPage.includes('window.print()'))fail('Implementasi Kwitansi lama tidak lengkap.');

// 5) Add NEW migration file to source tree. Never execute it here.
if(fs.existsSync(file(migrationRel))){
  const existing=fs.readFileSync(file(migrationRel),'utf8');
  if(existing!==migrationSql)fail(`Migration ${migrationRel} sudah ada tetapi isinya berbeda.`);
}else{write(migrationRel,migrationSql);}

// Final static checks.
const payment=read('src/pages/ManagementHonorPaymentsPage.tsx');
const monthly=read('src/pages/ManagementTeacherMonthlyReportPage.tsx');
const registry=read('src/pages/ManagementDocumentNumbersPage.tsx');
const checks=[
  ['payment receipt search',payment.includes('row.receipt_number')],
  ['payment receipt button',payment.includes('/honor/kwitansi/')],
  ['payment receipt message',payment.includes('receipt_number?:string')],
  ['monthly finalize returns number',monthly.includes(`const {data,error}=await supabase.rpc('finalize_management_teacher_monthly_report'`)],
  ['registry receipt active scope',registry.includes("'receipt','teacher_monthly_report'")],
  ['registry automatic types',registry.includes('AUTOMATIC_DOCUMENT_TYPES')],
  ['migration present',fs.existsSync(file(migrationRel))]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length)fail(`Verifikasi gagal: ${failed.map(([n])=>n).join(', ')}`);

console.log('');
console.log('[PASS] Official Documents Reactivation frontend/source patch terpasang.');
console.log('[PASS] Kwitansi Honor kembali tampil dari payment record dan route existing.');
console.log('[PASS] Laporan Bulanan kembali memakai nomor resmi dari finalize RPC.');
console.log('[PASS] Registry mengenali 5 jenis dokumen resmi.');
console.log('[PASS] Slip Honor tidak diubah.');
console.log('[PASS] Migration BARU ditulis ke source, tetapi TIDAK dijalankan.');
console.log('[CHANGED] '+(changed.length?changed.join(', '):'none (already installed)'));
console.log('[NEXT] git diff --check');
console.log('[NEXT] npm run build');
console.log(`[DB] Apply migration secara terkontrol setelah review: ${migrationRel}`);
