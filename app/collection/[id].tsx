import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "@/components/common/Text";
import { Image, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCollectionsStore } from "@/state/collectionsStore";
import { BOOK_COVERS, BOOKS } from "@/utils/constants";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";

export default function CollectionDetailScreen() {
  const isDark = useIsDark();
  const { fontSize, heading, captionSmall } = useFontScale();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const collections = useCollectionsStore((s) => s.collections);
  const renameCollection = useCollectionsStore((s) => s.renameCollection);
  const removeFromCollection = useCollectionsStore((s) => s.removeFromCollection);

  const col = collections.find((c) => c.id === id);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  if (!col) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-950 items-center justify-center" style={{ }}>
        <Text className="text-text-muted dark:text-gray-500">Collection not found</Text>
      </View>
    );
  }

  const handleRename = () => {
    const name = editName.trim();
    if (!name) return;
    renameCollection(col.id, name);
    setEditing(false);
  };

  const startEdit = () => {
    setEditName(col.name);
    setEditing(true);
  };

  return (
    <View className="flex-1 bg-white dark:bg-slate-950" style={{ }}>
      <View className="px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-start gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8} className="pt-0.5">
            <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <View className="flex-1">
            {editing ? (
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 font-bold text-text-primary dark:text-gray-100"
                  value={editName}
                  onChangeText={setEditName}
                  onSubmitEditing={handleRename}
                  autoFocus
                />
                <Pressable onPress={handleRename}>
                  <Ionicons name="checkmark" size={22} color={theme.primary} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={startEdit}>
                <Text className="font-bold tracking-tight text-text-primary dark:text-gray-100" style={{ fontSize: fontSize + 10 }}>{col.name}</Text>
              </Pressable>
            )}
            <Text className="font-medium text-text-secondary dark:text-gray-400 mt-1" style={{ fontSize: heading }}>
              {col.hymns.length} hymn{col.hymns.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-5" style={{ paddingBottom: 120 }}>
        {col.hymns.length === 0 ? (
          <View className="items-center pt-16">
            <Ionicons name="musical-notes-outline" size={36} color={theme.textMuted} />
            <Text className="text-[15px] font-medium text-text-secondary dark:text-gray-400 mt-3">Empty collection</Text>
            <Text className="text-[13px] text-text-muted dark:text-gray-500 mt-1">Add hymns from the reader</Text>
          </View>
        ) : (
          col.hymns.map((hymn) => {
            const book = BOOKS.find((b) => b.id === hymn.bookId);
            const cover = book ? BOOK_COVERS[book.id] : null;
            return (
              <Pressable
                key={hymn.hymnId}
                className="flex-row items-center gap-3 mb-2"
                onPress={() => router.push({ pathname: "/hymn/[bookId]/[number]", params: { bookId: hymn.bookId, number: String(hymn.number) } })}
              >
                {cover ? (
                  <Image source={cover} className="w-9 h-12 rounded-sm" resizeMode="cover" />
                ) : (
                  <View className="w-9 h-12 rounded-sm bg-gray-100 dark:bg-slate-800" />
                )}
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-text-primary dark:text-gray-100" numberOfLines={1}>{hymn.title}</Text>
                  <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">{hymn.bookName} · #{hymn.number}</Text>
                </View>
                <Pressable onPress={() => removeFromCollection(col.id, hymn.hymnId)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={theme.textMuted} />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}
