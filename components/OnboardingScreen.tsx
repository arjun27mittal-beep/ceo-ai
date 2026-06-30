import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image?: any;
  isLast?: boolean;
}

const slides: Slide[] = [
  {
    id: "1",
    eyebrow: "WELCOME",
    title: "Run your business\nlike a CEO.",
    subtitle: "Strategy, finance, tasks, and AI advice — everything a founder needs in one place.",
  },
  {
    id: "2",
    eyebrow: "DASHBOARD",
    title: "Your business,\nat a glance.",
    subtitle: "Track revenue, expenses, and goals in one powerful dashboard.",
    image: require("../assets/slide-dashboard.png"),
  },
  {
    id: "3",
    eyebrow: "CEO AI ADVISOR",
    title: "AI guidance,\nbuilt for founders.",
    subtitle: "Ask anything. Get clear, actionable answers from your AI advisor.",
    image: require("../assets/slide-chat.png"),
  },
  {
    id: "4",
    eyebrow: "ANALYTICS",
    title: "Track what matters.\nImprove every week.",
    subtitle: "Real-time analytics to understand your business performance.",
    image: require("../assets/slide-analytics.png"),
  },
  {
    id: "5",
    eyebrow: "GET STARTED",
    title: "Ready to build\nyour empire?",
    subtitle: "Join founders tracking their revenue, expenses, and goals with CEO AI.",
    isLast: true,
  },
];

interface Props {
  onFinish: () => void;
}

export default function OnboardingScreen({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0] != null) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    }
  );

  const goNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      onFinish();
    }
  };

  const isLast = activeIndex === slides.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>C</Text>
          </View>
          <Text style={styles.logoText}>CEO AI</Text>
        </View>
        <Pressable onPress={onFinish} hitSlop={16} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={styles.flatList}
        scrollEventThrottle={16}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.textSection}>
              <View style={styles.eyebrowWrap}>
                <Text style={styles.eyebrow}>{item.eyebrow}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>

            <View style={styles.imageSection}>
              {item.image ? (
                <View style={styles.phoneFrame}>
                  <Image
                    source={item.image}
                    style={styles.phoneImage}
                    resizeMode="cover"
                  />
                </View>
              ) : item.isLast ? (
                <View style={styles.lastSlideIllo}>
                  <View style={styles.illoCircle}>
                    <Text style={styles.illoEmoji}>🚀</Text>
                  </View>
                  <View style={styles.illoLines}>
                    {[80, 60, 90, 50, 75].map((h, i) => (
                      <View key={i} style={[styles.illoBar, { height: h }]} />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.introIllo}>
                  <View style={styles.illoGrid}>
                    {[
                      { label: "MRR", val: "$67K" },
                      { label: "Tasks", val: "12" },
                      { label: "Goals", val: "5" },
                      { label: "P&L", val: "+18%" },
                    ].map((card) => (
                      <View key={card.label} style={styles.illoCard}>
                        <Text style={styles.illoCardVal}>{card.val}</Text>
                        <Text style={styles.illoCardLabel}>{card.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      />

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <Pressable
              key={i}
              onPress={() =>
                flatListRef.current?.scrollToIndex({ index: i, animated: true })
              }
              hitSlop={8}
            >
              <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.ctaBtn} onPress={goNext}>
          <Text style={styles.ctaBtnText}>
            {isLast ? "Get Started" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center",
  },
  logoMarkText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000000" },
  logoText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#ffffff" },
  skipBtn: {
    backgroundColor: "#111111", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: "#222222",
  },
  skipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#555555" },

  flatList: { flex: 1 },

  slide: { flex: 1 },

  textSection: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 24,
  },
  eyebrowWrap: { flexDirection: "row", marginBottom: 14 },
  eyebrow: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    color: "#444444", letterSpacing: 1.5,
  },
  title: {
    fontSize: 34, fontFamily: "Inter_700Bold",
    color: "#ffffff", lineHeight: 42, marginBottom: 12,
  },
  subtitle: {
    fontSize: 16, fontFamily: "Inter_400Regular",
    color: "#555555", lineHeight: 24,
  },

  imageSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  phoneFrame: {
    width: width * 0.62,
    height: height * 0.36,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#0d0d0d",
  },
  phoneImage: { width: "100%", height: "100%" },

  lastSlideIllo: { alignItems: "center", gap: 28 },
  illoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#111111", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#222222",
  },
  illoEmoji: { fontSize: 44 },
  illoLines: { flexDirection: "row", alignItems: "flex-end", gap: 10, height: 100 },
  illoBar: { width: 28, backgroundColor: "#1e1e1e", borderRadius: 8, borderWidth: 1, borderColor: "#2a2a2a" },

  introIllo: { width: "100%" },
  illoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  illoCard: {
    width: (width - 80) / 2,
    backgroundColor: "#0d0d0d", borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: "#1e1e1e",
    alignItems: "center", gap: 4,
  },
  illoCardVal: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#ffffff" },
  illoCardLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#555555" },

  bottom: { paddingHorizontal: 24, paddingTop: 16 },
  dotsRow: {
    flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 20,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2a2a2a" },
  dotActive: { width: 28, backgroundColor: "#ffffff" },
  ctaBtn: {
    backgroundColor: "#ffffff", borderRadius: 18,
    paddingVertical: 18, alignItems: "center",
  },
  ctaBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#000000" },
});
