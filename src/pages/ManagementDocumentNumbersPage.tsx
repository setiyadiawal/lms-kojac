import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileDigit,
  FileText,
  Hash,
  ReceiptText,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';
import '../document-numbering.css';

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator','manager','co_founder','founder']);
const OFFICIAL_DOCUMENT_TYPES = new Set(['honor_slip','letter','invoice','receipt','teacher_monthly_report']);
const AUTOMATIC_DOCUMENT_TYPES = new Set(['honor_slip','receipt','teacher_monthly_report']);
const MANUAL_DOCUMENT_TYPES = new Set(['letter','invoice']);

type Setting = {
  document_type:string;
  label:string;
  code:string;
  reset_period:'monthly'|'yearly'|'never';
  padding:number;
  is_active:boolean;
};

type DocumentRow = {
  document_id:string;
  document_type:string;
  document_label:string;
  document_number:string;
  serial_number:number;
  period_key:string;
  issue_date:string;
  entity_key:string|null;
  reference_label:string|null;
  description:string|null;
  metadata:Record<string,unknown>;
  status:'issued'|'void';
  created_at:string;
  voided_at:string|null;
  void_reason:string|null;
};

type Payload = { settings:Setting[]; rows:DocumentRow[] };

function todayJakarta(){
  return new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',
  }).format(new Date());
}
function fmtDate(value:string){
  const d=new Date(`${value}T00:00:00+07:00`);
  return new Intl.DateTimeFormat('id-ID',{
    day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Jakarta',
  }).format(d);
}
const resetLabels:Record<Setting['reset_period'],string>={
  monthly:'Reset tiap bulan',
  yearly:'Reset tiap tahun',
  never:'Tidak pernah reset',
};

