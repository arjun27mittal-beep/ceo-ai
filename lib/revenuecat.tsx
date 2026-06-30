import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

// RevenueCat SDK: safe import for web (no native module)
let Purchases: any = null;
let LOG_LEVEL: any = null;
try {
  const rc = require("react-native-purchases");
  Purchases = rc.default ?? rc;
  LOG_LEVEL = rc.LOG_LEVEL;
} catch {
  /* web / no native module */
}

const TEST_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const ENTITLEMENT = "premium";

const COMP_EMAILS = new Set([
  "arjun27mittal@gmail.com",
  "trackednowcto@gmail.com",
  "shailjathakur2006@gmail.com",
  "shailjamittal2006@gmail.com",
]);

function isWebOrMock(): boolean {
  return Platform.OS === "web" || !Purchases;
}

function getApiKey(): string {
  if (isWebOrMock()) return TEST_KEY ?? "";
  if (Platform.OS === "ios") return IOS_KEY ?? TEST_KEY ?? "";
  if (Platform.OS === "android") return ANDROID_KEY ?? TEST_KEY ?? "";
  return TEST_KEY ?? "";
}

export function initializeRevenueCat() {
  if (isWebOrMock()) {
    console.log("[RevenueCat] Web/mock mode — native SDK not available");
    return;
  }
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("RevenueCat API key not configured");
  Purchases.setLogLevel(LOG_LEVEL?.DEBUG ?? 0);
  Purchases.configure({ apiKey });
  console.log("[RevenueCat] Configured");
}

function useSubscriptionContext() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const userEmail = user?.email ?? "";
  const isComp = COMP_EMAILS.has(userEmail);

  const isMock = isWebOrMock();

  // Whether the RevenueCat native identity (logIn/logOut) has settled. Until it
  // has, we must NOT read customer info — doing so would read the anonymous
  // customer and briefly show the paywall to a paying user.
  const [rcReady, setRcReady] = useState(isMock);

  // Link the RevenueCat customer to the Supabase user ID. The server validates
  // subscriptions by querying RevenueCat for the customer whose ID equals the
  // Supabase user ID, so the client MUST identify with that same ID — otherwise
  // purchases land on an anonymous RevenueCat customer and validation fails.
  useEffect(() => {
    if (isMock) {
      setRcReady(true);
      return;
    }
    let cancelled = false;
    setRcReady(false);
    const settle = () => {
      if (cancelled) return;
      setRcReady(true);
      qc.invalidateQueries({ queryKey: ["rc", "customer"] });
    };
    if (user?.id) {
      Purchases.logIn(user.id)
        .then(settle)
        .catch((e: any) => {
          console.warn("[RevenueCat] logIn failed:", e?.message ?? e);
          settle();
        });
    } else {
      // Best effort: ignore "current user is anonymous" errors on logout.
      Purchases.logOut?.()
        .then(settle)
        .catch(() => settle());
    }
    return () => {
      cancelled = true;
    };
  }, [user?.id, isMock]);

  const customerInfo = useQuery({
    queryKey: ["rc", "customer", user?.id ?? null],
    queryFn: async () => {
      if (isMock) return null;
      return Purchases.getCustomerInfo();
    },
    enabled: isMock || rcReady,
    staleTime: 60 * 1000,
    retry: 2,
  });

  const offerings = useQuery({
    queryKey: ["rc", "offerings"],
    queryFn: async () => {
      if (isMock) {
        // Return a fake offering so the paywall UI renders
        return {
          current: {
            identifier: "default",
            availablePackages: [
              {
                identifier: "$rc_monthly",
                packageType: "MONTHLY",
                product: {
                  identifier: "ceoai_monthly",
                  title: "CEO AI Monthly",
                  priceString: "$9.99",
                  price: 9.99,
                },
              },
              {
                identifier: "$rc_annual",
                packageType: "ANNUAL",
                product: {
                  identifier: "ceoai_annual",
                  title: "CEO AI Annual",
                  priceString: "$99.99",
                  price: 99.99,
                },
              },
            ],
          },
        };
      }
      return Purchases.getOfferings();
    },
    staleTime: 300 * 1000,
    retry: 2,
  });

  const purchase = useMutation({
    mutationFn: async (pkg: any) => {
      if (isMock) {
        // Simulate purchase on web
        await new Promise((r) => setTimeout(r, 800));
        return { entitlements: { active: { [ENTITLEMENT]: {} } } };
      }
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      return info;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rc", "customer"] }),
  });

  const restore = useMutation({
    mutationFn: async () => {
      if (isMock) return null;
      return Purchases.restorePurchases();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rc", "customer"] }),
  });

  // Comp emails are always treated as subscribed (no paywall needed)
  const isSubscribed = isComp
    ? true
    : isMock
      ? purchase.isSuccess || restore.isSuccess
      : customerInfo.data?.entitlements?.active?.[ENTITLEMENT] !== undefined;

  return {
    customerInfo: customerInfo.data,
    offerings: offerings.data,
    isSubscribed,
    isLoading:
      !isComp &&
      !isMock &&
      (!rcReady || customerInfo.isLoading || offerings.isLoading),
    purchase: purchase.mutateAsync,
    restore: restore.mutateAsync,
    isPurchasing: purchase.isPending,
    isRestoring: restore.isPending,
  };
}

type Ctx = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<Ctx | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be inside SubscriptionProvider");
  return ctx;
}
