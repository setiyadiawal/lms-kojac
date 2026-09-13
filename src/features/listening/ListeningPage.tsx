import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Clock, Headphones, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GRAMMAR_CHAPTERS } from '../grammar/grammarData';
import { ListeningEngine } from './ListeningEngine';
import {
  LISTENING_ITEMS,
  getListeningItem,
  getListeningsByChapter,
  type ListeningKind,
} from './listeningData';
import './listening.css';

const TYPE_LABEL: Record<ListeningKind, string> = {
  dialogue: 'Dialog',
  announcement: 'Pengumuman',
  voicemail: 'Pesan Suara',
  instruction: 'Instruksi',
  conversation: 'Percakapan',
  information: 'Informasi',
  telephone: 'Telepon',
  shopping: 'Belanja',
  school: 'Sekolah',
  workplace: 'Tempat Kerja',
  travel: 'Perjalanan',
};

const LISTENING_CHAPTERS = GRAMMAR_CHAPTERS
  .map((chapter) => ({ ...chapter, items: getListeningsByChapter(chapter.chapter) }))
  .filter((chapter) => chapter.items.length > 0);

export function ListeningPage() {
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedListeningId, setSelectedListeningId] = useState<string | null>(null);

  const selectedListening = selectedListeningId ? getListeningItem(selectedListeningId) : undefined;
  const chapterItems = selectedListening
    ? getListeningsByChapter(selectedListening.chapter)
    : selectedChapter
      ? getListeningsByChapter(selectedChapter)
      : [];
  const chapterInfo = selectedChapter ? LISTENING_CHAPTERS.find((chapter) => chapter.chapter === selectedChapter) : undefined;

  const difficultyCounts = useMemo(() => LISTENING_ITEMS.reduce<Record<string, number>>((acc, item) => {
    acc[item.difficulty] = (acc[item.difficulty] ?? 0) + 1;
    return acc;
  }, {}), []);

  function openChapter(chapter: number) {
    setSelectedListeningId(null);
    setSelectedChapter(chapter);
  }

  function openListening(id: string) {
    const item = getListeningItem(id);
    if (!item) return;
    setSelectedChapter(item.chapter);
    setSelectedListeningId(item.id);
  }

  if (selectedListening) {
    return <div className="listening-page page">
      <div className="listening-breadcrumb">
        <Link to="/belajar"><Headphones size={14} /> Belajar</Link>
        <span>/</span>
        <button type="button" onClick={() => { setSelectedListeningId(null); setSelectedChapter(null); }}>Listening</button>
        <span>/</span>
        <button type="button" onClick={() => setSelectedListeningId(null)}>Bab {selectedListening.chapter}</button>
      </div>

      <ListeningEngine
        key={selectedListening.id}
        listening={selectedListening}
        chapterItems={chapterItems}
        onBackToList={() => setSelectedListeningId(null)}
        onOpenListening={openListening}
      />
    </div>;
  }

  return <div className="listening-page page">
    <div className="listening-breadcrumb">
      <Link to="/belajar"><Headphones size={14} /> Belajar</Link>
      <span>/</span>
      <span>Listening</span>
      {selectedChapter && <><span>/</span><span>Bab {selectedChapter}</span></>}
    </div>

    {!selectedChapter ? <>
      <header className="listening-page-header page-header">
        <div>
          <p className="eyebrow">KOJAC LISTENING · N5 → N4</p>
          <h1><span>聴解</span><small>Listening</small></h1>
          <p>Latih kemampuan memahami bahasa Jepang melalui suara, percakapan, pengumuman, dan situasi nyata berdasarkan materi KOJAC yang sudah dipelajari.</p>
        </div>
        <div className="listening-pilot-badge" aria-label={`${LISTENING_ITEMS.length} latihan Listening aktif`}>
          <strong>{LISTENING_ITEMS.length}</strong>
          <span>Listening Aktif</span>
        </div>
      </header>

      <section className="listening-overview-strip" aria-label="Ringkasan Listening">
        <div><strong>{LISTENING_CHAPTERS.length}</strong><span>Bab</span></div>
        <div><strong>{difficultyCounts.Mudah ?? 0}</strong><span>Mudah</span></div>
        <div><strong>{difficultyCounts.Sedang ?? 0}</strong><span>Sedang</span></div>
        <div><strong>{difficultyCounts.Menantang ?? 0}</strong><span>Menantang</span></div>
      </section>

      <div className="listening-section-heading">
        <div>
          <p className="listening-kicker">CHOUKAI PER BAB</p>
          <h2>Pilih Bab untuk mendengarkan</h2>
          <p>Listening bersifat kumulatif: materi di Bab yang lebih tinggi dapat menggunakan Vocabulary dan Grammar dari Bab sebelumnya.</p>
        </div>
      </div>

      <div className="listening-chapter-grid">
        {LISTENING_CHAPTERS.map((chapter) => {
          const difficulties = [...new Set(chapter.items.map((item) => item.difficulty))];
          return <article className="listening-chapter-card" key={chapter.chapter}>
            <div className="listening-chapter-number"><span>BAB</span><strong>{chapter.chapter}</strong></div>
            <div className="listening-chapter-copy">
              <p>{chapter.items[0]?.jlptLevel ?? 'N5'}</p>
              <h3>{chapter.title}</h3>
              <span>{chapter.description}</span>
              <div className="listening-chapter-meta">
                <strong>{chapter.items.length} Listening</strong>
                <span>{difficulties.join(' · ')}</span>
              </div>
              <div className="listening-chapter-divider" aria-hidden="true" />
            </div>
            <button type="button" onClick={() => openChapter(chapter.chapter)}>Lihat Listening <ChevronRight size={16} /></button>
          </article>;
        })}
      </div>
    </> : <>
      <button className="listening-back-chapters" type="button" onClick={() => setSelectedChapter(null)}><ArrowLeft size={17} /> Semua Bab</button>

      <header className="listening-chapter-header">
        <div className="listening-chapter-number"><span>BAB</span><strong>{selectedChapter}</strong></div>
        <div>
          <p className="listening-kicker">LISTENING BERBASIS KURIKULUM</p>
          <h1>{chapterInfo?.title ?? `Bab ${selectedChapter}`}</h1>
          <p>{chapterInfo?.description}</p>
        </div>
        <div className="listening-chapter-total"><strong>{chapterItems.length}</strong><span>Listening</span></div>
      </header>

      <div className="listening-list-grid">
        {chapterItems.map((item) => <article className="listening-list-card" key={item.id}>
          <div className="listening-list-card-top">
            <div>
              <p>聴解 {item.order} · {TYPE_LABEL[item.type]}</p>
              <h2>{item.title}</h2>
            </div>
            <div className="listening-badges"><span>{item.jlptLevel}</span><span>{item.difficulty}</span></div>
          </div>
          <div className="listening-list-meta">
            <span><Clock size={14} /> ±{item.estimatedDuration} detik</span>
            <span><ListChecks size={15} /> {item.questions.length} pertanyaan</span>
          </div>
          <button type="button" onClick={() => openListening(item.id)}><Headphones size={16} /> Mulai Mendengarkan</button>
        </article>)}
      </div>
    </>}
  </div>;
}
