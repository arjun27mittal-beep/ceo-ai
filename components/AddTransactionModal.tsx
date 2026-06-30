import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useData } from "@/context/DataContext";
import { CURRENCY_SYMBOL } from "@/constants/currency";
import CalendarPicker from "./CalendarPicker";

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultType?: "revenue" | "expense";
}

const EXPENSE_CATS = [
  "Marketing", "Software", "Payroll", "Office", "Travel",
  "Legal", "Infrastructure", "Sales", "Ads", "Other",
];
const REVENUE_CATS = [
  "Product Sales", "Services", "Consulting", "Subscription",
  "Partnership", "Grants", "Investment", "Other",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function AddTransactionModal({ visible, onClose, defaultType = "revenue" }: Props) {
  const insets = useSafeAreaInsets();
  const { addTransaction } = useData();
  const [type, setType] = useState<"revenue" | "expense">(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setType(defaultType);
      setCategory("Other");
      setAmount("");
      setDescription("");
      setDate(todayStr());
    }
  }, [visible, defaultType]);

  const categories = type === "revenue" ? REVENUE_CATS : EXPENSE_CATS;

  const handleSubmit = async () => {
    const parsed = parseFloat(amount.replace(/,/g, ""));
    if (!parsed || parsed <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!description.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!date) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    const { error } = await addTransaction({ type, amount: parsed, description: description.trim(), category, date });
    setSaving(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Could not save transaction",
        `Supabase error: ${error}\n\nMake sure the 'transactions' table exists in your Supabase project. Copy the SQL from supabase-schema.sql and run it in the Supabase SQL Editor.`,
        [{ text: "OK" }]
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const isRevenue = type === "revenue";

  const selectedMonthLabel = (() => {
    if (!date) return "";
    try {
      const d = new Date(date + "T12:00:00");
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch { return ""; }
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Transaction</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Feather name="x" size={18} color="#888888" />
            </Pressable>
          </View>

          {/* Type Toggle */}
          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeBtn, isRevenue && styles.typeBtnActive]}
              onPress={() => { setType("revenue"); setCategory("Other"); }}
            >
              <Feather name="trending-up" size={16} color={isRevenue ? "#000000" : "#555555"} />
              <Text style={[styles.typeBtnText, isRevenue && styles.typeTextActive]}>Revenue</Text>
            </Pressable>
            <Pressable
              style={[styles.typeBtn, !isRevenue && styles.typeBtnActive]}
              onPress={() => { setType("expense"); setCategory("Other"); }}
            >
              <Feather name="trending-down" size={16} color={!isRevenue ? "#000000" : "#555555"} />
              <Text style={[styles.typeBtnText, !isRevenue && styles.typeTextActive]}>Expense</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Amount row */}
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>{CURRENCY_SYMBOL}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#333333"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
                returnKeyType="next"
              />
              {date && (
                <View style={styles.monthBadge}>
                  <Feather name="calendar" size={11} color="#888888" />
                  <Text style={styles.monthBadgeText}>{selectedMonthLabel}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            <TextInput
              style={styles.input}
              placeholder="Description (e.g. Client payment, AWS bill)"
              placeholderTextColor="#555555"
              value={description}
              onChangeText={setDescription}
              returnKeyType="next"
            />

            {/* Date — Calendar Picker */}
            <Text style={styles.sectionLabel}>TRANSACTION DATE</Text>
            <CalendarPicker
              value={date}
              onChange={setDate}
              placeholder="Select date"
            />

            {/* Category */}
            <Text style={styles.sectionLabel}>CATEGORY</Text>
            <View style={styles.catsWrap}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* MRR note */}
            {date && (
              <View style={styles.mrrNote}>
                <Feather name="info" size={13} color="#444444" />
                <Text style={styles.mrrNoteText}>
                  {isRevenue
                    ? "Revenue added to the selected month's MRR"
                    : "Expense tracked against the selected month"}
                </Text>
              </View>
            )}

            {/* Submit */}
            <Pressable
              style={[styles.submitBtn, saving && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Feather name={isRevenue ? "plus-circle" : "minus-circle"} size={18} color="#000000" />
                  <Text style={styles.submitText}>Save {isRevenue ? "Revenue" : "Expense"}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  card: {
    backgroundColor: "#0d0d0d",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12,
    borderTopWidth: 1, borderColor: "#1e1e1e",
    maxHeight: "95%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#2a2a2a", alignSelf: "center", marginBottom: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#ffffff" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },

  typeRow: {
    flexDirection: "row", gap: 8, marginBottom: 20,
    backgroundColor: "#111111", borderRadius: 16, padding: 4,
  },
  typeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12,
  },
  typeBtnActive: { backgroundColor: "#ffffff" },
  typeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#555555" },
  typeTextActive: { color: "#000000" },

  amountRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
  },
  currencySymbol: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#ffffff", marginRight: 4 },
  amountInput: { flex: 1, fontSize: 44, fontFamily: "Inter_700Bold", color: "#ffffff" },
  monthBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#1a1a1a", borderRadius: 10,
    paddingHorizontal: 9, paddingVertical: 5,
    borderWidth: 1, borderColor: "#2a2a2a",
  },
  monthBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#888888" },

  input: {
    backgroundColor: "#111111", borderRadius: 14,
    padding: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: "#ffffff",
    marginBottom: 16, borderWidth: 1, borderColor: "#1e1e1e",
  },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#555555", letterSpacing: 1.5, marginBottom: 8 },

  catsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#222222", backgroundColor: "#111111" },
  catChipActive: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#888888" },
  catChipTextActive: { color: "#000000" },

  mrrNote: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#111111", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16, borderWidth: 1, borderColor: "#1e1e1e",
  },
  mrrNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#555555", lineHeight: 18 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 18, paddingVertical: 18, marginBottom: 8,
    backgroundColor: "#ffffff",
  },
  submitText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#000000" },
});
