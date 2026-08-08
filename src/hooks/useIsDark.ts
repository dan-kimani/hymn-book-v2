import { useColorScheme } from "react-native";
import { useSettingsStore } from "@/state/settingsStore";

/** Returns true when the resolved theme is dark, respecting the manual override from settings. */
export function useIsDark(): boolean {
  const colorScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  return (themeMode === "system" ? (colorScheme ?? "light") : themeMode) === "dark";
}
