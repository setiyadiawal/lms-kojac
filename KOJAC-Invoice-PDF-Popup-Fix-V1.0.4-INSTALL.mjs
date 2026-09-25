#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const TAG = '[KOJAC Invoice PDF Popup Fix V1.0.4]';

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
const detailRel = 'src/pages/InvoiceDetailPage.tsx';
let pdf = read(pdfRel);
const detailPage = read(detailRel);

// Audit handler: popup must originate from the synchronous user click.
if (!detailPage.includes('printInvoicePdf(detail)')) {
  fail('Anchor printInvoicePdf(detail) tidak ditemukan di InvoiceDetailPage.tsx. Actual project berbeda; patch dibatalkan.');
}
if (/onClick\s*=\s*\{\s*async\b/.test(detailPage) && detailPage.includes('printInvoicePdf(detail)')) {
  fail('Handler PDF terdeteksi async. Patch ini hanya aman untuk synchronous user click; patch dibatalkan.');
}

const oldSingle = "  const win = window.open('', '_blank', 'noopener,noreferrer');\n  if (!win) throw new Error('popup_blocked');";
const oldDouble = '  const win = window.open("", "_blank", "noopener,noreferrer");\n  if (!win) throw new Error("popup_blocked");';

const replacement = `  // Open synchronously from the user click so browser popup policies can allow it.\n  const win = window.open('about:blank', '_blank');\n\n  if (!win) {\n    window.alert(\n      'Browser memblokir jendela PDF. Izinkan pop-up untuk LMS KOJAC lalu coba lagi.',\n    );\n    return;\n  }\n\n  // Break the opener reference without relying on window.open feature flags that\n  // can cause some browsers to return null even when a new tab is created.\n  try {\n    win.opener = null;\n  } catch {\n    // Some browsers may prevent assigning opener; printing can still continue.\n  }`;

const alreadyFixed =
  pdf.includes("window.open('about:blank', '_blank')") &&
  pdf.includes('win.opener = null') &&
  pdf.includes('Browser memblokir jendela PDF. Izinkan pop-up untuk LMS KOJAC lalu coba lagi.') &&
  !pdf.includes("throw new Error('popup_blocked')") &&
  !pdf.includes('throw new Error("popup_blocked")');

if (alreadyFixed) {
  ok('Hotfix sudah terpasang; tidak ada perubahan file.');
} else if (pdf.includes(oldSingle)) {
  pdf = pdf.replace(oldSingle, replacement);
  write(pdfRel, pdf);
} else if (pdf.includes(oldDouble)) {
  pdf = pdf.replace(oldDouble, replacement);
  write(pdfRel, pdf);
} else {
  fail('Anchor window.open/popup_blocked tidak ditemukan. Actual invoicePdf.ts berbeda; patch dibatalkan tanpa overwrite.');
}

const verify = read(pdfRel);

if (verify.includes("throw new Error('popup_blocked')") || verify.includes('throw new Error("popup_blocked")')) {
  fail('Uncaught popup_blocked masih ditemukan setelah patch.');
}
if (!verify.includes("window.open('about:blank', '_blank')")) {
  fail('Pola synchronous about:blank belum terpasang.');
}
if (!verify.includes('win.opener = null')) {
  fail('Safe opener detachment belum terpasang.');
}
if (!verify.includes('Browser memblokir jendela PDF. Izinkan pop-up untuk LMS KOJAC lalu coba lagi.')) {
  fail('Pesan popup-blocked user-friendly belum terpasang.');
}
if (!verify.includes('win.document.open();') || !verify.includes('win.document.write(html);') || !verify.includes('win.document.close();')) {
  fail('Pipeline render PDF/Print berubah/tidak lengkap. Patch dibatalkan dari status PASS.');
}
if (!verify.includes('REKAPAN SESI KELAS')) {
  fail('Anchor halaman 2 Rekapan Sesi Kelas tidak ditemukan.');
}

ok('Verification PASS');
console.log(`\nHOTFIX V1.0.4 TERPASANG.\n\nFile yang boleh berubah:\n  ${pdfRel}\n\nFile yang hanya diaudit:\n  ${detailRel}\n\nSelanjutnya jalankan:\n  git diff --check\n  npm run build\n\nSetelah build PASS, runtime test:\n  1. Buka Invoice Detail\n  2. Klik PDF / Print\n  3. Pastikan tab print terbuka\n  4. Pastikan Console tidak menampilkan popup_blocked\n  5. Cek halaman 1\n  6. Cek halaman 2 Rekapan Sesi Kelas\n  7. Tutup print dan ulangi\n  8. Refresh browser dan test ulang\n\nTidak menjalankan Supabase/migration dan tidak menyentuh Slip Honor.\n`);
