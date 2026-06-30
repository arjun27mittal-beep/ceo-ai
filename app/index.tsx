import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OnboardingScreen from "@/components/OnboardingScreen";
import AuthScreen from "@/components/AuthScreen";
import DiscoverySurveyScreen from "@/components/DiscoverySurveyScreen";
import PaywallScreen from "@/components/PaywallScreen";
import { useAuth } from "@/context/AuthContext";

// Bumped to v2 to force a one-time reset so slides show again
const ONBOARDING_KEY = "ceoai_onboarding_seen_v2";
const SURVEY_DONE_KEY = "ceoai_survey_done";

// Comp emails: bypass paywall
const COMP_EMAILS = new Set([
  "arjun27mittal@gmail.com",
  "trackednowcto@gmail.com",
  "shailjathakur2006@gmail.com",
  "shailjamittal2006@gmail.com",
]);

type AppState = "loading" | "slides" | "auth" | "survey" | "paywall" | "tabs";

function isCompEmail(email: string | undefined): boolean {
  return !!email && COMP_EMAILS.has(email);
}

export default function EntryScreen() {
  const { session, user, loading } = useAuth();
  const [appState, setAppState] = useState<AppState>("loading");

  useEffect(() => {
    if (loading) return;

    if (session) {
      // Logged in: check if survey already completed for this user
      const surveyKey = user?.id ? `${SURVEY_DONE_KEY}_${user.id}` : null;
      if (surveyKey) {
        AsyncStorage.getItem(surveyKey).then((done) => {
          if (done === "true") {
            router.replace("/(tabs)");
          } else {
            setAppState("survey");
          }
        });
      } else {
        setAppState("survey");
      }
      return;
    }

    // Logged out: always show slides first, then auth
    AsyncStorage.getItem(ONBOARDING_KEY).then((seen) => {
      setAppState(seen === "true" ? "auth" : "slides");
    });
  }, [session, user, loading]);

  if (appState === "loading" || loading) {
    return <View style={styles.loading} />;
  }

  if (appState === "slides") {
    return (
      <OnboardingScreen
        onFinish={() => {
          AsyncStorage.setItem(ONBOARDING_KEY, "true");
          setAppState("auth");
        }}
      />
    );
  }

  if (appState === "auth") {
    return <AuthScreen onSuccess={() => setAppState("survey")} />;
  }

  if (appState === "survey") {
    return (
      <DiscoverySurveyScreen
        onFinish={(_answers) => {
          if (user?.id) {
            AsyncStorage.setItem(`${SURVEY_DONE_KEY}_${user.id}`, "true");
          }
          // Skip paywall for comp users
          if (isCompEmail(user?.email)) {
            router.replace("/(tabs)");
          } else {
            setAppState("paywall");
          }
        }}
      />
    );
  }

  if (appState === "paywall") {
    return (
      <PaywallScreen
        onSuccess={() => router.replace("/(tabs)")}
      />
    );
  }

  return <View style={styles.loading} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: "#000000" },
});
