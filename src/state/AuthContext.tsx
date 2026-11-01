import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  const loadedAccountUserIdRef = useRef<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  const applySession = async (nextSession: Session | null) => {
    setSession(nextSession);
    activeUserIdRef.current = nextSession?.user?.id ?? null;
    if (!nextSession?.user) {
      loadedAccountUserIdRef.current = null;
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const account = await loadAccount(nextSession.user.id);
      setProfile(account.profile);
      setRole(account.role);
      loadedAccountUserIdRef.current = nextSession.user.id;
    } catch (error) {
      console.error('Gagal memuat akun KOJAC', error);
      loadedAccountUserIdRef.current = null;
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

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;

      const nextUserId = nextSession?.user?.id ?? null;
      const sameAuthenticatedUser = Boolean(
        nextUserId && activeUserIdRef.current === nextUserId,
      );

      if (
        sameAuthenticatedUser
        && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
      ) {
        setSession(nextSession);
        return;
      }

      setLoading(true);
      void applySession(nextSession);
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
