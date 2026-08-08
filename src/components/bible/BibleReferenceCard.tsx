import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/components/common/Text";
import { View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import type { BibleReference } from "@/data/bibleTypes";
import { useFontScale } from "@/hooks/useFontScale";

export function BibleReferenceCard({
  reference: refData,
}: {
  reference: BibleReference;
}) {
  const { bodySmall, captionSmall } = useFontScale();

  return (
    <PressableScale
      onPress={() =>
        router.push({
          pathname: "/bible/[bookId]/[chapter]" as any,
          params: {
            bookId: String(refData.bookId),
            chapter: String(refData.chapter),
          },
        })
      }
    >
      <View className="rounded-xl px-4 py-3.5 mb-3 border border-primary/20 bg-primary/5 dark:bg-primary/10">
        <View className="flex-row items-center gap-2 mb-1">
          <Ionicons name="compass" size={16} color="#F97316" />
          <Text className="font-bold text-primary" style={{ fontSize: bodySmall }}>
            Open {refData.bookName} {refData.chapter}
            {refData.verse ? `:${refData.verse}` : ""}
          </Text>
        </View>
        <Text className="text-text-muted dark:text-gray-500 ml-6" style={{ fontSize: captionSmall }}>
          Go to passage
        </Text>
      </View>
    </PressableScale>
  );
}
