import { isAuthApiError, type Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { en } from '@/i18n/en';

import { checkAccount } from './account-check';
import { clearAllRoomCaches } from './media';
import { cancelAllExpiryReminders } from './expiry-reminders';
import type { Tables } from './database.types';
import { supabase } from './supabase';

export type Profile = Tables<'profiles'>;

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** True until the stored session has been read on launch. */
  loading: boolean;
  /** Guests are Supabase anonymous users; hosts have an email account. */
  isGuest: boolean;
  refreshProfile: () => Promise<void>;
  /** Shown on the welcome screen after a stored session turned out to belong to a deleted account. */
  notice: string | null;
  clearNotice: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    accountGoneListener = () => {
      if (mounted) setNotice(en.auth.accountGone);
    };
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      // getSession() only reads local storage. Check with the server that the account still exists;
      // offline or server errors keep the stored session (it is checked again on the next launch).
      if (data.session) verifyAccount();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      mounted = false;
      accountGoneListener = null;
      listener.subscription.unsubscribe();
    };
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const userId = session?.user.id ?? null;

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const next = await fetchProfile(userId);
    if (next) setProfile(next);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchProfile(userId).then((next) => {
      if (active && next) setProfile(next);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  // A profile loaded for a previous user is never shown for the current one.
  const currentProfile = profile && profile.id === userId ? profile : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile: currentProfile,
      loading,
      isGuest: session?.user.is_anonymous ?? false,
      refreshProfile,
      notice,
      clearNotice,
    }),
    [session, currentProfile, loading, refreshProfile, notice, clearNotice],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return error ? null : data;
}

// Account validity -----------------------------------------------------------

let accountGoneListener: (() => void) | null = null;

/**
 * Asks the auth server whether the signed-in account still exists (see `checkAccount` for what
 * counts as proof). If it was deleted, signs out on this device only (the server has nothing left
 * to revoke) and the welcome screen shows a notice. Anything inconclusive keeps the session.
 */
export async function verifyAccount(): Promise<'ok' | 'gone' | 'unknown' | 'signed-out'> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 'signed-out';
  const result = await checkAccount({
    getUser: () => supabase.auth.getUser(),
    refreshSession: () => supabase.auth.refreshSession(),
    isApiError: (error) => isAuthApiError(error),
  });
  if (result !== 'gone') return result;
  accountGoneListener?.();
  clearAllRoomCaches();
  await supabase.auth.signOut({ scope: 'local' });
  return 'gone';
}

// Actions --------------------------------------------------------------------

function cleanName(name: string) {
  return name.trim().slice(0, 40);
}

export async function startAsGuest(displayName: string) {
  const name = cleanName(displayName);
  const { error } = await supabase.auth.signInAnonymously({
    options: { data: name ? { display_name: name } : undefined },
  });
  if (error) throw error;
}

export async function signUpHost(email: string, password: string, displayName: string) {
  const name = cleanName(displayName);
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: name ? { display_name: name } : undefined },
  });
  if (error) throw error;
  // Confirm email is off for development; if it is turned on, there is no session yet.
  return { needsConfirmation: !data.session };
}

export async function signInHost(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/**
 * Turns the current guest (anonymous user) into a host account. The user id stays the
 * same, so room memberships are kept. The session is refreshed so the new JWT no longer
 * carries is_anonymous, which the create_room RPC checks.
 */
export async function upgradeGuestToHost(email: string, password: string, displayName: string) {
  const name = cleanName(displayName);
  const { data, error } = await supabase.auth.updateUser({
    email: email.trim(),
    password,
    data: name ? { display_name: name } : undefined,
  });
  if (error) throw error;
  if (name) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', data.user.id);
    if (profileError) throw profileError;
  }
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
}

export async function updateDisplayName(userId: string, displayName: string) {
  const name = cleanName(displayName);
  if (!name) throw new Error('Name cannot be empty.');
  const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', userId);
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  clearAllRoomCaches();
  cancelAllExpiryReminders();
}
