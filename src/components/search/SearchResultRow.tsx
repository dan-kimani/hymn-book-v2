import { Text, View } from "react-native";
import { HighlightedText } from "./HighlightedText";

import { PressableScale } from "@/components/common/PressableScale";
import type { StanzaResult } from "@/data/types";

interface SearchResultRowProps {
  result: StanzaResult;
  query?: string;
  accentColor?: string;
  onPress: () => void;
}

export function SearchResultRow({ result, query, accentColor = "text-primary", onPress }: SearchResultRowProps) {
  return (
    <PressableScale className="p-4 rounded-2xl bg-surface border border-border-light mb-2" onPress={onPress}>
      <View className="flex-row items-center gap-2 mb-1.5">
        <View className="px-2.5 py-0.5 rounded-lg bg-primary-tint">
          <Text className="text-xs font-semibold text-primary">{result.bookName}</Text>
        </View>
        <Text className={`text-[13px] font-medium ${accentColor}`}>#{result.hymnNumber}</Text>
      </View>
      <Text className="text-[17px] font-semibold text-text-primary mb-1">{result.hymnTitle}</Text>
      <HighlightedText text={result.stanzaText} query={query ?? ""} className="text-sm text-text-secondary leading-5" numberOfLines={4} />
    </PressableScale>
  );
}
