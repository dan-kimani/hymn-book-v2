import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Text } from "@/components/common/Text";
import { Alert, Animated, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCollectionsStore } from "@/state/collectionsStore";
import { useFavoritesStore } from "@/state/favoritesStore";
import { useBibleBookmarksStore } from "@/state/bibleBookmarksStore";
import { useRecordingsStore } from "@/state/recordingsStore";
import { useFontScale } from "@/hooks/useFontScale";
import { TopGlow } from "@/components/SoftGlow";
import { SectionLabel } from "@/components/common/SectionLabel";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";
import { DEFAULT_COLLECTIONS } from "@/data/defaultCollections";

const defaultEmoji: Record<string, string> = Object.fromEntries(DEFAULT_COLLECTIONS.map((d) => [d.id, d.emoji]));

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { fontSize, body, bodySmall, captionSmall } = useFontScale();
  const isDark = useIsDark();

  const favorites = useFavoritesStore((s) => s.favorites);
  const collections = useCollectionsStore((s) => s.collections);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);

  const bookmarks = useBibleBookmarksStore((s) => s.bookmarks);
  const recordings = useRecordingsStore((s) => s.recordings);
  const recordedCount = Object.values(recordings).filter((rec) => rec != null).length;

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = insets.top + 78;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

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

  const tiles = [
    { icon: "heart", label: "Favorites", count: favorites.length, color: theme.favorite, path: "/saved/favorites" },
    { icon: "mic", label: "Recordings", count: recordedCount, color: theme.primary, path: "/saved/recordings" },
    { icon: "bookmark", label: "Bookmarks", count: bookmarks.length, color: "#B45309", path: "/saved/bookmarks" },
  ];

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      {/* Floating header — fades in on scroll */}
      <Animated.View className="absolute top-0 right-0 left-0" style={{ paddingTop: insets.top + 8, zIndex: 10 }}>
        <TopGlow height={headerHeight + 130} opacity={headerOpacity} />

        <Animated.View
          className="absolute top-0 right-0 left-0 overflow-hidden"
          style={{ height: headerHeight, opacity: headerOpacity }}
          pointerEvents="none"
        >
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View className="px-4 pb-4">
          <Text className="text-text-primary font-extrabold tracking-tight dark:text-gray-100" style={{ fontSize: fontSize + 14 }}>
            Saved
          </Text>
          <Text className="text-text-secondary mt-1 font-medium dark:text-gray-400" style={{ fontSize: body }}>
            Your hymns, recordings, and collections
          </Text>
        </View>
      </Animated.View>

      <Animated.FlatList
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: headerHeight, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        ListHeaderComponent={
          <View className="mb-6 flex-row gap-3">
            {tiles.map((t) => (
              <Pressable
                key={t.label}
                className="flex-1 items-center rounded-2xl py-4"
                style={{ backgroundColor: isDark ? "rgba(30,41,59,0.4)" : "#F8FAFC" }}
                onPress={() => router.push(t.path as any)}
              >
                <Ionicons name={t.icon as any} size={24} color={t.color} />
                <Text className="text-text-primary mt-1.5 font-bold dark:text-gray-100" style={{ fontSize: fontSize + 2 }}>
                  {t.count}
                </Text>
                <Text className="text-text-muted font-medium dark:text-gray-500" style={{ fontSize: captionSmall }}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        }
        data={[
          { type: "section" as const, key: "col-header", label: "Collections" },
          { type: "create" as const, key: "create" },
          ...collections.map((col) => ({ type: "collection" as const, key: col.id, ...col })),
        ]}
        renderItem={({ item }: any) => {
          if (item.type === "section") {
            return (
              <View className="mt-6 mb-3">
                <SectionLabel>{item.label}</SectionLabel>
              </View>
            );
          }

          if (item.type === "create") {
            return (
              <View className="mb-3">
                {creating ? (
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      className="text-text-primary flex-1 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-100"
                      placeholder="Collection name"
                      placeholderTextColor={theme.textMuted}
                      value={newName}
                      onChangeText={setNewName}
                      onSubmitEditing={handleCreate}
                      autoFocus
                      style={{ fontSize: body }}
                    />
                    <Pressable className="bg-primary rounded-xl px-4 py-2.5" onPress={handleCreate}>
                      <Text className="font-semibold text-white" style={{ fontSize: bodySmall }}>
                        Create
                      </Text>
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
                  <Pressable
                    className="flex-row items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 dark:border-slate-700"
                    onPress={() => setCreating(true)}
                  >
                    <Ionicons name="add" size={18} color={theme.primary} />
                    <Text className="text-primary font-medium" style={{ fontSize: body }}>
                      New collection
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }

          if (item.type === "collection") {
            const emoji = defaultEmoji[item.id];
            return (
              <Pressable
                className="mb-2 flex-row items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
                onPress={() => router.push({ pathname: "/collection/[id]", params: { id: item.id } })}
              >
                <View className="h-10 w-10 items-center justify-center rounded-lg">
                  {emoji ? (
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  ) : (
                    <Ionicons name="folder-outline" size={18} color={theme.textMuted} />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-text-primary font-bold dark:text-gray-100" style={{ fontSize: body }}>
                    {item.name}
                  </Text>
                  <Text className="text-text-muted mt-0.5 dark:text-gray-500" style={{ fontSize: captionSmall }}>
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
    </View>
  );
}
