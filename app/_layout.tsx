import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Uniwind } from "uniwind";
import { useFonts } from "expo-font";
import { Literata_400Regular, Literata_700Bold } from "@expo-google-fonts/literata";
import { VarelaRound_400Regular } from "@expo-google-fonts/varela-round";

import { useBibleStore } from "@/state/bibleStore";
import { useSettingsStore } from "@/state/settingsStore";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const resolvedMode = themeMode === "system" ? (colorScheme ?? "light") : themeMode;
  const isDark = resolvedMode === "dark";

  const [fontsLoaded] = useFonts({
    Literata: Literata_400Regular,
    LiterataBold: Literata_700Bold,
    VarelaRound: VarelaRound_400Regular,
  });

  // Prefetch bible books into Zustand so Bible tab renders instantly
  const loadBooks = useBibleStore((s) => s.loadBooks);
  useEffect(() => { loadBooks(); }, []);

  // Sync uniwind's theme with our Zustand store so dark: classes resolve correctly
  useEffect(() => {
    Uniwind.setTheme(resolvedMode as "light" | "dark" | "system");
  }, [resolvedMode]);

  const bg = isDark ? "#0F172A" : "#FFFFFF";

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(bg);
  }, [bg]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
          contentStyle: { backgroundColor: bg },
        }}
      />
    </GestureHandlerRootView>
  );
}
