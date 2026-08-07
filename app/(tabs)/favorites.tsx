import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCollectionsStore } from "@/state/collectionsStore";
import { useFavoritesStore } from "@/state/favoritesStore";
import { BOOK_COVERS, BOOKS } from "@/utils/constants";
import { theme } from "@/theme/colors";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const favorites = useFavoritesStore((s) => s.favorites);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const collections = useCollectionsStore((s) => s.collections);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);

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
    <View className="flex-1 bg-white dark:bg-slate-950" style={{ }}>
      <View className="px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Text className="text-[32px] font-extrabold tracking-tight text-text-primary dark:text-gray-100">Saved</Text>
        <Text className="text-[15px] font-medium text-text-secondary dark:text-gray-400 mt-1">
          {favorites.length} favorites · {collections.length} collections
        </Text>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        data={[
          // Favorites section
          ...(favorites.length > 0
            ? [{ type: "header" as const, key: "fav-header", label: "Favorites", count: favorites.length }]
            : []),
          ...favorites.map((item: any) => ({ type: "favorite" as const, key: `fav-${item.hymnId}`, ...item })),

          // Collections section header
          { type: "section" as const, key: "col-header", label: "Collections" },

          // Create button
          { type: "create" as const, key: "create" },

          // Collections
          ...collections.map((col) => ({ type: "collection" as const, key: col.id, ...col })),
        ]}
        ListEmptyComponent={
          <View className="items-center justify-center pt-20 gap-1">
            <Ionicons name="heart-outline" size={32} color={theme.textMuted} />
            <Text className="text-[15px] font-medium text-text-secondary dark:text-gray-400 mt-3">Nothing saved yet</Text>
            <Text className="text-[13px] text-text-muted dark:text-gray-500 text-center mt-1">
              Tap the heart while reading a hymn
            </Text>
          </View>
        }
        renderItem={({ item, index }: any) => {
          if (item.type === "header") {
            return (
              <Text className="text-sm font-semibold text-text-primary dark:text-gray-100 mt-2 mb-3">
                {item.label} · {item.count}
              </Text>
            );
          }

          if (item.type === "section") {
            const hasItemsBelow = index + 1 < collections.length + 1;
            return (
              <View className={`flex-row items-center justify-between ${hasItemsBelow ? "mt-6" : "mt-6"} mb-3`}>
                <Text className="text-sm font-semibold text-text-primary dark:text-gray-100">{item.label}</Text>
              </View>
            );
          }

          if (item.type === "create") {
            return (
              <View className="mb-3">
                {creating ? (
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      className="flex-1 bg-gray-50 dark:bg-slate-900 rounded-xl px-4 py-2.5 text-[15px] text-text-primary dark:text-gray-100 border border-gray-100 dark:border-slate-800"
                      placeholder="Collection name"
                      placeholderTextColor={theme.textMuted}
                      value={newName}
                      onChangeText={setNewName}
                      onSubmitEditing={handleCreate}
                      autoFocus
                    />
                    <Pressable className="px-4 py-2.5 bg-primary rounded-xl" onPress={handleCreate}>
                      <Text className="text-sm font-semibold text-white">Create</Text>
                    </Pressable>
                    <Pressable onPress={() => { setCreating(false); setNewName(""); }} hitSlop={8}>
                      <Ionicons name="close" size={18} color={theme.textMuted} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    className="flex-row items-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-gray-300 dark:border-slate-700"
                    onPress={() => setCreating(true)}
                  >
                    <Ionicons name="add" size={18} color={theme.primary} />
                    <Text className="text-[15px] font-medium text-primary">New collection</Text>
                  </Pressable>
                )}
              </View>
            );
          }

          if (item.type === "favorite") {
            const book = BOOKS.find((b) => b.id === item.bookId);
            const cover = book ? BOOK_COVERS[book.id] : null;
            return (
              <Pressable
                className="flex-row items-center gap-3 mb-2"
                onPress={() => router.push({ pathname: "/hymn/[bookId]/[number]", params: { bookId: item.bookId, number: String(item.number) } })}
              >
                {cover ? (
                  <Image source={cover} className="w-9 h-12 rounded-sm" resizeMode="cover" />
                ) : (
                  <View className="w-9 h-12 rounded-sm bg-gray-100 dark:bg-slate-800" />
                )}
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-text-primary dark:text-gray-100" numberOfLines={1}>{item.title}</Text>
                  <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">{item.bookName} · #{item.number}</Text>
                </View>
                <Pressable onPress={() => removeFavorite(item.hymnId)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={theme.textMuted} />
                </Pressable>
              </Pressable>
            );
          }

          if (item.type === "collection") {
            return (
              <Pressable
                className="flex-row items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 mb-2"
                onPress={() => router.push({ pathname: "/collection/[id]", params: { id: item.id } })}
              >
                <View className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 items-center justify-center">
                  <Ionicons name="folder-outline" size={18} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-text-primary dark:text-gray-100">{item.name}</Text>
                  <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">
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
