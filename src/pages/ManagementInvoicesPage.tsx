
import { Ban, CheckCircle2, CircleDollarSign, FilePlus2, FileText, RefreshCw, Save, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  getManagementInvoiceOverview,
  getManagementInvoiceSetup,
  getInvoiceDetail,
  issueManagementInvoice,
  recordInvoicePayment,
  saveManagementInvoice,
  voidManagementInvoice,
} from '../features/invoice/api';
import type { InvoiceOverview, InvoiceRow, InvoiceSession, InvoiceSetup, PricingMode, RecipientKind } from '../features/invoice/types';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';
import '../features/invoice/invoice.css';

const MANAGEMENT_ROLES = new Set<AppRole>(['administrator','manager','co_founder','founder']);

function today() { return new Date().toISOString().slice(0,10); }
function monthStart() { return today().slice(0,7) + '-01'; }
function rupiah(value: number) { return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(value || 0); }
function dateId(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value + (value.includes('T') ? '' : 'T00:00:00+07:00'));
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric'}).format(d) : value;
}
function statusLabel(status: string) {
  return ({ draft:'Draft', issued:'Terbit', partial:'Sebagian', paid:'Lunas', void:'Dibatalkan' } as Record<string,string>)[status] || status;
}
function emptySession(): InvoiceSession {
  return { session_date: today(), starts_at:'19:30', ends_at:'21:00', duration_minutes:90 };
}
function calcDuration(start: string, end: string) {
  const [sh,sm] = start.split(':').map(Number), [eh,em] = end.split(':').map(Number);
  if ([sh,sm,eh,em].some(v=>!Number.isFinite(v))) return 0;
  return Math.max(0,(eh*60+em)-(sh*60+sm));
}

type Draft = {
  id?: string;
  recipient_kind: RecipientKind;
  recipient_user_id: string;
  recipient_name: string;
  recipient_address: string;
  recipient_phone: string;
  class_id: string;
  class_name_snapshot: string;
  invoice_code: string;
  invoice_date: string;
  due_date: string;
  pricing_mode: PricingMode;
  item_label: string;
  quantity: number;
  unit_price: number;
  additional_amount: number;
  notes: string;
  sessions: InvoiceSession[];
};

function freshDraft(): Draft {
  return {
    recipient_kind:'student', recipient_user_id:'', recipient_name:'', recipient_address:'', recipient_phone:'',
    class_id:'', class_name_snapshot:'', invoice_code:'JPNPRIVAT', invoice_date:today(), due_date:today(),
    pricing_mode:'hourly', item_label:'PRIVAT 1 ON 1', quantity:1, unit_price:0, additional_amount:0, notes:'',
    sessions:[emptySession()],
  };
}

