import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useSubscription } from "@/lib/revenuecat";

interface Route {
  key: string;
  name: string;
}

interface TabBarProps {
  state: {
    routes: Route[];
    index: number;
  };
  descriptors: Record<
    string,
    {
      options: {
        tabBarAccessibilityLabel?: string;
      };
    }
  >;
  navigation: {
    emit: (event: { type: "tabPress"; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: "home",
  chat: "message-circle",
  tasks: "check-square",
  insights: "bar-chart-2",
  profile: "user",
};

const LABELS: Record<string, string> = {
  index: "Home",
  chat: "CEO AI",
  tasks: "Tasks",
  insights: "Finance",
  profile: "Profile",
};

export default function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { isSubscribed, isLoading } = useSubscription();

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 16) + 4 }]}>
      <View style={styles.pill}>
        <View style={[StyleSheet.absoluteFill, styles.blurBg]} />
        <View style={styles.innerRow}>
          {state.routes.map((route: Route, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const iconName = ICONS[route.name] ?? "circle";
            const label = LABELS[route.name] ?? route.name;

            const isChatLocked = route.name === "chat" && !isLoading && !isSubscribed;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
              >
                <View style={[styles.iconWrap, isFocused && styles.iconWrapActive, isChatLocked && styles.iconWrapLocked]}>
                  {isChatLocked ? (
                    <Feather
                      name="lock"
                      size={18}
                      color="#888888"
                    />
                  ) : (
                    <Feather
                      name={iconName}
                      size={20}
                      color={isFocused ? "#000000" : "#666666"}
                    />
                  )}
                </View>
                <Text style={[styles.label, isFocused && styles.labelActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  pill: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(12,12,12,0.6)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  blurBg: {
    backgroundColor: "rgba(15,15,15,0.85)",
  },
  innerRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "#ffffff",
    width: 48,
    borderRadius: 14,
  },
  iconWrapLocked: {
    opacity: 0.5,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#555555",
  },
  labelActive: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
  },
});
