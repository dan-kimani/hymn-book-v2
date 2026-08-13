import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Text } from "@/components/common/Text";
import { Animated, Image, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCollectionsStore } from "@/state/collectionsStore";
import { BOOK_COVERS, BOOKS } from "@/utils/constants";
import { TopGlow } from "@/components/SoftGlow";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";
import { DEFAULT_COLLECTIONS } from "@/data/defaultCollections";

const defaultEmoji: Record<string, string> = Object.fromEntries(DEFAULT_COLLECTIONS.map((d) => [d.id, d.emoji]));

export default function CollectionDetailScreen() {
  const isDark = useIsDark();
  const { heading, body, bodySmall, caption, captionSmall } = useFontScale();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const collections = useCollectionsStore((s) => s.collections);
  const renameCollection = useCollectionsStore((s) => s.renameCollection);
  const removeFromCollection = useCollectionsStore((s) => s.removeFromCollection);

  const col = collections.find((c) => c.id === id);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = insets.top + 78;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (!col) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-950 items-center justify-center">
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

  const emoji = defaultEmoji[col.id];

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      {/* Floating header — fades in on scroll */}
      <Animated.View className="absolute top-0 left-0 right-0" style={{ paddingTop: insets.top + 8, zIndex: 10 }}>
        <TopGlow height={headerHeight + 130} opacity={headerOpacity} />

        <Animated.View className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: headerHeight, opacity: headerOpacity }} pointerEvents="none">
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View className="flex-row items-center px-4 pb-4 gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8} className="pt-0.5">
            <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <View className="flex-1 flex-row items-center gap-2">
            {emoji ? <Text style={{ fontSize: 18 }}>{emoji}</Text> : null}
            {editing ? (
              <View className="flex-row items-center gap-2 flex-1">
                <TextInput className="flex-1 font-bold text-text-primary dark:text-gray-100" value={editName} onChangeText={setEditName} onSubmitEditing={handleRename} autoFocus style={{ fontSize: heading }} />
                <Pressable onPress={handleRename}>
                  <Ionicons name="checkmark" size={22} color={theme.primary} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={startEdit}>
                <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: heading }}>
                  {col.name}
                </Text>
              </Pressable>
            )}
          </View>
          <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: bodySmall }}>
            {col.hymns.length}
          </Text>
        </View>
      </Animated.View>

      {/* Scrollable hymn list */}
      <Animated.FlatList
        data={col.hymns}
        keyExtractor={(hymn) => hymn.hymnId}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        ListHeaderComponent={
          <View className="pb-3">
            <Text className="font-medium text-text-secondary dark:text-gray-400" style={{ fontSize: body }}>
              {col.hymns.length} hymn{col.hymns.length === 1 ? "" : "s"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center pt-16">
            <Ionicons name="musical-notes-outline" size={36} color={theme.textMuted} />
            <Text className="font-medium text-text-secondary dark:text-gray-400 mt-3" style={{ fontSize: body }}>Empty collection</Text>
            <Text className="text-text-muted dark:text-gray-500 mt-1" style={{ fontSize: caption }}>Add hymns from the reader</Text>
          </View>
        }
        renderItem={({ item: hymn }) => {
          const book = BOOKS.find((b) => b.id === hymn.bookId);
          const cover = book ? BOOK_COVERS[book.id] : null;
          return (
            <Pressable
              className="flex-row items-center gap-3 py-2.5"
              onPress={() =>
                router.push({
                  pathname: "/hymn/[bookId]/[number]",
                  params: { bookId: hymn.bookId, number: String(hymn.number) },
                })
              }
            >
              {cover ? <Image source={cover} className="w-9 h-12 rounded-sm" resizeMode="cover" /> : <View className="w-9 h-12 rounded-sm bg-gray-100 dark:bg-slate-800" />}
              <View className="flex-1">
                <Text className="font-semibold text-text-primary dark:text-gray-100" numberOfLines={1} style={{ fontSize: body }}>
                  {hymn.title}
                </Text>
                <Text className="text-text-muted dark:text-gray-500 mt-0.5" style={{ fontSize: captionSmall }}>
                  {hymn.bookName} · #{hymn.number}
                </Text>
              </View>
              <Pressable onPress={() => removeFromCollection(col.id, hymn.hymnId)} hitSlop={8}>
                <Ionicons name="close" size={14} color={theme.textMuted} />
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
