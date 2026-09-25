
import { ArrowLeft, FileDown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getInvoiceDetail } from '../features/invoice/api';
import { printInvoicePdf } from '../features/invoice/invoicePdf';
import type { InvoiceDetail } from '../features/invoice/types';
import '../features/invoice/invoice.css';

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
}
function dateId(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : value + 'T00:00:00+07:00');
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' }).format(date)
    : value;
}
function statusLabel(status: string) {
  return ({ draft:'Draft', issued:'Terbit', partial:'Sebagian', paid:'Lunas', void:'Dibatalkan' } as Record<string,string>)[status] || status;
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError('');
    try {
      setDetail(await getInvoiceDetail(invoiceId));
    } catch (loadError) {
      console.error('KOJAC invoice detail load failed', loadError);
      setError('Invoice belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="full-center">Memuat invoice…</div>;
  if (!detail) return <div className="page invoice-page"><div className="invoice-state">{error || 'Invoice tidak ditemukan.'}<button onClick={() => void load()}><RefreshCw size={15}/> Coba Lagi</button></div></div>;

  const outstanding = Math.max(0, detail.total_amount - detail.paid_amount);

  return <div className="page invoice-page">
    <header className="invoice-header">
      <div>
        <p className="eyebrow">KOJAC · INVOICE</p>
        <h1>{detail.invoice_number || 'Draft Invoice'}</h1>
        <p>{detail.recipient_name} · {detail.class_name_snapshot || detail.item_label}</p>
      </div>
      <div className="invoice-header-actions">
        <Link className="invoice-btn secondary" to={history.length > 1 ? -1 as never : '/'}><ArrowLeft size={15}/> Kembali</Link>
        <button className="invoice-btn primary" onClick={() => printInvoicePdf(detail)}><FileDown size={15}/> PDF / Print</button>
      </div>
    </header>

    <section className="invoice-detail-grid">
      <article className="invoice-card"><span>Status</span><strong className={"invoice-status is-" + detail.status}>{statusLabel(detail.status)}</strong></article>
      <article className="invoice-card"><span>Tanggal</span><strong>{dateId(detail.invoice_date)}</strong></article>
      <article className="invoice-card"><span>Jatuh Tempo</span><strong>{dateId(detail.due_date)}</strong></article>
      <article className="invoice-card"><span>Sisa Tagihan</span><strong>{rupiah(outstanding)}</strong></article>
    </section>

    <section className="invoice-panel">
      <div className="invoice-section-title"><div><p className="eyebrow">TAGIHAN</p><h2>Rincian Invoice</h2></div></div>
      <div className="invoice-info-grid">
        <div><span>Penerima</span><strong>{detail.recipient_name}</strong><small>{detail.recipient_address || '—'}<br/>{detail.recipient_phone || '—'}</small></div>
        <div><span>Kelas</span><strong>{detail.class_name_snapshot || detail.item_label}</strong><small>{detail.pricing_mode === 'hourly' ? 'Per jam' : 'Per siswa'}</small></div>
        <div><span>Tarif</span><strong>{rupiah(detail.unit_price)}</strong><small>{detail.pricing_mode === 'hourly' ? `${(detail.total_minutes/60).toFixed(2)} jam` : `${detail.quantity} siswa`}</small></div>
        <div><span>Total</span><strong>{rupiah(detail.total_amount)}</strong><small>Terbayar {rupiah(detail.paid_amount)}</small></div>
      </div>
      {detail.notes && <div className="invoice-note"><strong>Catatan</strong><p>{detail.notes}</p></div>}
    </section>

    <section className="invoice-panel">
      <div className="invoice-section-title"><div><p className="eyebrow">HALAMAN 2 PDF</p><h2>Rekapan Sesi Kelas</h2></div><span>{detail.sessions.length} sesi</span></div>
      <div className="invoice-table-wrap">
        <table className="invoice-table">
          <thead><tr><th>Tanggal</th><th>Waktu (WIB)</th><th>Durasi</th></tr></thead>
          <tbody>
            {detail.sessions.length ? detail.sessions.map((session, i) => <tr key={session.id || i}>
              <td>{dateId(session.session_date)}</td>
              <td>{session.starts_at?.slice(0,5)} – {session.ends_at?.slice(0,5)}</td>
              <td>{session.duration_minutes} menit</td>
            </tr>) : <tr><td colSpan={3}>Belum ada rekap sesi.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    <section className="invoice-panel">
      <div className="invoice-section-title"><div><p className="eyebrow">PEMBAYARAN</p><h2>Histori Pembayaran</h2></div></div>
      <div className="invoice-payment-list">
        {detail.payments.length ? detail.payments.map(payment => <article key={payment.id}>
          <div><strong>{rupiah(payment.amount)}</strong><span>{dateId(payment.payment_date)}</span></div>
          <div><span>{payment.payment_method}</span><small>{payment.reference_number || 'Tanpa referensi'}</small></div>
        </article>) : <div className="invoice-empty">Belum ada pembayaran tercatat.</div>}
      </div>
    </section>
  </div>;
}
