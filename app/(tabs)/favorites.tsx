import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text } from "@/components/common/Text";
import { Alert, FlatList, Image, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCollectionsStore } from "@/state/collectionsStore";
import { useFavoritesStore } from "@/state/favoritesStore";
import { useBibleBookmarksStore } from "@/state/bibleBookmarksStore";
import { useFontScale } from "@/hooks/useFontScale";
import { theme } from "@/theme/colors";
import { BOOK_COVERS, BOOKS } from "@/utils/constants";

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

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { fontSize, body, bodySmall, caption, captionSmall } = useFontScale();

  const favorites = useFavoritesStore((s) => s.favorites);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const collections = useCollectionsStore((s) => s.collections);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);

  const bookmarks = useBibleBookmarksStore((s) => s.bookmarks);
  const removeBookmark = useBibleBookmarksStore((s) => s.removeBookmark);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const bibleGrouped =
    bookmarks.length > 20
      ? (() => {
          const groups: Record<string, typeof bookmarks> = {};
          for (const bm of bookmarks) {
            const key = bm.createdAt.slice(0, 7); // YYYY-MM
            if (!groups[key]) groups[key] = [];
            groups[key].push(bm);
          }
          return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
        })()
      : null;

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createCollection(name);
    setNewName("");
    setCreating(false);
  };

  const handleDeleteCollection = (id: string, name: string) => {
    Alert.alert("Delete collection", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCollection(id) },
    ]);
  };

  return (
    <View className="flex-1 bg-white dark:bg-slate-950" style={{}}>
      <View className="px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Text className="font-extrabold tracking-tight text-text-primary dark:text-gray-100" style={{ fontSize: fontSize + 14 }}>Saved</Text>
        <Text className="font-medium text-text-secondary dark:text-gray-400 mt-1" style={{ fontSize: body }}>
          {favorites.length} favorites · {collections.length} collections{bookmarks.length > 0 ? ` · ${bookmarks.length} bookmarks` : ""}
        </Text>
      </View>

      {favorites.length === 0 && collections.length === 0 && bookmarks.length === 0 ? (
        <View className="items-center justify-center pt-20 gap-1">
          <Ionicons name="heart-outline" size={32} color={theme.textMuted} />
          <Text className="font-medium text-text-secondary dark:text-gray-400 mt-3" style={{ fontSize: body }}>Nothing saved yet</Text>
          <Text className="text-text-muted dark:text-gray-500 text-center mt-1" style={{ fontSize: caption }}>Tap the heart while reading a hymn</Text>
        </View>
      ) : (
      <FlatList
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        data={[
          // Favorites section
          ...(favorites.length > 0 ? [{ type: "header" as const, key: "fav-header", label: "Favorites", count: favorites.length }] : []),
          ...favorites.map((item: any) => ({ type: "favorite" as const, key: `fav-${item.hymnId}`, ...item })),

          // Collections section header
          { type: "section" as const, key: "col-header", label: "Collections" },

          // Create button
          { type: "create" as const, key: "create" },

          // Collections
          ...collections.map((col) => ({ type: "collection" as const, key: col.id, ...col })),

          // Bible bookmarks
          ...(bookmarks.length > 0
            ? [
                { type: "section" as const, key: "bible-header", label: "Bible Bookmarks" },
                ...(bibleGrouped
                  ? bibleGrouped.flatMap(([month, items]) => [
                      { type: "bible-month" as const, key: `bm-month-${month}`, month, count: items.length },
                      ...(expandedMonths.has(month) ? items.map((bm) => ({ type: "bible-bookmark" as const, key: bm.id, ...bm })) : []),
                    ])
                  : bookmarks.map((bm) => ({ type: "bible-bookmark" as const, key: bm.id, ...bm }))),
              ]
            : []),
        ]}
        renderItem={({ item, index }: any) => {
          if (item.type === "header") {
            return (
              <Text className="font-semibold text-text-primary dark:text-gray-100 mt-2 mb-3" style={{ fontSize: bodySmall }}>
                {item.label} · {item.count}
              </Text>
            );
          }

          if (item.type === "section") {
            const hasItemsBelow = index + 1 < collections.length + 1;
            return (
              <View className={`flex-row items-center justify-between ${hasItemsBelow ? "mt-6" : "mt-6"} mb-3`}>
                <Text className="font-semibold text-text-primary dark:text-gray-100" style={{ fontSize: bodySmall }}>{item.label}</Text>
              </View>
            );
          }

          if (item.type === "create") {
            return (
              <View className="mb-3">
                {creating ? (
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      className="flex-1 bg-gray-50 dark:bg-slate-900 rounded-xl px-4 py-2.5 text-text-primary dark:text-gray-100 border border-gray-100 dark:border-slate-800"
                      placeholder="Collection name"
                      placeholderTextColor={theme.textMuted}
                      value={newName}
                      onChangeText={setNewName}
                      onSubmitEditing={handleCreate}
                      autoFocus
                      style={{ fontSize: body }}
                    />
                    <Pressable className="px-4 py-2.5 bg-primary rounded-xl" onPress={handleCreate}>
                      <Text className="font-semibold text-white" style={{ fontSize: bodySmall }}>Create</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setCreating(false);
                        setNewName("");
                      }}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={18} color={theme.textMuted} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable className="flex-row items-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-gray-300 dark:border-slate-700" onPress={() => setCreating(true)}>
                    <Ionicons name="add" size={18} color={theme.primary} />
                    <Text className="font-medium text-primary" style={{ fontSize: body }}>New collection</Text>
                  </Pressable>
                )}
              </View>
            );
          }

          if (item.type === "favorite") {
            const book = BOOKS.find((b) => b.id === item.bookId);
            const cover = book ? BOOK_COVERS[book.id] : null;
            return (
              <Pressable className="flex-row items-center gap-3 mb-2" onPress={() => router.push({ pathname: "/hymn/[bookId]/[number]", params: { bookId: item.bookId, number: String(item.number) } })}>
                {cover ? <Image source={cover} className="w-9 h-12 rounded-sm" resizeMode="cover" /> : <View className="w-9 h-12 rounded-sm bg-gray-100 dark:bg-slate-800" />}
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
          }

          if (item.type === "bible-month") {
            const isOpen = expandedMonths.has(item.month);
            const toggle = () =>
              setExpandedMonths((prev) => {
                const next = new Set(prev);

                if (isOpen) next.delete(item.month);
                else next.add(item.month);

                return next;
              });
            return (
              <Pressable className="flex-row items-center gap-3 py-3 px-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 mb-1" onPress={toggle}>
                <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={16} color={theme.textMuted} />
                <View className="flex-1">
                  <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: body }}>{monthLabel(item.month + "-01")}</Text>
                </View>
                <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: caption }}>{item.count} bookmarks</Text>
              </Pressable>
            );
          }

          if (item.type === "bible-bookmark") {
            return (
              <Pressable className="flex-row items-start gap-3 py-2.5 px-3 rounded-xl mb-1 ml-4" onPress={() => router.push({ pathname: "/bible/[bookId]/[chapter]" as any, params: { bookId: String(item.bookId), chapter: String(item.chapter) } })}>
                <View className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 items-center justify-center mt-0.5">
                  <Ionicons name="bookmark" size={16} color="#B45309" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-text-primary dark:text-gray-100" numberOfLines={1} style={{ fontSize: bodySmall }}>
                    {item.bookName} {item.chapter}:{item.verseStart}
                    {item.verseEnd !== item.verseStart ? `-${item.verseEnd}` : ""}
                  </Text>
                  {item.note ? (
                    <Text className="text-text-secondary dark:text-gray-400 mt-0.5" numberOfLines={2} style={{ fontSize: captionSmall }}>
                      {item.note}
                    </Text>
                  ) : null}
                  <Text className="text-[11px] text-text-muted dark:text-gray-500 mt-0.5">{relativeTime(item.createdAt)}</Text>
                </View>
                <Pressable onPress={() => removeBookmark(item.bookId, item.chapter, item.verseStart)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={theme.textMuted} />
                </Pressable>
              </Pressable>
            );
          }

          if (item.type === "collection") {
            return (
              <Pressable className="flex-row items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 mb-2" onPress={() => router.push({ pathname: "/collection/[id]", params: { id: item.id } })}>
                <View className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 items-center justify-center">
                  <Ionicons name="folder-outline" size={18} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: body }}>{item.name}</Text>
                  <Text className="text-text-muted dark:text-gray-500 mt-0.5" style={{ fontSize: captionSmall }}>
                    {item.hymns.length} hymn{item.hymns.length === 1 ? "" : "s"}
                  </Text>
                </View>
                <Pressable onPress={() => handleDeleteCollection(item.id, item.name)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={15} color={theme.textMuted} />
                </Pressable>
              </Pressable>
            );
          }

          return null;
        }}
      />
      )}
    </View>
  );
}
