import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/common/Text";
import { useIsDark } from "@/hooks/useIsDark";
import { useFontScale } from "@/hooks/useFontScale";

import { BibleBookRow } from "@/components/bible/BibleBookRow";
import { BibleReferenceCard } from "@/components/bible/BibleReferenceCard";
import { BibleSearchResultRow } from "@/components/bible/BibleSearchResultRow";
import { BottomGlow, TopGlow } from "@/components/SoftGlow";
import { useBibleStore } from "@/state/bibleStore";
import { theme } from "@/theme/colors";

export default function BibleTab() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { bodyLarge, bodySmall } = useFontScale();
  const [focused, setFocused] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const books = useBibleStore((s) => s.books);
  const booksLoaded = useBibleStore((s) => s.booksLoaded);
  const loadBooks = useBibleStore((s) => s.loadBooks);
  const query = useBibleStore((s) => s.query);
  const setQuery = useBibleStore((s) => s.setQuery);
  const clearSearch = useBibleStore((s) => s.clearSearch);
  const searching = useBibleStore((s) => s.searching);
  const reference = useBibleStore((s) => s.reference);
  const bookResults = useBibleStore((s) => s.bookResults);
  const verseResults = useBibleStore((s) => s.verseResults);

  // Lazy-load book list once
  useEffect(() => {
    if (!booksLoaded) loadBooks();
  }, [booksLoaded, loadBooks]);

  // Debounced search
  const [localQuery, setLocalQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(localQuery), 200);
    return () => clearTimeout(timer);
  }, [localQuery, setQuery]);

  // Reset the scroll offset when entering/leaving search so the blur header
  // doesn't stay opaque over a fresh results list.
  const prevQueryEmpty = useRef(true);
  useEffect(() => {
    const nowEmpty = query.length === 0;
    if (prevQueryEmpty.current !== nowEmpty) {
      scrollY.setValue(0);
    }
    prevQueryEmpty.current = nowEmpty;
  }, [query, scrollY]);

  const hasResults = !!(reference || bookResults.length || verseResults.length);
  const active = query.length > 0 && hasResults;
  const showSearching = query.length > 0 && searching && !hasResults;
  const showEmpty = query.length > 0 && !searching && !hasResults;
  const idle = !active && !showSearching && !showEmpty;

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });

  const otBooks = books.filter((b) => b.testament === "OT");
  const ntBooks = books.filter((b) => b.testament === "NT");

  const sections = idle
    ? [
        { title: "Kĩrĩkanĩro Gĩa Tene", data: otBooks },
        { title: "Kĩrĩkanĩro Kĩerũ", data: ntBooks },
      ]
    : [];

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 32],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      {/* Floating header */}
      <Animated.View className="absolute top-0 right-0 left-0 z-10" style={{ paddingTop: insets.top }}>
        <TopGlow height={insets.top + 88} opacity={headerOpacity} />

        <Animated.View
          className="absolute top-0 right-0 left-0 overflow-hidden"
          style={{ height: insets.top + 56, opacity: headerOpacity }}
          pointerEvents="none"
        >
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View className="px-5 pt-2 pb-2">
          <View
            className={`h-12 flex-row items-center gap-3 rounded-2xl px-4 ${
              focused
                ? "border-primary/30 border bg-white dark:bg-slate-800"
                : "border border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-900"
            }`}
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
              className="text-text-primary flex-1 text-[15px] dark:text-gray-100"
              placeholder='Search verses, books, or "Johana 3:16"...'
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

      {showSearching ? (
        <View className="flex-1 items-center justify-center" style={{ paddingTop: insets.top + 64 }}>
          <View className="h-1 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
            <Animated.View className="bg-primary h-full w-1/2 rounded-full" />
          </View>
        </View>
      ) : showEmpty ? (
        <View className="flex-1 items-center justify-center gap-2" style={{ paddingTop: insets.top + 64 }}>
          <Ionicons name="search-outline" size={36} color={theme.textMuted} />
          <Text className="text-text-secondary mt-2 font-medium dark:text-gray-400" style={{ fontSize: bodyLarge }}>
            No results found
          </Text>
          <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: bodySmall }}>
            Try a different search term
          </Text>
        </View>
      ) : active ? (
        <Animated.ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {reference && (
            <View className="mt-3">
              <BibleReferenceCard reference={reference} />
            </View>
          )}

          {bookResults.length > 0 && (
            <View className="mt-3">
              <Text className="text-text-muted mb-2 ml-1 text-[11px] font-semibold tracking-[1.5px] uppercase dark:text-gray-500">
                Mabuku
              </Text>
              {bookResults.map((b) => (
                <BibleBookRow
                  key={b.id}
                  book={b}
                  onPress={() => router.push({ pathname: "/bible/[bookId]", params: { bookId: String(b.id) } })}
                />
              ))}
            </View>
          )}

          {verseResults.length > 0 && (
            <View className="mt-3">
              <Text className="text-text-muted mb-2 ml-1 text-[11px] font-semibold tracking-[1.5px] uppercase dark:text-gray-500">
                Nyahũkio
              </Text>
              {verseResults.map((r, i) => (
                <BibleSearchResultRow key={`${r.rowid}-${i}`} result={r} query={query} />
              ))}
            </View>
          )}
        </Animated.ScrollView>
      ) : (
        <Animated.SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View className="px-5">
              <BibleBookRow book={item} onPress={() => router.push({ pathname: "/bible/[bookId]", params: { bookId: String(item.id) } })} />
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View className="px-5 pt-4 pb-2">
              <Text className="text-text-muted text-[11px] font-semibold tracking-[1.5px] uppercase dark:text-gray-500">{title}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
          stickySectionHeadersEnabled={false}
        />
      )}

      <BottomGlow />
    </View>
  );
}
