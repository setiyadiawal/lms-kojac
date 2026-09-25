import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Printer,
  RefreshCw,
  Save,
  Users,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';
import '../teacher-monthly-report.css';

const MANAGEMENT_ROLES=new Set<AppRole>(['administrator','manager','co_founder','founder']);

type TeacherRow={
  teacher_id:string;
  teacher_name:string;
  approved_count:number;
  approved_minutes:number;
  payroll_id:string|null;
  payroll_status:string|null;
  net_amount:number|null;
};

type Overview={rows:TeacherRow[]};

type MonthlyPayload={
  teacher:{teacher_id:string;teacher_name:string;team_name:string|null;domicile:string|null;phone:string|null};
  period_start:string;
  period_end:string;
  summary:{report_count:number;approved_count:number;submitted_count:number;revision_count:number;class_count:number;approved_minutes:number};
  live_summary:{live_session_count:number;ended_live_sessions:number;student_attendance_records:number;unique_students_seen:number;late_records:number;total_student_seconds:number};
  classes:Array<{class_id:string;class_name:string;class_code:string|null;report_count:number;approved_count:number;submitted_count:number;revision_count:number;approved_minutes:number}>;
  reports:Array<{report_id:string;class_id:string;class_name:string;class_code:string|null;teacher_name:string;report_date:string;starts_at:string;ends_at:string;duration_minutes:number;material_summary:string;assignment_summary:string;next_plan:string;evaluation_notes:string|null;review_status:'submitted'|'approved'|'revision';review_note:string|null;reviewed_at:string|null}>;
  payroll:null|{payroll_id:string;status:string;base_amount:number;additions_amount:number;deductions_amount:number;net_amount:number;total_sessions:number;total_minutes:number;slip_number:string|null;paid_on:string|null};
  saved_report:null|{monthly_report_id:string;status:'draft'|'finalized';report_number:string|null;management_notes:string|null;generated_at:string;finalized_at:string|null};
};

const rupiah=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
function monthNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function fmtDate(v:string){const d=new Date(`${v}T00:00:00+07:00`);return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);}
function duration(m:number){const h=Math.floor((m||0)/60),r=(m||0)%60;return h?(r?`${h} jam ${r} menit`:`${h} jam`):`${r} menit`;}
function statusLabel(s:string){if(s==='approved')return 'Approved';if(s==='revision')return 'Perlu Revisi';return 'Menunggu Review';}

