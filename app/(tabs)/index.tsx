import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, Text, TextInput, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/common/PressableScale";
import { SearchResultRow } from "@/components/search/SearchResultRow";
import { BottomGlow, TopGlow } from "@/components/SoftGlow";
import { useHymnSearchStore } from "@/state/hymnSearchStore";
import { useRecentsStore } from "@/state/recentsStore";
import { useSettingsStore } from "@/state/settingsStore";
import { theme } from "@/theme/colors";
import { BOOK_COVERS, BOOKS } from "@/utils/constants";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [focused, setFocused] = useState(false);
  const [localQuery, setLocalQuery] = useState("");

  const query = useHymnSearchStore((s) => s.query);
  const results = useHymnSearchStore((s) => s.results);
  const searching = useHymnSearchStore((s) => s.searching);
  const dailyHymn = useHymnSearchStore((s) => s.dailyHymn);
  const setQuery = useHymnSearchStore((s) => s.setQuery);
  const clearSearch = useHymnSearchStore((s) => s.clearSearch);
  const loadDailyHymn = useHymnSearchStore((s) => s.loadDailyHymn);

  const { recents, removeRecent } = useRecentsStore((s) => s);

  const searchBooks = useSettingsStore((s) => s.searchBooks);
  const searchScope = searchBooks.length === 4 ? null : searchBooks;

  const scrollY = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => { loadDailyHymn(); }, []);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(localQuery, searchScope), 200);
    return () => clearTimeout(timer);
  }, [localQuery]);

  const openHymn = (bookId: string, number: number, verse?: number, stanza?: number) =>
    router.push({
      pathname: "/hymn/[bookId]/[number]",
      params: {
        bookId,
        number: String(number),
        verse: verse != null ? String(verse) : undefined,
        stanza: stanza != null ? String(stanza) : undefined,
      },
    });

  const active = query.length > 0 && results.length > 0;
  const empty = query.length > 0 && !searching && results.length === 0;
  const idle = !active && !empty;

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 32], outputRange: [0, 1], extrapolate: "clamp" });
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });

  return (
    <View className="flex-1 bg-white dark:bg-slate-950" style={{}}>
      {/* ── Floating search bar ─────────────────────────────── */}
      <Animated.View className="absolute top-0 left-0 right-0 z-10" style={{ paddingTop: insets.top }}>
        {/* Tall seamless gradient — opaque behind search, imperceptibly fades to transparent */}
        <TopGlow height={insets.top + 180} opacity={headerOpacity} />

        {/* BlurView limited to behind the search input only — no hard bottom edge */}
        <Animated.View className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: insets.top + 72, opacity: headerOpacity }} pointerEvents="none">
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View className="px-5 pt-4 pb-3">
          <View
            className={`flex-row items-center px-4 h-12 rounded-2xl gap-3 ${focused ? "bg-white dark:bg-slate-800 border border-primary/30" : "bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800"}`}
            style={{
              shadowColor: focused ? theme.primary : isDark ? "#000" : "#1E293B",
              shadowOffset: { width: 0, height: focused ? 0 : 2 },
              shadowOpacity: focused ? 0.25 : 0.06,
              shadowRadius: focused ? 16 : 8,
              elevation: focused ? 8 : 2,
            }}
          >
            <Ionicons name="search" size={17} color={focused ? theme.primary : theme.textMuted} />
            <TextInput
              className="flex-1 text-[15px] text-text-primary dark:text-gray-100"
              placeholder="Search hymns by number, title, or lyrics…"
              placeholderTextColor={theme.textMuted}
              value={localQuery}
              onChangeText={setLocalQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => {
                  setLocalQuery("");
                  clearSearch();
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={17} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>

      {/* ── Content ────────────────────────────────────────── */}
      {active ? (
        <Animated.FlatList
          data={results}
          keyExtractor={(item, i) => `${item.hymnId}-${item.stanzaIndex}-${i}`}
          renderItem={({ item }) => (
            <View className="px-5">
              <SearchResultRow result={item} query={query} onPress={() => openHymn(item.bookId, item.hymnNumber, item.verseNumber, item.stanzaIndex)} />
            </View>
          )}
          contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      ) : (
        <Animated.ScrollView className="flex-1" contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={16}>
          {empty && (
            <View className="items-center justify-center py-24 gap-2">
              <Ionicons name="search-outline" size={36} color={theme.textMuted} />
              <Text className="text-base font-medium text-text-secondary dark:text-gray-400 mt-2">No hymns found</Text>
              <Text className="text-sm text-text-muted dark:text-gray-500">Try a different search term</Text>
            </View>
          )}

          {/* ── Daily Hymn ── */}
          {dailyHymn && idle && (
            <View className="mx-5 mb-8">
              <Text className="text-[11px] font-semibold tracking-[1.5px] uppercase text-text-muted dark:text-gray-500 ml-1 mb-3">Hymn of the Day</Text>
              <PressableScale onPress={() => openHymn(dailyHymn.bookId, dailyHymn.number)}>
                <View className="rounded-xl px-4 py-3.5 border border-gray-100 dark:border-slate-800" style={{ backgroundColor: isDark ? `${theme.primary}0D` : `${theme.primary}08` }}>
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <View className="px-2 py-0.5 rounded-md bg-primary-tint dark:bg-primary/20">
                      <Text className="text-[11px] font-semibold text-primary">{dailyHymn.bookName}</Text>
                    </View>
                    <Text className="text-[13px] font-medium text-text-muted dark:text-gray-400">#{dailyHymn.number}</Text>
                  </View>
                  <Text className="text-[16px] font-semibold text-text-primary dark:text-gray-100" numberOfLines={2}>
                    {dailyHymn.title}
                  </Text>
                  {dailyHymn.snippet ? (
                    <Text className="text-[13px] text-text-secondary dark:text-gray-400 mt-1" numberOfLines={2}>
                      {dailyHymn.snippet}
                    </Text>
                  ) : null}
                </View>
              </PressableScale>
            </View>
          )}

          {/* ── Recent Hymns ── */}
          {recents.length > 0 && idle && (
            <View className="mb-8">
              <View className="flex-row items-end justify-between mx-5 mb-3">
                <Text className="text-base font-bold text-text-primary dark:text-gray-100">Recently opened</Text>
                <Pressable onPress={() => useRecentsStore.getState().clearRecents()} hitSlop={8}>
                  <Text className="text-[13px] text-text-muted dark:text-gray-500">Clear</Text>
                </Pressable>
              </View>
              <View className="mx-5 gap-2">
                {recents.slice(0, 5).map((item) => {
                  const book = BOOKS.find((b) => b.id === item.bookId);
                  return (
                    <PressableScale key={item.hymnId} className="flex-row items-center gap-3" onPress={() => openHymn(item.bookId, item.number)}>
                      <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: book?.color ?? theme.primary }} />
                      <View className="flex-1">
                        <Text className="text-[15px] font-semibold text-text-primary dark:text-gray-100" numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">
                          {item.bookName} · #{item.number}
                        </Text>
                      </View>
                      <Pressable onPress={() => removeRecent(item.hymnId)} hitSlop={8}>
                        <Ionicons name="close" size={14} color={theme.textMuted} />
                      </Pressable>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Hymn Collections ── */}
          {idle && (
            <View className="mb-8">
              <Text className="text-base font-bold text-text-primary dark:text-gray-100 mx-5 mb-3">Books</Text>
              <View className="mx-5 gap-2.5">
                {BOOKS.map((book) => (
                  <PressableScale key={book.id} onPress={() => router.push({ pathname: "/book/[bookId]", params: { bookId: book.id } })}>
                    <View className="flex-row items-center rounded-xl px-4 py-4 border border-gray-100 dark:border-slate-800" style={{ backgroundColor: isDark ? `${book.color}0D` : `${book.color}08` }}>
                      <Image source={BOOK_COVERS[book.id]} className="w-12 h-16 rounded-md mr-4" resizeMode="cover" />
                      <View className="flex-1">
                        <Text className="text-[16px] font-semibold text-text-primary dark:text-gray-100">{book.name}</Text>
                        <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">{book.desc}</Text>
                        <Text className="text-[11px] font-medium text-text-muted dark:text-gray-500 mt-1.5">
                          {book.count} hymns · {book.language}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </View>
                  </PressableScale>
                ))}
              </View>
            </View>
          )}

          {/* The search bar placeholder already teaches the user how to search */}
        </Animated.ScrollView>
      )}
      <BottomGlow />
    </View>
  );
}
