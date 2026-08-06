import { router } from "expo-router";
import { Text, View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import type { BookId } from "@/data/types";

const BOOK_INFO: Record<string, { color: string; subtitle: string; language: string }> = {
  "roho-mutheru": { color: "book-roho-mutheru", subtitle: "Hymns of the Holy Spirit", language: "Kikuyu" },
  atumwo: { color: "book-atumwo", subtitle: "Hymns of the Apostles", language: "Kikuyu" },
  kiroho: { color: "book-kiroho", subtitle: "Spiritual Hymns", language: "Kikuyu" },
  "golden-bells": { color: "book-golden-bells", subtitle: "English Hymnal", language: "English" },
};

interface BookCardProps {
  id: BookId;
  name: string;
  count: number;
}

export function BookCard({ id, name, count }: BookCardProps) {
  const info = BOOK_INFO[id] ?? { color: "primary", subtitle: "", language: "" };

  return (
    <PressableScale className="bg-surface rounded-2xl p-4 flex-1 min-w-[47%]" onPress={() => router.push({ pathname: "/book/[bookId]", params: { bookId: id } })}>
      <View className={`w-11 h-11 rounded-2xl items-center justify-center mb-3 bg-${info.color}/10`}>
        <Text className={`text-xl font-bold text-${info.color}`}>{name.charAt(0)}</Text>
      </View>
      <Text className="text-sm font-semibold text-text-primary" numberOfLines={2}>
        {name}
      </Text>
      <Text className="text-xs text-text-muted mt-1">{count} hymns</Text>
    </PressableScale>
  );
}
