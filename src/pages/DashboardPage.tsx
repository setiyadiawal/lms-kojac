import { BookOpenCheck, Flame, Goal, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHiragana } from '../features/hiragana/useHiragana';
import { useAuth } from '../state/AuthContext';

export function DashboardPage() {
  const { profile } = useAuth();
  const { stats, loading } = useHiragana();
  return <div className="page">
    <div className="page-header"><div><p className="eyebrow">おかえりなさい</p><h1>Halo, {profile?.full_name?.split(' ')[0] || 'Siswa'} 👋</h1><p>Teruskan perjalanan bahasa Jepangmu hari ini.</p></div><span className="level-badge">Target · JLPT N4</span></div>
    <div className="stats-grid">
      <Stat icon={<Flame/>} value="0 hari" label="Streak belajar" />
      <Stat icon={<BookOpenCheck/>} value={loading ? '…' : `${stats.mastered}/${stats.total}`} label="Hiragana dikuasai" />
      <Stat icon={<Goal/>} value={loading ? '…' : `${stats.averageMastery}%`} label="Mastery Hiragana" />
      <Stat icon={<Trophy/>} value="0" label="Achievement" />
    </div>
    <div className="dashboard-grid">
      <section className="panel"><p className="eyebrow">ROADMAP</p><h2>Jalur belajar KOJAC</h2><div className="roadmap">{['Huruf Jepang','JLPT N5','JLPT N4','JLPT N3','JLPT N2','JLPT N1'].map((x,i)=><div className={`road-step ${i===0?'current':''}`} key={x}><span>{i+1}</span><div><strong>{x}</strong><small>{i===0?'Hiragana sedang aktif':'Terkunci sampai prasyarat selesai'}</small></div></div>)}</div></section>
      <section className="panel accent"><p className="eyebrow">MILESTONE 2A</p><h2>Hiragana sudah aktif</h2><p>Progress pada panel ini berasal langsung dari review dan quiz siswa di Supabase.</p><ul><li>46 Hiragana dasar</li><li>Dakuten & Handakuten</li><li>33 kombinasi Yōon</li><li>Flashcard + SRS atomik</li><li>Quiz + mastery nyata</li></ul><Link className="accent-link" to="/belajar/hiragana">Mulai Hiragana →</Link></section>
    </div>
  </div>;
}
function Stat({icon,value,label}:{icon:React.ReactNode;value:string;label:string}){return <div className="stat"><div className="stat-icon">{icon}</div><div><strong>{value}</strong><span>{label}</span></div></div>}
