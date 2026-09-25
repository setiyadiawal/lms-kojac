
import { FileText, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getMyInvoices } from '../features/invoice/api';
import type { InvoiceRow } from '../features/invoice/types';
import { useAuth } from '../state/AuthContext';
import '../features/invoice/invoice.css';

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(value || 0);
}
function dateId(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value + (value.includes('T') ? '' : 'T00:00:00+07:00'));
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('id-ID', { timeZone:'Asia/Jakarta', day:'2-digit', month:'short', year:'numeric' }).format(date) : value;
}
function statusLabel(status: string) {
  return ({ draft:'Draft', issued:'Terbit', partial:'Sebagian', paid:'Lunas', void:'Dibatalkan' } as Record<string,string>)[status] || status;
}

export function MyInvoicesPage() {
  const { role, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await getMyInvoices()); }
    catch (err) { console.error('KOJAC my invoices load failed', err); setError('Tagihan belum dapat dimuat.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading && role === 'siswa') void load(); }, [authLoading, role, load]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (role !== 'siswa') return <Navigate to="/" replace/>;

  const outstanding = rows.filter(r => !['paid','void'].includes(r.status)).reduce((sum,r)=>sum+Math.max(0,r.total_amount-r.paid_amount),0);

  return <div className="page invoice-page">
    <header className="invoice-header">
      <div><p className="eyebrow">SISWA KOJAC</p><h1>Tagihan Saya</h1><p>Lihat invoice, jatuh tempo, pembayaran, dan rekap sesi.</p></div>
    </header>

    <section className="invoice-detail-grid">
      <article className="invoice-card"><span>Total Invoice</span><strong>{rows.length}</strong></article>
      <article className="invoice-card"><span>Belum Lunas</span><strong>{rows.filter(r=>!['paid','void'].includes(r.status)).length}</strong></article>
      <article className="invoice-card wide"><span>Sisa Tagihan</span><strong>{rupiah(outstanding)}</strong></article>
    </section>

    {loading ? <div className="invoice-state">Memuat tagihan…</div> :
     error ? <div className="invoice-state">{error}<button onClick={() => void load()}><RefreshCw size={15}/> Coba Lagi</button></div> :
     rows.length === 0 ? <div className="invoice-state"><FileText size={30}/><strong>Belum ada tagihan.</strong><span>Invoice yang sudah diterbitkan akan tampil di sini.</span></div> :
     <section className="invoice-list">
       {rows.map(row => <Link key={row.id} to={"/invoice/" + row.id} className="invoice-list-row">
         <div><strong>{row.invoice_number || 'Draft Invoice'}</strong><span>{row.class_name_snapshot || row.item_label}</span></div>
         <div><span>Jatuh tempo</span><strong>{dateId(row.due_date)}</strong></div>
         <div><span>Total</span><strong>{rupiah(row.total_amount)}</strong></div>
         <div><span className={"invoice-status is-" + row.status}>{statusLabel(row.status)}</span></div>
       </Link>)}
     </section>}
  </div>;
}
