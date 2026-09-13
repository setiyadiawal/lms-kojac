import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

const rank: Record<AppRole, number> = {
  umum: 0,
  siswa: 1,
  pengajar: 2,
  administrator: 3,
  co_founder: 4,
  founder: 5,
};

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile?.is_approved || profile?.is_blocked) return <Navigate to="/pending" replace />;
  return <>{children}</>;
}

export function RoleRoute({ minimum, children }: { minimum: AppRole; children: ReactNode }) {
  const { role } = useAuth();
  if (!role || rank[role] < rank[minimum]) return <Navigate to="/" replace />;
  return <>{children}</>;
}
