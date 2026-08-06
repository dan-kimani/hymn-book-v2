import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Uniwind } from "uniwind";

import { useSettingsStore } from "@/state/settingsStore";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const resolvedMode = themeMode === "system" ? (colorScheme ?? "light") : themeMode;
  const isDark = resolvedMode === "dark";

  // Sync uniwind's theme with our Zustand store so dark: classes resolve correctly
  useEffect(() => {
    Uniwind.setTheme(resolvedMode as "light" | "dark" | "system");
  }, [resolvedMode]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(isDark ? "#0F172A" : "#FFFFFF");
  }, [isDark]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
          contentStyle: { backgroundColor: isDark ? "#0F172A" : "#FFFFFF" },
        }}
      />
    </GestureHandlerRootView>
  );
}
