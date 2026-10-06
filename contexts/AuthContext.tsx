'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { usernameToInternalEmail } from '@/lib/authShared';
import type { AppProfile } from '@/types/auth';
import type { AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextValue {
  profile: AppProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<AppProfile | null>;
  changePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const response = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!response.ok) {
      setProfile(null);
      return null;
    }
    const nextProfile = await response.json() as AppProfile;
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && active) await refreshProfile();
      if (active) setLoading(false);
    };

    initialize();
    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'SIGNED_OUT') setProfile(null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const login = useCallback(async (username: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToInternalEmail(username),
      password,
    });
    if (error) throw new Error('Username หรือรหัสผ่านไม่ถูกต้อง');

    const nextProfile = await refreshProfile();
    if (!nextProfile) {
      await supabase.auth.signOut();
      throw new Error('ไม่พบข้อมูลผู้ใช้หรือบัญชีถูกปิดใช้งาน');
    }
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    await getSupabaseBrowserClient().auth.signOut();
    setProfile(null);
  }, []);

  const changePassword = useCallback(async (password: string) => {
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const value = useMemo(() => ({
    profile,
    loading,
    login,
    logout,
    refreshProfile,
    changePassword,
  }), [profile, loading, login, logout, refreshProfile, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
