import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (m) => { console.error(`\n[FAIL] ${m}`); process.exit(1); };
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(root, rel), value, 'utf8');

console.log('KOJAC Official Documents Reactivation V1.0.3');
console.log('Scope: Kwitansi Honor footer/corner visual correction only. Slip Honor protected.');

if (!exists('package.json') || !exists('src')) fail('Jalankan installer dari root project KOJAC LMS.');

const pageFile = 'src/pages/HonorReceiptPage.tsx';
const cssFile = 'src/honor-receipt.css';

if (!exists(pageFile)) fail(`${pageFile} tidak ditemukan. Pasang Official Documents Reactivation V1.0.1 terlebih dahulu.`);
if (!exists(cssFile)) fail(`${cssFile} tidak ditemukan. Pasang Official Documents Reactivation V1.0.1 terlebih dahulu.`);

const pageBefore = read(pageFile);
const cssBefore = read(cssFile);

if (/HonorSlipPage|honor-slip\.css/.test(pageFile + cssFile)) fail('Slip Honor protection guard triggered.');
if (!pageBefore.includes('window.print()') || !pageBefore.includes('payment.amount')) fail('HonorReceiptPage contract tidak dikenali. Patch dihentikan.');

const alreadyFixed =
  !pageBefore.includes('honor-receipt-stamp') &&
  !pageBefore.includes('{fmtDate(payment.payment_date)}</span>\n            <strong>KOJAC</strong>') &&
  pageBefore.includes('<b>KOJAC</b>') &&
  cssBefore.includes('linear-gradient(90deg,#ff3138 0 31%,#fff 31% 34%,#7b2529 34% 66%,#fff 66% 69%,#ff3138 69% 100%)') &&
  cssBefore.includes('margin-top:auto;padding:10mm 34mm 1mm');

if (alreadyFixed) {
  console.log('[PASS] Layout Kwitansi sudah menggunakan V1.0.3. Tidak ada perubahan.');
  process.exit(0);
}

const oldBlock = `        <section className="honor-receipt-sign">\n          <div>\n            <span>{fmtDate(payment.payment_date)}</span>\n            <strong>KOJAC</strong>\n            <div className="honor-receipt-sign-space"/>\n            <b>Manajemen KOJAC</b>\n          </div>\n          <div className="honor-receipt-stamp">\n            <img src="/brand/kojac-symbol.png" alt=""/>\n          </div>\n        </section>\n\n        <footer className="honor-receipt-footer">\n          <span>空白オンライン日本語クラス</span>\n          <strong>Kuuhaku Online Japanese Class</strong>\n          <small>一緒に一生懸命勉強しましょう！</small>\n        </footer>`;

const newBlock = `        <footer className="honor-receipt-footer">\n          <span>空白オンライン日本語クラス</span>\n          <strong>Kuuhaku Online Japanese Class</strong>\n          <small>一緒に一生懸命勉強しましょう！</small>\n          <b>KOJAC</b>\n        </footer>`;

if (!pageBefore.includes(oldBlock)) fail('Anchor blok tanggal/logo/footer tidak ditemukan. Actual HonorReceiptPage berbeda; tidak melakukan overwrite.');

let page = pageBefore.replace(oldBlock, newBlock);
let css = cssBefore;

const oldAccent = '.honor-receipt-accent{position:absolute;width:180px;height:31px;background:#ef3239;transform:rotate(-45deg);z-index:1}.honor-receipt-accent:before{content:"";position:absolute;left:42px;top:0;width:52px;height:31px;background:#76232c}.honor-receipt-accent.top{left:-63px;top:31px}.honor-receipt-accent.bottom{right:-63px;bottom:31px}';
const newAccent = '.honor-receipt-accent{position:absolute;width:78mm;height:15mm;background:linear-gradient(90deg,#ff3138 0 31%,#fff 31% 34%,#7b2529 34% 66%,#fff 66% 69%,#ff3138 69% 100%);transform:rotate(-45deg);z-index:1}.honor-receipt-accent.top{left:-30mm;top:8mm}.honor-receipt-accent.bottom{right:-30mm;bottom:8mm}';

