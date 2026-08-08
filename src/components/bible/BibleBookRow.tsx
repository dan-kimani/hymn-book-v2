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
      <View className="flex-row items-center rounded-xl px-4 py-3.5 mb-1.5 border border-border-light dark:border-slate-800 bg-surface dark:bg-slate-800/30">
        <View className="w-10 h-10 rounded-lg items-center justify-center mr-3.5 bg-primary-tint dark:bg-primary/15">
          <Text className="font-bold text-primary" style={{ fontSize: captionSmall }}>
            {book.usfm.length > 3 ? book.usfm.slice(0, 3) : book.usfm}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-text-primary dark:text-gray-100" numberOfLines={1} style={{ fontSize: body }}>
            {book.name}
          </Text>
          <Text className="text-text-muted dark:text-gray-500 mt-0.5" numberOfLines={1} style={{ fontSize: captionSmall }}>
            {book.englishName}
          </Text>
        </View>
        <Text className="text-text-muted dark:text-gray-500 mr-2" style={{ fontSize: captionSmall }}>
          {book.chapters} ch
        </Text>
        <Ionicons name="chevron-forward" size={15} color="#8A94A6" />
      </View>
    </PressableScale>
  );
}
