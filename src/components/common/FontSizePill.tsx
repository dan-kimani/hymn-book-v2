import { Pressable, View } from "react-native";
import { Text } from "@/components/common/Text";
import { useFontScale } from "@/hooks/useFontScale";
import { useSettingsStore } from "@/state/settingsStore";

interface FontSizePillProps {
  /** Step size for each press (default 2) */
  step?: number;
}

export function FontSizePill({ step = 2 }: FontSizePillProps) {
  const { fontSize, captionSmall } = useFontScale();
  const setFontSize = useSettingsStore((s) => s.setFontSize);

  return (
    <View className="flex-row items-center gap-1.5">
      <Pressable
        className="h-8 w-8 items-center justify-center rounded-lg bg-gray-100/80 dark:bg-slate-800/80"
        onPress={() => setFontSize(fontSize - step)}
      >
        <Text className="text-text-primary font-semibold dark:text-gray-100" style={{ fontSize: captionSmall }}>
          A-
        </Text>
      </Pressable>
      <Text className="text-text-secondary text-center font-semibold dark:text-gray-400" style={{ fontSize: captionSmall }}>
        {fontSize}px
      </Text>
      <Pressable
        className="h-8 w-8 items-center justify-center rounded-lg bg-gray-100/80 dark:bg-slate-800/80"
        onPress={() => setFontSize(fontSize + step)}
      >
        <Text className="text-text-primary font-semibold dark:text-gray-100" style={{ fontSize: captionSmall }}>
          A+
        </Text>
      </Pressable>
    </View>
  );
}
