
import type { InvoiceDetail } from './types';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateId(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : value + 'T00:00:00+07:00');
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function durationHours(minutes: number) {
  const hours = Math.max(0, Number(minutes || 0)) / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace('.', ',');
}

const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

function words(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 12) return units[n];
  if (n < 20) return words(n - 10) + ' belas';
  if (n < 100) return words(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + words(n % 10) : '');
  if (n < 200) return 'seratus' + (n > 100 ? ' ' + words(n - 100) : '');
  if (n < 1000) return words(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + words(n % 100) : '');
  if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + words(n - 1000) : '');
  if (n < 1_000_000) return words(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + words(n % 1000) : '');
  if (n < 1_000_000_000) return words(Math.floor(n / 1_000_000)) + ' juta' + (n % 1_000_000 ? ' ' + words(n % 1_000_000) : '');
  return String(n);
}

function paymentMethodsHtml(detail: InvoiceDetail) {
  // Historical invoices may still contain old payment-method snapshots.
  // Display policy is BSI-only without rewriting immutable invoice history.
  const methods = (detail.payment_methods_snapshot ?? []).filter(
    (method) => method.label.trim().toLowerCase() === 'bank bsi',
  );
  if (!methods.length) return '<div class="muted">Metode pembayaran Bank BSI belum tersedia pada snapshot invoice ini.</div>';
  return methods.map((method) => [
    '<div class="payment-row">',
    '<strong>', escapeHtml(method.label), '</strong>',
    method.account_number ? '<span>' + escapeHtml(method.account_number) + '</span>' : '',
    method.account_name ? '<span>a.n. ' + escapeHtml(method.account_name) + '</span>' : '',
    '</div>',
  ].join('')).join('');
}

