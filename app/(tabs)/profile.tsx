import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { fmt } from "@/constants/currency";
import { supabase } from "@/lib/supabase";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const openURL = (url: string) => Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open link."));

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { profile, tasks, transactions, totalRevenue, totalExpenses, netProfit, updateProfile } = useData();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || profile?.name || "");
  const [editRole, setEditRole] = useState(profile?.role || "");
  const [editCompany, setEditCompany] = useState(profile?.company || "");
  const [saving, setSaving] = useState(false);

  const displayName = profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Founder";
  const initials = getInitials(displayName);
  const tasksCompleted = tasks.filter((t) => t.status === "done").length;
  const completionRate = tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0;

  const COMP_EMAILS = new Set([
    "arjun27mittal@gmail.com",
    "trackednowcto@gmail.com",
    "shailjathakur2006@gmail.com",
    "shailjamittal2006@gmail.com",
  ]);
  const isCompUser = !!user?.email && COMP_EMAILS.has(user.email);

  const handleEditOpen = () => {
    setEditName(profile?.full_name || profile?.name || "");
    setEditRole(profile?.role || "");
    setEditCompany(profile?.company || "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ full_name: editName, role: editRole, company: editCompany });
    setSaving(false);
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          signOut();
        },
      },
    ]);
  };

  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your CEO AI account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData?.session?.access_token ?? "";
              const res = await fetch(`${API_BASE}/api/account`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                await signOut();
              } else {
                Alert.alert("Error", data.error || "Failed to delete account.");
              }
            } catch (err) {
              Alert.alert("Error", "Something went wrong. Please try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Profile</Text>

      {/* Profile Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroRole}>{profile?.role || "CEO"}</Text>
            {profile?.company ? (
              <View style={styles.companyRow}>
                <Feather name="briefcase" size={11} color="#555555" />
                <Text style={styles.heroCompany}>{profile.company}</Text>
              </View>
            ) : null}
          </View>
          <Pressable style={styles.editBtn} onPress={handleEditOpen}>
            <Feather name="edit-2" size={15} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.planRow}>
          <View style={styles.planLeft}>
            <Feather name="cpu" size={14} color="#ffffff" />
            <Text style={styles.planName}>CEO AI</Text>
          </View>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>
        {isCompUser ? (
          <View style={styles.vipBadge}>
            <Feather name="star" size={11} color="#000000" />
            <Text style={styles.vipText}>VIP Access</Text>
          </View>
        ) : null}
      </View>

      {/* Financial Stats */}
      <Text style={styles.sectionLabel}>FINANCIALS</Text>
      <View style={styles.finGrid}>
        <View style={styles.finCard}>
          <Feather name="trending-up" size={16} color="#ffffff" style={{ marginBottom: 8 }} />
          <Text style={styles.finValue}>{fmt(totalRevenue, true)}</Text>
          <Text style={styles.finLabel}>Total Revenue</Text>
        </View>
        <View style={styles.finCard}>
          <Feather name="trending-down" size={16} color="#888888" style={{ marginBottom: 8 }} />
          <Text style={[styles.finValue, { color: "#888888" }]}>{fmt(totalExpenses, true)}</Text>
          <Text style={styles.finLabel}>Total Expenses</Text>
        </View>
        <View style={styles.finCard}>
          <Feather name="activity" size={16} color="#ffffff" style={{ marginBottom: 8 }} />
          <Text style={styles.finValue}>
            {netProfit >= 0 ? "+" : ""}{fmt(Math.abs(netProfit), true)}
          </Text>
          <Text style={styles.finLabel}>Net Profit</Text>
        </View>
        <View style={styles.finCard}>
          <Feather name="list" size={16} color="#888888" style={{ marginBottom: 8 }} />
          <Text style={styles.finValue}>{transactions.length}</Text>
          <Text style={styles.finLabel}>Transactions</Text>
        </View>
      </View>

      {/* Task Performance */}
      <Text style={styles.sectionLabel}>PERFORMANCE</Text>
      <View style={styles.perfCard}>
        <View style={styles.perfRow}>
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{tasks.length}</Text>
            <Text style={styles.perfLabel}>Total Tasks</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{tasksCompleted}</Text>
            <Text style={styles.perfLabel}>Completed</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{completionRate}%</Text>
            <Text style={styles.perfLabel}>Success Rate</Text>
          </View>
        </View>
        <View style={styles.rateBarBg}>
          <View style={[styles.rateBarFill, { width: `${completionRate}%` as any }]} />
        </View>
        <Text style={styles.rateHint}>
          {completionRate >= 70
            ? "Great completion rate! Keep it up."
            : "Complete more tasks to improve your rate."}
        </Text>
      </View>

      {/* Account Settings */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.menuCard}>
        <MenuItem icon="user" label="Edit Profile" onPress={handleEditOpen} />
        <MenuSep />
        <MenuItem
          icon="bell"
          label="Notifications"
          onPress={() => Alert.alert("Notifications", "Push notification settings coming soon.")}
        />
      </View>

      {/* Legal & Support */}
      <Text style={styles.sectionLabel}>LEGAL & SUPPORT</Text>
      <View style={styles.menuCard}>
        <MenuItem
          icon="file-text"
          label="Terms of Service"
          onPress={() => openURL("https://ceoai-policy-center.lovable.app/terms")}
          external
        />
        <MenuSep />
        <MenuItem
          icon="shield"
          label="Privacy Policy"
          onPress={() => openURL("https://ceoai-policy-center.lovable.app/privacy")}
          external
        />
        <MenuSep />
        <MenuItem
          icon="mail"
          label="Contact Us"
          onPress={() => openURL("https://ceoai-policy-center.lovable.app/contact")}
          external
        />
        <MenuSep />
        <MenuItem
          icon="help-circle"
          label="Help & Support"
          onPress={() => openURL("https://ceoai-policy-center.lovable.app/contact")}
          external
        />
      </View>

      {/* About */}
      <Text style={styles.sectionLabel}>ABOUT</Text>
      <View style={styles.menuCard}>
        <MenuItem
          icon="star"
          label="Rate CEO AI"
          onPress={() => Alert.alert("Rate us", "Rating will be available when the app launches on the App Store.")}
        />
        <MenuSep />
        <View style={styles.menuItem}>
          <View style={styles.menuIconWrap}>
            <Feather name="info" size={16} color="#888888" />
          </View>
          <Text style={styles.menuLabel}>Version</Text>
          <Text style={styles.menuVersion}>1.0.0</Text>
        </View>
      </View>

      {/* Danger Zone */}
      <Text style={styles.sectionLabel}>DANGER ZONE</Text>
      <View style={[styles.menuCard, styles.dangerCard]}>
        {deleting ? (
          <View style={styles.menuItem}>
            <View style={[styles.menuIconWrap, styles.menuIconDanger]}>
              <ActivityIndicator size="small" color="#888888" />
            </View>
            <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Deleting account...</Text>
          </View>
        ) : (
          <MenuItem
            icon="trash-2"
            label="Delete Account"
            onPress={handleDeleteAccount}
            danger
            external
          />
        )}
      </View>

      {/* Sign Out */}
      <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
        <Feather name="log-out" size={18} color="#ffffff" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.emailText}>{user?.email}</Text>
      <Text style={styles.versionText}>CEO AI · v1.0.0</Text>

      {/* Edit Modal */}
      <Modal
        visible={editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setEditing(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Profile</Text>
              <Pressable style={styles.sheetClose} onPress={() => setEditing(false)} hitSlop={12}>
                <Feather name="x" size={18} color="#888888" />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#555555"
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Role (e.g., Founder & CEO)"
              placeholderTextColor="#555555"
              value={editRole}
              onChangeText={setEditRole}
            />
            <TextInput
              style={styles.input}
              placeholder="Company name"
              placeholderTextColor="#555555"
              value={editCompany}
              onChangeText={setEditCompany}
            />
            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
  external,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  danger?: boolean;
  external?: boolean;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
        <Feather name={icon} size={16} color={danger ? "#888888" : "#888888"} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Feather name={external ? "external-link" : "chevron-right"} size={14} color="#2a2a2a" />
    </Pressable>
  );
}

function MenuSep() {
  return <View style={styles.menuSep} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#ffffff", marginBottom: 20 },

  heroCard: {
    backgroundColor: "#0d0d0d", borderRadius: 24,
    padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: "#1a1a1a",
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#000000" },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#ffffff" },
  heroRole: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#888888", marginTop: 2 },
  companyRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  heroCompany: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555555" },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#2a2a2a",
  },
  heroDivider: { height: 1, backgroundColor: "#1a1a1a", marginVertical: 16 },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#ffffff" },
  activeBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1a1a1a", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#2a2a2a",
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffffff" },
  activeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#ffffff" },
  vipBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#ffffff",
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5,
    marginTop: 12, alignSelf: "center",
  },
  vipText: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#000000",
  },

  sectionLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#444444",
    letterSpacing: 1.5, marginBottom: 12,
  },

  finGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  finCard: {
    width: "47%", flexGrow: 1,
    backgroundColor: "#0d0d0d", borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: "#1a1a1a",
  },
  finValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#ffffff", marginBottom: 4 },
  finLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555555" },

  perfCard: {
    backgroundColor: "#0d0d0d", borderRadius: 20,
    padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: "#1a1a1a",
  },
  perfRow: { flexDirection: "row", marginBottom: 16 },
  perfItem: { flex: 1, alignItems: "center" },
  perfDivider: { width: 1, backgroundColor: "#1a1a1a" },
  perfValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#ffffff", marginBottom: 4 },
  perfLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555555" },
  rateBarBg: { height: 4, backgroundColor: "#1a1a1a", borderRadius: 2, marginBottom: 10 },
  rateBarFill: { height: 4, borderRadius: 2, backgroundColor: "#ffffff" },
  rateHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#444444" },

  menuCard: {
    backgroundColor: "#0d0d0d", borderRadius: 18,
    marginBottom: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "#1a1a1a",
  },
  dangerCard: { borderColor: "#2a1a1a" },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    gap: 14, paddingVertical: 16, paddingHorizontal: 16,
  },
  menuIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#141414", alignItems: "center", justifyContent: "center",
  },
  menuIconDanger: { backgroundColor: "#1a0f0f" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#ffffff" },
  menuLabelDanger: { color: "#cc4444" },
  menuVersion: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#444444" },
  menuSep: { height: 1, backgroundColor: "#141414", marginLeft: 62 },

  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "#0d0d0d",
    borderRadius: 18, padding: 17, marginBottom: 16,
    borderWidth: 1, borderColor: "#222222",
  },
  signOutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#ffffff" },
  emailText: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: "#333333", textAlign: "center", marginBottom: 4,
  },
  versionText: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: "#2a2a2a", textAlign: "center",
  },

  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    backgroundColor: "#0d0d0d",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12,
    borderTopWidth: 1, borderColor: "#1e1e1e",
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#2a2a2a", alignSelf: "center", marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#ffffff" },
  sheetClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center",
  },
  input: {
    backgroundColor: "#141414", borderRadius: 14,
    padding: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: "#ffffff",
    marginBottom: 12, borderWidth: 1, borderColor: "#222222",
  },
  saveBtn: {
    backgroundColor: "#ffffff", borderRadius: 16,
    paddingVertical: 17, alignItems: "center", marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000000" },
});
