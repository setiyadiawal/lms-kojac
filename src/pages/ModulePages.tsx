import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { BookOpen, ChartNoAxesCombined, ClipboardCheck, GraduationCap, MessageSquareText, Send, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

const cards = [
  { title: 'Hiragana', desc: '104 karakter: dasar, dakuten, handakuten, dan yōon.', href: '/belajar/hiragana', active: true },
  { title: 'Katakana', desc: '104 karakter: dasar, dakuten, handakuten, dan yōon.', href: '/belajar/katakana', active: true },
  { title: 'Kosakata', desc: 'Kosakata per bab dengan pencarian dan fondasi untuk Flashcard, Quiz, serta SRS.', href: '/belajar/kosakata', active: true },
  { title: 'Kanji', desc: 'Kanji JLPT N5–N1 dengan arti, Onyomi, Kunyomi, contoh kosakata, dan latihan bertahap.', href: '/belajar/kanji', active: true },
  { title: 'Tata Bahasa', desc: '文法 berbasis Bab KOJAC dengan rumus, penjelasan, contoh kalimat, dan audio.', href: '/belajar/tata-bahasa', active: true },
  { title: 'Reading / 読解', desc: 'Dokkai berbasis Bab KOJAC untuk menggabungkan Vocabulary, Kanji, dan Grammar dalam bacaan nyata.', href: '/belajar/reading', active: true },
  { title: 'Listening / 聴解', desc: 'Choukai berbasis Bab KOJAC untuk melatih pemahaman melalui dialog, pengumuman, dan situasi lisan.', href: '/belajar/listening', active: true },
];

const feedbackCategories = [
  { value: 'kritik', label: 'Kritik' },
  { value: 'saran', label: 'Saran' },
  { value: 'bug', label: 'Laporan Bug' },
  { value: 'materi', label: 'Masalah Materi' },
  { value: 'fitur', label: 'Permintaan Fitur' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

type FeedbackCategory = (typeof feedbackCategories)[number]['value'];

type FeedbackErrors = {
  category?: string;
  title?: string;
  message?: string;
  submit?: string;
};

const FEEDBACK_TITLE_MAX = 120;
const FEEDBACK_MESSAGE_MIN = 10;
const FEEDBACK_MESSAGE_MAX = 4000;

export function LearningPage() {
  return (
    <Simple title="Belajar" icon={<BookOpen />} intro="Pusat materi KOJAC dari dasar hingga JLPT N1.">
      <div className="module-grid">
        {cards.map((card) => (
          <div className={`module-card ${card.active ? 'module-active' : ''}`} key={card.title}>
            <strong>{card.title}</strong>
            <span>{card.desc}</span>
            {card.active && card.href ? <Link className="module-link" to={card.href}>Mulai belajar</Link> : <button disabled>Segera dibangun</button>}
          </div>
        ))}
      </div>
    </Simple>
  );
}

export function PracticePage() {
  return <UpcomingPage title="Latihan" icon={<GraduationCap />} description="Pusat latihan lintas materi KOJAC akan tersedia di halaman ini." />;
}

export function ExamPage() {
  return <UpcomingPage title="Simulasi JLPT" icon={<Trophy />} description="Simulasi ujian JLPT KOJAC sedang dipersiapkan agar dapat digunakan langsung dari LMS." />;
}

export function ProgressPage() {
  return <UpcomingPage title="Progres" icon={<ChartNoAxesCombined />} description="Halaman progres terpusat sedang dikembangkan. Progress yang sudah tersedia tetap tersimpan pada masing-masing modul dan Student Dashboard." />;
}

export function FeedbackPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FeedbackErrors>({});

  const validate = () => {
    const nextErrors: FeedbackErrors = {};
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!category) nextErrors.category = 'Pilih kategori masukan.';
    if (cleanTitle.length > FEEDBACK_TITLE_MAX) nextErrors.title = `Judul maksimal ${FEEDBACK_TITLE_MAX} karakter.`;
    if (cleanMessage.length < FEEDBACK_MESSAGE_MIN) nextErrors.message = `Pesan minimal ${FEEDBACK_MESSAGE_MIN} karakter.`;
    if (cleanMessage.length > FEEDBACK_MESSAGE_MAX) nextErrors.message = `Pesan maksimal ${FEEDBACK_MESSAGE_MAX} karakter.`;

    return { nextErrors, cleanTitle, cleanMessage };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    setSuccess(false);
    const { nextErrors, cleanTitle, cleanMessage } = validate();

    if (!user) {
      setErrors({ ...nextErrors, submit: 'Sesi login tidak tersedia. Silakan login kembali lalu coba lagi.' });
      return;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors({});

    const { error } = await supabase.from('user_feedback').insert({
      category,
      title: cleanTitle || null,
      message: cleanMessage,
    });

    if (error) {
      console.error('KOJAC feedback submission failed', error);
      setErrors({ submit: 'Masukan belum berhasil dikirim. Silakan coba kembali.' });
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    setCategory('');
    setTitle('');
    setMessage('');
    submittingRef.current = false;
    setSubmitting(false);
    setSuccess(true);
  };

  return (
    <Simple
      title="Kritik & Saran"
      icon={<MessageSquareText />}
      intro="Bantu kami membuat KOJAC LMS menjadi lebih baik. Sampaikan kritik, saran, kendala, atau ide Anda."
    >
      <section className="feedback-card" aria-labelledby="feedback-form-title">
        <div className="feedback-card-heading">
          <div>
            <p className="eyebrow">MASUKAN SISWA</p>
            <h2 id="feedback-form-title">Kirim masukan ke KOJAC</h2>
            <p>Masukan dikirim langsung dari akun yang sedang login. Anda tidak perlu mengisi nama atau email lagi.</p>
          </div>
          <div className="feedback-card-icon" aria-hidden="true"><MessageSquareText size={23} /></div>
        </div>

        <form className="feedback-form" onSubmit={handleSubmit} noValidate>
          <label className="feedback-field">
            <span>Kategori <strong aria-hidden="true">*</strong></span>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as FeedbackCategory | '');
                setErrors((current) => ({ ...current, category: undefined, submit: undefined }));
                setSuccess(false);
              }}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? 'feedback-category-error' : undefined}
              disabled={submitting}
            >
              <option value="">Pilih kategori</option>
              {feedbackCategories.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
            {errors.category && <small id="feedback-category-error" className="feedback-field-error">{errors.category}</small>}
          </label>

          <label className="feedback-field">
            <span>Judul <small>Opsional</small></span>
            <input
              type="text"
              value={title}
              maxLength={FEEDBACK_TITLE_MAX}
              placeholder="Ringkas isi masukan Anda"
              onChange={(event) => {
                setTitle(event.target.value);
                setErrors((current) => ({ ...current, title: undefined, submit: undefined }));
                setSuccess(false);
              }}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'feedback-title-error' : 'feedback-title-help'}
              disabled={submitting}
            />
            <span id="feedback-title-help" className="feedback-field-meta">{title.length}/{FEEDBACK_TITLE_MAX}</span>
            {errors.title && <small id="feedback-title-error" className="feedback-field-error">{errors.title}</small>}
          </label>

          <label className="feedback-field">
            <span>Pesan / Masukan <strong aria-hidden="true">*</strong></span>
            <textarea
              value={message}
              rows={7}
              maxLength={FEEDBACK_MESSAGE_MAX}
              placeholder="Ceritakan kritik, saran, kendala, bug, masalah materi, atau ide fitur Anda."
              onChange={(event) => {
                setMessage(event.target.value);
                setErrors((current) => ({ ...current, message: undefined, submit: undefined }));
                setSuccess(false);
              }}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? 'feedback-message-error' : 'feedback-message-help'}
              disabled={submitting}
            />
            <span id="feedback-message-help" className="feedback-field-meta">Minimal {FEEDBACK_MESSAGE_MIN} karakter · {message.length}/{FEEDBACK_MESSAGE_MAX}</span>
            {errors.message && <small id="feedback-message-error" className="feedback-field-error">{errors.message}</small>}
          </label>

          {success && (
            <div className="feedback-status success" role="status" aria-live="polite">
              <strong>Terima kasih!</strong>
              <span>Masukan Anda sudah kami terima.</span>
            </div>
          )}

          {errors.submit && (
            <div className="feedback-status error" role="alert">
              <strong>Belum terkirim</strong>
              <span>{errors.submit}</span>
            </div>
          )}

          <button className="primary-btn feedback-submit" type="submit" disabled={submitting}>
            <Send size={17} />
            {submitting ? 'Mengirim...' : 'Kirim Masukan'}
          </button>
        </form>
      </section>
    </Simple>
  );
}

function UpcomingPage({ title, icon, description }: { title: string; icon: ReactNode; description: string }) {
  return (
    <Simple title={title} icon={icon} intro={description}>
      <div className="empty-state">
        <ClipboardCheck size={34} />
        <h2>Fitur sedang dalam pengembangan</h2>
        <p>Nantikan pembaruan berikutnya di KOJAC LMS.</p>
      </div>
    </Simple>
  );
}

function Simple({ title, icon, intro, children }: { title: string; icon: ReactNode; intro: string; children?: ReactNode }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">KOJAC LMS</p>
          <h1 className="title-icon">{icon}{title}</h1>
          <p>{intro}</p>
        </div>
      </div>
      {children || <div className="empty-state"><ClipboardCheck size={34} /><h2>Fondasi siap</h2><p>Modul ini akan menjadi milestone lanjutan.</p></div>}
    </div>
  );
}
