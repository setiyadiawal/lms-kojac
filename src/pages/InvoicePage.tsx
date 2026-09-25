import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import '../invoice-print.css';

type Method={id:string;method_type:string;label:string;account_name:string;account_number:string};
type Session={session_id:string;session_date:string;starts_at:string;ends_at:string;duration_minutes:number};
type Detail={
  invoice:{
    invoice_id:string;
    recipient_user_id:string|null;
    recipient_kind:string;
    class_id:string|null;
    invoice_code:string;
    invoice_date:string;
    due_date:string;
    status:string;
    display_status:string;
    invoice_number:string|null;
    pricing_mode:'hourly'|'per_student';
    recipient_name:string;
    recipient_address:string|null;
    recipient_phone:string|null;
    sender_name:string;
    sender_address:string;
    sender_phone:string;
    item_label:string;
    class_name:string|null;
    total_sessions:number;
    total_minutes:number;
    quantity:number;
    unit_price:number;
    subtotal:number;
    additional_amount:number;
    total_amount:number;
    paid_amount:number;
    outstanding_amount:number;
    payment_methods:Method[];
    notes:string|null;
    session_start:string|null;
    session_end:string|null;
  };
  sessions:Session[];
  payments:Array<{payment_id:string;amount:number;payment_date:string;payment_method:string;reference_number:string|null;notes:string|null}>;
};

function fmtDate(v:string){const d=new Date(`${v}T00:00:00+07:00`);return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);}
function dateDay(v:string){const d=new Date(`${v}T00:00:00+07:00`);const text=new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);return text.charAt(0).toUpperCase()+text.slice(1);}
function time(v:string){return v.slice(0,5);}
function hours(minutes:number){const n=(minutes||0)/60;return Number.isInteger(n)?String(n):n.toLocaleString('id-ID',{maximumFractionDigits:2});}
function dur(minutes:number){const h=Math.floor((minutes||0)/60),m=(minutes||0)%60;return h?(m?`${h} Jam ${m} Menit`:`${h} Jam`):`${m} Menit`;}
function money(v:number){return `Rp.${Math.round(Number(v||0)).toLocaleString('id-ID')},-`;}
const words=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
function spell(n:number):string{n=Math.floor(Math.abs(n));if(n<12)return words[n];if(n<20)return `${spell(n-10)} belas`;if(n<100)return `${spell(Math.floor(n/10))} puluh ${spell(n%10)}`.trim();if(n<200)return `seratus ${spell(n-100)}`.trim();if(n<1000)return `${spell(Math.floor(n/100))} ratus ${spell(n%100)}`.trim();if(n<2000)return `seribu ${spell(n-1000)}`.trim();if(n<1_000_000)return `${spell(Math.floor(n/1000))} ribu ${spell(n%1000)}`.trim();if(n<1_000_000_000)return `${spell(Math.floor(n/1_000_000))} juta ${spell(n%1_000_000)}`.trim();return String(n);}
function sentence(v:string){return v?v.charAt(0).toUpperCase()+v.slice(1):v;}

