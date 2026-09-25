import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../invoice-print.css';

type Session={
  session_id:string;
  session_date:string;
  starts_at:string;
  ends_at:string;
  duration_minutes:number;
};
type PaymentMethod={id:string;label:string;account_name:string;account_number:string};
type Detail={
  invoice:{
    invoice_id:string;
    recipient_kind:'student'|'institution';
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
    payment_methods:PaymentMethod[];
    notes:string|null;
  };
  sessions:Session[];
  payments:Array<{payment_id:string;amount:number;payment_date:string;payment_method:string;reference_number:string|null}>;
};

function dateLong(value:string){
  const d=new Date(`${value}T00:00:00+07:00`);
  return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);
}
function dateWithDay(value:string){
  const d=new Date(`${value}T00:00:00+07:00`);
  const text=new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);
  return text.charAt(0).toUpperCase()+text.slice(1);
}
function cleanTime(value:string){const [h='0',m='00']=value.split(':');return `${Number(h)}:${m}`;}
function money(value:number){return `Rp.${Math.round(Number(value||0)).toLocaleString('id-ID')},-`;}
function moneySpaced(value:number){return `Rp. ${Math.round(Number(value||0)).toLocaleString('id-ID')},-`;}
function duration(minutes:number){const h=Math.floor((minutes||0)/60),m=(minutes||0)%60;return h?(m?`${h} Jam ${m} Menit`:`${h} Jam`):`${m} Menit`;}
function hours(minutes:number){const n=(minutes||0)/60;return Number.isInteger(n)?String(n):n.toLocaleString('id-ID',{maximumFractionDigits:2});}
const words=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
function spell(value:number):string{
  const n=Math.floor(Math.abs(value));
  if(n<12)return words[n];
  if(n<20)return `${spell(n-10)} belas`;
  if(n<100)return `${spell(Math.floor(n/10))} puluh ${spell(n%10)}`.trim();
  if(n<200)return `seratus ${spell(n-100)}`.trim();
  if(n<1000)return `${spell(Math.floor(n/100))} ratus ${spell(n%100)}`.trim();
  if(n<2000)return `seribu ${spell(n-1000)}`.trim();
  if(n<1_000_000)return `${spell(Math.floor(n/1000))} ribu ${spell(n%1000)}`.trim();
  if(n<1_000_000_000)return `${spell(Math.floor(n/1_000_000))} juta ${spell(n%1_000_000)}`.trim();
  return String(n);
}
function sentence(value:string){return value?value.charAt(0).toUpperCase()+value.slice(1):value;}
function chunks<T>(rows:T[],size:number){const out:T[][]=[];for(let i=0;i<rows.length;i+=size)out.push(rows.slice(i,i+size));return out;}

