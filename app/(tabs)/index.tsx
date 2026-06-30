import React, { useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useData, Transaction } from "@/context/DataContext";
import AddTransactionModal from "@/components/AddTransactionModal";
import { fmt, CURRENCY_SYMBOL } from "@/constants/currency";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function healthLabel(score: number) {
  if (score >= 75) return "Excellent condition";
  if (score >= 50) return "Good condition";
  if (score >= 25) return "Fair condition";
  return "Needs attention";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    transactions,
    tasks,
    goals,
    profile,
    totalRevenue,
    totalExpenses,
    netProfit,
    mrr,
    tasksDueToday,
    tasksCompleted,
    refreshAll,
    loading,
    deleteTransaction,
    updateTask,
  } = useData();

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"revenue" | "expense">("revenue");

  const openAdd = (type: "revenue" | "expense") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalType(type);
    setShowModal(true);
  };

  const displayName =
    profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Founder";
  const initials = getInitials(displayName);

  const todoTasks = tasks.filter((t) => t.status !== "done").slice(0, 3);
  const recentTx = transactions.slice(0, 5);

  const healthScore = Math.min(
    100,
    Math.round(
      (netProfit > 0 ? 35 : 0) +
        (tasksCompleted > 0 ? 20 : 0) +
        (goals.length > 0 ? 20 : 0) +
        (mrr > 0 ? 25 : 0)
    )
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const handleCompleteTask = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateTask(id, { status: "done" });
  };

  const handleDeleteTx = (tx: Transaction) => {
    Alert.alert("Delete Transaction", `Remove "${tx.description}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTransaction(tx.id),
      },
    ]);
  };

  const mrrProgress = totalRevenue > 0 ? Math.min(100, (mrr / totalRevenue) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: 130 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshAll}
            tintColor="#ffffff"
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.greeting}>
              {getGreeting()},{"\n"}
              {displayName.split(" ")[0]}
            </Text>
          </View>
          <Pressable
            style={styles.avatar}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        {/* ── Business Health Card ────────────────────────────── */}
        <View style={styles.healthCard}>
          <View style={styles.healthTop}>
            <View>
              <Text style={styles.cardLabel}>BUSINESS HEALTH</Text>
              <Text style={styles.healthScore}>{healthScore}</Text>
              <View style={styles.healthStatusRow}>
                <View style={styles.healthDot} />
                <Text style={styles.healthStatusText}>
                  {healthLabel(healthScore)}
                </Text>
              </View>
            </View>
            <View style={styles.healthRing}>
              <Feather name="activity" size={22} color="#ffffff" />
            </View>
          </View>

          <View style={styles.divider} />

          {/* MRR Row */}
          <View style={styles.mrrRow}>
            <View>
              <Text style={styles.mrrLabel}>MRR</Text>
              <Text style={styles.mrrValue}>{fmt(mrr, true)}</Text>
            </View>
            <View style={styles.mrrRight}>
              <Text style={styles.plValue}>
                {netProfit >= 0 ? "+" : ""}
                {fmt(netProfit, true)} P&L
              </Text>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${mrrProgress}%` as any },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ── Revenue & Expense Cards ──────────────────────────── */}
        <View style={styles.finRow}>
          <Pressable
            style={[styles.finCard, styles.revenueCard]}
            onPress={() => openAdd("revenue")}
          >
            <View style={styles.finCardTop}>
              <View style={styles.finIcon}>
                <Feather name="trending-up" size={16} color="#ffffff" />
              </View>
              <Feather name="plus" size={16} color="#555555" />
            </View>
            <Text style={styles.finCardLabel}>REVENUE</Text>
            <Text style={styles.finCardValue}>{fmt(totalRevenue, true)}</Text>
            <Text style={styles.finCardSub}>Tap to add</Text>
          </Pressable>

          <Pressable
            style={[styles.finCard, styles.expenseCard]}
            onPress={() => openAdd("expense")}
          >
            <View style={styles.finCardTop}>
              <View style={styles.finIcon}>
                <Feather name="trending-down" size={16} color="#888888" />
              </View>
              <Feather name="plus" size={16} color="#555555" />
            </View>
            <Text style={styles.finCardLabel}>EXPENSES</Text>
            <Text style={[styles.finCardValue, { color: "#888888" }]}>
              {fmt(totalExpenses, true)}
            </Text>
            <Text style={styles.finCardSub}>Tap to add</Text>
          </Pressable>
        </View>

        {/* ── Stats Row ───────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <Pressable
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/tasks")}
          >
            <Text style={styles.statValue}>{tasksDueToday}</Text>
            <Text style={styles.statLabel}>Tasks Due</Text>
            <Text style={styles.statSub}>today</Text>
          </Pressable>
          <Pressable
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/tasks")}
          >
            <Text style={styles.statValue}>{tasksCompleted}</Text>
            <Text style={styles.statLabel}>Done</Text>
            <Text style={styles.statSub}>total</Text>
          </Pressable>
          <Pressable
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/insights")}
          >
            <Text style={styles.statValue}>{goals.length}</Text>
            <Text style={styles.statLabel}>Goals</Text>
            <Text style={styles.statSub}>active</Text>
          </Pressable>
        </View>

        {/* ── Quick Actions ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickRow}>
          {[
            {
              icon: "plus-circle" as const,
              label: "Add Revenue",
              onPress: () => openAdd("revenue"),
            },
            {
              icon: "minus-circle" as const,
              label: "Add Expense",
              onPress: () => openAdd("expense"),
            },
            {
              icon: "check-square" as const,
              label: "Tasks",
              onPress: () => router.push("/(tabs)/tasks"),
            },
            {
              icon: "message-circle" as const,
              label: "CEO AI",
              onPress: () => router.push("/(tabs)/chat"),
            },
          ].map(({ icon, label, onPress }) => (
            <Pressable key={label} style={styles.quickItem} onPress={onPress}>
              <View style={styles.quickIcon}>
                <Feather name={icon} size={20} color="#ffffff" />
              </View>
              <Text style={styles.quickLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── CEO AI Card ──────────────────────────────────────── */}
        <Pressable
          style={styles.aiCard}
          onPress={() => router.push("/(tabs)/chat")}
        >
          <View style={styles.aiCardHeader}>
            <View style={styles.aiAvatar}>
              <Feather name="cpu" size={14} color="#000000" />
            </View>
            <Text style={styles.aiCardBadge}>CEO AI INSIGHT</Text>
          </View>
          <Text style={styles.aiCardText}>
            {mrr > 0
              ? `MRR is ${fmt(mrr, true)} this month. ${
                  netProfit > 0
                    ? "You're profitable — time to double down on growth."
                    : `Expenses exceed revenue by ${fmt(Math.abs(netProfit), true)}. Review costs now.`
                }`
              : "Add your first revenue entry to unlock AI-powered insights about your business performance."}
          </Text>
          <View style={styles.aiCardFooter}>
            <Text style={styles.aiCardCta}>Ask CEO AI</Text>
            <Feather name="arrow-right" size={14} color="#888888" />
          </View>
        </Pressable>

        {/* ── Today's Focus ────────────────────────────────────── */}
        {todoTasks.length > 0 && (
          <>
            <View style={styles.rowHeader}>
              <Text style={styles.sectionLabel}>TODAY'S FOCUS</Text>
              <Pressable onPress={() => router.push("/(tabs)/tasks")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {todoTasks.map((task) => (
              <View key={task.id} style={styles.taskItem}>
                <View
                  style={[
                    styles.taskPriBar,
                    {
                      backgroundColor:
                        task.priority === "high"
                          ? "#ffffff"
                          : task.priority === "mid"
                          ? "#666666"
                          : "#333333",
                    },
                  ]}
                />
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.due_date && (
                    <Text style={styles.taskDue}>
                      Due{" "}
                      {new Date(task.due_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  )}
                </View>
                <Pressable
                  style={styles.taskCompleteBtn}
                  onPress={() => handleCompleteTask(task.id)}
                >
                  <Feather name="check" size={14} color="#888888" />
                </Pressable>
              </View>
            ))}
          </>
        )}

        {/* ── Recent Transactions ──────────────────────────────── */}
        {recentTx.length > 0 && (
          <>
            <View style={styles.rowHeader}>
              <Text style={styles.sectionLabel}>RECENT TRANSACTIONS</Text>
              <Pressable onPress={() => router.push("/(tabs)/insights")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.txCard}>
              {recentTx.map((tx, i) => (
                <View key={tx.id}>
                  <Pressable
                    style={styles.txRow}
                    onLongPress={() => handleDeleteTx(tx)}
                  >
                    <View
                      style={[
                        styles.txIcon,
                        {
                          backgroundColor:
                            tx.type === "revenue"
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(255,255,255,0.04)",
                        },
                      ]}
                    >
                      <Feather
                        name={tx.type === "revenue" ? "trending-up" : "trending-down"}
                        size={14}
                        color={tx.type === "revenue" ? "#ffffff" : "#666666"}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text style={styles.txCat}>{tx.category}</Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: tx.type === "revenue" ? "#ffffff" : "#888888" },
                        ]}
                      >
                        {tx.type === "revenue" ? "+" : "-"}
                        {CURRENCY_SYMBOL}
                        {tx.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  </Pressable>
                  {i < recentTx.length - 1 && <View style={styles.txDivider} />}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {transactions.length === 0 && tasks.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="bar-chart-2" size={28} color="#333333" />
            </View>
            <Text style={styles.emptyTitle}>Ready to track your business</Text>
            <Text style={styles.emptyDesc}>
              Add your first revenue or expense entry to get started
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => openAdd("revenue")}>
              <Feather name="plus" size={16} color="#000000" />
              <Text style={styles.emptyBtnText}>Add First Entry</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <AddTransactionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        defaultType={modalType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  scroll: { paddingHorizontal: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  dateText: {
    fontSize: 13,
    color: "#555555",
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    lineHeight: 34,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000000" },

  healthCard: {
    backgroundColor: "#0d0d0d",
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  healthTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#444444",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  healthScore: {
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    lineHeight: 56,
  },
  healthStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  healthDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ffffff" },
  healthStatusText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  healthRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: "#1a1a1a", marginVertical: 18 },
  mrrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  mrrLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#555555",
    marginBottom: 4,
  },
  mrrValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#ffffff" },
  mrrRight: { alignItems: "flex-end", gap: 8 },
  plValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#ffffff" },
  progressBg: { width: 110, height: 4, backgroundColor: "#1e1e1e", borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: "#ffffff", borderRadius: 2 },

  finRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  finCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    backgroundColor: "#0d0d0d",
  },
  revenueCard: { borderColor: "#222222" },
  expenseCard: { borderColor: "#1a1a1a" },
  finCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  finIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  finCardLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#555555",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  finCardValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff", marginBottom: 4 },
  finCardSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#444444" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#ffffff", marginBottom: 4 },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#888888" },
  statSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#444444", marginTop: 2 },

  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#444444",
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickItem: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: {
    width: 54,
    height: 54,
    backgroundColor: "#0d0d0d",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#222222",
  },
  quickLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#666666", textAlign: "center" },

  aiCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
  },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  aiCardBadge: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#888888",
    letterSpacing: 1.2,
  },
  aiCardText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#111111",
    lineHeight: 22,
    marginBottom: 14,
  },
  aiCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiCardCta: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#555555",
  },

  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#555555" },

  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  taskPriBar: { width: 3, height: 40, borderRadius: 2, flexShrink: 0 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#ffffff" },
  taskDue: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555555", marginTop: 3 },
  taskCompleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },

  txCard: {
    backgroundColor: "#0d0d0d",
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#ffffff" },
  txCat: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555555", marginTop: 2 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555555", marginTop: 2 },
  txDivider: { height: 1, backgroundColor: "#141414", marginHorizontal: 16 },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#0d0d0d",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#555555" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333333", textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 22,
    marginTop: 12,
  },
  emptyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000000" },
});
