import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AppRole, Profile } from '../types';

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

async function loadAccount(userId: string) {
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id,full_name,avatar_url,bio,locale,is_approved,is_blocked')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (roleResult.error) throw roleResult.error;

  return {
    profile: (profileResult.data as Profile | null) ?? null,
    role: (roleResult.data?.role as AppRole | undefined) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const account = await loadAccount(nextSession.user.id);
      setProfile(account.profile);
      setRole(account.role);
    } catch (error) {
      console.error('Gagal memuat akun KOJAC', error);
      setProfile(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) void applySession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setLoading(true);
        void applySession(nextSession);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    role,
    loading,
    refresh: async () => {
      if (!session?.user) return;
      const account = await loadAccount(session.user.id);
      setProfile(account.profile);
      setRole(account.role);
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [session, profile, role, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return value;
}