export function InvoicePrintPage(){
  const {invoiceId}=useParams();
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

  const recapPages=useMemo(()=>detail?.sessions?.length?chunks(detail.sessions,14):[],[detail]);

  if(loading)return <div className="full-center">Memuat invoice…</div>;
  if(!invoiceId)return <Navigate to="/" replace/>;
  if(error||!detail)return <div className="full-center">{error||'Invoice tidak ditemukan.'}</div>;

  const i=detail.invoice;
  const methods=i.payment_methods||[];

  return <div className="kojac-invoice-screen">
    <div className="kojac-invoice-toolbar">
      <button onClick={()=>window.history.back()}><ArrowLeft size={16}/> Kembali</button>
      <button onClick={()=>window.print()}><Printer size={16}/> Cetak / Simpan PDF</button>
    </div>

    <main className="kojac-invoice-document">
      <section className="kojac-invoice-page">
        <img className="kojac-invoice-bg" src="/brand/kojac-invoice-template.png" alt=""/>
        <div className="kojac-invoice-title">INVOICE</div>

        <div className="kojac-invoice-meta">
          <div><strong>Nomor Invoice:</strong><span>{i.invoice_number||'DRAFT / BELUM DITERBITKAN'}</span></div>
          <div><strong>Tanggal Invoice:</strong><span>{dateLong(i.invoice_date)}</span></div>
          <div><strong>Tanggal Jatuh Tempo:</strong><span>{dateLong(i.due_date)}</span></div>
        </div>

        <div className="kojac-invoice-parties">
          <div><strong>Kepada :</strong><span>{i.recipient_name}</span><span>{i.recipient_address||'-'}</span><span>{i.recipient_phone||'-'}</span></div>
          <div><strong>Dari :</strong><span>{i.sender_name}</span><span>{i.sender_address}</span><span>{i.sender_phone}</span></div>
        </div>

        <div className="kojac-invoice-description">
          <h2>DESKRIPSI</h2>
          {i.pricing_mode==='hourly'?<table>
            <thead><tr><th>NAMA KELAS</th><th>TOTAL SESI</th><th>TOTAL JAM</th><th>BIAYA PER JAM</th></tr></thead>
            <tbody><tr><td>{i.item_label}</td><td>{i.total_sessions}</td><td>{hours(i.total_minutes)}</td><td>{moneySpaced(i.unit_price)}</td></tr></tbody>
          </table>:<table>
            <thead><tr><th>JENIS KELAS</th><th>NAMA KELAS</th><th>JUMLAH</th><th>BIAYA PER SISWA</th></tr></thead>
            <tbody><tr><td>{i.item_label}</td><td>{i.class_name||i.recipient_name}</td><td>{i.quantity}</td><td>{moneySpaced(i.unit_price)}</td></tr></tbody>
          </table>}

          <div className="kojac-invoice-totals">
            <div><strong>Subtotal</strong><b>:</b><span>{money(i.subtotal)}</span></div>
            <div><strong>Lain – lain</strong><b>:</b><span>{i.additional_amount?money(i.additional_amount):'-'}</span></div>
            <hr/>
            <div><strong>Total Keseluruhan</strong><b>:</b><span>{money(i.total_amount)}</span></div>
            <div className="terbilang"><strong>Terbilang</strong><b>:</b><span>{sentence(spell(i.total_amount))} rupiah.</span></div>
          </div>
        </div>

        <div className="kojac-invoice-payment">
          <h3>METODE PEMBAYARAN</h3>
          {methods.length?methods.map(m=><div key={m.id||`${m.label}-${m.account_number}`}><span>•</span><p><strong>{m.label}</strong> a.n <strong>{m.account_name}</strong><br/>{m.account_number}</p></div>):<div><span>•</span><p>Hubungi Manajemen KOJAC untuk informasi pembayaran.</p></div>}
        </div>

        <div className="kojac-invoice-notes">
          <strong>Catatan:</strong>
          <ul>
            <li>Pembayaran diharapkan dilakukan paling lambat <b>{dateLong(i.due_date)}</b>.</li>
            <li>Jadwal kelas akan disepakati setelah pembayaran dikonfirmasi.</li>
            <li>Wajib konfirmasi setelah melakukan pembayaran.</li>
            <li>Untuk pertanyaan lebih lanjut, jangan ragu untuk menghubungi kami.</li>
          </ul>
          {i.notes&&<p>{i.notes}</p>}
          <b>Terima kasih atas kepercayaan Anda! Semangat belajar!</b>
        </div>
      </section>

      {recapPages.map((rows,index)=><section className="kojac-invoice-page kojac-invoice-recap" key={index}>
        <img className="kojac-invoice-bg" src="/brand/kojac-invoice-template.png" alt=""/>
        <div className="kojac-invoice-recap-content">
          <h1>REKAPAN SESI KELAS</h1>
          <table>
            <thead><tr><th rowSpan={2}>Tanggal</th><th colSpan={2}>Waktu (WIB)</th><th rowSpan={2}>Jam</th></tr><tr><th>Mulai</th><th>Selesai</th></tr></thead>
            <tbody>
              {rows.map(s=><tr key={s.session_id}><td>{dateWithDay(s.session_date)}</td><td>{cleanTime(s.starts_at)}</td><td>{cleanTime(s.ends_at)}</td><td>{duration(s.duration_minutes)}</td></tr>)}
              {index===recapPages.length-1&&<tr className="total"><td colSpan={3}>Total (jam)</td><td>{hours(i.total_minutes)}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>)}
    </main>
  </div>;
}
