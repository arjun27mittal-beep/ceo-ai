import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const rawUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const rawKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (__DEV__) {
  console.log("[Supabase] URL prefix:", rawUrl.slice(0, 30));
  console.log("[Supabase] Key configured:", rawKey.length > 0);
}

// Safe creation: if env vars are missing, create a stub client so the app
// doesn't crash at module-load time. All Supabase calls will fail gracefully.
try {
  (globalThis as any).__supabase = createClient(rawUrl || "https://placeholder.supabase.co", rawKey || "placeholder", {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
} catch (err: any) {
  console.error("[Supabase] Client creation failed:", err?.message);
  (globalThis as any).__supabase = createClient("https://placeholder.supabase.co", "placeholder", {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

// Export with `any` to avoid TypeScript generic inference issues across the monorepo
export const supabase = (globalThis as any).__supabase as any;

// Keep the auth session fresh across foreground/background transitions. On
// native, Supabase's autoRefreshToken timer should be (re)started when the app
// returns to the foreground; otherwise a long time in the background can let the
// access token expire and silently drop the realtime/data connection. Guard so
// the listener is only attached once even if this module is re-evaluated.
if (Platform.OS !== "web" && !(globalThis as any).__supabaseAppStateBound) {
  (globalThis as any).__supabaseAppStateBound = true;
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// Manual row types (used only for app-level interfaces, not Supabase generics)
export type TransactionRow = {
  id: string;
  user_id: string;
  type: "revenue" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at: string;
};

export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  priority: "high" | "mid" | "low";
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  created_at: string;
};

export type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string | null;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  company: string;
  created_at: string;
};
