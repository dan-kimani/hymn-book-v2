import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/common/Text";
import { View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import type { BibleBook } from "@/data/bibleTypes";
import { useFontScale } from "@/hooks/useFontScale";

export function BibleBookRow({ book, onPress }: { book: BibleBook; onPress: () => void }) {
  const { body, captionSmall } = useFontScale();

  return (
    <PressableScale onPress={onPress}>
      <View className="border-border-light bg-surface mb-1.5 flex-row items-center rounded-xl border px-4 py-3.5 dark:border-slate-800 dark:bg-slate-800/30">
        <View className="bg-primary-tint dark:bg-primary/15 mr-3.5 h-10 w-10 items-center justify-center rounded-lg">
          <Text className="text-primary font-bold" style={{ fontSize: captionSmall }}>
            {book.usfm.length > 3 ? book.usfm.slice(0, 3) : book.usfm}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-primary font-bold dark:text-gray-100" numberOfLines={1} style={{ fontSize: body }}>
            {book.name}
          </Text>
          <Text className="text-text-muted mt-0.5 dark:text-gray-500" numberOfLines={1} style={{ fontSize: captionSmall }}>
            {book.englishName}
          </Text>
        </View>
        <Text className="text-text-muted mr-2 dark:text-gray-500" style={{ fontSize: captionSmall }}>
          {book.chapters} ch
        </Text>
        <Ionicons name="chevron-forward" size={15} color="#8A94A6" />
      </View>
    </PressableScale>
  );
}
