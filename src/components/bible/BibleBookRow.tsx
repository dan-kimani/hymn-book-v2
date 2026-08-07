import { Ionicons } from "@expo/vector-icons";
import { Text, useColorScheme, View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import type { BibleBook } from "@/data/bibleTypes";
import { theme } from "@/theme/colors";

export function BibleBookRow({
  book,
  onPress,
}: {
  book: BibleBook;
  onPress: () => void;
}) {
  const isDark = useColorScheme() === "dark";

  return (
    <PressableScale onPress={onPress}>
      <View
        className="flex-row items-center rounded-xl px-4 py-3.5 mb-1.5 border border-border-light dark:border-slate-800"
        style={{
          backgroundColor: isDark ? "rgba(30,41,59,0.3)" : theme.surface,
        }}
      >
        <View
          className="w-10 h-10 rounded-lg items-center justify-center mr-3.5"
          style={{
            backgroundColor: isDark ? "rgba(249,115,22,0.15)" : theme.primaryTint,
          }}
        >
          <Text className="text-[12px] font-bold text-primary">
            {book.usfm.length > 3 ? book.usfm.slice(0, 3) : book.usfm}
          </Text>
        </View>
        <View className="flex-1">
          <Text
            className="text-[15px] font-semibold text-text-primary dark:text-gray-100"
            numberOfLines={1}
          >
            {book.name}
          </Text>
          <Text
            className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5"
            numberOfLines={1}
          >
            {book.englishName}
          </Text>
        </View>
        <Text className="text-[12px] text-text-muted dark:text-gray-500 mr-2">
          {book.chapters} ch
        </Text>
        <Ionicons
          name="chevron-forward"
          size={15}
          color={theme.textMuted}
        />
      </View>
    </PressableScale>
  );
}
