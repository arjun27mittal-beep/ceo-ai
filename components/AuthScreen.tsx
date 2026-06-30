import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";

interface Props {
  onSuccess: () => void;
}

const openURL = (url: string) => Linking.openURL(url).catch(() => {});

export default function AuthScreen({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const isSignUp = mode === "signup";

  // Clean up cooldown timer on unmount
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async () => {
    if (cooldown > 0) {
      Alert.alert("Slow down", `Please wait ${cooldown}s before trying again.`);
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (isSignUp && !fullName.trim()) {
      Alert.alert("Missing name", "Please enter your full name.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasLower || !hasUpper || !hasDigit) {
      Alert.alert(
        "Weak password",
        "Password must include at least one lowercase letter, one uppercase letter, and one number."
      );
      return;
    }
    if (isSignUp && !termsAccepted) {
      Alert.alert(
        "Terms required",
        "Please accept the Terms of Service and Privacy Policy to continue."
      );
      return;
    }

    setLoading(true);
    const result = isSignUp
      ? await signUp(email.trim(), password, fullName.trim())
      : await signIn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      const errLower = result.error.toLowerCase();
      if (errLower.includes("rate limit") || errLower.includes("too many")) {
        Alert.alert(
          "Too many attempts",
          "This email or IP has hit the sign-up limit. Please wait 10–60 seconds and try again."
        );
      } else {
        Alert.alert("Error", result.error);
      }
      // Start a 10-second client-side cooldown to prevent rapid spam
      setCooldown(10);
    } else {
      if (isSignUp) {
        onSuccess();
      } else {
        onSuccess();
      }
    }
  };

  const submitDisabled = loading || (isSignUp && !termsAccepted) || cooldown > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Feather name="cpu" size={26} color="#000000" />
          </View>
          <Text style={styles.appName}>CEO AI</Text>
        </View>

        <Text style={styles.title}>{isSignUp ? "Create account" : "Welcome back"}</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? "Start managing your business" : "Sign in to your account"}
        </Text>

        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Feather name="user" size={16} color="#555555" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#555555"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Feather name="mail" size={16} color="#555555" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#555555"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={16} color="#555555" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 48 }]}
              placeholder="Password"
              placeholderTextColor="#555555"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              hitSlop={10}
            >
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="#555555" />
            </Pressable>
          </View>

          {/* Terms checkbox — only on sign-up, unchecked by default (Apple requirement) */}
          {isSignUp && (
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Feather name="check" size={12} color="#000000" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the{" "}
                <Text
                  style={styles.checkboxLink}
                  onPress={() =>
                    openURL("https://ceoai-policy-center.lovable.app/terms")
                  }
                >
                  Terms of Service
                </Text>
                {" "}and{" "}
                <Text
                  style={styles.checkboxLink}
                  onPress={() =>
                    openURL("https://ceoai-policy-center.lovable.app/privacy")
                  }
                >
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.primaryButton, submitDisabled && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitDisabled}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : cooldown > 0 ? (
              <Text style={styles.primaryButtonText}>Wait {cooldown}s</Text>
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Toggle sign-in / sign-up */}
        <Pressable
          onPress={() => {
            setMode(isSignUp ? "signin" : "signup");
            setTermsAccepted(false);
          }}
          style={styles.toggleRow}
          hitSlop={10}
        >
          <Text style={styles.toggleText}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <Text style={styles.toggleLink}>{isSignUp ? "Sign in" : "Sign up"}</Text>
          </Text>
        </Pressable>

        {/* Legal footer links */}
        <View style={styles.legalRow}>
          <Pressable
            onPress={() => openURL("https://ceoai-policy-center.lovable.app/terms")}
            hitSlop={6}
          >
            <Text style={styles.legalLink}>Terms</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable
            onPress={() => openURL("https://ceoai-policy-center.lovable.app/privacy")}
            hitSlop={6}
          >
            <Text style={styles.legalLink}>Privacy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  scroll: { paddingHorizontal: 28 },
  logoContainer: { alignItems: "center", marginBottom: 44, gap: 12 },
  logo: {
    width: 72,
    height: 72,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 2,
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginBottom: 36,
  },
  form: { gap: 14, marginBottom: 28 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
  },
  inputIcon: { paddingLeft: 16 },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginTop: 1,
    borderWidth: 1.5,
    borderColor: "#444444",
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: 20,
  },
  checkboxLink: {
    color: "#999999",
    fontFamily: "Inter_500Medium",
    textDecorationLine: "underline",
  },
  primaryButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.35 },
  primaryButtonText: {
    color: "#000000",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  toggleRow: { alignItems: "center", marginBottom: 20 },
  toggleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  toggleLink: { color: "#ffffff", fontFamily: "Inter_700Bold" },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#444444",
    textDecorationLine: "underline",
  },
  legalDot: { fontSize: 12, color: "#333333" },
});
