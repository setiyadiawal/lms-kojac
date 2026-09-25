import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import '../teacher-monthly-report-print.css';

type Detail={
  monthly_report_id:string;teacher_id:string;period_start:string;period_end:string;status:string;
  report_number:string|null;management_notes:string|null;generated_at:string;finalized_at:string|null;
  snapshot:{
    teacher:{teacher_id:string;teacher_name:string;team_name:string|null;domicile:string|null;phone:string|null};
    summary:{report_count:number;approved_count:number;submitted_count:number;revision_count:number;class_count:number;approved_minutes:number};
    live_summary:{live_session_count:number;ended_live_sessions:number;student_attendance_records:number;unique_students_seen:number;late_records:number;total_student_seconds:number};
    classes:Array<{class_id:string;class_name:string;class_code:string|null;report_count:number;approved_count:number;submitted_count:number;revision_count:number;approved_minutes:number}>;
    reports:Array<{report_id:string;class_name:string;report_date:string;starts_at:string;ends_at:string;duration_minutes:number;material_summary:string;assignment_summary:string;next_plan:string;evaluation_notes:string|null;review_status:string}>;
    payroll:null|{status:string;net_amount:number;total_sessions:number;total_minutes:number;slip_number:string|null;paid_on:string|null};
  };
};

const rupiah=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
function fmt(v:string){const d=new Date(`${v}T00:00:00+07:00`);return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);}
function dur(m:number){const h=Math.floor((m||0)/60),r=(m||0)%60;return h?(r?`${h} jam ${r} menit`:`${h} jam`):`${r} menit`;}

function CornerOrnaments(){
  return <>
    <img className="monthly-rework-corner monthly-rework-corner-tl" src="/brand/receipt-corner-top-left.png" alt="" aria-hidden="true"/>
    <img className="monthly-rework-corner monthly-rework-corner-br" src="/brand/receipt-corner-bottom-right.png" alt="" aria-hidden="true"/>
  </>;
}

function ReportHeader({title,number}:{title:string;number:string|null}){
  return <header className="monthly-rework-header">
    <div className="monthly-rework-brand">
      <img src="/brand/kojac-wordmark.png" alt="KOJAC"/>
    </div>
    <div className="monthly-rework-title">
      <h1>{title}</h1>
      <div className="monthly-rework-doc-number">
        <span>No. Dokumen</span>
        <strong>{number||'DRAFT'}</strong>
      </div>
    </div>
  </header>;
}

function ReportFooter(){
  return <footer className="monthly-rework-footer">
    <span>空白オンライン日本語クラス</span>
    <strong>Kuuhaku Online Japanese Class</strong>
    <small>一緒に一生懸命勉強しましょう！</small>
  </footer>;
}

