#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function fail(message) {
  console.error(`\n[KOJAC Invoice V1.0.3] ERROR: ${message}\n`);
  process.exit(1);
}
function ok(message) {
  console.log(`[KOJAC Invoice V1.0.3] ${message}`);
}
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) fail(`File tidak ditemukan: ${rel}`);
  return fs.readFileSync(p, 'utf8');
}
function write(rel, content) {
  const p = path.join(root, rel);
  fs.writeFileSync(p, content.replace(/\r\n/g, '\n'), 'utf8');
  ok(`patch ${rel}`);
}
function replaceAllRequired(content, before, after, label) {
  const count = content.split(before).length - 1;
  if (count < 1) fail(`Anchor tidak ditemukan: ${label}`);
  return content.split(before).join(after);
}

const pkg = JSON.parse(read('package.json'));
if (pkg.name !== 'kojac-lms-v2') fail(`Project bukan kojac-lms-v2 (${pkg.name})`);

const managementRel = 'src/pages/ManagementInvoicesPage.tsx';
let management = read(managementRel);

if (!management.includes("recipient_kind:'student'")) {
  fail('Frontend Invoice V1 tidak terdeteksi pada ManagementInvoicesPage.tsx');
}

/* 1. recipient kind contract: student | institution */
management = management
  .replace(
    "<option value=\"organization\">Lembaga</option>",
    "<option value=\"institution\">Lembaga</option>"
  );

/* 2. edit contract uses invoice_id */
management = management
  .replace(
    "id: draft.id || null,",
    "invoice_id: draft.id || null,"
  );

/* 3. class snapshot input contract uses class_name */
management = management
  .replace(
    "class_name_snapshot:draft.class_name_snapshot.trim() || null,",
    "class_name:draft.class_name_snapshot.trim() || null,"
  );

write(managementRel, management);

const typesRel = 'src/features/invoice/types.ts';
let types = read(typesRel);
types = types.replace(
  "export type RecipientKind = 'student' | 'organization';",
  "export type RecipientKind = 'student' | 'institution';"
);
write(typesRel, types);

/* Defensive verification */
const verifyManagement = read(managementRel);
const verifyTypes = read(typesRel);

if (verifyManagement.includes('value="organization"')) {
  fail('organization masih ditemukan sebagai recipient_kind option.');
}
if (!verifyManagement.includes('value="institution"')) {
  fail('institution belum terpasang sebagai recipient_kind option.');
}
if (!verifyManagement.includes('invoice_id: draft.id || null')) {
  fail('invoice_id contract belum terpasang.');
}
if (!verifyManagement.includes('class_name:draft.class_name_snapshot.trim() || null')) {
  fail('class_name contract belum terpasang.');
}
if (!verifyTypes.includes("'student' | 'institution'")) {
  fail('RecipientKind type belum sesuai production.');
}

ok('RPC contract verification PASS');

console.log(`
HOTFIX V1.0.3 SELESAI.

Perbaikan:
  recipient_kind: student | institution
  edit payload: invoice_id
  class payload: class_name

Sekarang jalankan:
  git diff --check
  npm run build

Setelah PASS:
  npm run dev

Lalu ulangi:
  Management → Invoice Pembayaran → Buat Invoice → Simpan Draft

JANGAN:
  - supabase db push
  - replay migration
  - reset Supabase
  - ubah Slip Honor
`);
