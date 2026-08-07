import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, useColorScheme, View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import type { BibleReference } from "@/data/bibleTypes";
import { theme } from "@/theme/colors";

export function BibleReferenceCard({
  reference: refData,
}: {
  reference: BibleReference;
}) {
  const isDark = useColorScheme() === "dark";

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
      <View
        className="rounded-xl px-4 py-3.5 mb-3 border border-primary/20"
        style={{
          backgroundColor: isDark
            ? "rgba(249,115,22,0.1)"
            : `${theme.primary}0A`,
        }}
      >
        <View className="flex-row items-center gap-2 mb-1">
          <Ionicons name="compass" size={16} color={theme.primary} />
          <Text className="text-[14px] font-semibold text-primary">
            Open {refData.bookName} {refData.chapter}
            {refData.verse ? `:${refData.verse}` : ""}
          </Text>
        </View>
        <Text className="text-[12px] text-text-muted dark:text-gray-500 ml-6">
          Go to passage
        </Text>
      </View>
    </PressableScale>
  );
}
