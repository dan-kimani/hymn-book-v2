import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/components/common/Text";
import { View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import type { BibleReference } from "@/data/bibleTypes";
import { useFontScale } from "@/hooks/useFontScale";

export function BibleReferenceCard({ reference: refData }: { reference: BibleReference }) {
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
      <View className="border-primary/20 bg-primary/5 dark:bg-primary/10 mb-3 rounded-xl border px-4 py-3.5">
        <View className="mb-1 flex-row items-center gap-2">
          <Ionicons name="compass" size={16} color="#F97316" />
          <Text className="text-primary font-bold" style={{ fontSize: bodySmall }}>
            Open {refData.bookName} {refData.chapter}
            {refData.verse ? `:${refData.verse}` : ""}
          </Text>
        </View>
        <Text className="text-text-muted ml-6 dark:text-gray-500" style={{ fontSize: captionSmall }}>
          Go to passage
        </Text>
      </View>
    </PressableScale>
  );
}
