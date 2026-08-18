import { router } from "expo-router";
import { Text } from "@/components/common/Text";
import { View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import { HighlightedText } from "@/components/search/HighlightedText";
import type { BibleSearchResult } from "@/data/bibleTypes";
import { useFontScale } from "@/hooks/useFontScale";

export function BibleSearchResultRow({ result, query }: { result: BibleSearchResult; query: string }) {
  const { bodySmall, captionSmall } = useFontScale();

  return (
    <PressableScale
      onPress={() =>
        router.push({
          pathname: "/bible/[bookId]/[chapter]" as any,
          params: {
            bookId: String(result.bookId),
            chapter: String(result.chapter),
          },
        })
      }
    >
      <View className="border-border-light bg-surface mb-2 rounded-xl border px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
        <View className="mb-1.5 flex-row items-center gap-2">
          <Text className="text-primary font-bold" style={{ fontSize: captionSmall }}>
            {result.bookName}
          </Text>
          <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: captionSmall }}>
            {result.chapter}:{result.verse}
          </Text>
        </View>
        <HighlightedText
          text={result.verseText}
          query={query}
          className="text-text-secondary leading-normal dark:text-gray-400"
          style={{ fontSize: bodySmall }}
          numberOfLines={3}
        />
      </View>
    </PressableScale>
  );
}
