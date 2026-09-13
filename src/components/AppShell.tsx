import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChartNoAxesCombined, GraduationCap, Home, Languages, LogOut, Menu, ShieldCheck, Trophy, X } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

const menu = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/belajar', label: 'Belajar', icon: BookOpen },
  { to: '/latihan', label: 'Latihan', icon: GraduationCap },
  { to: '/jlpt', label: 'Simulasi JLPT', icon: Trophy },
  { to: '/progress', label: 'Progres', icon: ChartNoAxesCombined },
];

type AppNavigationContentProps = {
  canAdmin: boolean;
  fullName?: string | null;
  role?: string | null;
  onNavigate?: () => void;
  onSignOut: () => void;
};

function AppNavigationContent({ canAdmin, fullName, role, onNavigate, onSignOut }: AppNavigationContentProps) {
  return <>
    <div className="brand">
      <div className="brand-mark">空</div>
      <div><strong>KOJAC</strong><span>Japanese LMS</span></div>
    </div>
    <nav>
      {menu.map(({ to, label, icon: Icon, end }) => (
        <NavLink end={end} key={to} to={to} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon size={18} /> {label}
        </NavLink>
      ))}
      {canAdmin && (
        <NavLink to="/admin" onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShieldCheck size={18} /> Admin
        </NavLink>
      )}
    </nav>
    <div className="sidebar-bottom">
      <div className="user-mini"><Languages size={17}/><div><strong>{fullName || 'Siswa KOJAC'}</strong><span>{role || 'umum'}</span></div></div>
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
  const canAdmin = ['administrator', 'co_founder', 'founder'].includes(role ?? '');

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
