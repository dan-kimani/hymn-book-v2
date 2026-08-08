import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { useSettingsStore } from "@/state/settingsStore";
import { useIsDark } from "@/hooks/useIsDark";

export function ThemeToggle() {
  const isDark = useIsDark();
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  const toggle = () => setThemeMode(isDark ? "light" : "dark");

  return (
    <Pressable onPress={toggle} hitSlop={8} className="p-1">
      <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={isDark ? "#FBBF24" : "#64748B"} />
    </Pressable>
  );
}