const oldLayer = '.honor-receipt-header,.honor-receipt-main,.honor-receipt-payment,.honor-receipt-sign,.honor-receipt-footer,.honor-receipt-divider{position:relative;z-index:2;flex:0 0 auto}';
const newLayer = '.honor-receipt-header,.honor-receipt-main,.honor-receipt-payment,.honor-receipt-footer,.honor-receipt-divider{position:relative;z-index:2;flex:0 0 auto}';

const oldSign = '.honor-receipt-sign{display:flex;justify-content:flex-end;align-items:center;gap:12mm;margin-top:auto;padding-top:12mm}.honor-receipt-sign>div:first-child{width:62mm;text-align:center;display:grid;gap:2mm;font-size:10pt}.honor-receipt-sign-space{height:19mm}.honor-receipt-stamp img{width:30mm;height:30mm;object-fit:contain;opacity:.18}\n';

const oldFooter = '.honor-receipt-footer{position:relative;left:auto;right:auto;bottom:auto;margin-top:8mm;text-align:center;display:grid;gap:2px}.honor-receipt-footer span{font-size:12px}.honor-receipt-footer strong{font-size:14px}.honor-receipt-footer small{font-size:9px}';
const newFooter = '.honor-receipt-footer{position:relative;left:auto;right:auto;bottom:auto;margin-top:auto;padding:10mm 34mm 1mm;text-align:center;display:grid;justify-items:center;gap:1.2mm}.honor-receipt-footer span{font-size:12px;line-height:1.1}.honor-receipt-footer strong{font-size:14px;line-height:1.1}.honor-receipt-footer small{font-size:9px;line-height:1.15}.honor-receipt-footer b{margin-top:1.3mm;font-size:11px;line-height:1;font-weight:800;letter-spacing:.04em}';

for (const [anchor, label] of [[oldAccent,'ornamen sudut'],[oldLayer,'content layer'],[oldSign,'blok tanggal/logo kanan bawah'],[oldFooter,'footer']]) {
  if (!css.includes(anchor)) fail(`Anchor ${label} tidak ditemukan. Pastikan V1.0.2 sudah terpasang; tidak melakukan overwrite.`);
}

css = css.replace(oldAccent, newAccent)
  .replace(oldLayer, newLayer)
  .replace(oldSign, '')
  .replace(oldFooter, newFooter);

write(pageFile, page);
write(cssFile, css);

const pageAfter = read(pageFile);
const cssAfter = read(cssFile);
if (pageAfter.includes('honor-receipt-stamp')) fail('Verifikasi gagal: logo kanan bawah masih ada.');
if (pageAfter.includes('<span>{fmtDate(payment.payment_date)}</span>\n            <strong>KOJAC</strong>')) fail('Verifikasi gagal: tanggal area bawah masih ada.');
if (!pageAfter.includes('<small>一緒に一生懸命勉強しましょう！</small>\n          <b>KOJAC</b>')) fail('Verifikasi gagal: slogan/KOJAC center tidak terpasang.');
if (!cssAfter.includes(newAccent) || !cssAfter.includes(newFooter)) fail('Verifikasi CSS V1.0.3 gagal.');
if (!pageAfter.includes('payment.amount')) fail('Contract nominal payment record berubah secara tidak sengaja.');

console.log(`[PATCHED] ${pageFile}`);
console.log(`[PATCHED] ${cssFile}`);
console.log('[PASS] Tanggal area bawah dihapus.');
console.log('[PASS] Slogan + KOJAC dipusatkan.');
console.log('[PASS] Logo/stamp kanan bawah dihapus.');
console.log('[PASS] Ornamen sudut diselaraskan dengan referensi visual Slip Honor.');
console.log('[PASS] Slip Honor tidak disentuh.');
console.log('\nSelanjutnya jalankan:');
console.log('  git diff --check');
console.log('  npm run build');
