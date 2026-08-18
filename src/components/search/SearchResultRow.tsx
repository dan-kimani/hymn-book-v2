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
      className="bg-surface border-border-light mb-2 rounded-xl border p-4 dark:border-slate-800 dark:bg-slate-900"
      onPress={onPress}
    >
      <View className="mb-1.5 flex-row items-center gap-2">
        <View className="bg-primary-tint dark:bg-primary/20 rounded-lg px-2.5 py-0.5">
          <Text className="text-primary font-bold" style={{ fontSize: captionSmall }}>
            {result.bookName}
          </Text>
        </View>
        <Text className="text-primary font-medium" style={{ fontSize: caption }}>
          #{result.hymnNumber}
        </Text>
      </View>
      <Text className="text-text-primary mb-1 font-bold dark:text-gray-100" style={{ fontSize: body }}>
        {result.hymnTitle}
      </Text>
      <HighlightedText
        text={result.stanzaText}
        query={query ?? ""}
        className="text-text-secondary leading-5 dark:text-gray-400"
        style={{ fontSize: bodySmall }}
        numberOfLines={4}
      />
    </PressableScale>
  );
}