export function ManagementInvoicesPage() {
  const { role, loading: authLoading } = useAuth();
  const canManage = Boolean(role && MANAGEMENT_ROLES.has(role));
  const navigate = useNavigate();

  const [setup, setSetup] = useState<InvoiceSetup | null>(null);
  const [overview, setOverview] = useState<InvoiceOverview | null>(null);
  const [month, setMonth] = useState(monthStart());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(freshDraft());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true); setMessage('');
    try {
      const [nextSetup,nextOverview] = await Promise.all([
        getManagementInvoiceSetup(),
        getManagementInvoiceOverview(month),
      ]);
      setSetup(nextSetup); setOverview(nextOverview);
    } catch (error) {
      console.error('KOJAC invoice management load failed', error);
      setMessage('Data invoice belum dapat dimuat.');
    } finally { setLoading(false); }
  }, [canManage, month]);

  useEffect(()=>{ if(!authLoading && canManage) void load(); },[authLoading,canManage,load]);

  // KOJAC_INVOICE_MODAL_LOCK
  useEffect(()=>{
    if(!formOpen)return undefined;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)setFormOpen(false);};
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.removeEventListener('keydown',onKeyDown);document.body.style.overflow=previous;};
  },[formOpen,busy]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = overview?.rows ?? [];
    if (!query) return source;
    return source.filter(row => [row.invoice_number,row.recipient_name,row.class_name_snapshot,row.item_label].some(v=>String(v??'').toLowerCase().includes(query)));
  }, [overview,search]);

  if (authLoading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!canManage) return <Navigate to="/" replace/>;

  const totalMinutes = draft.sessions.reduce((sum,s)=>sum+(Number(s.duration_minutes)||0),0);
  const totalSessions = draft.sessions.length;
  const quantity = draft.pricing_mode === 'hourly' ? totalMinutes / 60 : Number(draft.quantity || 0);
  const subtotal = Math.round(quantity * Number(draft.unit_price || 0));
  const total = subtotal + Number(draft.additional_amount || 0);

  function openNew() { setDraft(freshDraft()); setFormOpen(true); setMessage(''); }

  async function editDraft(row: InvoiceRow) {
    if (row.status !== 'draft') return;
    setBusy(true); setMessage('');
    try {
      const detail = await getInvoiceDetail(row.id);
      const firstDate = detail.session_start || detail.invoice_date || today();
      const lastDate = detail.session_end || firstDate;
      const fallbackSessions = firstDate === lastDate
        ? [{ ...emptySession(), session_date:firstDate }]
        : [{ ...emptySession(), session_date:firstDate }, { ...emptySession(), session_date:lastDate }];
      setDraft({
        id:detail.id,
        recipient_kind:detail.recipient_kind,
        recipient_user_id:detail.recipient_user_id || '',
        recipient_name:detail.recipient_name || '',
        recipient_address:detail.recipient_address || '',
        recipient_phone:detail.recipient_phone || '',
        class_id:detail.class_id || '',
        class_name_snapshot:detail.class_name_snapshot || '',
        invoice_code:detail.invoice_code || 'JPNPRIVAT',
        invoice_date:detail.invoice_date || today(),
        due_date:detail.due_date || today(),
        pricing_mode:detail.pricing_mode,
        item_label:detail.item_label || '',
        quantity:Number(detail.quantity || 1),
        unit_price:Number(detail.unit_price || 0),
        additional_amount:Number(detail.additional_amount || 0),
        notes:detail.notes || '',
        sessions:detail.sessions.length ? detail.sessions : fallbackSessions,
      });
      setFormOpen(true);
    } catch (error) {
      console.error('KOJAC edit invoice load failed', error);
      setMessage('Draft invoice belum dapat dibuka.');
    } finally { setBusy(false); }
  }

  function selectStudent(userId: string) {
    const student = setup?.students.find(s=>s.user_id===userId);
    setDraft(current => ({
      ...current,
      recipient_user_id:userId,
      recipient_name: student?.billing_name || student?.name || '',
      recipient_address: student?.address || '',
      recipient_phone: student?.phone || '',
    }));
  }

  function selectClass(classId: string) {
    const cls = setup?.classes.find(c=>c.id===classId);
    setDraft(current=>({...current,class_id:classId,class_name_snapshot:cls?.name||'',item_label:cls?.name||current.item_label}));
  }

  function updateSession(index: number, patch: Partial<InvoiceSession>) {
    setDraft(current=>({...current,sessions:current.sessions.map((s,i)=>{
      if(i!==index) return s;
      const next={...s,...patch};
      if(patch.starts_at !== undefined || patch.ends_at !== undefined) next.duration_minutes=calcDuration(next.starts_at,next.ends_at);
      return next;
    })}));
  }

  async function saveDraft() {
    if (draft.recipient_kind === 'student' && !draft.recipient_user_id) return setMessage('Pilih siswa penerima invoice.');
    if (!draft.recipient_name.trim()) return setMessage('Nama penerima wajib diisi.');
    if (!/^[A-Z0-9]{3,20}$/.test(draft.invoice_code.trim().toUpperCase())) return setMessage('Kode invoice harus 3–20 karakter huruf/angka.');
    if (!draft.item_label.trim()) return setMessage('Deskripsi invoice wajib diisi.');
    if (!draft.invoice_date || !draft.due_date || draft.due_date < draft.invoice_date) return setMessage('Jatuh tempo tidak boleh sebelum tanggal invoice.');
    if (draft.pricing_mode === 'hourly' && !draft.class_id) return setMessage('Mode per jam membutuhkan kelas agar rekap sesi dapat diambil dari laporan pembelajaran approved.');
    if (draft.unit_price <= 0) return setMessage('Tarif harus lebih dari 0.');
    setBusy(true); setMessage('');
    try {
      const id = await saveManagementInvoice({
        invoice_id: draft.id || null,
        recipient_kind:draft.recipient_kind,
        recipient_user_id:draft.recipient_kind==='student' ? draft.recipient_user_id || null : null,
        recipient_name:draft.recipient_name.trim(),
        recipient_address:draft.recipient_address.trim() || null,
        recipient_phone:draft.recipient_phone.trim() || null,
        class_id:draft.class_id || null,
        class_name:draft.class_name_snapshot.trim() || null,
        invoice_code:draft.invoice_code.trim().toUpperCase(),
        invoice_date:draft.invoice_date,
        due_date:draft.due_date,
        pricing_mode:draft.pricing_mode,
        item_label:draft.item_label.trim(),
        quantity,
        unit_price:Math.trunc(draft.unit_price),
        subtotal,
        additional_amount:Math.trunc(draft.additional_amount),
        total_amount:total,
        total_sessions:totalSessions,
        total_minutes:totalMinutes,
        auto_sessions:draft.pricing_mode==='hourly',
        session_start:draft.sessions.map(s=>s.session_date).sort()[0] || null,
        session_end:draft.sessions.map(s=>s.session_date).sort().slice(-1)[0] || null,
        notes:draft.notes.trim() || null,
        payment_method_ids:(setup?.payment_methods ?? []).filter(m=>m.is_active !== false).map(m=>m.id).filter(Boolean),
        sessions:draft.sessions.map((s,index)=>({...s,sort_order:index})),
      });
      const saved = await getInvoiceDetail(id);
      setMessage('Draft invoice tersimpan.');
      setDraft(current=>({...current,id,sessions:saved.sessions.length ? saved.sessions : current.sessions}));
      await load();
    } catch (error) {
      console.error('KOJAC save invoice failed',error);
      setMessage(error instanceof Error ? error.message : 'Draft belum dapat disimpan.');
    } finally { setBusy(false); }
  }

  async function issue(row: InvoiceRow) {
    if (!confirm('Terbitkan invoice ini? Nomor invoice akan menjadi permanen.')) return;
    setBusy(true);
    try { await issueManagementInvoice(row.id); setMessage('Invoice berhasil diterbitkan.'); await load(); }
    catch(error){ console.error(error); setMessage('Invoice belum dapat diterbitkan.'); }
    finally{ setBusy(false); }
  }

  async function payment(row: InvoiceRow) {
    const outstanding=Math.max(0,row.total_amount-row.paid_amount);
    const amountText=prompt('Nominal pembayaran',String(outstanding));
    if(amountText===null) return;
    const amount=Number(amountText.replace(/[^\d]/g,''));
    if(!Number.isFinite(amount)||amount<=0) return setMessage('Nominal pembayaran tidak valid.');
    if(amount>outstanding) return setMessage('Nominal pembayaran melebihi sisa tagihan.');
    const method=prompt('Metode pembayaran','Bank BSI');
    if(!method) return;
    const reference=prompt('Referensi transfer (opsional)','') ?? '';
    setBusy(true);
    try {
      await recordInvoicePayment({invoiceId:row.id,amount,paymentDate:today(),paymentMethod:method,referenceNumber:reference});
      setMessage('Pembayaran berhasil dicatat.'); await load();
    } catch(error){ console.error(error); setMessage('Pembayaran belum dapat dicatat.'); }
    finally{ setBusy(false); }
  }

  async function voidInvoice(row: InvoiceRow) {
    const reason=prompt('Alasan pembatalan invoice');
    if(!reason?.trim()) return;
    if(!confirm('Batalkan invoice ini? Tindakan ini akan tercatat pada audit trail.')) return;
    setBusy(true);
    try { await voidManagementInvoice(row.id,reason); setMessage('Invoice dibatalkan.'); await load(); }
    catch(error){ console.error(error); setMessage('Invoice belum dapat dibatalkan.'); }
    finally{ setBusy(false); }
  }

  const summary=overview?.summary ?? {total_invoices:0,total_amount:0,paid_amount:0,outstanding_amount:0,overdue_count:0};

  return <div className="page invoice-page">
    <header className="invoice-header">
      <div><p className="eyebrow">MANAJEMEN KOJAC</p><h1>Invoice Pembayaran</h1><p>Kelola tagihan siswa/lembaga, pembayaran, dan PDF invoice resmi.</p></div>
      <button className="invoice-btn primary" onClick={openNew}><FilePlus2 size={16}/> Buat Invoice</button>
    </header>

    <section className="invoice-detail-grid management">
      <article className="invoice-card"><span>Invoice</span><strong>{summary.total_invoices}</strong></article>
      <article className="invoice-card"><span>Total Tagihan</span><strong>{rupiah(summary.total_amount)}</strong></article>
      <article className="invoice-card"><span>Terbayar</span><strong>{rupiah(summary.paid_amount)}</strong></article>
      <article className="invoice-card"><span>Sisa</span><strong>{rupiah(summary.outstanding_amount)}</strong></article>
      <article className="invoice-card"><span>Jatuh Tempo</span><strong>{summary.overdue_count}</strong></article>
    </section>

    <section className="invoice-toolbar">
      <label><span>Bulan</span><input type="month" value={month.slice(0,7)} onChange={e=>setMonth(e.target.value+'-01')}/></label>
      <label className="invoice-search"><Search size={15}/><input placeholder="Cari invoice / penerima / kelas" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <button className="invoice-btn secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </section>

    {message && <div className="invoice-notice">{message}</div>}

    <section className="invoice-list">
      {loading ? <div className="invoice-state">Memuat invoice…</div> :
       rows.length===0 ? <div className="invoice-state"><FileText size={30}/><strong>Belum ada invoice pada periode ini.</strong></div> :
       rows.map(row=><article key={row.id} className="invoice-list-row management">
         <button className="invoice-row-main" onClick={()=>navigate('/invoice/'+row.id)}>
           <div><strong>{row.invoice_number||'Draft Invoice'}</strong><span>{row.recipient_name} · {row.class_name_snapshot||row.item_label}</span></div>
           <div><span>Jatuh tempo</span><strong>{dateId(row.due_date)}</strong></div>
           <div><span>Total</span><strong>{rupiah(row.total_amount)}</strong></div>
           <div><span className={"invoice-status is-"+row.status}>{statusLabel(row.status)}</span></div>
         </button>
         <div className="invoice-row-actions">
           {row.status==='draft' && <button disabled={busy} onClick={()=>void editDraft(row)}><FileText size={14}/> Edit</button>}
           {row.status==='draft' && <button disabled={busy} onClick={()=>void issue(row)}><CheckCircle2 size={14}/> Terbitkan</button>}
           {!['draft','paid','void'].includes(row.status) && <button disabled={busy} onClick={()=>void payment(row)}><CircleDollarSign size={14}/> Bayar</button>}
           {!['paid','void'].includes(row.status) && row.paid_amount<=0 && <button disabled={busy} className="danger" onClick={()=>void voidInvoice(row)}><Ban size={14}/> Void</button>}
         </div>
       </article>)}
    </section>

    {formOpen && <div className="invoice-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setFormOpen(false)}}>
      <section className="invoice-modal" role="dialog" aria-modal="true" aria-label="Buat Invoice">
        <header><div><p className="eyebrow">DRAFT INVOICE</p><h2>Buat / Edit Invoice</h2></div><button onClick={()=>setFormOpen(false)}>×</button></header>
        <div className="invoice-form-grid">
          <label><span>Penerima</span><select value={draft.recipient_kind} onChange={e=>setDraft(c=>({...c,recipient_kind:e.target.value as RecipientKind}))}><option value="student">Siswa</option><option value="institution">Lembaga</option></select></label>
          {draft.recipient_kind==='student' && <label><span>Pilih Siswa</span><select value={draft.recipient_user_id} onChange={e=>selectStudent(e.target.value)}><option value="">Pilih siswa</option>{(setup?.students??[]).map(s=><option key={s.user_id} value={s.user_id}>{s.name}</option>)}</select></label>}
          <label><span>Nama Penerima</span><input value={draft.recipient_name} onChange={e=>setDraft(c=>({...c,recipient_name:e.target.value}))}/></label>
          <label><span>No. HP</span><input value={draft.recipient_phone} onChange={e=>setDraft(c=>({...c,recipient_phone:e.target.value}))}/></label>
          <label className="wide"><span>Alamat</span><textarea value={draft.recipient_address} onChange={e=>setDraft(c=>({...c,recipient_address:e.target.value}))}/></label>
          <label><span>Kelas</span><select value={draft.class_id} onChange={e=>selectClass(e.target.value)}><option value="">Tanpa kelas</option>{(setup?.classes??[]).map(c=><option key={c.id} value={c.id}>{c.name}{c.code?' · '+c.code:''}</option>)}</select></label>
          <label><span>Kode Invoice</span><input value={draft.invoice_code} onChange={e=>setDraft(c=>({...c,invoice_code:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')}))}/></label>
          <label><span>Tanggal Invoice</span><input type="date" value={draft.invoice_date} onChange={e=>setDraft(c=>({...c,invoice_date:e.target.value}))}/></label>
          <label><span>Jatuh Tempo</span><input type="date" value={draft.due_date} onChange={e=>setDraft(c=>({...c,due_date:e.target.value}))}/></label>
          <label><span>Mode Tarif</span><select value={draft.pricing_mode} onChange={e=>setDraft(c=>({...c,pricing_mode:e.target.value as PricingMode,invoice_code:e.target.value==='hourly'?'JPNPRIVAT':'JPNSSW'}))}><option value="hourly">Per Jam</option><option value="per_student">Per Siswa</option></select></label>
          <label><span>Deskripsi</span><input value={draft.item_label} onChange={e=>setDraft(c=>({...c,item_label:e.target.value}))}/></label>
          {draft.pricing_mode==='per_student' && <label><span>Jumlah Siswa</span><input type="number" min="1" value={draft.quantity} onChange={e=>setDraft(c=>({...c,quantity:Number(e.target.value)}))}/></label>}
          <label><span>{draft.pricing_mode==='hourly'?'Biaya / Jam':'Biaya / Siswa'}</span><input type="number" min="0" value={draft.unit_price} onChange={e=>setDraft(c=>({...c,unit_price:Number(e.target.value)}))}/></label>
          <label><span>Tambahan / Lain-lain</span><input type="number" value={draft.additional_amount} onChange={e=>setDraft(c=>({...c,additional_amount:Number(e.target.value)}))}/></label>
          <label className="wide"><span>Catatan</span><textarea value={draft.notes} onChange={e=>setDraft(c=>({...c,notes:e.target.value}))}/></label>
        </div>

        <div className="invoice-session-editor">
          <div className="invoice-section-title"><div><p className="eyebrow">REKAP SESI</p><h3>Halaman 2</h3></div><button onClick={()=>setDraft(c=>({...c,sessions:[...c.sessions,emptySession()]}))}>+ Tambah Sesi</button></div>
          {draft.pricing_mode==='hourly' && <div className="invoice-notice">Saat disimpan, rekap final diambil otomatis dari Laporan Pembelajaran berstatus approved untuk kelas dan rentang tanggal yang dipilih.</div>}
          {draft.sessions.map((session,index)=><div className="invoice-session-row" key={index}>
            <input type="date" value={session.session_date} onChange={e=>updateSession(index,{session_date:e.target.value})}/>
            <input type="time" value={session.starts_at.slice(0,5)} onChange={e=>updateSession(index,{starts_at:e.target.value})}/>
            <input type="time" value={session.ends_at.slice(0,5)} onChange={e=>updateSession(index,{ends_at:e.target.value})}/>
            <strong>{session.duration_minutes} menit</strong>
            <button onClick={()=>setDraft(c=>({...c,sessions:c.sessions.filter((_,i)=>i!==index)}))} disabled={draft.sessions.length<=1}>Hapus</button>
          </div>)}
        </div>

        <div className="invoice-form-summary">
          <div><span>Sesi</span><strong>{totalSessions}</strong></div>
          <div><span>Total Jam</span><strong>{(totalMinutes/60).toFixed(2)}</strong></div>
          <div><span>Subtotal</span><strong>{rupiah(subtotal)}</strong></div>
          <div><span>Total</span><strong>{rupiah(total)}</strong></div>
        </div>

        <footer><button className="invoice-btn secondary" onClick={()=>setFormOpen(false)}>Tutup</button><button className="invoice-btn primary" disabled={busy} onClick={()=>void saveDraft()}><Save size={15}/> {busy?'Menyimpan…':'Simpan Draft'}</button></footer>
      </section>
    </div>}
  </div>;
}
