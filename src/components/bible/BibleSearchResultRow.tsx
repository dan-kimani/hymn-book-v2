import { router } from "expo-router";
import { Text, useColorScheme, View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import { HighlightedText } from "@/components/search/HighlightedText";
import type { BibleSearchResult } from "@/data/bibleTypes";
import { theme } from "@/theme/colors";

export function BibleSearchResultRow({
  result,
  query,
}: {
  result: BibleSearchResult;
  query: string;
}) {
  const isDark = useColorScheme() === "dark";

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
        className="rounded-xl px-4 py-3 mb-2 border border-border-light dark:border-slate-800"
        style={{
          backgroundColor: isDark ? "rgba(30,41,59,0.3)" : theme.surface,
        }}
      >
        <View className="flex-row items-center gap-2 mb-1.5">
          <Text className="text-[13px] font-semibold text-primary">
            {result.bookName}
          </Text>
          <Text className="text-[12px] text-text-muted dark:text-gray-500">
            {result.chapter}:{result.verse}
          </Text>
        </View>
        <HighlightedText
          text={result.verseText}
          query={query}
          className="text-[14px] text-text-secondary dark:text-gray-400 leading-normal"
          numberOfLines={3}
        />
      </View>
    </PressableScale>
  );
}
