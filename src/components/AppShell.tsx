import { BookOpen, ChartNoAxesCombined, GraduationCap, Home, Languages, LogOut, ShieldCheck, Trophy } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

const menu = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/belajar', label: 'Belajar', icon: BookOpen },
  { to: '/latihan', label: 'Latihan', icon: GraduationCap },
  { to: '/jlpt', label: 'Simulasi JLPT', icon: Trophy },
  { to: '/progress', label: 'Progres', icon: ChartNoAxesCombined },
];

export function AppShell() {
  const { profile, role, signOut } = useAuth();
  const canAdmin = ['administrator', 'co_founder', 'founder'].includes(role ?? '');

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">空</div>
          <div><strong>KOJAC</strong><span>Japanese LMS</span></div>
        </div>
        <nav>
          {menu.map(({ to, label, icon: Icon, end }) => (
            <NavLink end={end} key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          {canAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={18} /> Admin
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini"><Languages size={17}/><div><strong>{profile?.full_name || 'Siswa KOJAC'}</strong><span>{role || 'umum'}</span></div></div>
          <button className="ghost-btn" onClick={() => void signOut()}><LogOut size={17}/> Keluar</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
