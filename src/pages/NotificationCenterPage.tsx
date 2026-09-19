import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../notification-center.css';
import { supabase } from '../lib/supabase';

type NotificationType =
  | 'account_approved'
  | 'assignment_published'
  | 'assignment_submitted'
  | 'assignment_reviewed';

type NotificationRow = {
  notification_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === 'account_approved') return <ShieldCheck size={18}/>;
  if (type === 'assignment_published') return <ClipboardList size={18}/>;
  if (type === 'assignment_submitted') return <Upload size={18}/>;
  return <CheckCircle2 size={18}/>;
}

function notifyBadgeChanged() {
  window.dispatchEvent(new CustomEvent('kojac:notifications-changed'));
}

export function NotificationCenterPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadNotifications = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(false);

    const { data, error: loadError } = await supabase.rpc('get_my_notifications', {
      p_limit: 50,
    });

    if (loadError) {
      console.error('KOJAC notification load failed', loadError);
      setError(true);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as NotificationRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNotifications(true);

    const interval = window.setInterval(() => {
      void loadNotifications(false);
    }, 30_000);

    const onFocus = () => void loadNotifications(false);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => rows.filter((row) => row.read_at === null).length,
    [rows],
  );

  const visibleRows = useMemo(
    () => showUnreadOnly ? rows.filter((row) => row.read_at === null) : rows,
    [rows, showUnreadOnly],
  );

  const openNotification = async (row: NotificationRow) => {
    if (openingId) return;
    setOpeningId(row.notification_id);

    if (!row.read_at) {
      const { error: markError } = await supabase.rpc('mark_notification_read', {
        p_notification_id: row.notification_id,
      });

      if (markError) {
        console.error('KOJAC notification mark read failed', markError);
      } else {
        const readAt = new Date().toISOString();
        setRows((current) => current.map((item) => (
          item.notification_id === row.notification_id
            ? { ...item, read_at: readAt }
            : item
        )));
        notifyBadgeChanged();
      }
    }

    setOpeningId(null);

    if (row.href) {
      navigate(row.href);
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);

    const { error: markError } = await supabase.rpc('mark_all_notifications_read');

    if (markError) {
      console.error('KOJAC mark all notifications read failed', markError);
      setMarkingAll(false);
      return;
    }

    const readAt = new Date().toISOString();
    setRows((current) => current.map((row) => (
      row.read_at ? row : { ...row, read_at: readAt }
    )));
    setMarkingAll(false);
    notifyBadgeChanged();
  };

  return (
    <div className="page notification-center-page">
      <header className="notification-center-header">
        <div>
          <p className="eyebrow">KOJAC LMS</p>
          <h1 className="title-icon"><Bell/>Notifikasi</h1>
          <p>Informasi terbaru tentang akun, tugas, pengumpulan, serta hasil penilaian.</p>
        </div>

        <div className="notification-header-actions">
          <button
            type="button"
            className="notification-secondary-button"
            onClick={() => void loadNotifications(true)}
            disabled={loading}
          >
            <RefreshCw size={15}/> Refresh
          </button>

          <button
            type="button"
            className="notification-primary-button"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0 || markingAll}
          >
            <CheckCheck size={15}/>
            {markingAll ? 'Menandai…' : 'Tandai Semua Dibaca'}
          </button>
        </div>
      </header>

      <section className="notification-summary">
        <div className="notification-summary-card">
          <span>Belum Dibaca</span>
          <strong>{unreadCount}</strong>
        </div>
        <div className="notification-summary-card">
          <span>Total Terbaru</span>
          <strong>{rows.length}</strong>
        </div>
      </section>

      <div className="notification-filter-row">
        <button
          type="button"
          className={!showUnreadOnly ? 'is-active' : ''}
          onClick={() => setShowUnreadOnly(false)}
        >
          Semua
        </button>
        <button
          type="button"
          className={showUnreadOnly ? 'is-active' : ''}
          onClick={() => setShowUnreadOnly(true)}
        >
          Belum Dibaca
          {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
      </div>

      {loading ? (
        <div className="notification-loading-list" aria-label="Memuat notifikasi">
          {[0, 1, 2, 3].map((item) => (
            <div className="notification-skeleton" key={item}/>
          ))}
        </div>
      ) : error ? (
        <section className="notification-empty-state" role="alert">
          <Bell size={30}/>
          <h2>Notifikasi belum dapat dimuat.</h2>
          <p>Silakan coba refresh. Data notifikasi Anda tidak berubah.</p>
        </section>
      ) : visibleRows.length === 0 ? (
        <section className="notification-empty-state">
          <Bell size={30}/>
          <h2>{showUnreadOnly ? 'Semua sudah dibaca.' : 'Belum ada notifikasi.'}</h2>
          <p>
            {showUnreadOnly
              ? 'Tidak ada notifikasi yang menunggu perhatian Anda.'
              : 'Notifikasi baru akan muncul ketika ada aktivitas penting di KOJAC LMS.'}
          </p>
        </section>
      ) : (
        <section className="notification-list" aria-label="Daftar notifikasi">
          {visibleRows.map((row) => (
            <button
              key={row.notification_id}
              type="button"
              className={`notification-item ${row.read_at ? 'is-read' : 'is-unread'}`}
              disabled={openingId === row.notification_id}
              onClick={() => void openNotification(row)}
            >
              <span className={`notification-icon is-${row.notification_type}`}>
                <NotificationIcon type={row.notification_type}/>
              </span>

              <span className="notification-copy">
                <span className="notification-title-row">
                  <strong>{row.title}</strong>
                  {!row.read_at && <span className="notification-unread-dot" aria-label="Belum dibaca"/>}
                </span>
                {row.message && <span className="notification-message">{row.message}</span>}
                <span className="notification-time">{formatDateTime(row.created_at)}</span>
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
