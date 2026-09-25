import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  ReceiptText,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';
import '../honor-payment-administration.css';

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator','manager','co_founder','founder']);

type PaymentRow = {
  payroll_id:string;
  teacher_id:string;
  teacher_name:string;
  period_start:string;
  period_end:string;
  status:'draft'|'finalized'|'paid';
  net_amount:number;
  total_sessions:number;
  total_minutes:number;
  slip_number:string|null;
  paid_on:string|null;
  payment_method_snapshot:string|null;
  bank_name_snapshot:string|null;
  bank_account_name_snapshot:string|null;
  bank_account_number_snapshot:string|null;
  payment_id:string|null;
  payment_date:string|null;
  payment_amount:number|null;
  payment_method:string|null;
  bank_name:string|null;
  bank_account_name:string|null;
  bank_account_number:string|null;
  payment_reference:string|null;
  notes:string|null;
  receipt_number:string|null;
  payment_recorded_at:string|null;
};

type Payload = {
  month:string;
  period_end:string;
  summary:{
    payroll_count:number;
    draft_count:number;
    finalized_count:number;
    paid_count:number;
    total_amount:number;
    total_paid:number;
    total_outstanding:number;
  };
  rows:PaymentRow[];
};

const rupiah = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});

function monthNow(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function todayJakarta(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function fmtDate(value:string|null|undefined){
  if(!value)return '—';
  const d=new Date(`${value}T00:00:00+07:00`);
  return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);
}
function duration(minutes:number){
  const safe=Math.max(0,Math.trunc(minutes||0));
  const h=Math.floor(safe/60),m=safe%60;
  return h?(m?`${h} jam ${m} menit`:`${h} jam`):`${m} menit`;
}
function statusLabel(status:PaymentRow['status']){
  if(status==='paid')return 'Dibayar';
  if(status==='finalized')return 'Siap Dibayar';
  return 'Draft';
}

export function ManagementHonorPaymentsPage(){
  const {role,loading:authLoading}=useAuth();
  const canManage=Boolean(role&&MANAGEMENT_ROLES.has(role));

  const [month,setMonth]=useState(monthNow);
  const [status,setStatus]=useState('');
  const [query,setQuery]=useState('');
  const [payload,setPayload]=useState<Payload|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [selected,setSelected]=useState<PaymentRow|null>(null);
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({
    payment_date:todayJakarta(),
    payment_method:'Transfer',
    payment_reference:'',
    notes:'',
  });

  const load=useCallback(async()=>{
    if(!canManage)return;
    setLoading(true);setMessage('');
    const {data,error}=await supabase.rpc('get_management_teacher_payment_overview',{
      p_month:`${month}-01`,
      p_status:status||null,
    });
    if(error){
      console.error(error);
      setMessage('Administrasi pembayaran belum dapat dimuat.');
      setPayload(null);
    }else{
      setPayload(data as Payload);
    }
    setLoading(false);
  },[canManage,month,status]);

  useEffect(()=>{if(!authLoading&&canManage)void load();},[authLoading,canManage,load]);

  // KOJAC_PAYMENT_MODAL_LOCK
  useEffect(()=>{
    if(!selected)return undefined;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)setSelected(null);};
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.removeEventListener('keydown',onKeyDown);document.body.style.overflow=previous;};
  },[selected,busy]);

  const rows=useMemo(()=>{
    const all=payload?.rows??[];
    const needle=query.trim().toLowerCase();
    if(!needle)return all;
    return all.filter(row=>
      row.teacher_name.toLowerCase().includes(needle) ||
      String(row.slip_number||'').toLowerCase().includes(needle) ||
      String(row.receipt_number||'').toLowerCase().includes(needle) ||
      String(row.payment_reference||'').toLowerCase().includes(needle)
    );
  },[payload,query]);

  function beginPayment(row:PaymentRow){
    setSelected(row);
    setForm({
      payment_date:todayJakarta(),
      payment_method:row.payment_method_snapshot||'Transfer',
      payment_reference:'',
      notes:'',
    });
    setMessage('');
  }

  async function savePayment(){
    if(!selected)return;
    if(selected.status!=='finalized'){
      setMessage('Payroll harus berstatus Final sebelum pembayaran dicatat.');
      return;
    }
    if(!form.payment_date||!form.payment_method.trim()){
      setMessage('Tanggal dan metode pembayaran wajib diisi.');
      return;
    }

    setBusy(true);setMessage('');
    const {data,error}=await supabase.rpc('record_management_teacher_payroll_payment',{
      p_payroll_id:selected.payroll_id,
      p_payment_date:form.payment_date,
      p_payment_method:form.payment_method.trim(),
      p_payment_reference:form.payment_reference.trim()||null,
      p_notes:form.notes.trim()||null,
    });
    setBusy(false);

    if(error){
      console.error(error);
      setMessage('Pembayaran belum dapat disimpan.');
      return;
    }

    const result=data as {receipt_number?:string};
    setSelected(null);
    setMessage('Pembayaran tersimpan.');
    await load();
  }

  if(authLoading)return <div className="full-center">Memuat KOJAC LMS…</div>;
  if(!canManage)return <Navigate to="/" replace/>;

  const summary=payload?.summary??{
    payroll_count:0,draft_count:0,finalized_count:0,paid_count:0,
    total_amount:0,total_paid:0,total_outstanding:0,
  };

  return <div className="page honor-payment-page">
    <header className="honor-payment-header">
      <div>
        <p className="eyebrow">MANAJEMEN KOJAC</p>
        <h1><WalletCards size={30}/> Pembayaran Honor</h1>
        <p>Pusat administrasi pembayaran honor pengajar, rekening, slip, dan referensi pembayaran.</p>
      </div>
      <div className="honor-payment-filters">
        <label><span>Periode</span><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>
        <label><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="finalized">Siap Dibayar</option>
          <option value="paid">Dibayar</option>
        </select></label>
      </div>
    </header>

    <section className="honor-payment-summary">
      <article><Banknote/><strong>{rupiah.format(summary.total_amount)}</strong><span>Total Honor</span></article>
      <article><Clock3/><strong>{summary.finalized_count}</strong><span>Siap Dibayar</span><small>{rupiah.format(summary.total_outstanding)}</small></article>
      <article><CheckCircle2/><strong>{summary.paid_count}</strong><span>Sudah Dibayar</span><small>{rupiah.format(summary.total_paid)}</small></article>
      <article><ReceiptText/><strong>{summary.payroll_count}</strong><span>Payroll Periode Ini</span></article>
    </section>

    {message&&<div className="honor-payment-notice">{message}</div>}

    <section className="honor-payment-card">
      <div className="honor-payment-toolbar">
        <div>
          <p className="eyebrow">REGISTER PEMBAYARAN</p>
          <h2>Honor Pengajar</h2>
        </div>
        <div className="honor-payment-tools">
          <label className="honor-payment-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari pengajar / slip / kwitansi / referensi"/></label>
          <button className="honor-payment-secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button>
        </div>
      </div>

      {loading?<div className="honor-payment-empty">Memuat pembayaran…</div>:rows.length===0?
        <div className="honor-payment-empty">Belum ada payroll pada filter ini.</div>:
        <div className="honor-payment-table-scroll">
          <table className="honor-payment-table">
            <thead>
              <tr>
                <th>Pengajar</th>
                <th>Slip</th>
                <th>Honor Bersih</th>
                <th>Rekening</th>
                <th>Status</th>
                
                <th/>
              </tr>
            </thead>
            <tbody>
              {rows.map(row=><tr key={row.payroll_id}>
                <td>
                  <strong>{row.teacher_name}</strong>
                  <small>{row.total_sessions} sesi · {duration(row.total_minutes)}</small>
                </td>
                <td>
                  <strong>{row.slip_number||'—'}</strong>
                  <small>{fmtDate(row.period_start)} – {fmtDate(row.period_end)}</small>
                </td>
                <td><strong>{rupiah.format(row.net_amount)}</strong></td>
                <td>
                  <strong>{row.bank_name||row.bank_name_snapshot||'—'}</strong>
                  <small>{row.bank_account_name||row.bank_account_name_snapshot||'—'}</small>
                  <small>{row.bank_account_number||row.bank_account_number_snapshot||'—'}</small>
                </td>
                <td>
                  <span className={`honor-payment-status is-${row.status}`}>{statusLabel(row.status)}</span>
                  {row.payment_date&&<small>{fmtDate(row.payment_date)} · {row.payment_method}</small>}
                  {row.payment_reference&&<small>Ref: {row.payment_reference}</small>}
                </td>
                
                <td>
                  <div className="honor-payment-actions">
                    <Link className="honor-payment-secondary" to={`/honor/slip/${row.payroll_id}`} target="_blank">
                      <FileText size={14}/> Slip
                    </Link>
                    {row.status==='paid'&&row.receipt_number&&
                      <Link className="honor-payment-secondary" to={`/honor/kwitansi/${row.payroll_id}`} target="_blank" rel="noopener noreferrer">
                        <ReceiptText size={14}/> Kwitansi
                      </Link>}
                    {row.status==='finalized'&&
                      <button className="honor-payment-primary" onClick={()=>beginPayment(row)}>
                        <BadgeCheck size={14}/> Bayar Honor
                      </button>}
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    </section>

    {selected&&<div className="honor-payment-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target&&!busy)setSelected(null);}}>
      <section className="honor-payment-modal">
        <header>
          <div><p className="eyebrow">PEMBAYARAN HONOR</p><h2>{selected.teacher_name}</h2><span>{selected.slip_number||'Slip belum bernomor'}</span></div>
          <button type="button" onClick={()=>!busy&&setSelected(null)}><X size={20}/></button>
        </header>

        <div className="honor-payment-modal-total">
          <span>Honor Bersih</span>
          <strong>{rupiah.format(selected.net_amount)}</strong>
        </div>

        <div className="honor-payment-destination">
          <div><span>Bank</span><strong>{selected.bank_name_snapshot||'—'}</strong></div>
          <div><span>Nama Rekening</span><strong>{selected.bank_account_name_snapshot||'—'}</strong></div>
          <div><span>Nomor Rekening</span><strong>{selected.bank_account_number_snapshot||'—'}</strong></div>
        </div>

        <div className="honor-payment-form">
          <label><span>Tanggal Pembayaran</span><input type="date" value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/></label>
          <label><span>Metode Pembayaran</span><input value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})}/></label>
          <label className="is-wide"><span>Referensi / No. Transaksi</span><input placeholder="Opsional" value={form.payment_reference} onChange={e=>setForm({...form,payment_reference:e.target.value})}/></label>
          <label className="is-wide"><span>Catatan</span><textarea rows={3} placeholder="Opsional" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
        </div>

        <div className="honor-payment-modal-info">
          Setelah disimpan, payroll menjadi <strong>Dibayar</strong> dan data pembayaran disimpan permanen.
        </div>

        <footer>
          <button className="honor-payment-secondary" disabled={busy} onClick={()=>setSelected(null)}>Batal</button>
          <button className="honor-payment-primary" disabled={busy} onClick={()=>void savePayment()}>
            <BadgeCheck size={15}/> Konfirmasi Pembayaran
          </button>
        </footer>
      </section>
    </div>}
  </div>;
}
