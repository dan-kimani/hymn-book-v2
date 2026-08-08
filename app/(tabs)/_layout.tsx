import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { Text } from "@/components/common/Text";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";

const TAB_ITEMS: Record<string, { icon: string; activeIcon: string; label: string }> = {
  index: { icon: "musical-notes-outline", activeIcon: "musical-notes", label: "Hymns" },
  bible: { icon: "book-outline", activeIcon: "book", label: "Bible" },
  favorites: { icon: "heart-outline", activeIcon: "heart", label: "Saved" },
  settings: { icon: "settings-outline", activeIcon: "settings", label: "Settings" },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();

  const barBg = isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.65)";
  const barShadow = isDark ? "rgba(249,115,22,0.3)" : "rgba(148,163,184,0.22)";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          position: "absolute",
          bottom: insets.bottom + 10,
          left: 24,
          right: 24,
          borderRadius: 32,
          backgroundColor: barBg,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: barShadow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 14,
          height: 62,
          paddingBottom: 0,
          paddingTop: 0,
          borderWidth: 0,
        },
        tabBarItemStyle: {
          height: 62,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1 }}>
            {/* Bottom-to-top glow — fades from opaque at screen bottom to transparent above tabs */}
            <LinearGradient
              colors={
                isDark
                  ? ["rgba(15,23,42,0.92)", "rgba(15,23,42,0.6)", "rgba(15,23,42,0.12)", "transparent"]
                  : ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.6)", "rgba(255,255,255,0.1)", "transparent"]
              }
              locations={[0, 0.35, 0.7, 1]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={{
                position: "absolute",
                left: -24,
                right: -24,
                bottom: -10 - insets.bottom,
                height: 140,
              }}
              pointerEvents="none"
            />
            <BlurView
              intensity={30}
              tint={isDark ? "dark" : "light"}
              style={{ flex: 1, borderRadius: 32, overflow: "hidden" }}
            />
          </View>
        ),
        tabBarLabelStyle: {
          marginTop: 4,
          marginBottom: 0,
          fontSize: 10,
          fontWeight: "500",
        },
        tabBarLabel: ({ focused }) => {
          const item = TAB_ITEMS[route.name] ?? TAB_ITEMS.index;
          return <Text className={`text-[10px] font-medium ${focused ? "text-primary" : "text-text-muted"}`}>{item.label}</Text>;
        },
        tabBarIcon: ({ focused }) => {
          const item = TAB_ITEMS[route.name] ?? TAB_ITEMS.index;
          return <Ionicons name={(focused ? item.activeIcon : item.icon) as any} size={21} color={focused ? theme.primary : theme.textMuted} />;
        },
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="bible" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
