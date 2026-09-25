import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ReceiptText } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';
import '../invoice-system.css';

type Row={
  invoice_id:string;
  invoice_number:string|null;
  invoice_date:string;
  due_date:string;
  status:'issued'|'partial'|'paid';
  display_status:'issued'|'partial'|'paid'|'overdue';
  item_label:string;
  class_name:string|null;
  total_amount:number;
  paid_amount:number;
  outstanding_amount:number;
};

const STUDENT_ROLES=new Set<AppRole>(['siswa','administrator','manager','co_founder','founder']);
const rupiah=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
function fmt(v:string){const d=new Date(`${v}T00:00:00+07:00`);return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);}
function label(s:Row['display_status']){if(s==='paid')return 'Lunas';if(s==='partial')return 'Dibayar Sebagian';if(s==='overdue')return 'Jatuh Tempo';return 'Belum Dibayar';}

export function StudentInvoicesPage(){
  const {role,loading:authLoading}=useAuth();
  const allowed=Boolean(role&&STUDENT_ROLES.has(role));
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    const {data,error:e}=await supabase.rpc('get_my_invoices');
    if(e){console.error(e);setError('Tagihan belum dapat dimuat.');}
    else setRows((data??[]) as Row[]);
    setLoading(false);
  },[]);

  useEffect(()=>{if(!authLoading&&allowed)void load();},[authLoading,allowed,load]);

  if(authLoading)return <div className="full-center">Memuat KOJAC LMS…</div>;
  if(!allowed)return <Navigate to="/" replace/>;

  return <div className="page student-invoice-page">
    <header className="student-invoice-header">
      <div><p className="eyebrow">SISWA KOJAC</p><h1><ReceiptText size={30}/> Tagihan Saya</h1><p>Invoice resmi KOJAC dan status pembayaran Anda.</p></div>
    </header>
    {error&&<div className="invoice-notice">{error}</div>}
    {loading?<div className="invoice-empty">Memuat tagihan…</div>:rows.length===0?<div className="invoice-empty"><ReceiptText size={30}/><h3>Belum ada tagihan.</h3></div>:<div className="student-invoice-list">
      {rows.map(row=><article key={row.invoice_id}>
        <div className="student-invoice-top"><div><strong>{row.invoice_number}</strong><span>{row.item_label}</span></div><span className={`invoice-status is-${row.display_status}`}>{label(row.display_status)}</span></div>
        <div className="student-invoice-meta">
          <div><CalendarDays size={15}/><span>Jatuh tempo {fmt(row.due_date)}</span></div>
          <div><span>Total</span><strong>{rupiah.format(row.total_amount)}</strong></div>
          <div><span>Terbayar</span><strong>{rupiah.format(row.paid_amount)}</strong></div>
          <div><span>Sisa</span><strong>{rupiah.format(row.outstanding_amount)}</strong></div>
        </div>
        <Link className="invoice-primary" target="_blank" to={`/invoice/${row.invoice_id}`}><ReceiptText size={15}/> Lihat Invoice</Link>
      </article>)}
    </div>}
  </div>;
}
