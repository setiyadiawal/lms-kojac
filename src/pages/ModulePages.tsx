import { BookOpen, ChartNoAxesCombined, ClipboardCheck, GraduationCap, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const cards = [
  { title: 'Hiragana', desc: '104 karakter: dasar, dakuten, handakuten, dan yōon.', href: '/belajar/hiragana', active: true },
  { title: 'Katakana', desc: '104 karakter: dasar, dakuten, handakuten, dan yōon.', href: '/belajar/katakana', active: true },
  { title: 'Kosakata', desc: 'Kosakata per bab dengan pencarian dan fondasi untuk Flashcard, Quiz, serta SRS.', href: '/belajar/kosakata', active: true },
  { title: 'Kanji', desc: 'Kanji JLPT N5–N1 dengan arti, Onyomi, Kunyomi, contoh kosakata, dan latihan bertahap.', href: '/belajar/kanji', active: true },
  { title: 'Tata Bahasa', desc: '文法 berbasis Bab KOJAC dengan rumus, penjelasan, contoh kalimat, dan audio.', href: '/belajar/tata-bahasa', active: true },
  { title: 'Reading / 読解', desc: 'Dokkai berbasis Bab KOJAC untuk menggabungkan Vocabulary, Kanji, dan Grammar dalam bacaan nyata.', href: '/belajar/reading', active: true },
  { title: 'Listening / 聴解', desc: 'Choukai berbasis Bab KOJAC untuk melatih pemahaman melalui dialog, pengumuman, dan situasi lisan.', href: '/belajar/listening', active: true },
];

export function LearningPage(){return <Simple title="Belajar" icon={<BookOpen/>} intro="Pusat materi KOJAC dari dasar hingga JLPT N1."><div className="module-grid">{cards.map((card)=><div className={`module-card ${card.active ? 'module-active' : ''}`} key={card.title}><strong>{card.title}</strong><span>{card.desc}</span>{card.active && card.href ? <Link className="module-link" to={card.href}>Mulai belajar</Link> : <button disabled>Segera dibangun</button>}</div>)}</div></Simple>}
export function PracticePage(){return <Simple title="Latihan" icon={<GraduationCap/>} intro="Flashcard dan Quiz Hiragana sudah tersedia dari halaman Belajar → Hiragana. Bank soal lintas materi akan berada di sini."/>}
export function ExamPage(){return <Simple title="Simulasi JLPT" icon={<Trophy/>} intro="Simulasi N5–N1 dengan timer, scoring, dan riwayat ujian."/>}
export function ProgressPage(){return <Simple title="Progres" icon={<ChartNoAxesCombined/>} intro="Progress Hiragana kini sudah disimpan nyata di database. Dashboard progres lintas modul akan dibangun bertahap."/>}
function Simple({title,icon,intro,children}:{title:string;icon:React.ReactNode;intro:string;children?:React.ReactNode}){return <div className="page"><div className="page-header"><div><p className="eyebrow">KOJAC LMS</p><h1 className="title-icon">{icon}{title}</h1><p>{intro}</p></div></div>{children || <div className="empty-state"><ClipboardCheck size={34}/><h2>Fondasi siap</h2><p>Modul ini akan menjadi milestone lanjutan.</p></div>}</div>}
