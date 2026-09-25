import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import '../honor-slip.css';

type PayrollLine = {
  line_id: string;
  report_id: string;
  class_id: string;
  activity_label: string;
  class_name: string;
  report_date: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  hourly_rate: number;
  amount: number;
  teacher_name: string;
};

type Adjustment = {
  adjustment_id: string;
  type: 'addition' | 'deduction';
  description: string;
  amount: number;
  created_at: string;
};

type PayrollDetail = {
  payroll: {
    payroll_id: string;
    teacher_id: string;
    period_start: string;
    period_end: string;
    status: 'draft' | 'finalized' | 'paid';
    base_amount: number;
    additions_amount: number;
    deductions_amount: number;
    net_amount: number;
    total_sessions: number;
    total_minutes: number;
    profile_snapshot: Record<string, string | null>;
    finalized_at: string | null;
    paid_at: string | null;
    paid_on: string | null;
    payment_note: string | null;
    slip_number: string | null;
    slip_document_id?: string | null;
  };
  lines: PayrollLine[];
  adjustments: Adjustment[];
};

type GroupedHonor = {
  key: string;
  activity: string;
  className: string;
  sessions: number;
  minutes: number;
  rate: number;
  amount: number;
};

const honorBg = '/brand/kojac-honor-slip-template.png';

function dateLong(value: string | null | undefined) {
  if (!value) return '-';
  const d = new Date(`${value}T00:00:00+07:00`);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(d);
}

function dateWithDay(value: string) {
  const d = new Date(`${value}T00:00:00+07:00`);
  const text = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cleanTime(value: string) {
  const [hh = '0', mm = '00'] = value.split(':');
  return `${Number(hh)}:${mm}`;
}

function durationLabel(minutes: number) {
  const safe = Math.max(0, Math.trunc(minutes || 0));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours && rest) return `${hours} Jam ${rest} Menit`;
  if (hours) return `${hours} Jam`;
  return `${rest} Menit`;
}

function hourNumber(minutes: number) {
  const value = (minutes || 0) / 60;
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

function money(value: number, table = false) {
  const amount = Math.round(Number(value || 0)).toLocaleString('id-ID');
  return table ? `Rp. ${amount},-` : `Rp.${amount},-`;
}

const words = [
  '',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
  'sepuluh',
  'sebelas',
];

function spellNumber(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n < 12) return words[n];
  if (n < 20) return `${spellNumber(n - 10)} belas`;
  if (n < 100) return `${spellNumber(Math.floor(n / 10))} puluh ${spellNumber(n % 10)}`.trim();
  if (n < 200) return `seratus ${spellNumber(n - 100)}`.trim();
  if (n < 1000) return `${spellNumber(Math.floor(n / 100))} ratus ${spellNumber(n % 100)}`.trim();
  if (n < 2000) return `seribu ${spellNumber(n - 1000)}`.trim();
  if (n < 1_000_000) return `${spellNumber(Math.floor(n / 1000))} ribu ${spellNumber(n % 1000)}`.trim();
  if (n < 1_000_000_000) {
    return `${spellNumber(Math.floor(n / 1_000_000))} juta ${spellNumber(n % 1_000_000)}`.trim();
  }
  if (n < 1_000_000_000_000) {
    return `${spellNumber(Math.floor(n / 1_000_000_000))} miliar ${spellNumber(n % 1_000_000_000)}`.trim();
  }
  return String(n);
}

function sentenceCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function recapActivity(value: string) {
  const first = value.split('/')[0]?.trim() || value;
  return first
    .split(/\s+/)
    .map((token) => {
      if (/^\d+$/.test(token) || token.toUpperCase() === 'ON') return token.toUpperCase();
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ');
}

function bankLabel(value: string | null | undefined) {
  const bank = String(value || '').trim();
  if (!bank) return 'Bank -';
  return /^bank\s/i.test(bank) ? bank : `Bank ${bank}`;
}

function coverClassName(value: string) {
  const source = String(value || '').trim();

  // Example KOJAC uses "Kelas E", "Kelas C", etc. on page 1,
  // while the LMS class master may store "Kelas Semi Privat - Kelas F".
  const full = source.match(/^Kelas\s+.+?\s*-\s*(Kelas\s+.+)$/i);
  if (full?.[1]) return full[1].trim();

  const activityPrefix = source.match(
    /^(?:Kelas\s+)?(?:Semi[-\s]?Privat|Privat\s+1\s+ON\s+1|Wawancara(?:\s*\/\s*Mensetsu)?)\s*-\s*(.+)$/i,
  );
  return activityPrefix?.[1]?.trim() || source;
}

function chunk<T>(rows: T[], size: number) {
  const pages: T[][] = [];
  for (let i = 0; i < rows.length; i += size) pages.push(rows.slice(i, i + size));
  return pages.length ? pages : [[]];
}

export function HonorSlipPage() {
  const { payrollId } = useParams();
  const { loading: authLoading } = useAuth();
  const [detail, setDetail] = useState<PayrollDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!payrollId) return;
    let active = true;
    void supabase
      .rpc('get_teacher_payroll_detail', { p_payroll_id: payrollId })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          console.error(loadError);
          setError('Slip honor tidak dapat dimuat.');
        } else {
          setDetail(data as PayrollDetail);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [payrollId]);

  const groups = useMemo<GroupedHonor[]>(() => {
    const map = new Map<string, GroupedHonor>();
    for (const line of detail?.lines ?? []) {
      const key = `${line.activity_label}|${line.class_name}|${line.hourly_rate}`;
      const current = map.get(key) ?? {
        key,
        activity: line.activity_label,
        className: line.class_name,
        sessions: 0,
        minutes: 0,
        rate: Number(line.hourly_rate || 0),
        amount: 0,
      };
      current.sessions += 1;
      current.minutes += Number(line.duration_minutes || 0);
      current.amount += Number(line.amount || 0);
      map.set(key, current);
    }
    return [...map.values()];
  }, [detail]);

  const orderedLines = useMemo(() => {
    const source = [...(detail?.lines ?? [])];
    const order = new Map(groups.map((group, index) => [group.key, index]));
    return source.sort((a, b) => {
      const aKey = `${a.activity_label}|${a.class_name}|${a.hourly_rate}`;
      const bKey = `${b.activity_label}|${b.class_name}|${b.hourly_rate}`;
      const groupDelta = (order.get(aKey) ?? 999) - (order.get(bKey) ?? 999);
      if (groupDelta !== 0) return groupDelta;
      const dateDelta = a.report_date.localeCompare(b.report_date);
      if (dateDelta !== 0) return dateDelta;
      return a.starts_at.localeCompare(b.starts_at);
    });
  }, [detail, groups]);

  const recapPages = useMemo(() => chunk(orderedLines, 19), [orderedLines]);

  if (authLoading || loading) return <div className="full-center">Memuat slip honor…</div>;
  if (!payrollId) return <Navigate to="/" replace />;
  if (error || !detail) return <div className="full-center">{error || 'Slip tidak ditemukan.'}</div>;

  const p = detail.payroll;
  const profile = p.profile_snapshot || {};
  const additions = detail.adjustments.filter((item) => item.type === 'addition');
  const deductions = detail.adjustments.filter((item) => item.type === 'deduction');
  const teacherName = String(profile.full_name || detail.lines[0]?.teacher_name || 'Pengajar KOJAC');
  const showDeductions = deductions.length > 0 || additions.length === 0;
  const showNotesOnRecap = orderedLines.length <= 9;
  const page1Density = groups.length + additions.length + (showDeductions ? deductions.length : 0) >= 6 ? 'is-dense' : '';

  return (
    <div className="honor-ref-screen">
      <div className="honor-ref-toolbar">
        <button type="button" onClick={() => window.history.back()}>
          <ArrowLeft size={16}/> Kembali
        </button>
        <button type="button" onClick={() => window.print()}>
          <Printer size={16}/> Cetak / Simpan PDF
        </button>
      </div>

      <main className="honor-ref-document">
        <section className={`honor-ref-page honor-ref-cover ${page1Density}`}>
          <img className="honor-ref-background" src={honorBg} alt=""/>

          <div className="honor-ref-title">SLIP HONOR</div>

          <div className="honor-ref-number">
            <strong>No. Slip :</strong> {p.slip_number || 'DRAFT / BELUM DITERBITKAN'}
          </div>

          <div className="honor-ref-period">
            <strong>Periode :</strong> {dateLong(p.period_start)} - {dateLong(p.period_end)}
          </div>

          <div className="honor-ref-identity">
            <div><strong>Nama</strong><span>:</span><span>{teacherName}</span></div>
            <div><strong>Team</strong><span>:</span><span>{profile.team_name || 'Pengajar (Eduforce)'}</span></div>
            <div><strong>Domisili</strong><span>:</span><span>{profile.domicile || '-'}</span></div>
            <div><strong>No.HP</strong><span>:</span><span>{profile.phone || '-'}</span></div>
          </div>

          <div className="honor-ref-cover-body">
            <h2>RINCIAN</h2>
            <table className="honor-ref-detail-table">
              <colgroup>
                <col className="c-type"/>
                <col className="c-name"/>
                <col className="c-session"/>
                <col className="c-hour"/>
                <col className="c-rate"/>
              </colgroup>
              <thead>
                <tr>
                  <th>JENIS KELAS</th>
                  <th>NAMA KELAS</th>
                  <th>TOTAL SESI</th>
                  <th>TOTAL JAM</th>
                  <th>HONOR PER JAM</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.key}>
                    <td>{group.activity.toUpperCase()}</td>
                    <td>{coverClassName(group.className)}</td>
                    <td>{group.sessions}</td>
                    <td>{hourNumber(group.minutes)}</td>
                    <td>{money(group.rate, true)}</td>
                  </tr>
                ))}
                <tr className="honor-ref-total">
                  <td colSpan={2}>TOTAL</td>
                  <td>{p.total_sessions}</td>
                  <td>{hourNumber(p.total_minutes)}</td>
                  <td>{money(p.base_amount, true)}</td>
                </tr>
              </tbody>
            </table>

            <h2>TAMBAHAN (JIKA ADA)</h2>
            <table className="honor-ref-adjustment-table">
              <colgroup><col className="c-no"/><col className="c-desc"/><col className="c-money"/></colgroup>
              <thead><tr><th>NO</th><th>KETERANGAN</th><th>JUMLAH</th></tr></thead>
              <tbody>
                {additions.length ? additions.map((item, index) => (
                  <tr key={item.adjustment_id}>
                    <td>{index + 1}</td>
                    <td>{item.description.toUpperCase()}</td>
                    <td>{money(item.amount, true)}</td>
                  </tr>
                )) : (
                  <tr><td>1</td><td>-</td><td>-</td></tr>
                )}
                <tr className="honor-ref-total">
                  <td colSpan={2}>TOTAL</td>
                  <td>{p.additions_amount ? money(p.additions_amount, true) : '-'}</td>
                </tr>
              </tbody>
            </table>

            {showDeductions && (
              <>
                <h2>POTONGAN (JIKA ADA)</h2>
                <table className="honor-ref-adjustment-table">
                  <colgroup><col className="c-no"/><col className="c-desc"/><col className="c-money"/></colgroup>
                  <thead><tr><th>NO</th><th>KETERANGAN</th><th>JUMLAH</th></tr></thead>
                  <tbody>
                    {deductions.length ? deductions.map((item, index) => (
                      <tr key={item.adjustment_id}>
                        <td>{index + 1}</td>
                        <td>{item.description.toUpperCase()}</td>
                        <td>{money(item.amount, true)}</td>
                      </tr>
                    )) : (
                      <tr><td>1</td><td>-</td><td>-</td></tr>
                    )}
                    <tr className="honor-ref-total">
                      <td colSpan={2}>TOTAL</td>
                      <td>{p.deductions_amount ? money(p.deductions_amount, true) : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            <div className="honor-ref-net">
              <div>
                <strong>Honor Bersih Diterima</strong><span>:</span><span>{money(p.net_amount)}</span>
              </div>
              <div className="honor-ref-terbilang">
                <strong>Terbilang</strong><span>:</span>
                <span>{sentenceCase(spellNumber(p.net_amount))} rupiah.</span>
              </div>
            </div>

            <div className="honor-ref-payment">
              <div><strong>Dibayarkan pada tanggal</strong><span>:</span><strong>{dateLong(p.paid_on)}</strong></div>
              <div><strong>Metode Pembayaran</strong><span>:</span><strong>{profile.payment_method || 'Transfer'}</strong></div>
              <p><strong>{bankLabel(profile.bank_name)}</strong> a.n <strong>{profile.bank_account_name || teacherName}</strong></p>
              <p>{profile.bank_account_number || '-'}</p>
            </div>
          </div>
        </section>

        {recapPages.map((rows, pageIndex) => {
          const isLastPage = pageIndex === recapPages.length - 1;
          const shouldShowNotes = showNotesOnRecap && isLastPage;

          return (
            <section className="honor-ref-page honor-ref-recap" key={`recap-${pageIndex}`}>
              <img className="honor-ref-background" src={honorBg} alt=""/>

              <div className="honor-ref-recap-content">
                <h1>REKAPAN SESI KELAS</h1>

                <table className="honor-ref-recap-table">
                  <colgroup>
                    <col className="c-date"/>
                    <col className="c-class"/>
                    <col className="c-start"/>
                    <col className="c-end"/>
                    <col className="c-duration"/>
                  </colgroup>
                  <thead>
                    <tr>
                      <th rowSpan={2}>Tanggal</th>
                      <th rowSpan={2}>Nama Kelas</th>
                      <th colSpan={2}>Waktu (WIB)</th>
                      <th rowSpan={2}>Jam</th>
                    </tr>
                    <tr>
                      <th>Mulai</th>
                      <th>Selesai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((line) => (
                      <tr key={line.line_id}>
                        <td>{dateWithDay(line.report_date)}</td>
                        <td>
                          <span>{recapActivity(line.activity_label)}</span>
                          <span>{line.class_name}</span>
                        </td>
                        <td>{cleanTime(line.starts_at)}</td>
                        <td>{cleanTime(line.ends_at)}</td>
                        <td>{durationLabel(line.duration_minutes)}</td>
                      </tr>
                    ))}
                    {isLastPage && (
                      <tr className="honor-ref-recap-total">
                        <td colSpan={4}>Total (jam)</td>
                        <td>{hourNumber(p.total_minutes)}{Number.isInteger(p.total_minutes / 60) && p.total_minutes >= 60 ? ' Jam' : ''}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {shouldShowNotes && (
                  <div className="honor-ref-notes">
                    <strong>Keterangan :</strong>
                    <p>
                      Slip honor ini menjadi bukti administrasi pembayaran honor mengajar pada periode yang
                      tercantum. Apabila terdapat perbedaan data atau perhitungan di kemudian hari, maka akan
                      diselesaikan secara kekeluargaan.
                    </p>
                    <div className="honor-ref-wave">～</div>
                    <p className="honor-ref-thanks">
                      Terima kasih atas waktu, tenaga, dan komitmen saudara/i dalam kegiatan mengajar.
                      Kami sangat menghargai itu. Semoga waktu dan ilmu yang kita sampaikan menjadi berkah
                      dan Allah ta’ala jadikan pahala jariyah untuk kita semua. Aamiin
                    </p>
                    <div className="honor-ref-wave">～</div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
