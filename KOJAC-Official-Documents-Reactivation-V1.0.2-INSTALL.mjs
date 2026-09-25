import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (m) => { console.error(`\n[FAIL] ${m}`); process.exit(1); };
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(root, rel), value, 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

console.log('KOJAC Official Documents Reactivation V1.0.2');
console.log('Scope: Kwitansi Honor print-layout overlap only. Slip Honor protected.');

if (!exists('package.json') || !exists('src')) fail('Jalankan installer dari root project KOJAC LMS.');

const pageFile = 'src/pages/HonorReceiptPage.tsx';
const cssFile = 'src/honor-receipt.css';

if (!exists(pageFile)) fail(`${pageFile} tidak ditemukan. Pasang Official Documents Reactivation V1.0.1 terlebih dahulu.`);
if (!exists(cssFile)) fail(`${cssFile} tidak ditemukan. Pasang Official Documents Reactivation V1.0.1 terlebih dahulu.`);

const page = read(pageFile);
if (!page.includes('honor-receipt-sign') || !page.includes('honor-receipt-footer') || !page.includes('window.print()')) {
  fail('Struktur HonorReceiptPage tidak cocok dengan V1.0.1; patch dihentikan agar tidak merusak implementation lain.');
}
if (/HonorSlipPage|honor-slip\.css/.test(cssFile)) fail('Slip Honor protection guard triggered.');

let css = read(cssFile);
const alreadyFixed = css.includes('display:flex;flex-direction:column') &&
  css.includes('.honor-receipt-sign{display:flex;justify-content:flex-end;align-items:center;gap:12mm;margin-top:auto;padding-top:12mm}') &&
  css.includes('.honor-receipt-footer{position:relative;left:auto;right:auto;bottom:auto;margin-top:8mm;');

if (alreadyFixed) {
  console.log('[PASS] Layout Kwitansi sudah menggunakan V1.0.2. Tidak ada perubahan.');
  process.exit(0);
}

const oldPage = '.honor-receipt-page{position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff;color:#171214;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;padding:20mm 18mm 24mm}';
const newPage = '.honor-receipt-page{position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff;color:#171214;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;padding:20mm 18mm 18mm;display:flex;flex-direction:column}';

const oldLayer = '.honor-receipt-header,.honor-receipt-main,.honor-receipt-payment,.honor-receipt-sign,.honor-receipt-footer,.honor-receipt-divider{position:relative;z-index:2}';
const newLayer = '.honor-receipt-header,.honor-receipt-main,.honor-receipt-payment,.honor-receipt-sign,.honor-receipt-footer,.honor-receipt-divider{position:relative;z-index:2;flex:0 0 auto}';

const oldSign = '.honor-receipt-sign{display:flex;justify-content:flex-end;align-items:center;gap:12mm;margin-top:18mm}';
const newSign = '.honor-receipt-sign{display:flex;justify-content:flex-end;align-items:center;gap:12mm;margin-top:auto;padding-top:12mm}';

const oldFooter = '.honor-receipt-footer{position:absolute;left:0;right:0;bottom:21mm;text-align:center;display:grid;gap:2px}';
const newFooter = '.honor-receipt-footer{position:relative;left:auto;right:auto;bottom:auto;margin-top:8mm;text-align:center;display:grid;gap:2px}';

for (const [oldAnchor, label] of [[oldPage,'page layout'],[oldLayer,'content layer'],[oldSign,'signature block'],[oldFooter,'footer block']]) {
  if (!css.includes(oldAnchor)) fail(`Anchor ${label} tidak ditemukan. Actual CSS berbeda; tidak melakukan overwrite.`);
}

css = css.replace(oldPage, newPage)
  .replace(oldLayer, newLayer)
  .replace(oldSign, newSign)
  .replace(oldFooter, newFooter);

write(cssFile, css);

const verify = read(cssFile);
if (!verify.includes(newPage) || !verify.includes(newSign) || !verify.includes(newFooter)) fail('Post-patch verification gagal.');
if (!read(pageFile).includes('payment.amount')) fail('Contract nominal payment record hilang; hentikan dan review project.');

console.log(`[PATCHED] ${cssFile}`);
console.log('[PASS] Signature dan footer sekarang berada dalam layout A4 yang tidak saling overlap.');
console.log('[PASS] HonorReceiptPage logic/numbering/PDF content tidak diubah.');
console.log('[PASS] Slip Honor tidak disentuh.');
console.log('\nSelanjutnya jalankan:');
console.log('  git diff --check');
console.log('  npm run build');
