import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
}

function parseYMD(val: string): { y: number; m: number; d: number } {
  const parts = val?.split("-") ?? [];
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { y, m, d };
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

function toYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(val: string): string {
  try {
    const { y, m, d } = parseYMD(val);
    const date = new Date(y, m, d);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return val || "Select date";
  }
}

export default function CalendarPicker({ value, onChange, label, placeholder }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const today = new Date();
  const selected = parseYMD(value);
  const [viewYear, setViewYear] = useState(selected.y || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.m ?? today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const cells: { day: number; current: boolean }[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: daysInPrevMonth - firstDayOfWeek + 1 + i, current: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, current: true });
  }
  const remaining = totalCells - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, current: false });
  }

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleSelectDay = (day: number) => {
    const ymd = toYMD(viewYear, viewMonth, day);
    onChange(ymd);
    setOpen(false);
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const isSelected = (day: number) =>
    day === selected.d &&
    viewMonth === selected.m &&
    viewYear === selected.y;

  const hasValue = !!value;

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        {label && <Text style={styles.triggerLabel}>{label}</Text>}
        <View style={styles.triggerInner}>
          <Feather name="calendar" size={15} color={hasValue ? "#ffffff" : "#555555"} />
          <Text style={[styles.triggerText, !hasValue && styles.triggerPlaceholder]}>
            {hasValue ? formatDisplay(value) : (placeholder || "Select date")}
          </Text>
          <Feather name="chevron-down" size={14} color="#555555" />
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />

            {/* Month navigation */}
            <View style={styles.monthNav}>
              <Pressable style={styles.navBtn} onPress={goToPrevMonth} hitSlop={12}>
                <Feather name="chevron-left" size={20} color="#ffffff" />
              </Pressable>
              <Pressable
                style={styles.monthLabel}
                onPress={() => {
                  setViewMonth(today.getMonth());
                  setViewYear(today.getFullYear());
                }}
              >
                <Text style={styles.monthText}>{MONTHS[viewMonth]} {viewYear}</Text>
                <Text style={styles.todayHint}>tap to jump to today</Text>
              </Pressable>
              <Pressable style={styles.navBtn} onPress={goToNextMonth} hitSlop={12}>
                <Feather name="chevron-right" size={20} color="#ffffff" />
              </Pressable>
            </View>

            {/* Day headers */}
            <View style={styles.dayHeaders}>
              {DAY_HEADERS.map((d) => (
                <Text key={d} style={styles.dayHeader}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
              {cells.map((cell, idx) => {
                const sel = cell.current && isSelected(cell.day);
                const tod = cell.current && isToday(cell.day);
                return (
                  <Pressable
                    key={idx}
                    style={[
                      styles.cell,
                      sel && styles.cellSelected,
                      tod && !sel && styles.cellToday,
                    ]}
                    onPress={() => cell.current && handleSelectDay(cell.day)}
                    disabled={!cell.current}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        !cell.current && styles.cellTextOther,
                        tod && !sel && styles.cellTextToday,
                        sel && styles.cellTextSelected,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Pressable style={styles.clearBtn} onPress={() => { onChange(""); setOpen(false); }}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
              <Pressable
                style={styles.todayBtn}
                onPress={() => {
                  const t = new Date();
                  handleSelectDay(t.getDate());
                  setViewMonth(t.getMonth());
                  setViewYear(t.getFullYear());
                }}
              >
                <Feather name="clock" size={13} color="#000000" />
                <Text style={styles.todayBtnText}>Today</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const CELL_SIZE = Math.floor((width - 48 - 24) / 7);

const styles = StyleSheet.create({
  trigger: {
    marginBottom: 12,
  },
  triggerLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#555555",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  triggerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111111",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#222222",
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  triggerPlaceholder: { color: "#555555" },

  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)" },
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

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  monthLabel: { alignItems: "center" },
  monthText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#ffffff" },
  todayHint: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#444444", marginTop: 2 },

  dayHeaders: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayHeader: {
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#444444",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: CELL_SIZE / 2,
  },
  cellSelected: {
    backgroundColor: "#ffffff",
  },
  cellToday: {
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  cellText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#ffffff",
  },
  cellTextOther: { color: "#2a2a2a" },
  cellTextToday: { color: "#ffffff", fontFamily: "Inter_700Bold" },
  cellTextSelected: { color: "#000000", fontFamily: "Inter_700Bold" },

  footer: {
    flexDirection: "row",
    gap: 10,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
  },
  clearBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#666666",
  },
  todayBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },
  todayBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
});
