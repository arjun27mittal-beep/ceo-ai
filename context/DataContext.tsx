import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

export interface Transaction {
  id: string;
  user_id: string;
  type: "revenue" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  priority: "high" | "mid" | "low";
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  name?: string; // Supabase auto-created profiles uses `name`
  email: string;
  role?: string;
  company?: string;
}

interface DataContextType {
  transactions: Transaction[];
  tasks: Task[];
  goals: Goal[];
  profile: Profile | null;
  loading: boolean;
  refreshAll: () => Promise<void>;
  addTransaction: (t: Omit<Transaction, "id" | "user_id" | "created_at">) => Promise<{ error: string | null }>;
  deleteTransaction: (id: string) => Promise<void>;
  addTask: (t: Omit<Task, "id" | "user_id" | "created_at">) => Promise<{ error: string | null }>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addGoal: (g: Omit<Goal, "id" | "user_id" | "created_at">) => Promise<{ error: string | null }>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  mrr: number;
  mrrByMonth: { month: string; revenue: number; expense: number }[];
  tasksDueToday: number;
  tasksCompleted: number;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [txRes, taskRes, goalRes, profileRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);
    if (txRes.data) setTransactions(txRes.data as Transaction[]);
    if (taskRes.data) setTasks(taskRes.data as Task[]);
    if (goalRes.data) setGoals(goalRes.data as Goal[]);
    if (profileRes.data) setProfile(normalizeProfile(profileRes.data as any));
    setLoading(false);
  }, [user]);

  // Subscribe to real-time changes for all tables
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setTasks([]);
      setGoals([]);
      setProfile(null);
      return;
    }

    refreshAll();

    // Realtime subscriptions
    const txChannel = supabase
      .channel(`transactions:${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        () => {
          supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .then(({ data }: { data: any }) => { if (data) setTransactions(data as Transaction[]); });
        }
      )
      .subscribe();

    const taskChannel = supabase
      .channel(`tasks:${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        () => {
          supabase
            .from("tasks")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .then(({ data }: { data: any }) => { if (data) setTasks(data as Task[]); });
        }
      )
      .subscribe();

    const goalChannel = supabase
      .channel(`goals:${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${user.id}` },
        () => {
          supabase
            .from("goals")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .then(({ data }: { data: any }) => { if (data) setGoals(data as Goal[]); });
        }
      )
      .subscribe();

    channelsRef.current = [txChannel, taskChannel, goalChannel];

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [user, refreshAll]);

  // ── Transactions ────────────────────────────────────────────
  const addTransaction = async (t: Omit<Transaction, "id" | "user_id" | "created_at">): Promise<{ error: string | null }> => {
    if (!user) return { error: "Not signed in" };
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...t, user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      console.error("[addTransaction] Supabase error:", error.message, error.code, error.details);
      return { error: error.message };
    }
    if (data) setTransactions((prev) => [data as Transaction, ...prev]);
    return { error: null };
  };

  const deleteTransaction = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Tasks ───────────────────────────────────────────────────
  const addTask = async (t: Omit<Task, "id" | "user_id" | "created_at">): Promise<{ error: string | null }> => {
    if (!user) return { error: "Not signed in" };
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...t, user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      console.error("[addTask] Supabase error:", error.message, error.code);
      return { error: error.message };
    }
    if (data) setTasks((prev) => [data as Task, ...prev]);
    return { error: null };
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    await supabase.from("tasks").update(updates as any).eq("id", id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Goals ───────────────────────────────────────────────────
  const addGoal = async (g: Omit<Goal, "id" | "user_id" | "created_at">): Promise<{ error: string | null }> => {
    if (!user) return { error: "Not signed in" };
    const { data, error } = await supabase
      .from("goals")
      .insert({ ...g, user_id: user.id })
      .select()
      .single();
    if (error) {
      console.error("[addGoal] Supabase error:", error.message, error.code);
      return { error: error.message };
    }
    if (data) setGoals((prev) => [data as Goal, ...prev]);
    return { error: null };
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    await supabase.from("goals").update(updates as any).eq("id", id);
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // ── Profile ─────────────────────────────────────────────────
  // Normalize a legacy Supabase profile to match the app's expected shape
  const normalizeProfile = (raw: any): Profile => ({
    id: raw.id,
    full_name: raw.full_name ?? raw.name ?? raw.email?.split("@")[0] ?? "Founder",
    name: raw.name,
    email: raw.email,
    role: raw.role ?? "CEO",
    company: raw.company ?? "",
  });

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    // Try modern schema fields first; fall back to legacy `name` field
    const modernUpdate = {
      ...(updates.full_name ? { full_name: updates.full_name } : {}),
      ...(updates.role ? { role: updates.role } : {}),
      ...(updates.company ? { company: updates.company } : {}),
    };
    const { error: modernErr } = await supabase
      .from("profiles")
      .update(modernUpdate as any)
      .eq("id", user.id);
    if (!modernErr) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return;
    }
    // Fallback: update via legacy `name` field only
    if (updates.full_name) {
      await supabase.from("profiles").update({ name: updates.full_name } as any).eq("id", user.id);
    }
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // ── Computed values ─────────────────────────────────────────
  const totalRevenue = transactions
    .filter((t) => t.type === "revenue")
    .reduce((s, t) => s + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  const now = new Date();
  const mrr = transactions
    .filter(
      (t) =>
        t.type === "revenue" &&
        new Date(t.date).getMonth() === now.getMonth() &&
        new Date(t.date).getFullYear() === now.getFullYear()
    )
    .reduce((s, t) => s + t.amount, 0);

  // Monthly breakdown (last 6 months)
  const mrrByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const mo = d.getMonth();
    const yr = d.getFullYear();
    return {
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      revenue: transactions
        .filter(
          (t) =>
            t.type === "revenue" &&
            new Date(t.date).getMonth() === mo &&
            new Date(t.date).getFullYear() === yr
        )
        .reduce((s, t) => s + t.amount, 0),
      expense: transactions
        .filter(
          (t) =>
            t.type === "expense" &&
            new Date(t.date).getMonth() === mo &&
            new Date(t.date).getFullYear() === yr
        )
        .reduce((s, t) => s + t.amount, 0),
    };
  });

  const today = new Date().toISOString().split("T")[0];
  const tasksDueToday = tasks.filter(
    (t) => t.due_date === today && t.status !== "done"
  ).length;
  const tasksCompleted = tasks.filter((t) => t.status === "done").length;

  return (
    <DataContext.Provider
      value={{
        transactions, tasks, goals, profile, loading,
        refreshAll,
        addTransaction, deleteTransaction,
        addTask, updateTask, deleteTask,
        addGoal, updateGoal, deleteGoal,
        updateProfile,
        totalRevenue, totalExpenses, netProfit, mrr, mrrByMonth,
        tasksDueToday, tasksCompleted,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