export function ManagementDocumentNumbersPage(){
  const {role,loading:authLoading}=useAuth();
  const canManage=Boolean(role&&MANAGEMENT_ROLES.has(role));
  const [payload,setPayload]=useState<Payload>({settings:[],rows:[]});
  const [filter,setFilter]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [issueForm,setIssueForm]=useState({
    document_type:'letter',
    issue_date:todayJakarta(),
    reference_label:'',
    description:'',
  });
  const [editing,setEditing]=useState<Setting|null>(null);

  const load=useCallback(async()=>{
    if(!canManage)return;
    setLoading(true);setMessage('');
    const {data,error}=await supabase.rpc('get_management_document_number_overview',{
      p_document_type:filter||null,p_limit:300,
    });
    if(error){
      console.error(error);
      setMessage('Nomor dokumen belum dapat dimuat.');
      setLoading(false);
      return;
    }
    setPayload((data??{settings:[],rows:[]}) as Payload);
    setLoading(false);
  },[canManage,filter]);

  useEffect(()=>{if(!authLoading&&canManage)void load();},[authLoading,canManage,load]);

  // KOJAC_DOC_MODAL_LOCK
  useEffect(()=>{
    if(!editing)return undefined;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)setEditing(null);};
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.removeEventListener('keydown',onKeyDown);document.body.style.overflow=previous;};
  },[editing,busy]);

  const officialSettings=useMemo(()=>payload.settings.filter(x=>x.is_active&&['honor_slip','letter','invoice'].includes(x.document_type)),[payload.settings]);

  const counts=useMemo(()=>{
    const rows=payload.rows;
    return {
      total:rows.length,
      activeTypes:officialSettings.length,
      honor:rows.filter(x=>x.document_type==='honor_slip').length,
      manual:rows.filter(x=>x.document_type!=='honor_slip').length,
    };
  },[payload]);

  async function issueNumber(){
    if(!MANUAL_DOCUMENT_TYPES.has(issueForm.document_type)){
      setMessage('Jenis dokumen ini tidak dapat diterbitkan manual.');
      return;
    }
    if(!issueForm.reference_label.trim()){
      setMessage('Referensi dokumen wajib diisi.');
      return;
    }
    setBusy(true);setMessage('');
    const {data,error}=await supabase.rpc('issue_management_document_number',{
      p_document_type:issueForm.document_type,
      p_issue_date:issueForm.issue_date,
      p_reference_label:issueForm.reference_label.trim(),
      p_description:issueForm.description.trim()||null,
    });
    setBusy(false);
    if(error){
      console.error(error);
      setMessage('Nomor dokumen belum dapat diterbitkan.');
      return;
    }
    const result=data as {document_number?:string};
    setMessage(`Nomor diterbitkan: ${result.document_number??'berhasil'}`);
    setIssueForm(current=>({...current,reference_label:'',description:''}));
    await load();
  }

  async function saveSetting(){
    if(!editing)return;
    setBusy(true);setMessage('');
    const {error}=await supabase.rpc('save_management_document_number_setting',{
      p_document_type:editing.document_type,
      p_label:editing.label,
      p_code:editing.code,
      p_reset_period:editing.reset_period,
      p_padding:editing.padding,
      p_is_active:editing.is_active,
    });
    setBusy(false);
    if(error){
      console.error(error);
      setMessage('Pengaturan nomor belum tersimpan.');
      return;
    }
    setEditing(null);
    setMessage('Pengaturan nomor tersimpan. Nomor lama tidak berubah.');
    await load();
  }

  async function voidNumber(row:DocumentRow){
    if(!MANUAL_DOCUMENT_TYPES.has(row.document_type))return;
    const reason=window.prompt(
      `Batalkan nomor ${row.document_number}?\nNomor tidak akan dipakai ulang.\n\nAlasan:`
    );
    if(!reason?.trim())return;
    setBusy(true);
    const {error}=await supabase.rpc('void_management_document_number',{
      p_document_id:row.document_id,p_reason:reason.trim(),
    });
    setBusy(false);
    if(error){
      console.error(error);
      setMessage('Nomor belum dapat dibatalkan.');
      return;
    }
    await load();
  }

  if(authLoading)return <div className="full-center">Memuat KOJAC LMS…</div>;
  if(!canManage)return <Navigate to="/" replace/>;

  return <div className="page doc-number-page">
    <header className="doc-number-header">
      <div>
        <p className="eyebrow">ADMINISTRASI KOJAC</p>
        <h1><Hash size={30}/> Nomor Dokumen</h1>
        <p>Register nomor resmi KOJAC untuk Surat, Slip Honor, Invoice Pembayaran, Kwitansi Honor, dan Laporan Bulanan Pengajar.</p>
      </div>
      <button className="doc-secondary" onClick={()=>void load()} disabled={loading}>
        <RefreshCw size={15}/> Refresh
      </button>
    </header>

    <section className="doc-number-summary">
      <article><FileDigit/><strong>{counts.total}</strong><span>Nomor tercatat</span></article>
      <article><ShieldCheck/><strong>{counts.activeTypes}</strong><span>Jenis aktif</span></article>
      <article><ReceiptText/><strong>{counts.honor}</strong><span>Slip honor</span></article>
      <article><FileText/><strong>{counts.manual}</strong><span>Dokumen lainnya</span></article>
    </section>

    {message&&<div className="doc-notice">{message}</div>}

    <div className="doc-number-layout">
      <section className="doc-card">
        <div className="doc-section-title">
          <div><p className="eyebrow">TERBITKAN</p><h2>Nomor Dokumen Baru</h2></div>
        </div>
        <p className="doc-helper">
          Slip Honor, Kwitansi Honor, dan Laporan Bulanan Pengajar diterbitkan otomatis dari flow masing-masing. Penerbitan manual hanya tersedia untuk Surat dan Invoice Pembayaran.
        </p>
        <div className="doc-form">
          <label>
            <span>Jenis Dokumen</span>
            <select value={issueForm.document_type} onChange={e=>setIssueForm({...issueForm,document_type:e.target.value})}>
              {payload.settings.filter(x=>x.is_active&&MANUAL_DOCUMENT_TYPES.has(x.document_type)).map(x=>
                <option key={x.document_type} value={x.document_type}>{x.label}</option>
              )}
            </select>
          </label>
          <label>
            <span>Tanggal Dokumen</span>
            <input type="date" value={issueForm.issue_date} onChange={e=>setIssueForm({...issueForm,issue_date:e.target.value})}/>
          </label>
          <label className="is-wide">
            <span>Referensi / Judul</span>
            <input
              placeholder="Contoh: Surat Keterangan Pengajar"
              value={issueForm.reference_label}
              onChange={e=>setIssueForm({...issueForm,reference_label:e.target.value})}
            />
          </label>
          <label className="is-wide">
            <span>Keterangan</span>
            <textarea
              rows={3}
              placeholder="Opsional"
              value={issueForm.description}
              onChange={e=>setIssueForm({...issueForm,description:e.target.value})}
            />
          </label>
        </div>
        <button className="doc-primary" disabled={busy} onClick={()=>void issueNumber()}>
          <Hash size={15}/> Terbitkan Nomor
        </button>
      </section>

      <section className="doc-card">
        <div className="doc-section-title">
          <div><p className="eyebrow">FORMAT</p><h2>Pengaturan Jenis Dokumen</h2></div>
        </div>
        <div className="doc-setting-list">
          {officialSettings.map(s=><article key={s.document_type}>
            <div>
              <strong>{s.label}</strong>
              <span>KOJAC/{s.code}/… · {resetLabels[s.reset_period]} · {s.padding} digit</span>
            </div>
            <span className={s.is_active?'doc-type-status':'doc-type-status is-off'}>
              {s.is_active?'Aktif':'Nonaktif'}
            </span>
            <button className="doc-secondary"  onClick={()=>setEditing({...s})}>
              <Settings2 size={14}/> Atur
            </button>
          </article>)}
        </div>
      </section>
    </div>

    <section className="doc-card doc-history">
      <div className="doc-section-title">
        <div><p className="eyebrow">REGISTER</p><h2>Riwayat Nomor Dokumen</h2></div>
        <select value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="">Semua jenis</option>
          {officialSettings.map(s=><option key={s.document_type} value={s.document_type}>{s.label}</option>)}
        </select>
      </div>

      {loading?<div className="doc-empty">Memuat nomor dokumen…</div>:payload.rows.length===0?
        <div className="doc-empty">Belum ada nomor pada filter ini.</div>:
        <div className="doc-table-scroll">
          <table className="doc-table">
            <thead><tr><th>Nomor</th><th>Jenis</th><th>Tanggal</th><th>Referensi</th><th>Status</th><th/></tr></thead>
            <tbody>
              {payload.rows.map(row=><tr key={row.document_id}>
                <td><strong>{row.document_number}</strong></td>
                <td>{row.document_label}</td>
                <td>{fmtDate(row.issue_date)}</td>
                <td><strong>{row.reference_label||'—'}</strong><small>{row.description||''}</small></td>
                <td><span className={`doc-status is-${row.status}`}>{row.status==='issued'?'Terbit':'Dibatalkan'}</span></td>
                <td>
                  {MANUAL_DOCUMENT_TYPES.has(row.document_type)&&row.status==='issued'&&
                    <button className="doc-icon danger" title="Batalkan nomor" onClick={()=>void voidNumber(row)} disabled={busy}>
                      <Trash2 size={14}/>
                    </button>}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      }
    </section>

    {editing&&<div className="doc-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null);}}>
      <section className="doc-modal">
        <header><div><p className="eyebrow">PENGATURAN</p><h2>{editing.label}</h2></div></header>
        <div className="doc-form">
          <label><span>Nama</span><input value={editing.label} onChange={e=>setEditing({...editing,label:e.target.value})}/></label>
          <label><span>Kode</span><input value={editing.code} onChange={e=>setEditing({...editing,code:e.target.value.toUpperCase()})}/></label>
          <label><span>Reset Urutan</span><select value={editing.reset_period} onChange={e=>setEditing({...editing,reset_period:e.target.value as Setting['reset_period']})}><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option><option value="never">Tidak pernah</option></select></label>
          <label><span>Jumlah Digit</span><input type="number" min={2} max={8} value={editing.padding} onChange={e=>setEditing({...editing,padding:Number(e.target.value)})}/></label>
          <label className="doc-toggle"><input type="checkbox" checked={editing.is_active} onChange={e=>setEditing({...editing,is_active:e.target.checked})}/><span>Jenis dokumen aktif</span></label>
        </div>
        <div className="doc-modal-actions">
          <button className="doc-secondary" onClick={()=>setEditing(null)}>Batal</button>
          <button className="doc-primary" disabled={busy} onClick={()=>void saveSetting()}><Save size={15}/> Simpan</button>
        </div>
      </section>
    </div>}
  </div>;
}
