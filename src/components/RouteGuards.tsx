import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { APP_ROLE_RANK, type AppRole } from '../types';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="full-center">Memuat KOJAC LMS…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.email_confirmed_at) return <Navigate to="/verify-email" replace />;
  if (!profile?.is_approved || profile?.is_blocked) return <Navigate to="/pending" replace />;
  return <>{children}</>;
}

export function RoleRoute({ minimum, children }: { minimum: AppRole; children: ReactNode }) {
  const { role } = useAuth();
  if (!role || APP_ROLE_RANK[role] < APP_ROLE_RANK[minimum]) return <Navigate to="/" replace />;
  return <>{children}</>;
}
