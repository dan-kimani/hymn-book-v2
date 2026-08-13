import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/components/common/Text";
import { FlatList, Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFavoritesStore } from "@/state/favoritesStore";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";
import { BOOK_COVERS, BOOKS } from "@/utils/constants";

export default function FavoritesListScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { fontSize, body, captionSmall } = useFontScale();
  const favorites = useFavoritesStore((s) => s.favorites);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <View className="flex-row items-center gap-3 px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-bold tracking-tight text-text-primary dark:text-gray-100" style={{ fontSize: fontSize + 10 }}>Favorites</Text>
          <Text className="font-medium text-text-secondary dark:text-gray-400 mt-1" style={{ fontSize: body }}>
            {favorites.length} hymn{favorites.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.hymnId}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center pt-16">
            <Ionicons name="heart-outline" size={36} color={theme.textMuted} />
            <Text className="font-medium text-text-secondary dark:text-gray-400 mt-3" style={{ fontSize: body }}>No favorites yet</Text>
            <Text className="text-text-muted dark:text-gray-500 text-center mt-1" style={{ fontSize: captionSmall }}>Tap the heart while reading a hymn</Text>
          </View>
        }
        renderItem={({ item }) => {
          const book = BOOKS.find((b) => b.id === item.bookId);
          const cover = book ? BOOK_COVERS[book.id] : null;
          return (
            <Pressable
              className="flex-row items-center gap-3 mb-2"
              onPress={() =>
                router.push({
                  pathname: "/hymn/[bookId]/[number]",
                  params: { bookId: item.bookId, number: String(item.number) },
                })
              }
            >
              {cover ? (
                <Image source={cover} className="w-9 h-12 rounded-sm" resizeMode="cover" />
              ) : (
                <View className="w-9 h-12 rounded-sm bg-gray-100 dark:bg-slate-800" />
              )}
              <View className="flex-1">
                <Text className="font-bold text-text-primary dark:text-gray-100" numberOfLines={1} style={{ fontSize: body }}>
                  {item.title}
                </Text>
                <Text className="text-text-muted dark:text-gray-500 mt-0.5" style={{ fontSize: captionSmall }}>
                  {item.bookName} · #{item.number}
                </Text>
              </View>
              <Pressable onPress={() => removeFavorite(item.hymnId)} hitSlop={8}>
                <Ionicons name="close" size={14} color={theme.textMuted} />
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
