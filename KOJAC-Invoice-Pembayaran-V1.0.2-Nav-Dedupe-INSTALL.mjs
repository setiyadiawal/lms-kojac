#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function fail(message) {
  console.error(`\n[KOJAC Invoice V1.0.2] ERROR: ${message}\n`);
  process.exit(1);
}

function ok(message) {
  console.log(`[KOJAC Invoice V1.0.2] ${message}`);
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

  const shell = read('src/components/AppShell.tsx');
  const app = read('src/App.tsx');

  const menuCount = (shell.match(/label="Invoice Pembayaran"/g) || []).length;
  const routeCount = (app.match(/path="manajemen\/invoice"/g) || []).length;

  ok(`Audit: menu Invoice Pembayaran = ${menuCount}`);
  ok(`Audit: route manajemen/invoice = ${routeCount}`);

  if (menuCount < 1) fail('Menu Invoice Pembayaran tidak ditemukan.');
  if (routeCount < 1) fail('Route manajemen/invoice tidak ditemukan.');
}

function dedupeSidebar() {
  const rel = 'src/components/AppShell.tsx';
  const lines = read(rel).split(/\r?\n/);

  let seen = false;
  let removed = 0;

  const next = lines.filter((line) => {
    if (!line.includes('label="Invoice Pembayaran"')) return true;
    if (!seen) {
      seen = true;
      return true;
    }
    removed += 1;
    return false;
  });

  if (!seen) fail('Tidak menemukan navigation entry Invoice Pembayaran.');
  write(rel, next.join('\n'));
  ok(`Sidebar duplicate removed: ${removed}`);
}

function dedupeRoute() {
  const rel = 'src/App.tsx';
  const lines = read(rel).split(/\r?\n/);

  let seen = false;
  let removed = 0;

  const next = lines.filter((line) => {
    if (!line.includes('path="manajemen/invoice"')) return true;
    if (!seen) {
      seen = true;
      return true;
    }
    removed += 1;
    return false;
  });

  if (!seen) fail('Route manajemen/invoice tidak ditemukan.');
  write(rel, next.join('\n'));
  ok(`Route duplicate removed: ${removed}`);
}

function verify() {
  const shell = read('src/components/AppShell.tsx');
  const app = read('src/App.tsx');

  const menuCount = (shell.match(/label="Invoice Pembayaran"/g) || []).length;
  const routeCount = (app.match(/path="manajemen\/invoice"/g) || []).length;

  if (menuCount !== 1) fail(`Menu Invoice Pembayaran harus tepat 1, ditemukan ${menuCount}.`);
  if (routeCount !== 1) fail(`Route manajemen/invoice harus tepat 1, ditemukan ${routeCount}.`);

  ok('Verification PASS');
}

audit();
dedupeSidebar();
dedupeRoute();
verify();

console.log(`
HOTFIX V1.0.2 SELESAI.

Jalankan:
  git diff --check
  npm run build

Setelah PASS:
  npm run dev

JANGAN:
  - supabase db push
  - replay migration
  - reset Supabase
  - ubah Slip Honor
`);
