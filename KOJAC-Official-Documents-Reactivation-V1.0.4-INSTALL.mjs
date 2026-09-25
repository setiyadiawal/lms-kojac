import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { console.error(`\n[FAIL] ${message}`); process.exit(1); };
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(root, rel), value, 'utf8');

console.log('KOJAC Official Documents Reactivation V1.0.4');
console.log('Scope: Kwitansi Honor corner ornament + footer alignment only. Slip Honor protected.');

if (!exists('package.json') || !exists('src')) fail('Jalankan installer dari root project KOJAC LMS.');

const pageFile = 'src/pages/HonorReceiptPage.tsx';
const cssFile = 'src/honor-receipt.css';

if (!exists(pageFile)) fail(`${pageFile} tidak ditemukan. Pasang Official Documents Reactivation V1.0.1 terlebih dahulu.`);
if (!exists(cssFile)) fail(`${cssFile} tidak ditemukan. Pasang Official Documents Reactivation V1.0.1 terlebih dahulu.`);

const pageBefore = read(pageFile);
const cssBefore = read(cssFile);

if (!pageBefore.includes('payment.amount') || !pageBefore.includes('window.print()')) {
  fail('Contract HonorReceiptPage tidak dikenali. Patch dihentikan agar tidak overwrite struktur yang berbeda.');
}

// Slip Honor is reference only; this installer never opens or modifies Slip Honor files.
if (/HonorSlipPage|honor-slip\.css/.test(pageFile + cssFile)) fail('Slip Honor protection guard triggered.');

const expectedFooter = `<footer className="honor-receipt-footer">\n          <span>空白オンライン日本語クラス</span>\n          <strong>Kuuhaku Online Japanese Class</strong>\n          <small>一緒に一生懸命勉強しましょう！</small>\n          <b>KOJAC</b>\n        </footer>`;

if (!pageBefore.includes(expectedFooter)) {
  fail('Footer Kwitansi V1.0.3 tidak ditemukan. Pastikan V1.0.3 sudah terpasang; tidak melakukan overwrite.');
}
if (pageBefore.includes('honor-receipt-stamp')) fail('Logo/stamp kanan bawah masih ada. Pastikan V1.0.3 sudah terpasang terlebih dahulu.');
if (pageBefore.includes('{fmtDate(payment.payment_date)}</span>\n            <strong>KOJAC</strong>')) fail('Tanggal area bawah masih ada. Pastikan V1.0.3 sudah terpasang terlebih dahulu.');

const oldAccent = '.honor-receipt-accent{position:absolute;width:78mm;height:15mm;background:linear-gradient(90deg,#ff3138 0 31%,#fff 31% 34%,#7b2529 34% 66%,#fff 66% 69%,#ff3138 69% 100%);transform:rotate(-45deg);z-index:1}.honor-receipt-accent.top{left:-30mm;top:8mm}.honor-receipt-accent.bottom{right:-30mm;bottom:8mm}';

const newAccent = '.honor-receipt-accent{position:absolute;width:43mm;height:43mm;z-index:1;pointer-events:none;overflow:hidden;background:linear-gradient(135deg,#ff3138 0 18%,transparent 18% 23%,#7b2529 23% 41%,transparent 41% 46%,#ff3138 46% 59%,transparent 59% 100%)}.honor-receipt-accent.top{left:0;top:0}.honor-receipt-accent.bottom{right:0;bottom:0;transform:rotate(180deg)}';

const oldFooter = '.honor-receipt-footer{position:relative;left:auto;right:auto;bottom:auto;margin-top:auto;padding:10mm 34mm 1mm;text-align:center;display:grid;justify-items:center;gap:1.2mm}.honor-receipt-footer span{font-size:12px;line-height:1.1}.honor-receipt-footer strong{font-size:14px;line-height:1.1}.honor-receipt-footer small{font-size:9px;line-height:1.15}.honor-receipt-footer b{margin-top:1.3mm;font-size:11px;line-height:1;font-weight:800;letter-spacing:.04em}';

const newFooter = '.honor-receipt-footer{position:relative;left:auto;right:auto;bottom:auto;margin-top:auto;padding:10mm 43mm 3mm;text-align:center;display:grid;justify-items:center;align-content:end;gap:1.1mm;min-height:26mm}.honor-receipt-footer span{font-size:12px;line-height:1.15}.honor-receipt-footer strong{font-size:14px;line-height:1.15}.honor-receipt-footer small{font-size:9px;line-height:1.2}.honor-receipt-footer b{margin-top:1.5mm;font-size:11px;line-height:1;font-weight:800;letter-spacing:.04em}';

const alreadyFixed = cssBefore.includes(newAccent) && cssBefore.includes(newFooter);
if (alreadyFixed) {
  console.log('[PASS] Layout Kwitansi sudah menggunakan V1.0.4. Tidak ada perubahan.');
  process.exit(0);
}

if (!cssBefore.includes(oldAccent)) fail('Anchor ornamen V1.0.3 tidak ditemukan. Actual CSS berbeda; tidak melakukan overwrite.');
if (!cssBefore.includes(oldFooter)) fail('Anchor footer V1.0.3 tidak ditemukan. Actual CSS berbeda; tidak melakukan overwrite.');

let css = cssBefore.replace(oldAccent, newAccent).replace(oldFooter, newFooter);
write(cssFile, css);

const pageAfter = read(pageFile);
const cssAfter = read(cssFile);

if (pageAfter.includes('honor-receipt-stamp')) fail('Verifikasi gagal: logo kanan bawah masih ada.');
if (pageAfter.includes('{fmtDate(payment.payment_date)}</span>\n            <strong>KOJAC</strong>')) fail('Verifikasi gagal: tanggal area bawah masih ada.');
if (!pageAfter.includes(expectedFooter)) fail('Verifikasi gagal: slogan/KOJAC footer tidak berubah sesuai contract.');
if (!cssAfter.includes(newAccent)) fail('Verifikasi gagal: ornamen sudut V1.0.4 belum terpasang.');
if (!cssAfter.includes(newFooter)) fail('Verifikasi gagal: footer center V1.0.4 belum terpasang.');
if (!pageAfter.includes('payment.amount')) fail('Contract nominal payment record berubah secara tidak sengaja.');

console.log(`[PATCHED] ${cssFile}`);
console.log('[PASS] Tanggal area bawah tetap tidak ditampilkan.');
console.log('[PASS] Slogan + KOJAC tetap center dan simetris.');
console.log('[PASS] Logo/stamp kanan bawah tetap tidak ditampilkan.');
console.log('[PASS] Ornamen kiri atas sekarang berupa corner motif merah-maroon-merah seperti referensi Slip Honor.');
console.log('[PASS] Ornamen kanan bawah adalah mirror dari motif kiri atas.');
console.log('[PASS] Slip Honor tidak disentuh.');
console.log('\nSelanjutnya jalankan:');
console.log('  git diff --check');
console.log('  npm run build');