export function ManagementTeacherMonthlyReportPage(){
  const {role,loading:authLoading}=useAuth();
  const canManage=Boolean(role&&MANAGEMENT_ROLES.has(role));
  const [month,setMonth]=useState(monthNow);
  const [teachers,setTeachers]=useState<TeacherRow[]>([]);
  const [teacherId,setTeacherId]=useState('');
  const [payload,setPayload]=useState<MonthlyPayload|null>(null);
  const [notes,setNotes]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const loadTeachers=useCallback(async()=>{
    if(!canManage)return;
    const {data,error}=await supabase.rpc('get_management_honor_overview',{p_month:`${month}-01`});
    if(error){console.error(error);setMessage('Daftar pengajar belum dapat dimuat.');return;}
    const rows=((data as Overview)?.rows??[]);
    setTeachers(rows);
    setTeacherId(current=>current&&rows.some(x=>x.teacher_id===current)?current:(rows[0]?.teacher_id??''));
  },[canManage,month]);

  const loadReport=useCallback(async()=>{
    if(!teacherId)return;
    setLoading(true);setMessage('');
    const {data,error}=await supabase.rpc('get_management_teacher_monthly_report',{
      p_teacher_id:teacherId,p_month:`${month}-01`,
    });
    if(error){console.error(error);setMessage('Laporan bulanan belum dapat dimuat.');setPayload(null);}
    else{
      const next=data as MonthlyPayload;
      setPayload(next);
      setNotes(next.saved_report?.management_notes??'');
    }
    setLoading(false);
  },[teacherId,month]);

  useEffect(()=>{if(!authLoading&&canManage)void loadTeachers();},[authLoading,canManage,loadTeachers]);
  useEffect(()=>{if(teacherId)void loadReport();},[teacherId,loadReport]);

  async function saveDraft(){
    if(!teacherId)return;
    setBusy(true);setMessage('');
    const {data,error}=await supabase.rpc('save_management_teacher_monthly_report',{
      p_teacher_id:teacherId,p_month:`${month}-01`,p_management_notes:notes.trim()||null,
    });
    setBusy(false);
    if(error){console.error(error);setMessage('Draft laporan bulanan belum tersimpan.');return;}
    setMessage(`Draft tersimpan.`);
    await loadReport();
    return data as string;
  }

  async function finalize(){
    if(!payload)return;
    let reportId=payload.saved_report?.monthly_report_id??null;
    if(!reportId)reportId=await saveDraft()??null;
    if(!reportId)return;
    if(!window.confirm('Finalkan laporan bulanan? Snapshot dan nomor laporan resmi akan dikunci.'))return;
    setBusy(true);setMessage('');
    const {data,error}=await supabase.rpc('finalize_management_teacher_monthly_report',{p_monthly_report_id:reportId});
    setBusy(false);
    if(error){console.error(error);setMessage('Laporan bulanan belum dapat difinalkan.');return;}
    setMessage(`Laporan final · ${String(data||'nomor belum tersedia')}`);
    await loadReport();
  }

  if(authLoading)return <div className="full-center">Memuat KOJAC LMS…</div>;
  if(!canManage)return <Navigate to="/" replace/>;

  const p=payload;
  return <div className="page monthly-report-page">
    <header className="monthly-report-header">
      <div><p className="eyebrow">MANAJEMEN KOJAC</p><h1><FileCheck2 size={30}/> Laporan Bulanan Pengajar</h1><p>Rekap resmi aktivitas mengajar, review, kelas, kehadiran live, dan honor per periode.</p></div>
      <div className="monthly-report-filters">
        <label><span>Periode</span><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>
        <label><span>Pengajar</span><select value={teacherId} onChange={e=>setTeacherId(e.target.value)}>{teachers.map(t=><option key={t.teacher_id} value={t.teacher_id}>{t.teacher_name}</option>)}</select></label>
      </div>
    </header>

    {message&&<div className="monthly-notice">{message}</div>}
    {loading||!p?<div className="monthly-empty">Memuat laporan bulanan…</div>:<>
      <section className="monthly-summary">
        <article><FileText/><strong>{p.summary.approved_count}</strong><span>Laporan Approved</span></article>
        <article><Clock3/><strong>{duration(p.summary.approved_minutes)}</strong><span>Durasi Mengajar</span></article>
        <article><CalendarDays/><strong>{p.summary.class_count}</strong><span>Kelas</span></article>
        <article><Users/><strong>{p.live_summary.unique_students_seen}</strong><span>Siswa Terdeteksi Live</span></article>
      </section>

      <section className="monthly-report-card">
        <div className="monthly-card-heading">
          <div><p className="eyebrow">IDENTITAS</p><h2>{p.teacher.teacher_name}</h2><span>{p.teacher.team_name||'Pengajar KOJAC'} · {fmtDate(p.period_start)} – {fmtDate(p.period_end)}</span></div>
          <div className="monthly-status-stack">
            <span className={`monthly-status is-${p.saved_report?.status??'none'}`}>
              {p.saved_report?.status==='finalized'?'Final':p.saved_report?.status==='draft'?'Draft':'Belum disimpan'}
            </span>
            {p.saved_report?.report_number&&<strong>{p.saved_report.report_number}</strong>}
          </div>
        </div>

        <div className="monthly-metrics-grid">
          <div><span>Total Laporan</span><strong>{p.summary.report_count}</strong></div>
          <div><span>Menunggu Review</span><strong>{p.summary.submitted_count}</strong></div>
          <div><span>Perlu Revisi</span><strong>{p.summary.revision_count}</strong></div>
          <div><span>Live Session</span><strong>{p.live_summary.live_session_count}</strong></div>
          <div><span>Catatan Kehadiran</span><strong>{p.live_summary.student_attendance_records}</strong></div>
          <div><span>Terlambat</span><strong>{p.live_summary.late_records}</strong></div>
        </div>
      </section>

      <section className="monthly-report-card">
        <div className="monthly-card-heading"><div><p className="eyebrow">KELAS</p><h2>Rekap per Kelas</h2></div></div>
        <div className="monthly-table-scroll"><table className="monthly-table">
          <thead><tr><th>Kelas</th><th>Laporan</th><th>Approved</th><th>Review</th><th>Revisi</th><th>Durasi</th></tr></thead>
          <tbody>{p.classes.map(c=><tr key={c.class_id}><td><strong>{c.class_name}</strong><small>{c.class_code||''}</small></td><td>{c.report_count}</td><td>{c.approved_count}</td><td>{c.submitted_count}</td><td>{c.revision_count}</td><td>{duration(c.approved_minutes)}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="monthly-report-card">
        <div className="monthly-card-heading"><div><p className="eyebrow">PERTEMUAN</p><h2>Detail Laporan</h2></div><span>{p.reports.length} laporan</span></div>
        <div className="monthly-session-list">
          {p.reports.map(r=><article key={r.report_id}>
            <header><div><strong>{fmtDate(r.report_date)} · {r.class_name}</strong><span>{r.starts_at.slice(0,5)}–{r.ends_at.slice(0,5)} · {duration(r.duration_minutes)}</span></div><span className={`monthly-review is-${r.review_status}`}>{statusLabel(r.review_status)}</span></header>
            <div className="monthly-session-grid">
              <div><span>Materi</span><p>{r.material_summary}</p></div>
              <div><span>Tugas</span><p>{r.assignment_summary}</p></div>
              <div><span>Rencana Berikutnya</span><p>{r.next_plan}</p></div>
              <div><span>Evaluasi</span><p>{r.evaluation_notes||'—'}</p></div>
            </div>
          </article>)}
        </div>
      </section>

      <section className="monthly-report-card">
        <div className="monthly-card-heading"><div><p className="eyebrow">HONOR</p><h2>Ringkasan Pembayaran</h2></div></div>
        {p.payroll?<div className="monthly-payroll-grid">
          <div><span>Status</span><strong>{p.payroll.status}</strong></div>
          <div><span>Sesi Dibayar</span><strong>{p.payroll.total_sessions}</strong></div>
          <div><span>Durasi Payroll</span><strong>{duration(p.payroll.total_minutes)}</strong></div>
          <div><span>Honor Bersih</span><strong>{rupiah.format(p.payroll.net_amount)}</strong></div>
          <div><span>No. Slip</span><strong>{p.payroll.slip_number||'—'}</strong></div>
        </div>:<div className="monthly-empty is-small">Payroll periode ini belum tersedia.</div>}
      </section>

      <section className="monthly-report-card">
        <div className="monthly-card-heading"><div><p className="eyebrow">CATATAN</p><h2>Catatan Manajemen</h2></div></div>
        <textarea rows={5} value={notes} disabled={p.saved_report?.status==='finalized'} onChange={e=>setNotes(e.target.value)} placeholder="Evaluasi bulanan, tindak lanjut, catatan kualitas pengajaran, atau informasi administratif."/>
        <div className="monthly-actions">
          {p.saved_report?.monthly_report_id&&<Link className="monthly-secondary" target="_blank" to={`/laporan-pengajar-bulanan/${p.saved_report.monthly_report_id}`}><Printer size={15}/> Preview / Cetak</Link>}
          {p.saved_report?.status!=='finalized'&&<button className="monthly-secondary" disabled={busy} onClick={()=>void saveDraft()}><Save size={15}/> Simpan Draft</button>}
          {p.saved_report?.status!=='finalized'&&<button className="monthly-primary" disabled={busy} onClick={()=>void finalize()}><CheckCircle2 size={15}/> Finalkan Laporan</button>}
          <button className="monthly-secondary" disabled={busy} onClick={()=>void loadReport()}><RefreshCw size={15}/> Refresh Data</button>
        </div>
      </section>
    </>}
  </div>;
}