export function printInvoicePdf(detail: InvoiceDetail) {
  // Open synchronously from the user click so browser popup policies can allow it.
  const win = window.open('about:blank', '_blank');

  if (!win) {
    window.alert(
      'Browser memblokir jendela PDF. Izinkan pop-up untuk LMS KOJAC lalu coba lagi.',
    );
    return;
  }

  // Break the opener reference without relying on window.open feature flags that
  // can cause some browsers to return null even when a new tab is created.
  try {
    win.opener = null;
  } catch {
    // Some browsers may prevent assigning opener; printing can still continue.
  }

  const isHourly = detail.pricing_mode === 'hourly';
  const totalHours = detail.total_minutes / 60;
  const outstanding = Math.max(0, detail.total_amount - detail.paid_amount);
  const sessions = [...detail.sessions].sort((a, b) =>
    (a.session_date + a.starts_at).localeCompare(b.session_date + b.starts_at)
  );

  const sessionRows = sessions.length
    ? sessions.map((session, index) => [
        '<tr><td>', index + 1, '</td><td>', escapeHtml(dateId(session.session_date)), '</td>',
        '<td>', escapeHtml(session.starts_at?.slice(0,5)), ' – ', escapeHtml(session.ends_at?.slice(0,5)), '</td>',
        '<td>', escapeHtml(durationHours(session.duration_minutes)), '</td></tr>'
      ].join('')).join('')
    : '<tr><td colspan="4" class="empty">Belum ada rekap sesi.</td></tr>';

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(detail.invoice_number || 'Invoice KOJAC')}</title>
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;background:#ece8e9;font-family:Arial,Helvetica,sans-serif;color:#2d2426}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:17mm 17mm 15mm;position:relative}
.page+.page{page-break-before:always}
.top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:3px solid #741e31;padding-bottom:12px}
.logo{height:44px;max-width:170px;object-fit:contain}
.invoice-title{text-align:right}
.invoice-title h1{margin:0;color:#741e31;font-size:29px;letter-spacing:2px}
.invoice-title p{margin:5px 0 0;font-size:10px;color:#776a6d}
.meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:14px 0}
.meta div{border:1px solid #eadfe2;border-radius:8px;padding:9px}
.meta span,.party span,.summary span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#8b777c;margin-bottom:3px}
.meta strong,.party strong,.summary strong{font-size:10px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0 15px}
.party{background:#faf6f7;border-left:4px solid #741e31;padding:11px 12px;min-height:88px}
.party p{margin:4px 0;font-size:9px;line-height:1.45}
table{width:100%;border-collapse:collapse}
th{background:#741e31;color:#fff;padding:8px;font-size:8px;text-align:left;text-transform:uppercase}
td{padding:8px;border-bottom:1px solid #eadfe2;font-size:9px;vertical-align:top}
.money{text-align:right;white-space:nowrap}
.totals{width:52%;margin:12px 0 12px auto}
.total-row{display:flex;justify-content:space-between;padding:6px 3px;border-bottom:1px solid #eadfe2;font-size:9px}
.total-row.grand{border-bottom:none;background:#741e31;color:#fff;padding:9px;font-weight:700}
.terbilang{margin:12px 0;padding:10px;background:#faf6f7;border-radius:8px;font-size:9px}
.section-title{font-size:9px;color:#741e31;font-weight:800;letter-spacing:.06em;margin:15px 0 7px;text-transform:uppercase}
.payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.payment-row{border:1px solid #eadfe2;border-radius:8px;padding:8px;display:grid;gap:3px;font-size:8px}
.payment-row strong{font-size:9px}
.note{font-size:8.5px;line-height:1.55;color:#57484b}
.thanks{text-align:center;margin-top:20px;font-weight:800;color:#741e31;font-size:10px}
.footer{position:absolute;left:17mm;right:17mm;bottom:10mm;border-top:1px solid #eadfe2;padding-top:6px;display:flex;justify-content:space-between;font-size:7.5px;color:#8b777c}
.recap-head{text-align:center;margin-bottom:16px}
.recap-head img{height:38px;margin-bottom:10px}
.recap-head h1{font-size:19px;letter-spacing:.08em;color:#741e31;margin:0}
.recap-head p{font-size:9px;color:#776a6d}
.recap-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.summary{border:1px solid #eadfe2;border-radius:8px;padding:9px}
.empty{text-align:center;color:#99878b;padding:28px}
.status{display:inline-block;padding:4px 8px;border-radius:999px;background:#f2e7ea;color:#741e31;font-weight:700}
@media print{body{background:#fff}.page{margin:0;box-shadow:none}}
</style>
</head>
<body>
<section class="page">
  <div class="top">
    <img class="logo" src="${location.origin}/brand/kojac-wordmark.png" alt="KOJAC"/>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <p>${escapeHtml(detail.invoice_number || 'DRAFT · nomor diterbitkan saat Issue')}</p>
    </div>
  </div>

  <div class="meta">
    <div><span>Tanggal Invoice</span><strong>${escapeHtml(dateId(detail.invoice_date))}</strong></div>
    <div><span>Jatuh Tempo</span><strong>${escapeHtml(dateId(detail.due_date))}</strong></div>
    <div><span>Status</span><strong class="status">${escapeHtml(detail.status.toUpperCase())}</strong></div>
  </div>

  <div class="parties">
    <div class="party">
      <span>Kepada</span>
      <strong>${escapeHtml(detail.recipient_name)}</strong>
      <p>${escapeHtml(detail.recipient_address || '—')}</p>
      <p>${escapeHtml(detail.recipient_phone || '—')}</p>
    </div>
    <div class="party">
      <span>Dari</span>
      <strong>${escapeHtml(detail.sender_name || 'KOJAC — Kuuhaku Online Japanese Class')}</strong>
      <p>${escapeHtml(detail.sender_address || '—')}</p>
      <p>${escapeHtml(detail.sender_phone || '—')}</p>
    </div>
  </div>

  <div class="section-title">Deskripsi</div>
  <table>
    <thead>
      <tr>
        <th>${isHourly ? 'Nama Kelas' : 'Jenis Kelas'}</th>
        <th>${isHourly ? 'Total Sesi' : 'Nama Kelas'}</th>
        <th>${isHourly ? 'Total Jam' : 'Jumlah Siswa'}</th>
        <th>${isHourly ? 'Biaya per Jam' : 'Biaya per Siswa'}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(detail.item_label)}</td>
        <td>${escapeHtml(isHourly ? detail.total_sessions : (detail.class_name_snapshot || detail.item_label))}</td>
        <td>${escapeHtml(isHourly ? durationHours(detail.total_minutes) : detail.quantity)}</td>
        <td class="money">${escapeHtml(rupiah(detail.unit_price))}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><strong>${escapeHtml(rupiah(detail.subtotal))}</strong></div>
    <div class="total-row"><span>Tambahan / Lain-lain</span><strong>${escapeHtml(rupiah(detail.additional_amount))}</strong></div>
    <div class="total-row"><span>Sudah Dibayar</span><strong>${escapeHtml(rupiah(detail.paid_amount))}</strong></div>
    <div class="total-row"><span>Sisa Tagihan</span><strong>${escapeHtml(rupiah(outstanding))}</strong></div>
    <div class="total-row grand"><span>Total Keseluruhan</span><strong>${escapeHtml(rupiah(detail.total_amount))}</strong></div>
  </div>

  <div class="terbilang"><strong>Terbilang:</strong> ${escapeHtml(words(detail.total_amount).replace(/^./, c => c.toUpperCase()))} rupiah.</div>

  <div class="section-title">Metode Pembayaran</div>
  <div class="payment-grid">${paymentMethodsHtml(detail)}</div>

  <div class="section-title">Catatan</div>
  <div class="note">${escapeHtml(detail.notes || 'Mohon melakukan pembayaran sesuai nominal dan jatuh tempo yang tercantum pada invoice.')}</div>

  <div class="thanks">Terima kasih telah belajar bersama KOJAC.</div>
  <div class="footer">
    <span>KOJAC · Kuuhaku Online Japanese Class</span>
    <span>${escapeHtml(detail.invoice_number || 'DRAFT')}</span>
  </div>
</section>

<section class="page">
  <div class="recap-head">
    <img src="${location.origin}/brand/kojac-wordmark.png" alt="KOJAC"/>
    <h1>REKAPAN SESI KELAS</h1>
    <p>${escapeHtml(detail.class_name_snapshot || detail.item_label)} · ${escapeHtml(detail.invoice_number || 'DRAFT')}</p>
  </div>

  <div class="recap-summary">
    <div class="summary"><span>Total Sesi</span><strong>${escapeHtml(detail.total_sessions)}</strong></div>
    <div class="summary"><span>Total Jam</span><strong>${escapeHtml(durationHours(detail.total_minutes))} jam</strong></div>
    <div class="summary"><span>Periode</span><strong>${escapeHtml(detail.session_start ? dateId(detail.session_start) : '—')} – ${escapeHtml(detail.session_end ? dateId(detail.session_end) : '—')}</strong></div>
  </div>

  <table>
    <thead><tr><th>No.</th><th>Tanggal</th><th>Waktu (WIB)</th><th>Jam</th></tr></thead>
    <tbody>${sessionRows}</tbody>
    <tfoot><tr><td colspan="3"><strong>Total (jam)</strong></td><td><strong>${escapeHtml(durationHours(detail.total_minutes))}</strong></td></tr></tfoot>
  </table>

  <div class="footer">
    <span>Rekapan sesi kelas · KOJAC</span>
    <span>${escapeHtml(detail.invoice_number || 'DRAFT')}</span>
  </div>
</section>

<script>
window.addEventListener('load', () => setTimeout(() => window.print(), 250));
</script>
</body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
