#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function fail(message) {
  console.error(`\n[KOJAC Invoice V1.0.1 Hotfix] ERROR: ${message}\n`);
  process.exit(1);
}

function ok(message) {
  console.log(`[KOJAC Invoice V1.0.1 Hotfix] ${message}`);
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

function audit() {
  const pkg = JSON.parse(read('package.json'));
  if (pkg.name !== 'kojac-lms-v2') fail(`Project bukan kojac-lms-v2 (${pkg.name})`);

  for (const rel of [
    'src/App.tsx',
    'src/features/invoice/invoicePdf.ts',
    'src/pages/ManagementInvoicesPage.tsx',
  ]) {
    read(rel);
  }

  ok(`Audit actual project PASS · package ${pkg.version ?? '-'}`);
}

function dedupeInvoiceImports() {
  const rel = 'src/App.tsx';
  const content = read(rel);
  const invoiceImports = new Set([
    "import { ManagementInvoicesPage } from './pages/ManagementInvoicesPage';",
    "import { MyInvoicesPage } from './pages/MyInvoicesPage';",
    "import { InvoiceDetailPage } from './pages/InvoiceDetailPage';",
  ]);

  const seen = new Set();
  const lines = content.split(/\r?\n/);
  const next = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (invoiceImports.has(trimmed)) {
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
    }
    next.push(line);
  }

  for (const required of invoiceImports) {
    if (!seen.has(required)) {
      fail(`Import Invoice wajib tidak ditemukan: ${required}`);
    }
  }

  write(rel, next.join('\n'));
}

function fixEsCompatibility() {
  const pdfRel = 'src/features/invoice/invoicePdf.ts';
  let pdf = read(pdfRel);

  pdf = pdf
    .replace(".replaceAll('&', '&amp;')", ".replace(/&/g, '&amp;')")
    .replace(".replaceAll('<', '&lt;')", ".replace(/</g, '&lt;')")
    .replace(".replaceAll('>', '&gt;')", ".replace(/>/g, '&gt;')")
    .replace(`.replaceAll('"', '&quot;')`, `.replace(/"/g, '&quot;')`)
    .replace(`.replaceAll("'", '&#039;')`, `.replace(/'/g, '&#039;')`);

  if (pdf.includes('.replaceAll(')) {
    fail('Masih ada replaceAll() di invoicePdf.ts setelah hotfix.');
  }

  write(pdfRel, pdf);

  const managementRel = 'src/pages/ManagementInvoicesPage.tsx';
  let management = read(managementRel);

  management = management.replace(
    "draft.sessions.map(s=>s.session_date).sort().at(-1) || null",
    "draft.sessions.map(s=>s.session_date).sort().slice(-1)[0] || null"
  );

  if (management.includes('.at(-1)')) {
    fail('Masih ada .at(-1) di ManagementInvoicesPage.tsx setelah hotfix.');
  }

  write(managementRel, management);
}

function verifyNoKnownBuildBlockers() {
  const app = read('src/App.tsx');
  for (const name of ['ManagementInvoicesPage', 'MyInvoicesPage', 'InvoiceDetailPage']) {
    const needle = `import { ${name} } from './pages/${name}';`;
    const count = app.split(needle).length - 1;
    if (count !== 1) fail(`Import ${name} harus tepat 1, ditemukan ${count}.`);
  }

  const pdf = read('src/features/invoice/invoicePdf.ts');
  if (pdf.includes('.replaceAll(')) fail('replaceAll() masih ditemukan.');

  const management = read('src/pages/ManagementInvoicesPage.tsx');
  if (management.includes('.at(-1)')) fail('.at(-1) masih ditemukan.');

  ok('Static hotfix verification PASS');
}

audit();
dedupeInvoiceImports();
fixEsCompatibility();
verifyNoKnownBuildBlockers();

console.log(`
HOTFIX SELESAI.

Sekarang jalankan:
  git diff --check
  npm run build

JANGAN:
  - supabase db push
  - replay migration
  - reset Supabase
  - ubah Slip Honor
`);
