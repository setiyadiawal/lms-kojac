import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Dumbbell,
  Home,
  Inbox,
  Languages,
  LogOut,
  Menu,
  MessageSquareText,
  School,
  ShieldCheck,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { APP_ROLE_LABEL, USER_MANAGEMENT_ROLES, type AppRole } from '../types';
import '../classroom.css';

const TEACHING_ROLES = new Set<AppRole>(['pengajar', 'administrator', 'manager', 'co_founder', 'founder']);

const learningMenu = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/belajar', label: 'Belajar', icon: BookOpen },
  { to: '/latihan', label: 'Latihan', icon: Dumbbell },
  { to: '/jlpt', label: 'Ujian', icon: Trophy },
  { to: '/progress', label: 'Progres', icon: BarChart3 },
];

type AppNavigationContentProps = {
  canAdmin: boolean;
  fullName?: string | null;
  role?: AppRole | null;
  onNavigate?: () => void;
  onSignOut: () => void;
};

function NavigationLink({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      end={end}
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      <Icon size={18}/>
      <span className="nav-item-label">{label}</span>
    </NavLink>
  );
}

function AppNavigationContent({ canAdmin, fullName, role, onNavigate, onSignOut }: AppNavigationContentProps) {
  const canTeach = Boolean(role && TEACHING_ROLES.has(role));

  return <>
    <div className="brand">
      <div className="brand-mark">空</div>
      <div><strong>KOJAC</strong><span>Japanese LMS</span></div>
    </div>

    <nav aria-label="Navigasi utama KOJAC">
      <div className="app-nav-section">
        <span className="app-nav-section-label">BELAJAR</span>
        {learningMenu.map(({ to, label, icon, end }) => (
          <NavigationLink key={to} to={to} label={label} icon={icon} end={end} onNavigate={onNavigate}/>
        ))}
      </div>

      {role === 'siswa' && (
        <div className="app-nav-section">
          <span className="app-nav-section-label">SISWA</span>
          <NavigationLink to="/kelas-saya" label="Kelas Saya" icon={School} onNavigate={onNavigate}/>
        </div>
      )}

      {canTeach && (
        <div className="app-nav-section">
          <span className="app-nav-section-label">PENGAJAR</span>
          <NavigationLink to="/kelas-mengajar" label="Kelas Mengajar" icon={School} onNavigate={onNavigate}/>
        </div>
      )}

      {canAdmin && (
        <div className="app-nav-section">
          <span className="app-nav-section-label">MANAJEMEN</span>
          <NavigationLink to="/admin" label="Pengguna & Kelas" icon={ShieldCheck} onNavigate={onNavigate}/>
          <NavigationLink to="/manajemen/siswa" label="Siswa" icon={UsersRound} onNavigate={onNavigate}/>
          <NavigationLink to="/manajemen/kritik-saran" label="Kritik & Saran Masuk" icon={Inbox} onNavigate={onNavigate}/>
          <NavigationLink to="/rekap-kelas" label="Rekap Kelas" icon={BarChart3} onNavigate={onNavigate}/>
        </div>
      )}

      <div className="app-nav-section">
        <span className="app-nav-section-label">LAINNYA</span>
        <NavigationLink to="/kritik-saran" label="Kritik & Saran" icon={MessageSquareText} onNavigate={onNavigate}/>
      </div>
    </nav>

    <div className="sidebar-bottom">
      <div className="user-mini"><Languages size={17}/><div><strong>{fullName || 'Pengguna KOJAC'}</strong><span>{role ? APP_ROLE_LABEL[role] : 'Umum'}</span></div></div>
      <button className="ghost-btn" onClick={() => { onNavigate?.(); onSignOut(); }}><LogOut size={17}/> Keluar</button>
    </div>
  </>;
}

export function AppShell() {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const canAdmin = role ? USER_MANAGEMENT_ROLES.includes(role) : false;

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const handleChange = () => {
      if (!mediaQuery.matches) setDrawerOpen(false);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const computedPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);
  const handleSignOut = () => void signOut();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <AppNavigationContent
          canAdmin={canAdmin}
          fullName={profile?.full_name}
          role={role}
          onSignOut={handleSignOut}
        />
      </aside>

      <header className="mobile-nav-topbar">
        <button
          ref={menuButtonRef}
          type="button"
          className="mobile-nav-menu-button"
          aria-label="Buka menu navigasi"
          aria-controls="mobile-navigation-drawer"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22}/>
        </button>
        <div className="mobile-nav-brand" aria-label="KOJAC">
          <div className="brand-mark">空</div>
          <strong>KOJAC</strong>
        </div>
      </header>

      <div className={`mobile-nav-layer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="mobile-nav-overlay" onClick={closeDrawer} />
        <aside
          id="mobile-navigation-drawer"
          className="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <button ref={closeButtonRef} type="button" className="mobile-nav-close" aria-label="Tutup menu navigasi" onClick={closeDrawer}>
            <X size={21}/>
          </button>
          <AppNavigationContent
            canAdmin={canAdmin}
            fullName={profile?.full_name}
            role={role}
            onNavigate={closeDrawer}
            onSignOut={handleSignOut}
          />
        </aside>
      </div>

      <main className="main"><Outlet /></main>
    </div>
  );
}
