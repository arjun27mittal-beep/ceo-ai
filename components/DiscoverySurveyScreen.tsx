import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export const SURVEY_ANSWERS_KEY = "ceoai_survey_answers";

interface ChoiceQuestion {
  id: number;
  type: "choice";
  text: string;
  options: string[];
}

interface TextQuestion {
  id: number;
  type: "text";
  text: string;
  placeholder: string;
}

type Question = ChoiceQuestion | TextQuestion;

const QUESTIONS: Question[] = [
  {
    id: 1,
    type: "choice",
    text: "What's your primary business goal right now?",
    options: [
      "Grow revenue & sales",
      "Reduce costs & optimize spending",
      "Get funding or investment",
      "Launch my product or service",
      "Scale operations & team",
    ],
  },
  {
    id: 2,
    type: "choice",
    text: "Why do you want to use CEO AI?",
    options: [
      "Track revenue & expenses",
      "Get AI business advice",
      "Manage tasks & goals",
      "All of the above",
      "Just exploring for now",
    ],
  },
  {
    id: 3,
    type: "choice",
    text: "How did you hear about us?",
    options: [
      "Social media (Twitter, LinkedIn, etc.)",
      "Friend or colleague referral",
      "App Store or Play Store",
      "Search engine (Google, etc.)",
      "Other",
    ],
  },
  {
    id: 4,
    type: "choice",
    text: "What stage is your business in?",
    options: [
      "Just an idea / pre-launch",
      "Early stage — getting first customers",
      "Generating consistent revenue",
      "Scaling & growing fast",
      "Established & looking to optimize",
    ],
  },
  {
    id: 5,
    type: "choice",
    text: "What's your biggest business challenge?",
    options: [
      "Finding & keeping customers",
      "Managing cash flow & finances",
      "Building the right product",
      "Marketing & sales",
      "Hiring & managing a team",
    ],
  },
  {
    id: 6,
    type: "text",
    text: "Tell us about your business or idea.",
    placeholder: "e.g. SaaS app for restaurants, freelance design studio, e-commerce clothing brand...",
  },
];

interface Props {
  onFinish: (answers: Record<number, string>) => void;
}

export default function DiscoverySurveyScreen({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [textValue, setTextValue] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const q = QUESTIONS[current];

  const isTextQ = q.type === "text";
  const canAdvance = isTextQ ? textValue.trim().length > 0 : selectedIndex !== null;

  // Animated progress
  const progressAnim = useRef(new Animated.Value(0)).current;
  const targetProgress = (current + (canAdvance ? 1 : 0)) / QUESTIONS.length;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [targetProgress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // Card opacity animation on question change
  const cardOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    cardOpacity.setValue(0);
    Animated.timing(cardOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [animKey, cardOpacity]);

  const pickOption = (index: number) => {
    const q = QUESTIONS[current] as ChoiceQuestion;
    setSelectedIndex(index);
    setAnswers((prev) => ({ ...prev, [q.id]: q.options[index] }));
  };

  const next = async () => {
    if (!canAdvance) return;

    const currentQ = QUESTIONS[current];
    const newAnswers = isTextQ
      ? { ...answers, [currentQ.id]: textValue.trim() }
      : answers;

    setAnswers(newAnswers);

    if (current < QUESTIONS.length - 1) {
      setCurrent((c) => c + 1);
      setSelectedIndex(null);
      setTextValue("");
      setAnimKey((k) => k + 1);
    } else {
      await AsyncStorage.setItem(SURVEY_ANSWERS_KEY, JSON.stringify(newAnswers));
      setDone(true);
    }
  };

  if (done) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.resultTop}>
          <View style={styles.resultCircle}>
            <Text style={styles.resultEmoji}>🎯</Text>
          </View>
          <Text style={styles.resultTitle}>You're all set.</Text>
          <Text style={styles.resultSub}>
            Your CEO AI advisor is now personalized to your business. Let's build something great.
          </Text>
        </View>
        <View style={[styles.resultBottom, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable style={styles.ctaBtn} onPress={() => onFinish(answers)}>
            <Text style={styles.ctaBtnText}>Enter Dashboard</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.counter}>
          Question {current + 1}{" "}
          <Text style={styles.counterMuted}>/ {QUESTIONS.length}</Text>
        </Text>
      </View>

      {/* Question card */}
      <Animated.View
        key={animKey}
        style={[styles.card, { opacity: cardOpacity }]}
      >
        <Text style={styles.questionText}>{q.text}</Text>

        {isTextQ ? (
          <View style={styles.textInputWrapper}>
            <TextInput
              style={styles.textInputField}
              value={textValue}
              onChangeText={setTextValue}
              placeholder={(q as TextQuestion).placeholder}
              placeholderTextColor="#444444"
              multiline
              maxLength={300}
              autoFocus
            />
            <Text style={styles.charCount}>{textValue.length}/300</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.optionsScroll}
          >
            <View style={styles.options}>
              {(q as ChoiceQuestion).options.map((opt, i) => {
                const isSelected = selectedIndex === i;
                return (
                  <Pressable
                    key={i}
                    onPress={() => pickOption(i)}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                    ]}
                  >
                    <View style={styles.optionDot}>
                      {isSelected && (
                        <View style={styles.optionDotInner} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {/* Bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        {canAdvance ? (
          <Pressable style={styles.ctaBtn} onPress={next}>
            <Text style={styles.ctaBtnText}>
              {current === QUESTIONS.length - 1 ? "Finish" : "Next"}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.ctaPlaceholder}>
            <Text style={styles.ctaPlaceholderText}>
              {isTextQ ? "Describe your business above" : "Pick an answer above"}
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },

  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1e1e1e",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
  counter: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  counterMuted: {
    color: "#555555",
  },

  card: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  questionText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    lineHeight: 30,
    marginBottom: 28,
  },

  optionsScroll: {
    paddingBottom: 20,
  },
  options: { gap: 10 },
  option: {
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  optionSelected: {
    borderColor: "#ffffff",
    backgroundColor: "#1a1a1a",
  },
  optionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#444444",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  optionText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#cccccc",
    lineHeight: 22,
    flex: 1,
    flexShrink: 1,
  },
  optionTextSelected: {
    color: "#ffffff",
    fontFamily: "Inter_600SemiBold",
  },

  textInputWrapper: {
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    padding: 16,
    minHeight: 140,
  },
  textInputField: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    textAlign: "right",
    marginTop: 8,
  },

  bottom: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  ctaBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  ctaPlaceholder: {
    backgroundColor: "#111111",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
  },
  ctaPlaceholderText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#555555",
  },

  resultTop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  resultCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  resultEmoji: {
    fontSize: 44,
  },
  resultTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 34,
  },
  resultSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#777777",
    textAlign: "center",
    lineHeight: 23,
  },
  resultBottom: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
