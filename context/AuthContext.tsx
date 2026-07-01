import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
if (!DOMAIN) {
  console.error("[Auth] EXPO_PUBLIC_DOMAIN is not set — API_BASE will be invalid");
}
const API_BASE = `https://${DOMAIN || "undefined"}`;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err: any) => {
      if (!isMounted) return;
      console.warn("[Auth] getSession failed:", err?.message);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log("[Auth] signUp URL:", `${API_BASE}/api/auth/signup`);
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return { error: data.error?.message || data.error || "Sign up failed" };
      }
      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      return { error: null };
    } catch (err: any) {
      console.error("[Auth] signUp network error:", err?.message, err?.code);
      const msg = err?.message || "";
      if (msg.includes("Network request failed")) {
        return { error: "Can't reach server. Check internet or app config (EXPO_PUBLIC_DOMAIN)." };
      }
      return { error: `Network error: ${msg || "check connection"}` };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("[Auth] signIn URL:", `${API_BASE}/api/auth/signin`);
      const res = await fetch(`${API_BASE}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return { error: data.error?.message || data.error || "Sign in failed" };
      }
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
      }
      return { error: null };
    } catch (err: any) {
      console.error("[Auth] signIn network error:", err?.message, err?.code);
      const msg = err?.message || "";
      if (msg.includes("Network request failed")) {
        return { error: "Can't reach server. Check internet or app config (EXPO_PUBLIC_DOMAIN)." };
      }
      return { error: `Network error: ${msg || "check connection"}` };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[Auth] signOut failed:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
