#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const TAG = '[KOJAC Invoice Payment BSI Only V1.0.5]';

function fail(message) {
  console.error(`\n${TAG} ERROR: ${message}\n`);
  process.exit(1);
}
function ok(message) {
  console.log(`${TAG} ${message}`);
}
function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) fail(`File tidak ditemukan: ${rel}`);
  return fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
}
function write(rel, content) {
  const abs = path.join(root, rel);
  fs.writeFileSync(abs, content.replace(/\r\n/g, '\n'), 'utf8');
  ok(`patched ${rel}`);
}

const pkg = JSON.parse(read('package.json'));
if (pkg.name !== 'kojac-lms-v2') {
  fail(`Project bukan kojac-lms-v2 (package name: ${pkg.name ?? 'unknown'})`);
}

const pdfRel = 'src/features/invoice/invoicePdf.ts';
let pdf = read(pdfRel);

if (!pdf.includes('function paymentMethodsHtml(detail: InvoiceDetail)')) {
  fail('Anchor paymentMethodsHtml tidak ditemukan. Actual invoicePdf.ts berbeda; patch dibatalkan.');
}
if (!pdf.includes('REKAPAN SESI KELAS')) {
  fail('Anchor halaman 2 Rekapan Sesi Kelas tidak ditemukan. Patch dibatalkan.');
}

const oldAnchor = `function paymentMethodsHtml(detail: InvoiceDetail) {
  const methods = detail.payment_methods_snapshot ?? [];
  if (!methods.length) return '<div class="muted">Metode pembayaran mengikuti informasi resmi KOJAC.</div>';`;

const newAnchor = `function paymentMethodsHtml(detail: InvoiceDetail) {
  // Historical invoices may still contain old payment-method snapshots.
  // Display policy is BSI-only without rewriting immutable invoice history.
  const methods = (detail.payment_methods_snapshot ?? []).filter(
    (method) => method.label.trim().toLowerCase() === 'bank bsi',
  );
  if (!methods.length) return '<div class="muted">Metode pembayaran Bank BSI belum tersedia pada snapshot invoice ini.</div>';`;

const alreadyFixed =
  pdf.includes("method.label.trim().toLowerCase() === 'bank bsi'") &&
  pdf.includes('Metode pembayaran Bank BSI belum tersedia pada snapshot invoice ini.');

if (alreadyFixed) {
  ok('Filter Bank BSI sudah terpasang; tidak ada perubahan file.');
} else if (pdf.includes(oldAnchor)) {
  pdf = pdf.replace(oldAnchor, newAnchor);
  write(pdfRel, pdf);
} else {
  fail('Anchor metode pembayaran lama tidak cocok. Actual invoicePdf.ts berbeda; patch dibatalkan tanpa overwrite.');
}

const verify = read(pdfRel);
if (!verify.includes("method.label.trim().toLowerCase() === 'bank bsi'")) {
  fail('Filter Bank BSI belum terpasang.');
}
if (!verify.includes('Metode Pembayaran') || !verify.includes('paymentMethodsHtml(detail)')) {
  fail('Blok Metode Pembayaran Invoice berubah/tidak lengkap.');
}
if (!verify.includes('REKAPAN SESI KELAS')) {
  fail('Halaman 2 Rekapan Sesi Kelas hilang.');
}
if (!verify.includes('win.document.write(html);')) {
  fail('Pipeline render PDF/Print tidak lengkap.');
}

ok('Verification PASS');
console.log(`\nHOTFIX V1.0.5 TERPASANG.\n\nFile yang berubah:\n  ${pdfRel}\n\nBehavior:\n  - PDF/Print Invoice hanya menampilkan Bank BSI\n  - ShopeePay/Dana dari snapshot invoice lama tidak lagi ditampilkan\n  - histori database tidak diubah\n  - desain PDF dan halaman 2 tidak diubah\n\nSelanjutnya jalankan:\n  git diff --check\n  npm run build\n\nRuntime:\n  1. Buka invoice lama yang sebelumnya menampilkan 3 metode\n  2. Klik PDF / Print\n  3. Pastikan hanya Bank BSI tampil\n  4. Pastikan halaman 1 dan 2 tetap normal\n  5. Cek Console\n\nTidak menjalankan Supabase/migration dan tidak menyentuh Slip Honor.\n`);
