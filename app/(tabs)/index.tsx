import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text } from "@/components/common/Text";
import { Animated, Image, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/common/PressableScale";
import { SearchResultRow } from "@/components/search/SearchResultRow";
import { BottomGlow, TopGlow } from "@/components/SoftGlow";
import { useHymnSearchStore } from "@/state/hymnSearchStore";
import { useRecentsStore } from "@/state/recentsStore";
import { useSettingsStore } from "@/state/settingsStore";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";
import { BOOK_COVERS, BOOKS } from "@/utils/constants";

const HEADER_HEIGHT = 64;
const SEARCH_AREA = 76; // pt-4 (16) + h-12 (48) + pb-3 (12)

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Wĩmwega rũciinĩ", emoji: "☀️" };
  if (hour >= 12 && hour < 17) return { text: "Wĩmwega mĩaraho", emoji: "🌤️" };
  if (hour >= 17 && hour < 20) return { text: "Wĩmwega hwainĩ", emoji: "🌙" };
  return { text: "Nĩwatinda owega?", emoji: "⭐" };
}

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

  const { body, bodySmall, caption, captionSmall } = useFontScale();

  const isDark = useIsDark();
  const [greeting, setGreeting] = useState(() => getGreeting());

  // Refresh the time-of-day greeting when its boundary is crossed.
  useEffect(() => {
    const id = setInterval(() => {
      setGreeting((prev) => {
        const next = getGreeting();
        return next.text === prev.text ? prev : next;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Combined scroll + focus animation ────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const atTopAnim = useRef(new Animated.Value(0)).current;
  const scrolledPastRef = useRef(false);

  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const queryRef = useRef(localQuery);
  queryRef.current = localQuery;

  const syncAtTop = useCallback(() => {
    const shouldBeAtTop = focusedRef.current || queryRef.current.length > 0 || scrolledPastRef.current;
    Animated.spring(atTopAnim, {
      toValue: shouldBeAtTop ? 1 : 0,
      stiffness: 300,
      damping: 30,
      useNativeDriver: false,
    }).start();
  }, [atTopAnim]);

  // Trigger on focus / query changes
  const hasQuery = localQuery.length > 0;
  const prevHasQuery = useRef(false);
  useEffect(() => {
    // When search is cleared, reset the scroll offset + threshold state so the
    // greeting header returns instead of staying hidden on the remounted ScrollView.
    if (prevHasQuery.current && !hasQuery) {
      scrollY.setValue(0);
      scrolledPastRef.current = false;
    }
    prevHasQuery.current = hasQuery;
    syncAtTop();
  }, [focused, hasQuery, scrollY, syncAtTop]);

  const handleScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: false,
      listener: (_e: any) => {
        // We can't read scrollY directly in the listener — track via ref
      },
    }),
  ).current;

  // Wire scrollY to detect threshold crossing
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const past = value > HEADER_HEIGHT;
      if (past !== scrolledPastRef.current) {
        scrolledPastRef.current = past;
        syncAtTop();
      }
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, syncAtTop]);

  // Derived animated values
  const headerOpacity = atTopAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const headerTranslateY = atTopAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -HEADER_HEIGHT],
  });
  const searchBarTop = atTopAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [HEADER_HEIGHT, 0],
  });
  const contentPaddingTop = atTopAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [insets.top + HEADER_HEIGHT + SEARCH_AREA, insets.top + SEARCH_AREA],
  });

  useEffect(() => {
    loadDailyHymn();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(localQuery, searchScope), 200);
    return () => clearTimeout(timer);
  }, [localQuery, searchScope, setQuery]);

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

  const searchAtTop = focused || hasQuery || scrolledPastRef.current;

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      {/* ── Greeting header — slides out on scroll or focus ── */}
      <Animated.View
        className="absolute left-0 right-0 z-30"
        style={{
          paddingTop: insets.top + 8,
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
        }}
        pointerEvents={searchAtTop ? "none" : "auto"}
      >
        <View className="flex-row items-center justify-between px-5">
          <View>
            <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: 28, lineHeight: 34 }}>
              {greeting.text}
            </Text>
            <Text className="text-text-muted dark:text-gray-500 mt-0.5" style={{ fontSize: 14 }}>
              Nyĩmbo na Kĩrĩkanĩro
            </Text>
          </View>
          <Text style={{ fontSize: 24 }}>{greeting.emoji}</Text>
        </View>
      </Animated.View>

      {/* ── Floating search bar — slides up on scroll or focus ── */}
      <Animated.View className="absolute left-0 right-0 z-20" style={{ top: searchBarTop, paddingTop: insets.top }}>
        <TopGlow height={insets.top + 72} opacity={atTopAnim} />

        <Animated.View className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: insets.top + 72, opacity: atTopAnim }} pointerEvents="none">
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
            {localQuery.length > 0 && (
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
          contentContainerStyle={{
            paddingTop: insets.top + SEARCH_AREA,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <Animated.ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: contentPaddingTop,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={handleScroll}
        >
          {empty && (
            <View className="items-center justify-center py-24 gap-2">
              <Ionicons name="search-outline" size={36} color={theme.textMuted} />
              <Text className="font-medium text-text-secondary dark:text-gray-400 mt-2" style={{ fontSize: bodySmall }}>
                No hymns found
              </Text>
              <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: caption }}>
                Try a different search term
              </Text>
            </View>
          )}

          {/* ── Hymn of the Day ── */}
          {dailyHymn && idle && (
            <View className="mx-5 mb-8">
              <Text className="text-[11px] font-semibold tracking-[1.5px] uppercase text-text-muted dark:text-gray-500 mb-3">Hymn of the Day</Text>
              <PressableScale onPress={() => openHymn(dailyHymn.bookId, dailyHymn.number)}>
                <View
                  className="rounded-xl px-2 py-3.5 border border-gray-100 dark:border-slate-800"
                  style={{
                    backgroundColor: isDark ? `${theme.primary}0D` : `${theme.primary}08`,
                  }}
                >
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <View className="py-0.5 rounded-md bg-primary-tint dark:bg-primary/20">
                      <Text className="font-semibold text-primary" style={{ fontSize: captionSmall }}>
                        {dailyHymn.bookName}
                      </Text>
                    </View>
                    <Text className="font-medium text-text-muted dark:text-gray-400" style={{ fontSize: captionSmall }}>
                      #{dailyHymn.number}
                    </Text>
                  </View>
                  <Text className="font-bold text-text-primary dark:text-gray-100" numberOfLines={2} style={{ fontSize: bodySmall }}>
                    {dailyHymn.title}
                  </Text>
                  {dailyHymn.snippet ? (
                    <Text className="text-text-secondary dark:text-gray-400 mt-1" numberOfLines={2} style={{ fontSize: caption }}>
                      {dailyHymn.snippet}
                    </Text>
                  ) : null}
                </View>
              </PressableScale>
            </View>
          )}

          {/* ── Books ── */}
          {idle && (
            <View className="mb-8 mx-5">
              <Text className="text-[11px] font-semibold tracking-[1.5px] uppercase text-text-muted dark:text-gray-500 mb-3">Books</Text>
              <View className="flex-row -mx-1.5">
                {BOOKS.map((book) => (
                  <View key={book.id} className="w-1/4 px-1.5">
                    <PressableScale onPress={() => router.push({ pathname: "/book/[bookId]", params: { bookId: book.id } })}>
                      <View
                        className="rounded-xl"
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.15,
                          shadowRadius: 12,
                          elevation: 4,
                        }}
                      >
                        <View
                          className="rounded-xl overflow-hidden"
                          style={{
                            aspectRatio: 1,
                            backgroundColor: isDark ? `${book.color}1A` : `${book.color}0F`,
                          }}
                        >
                          <Image source={BOOK_COVERS[book.id]} className="w-full h-full" resizeMode="cover" />
                        </View>
                      </View>
                      <View className="mt-1.5 items-center">
                        <Text className="font-semibold text-text-primary dark:text-gray-100 text-center" numberOfLines={1} style={{ fontSize: captionSmall }}>
                          {book.shortName}
                        </Text>
                        <Text className="text-text-muted dark:text-gray-500 mt-0.5" style={{ fontSize: captionSmall }}>
                          {book.count} hymns
                        </Text>
                      </View>
                    </PressableScale>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Recent Hymns ── */}
          {recents.length > 0 && idle && (
            <View className="mb-8">
              <View className="flex-row items-end justify-between mx-5 mb-3">
                <Text className="text-[11px] font-semibold tracking-[1.5px] uppercase text-text-muted dark:text-gray-500">Recently opened</Text>
                <Pressable onPress={() => useRecentsStore.getState().clearRecents()} hitSlop={8}>
                  <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: caption }}>
                    Clear
                  </Text>
                </Pressable>
              </View>
              <View className="mx-5 gap-2">
                {recents.slice(0, 5).map((item) => {
                  const book = BOOKS.find((b) => b.id === item.bookId);
                  return (
                    <PressableScale key={item.hymnId} className="flex-row items-center gap-3" onPress={() => openHymn(item.bookId, item.number)}>
                      <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: book?.color ?? theme.primary }} />
                      <View className="flex-1">
                        <Text className="font-bold text-text-primary dark:text-gray-100" numberOfLines={1} style={{ fontSize: body }}>
                          {item.title}
                        </Text>
                        <Text className="text-text-muted dark:text-gray-500 mt-0.5" style={{ fontSize: captionSmall }}>
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
        </Animated.ScrollView>
      )}
      <BottomGlow />
    </View>
  );
}
