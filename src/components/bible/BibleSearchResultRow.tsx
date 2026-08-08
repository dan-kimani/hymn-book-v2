import { router } from "expo-router";
import { Text } from "@/components/common/Text";
import { View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import { HighlightedText } from "@/components/search/HighlightedText";
import type { BibleSearchResult } from "@/data/bibleTypes";
import { useFontScale } from "@/hooks/useFontScale";

export function BibleSearchResultRow({
  result,
  query,
}: {
  result: BibleSearchResult;
  query: string;
}) {
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
      <View
        className="rounded-xl px-4 py-3 mb-2 border border-border-light dark:border-slate-800 bg-surface dark:bg-slate-800/30"
      >
        <View className="flex-row items-center gap-2 mb-1.5">
          <Text className="font-bold text-primary" style={{ fontSize: captionSmall }}>
            {result.bookName}
          </Text>
          <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: captionSmall }}>
            {result.chapter}:{result.verse}
          </Text>
        </View>
        <HighlightedText
          text={result.verseText}
          query={query}
          className="text-text-secondary dark:text-gray-400 leading-normal"
          style={{ fontSize: bodySmall }}
          numberOfLines={3}
        />
      </View>
    </PressableScale>
  );
}