export function TeacherMonthlyReportPrintPage(){
  const {reportId}=useParams();
  const {loading:authLoading}=useAuth();
  const [detail,setDetail]=useState<Detail|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!reportId)return;
    let active=true;
    void supabase.rpc('get_teacher_monthly_report_detail',{p_monthly_report_id:reportId}).then(({data,error:e})=>{
      if(!active)return;
      if(e){console.error(e);setError('Laporan bulanan tidak dapat dimuat.');}
      else setDetail(data as Detail);
      setLoading(false);
    });
    return()=>{active=false;};
  },[reportId]);

  if(authLoading||loading)return <div className="full-center">Memuat laporan…</div>;
  if(!reportId)return <Navigate to="/" replace/>;
  if(error||!detail)return <div className="full-center">{error||'Laporan tidak ditemukan.'}</div>;

  const s=detail.snapshot;
  return <div className="monthly-print-screen monthly-rework-screen">
    <div className="monthly-print-toolbar">
      <Link to="/"><ArrowLeft size={15}/> Kembali</Link>
      <button onClick={()=>window.print()}><Printer size={15}/> Cetak / Simpan PDF</button>
    </div>

    <main className="monthly-print-doc monthly-rework-doc">
      <section className="monthly-print-page monthly-rework-page monthly-rework-summary-page">
        <CornerOrnaments/>
        <div className="monthly-rework-watermark" aria-hidden="true"/>

        <ReportHeader title="LAPORAN BULANAN PENGAJAR" number={detail.report_number}/>

        <section className="monthly-rework-identity" aria-label="Identitas pengajar">
          <div><span>Nama</span><strong>{s.teacher.teacher_name}</strong></div>
          <div><span>Periode</span><strong>{fmt(detail.period_start)} – {fmt(detail.period_end)}</strong></div>
          <div><span>Team</span><strong>{s.teacher.team_name||'Pengajar KOJAC'}</strong></div>
          <div><span>Status</span><strong className={`monthly-rework-status ${detail.status}`}>{detail.status==='finalized'?'Final':'Draft'}</strong></div>
        </section>

        <section className="monthly-rework-section">
          <h2>RINGKASAN</h2>
          <table className="monthly-rework-table monthly-rework-summary-table"><tbody>
            <tr><td>Total Laporan</td><td>{s.summary.report_count}</td><td>Approved</td><td>{s.summary.approved_count}</td></tr>
            <tr><td>Jumlah Kelas</td><td>{s.summary.class_count}</td><td>Durasi Mengajar Approved</td><td>{dur(s.summary.approved_minutes)}</td></tr>
            <tr><td>Live Session</td><td>{s.live_summary.live_session_count}</td><td>Siswa Terdeteksi Live</td><td>{s.live_summary.unique_students_seen}</td></tr>
            <tr><td>Catatan Terlambat</td><td>{s.live_summary.late_records}</td><td>Menunggu/Revisi</td><td>{s.summary.submitted_count+s.summary.revision_count}</td></tr>
          </tbody></table>
        </section>

        <section className="monthly-rework-section">
          <h2>REKAP PER KELAS</h2>
          <table className="monthly-rework-table monthly-rework-class-table">
            <thead><tr><th>Kelas</th><th>Laporan</th><th>Approved</th><th>Durasi</th></tr></thead>
            <tbody>{s.classes.map(c=><tr key={c.class_id}><td><strong>{c.class_name}</strong>{c.class_code?<small>{c.class_code}</small>:null}</td><td>{c.report_count}</td><td>{c.approved_count}</td><td>{dur(c.approved_minutes)}</td></tr>)}</tbody>
          </table>
        </section>

        {s.payroll&&<section className="monthly-rework-section">
          <h2>RINGKASAN HONOR</h2>
          <table className="monthly-rework-table monthly-rework-honor-table"><tbody>
            <tr><td>Status Payroll</td><td>{s.payroll.status}</td><td>No. Slip</td><td>{s.payroll.slip_number||'—'}</td></tr>
            <tr><td>Sesi Dibayar</td><td>{s.payroll.total_sessions}</td><td>Honor Bersih</td><td>{rupiah.format(s.payroll.net_amount)}</td></tr>
          </tbody></table>
        </section>}

        <section className="monthly-rework-section monthly-rework-notes-section">
          <h2>CATATAN MANAJEMEN</h2>
          <div className="monthly-rework-notes">{detail.management_notes||'Tidak ada catatan tambahan.'}</div>
        </section>

        <ReportFooter/>
      </section>

      <section className="monthly-print-page monthly-rework-page monthly-rework-sessions-page">
        <CornerOrnaments/>
        <div className="monthly-rework-watermark" aria-hidden="true"/>
        <ReportHeader title="DETAIL KEGIATAN MENGAJAR" number={detail.report_number}/>

        <section className="monthly-rework-section monthly-rework-session-section">
          <h2>REKAP DETAIL KEGIATAN</h2>
          <table className="monthly-rework-table monthly-rework-session-table">
            <thead><tr><th>Tanggal</th><th>Kelas / Waktu</th><th>Materi</th><th>Evaluasi</th></tr></thead>
            <tbody>{s.reports.map(r=><tr key={r.report_id}>
              <td>{fmt(r.report_date)}</td>
              <td><strong>{r.class_name}</strong><small>{r.starts_at.slice(0,5)}–{r.ends_at.slice(0,5)} · {dur(r.duration_minutes)}</small></td>
              <td>{r.material_summary}</td>
              <td>{r.evaluation_notes||'—'}</td>
            </tr>)}</tbody>
          </table>
        </section>

        <ReportFooter/>
      </section>
    </main>
  </div>;
}
