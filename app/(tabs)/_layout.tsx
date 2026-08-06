import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Text, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/theme/colors";

const TAB_ITEMS: Record<string, { icon: string; activeIcon: string; label: string }> = {
  index: { icon: "search-outline", activeIcon: "search", label: "Search" },
  books: { icon: "library-outline", activeIcon: "library", label: "Books" },
  favorites: { icon: "heart-outline", activeIcon: "heart", label: "Saved" },
  settings: { icon: "settings-outline", activeIcon: "settings", label: "Settings" },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
          backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.6)",
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: isDark ? "rgba(37,99,235,0.3)" : "rgba(148,163,184,0.22)",
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
          <BlurView
            intensity={isDark ? 30 : 25}
            tint={isDark ? "dark" : "light"}
            style={{
              flex: 1,
              borderRadius: 32,
              overflow: "hidden",
            }}
          />
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
    />
  );
}
