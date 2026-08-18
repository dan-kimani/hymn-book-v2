import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text } from "@/components/common/Text";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBibleBookmarksStore } from "@/state/bibleBookmarksStore";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function BookmarksListScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { fontSize, body, bodySmall, captionSmall } = useFontScale();
  const bookmarks = useBibleBookmarksStore((s) => s.bookmarks);
  const removeBookmark = useBibleBookmarksStore((s) => s.removeBookmark);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const grouped =
    bookmarks.length > 20
      ? (() => {
          const groups: Record<string, typeof bookmarks> = {};
          for (const bm of bookmarks) {
            const key = bm.createdAt.slice(0, 7);
            if (!groups[key]) groups[key] = [];
            groups[key].push(bm);
          }
          return Object.entries(groups).toSorted(([a], [b]) => b.localeCompare(a));
        })()
      : null;

  const data = grouped
    ? grouped.flatMap(([month, items]) => [
        { type: "month" as const, key: `m-${month}`, month, count: items.length },
        ...(expandedMonths.has(month) ? items.map((bm) => ({ type: "bookmark" as const, key: bm.id, ...bm })) : []),
      ])
    : bookmarks.map((bm) => ({ type: "bookmark" as const, key: bm.id, ...bm }));

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <View className="flex-row items-center gap-3 px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-text-primary font-bold tracking-tight dark:text-gray-100" style={{ fontSize: fontSize + 10 }}>
            Bookmarks
          </Text>
          <Text className="text-text-secondary mt-1 font-medium dark:text-gray-400" style={{ fontSize: body }}>
            {bookmarks.length} bookmark{bookmarks.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center pt-16">
            <Ionicons name="bookmark-outline" size={36} color={theme.textMuted} />
            <Text className="text-text-secondary mt-3 font-medium dark:text-gray-400" style={{ fontSize: body }}>
              No bookmarks yet
            </Text>
            <Text className="text-text-muted mt-1 text-center dark:text-gray-500" style={{ fontSize: captionSmall }}>
              Bookmark a verse while reading
            </Text>
          </View>
        }
        renderItem={({ item }: any) => {
          if (item.type === "month") {
            const isOpen = expandedMonths.has(item.month);
            const toggle = () =>
              setExpandedMonths((prev) => {
                const next = new Set(prev);
                if (isOpen) next.delete(item.month);
                else next.add(item.month);
                return next;
              });
            return (
              <Pressable
                className="mb-1 flex-row items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-3 dark:border-amber-900/20 dark:bg-amber-950/10"
                onPress={toggle}
              >
                <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={16} color={theme.textMuted} />
                <View className="flex-1">
                  <Text className="text-text-primary font-bold dark:text-gray-100" style={{ fontSize: body }}>
                    {monthLabel(item.month + "-01")}
                  </Text>
                </View>
                <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: captionSmall }}>
                  {item.count} bookmarks
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              className="mb-1 ml-4 flex-row items-start gap-3 rounded-xl px-3 py-2.5"
              onPress={() =>
                router.push({
                  pathname: "/bible/[bookId]/[chapter]" as any,
                  params: { bookId: String(item.bookId), chapter: String(item.chapter) },
                })
              }
            >
              <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Ionicons name="bookmark" size={16} color="#B45309" />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary font-bold dark:text-gray-100" numberOfLines={1} style={{ fontSize: bodySmall }}>
                  {item.bookName} {item.chapter}:{item.verseStart}
                  {item.verseEnd !== item.verseStart ? `-${item.verseEnd}` : ""}
                </Text>
                {item.note ? (
                  <Text className="text-text-secondary mt-0.5 dark:text-gray-400" numberOfLines={2} style={{ fontSize: captionSmall }}>
                    {item.note}
                  </Text>
                ) : null}
                <Text className="text-text-muted mt-0.5 text-[11px] dark:text-gray-500">{relativeTime(item.createdAt)}</Text>
              </View>
              <Pressable onPress={() => removeBookmark(item.id)} hitSlop={8}>
                <Ionicons name="close" size={14} color={theme.textMuted} />
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