export function InvoicePage(){
  const {invoiceId}=useParams();
  const {loading:authLoading}=useAuth();
  const [detail,setDetail]=useState<Detail|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!invoiceId)return;
    let active=true;
    void supabase.rpc('get_invoice_detail',{p_invoice_id:invoiceId}).then(({data,error:e})=>{
      if(!active)return;
      if(e){console.error(e);setError('Invoice tidak dapat dimuat.');}
      else setDetail(data as Detail);
      setLoading(false);
    });
    return()=>{active=false;};
  },[invoiceId]);

  const methodText=useMemo(()=>detail?.invoice.payment_methods??[],[detail]);

  if(authLoading||loading)return <div className="full-center">Memuat invoice…</div>;
  if(!invoiceId)return <Navigate to="/" replace/>;
  if(error||!detail)return <div className="full-center">{error||'Invoice tidak ditemukan.'}</div>;

  const i=detail.invoice;
  const showRecap=i.pricing_mode==='hourly'&&detail.sessions.length>0;
  return <div className="kojac-invoice-screen">
    <div className="kojac-invoice-toolbar">
      <button type="button" onClick={()=>window.history.back()}><ArrowLeft size={16}/> Kembali</button>
      <button type="button" onClick={()=>window.print()}><Printer size={16}/> Cetak / Simpan PDF</button>
    </div>

    <main className="kojac-invoice-document">
      <section className="kojac-invoice-page invoice-cover">
        <img className="kojac-invoice-background" src="/brand/kojac-invoice-template.png" alt=""/>
        <div className="invoice-title">INVOICE</div>

        <div className="invoice-meta">
          <div><strong>Nomor Invoice:</strong><span>{i.invoice_number||'DRAFT'}</span></div>
          <div><strong>Tanggal Invoice:</strong><span>{fmtDate(i.invoice_date)}</span></div>
          <div><strong>Tanggal Jatuh Tempo:</strong><span>{fmtDate(i.due_date)}</span></div>
        </div>

        <div className="invoice-parties">
          <div><strong>Kepada :</strong><span>{i.recipient_name}</span><span>{i.recipient_address||'-'}</span><span>{i.recipient_phone||'-'}</span></div>
          <div><strong>Dari :</strong><span>{i.sender_name}</span><span>{i.sender_address}</span><span>{i.sender_phone}</span></div>
        </div>

        <div className="invoice-description">
          <h2>DESKRIPSI</h2>
          {i.pricing_mode==='hourly'?<table>
            <thead><tr><th>NAMA KELAS</th><th>TOTAL SESI</th><th>TOTAL JAM</th><th>BIAYA PER JAM</th></tr></thead>
            <tbody><tr><td>{i.item_label}</td><td>{i.total_sessions}</td><td>{hours(i.total_minutes)}</td><td>{money(i.unit_price)}</td></tr></tbody>
          </table>:<table>
            <thead><tr><th>JENIS KELAS</th><th>NAMA KELAS</th><th>JUMLAH</th><th>BIAYA PER SISWA</th></tr></thead>
            <tbody><tr><td>{i.item_label}</td><td>{i.class_name||i.item_label}</td><td>{i.quantity}</td><td>{money(i.unit_price)}</td></tr></tbody>
          </table>}

          <div className="invoice-totals">
            <div><strong>Subtotal</strong><span>:</span><span>{money(i.subtotal)}</span></div>
            <div><strong>Lain – lain</strong><span>:</span><span>{i.additional_amount?money(i.additional_amount):'-'}</span></div>
            <div className="invoice-total-line"/>
            <div><strong>Total Keseluruhan</strong><span>:</span><span>{money(i.total_amount)}</span></div>
            <div><strong>Terbilang</strong><span>:</span><span>{sentence(spell(i.total_amount))} rupiah.</span></div>
          </div>
        </div>

        <div className="invoice-methods">
          <strong>METODE PEMBAYARAN</strong>
          <ul>{methodText.map(method=><li key={method.id}><b>{method.label}</b> a.n <b>{method.account_name}</b><span>{method.account_number}</span></li>)}</ul>
        </div>

        <div className="invoice-notes-print">
          <strong>Catatan:</strong>
          <ul>
            <li>Pembayaran diharapkan dilakukan paling lambat <b>{fmtDate(i.due_date)}</b>.</li>
            <li>Jadwal kelas akan disepakati setelah pembayaran dikonfirmasi.</li>
            <li>Wajib konfirmasi setelah melakukan pembayaran.</li>
            <li>Untuk pertanyaan lebih lanjut, jangan ragu untuk menghubungi kami.</li>
          </ul>
          {i.notes&&<p>{i.notes}</p>}
          <b>Terima kasih atas kepercayaan Anda! Semangat belajar!</b>
        </div>
      </section>

      {showRecap&&<section className="kojac-invoice-page invoice-recap">
        <img className="kojac-invoice-background" src="/brand/kojac-invoice-template.png" alt=""/>
        <div className="invoice-recap-content">
          <h1>REKAPAN SESI KELAS</h1>
          <table>
            <thead><tr><th rowSpan={2}>Tanggal</th><th colSpan={2}>Waktu (WIB)</th><th rowSpan={2}>Jam</th></tr><tr><th>Mulai</th><th>Selesai</th></tr></thead>
            <tbody>{detail.sessions.map(s=><tr key={s.session_id}><td>{dateDay(s.session_date)}</td><td>{time(s.starts_at)}</td><td>{time(s.ends_at)}</td><td>{dur(s.duration_minutes)}</td></tr>)}<tr className="invoice-recap-total"><td colSpan={3}>Total (jam)</td><td>{hours(i.total_minutes)}</td></tr></tbody>
          </table>
        </div>
      </section>}
    </main>
  </div>;
}
