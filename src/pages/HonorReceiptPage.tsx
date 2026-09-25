import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import '../honor-receipt.css';

type PayrollLine = {
  line_id:string;
  activity_label:string;
  class_name:string;
  duration_minutes:number;
  amount:number;
};

type Payment = {
  payment_id:string;
  payment_date:string;
  amount:number;
  payment_method:string;
  bank_name:string|null;
  bank_account_name:string|null;
  bank_account_number:string|null;
  payment_reference:string|null;
  notes:string|null;
  receipt_number:string|null;
  created_at:string;
};

type Detail = {
  payroll:{
    payroll_id:string;
    teacher_id:string;
    period_start:string;
    period_end:string;
    status:'draft'|'finalized'|'paid';
    base_amount:number;
    additions_amount:number;
    deductions_amount:number;
    net_amount:number;
    total_sessions:number;
    total_minutes:number;
    profile_snapshot:Record<string,string|null>;
    paid_on:string|null;
    slip_number:string|null;
  };
  payment:Payment|null;
  lines:PayrollLine[];
};

const rupiah = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});

function fmtDate(value:string|null|undefined){
  if(!value)return '—';
  const d=new Date(`${value}T00:00:00+07:00`);
  return new Intl.DateTimeFormat('id-ID',{
    day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta',
  }).format(d);
}

function money(value:number){
  return `Rp. ${Math.round(Number(value||0)).toLocaleString('id-ID')},-`;
}

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
function sentence(value:string){
  return value?value.charAt(0).toUpperCase()+value.slice(1):value;
}

function duration(minutes:number){
  const h=Math.floor((minutes||0)/60),m=(minutes||0)%60;
  return h?(m?`${h} jam ${m} menit`:`${h} jam`):`${m} menit`;
}

export function HonorReceiptPage(){
  const {payrollId}=useParams();
  const {loading:authLoading}=useAuth();
  const [detail,setDetail]=useState<Detail|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!payrollId)return;
    let active=true;
    void supabase.rpc('get_teacher_payroll_detail',{p_payroll_id:payrollId}).then(({data,error:e})=>{
      if(!active)return;
      if(e){
        console.error(e);
        setError('Kwitansi honor tidak dapat dimuat.');
      }else{
        const next=data as Detail;
        if(!next?.payment?.receipt_number){
          setError('Kwitansi belum tersedia. Pembayaran honor belum tercatat.');
        }else{
          setDetail(next);
        }
      }
      setLoading(false);
    });
    return()=>{active=false;};
  },[payrollId]);

  const classSummary=useMemo(()=>{
    const names=new Set((detail?.lines??[]).map(x=>x.class_name).filter(Boolean));
    return [...names].join(', ')||'Kelas KOJAC';
  },[detail]);

  if(authLoading||loading)return <div className="full-center">Memuat kwitansi honor…</div>;
  if(!payrollId)return <Navigate to="/" replace/>;
  if(error||!detail)return <div className="full-center">{error||'Kwitansi tidak ditemukan.'}</div>;

  const p=detail.payroll;
  const payment=detail.payment!;
  const profile=p.profile_snapshot||{};
  const teacherName=String(profile.full_name||'Pengajar KOJAC');
  const accountName=payment.bank_account_name||profile.bank_account_name||teacherName;
  const accountNumber=payment.bank_account_number||profile.bank_account_number||'—';
  const bankName=payment.bank_name||profile.bank_name||'—';

  return <div className="honor-receipt-screen">
    <div className="honor-receipt-toolbar">
      <button type="button" onClick={()=>window.history.back()}><ArrowLeft size={16}/> Kembali</button>
      <button type="button" onClick={()=>window.print()}><Printer size={16}/> Cetak / Simpan PDF</button>
    </div>

    <main className="honor-receipt-document">
      <section className="honor-receipt-page">
        <img className="honor-receipt-corner honor-receipt-corner-top" src="/brand/receipt-corner-top-left.png" alt="" aria-hidden="true"/>
        <img className="honor-receipt-corner honor-receipt-corner-bottom" src="/brand/receipt-corner-bottom-right.png" alt="" aria-hidden="true"/>
        <img className="honor-receipt-watermark" src="/brand/kojac-symbol.png" alt=""/>

        <header className="honor-receipt-header">
          <div className="honor-receipt-brand">
            <img src="/brand/kojac-symbol.png" alt=""/>
            <div><strong>KOJAC</strong><span>Kuuhaku Online Japanese Class</span></div>
          </div>
          <div className="honor-receipt-title">
            <h1>KWITANSI</h1>
            <strong>{payment.receipt_number}</strong>
          </div>
        </header>

        <div className="honor-receipt-divider"/>

        <section className="honor-receipt-main">
          <div className="honor-receipt-row">
            <span>Sudah terima dari</span><b>:</b><strong>KOJAC — Kuuhaku Online Japanese Class</strong>
          </div>
          <div className="honor-receipt-row">
            <span>Nama Penerima</span><b>:</b><strong>{teacherName}</strong>
          </div>
          <div className="honor-receipt-row is-amount">
            <span>Uang Sejumlah</span><b>:</b><strong>{money(payment.amount)}</strong>
          </div>
          <div className="honor-receipt-row">
            <span>Terbilang</span><b>:</b><em>{sentence(spell(payment.amount))} rupiah</em>
          </div>
          <div className="honor-receipt-row">
            <span>Untuk Pembayaran</span><b>:</b>
            <strong>Honor mengajar periode {fmtDate(p.period_start)} – {fmtDate(p.period_end)}</strong>
          </div>
          <div className="honor-receipt-row">
            <span>Kelas</span><b>:</b><span>{classSummary}</span>
          </div>
          <div className="honor-receipt-row">
            <span>Total Sesi / Durasi</span><b>:</b><span>{p.total_sessions} sesi · {duration(p.total_minutes)}</span>
          </div>
          <div className="honor-receipt-row">
            <span>No. Slip Honor</span><b>:</b><span>{p.slip_number||'—'}</span>
          </div>
        </section>

        <section className="honor-receipt-payment">
          <h2>INFORMASI PEMBAYARAN</h2>
          <div className="honor-receipt-payment-grid">
            <div><span>Tanggal Pembayaran</span><strong>{fmtDate(payment.payment_date)}</strong></div>
            <div><span>Metode</span><strong>{payment.payment_method}</strong></div>
            <div><span>Bank</span><strong>{bankName}</strong></div>
            <div><span>Nama Rekening</span><strong>{accountName}</strong></div>
            <div><span>Nomor Rekening</span><strong>{accountNumber}</strong></div>
            <div><span>Referensi</span><strong>{payment.payment_reference||'—'}</strong></div>
          </div>
          {payment.notes&&<p className="honor-receipt-note">Catatan: {payment.notes}</p>}
        </section>

        <footer className="honor-receipt-footer">
          <span>空白オンライン日本語クラス</span>
          <strong>Kuuhaku Online Japanese Class</strong>
          <small>一緒に一生懸命勉強しましょう！</small>
          <b>KOJAC</b>
        </footer>
      </section>
    </main>
  </div>;
}
