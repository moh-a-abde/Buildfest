"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const GUEST_KEY = "nourishme_guest_id";
const GUEST_DATA_KEY = "nourishme_guest_data";

interface GuestData {
  id: string;
  profile?: Record<string, unknown>;
  budget?: Record<string, unknown>;
  pantry?: Record<string, unknown>[];
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  guestId: string | null;
  isGuest: boolean;
  isLoading: boolean;
  effectiveUserId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => string;
  getGuestData: () => GuestData | null;
  setGuestData: (data: Partial<GuestData>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function setGuestCookies(id: string) {
  document.cookie = `nourishme_guest=true; path=/; max-age=86400`;
  document.cookie = `nourishme_guest_id=${id}; path=/; max-age=86400`;
}

function clearGuestCookies() {
  document.cookie = "nourishme_guest=; path=/; max-age=0";
  document.cookie = "nourishme_guest_id=; path=/; max-age=0";
}

async function migrateGuestData(guestId: string) {
  try {
    await fetch("/api/migrate-guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_id: guestId }),
    });
  } catch {
    // best-effort migration
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedGuestId = localStorage.getItem(GUEST_KEY);
    if (storedGuestId) {
      setGuestId(storedGuestId);
      setGuestCookies(storedGuestId);
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user && storedGuestId) {
        migrateGuestData(storedGuestId);
        localStorage.removeItem(GUEST_KEY);
        localStorage.removeItem(GUEST_DATA_KEY);
        clearGuestCookies();
        setGuestId(null);
      } else if (s?.user) {
        localStorage.removeItem(GUEST_KEY);
        clearGuestCookies();
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const prevGuestId = localStorage.getItem(GUEST_KEY);
        if (prevGuestId) {
          migrateGuestData(prevGuestId);
          localStorage.removeItem(GUEST_KEY);
          localStorage.removeItem(GUEST_DATA_KEY);
        }
        clearGuestCookies();
        setGuestId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const prevGuestId = localStorage.getItem(GUEST_KEY);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };

      if (prevGuestId) {
        await migrateGuestData(prevGuestId);
        localStorage.removeItem(GUEST_KEY);
        localStorage.removeItem(GUEST_DATA_KEY);
        clearGuestCookies();
      }
      return { error: null };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const prevGuestId = localStorage.getItem(GUEST_KEY);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };

      if (prevGuestId) {
        await migrateGuestData(prevGuestId);
        localStorage.removeItem(GUEST_KEY);
        localStorage.removeItem(GUEST_DATA_KEY);
        clearGuestCookies();
      }
      return { error: null };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    clearGuestCookies();
    document.cookie = "nourishme_onboarding_complete=; path=/; max-age=0";
    document.cookie = "nourishme_pantry_complete=; path=/; max-age=0";
  }, [supabase]);

  const continueAsGuest = useCallback(() => {
    const existingId = localStorage.getItem(GUEST_KEY);
    if (existingId) {
      setGuestId(existingId);
      setGuestCookies(existingId);
      return existingId;
    }
    const newId = generateGuestId();
    localStorage.setItem(GUEST_KEY, newId);
    localStorage.setItem(GUEST_DATA_KEY, JSON.stringify({ id: newId }));
    setGuestCookies(newId);
    setGuestId(newId);
    return newId;
  }, []);

  const getGuestData = useCallback((): GuestData | null => {
    return getGuestDataInternal();
  }, []);

  const setGuestData = useCallback(
    (data: Partial<GuestData>) => {
      const current = getGuestDataInternal();
      const updated = { ...current, ...data, id: guestId ?? current?.id ?? "" };
      localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(updated));
    },
    [guestId],
  );

  const isGuest = !user && !!guestId;
  const effectiveUserId = user?.id ?? guestId ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      guestId,
      isGuest,
      isLoading,
      effectiveUserId,
      signIn,
      signUp,
      signOut,
      continueAsGuest,
      getGuestData,
      setGuestData,
    }),
    [
      user,
      session,
      guestId,
      isGuest,
      isLoading,
      effectiveUserId,
      signIn,
      signUp,
      signOut,
      continueAsGuest,
      getGuestData,
      setGuestData,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function getGuestDataInternal(): GuestData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(GUEST_DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestData;
  } catch {
    return null;
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
