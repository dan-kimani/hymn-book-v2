import { Text } from "@/components/common/Text";
import { View } from "react-native";
import { HighlightedText } from "./HighlightedText";

import { PressableScale } from "@/components/common/PressableScale";
import type { StanzaResult } from "@/data/types";
import { useFontScale } from "@/hooks/useFontScale";

interface SearchResultRowProps {
  result: StanzaResult;
  query?: string;
  onPress: () => void;
}

export function SearchResultRow({ result, query, onPress }: SearchResultRowProps) {
  const { heading: body, bodySmall, caption, captionSmall } = useFontScale();

  return (
    <PressableScale
      className="p-4 rounded-xl bg-surface dark:bg-slate-900 border border-border-light dark:border-slate-800 mb-2"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-2 mb-1.5">
        <View className="px-2.5 py-0.5 rounded-lg bg-primary-tint dark:bg-primary/20">
          <Text className="font-bold text-primary" style={{ fontSize: captionSmall }}>{result.bookName}</Text>
        </View>
        <Text className="font-medium text-primary" style={{ fontSize: caption }}>#{result.hymnNumber}</Text>
      </View>
      <Text className="font-bold text-text-primary dark:text-gray-100 mb-1" style={{ fontSize: body }}>
        {result.hymnTitle}
      </Text>
      <HighlightedText
        text={result.stanzaText}
        query={query ?? ""}
        className="text-text-secondary dark:text-gray-400 leading-5"
        style={{ fontSize: bodySmall }}
        numberOfLines={4}
      />
    </PressableScale>
  );
}
