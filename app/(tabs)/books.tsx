import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/common/PressableScale";
import type { BookId } from "@/data/types";
import { theme } from "@/theme/colors";

const BOOK_LIST = [
  { id: "roho-mutheru" as BookId, name: "Nyimbo Cia Roho Mutheru", language: "Kikuyu", count: 555, subtitle: "Hymns of the Holy Spirit" },
  { id: "atumwo" as BookId, name: "Nyimbo Cia Atumwo", language: "Kikuyu", count: 218, subtitle: "Hymns of the Apostles" },
  { id: "kiroho" as BookId, name: "Nyimbo Cia Kiroho", language: "Kikuyu", count: 464, subtitle: "Spiritual Hymns" },
  { id: "golden-bells" as BookId, name: "Golden Bells", language: "English", count: 771, subtitle: "English Hymnal" },
];

const BOOK_COLORS: Record<string, string> = {
  "roho-mutheru": "bg-book-roho-mutheru/10",
  atumwo: "bg-book-atumwo/10",
  kiroho: "bg-book-kiroho/10",
  "golden-bells": "bg-book-golden-bells/10",
};
const BOOK_TEXT: Record<string, string> = {
  "roho-mutheru": "text-book-roho-mutheru",
  atumwo: "text-book-atumwo",
  kiroho: "text-book-kiroho",
  "golden-bells": "text-book-golden-bells",
};

export default function BooksScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <View className="px-6 pb-2" style={{ paddingTop: insets.top + 12 }}>
        <Text className="text-[32px] font-extrabold tracking-tight text-text-primary dark:text-gray-100">Hymn Books</Text>
        <Text className="text-[15px] font-medium text-text-secondary dark:text-gray-400 mt-1">4 collections · 2,008 hymns</Text>
      </View>

      <FlatList
        data={BOOK_LIST}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <PressableScale className="flex-row items-center bg-gray-50 dark:bg-slate-900 rounded-xl px-4 py-4 border border-gray-100 dark:border-slate-800 mb-2.5 gap-3.5" onPress={() => router.push({ pathname: "/book/[bookId]", params: { bookId: item.id } })}>
            <View className={`w-12 h-12 rounded-xl items-center justify-center ${BOOK_COLORS[item.id]}`}>
              <Text className={`text-xl font-bold ${BOOK_TEXT[item.id]}`}>{item.name.charAt(0)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-semibold text-text-primary dark:text-gray-100">{item.name}</Text>
              <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">{item.subtitle}</Text>
              <View className="flex-row items-center gap-2 mt-1.5">
                <View className="px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20">
                  <Text className="text-[11px] font-semibold text-primary dark:text-primary-light">{item.language}</Text>
                </View>
                <Text className="text-xs text-text-muted dark:text-gray-500">{item.count} hymns</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </PressableScale>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
