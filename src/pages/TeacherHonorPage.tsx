import { useCallback, useEffect, useState } from 'react';
import { Banknote, CalendarDays, FileText, ReceiptText } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';
import '../teacher-honor-system.css';

const TEACHING_ROLES=new Set<AppRole>(['pengajar','administrator','manager','co_founder','founder']);
const rupiah=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
function fdate(v:string|null){if(!v)return '—';const d=new Date(`${v}T00:00:00+07:00`);return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);}
function dur(m:number){const h=Math.floor(m/60),r=m%60;return h?(r?`${h} jam ${r} menit`:`${h} jam`):`${r} menit`;}
type Row={payroll_id:string;period_start:string;period_end:string;status:'finalized'|'paid';base_amount:number;additions_amount:number;deductions_amount:number;net_amount:number;total_sessions:number;total_minutes:number;paid_on:string|null};

export function TeacherHonorPage(){
 const {role,loading:authLoading}=useAuth();const canTeach=Boolean(role&&TEACHING_ROLES.has(role));const [rows,setRows]=useState<Row[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');const {data,error:e}=await supabase.rpc('get_my_teacher_payrolls');if(e){console.error(e);setError('Riwayat honor belum dapat dimuat.');setRows([]);}else setRows((data||[]) as Row[]);setLoading(false);},[]);
 useEffect(()=>{if(!authLoading&&canTeach)void load();},[authLoading,canTeach,load]);
 if(authLoading)return <div className="full-center">Memuat KOJAC LMS…</div>;if(!canTeach)return <Navigate to="/" replace/>;
 return <div className="page honor-system-page"><header className="honor-system-header"><div><p className="eyebrow">PENGAJAR KOJAC</p><h1><Banknote/> Honor Saya</h1><p>Riwayat honor bulanan yang sudah difinalkan oleh Manajemen KOJAC.</p></div></header>{error&&<div className="honor-notice is-error">{error}</div>}{loading?<div className="honor-loading">Memuat riwayat honor…</div>:rows.length===0?<div className="honor-empty-panel"><ReceiptText size={30}/><h3>Belum ada slip honor.</h3><p>Slip muncul setelah honor difinalkan oleh manajemen.</p></div>:<div className="teacher-honor-list">{rows.map(r=><article key={r.payroll_id}><div className="teacher-honor-period"><CalendarDays size={20}/><div><strong>{fdate(r.period_start)} – {fdate(r.period_end)}</strong><span>{r.total_sessions} sesi · {dur(r.total_minutes)}</span></div></div><div className="teacher-honor-money"><span>Honor Bersih</span><strong>{rupiah.format(r.net_amount)}</strong><small>{r.status==='paid'?`Dibayar ${fdate(r.paid_on)}`:'Sudah difinalkan'}</small></div><Link className="honor-primary" target="_blank" to={`/honor/slip/${r.payroll_id}`}><FileText size={14}/> Lihat Slip</Link></article>)}</div>}</div>;
}
