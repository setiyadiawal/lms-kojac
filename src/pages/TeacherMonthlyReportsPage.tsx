import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, FileText } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';
import '../teacher-monthly-report.css';

const TEACHING_ROLES=new Set<AppRole>(['pengajar','administrator','manager','co_founder','founder']);
type Row={monthly_report_id:string;period_start:string;period_end:string;report_number:string|null;finalized_at:string|null};
function fmt(v:string){const d=new Date(`${v}T00:00:00+07:00`);return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);}

export function TeacherMonthlyReportsPage(){
  const {role,loading:authLoading}=useAuth();
  const canTeach=Boolean(role&&TEACHING_ROLES.has(role));
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    const {data,error:e}=await supabase.rpc('get_my_teacher_monthly_reports');
    if(e){console.error(e);setError('Laporan bulanan belum dapat dimuat.');}
    else setRows((data??[]) as Row[]);
    setLoading(false);
  },[]);
  useEffect(()=>{if(!authLoading&&canTeach)void load();},[authLoading,canTeach,load]);

  if(authLoading)return <div className="full-center">Memuat KOJAC LMS…</div>;
  if(!canTeach)return <Navigate to="/" replace/>;

  return <div className="page monthly-report-page">
    <header className="monthly-report-header"><div><p className="eyebrow">PENGAJAR KOJAC</p><h1><FileText size={29}/> Laporan Bulanan Saya</h1><p>Laporan bulanan yang sudah difinalkan oleh Manajemen KOJAC.</p></div></header>
    {error&&<div className="monthly-notice">{error}</div>}
    {loading?<div className="monthly-empty">Memuat laporan…</div>:rows.length===0?<div className="monthly-empty"><FileText size={28}/><h3>Belum ada laporan bulanan final.</h3></div>:<div className="teacher-monthly-list">
      {rows.map(r=><article key={r.monthly_report_id}>
        <div className="teacher-monthly-period"><CalendarDays size={19}/><div><strong>{fmt(r.period_start)} – {fmt(r.period_end)}</strong><span>{r.report_number||'Nomor belum tersedia'}</span></div></div>
        <Link className="monthly-primary" target="_blank" to={`/laporan-pengajar-bulanan/${r.monthly_report_id}`}><FileText size={15}/> Lihat Laporan</Link>
      </article>)}
    </div>}
  </div>;
}
