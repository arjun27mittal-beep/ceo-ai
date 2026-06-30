import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useData, Goal, Transaction } from "@/context/DataContext";
import { fmt, CURRENCY_SYMBOL } from "@/constants/currency";
import CalendarPicker from "@/components/CalendarPicker";

const { width } = Dimensions.get("window");
type Tab = "overview" | "transactions" | "goals";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const {
    transactions, goals, tasks,
    totalRevenue, totalExpenses, netProfit, mrr, mrrByMonth,
    addGoal, updateGoal, deleteGoal, deleteTransaction,
  } = useData();

  const [tab, setTab] = useState<Tab>("overview");
  const [txFilter, setTxFilter] = useState<"all" | "revenue" | "expense">("all");

  // Goal add modal
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalUnit, setGoalUnit] = useState(CURRENCY_SYMBOL);
  const [goalCurrent, setGoalCurrent] = useState("0");
  const [goalDeadline, setGoalDeadline] = useState("");

  // Goal update modal
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [updateValue, setUpdateValue] = useState("");

  const tasksCompleted = tasks.filter((t) => t.status === "done").length;
  const taskRate = tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0;
  const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const maxBarValue = Math.max(
    ...mrrByMonth.map((m) => Math.max(m.revenue, m.expense)), 1
  );

  const expCategories = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  const topExpCats = Object.entries(expCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxExpCat = topExpCats[0]?.[1] || 1;

  const filteredTx = transactions.filter((t) =>
    txFilter === "all" ? true : t.type === txFilter
  );

  const resetGoalForm = () => {
    setGoalTitle("");
    setGoalTarget("");
    setGoalUnit(CURRENCY_SYMBOL);
    setGoalCurrent("0");
    setGoalDeadline("");
  };

  const handleAddGoal = async () => {
    if (!goalTitle.trim() || !goalTarget) return;
    const { error } = await addGoal({
      title: goalTitle.trim(),
      target: parseFloat(goalTarget),
      current: parseFloat(goalCurrent) || 0,
      unit: goalUnit,
      deadline: goalDeadline || null,
    });
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Could not save goal", `Supabase error: ${error}`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetGoalForm();
    setShowAddGoal(false);
  };

  const handleUpdateGoal = async () => {
    if (!selectedGoal || !updateValue) return;
    await updateGoal(selectedGoal.id, { current: parseFloat(updateValue) });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedGoal(null);
    setUpdateValue("");
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert("Delete Goal", `Remove "${goal.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteGoal(goal.id) },
    ]);
  };

  const handleDeleteTx = (tx: Transaction) => {
    Alert.alert("Delete Transaction", `Remove "${tx.description}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTransaction(tx.id) },
    ]);
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "transactions", label: "Transactions", count: transactions.length },
    { key: "goals", label: "Goals", count: goals.length },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Finance</Text>
          <Text style={styles.subtitle}>
            {transactions.length} transactions · {goals.length} goals
          </Text>
        </View>
        {tab === "goals" && (
          <Pressable
            style={styles.addBtn}
            onPress={() => { resetGoalForm(); setShowAddGoal(true); }}
          >
            <Feather name="plus" size={20} color="#000000" />
          </Pressable>
        )}
      </View>

      {/* Tab Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map(({ key, label, count }) => (
          <Pressable
            key={key}
            style={[styles.tabChip, tab === key && styles.tabChipActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabChipText, tab === key && styles.tabChipTextActive]}>
              {label}
              {count !== undefined && count > 0 ? ` (${count})` : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── OVERVIEW ─────────────────────────────────────────── */}
      {tab === "overview" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        >
          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            {[
              { label: "TOTAL REVENUE", value: fmt(totalRevenue, true), bright: true },
              { label: "TOTAL EXPENSES", value: fmt(totalExpenses, true), bright: false },
              { label: "NET PROFIT", value: (netProfit >= 0 ? "+" : "") + fmt(Math.abs(netProfit), true), bright: netProfit >= 0 },
              { label: "MARGIN", value: `${margin}%`, bright: margin >= 0 },
              { label: "THIS MONTH MRR", value: fmt(mrr, true), bright: true },
              { label: "TASK COMPLETION", value: `${taskRate}%`, bright: taskRate >= 50 },
            ].map(({ label, value, bright }) => (
              <View key={label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{label}</Text>
                <Text style={[styles.kpiValue, { color: bright ? "#ffffff" : "#666666" }]}>
                  {value}
                </Text>
              </View>
            ))}
          </View>

          {/* Monthly Revenue vs Expenses chart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Monthly Overview</Text>
            <Text style={styles.cardSub}>Revenue vs Expenses — last 6 months</Text>
            {transactions.length === 0 ? (
              <View style={styles.chartEmpty}>
                <Feather name="bar-chart-2" size={24} color="#2a2a2a" />
                <Text style={styles.chartEmptyText}>Add transactions to see your chart</Text>
              </View>
            ) : (
              <>
                <View style={styles.barChart}>
                  {mrrByMonth.map((m, i) => {
                    const revH = Math.max(4, (m.revenue / maxBarValue) * 110);
                    const expH = Math.max(4, (m.expense / maxBarValue) * 110);
                    const profit = m.revenue - m.expense;
                    return (
                      <View key={i} style={styles.barGroup}>
                        <Text style={[
                          styles.barProfit,
                          { color: profit > 0 ? "#ffffff" : profit < 0 ? "#888888" : "#333333" }
                        ]}>
                          {profit !== 0 ? (profit > 0 ? "+" : "") + fmt(profit, true) : ""}
                        </Text>
                        <View style={styles.bars}>
                          <View style={[styles.bar, { height: revH, backgroundColor: "#ffffff" }]} />
                          <View style={[styles.bar, { height: expH, backgroundColor: "#2a2a2a" }]} />
                        </View>
                        <Text style={styles.barLabel}>{m.month}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#ffffff" }]} />
                    <Text style={styles.legendText}>Revenue</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#2a2a2a" }]} />
                    <Text style={styles.legendText}>Expenses</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* MRR trend */}
          {mrr > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Month</Text>
              <View style={styles.mrrRow}>
                <View>
                  <Text style={styles.mrrBig}>{fmt(mrr, true)}</Text>
                  <Text style={styles.mrrSub}>Monthly Recurring Revenue</Text>
                </View>
                <View style={styles.mrrRight}>
                  {(() => {
                    const prev = mrrByMonth[mrrByMonth.length - 2]?.revenue || 0;
                    const change = prev > 0 ? ((mrr - prev) / prev) * 100 : 0;
                    return (
                      <View style={[styles.changeBadge, { borderColor: change >= 0 ? "#2a2a2a" : "#2a1a1a" }]}>
                        <Feather
                          name={change >= 0 ? "trending-up" : "trending-down"}
                          size={13}
                          color={change >= 0 ? "#ffffff" : "#888888"}
                        />
                        <Text style={[styles.changeText, { color: change >= 0 ? "#ffffff" : "#888888" }]}>
                          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                        </Text>
                      </View>
                    );
                  })()}
                  <Text style={styles.mrrVsPrev}>vs last month</Text>
                </View>
              </View>
            </View>
          )}

          {/* Expense breakdown */}
          {topExpCats.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Expense Breakdown</Text>
              <Text style={styles.cardSub}>By category</Text>
              {topExpCats.map(([cat, amount]) => (
                <View key={cat} style={styles.catRow}>
                  <View style={styles.catLeft}>
                    <Text style={styles.catName}>{cat}</Text>
                    <Text style={styles.catAmt}>{fmt(amount, true)}</Text>
                  </View>
                  <View style={styles.catBarBg}>
                    <View style={[styles.catBarFill, { width: `${(amount / maxExpCat) * 100}%` as any }]} />
                  </View>
                  <Text style={styles.catPct}>
                    {totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          {transactions.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="bar-chart-2" size={28} color="#333333" />
              </View>
              <Text style={styles.emptyTitle}>No financial data yet</Text>
              <Text style={styles.emptyDesc}>
                Add revenue or expenses from the Home screen to see your analytics
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── TRANSACTIONS ─────────────────────────────────────── */}
      {tab === "transactions" && (
        <View style={styles.flex1}>
          <View style={styles.filterRow}>
            {(["all", "revenue", "expense"] as const).map((f) => (
              <Pressable
                key={f}
                style={[styles.filterChip, txFilter === f && styles.filterChipActive]}
                onPress={() => setTxFilter(f)}
              >
                <Text style={[styles.filterChipText, txFilter === f && styles.filterChipTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{filteredTx.length} entries</Text>
            </View>
          </View>

          {filteredTx.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="inbox" size={28} color="#333333" />
              </View>
              <Text style={styles.emptyTitle}>No transactions</Text>
              <Text style={styles.emptyDesc}>Add revenue or expenses from the Home screen</Text>
            </View>
          ) : (
            <FlatList
              data={filteredTx}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.txCard}
                  onLongPress={() => handleDeleteTx(item)}
                >
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor:
                          item.type === "revenue"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(255,255,255,0.03)",
                      },
                    ]}
                  >
                    <Feather
                      name={item.type === "revenue" ? "trending-up" : "trending-down"}
                      size={16}
                      color={item.type === "revenue" ? "#ffffff" : "#666666"}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
                    <View style={styles.txMeta}>
                      <View style={styles.txCatBadge}>
                        <Text style={styles.txCatText}>{item.category}</Text>
                      </View>
                      <Text style={styles.txDate}>
                        {new Date(item.date + "T12:00:00").toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: item.type === "revenue" ? "#ffffff" : "#888888" }]}>
                      {item.type === "revenue" ? "+" : "-"}
                      {CURRENCY_SYMBOL}
                      {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.txType}>{item.type}</Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      )}

      {/* ── GOALS ─────────────────────────────────────────────── */}
      {tab === "goals" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        >
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="target" size={28} color="#333333" />
              </View>
              <Text style={styles.emptyTitle}>No goals yet</Text>
              <Text style={styles.emptyDesc}>Tap + to set your first business goal</Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => { resetGoalForm(); setShowAddGoal(true); }}
              >
                <Feather name="plus" size={16} color="#000000" />
                <Text style={styles.emptyBtnText}>Add First Goal</Text>
              </Pressable>
            </View>
          ) : (
            goals.map((goal) => {
              const pct = Math.min(100, (goal.current / goal.target) * 100);
              const done = pct >= 100;
              return (
                <Pressable
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => {
                    setSelectedGoal(goal);
                    setUpdateValue(goal.current.toString());
                  }}
                  onLongPress={() => handleDeleteGoal(goal)}
                >
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleRow}>
                      {done && (
                        <View style={styles.goalDoneBadge}>
                          <Feather name="check" size={10} color="#000000" />
                        </View>
                      )}
                      <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
                    </View>
                    <Text style={[styles.goalPct, { color: done ? "#ffffff" : "#888888" }]}>
                      {Math.round(pct)}%
                    </Text>
                  </View>
                  <View style={styles.goalProgressBg}>
                    <View style={[styles.goalProgressFill, { width: `${pct}%` as any }]} />
                  </View>
                  <View style={styles.goalFooter}>
                    <Text style={styles.goalCurrent}>{goal.unit}{goal.current.toLocaleString()}</Text>
                    <Text style={styles.goalSep}>of</Text>
                    <Text style={styles.goalTarget}>{goal.unit}{goal.target.toLocaleString()}</Text>
                    {goal.deadline && (
                      <View style={styles.deadlineBadge}>
                        <Feather name="calendar" size={10} color="#555555" />
                        <Text style={styles.deadlineText}>
                          {new Date(goal.deadline + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.goalHint}>Tap to update progress · Hold to delete</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── Add Goal Modal ──────────────────────────────────── */}
      <Modal
        visible={showAddGoal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddGoal(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowAddGoal(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Goal</Text>
              <Pressable style={styles.sheetClose} onPress={() => setShowAddGoal(false)} hitSlop={12}>
                <Feather name="x" size={18} color="#888888" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.input}
                placeholder="Goal title (e.g. Reach $10K MRR)"
                placeholderTextColor="#555555"
                value={goalTitle}
                onChangeText={setGoalTitle}
                autoFocus
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Unit ($, %, users)"
                  placeholderTextColor="#555555"
                  value={goalUnit}
                  onChangeText={setGoalUnit}
                />
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  placeholder="Target value"
                  placeholderTextColor="#555555"
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                  keyboardType="decimal-pad"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Current value (0)"
                placeholderTextColor="#555555"
                value={goalCurrent}
                onChangeText={setGoalCurrent}
                keyboardType="decimal-pad"
              />
              <Text style={styles.sectionLabel}>DEADLINE (OPTIONAL)</Text>
              <CalendarPicker
                value={goalDeadline}
                onChange={setGoalDeadline}
                placeholder="No deadline"
              />
              <Pressable style={styles.sheetBtn} onPress={handleAddGoal}>
                <Feather name="target" size={18} color="#000000" />
                <Text style={styles.sheetBtnText}>Create Goal</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Update Goal Modal ───────────────────────────────── */}
      <Modal
        visible={!!selectedGoal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedGoal(null)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setSelectedGoal(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Update Progress</Text>
              <Pressable style={styles.sheetClose} onPress={() => setSelectedGoal(null)} hitSlop={12}>
                <Feather name="x" size={18} color="#888888" />
              </Pressable>
            </View>
            <Text style={styles.sheetSub}>{selectedGoal?.title}</Text>
            {selectedGoal && (
              <View style={styles.progressPreview}>
                <View style={styles.progressPreviewBg}>
                  <View style={[
                    styles.progressPreviewFill,
                    { width: `${Math.min(100, (parseFloat(updateValue || "0") / selectedGoal.target) * 100)}%` as any }
                  ]} />
                </View>
                <Text style={styles.progressPreviewPct}>
                  {Math.min(100, Math.round((parseFloat(updateValue || "0") / selectedGoal.target) * 100))}%
                </Text>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Enter current value"
              placeholderTextColor="#555555"
              value={updateValue}
              onChangeText={setUpdateValue}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Pressable style={styles.sheetBtn} onPress={handleUpdateGoal}>
              <Text style={styles.sheetBtnText}>Save Progress</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  flex1: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-end", paddingHorizontal: 20, marginBottom: 16,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#ffffff" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555555", marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#ffffff",
    alignItems: "center", justifyContent: "center",
  },
  tabsScroll: { maxHeight: 44, marginBottom: 16 },
  tabsContent: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  tabChip: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#111111", borderWidth: 1, borderColor: "#222222",
  },
  tabChipActive: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  tabChipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#666666" },
  tabChipTextActive: { color: "#000000", fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 20 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  kpiCard: {
    width: (width - 50) / 2, backgroundColor: "#0d0d0d", borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: "#1a1a1a",
  },
  kpiLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#444444", letterSpacing: 1.2, marginBottom: 8 },
  kpiValue: { fontSize: 22, fontFamily: "Inter_700Bold" },

  card: {
    backgroundColor: "#0d0d0d", borderRadius: 20,
    padding: 20, marginBottom: 14, borderWidth: 1, borderColor: "#1a1a1a",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#ffffff", marginBottom: 4 },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555555", marginBottom: 20 },
  chartEmpty: { alignItems: "center", paddingVertical: 24, gap: 10 },
  chartEmptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333333" },
  barChart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 150, marginBottom: 16 },
  barGroup: { flex: 1, alignItems: "center", gap: 4 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 3, flex: 1 },
  bar: { flex: 1, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium", color: "#555555" },
  barProfit: { fontSize: 8, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  legend: { flexDirection: "row", gap: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666666" },

  mrrRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mrrBig: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#ffffff" },
  mrrSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555555", marginTop: 4 },
  mrrRight: { alignItems: "flex-end", gap: 6 },
  changeBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  changeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  mrrVsPrev: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#444444" },

  catRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  catLeft: { width: 100 },
  catName: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#ffffff", marginBottom: 2 },
  catAmt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555555" },
  catBarBg: { flex: 1, height: 4, backgroundColor: "#1e1e1e", borderRadius: 2 },
  catBarFill: { height: 4, backgroundColor: "#ffffff", borderRadius: 2 },
  catPct: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#666666", width: 30, textAlign: "right" },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 12, alignItems: "center" },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#111111", borderWidth: 1, borderColor: "#222222",
  },
  filterChipActive: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#666666" },
  filterChipTextActive: { color: "#000000", fontFamily: "Inter_600SemiBold" },
  filterCount: { marginLeft: "auto" },
  filterCountText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#444444" },

  txCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0d0d0d", borderRadius: 16,
    padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: "#1a1a1a",
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#ffffff", marginBottom: 4 },
  txMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  txCatBadge: {
    backgroundColor: "#111111", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: "#222222",
  },
  txCatText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#666666" },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#444444" },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  txType: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#444444", marginTop: 2, textTransform: "capitalize" },

  goalCard: {
    backgroundColor: "#0d0d0d", borderRadius: 20,
    padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: "#1a1a1a",
  },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  goalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  goalDoneBadge: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: "#ffffff",
    alignItems: "center", justifyContent: "center",
  },
  goalTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#ffffff", flex: 1 },
  goalPct: { fontSize: 18, fontFamily: "Inter_700Bold" },
  goalProgressBg: { height: 4, backgroundColor: "#1e1e1e", borderRadius: 2, marginBottom: 12 },
  goalProgressFill: { height: 4, backgroundColor: "#ffffff", borderRadius: 2 },
  goalFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  goalCurrent: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#ffffff" },
  goalSep: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#444444" },
  goalTarget: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#666666" },
  deadlineBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  deadlineText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555555" },
  goalHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#333333" },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIcon: {
    width: 68, height: 68, borderRadius: 22, backgroundColor: "#0d0d0d",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1a1a1a", marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#555555" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333333", textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#ffffff", borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 22, marginTop: 12,
  },
  emptyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000000" },

  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    backgroundColor: "#0d0d0d", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderColor: "#1e1e1e",
    maxHeight: "90%",
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#2a2a2a", alignSelf: "center", marginBottom: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#ffffff" },
  sheetClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center",
  },
  sheetSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#666666", marginBottom: 16 },
  input: {
    backgroundColor: "#141414", borderRadius: 14,
    padding: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: "#ffffff",
    marginBottom: 12, borderWidth: 1, borderColor: "#222222",
  },
  inputRow: { flexDirection: "row", gap: 10 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#444444", letterSpacing: 1.5, marginBottom: 8 },
  progressPreview: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  progressPreviewBg: { flex: 1, height: 6, backgroundColor: "#1e1e1e", borderRadius: 3 },
  progressPreviewFill: { height: 6, backgroundColor: "#ffffff", borderRadius: 3 },
  progressPreviewPct: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#ffffff", width: 44, textAlign: "right" },
  sheetBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#ffffff", borderRadius: 16, paddingVertical: 17,
  },
  sheetBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000000" },
});
