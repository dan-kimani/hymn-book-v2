import { forwardRef } from "react";
import { Text as RNText, type TextProps } from "react-native";
import { useSettingsStore } from "@/state/settingsStore";

export const Text = forwardRef<RNText, TextProps>(({ style, ...props }, ref) => {
  const readingFont = useSettingsStore((s) => s.readingFont);
  const fontFamily = readingFont === "serif" ? "Literata" : "VarelaRound";

  return <RNText ref={ref} style={[{ fontFamily }, style].filter(Boolean)} {...props} />;
});

Text.displayName = "Text";
