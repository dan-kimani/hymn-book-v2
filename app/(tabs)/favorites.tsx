import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFavoritesStore } from "@/state/favoritesStore";
import { useRecentsStore } from "@/state/recentsStore";
import { theme } from "@/theme/colors";

type Tab = "favorites" | "recents";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("favorites");
  const favorites = useFavoritesStore((s) => s.favorites);
  const recents = useRecentsStore((s) => s.recents);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  const data = tab === "favorites" ? favorites : recents;

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <View className="px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Text className="text-[32px] font-extrabold tracking-tight text-text-primary dark:text-gray-100">{tab === "favorites" ? "Favorites" : "Recent"}</Text>
      </View>

      {/* Segmented Control */}
      <View className="flex-row mx-5 rounded-xl p-1 bg-gray-100 dark:bg-slate-800 mb-4">
        {(["favorites", "recents"] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <Pressable key={t} className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg gap-1.5 ${active ? "bg-primary" : ""}`} onPress={() => setTab(t)}>
              <Ionicons name={t === "favorites" ? "heart" : "time-outline"} size={15} color={active ? "white" : theme.textMuted} />
              <Text className={`text-sm font-semibold ${active ? "text-white" : "text-text-secondary dark:text-gray-400"}`}>{t === "favorites" ? "Favorites" : "Recent"}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item: any, i: number) => `${item.hymnId || item.number}-${i}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        ListEmptyComponent={
          <View className="items-center justify-center pt-24 gap-2">
            <Ionicons name={tab === "favorites" ? "heart-outline" : "time-outline"} size={36} color={theme.textMuted} />
            <Text className="text-base font-medium text-text-secondary dark:text-gray-400">{tab === "favorites" ? "No favorites yet" : "No recent hymns"}</Text>
            <Text className="text-sm text-text-muted dark:text-gray-500 text-center px-10">{tab === "favorites" ? "Tap the heart icon while reading a hymn" : "Hymns you open will appear here"}</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <Pressable
            className="flex-row items-center bg-gray-50 dark:bg-slate-900 rounded-xl px-4 py-3.5 border border-gray-100 dark:border-slate-800 mb-2 gap-3"
            onPress={() => {
              if (item.bookId) {
                router.push({ pathname: "/hymn/[bookId]/[number]", params: { bookId: item.bookId, number: String(item.number) } });
              }
            }}
          >
            <View className="w-8 items-center">
              <Ionicons name={tab === "favorites" ? "heart" : "time-outline"} size={17} color={tab === "favorites" ? theme.favorite : theme.textMuted} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-text-primary dark:text-gray-100" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">
                {item.bookName} · #{item.number}
                {tab === "recents" && item.openedAt ? ` · ${new Date(item.openedAt).toLocaleDateString()}` : ""}
              </Text>
            </View>
            {tab === "favorites" && (
              <Pressable onPress={() => item.hymnId && removeFavorite(item.hymnId)} hitSlop={8}>
                <Ionicons name="close-circle" size={19} color={theme.textMuted} />
              </Pressable>
            )}
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
