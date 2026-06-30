import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useSubscription } from "@/lib/revenuecat";

const FEATURES = [
  "Unlimited AI business advice",
  "Personalized strategy from survey data",
  "Priority AI responses",
  "Advanced revenue analytics",
  "Export financial reports",
];

interface Props {
  onSuccess?: () => void;
}

export default function PaywallScreen({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const { offerings, isLoading, purchase, isPurchasing, restore, isRestoring } = useSubscription();
  const [selected, setSelected] = useState<"monthly" | "annual" | null>("annual");

  const current = offerings?.current;
  const monthlyPkg = current?.availablePackages.find((p: any) => p.packageType === "MONTHLY");
  const annualPkg = current?.availablePackages.find((p: any) => p.packageType === "ANNUAL");

  const monthlyPrice = monthlyPkg?.product.priceString ?? "$9.99";
  const annualPrice = annualPkg?.product.priceString ?? "$99.99";
  const annualMonthlyEquiv = annualPkg?.product.price
    ? `$${(annualPkg.product.price / 12).toFixed(2)}/mo`
    : "$8.33/mo";

  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open link."));
  };

  const handlePurchase = async () => {
    const pkg = selected === "annual" ? annualPkg : monthlyPkg;
    if (!pkg) {
      Alert.alert(
        "Not Available",
        "Subscription plans couldn't be loaded. Please check your connection and try again."
      );
      return;
    }

    if (__DEV__ || Platform.OS === "web") {
      Alert.alert(
        "Test Purchase",
        `Confirm test purchase of ${pkg.product.title} for ${pkg.product.priceString}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Purchase",
            onPress: async () => {
              try {
                await purchase(pkg);
                onSuccess?.();
              } catch (e: any) {
                if (e?.userCancelled) return;
                Alert.alert("Purchase Failed", e?.message ?? "Purchase failed. Please try again.");
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await purchase(pkg);
      onSuccess?.();
    } catch (e: any) {
      if (e?.userCancelled) return;
      Alert.alert("Purchase Failed", e?.message ?? "Purchase failed. Please try again.");
    }
  };

  const handleRestore = async () => {
    try {
      const restoredInfo = await restore();
      // Check the returned customerInfo directly — not the stale context state
      const hasPremium =
        restoredInfo?.entitlements?.active?.["premium"] !== undefined;
      if (hasPremium) {
        Alert.alert("Restored!", "Your premium access has been restored.", [
          { text: "Continue", onPress: () => onSuccess?.() },
        ]);
      } else {
        Alert.alert("No Purchases Found", "No previous premium purchases were found.");
      }
    } catch (e: any) {
      Alert.alert("Restore Failed", e?.message ?? "Could not restore purchases. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center", gap: 16 }]}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Feather name="star" size={32} color="#000000" />
          </View>
          <Text style={styles.title}>Unlock CEO AI Premium</Text>
          <Text style={styles.subtitle}>
            Get unlimited AI business advice tailored to your specific business.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Feather name="check" size={12} color="#000000" />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.plansLabel}>CHOOSE YOUR PLAN</Text>

          {/* Annual */}
          <Pressable
            style={[styles.planCard, selected === "annual" && styles.planCardSelected, styles.annualHighlight]}
            onPress={() => setSelected("annual")}
          >
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
            <View style={styles.planTop}>
              <Text style={styles.planPeriod}>Annual</Text>
              <Text style={styles.planPrice}>{annualPrice}</Text>
              <Text style={styles.planPeriodPrice}>{annualMonthlyEquiv} billed yearly</Text>
            </View>
            <View style={styles.savingsRow}>
              <Text style={styles.savingsText}>Save 2 months</Text>
            </View>
            {selected === "annual" && (
              <View style={styles.selectedIndicator}>
                <Feather name="check-circle" size={20} color="#ffffff" />
              </View>
            )}
          </Pressable>

          {/* Monthly */}
          <Pressable
            style={[styles.planCard, selected === "monthly" && styles.planCardSelected]}
            onPress={() => setSelected("monthly")}
          >
            <View style={styles.planTop}>
              <Text style={styles.planPeriod}>Monthly</Text>
              <Text style={styles.planPrice}>{monthlyPrice}</Text>
              <Text style={styles.planPeriodPrice}>Billed every month</Text>
            </View>
            {selected === "monthly" && (
              <View style={styles.selectedIndicator}>
                <Feather name="check-circle" size={20} color="#ffffff" />
              </View>
            )}
          </Pressable>
        </View>

        {/* CTA */}
        <View style={styles.ctaArea}>
          <Pressable
            style={[styles.ctaBtn, (!selected || isPurchasing) && styles.ctaBtnDisabled]}
            onPress={handlePurchase}
            disabled={!selected || isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.ctaBtnText}>
                {selected ? "Start Free Trial" : "Select a plan above"}
              </Text>
            )}
          </Pressable>

          <Text style={styles.trialNote}>
            3-day free trial. Cancel anytime. No commitment required.
          </Text>

          {/* Restore */}
          <Pressable onPress={handleRestore} disabled={isRestoring} style={styles.restoreRow}>
            <Text style={styles.footerLink}>
              {isRestoring ? "Restoring..." : "Restore Purchases"}
            </Text>
          </Pressable>

          {/* Legal links */}
          <View style={styles.legalRow}>
            <Pressable onPress={() => openURL("https://ceoai-policy-center.lovable.app/privacy")}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalDot}> · </Text>
            <Pressable onPress={() => openURL("https://ceoai-policy-center.lovable.app/terms")}>
              <Text style={styles.legalLink}>Terms</Text>
            </Pressable>
            <Text style={styles.legalDot}> · </Text>
            <Pressable onPress={() => openURL("https://ceoai-policy-center.lovable.app/delete")}>
              <Text style={styles.legalLink}>Delete Account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#777777" },

  header: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#777777",
    textAlign: "center",
    lineHeight: 22,
  },

  featuresCard: {
    backgroundColor: "#0d0d0d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    marginHorizontal: 24,
    padding: 20,
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#cccccc",
  },

  plansSection: {
    marginTop: 28,
    paddingHorizontal: 24,
    gap: 12,
  },
  plansLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#555555",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  planCard: {
    backgroundColor: "#0d0d0d",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#1e1e1e",
    padding: 20,
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#ffffff",
    backgroundColor: "#151515",
  },
  annualHighlight: {
    borderColor: "#333333",
  },
  bestValueBadge: {
    position: "absolute",
    top: -1,
    right: 20,
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestValueText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#000000",
    letterSpacing: 0.5,
  },
  planTop: { alignItems: "center" },
  planPeriod: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 2,
  },
  planPeriodPrice: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#777777",
  },
  savingsRow: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savingsText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#aaaaaa",
  },
  selectedIndicator: {
    position: "absolute",
    top: 16,
    left: 16,
  },

  ctaArea: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 14,
  },
  ctaBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaBtnDisabled: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333333",
  },
  ctaBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  trialNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#555555",
    textAlign: "center",
    lineHeight: 18,
  },

  restoreRow: {
    alignItems: "center",
    marginTop: 4,
  },
  footerLink: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#666666",
    textDecorationLine: "underline",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 16,
    flexWrap: "wrap",
  },
  legalLink: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#444444",
  },
  legalDot: {
    fontSize: 11,
    color: "#333333",
  },
});
