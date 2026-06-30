import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useData, Task } from "@/context/DataContext";
import CalendarPicker from "@/components/CalendarPicker";

type StatusFilter = "todo" | "in_progress" | "done";
type Priority = "high" | "mid" | "low";

const PRIORITY_CONFIG: Record<Priority, { label: string; barColor: string }> = {
  high: { label: "High", barColor: "#ffffff" },
  mid: { label: "Medium", barColor: "#666666" },
  low: { label: "Low", barColor: "#333333" },
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, addTask, updateTask, deleteTask } = useData();
  const [filter, setFilter] = useState<StatusFilter>("todo");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("high");
  const [newDueDate, setNewDueDate] = useState("");

  const counts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
  const filtered = tasks.filter((t) => t.status === filter);
  const completionRate =
    tasks.length > 0 ? Math.round((counts.done / tasks.length) * 100) : 0;

  const openAdd = () => {
    setNewTitle("");
    setNewPriority("high");
    setNewDueDate("");
    setShowAdd(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    const { error } = await addTask({
      title: newTitle.trim(),
      priority: newPriority,
      status: "todo",
      due_date: newDueDate || null,
    });
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Could not save task", `Supabase error: ${error}`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
  };

  const handleStart = async (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateTask(task.id, { status: "in_progress" });
  };

  const handleDone = async (task: Task) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateTask(task.id, { status: "done" });
  };

  const handleReopen = async (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateTask(task.id, { status: "todo" });
  };

  const handleDelete = (task: Task) => {
    Alert.alert("Delete Task", `Remove "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteTask(task.id);
        },
      },
    ]);
  };

  const formatDue = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d + "T12:00:00");
    const today = new Date();
    const diff = Math.floor(
      (date.getTime() - new Date(today.toDateString()).getTime()) / 86400000
    );
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff < 7)
      return date.toLocaleDateString("en-US", { weekday: "short" });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isDueOverdue = (d: string | null) => {
    if (!d) return false;
    const date = new Date(d + "T12:00:00");
    return date < new Date(new Date().toDateString());
  };

  const tabs: { key: StatusFilter; icon: any; label: string }[] = [
    { key: "todo", icon: "circle", label: "To Do" },
    { key: "in_progress", icon: "clock", label: "In Progress" },
    { key: "done", icon: "check-circle", label: "Done" },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.subtitle}>
            {tasks.length} total · {completionRate}% complete
          </Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Feather name="plus" size={22} color="#000000" />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.statsRow}>
        {tabs.map(({ key, icon, label }) => (
          <Pressable
            key={key}
            style={[styles.statCard, filter === key && styles.statCardActive]}
            onPress={() => setFilter(key)}
          >
            <Feather
              name={icon}
              size={16}
              color={filter === key ? "#000000" : "#555555"}
            />
            <Text
              style={[
                styles.statCount,
                filter === key && styles.statCountActive,
              ]}
            >
              {counts[key]}
            </Text>
            <Text
              style={[
                styles.statLabel,
                filter === key && styles.statLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 120 },
          filtered.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather
                name={filter === "done" ? "check-circle" : "clipboard"}
                size={28}
                color="#333333"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === "todo"
                ? "No tasks yet"
                : filter === "in_progress"
                ? "Nothing in progress"
                : "No completed tasks"}
            </Text>
            <Text style={styles.emptyDesc}>
              {filter === "done"
                ? "Complete tasks to see them here"
                : "Tap + to add a new task"}
            </Text>
            {filter !== "done" && (
              <Pressable style={styles.emptyBtn} onPress={openAdd}>
                <Feather name="plus" size={16} color="#000000" />
                <Text style={styles.emptyBtnText}>Add Task</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const pc = PRIORITY_CONFIG[item.priority];
          const dueLabel = formatDue(item.due_date);
          const overdue = item.status !== "done" && isDueOverdue(item.due_date);
          return (
            <Pressable
              style={styles.taskCard}
              onLongPress={() => handleDelete(item)}
            >
              <View
                style={[styles.priorityBar, { backgroundColor: pc.barColor }]}
              />
              <View style={styles.taskContent}>
                <Text
                  style={[
                    styles.taskTitle,
                    item.status === "done" && styles.taskTitleDone,
                  ]}
                >
                  {item.title}
                </Text>
                <View style={styles.taskMeta}>
                  <View style={styles.priorityBadge}>
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: pc.barColor },
                      ]}
                    />
                    <Text style={styles.priorityText}>{pc.label}</Text>
                  </View>
                  {dueLabel && (
                    <View
                      style={[
                        styles.dueBadge,
                        overdue && styles.dueBadgeOverdue,
                      ]}
                    >
                      <Feather
                        name={overdue ? "alert-circle" : "calendar"}
                        size={10}
                        color={overdue ? "#cc4444" : "#555555"}
                      />
                      <Text
                        style={[
                          styles.dueText,
                          overdue && styles.dueTextOverdue,
                        ]}
                      >
                        {dueLabel}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.taskActions}>
                {item.status === "todo" && (
                  <Pressable
                    style={styles.actionStart}
                    onPress={() => handleStart(item)}
                  >
                    <Text style={styles.actionStartText}>Start</Text>
                  </Pressable>
                )}
                {item.status === "in_progress" && (
                  <Pressable
                    style={styles.actionDone}
                    onPress={() => handleDone(item)}
                  >
                    <Feather name="check" size={15} color="#000000" />
                    <Text style={styles.actionDoneText}>Done</Text>
                  </Pressable>
                )}
                {item.status === "done" && (
                  <View style={styles.doneActions}>
                    <View style={styles.doneCheck}>
                      <Feather name="check" size={14} color="#ffffff" />
                    </View>
                    <Pressable onPress={() => handleReopen(item)}>
                      <Text style={styles.reopenText}>Reopen</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />

      {/* Add Task Modal */}
      <Modal
        visible={showAdd}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdd(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowAdd(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Task</Text>
              <Pressable
                style={styles.sheetClose}
                onPress={() => setShowAdd(false)}
                hitSlop={12}
              >
                <Feather name="x" size={18} color="#888888" />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="What needs to get done?"
              placeholderTextColor="#555555"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              returnKeyType="done"
              multiline
            />

            <Text style={styles.inputLabel}>PRIORITY</Text>
            <View style={styles.priorityRow}>
              {(["high", "mid", "low"] as Priority[]).map((p) => {
                const pc = PRIORITY_CONFIG[p];
                const active = newPriority === p;
                return (
                  <Pressable
                    key={p}
                    style={[
                      styles.priorityOption,
                      active && styles.priorityOptionActive,
                    ]}
                    onPress={() => setNewPriority(p)}
                  >
                    <View
                      style={[
                        styles.priorityOptionDot,
                        {
                          backgroundColor: active
                            ? "#000000"
                            : pc.barColor,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.priorityOptionText,
                        active && styles.priorityOptionTextActive,
                      ]}
                    >
                      {pc.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>DUE DATE (OPTIONAL)</Text>
            <CalendarPicker
              value={newDueDate}
              onChange={setNewDueDate}
              placeholder="No due date"
            />

            <Pressable style={styles.submitBtn} onPress={handleAddTask}>
              <Feather name="plus-circle" size={18} color="#000000" />
              <Text style={styles.submitBtnText}>Add Task</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#ffffff" },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#555555",
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  statCardActive: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  statCount: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  statCountActive: { color: "#000000" },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#555555",
    textAlign: "center",
  },
  statLabelActive: { color: "#444444" },

  list: { paddingHorizontal: 20, paddingTop: 4 },
  listEmpty: { flex: 1 },
  taskCard: {
    flexDirection: "row",
    backgroundColor: "#0d0d0d",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  priorityBar: { width: 3, height: 44, borderRadius: 2, flexShrink: 0 },
  taskContent: { flex: 1 },
  taskTitle: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#ffffff",
    marginBottom: 8,
    lineHeight: 21,
  },
  taskTitleDone: { color: "#444444", textDecorationLine: "line-through" },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityDot: { width: 5, height: 5, borderRadius: 3 },
  priorityText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#888888",
  },
  dueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#141414",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dueBadgeOverdue: { backgroundColor: "#1a0808" },
  dueText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#555555",
  },
  dueTextOverdue: { color: "#cc4444" },
  taskActions: { flexShrink: 0 },
  actionStart: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  actionStartText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  actionDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionDoneText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
  doneActions: { alignItems: "center", gap: 4 },
  doneCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  reopenText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#444444",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
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
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#555555",
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    textAlign: "center",
    paddingHorizontal: 32,
  },
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
  emptyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },

  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: "#0d0d0d",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#1e1e1e",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2a2a2a",
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222222",
    minHeight: 54,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#444444",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  priorityRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  priorityOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#222222",
    backgroundColor: "#111111",
  },
  priorityOptionActive: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  priorityOptionDot: { width: 6, height: 6, borderRadius: 3 },
  priorityOptionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#888888",
  },
  priorityOptionTextActive: { color: "#000000" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 17,
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
});
