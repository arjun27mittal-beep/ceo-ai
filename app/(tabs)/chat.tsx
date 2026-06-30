import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { supabase } from "@/lib/supabase";
import { SURVEY_ANSWERS_KEY } from "@/components/DiscoverySurveyScreen";
import { useSubscription } from "@/lib/revenuecat";
import PaywallScreen from "@/components/PaywallScreen";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const SUGGESTED = [
  "How do I grow MRR faster?",
  "Should I raise a seed round?",
  "Help me prioritize my Q3 roadmap",
  "How do I reduce churn below 2%?",
];

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const SURVEY_LABELS: Record<number, string> = {
  1: "Primary goal",
  2: "Reason for using CEO AI",
  3: "How they found us",
  4: "Business stage",
  5: "Biggest challenge",
  6: "Business description",
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { totalRevenue, totalExpenses, netProfit, mrr, tasks, goals, profile } = useData();
  const { isSubscribed, isLoading: subLoading } = useSubscription();

  // ── ALL hooks must be declared before any conditional return ──
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>({});
  const flatListRef = useRef<FlatList>(null);

  // Load survey answers from AsyncStorage for AI context
  useEffect(() => {
    AsyncStorage.getItem(SURVEY_ANSWERS_KEY).then((raw) => {
      if (raw) {
        try {
          setSurveyAnswers(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  // Load chat history from Supabase
  useEffect(() => {
    if (!user) {
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (!cancelled) {
        if (data && !error) setMessages(data as Message[]);
        setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // buildSystemPrompt is a regular function (no hooks) — defined here so it can
  // be referenced by sendMessage below. Both must be above the conditional return.
  const buildSystemPrompt = () => {
    const name = profile?.full_name || profile?.name || "Founder";
    const role = profile?.role || "CEO";
    const company = profile?.company || "your company";
    const tasksDue = tasks.filter(t => t.status === "todo").length;
    const goalsActive = goals.length;
    const completionRate = tasks.length > 0
      ? Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100)
      : 0;

    const surveyContext = Object.entries(surveyAnswers).length > 0
      ? "\nFounder profile (from onboarding survey):\n" +
        Object.entries(surveyAnswers)
          .map(([id, answer]) => `- ${SURVEY_LABELS[Number(id)] ?? `Q${id}`}: ${answer}`)
          .join("\n")
      : "";

    const businessDesc = surveyAnswers[6] ? `\nBusiness: ${surveyAnswers[6]}` : "";
    const stage = surveyAnswers[4] ? `\nStage: ${surveyAnswers[4]}` : "";
    const challenge = surveyAnswers[5] ? `\nBiggest challenge: ${surveyAnswers[5]}` : "";
    const primaryGoal = surveyAnswers[1] ? `\nPrimary goal: ${surveyAnswers[1]}` : "";

    return `You are CEO AI, a strategic executive advisor for ${name}, ${role} at ${company}.${businessDesc}${stage}${primaryGoal}${challenge}

Live business data:
- MRR (this month's revenue): $${mrr.toFixed(0)}
- Total All-Time Revenue: $${totalRevenue.toFixed(0)}
- Total All-Time Expenses: $${totalExpenses.toFixed(0)}
- Net Profit: $${netProfit.toFixed(0)}
- Open Tasks: ${tasksDue}
- Active Goals: ${goalsActive}
- Task Completion Rate: ${completionRate}%
${surveyContext}
You are a world-class business advisor with deep expertise in startup strategy, fundraising, growth, hiring, and execution. Tailor ALL advice specifically to the founder's business type, stage, and challenges above. Give direct, actionable, honest advice. Reference their specific numbers when relevant. Be concise but insightful. Speak like a trusted co-founder who deeply understands their specific business, not a generic consultant. Never give generic advice — always tie it back to their specific business context.`;
  };

  // ── useCallback hook: must be declared BEFORE any conditional return ──
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const tempId = `user_${Date.now()}`;
    const userMsg: Message = {
      id: tempId,
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [userMsg, ...prev]);
    setInputText("");
    setIsLoading(true);

    try {
      const historyForContext = [...messages].slice(0, 20).reverse();
      const openaiMessages = [
        { role: "system", content: buildSystemPrompt() },
        ...historyForContext.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: text.trim() },
      ];

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token ?? "";

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ messages: openaiMessages }),
      });

      const data = await response.json();
      let reply: string;
      if (response.status === 429 || data.error === "rate_limited") {
        reply = data.message ?? "You can send up to 3 messages per minute. Please wait a moment.";
      } else if (response.status === 403 && data.error === "subscription_required") {
        reply = "CEO AI Premium subscription required. Please subscribe to continue using AI chat.";
      } else if (response.status === 503 && data.error === "subscription_unavailable") {
        reply = "Couldn't verify your subscription right now. Please try again in a moment.";
      } else if (response.ok && !data.error) {
        reply = data.content || "Something went wrong. Please try again.";
      } else {
        reply = "I'm having trouble connecting right now. Please check your internet and try again.";
      }

      const assistantMsg: Message = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: reply,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [assistantMsg, ...prev]);

      if (user) {
        const { data: inserted } = await supabase
          .from("chat_messages")
          .insert([
            { user_id: user.id, role: "user", content: text.trim() } as any,
            { user_id: user.id, role: "assistant", content: reply } as any,
          ])
          .select("id, role, content, created_at");
        if (inserted && inserted.length === 2) {
          setMessages(prev => prev.map(m => {
            if (m.id === tempId) return { ...m, id: (inserted as any)[0].id };
            if (m.id === assistantMsg.id) return { ...m, id: (inserted as any)[1].id };
            return m;
          }));
        }
      }
    } catch {
      setMessages(prev => [{
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "Connection error. Please check your internet and try again.",
        created_at: new Date().toISOString(),
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, user, mrr, totalRevenue, totalExpenses, netProfit, tasks, goals, profile, surveyAnswers]);

  // ── ALL hooks above this line. Conditional renders below. ──
  if (!subLoading && !isSubscribed) {
    return <PaywallScreen onSuccess={() => {}} />;
  }

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Chat History",
      "This will permanently delete all your conversation history with CEO AI.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            if (user) {
              await supabase.from("chat_messages").delete().eq("user_id", user.id);
            }
            setMessages([]);
          },
        },
      ]
    );
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === "user";
    const nextMsg = messages[index + 1];
    const showDateSep = !nextMsg || formatDate(nextMsg.created_at) !== formatDate(item.created_at);

    return (
      <>
        <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
          {!isUser && (
            <View style={styles.msgAvatar}>
              <Feather name="cpu" size={13} color="#000000" />
            </View>
          )}
          <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.msgText, isUser && styles.userText]}>{item.content}</Text>
            <Text style={[styles.msgTime, isUser && styles.userTime]}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
        {showDateSep && (
          <View style={styles.dateSep}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
      </>
    );
  };

  const isEmpty = messages.length === 0 && !historyLoading;

  // Show a loading screen while subscription status is resolving
  if (subLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Feather name="cpu" size={18} color="#000000" />
          </View>
          <View>
            <Text style={styles.headerTitle}>CEO AI</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>
                {historyLoading ? "Loading history..." : "Online"}
              </Text>
            </View>
          </View>
        </View>
        {messages.length > 0 && (
          <Pressable onPress={handleClearHistory} style={styles.headerBtn} hitSlop={8}>
            <Feather name="trash-2" size={17} color="#555555" />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {historyLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyAvatar}>
              <Feather name="cpu" size={28} color="#000000" />
            </View>
            <Text style={styles.emptyTitle}>Your AI CEO Advisor</Text>
            <Text style={styles.emptySubtitle}>
              Ask me anything about strategy, fundraising, growth, or execution.
            </Text>
            <Text style={styles.emptyLabel}>SUGGESTED QUESTIONS</Text>
            <View style={styles.suggestGrid}>
              {SUGGESTED.map((s, i) => (
                <Pressable key={i} style={styles.suggestChip} onPress={() => sendMessage(s)}>
                  <Text style={styles.suggestText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListHeaderComponent={isLoading ? (
              <View style={styles.typingRow}>
                <View style={styles.msgAvatar}>
                  <Feather name="cpu" size={13} color="#000000" />
                </View>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, { opacity: 0.6 }]} />
                    <View style={[styles.typingDot, { opacity: 0.3 }]} />
                  </View>
                </View>
              </View>
            ) : null}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 70 }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask your CEO AI advisor..."
              placeholderTextColor="#555555"
              multiline
              maxLength={1000}
              onSubmitEditing={() => {
                if (Platform.OS !== "ios") sendMessage(inputText);
              }}
            />
            <Pressable
              style={[styles.sendBtn, (inputText.trim() && !isLoading) && styles.sendBtnActive]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#555555" />
              ) : (
                <Feather name="send" size={18} color={inputText.trim() ? "#000000" : "#555555"} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#ffffff" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffffff" },
  onlineText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555555" },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#111111", alignItems: "center", justifyContent: "center",
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#555555" },
  emptyContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 40, alignItems: "center" },
  emptyAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#ffffff",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#ffffff", marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#555555",
    textAlign: "center", lineHeight: 22, marginBottom: 32,
  },
  emptyLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#555555",
    letterSpacing: 1.2, marginBottom: 16, alignSelf: "flex-start",
  },
  suggestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  suggestChip: {
    backgroundColor: "#111111", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: "#222222", width: "48%",
  },
  suggestText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#cccccc", lineHeight: 19 },
  messageList: { paddingHorizontal: 16, paddingTop: 16 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },
  msgRowUser: { flexDirection: "row-reverse" },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  msgBubble: { maxWidth: "78%", borderRadius: 18, padding: 14 },
  aiBubble: { backgroundColor: "#111111", borderWidth: 1, borderColor: "#222222" },
  userBubble: { backgroundColor: "#ffffff" },
  msgText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#ffffff", lineHeight: 22 },
  userText: { color: "#000000" },
  msgTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555555", marginTop: 6 },
  userTime: { color: "#888888", textAlign: "right" },
  dateSep: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 },
  dateLine: { flex: 1, height: 1, backgroundColor: "#1a1a1a" },
  dateText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#444444" },
  typingRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },
  typingBubble: {
    backgroundColor: "#111111", borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "#222222",
  },
  typingDots: { flexDirection: "row", gap: 4, alignItems: "center" },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#888888" },
  inputBar: {
    borderTopWidth: 1, borderTopColor: "#1a1a1a",
    paddingTop: 12, paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    backgroundColor: "#111111", borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: "#222222",
  },
  textInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular",
    color: "#ffffff", maxHeight: 100, paddingVertical: 6,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center",
  },
  sendBtnActive: { backgroundColor: "#ffffff" },
});
