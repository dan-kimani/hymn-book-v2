import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, TextInput, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/common/PressableScale";
import { SearchResultRow } from "@/components/search/SearchResultRow";
import { fetchDailyHymn, searchByNumber, searchStanzas } from "@/data/queries";
import type { BookId, StanzaResult } from "@/data/types";
import { useRecentsStore } from "@/state/recentsStore";
import { theme } from "@/theme/colors";

// ── Data ────────────────────────────────────────────────────

const BOOKS = [
  {
    id: "roho-mutheru" as BookId,
    name: "Nyimbo Cia Roho Mutheru",
    shortName: "Roho Mutheru",
    count: 555,
    color: theme.bookRohoMutheru,
    desc: "Hymns of the Holy Spirit",
  },
  {
    id: "atumwo" as BookId,
    name: "Nyimbo Cia Atumwo",
    shortName: "Atumwo",
    count: 218,
    color: theme.bookAtumwo,
    desc: "Hymns of the Apostles",
  },
  {
    id: "kiroho" as BookId,
    name: "Nyimbo Cia Kiroho",
    shortName: "Kiroho",
    count: 464,
    color: theme.bookKiroho,
    desc: "Spiritual Hymns",
  },
  {
    id: "golden-bells" as BookId,
    name: "Golden Bells",
    shortName: "Golden Bells",
    count: 771,
    color: theme.bookGoldenBells,
    desc: "English Hymnal",
  },
];

// ── Component ──────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StanzaResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const recents = useRecentsStore((s) => s.recents);
  const removeRecent = useRecentsStore((s) => s.removeRecent);

  const scrollY = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [dailyHymn, setDailyHymn] = useState<any>(null);

  useEffect(() => {
    fetchDailyHymn().then(setDailyHymn);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const num = query.match(/^#?(\d{1,4})$/);
      if (num) {
        const r = await searchByNumber(parseInt(num[1]));
        if (r.length > 0) {
          setResults(
            r.map((x) => ({
              hymnId: x.id,
              bookId: x.bookId,
              bookName: x.bookName,
              hymnNumber: x.number,
              hymnTitle: x.title,
              verseNumber: 1,
              stanzaIndex: 0,
              stanzaText: x.firstLine,
              rank: 0,
            })),
          );
          return;
        }
      }
      setResults(await searchStanzas(query, null, 40));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

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

  const active = searching && results.length > 0;
  const empty = query.length > 0 && searching && results.length === 0;
  const idle = !active && !empty;

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 32], outputRange: [0, 1], extrapolate: "clamp" });
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      {/* ── Floating search bar ─────────────────────────────── */}
      <Animated.View className="absolute top-0 left-0 right-0 z-10" style={{ paddingTop: insets.top }}>
        {/* Tall seamless gradient — opaque behind search, imperceptibly fades to transparent */}
        <Animated.View className="absolute left-0 right-0 top-0" style={{ height: insets.top + 180, opacity: headerOpacity }} pointerEvents="none">
          <LinearGradient
            colors={isDark ? ["rgba(15,23,42,0.92)", "rgba(15,23,42,0.85)", "rgba(15,23,42,0.45)", "rgba(15,23,42,0.08)", "transparent"] : ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.82)", "rgba(255,255,255,0.35)", "rgba(255,255,255,0.06)", "transparent"]}
            locations={[0, 0.35, 0.6, 0.82, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="flex-1"
          />
        </Animated.View>

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
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
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
          {/* Subtle top-of-page color wash */}
          <View className="absolute top-0 left-0 right-0 h-64" pointerEvents="none" style={{ marginTop: -insets.top - 72 }}>
            <LinearGradient
              colors={isDark ? ["rgba(37,99,235,0.06)", "rgba(124,58,237,0.03)", "transparent"] : ["rgba(37,99,235,0.04)", "rgba(124,58,237,0.02)", "transparent"]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              className="flex-1"
            />
          </View>

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
              <View className="flex-row items-center justify-between mx-5 mb-3">
                <Text className="text-[11px] font-semibold tracking-[1.5px] uppercase text-text-muted dark:text-gray-500">Recent</Text>
                <Pressable onPress={() => useRecentsStore.getState().clearRecents()} hitSlop={8}>
                  <Text className="text-xs font-medium text-text-muted dark:text-gray-500">Clear all</Text>
                </Pressable>
              </View>
              <View className="mx-5 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-800">
                {recents.slice(0, 5).map((item, i) => {
                  const book = BOOKS.find((b) => b.id === item.bookId);
                  return (
                    <View key={item.hymnId} className={`flex-row items-center bg-white dark:bg-slate-900 ${i < Math.min(recents.length, 5) - 1 ? "border-b border-gray-50 dark:border-slate-800" : ""}`}>
                      <PressableScale className="flex-1 flex-row items-center pl-4 py-3.5 gap-3" onPress={() => openHymn(item.bookId, item.number)}>
                        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: book?.color ?? theme.primary }} />
                        <View className="flex-1">
                          <Text className="text-[15px] font-semibold text-text-primary dark:text-gray-100" numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">{item.bookName}</Text>
                        </View>
                        <Text className="text-[13px] font-medium text-text-muted dark:text-gray-400">#{item.number}</Text>
                      </PressableScale>
                      <Pressable onPress={() => removeRecent(item.hymnId)} hitSlop={8} className="pr-4 pl-1 py-3.5">
                        <Ionicons name="close" size={15} color={theme.textMuted} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Hymn Collections ── */}
          {idle && (
            <View className="mb-8">
              <Text className="text-[11px] font-semibold tracking-[1.5px] uppercase text-text-muted dark:text-gray-500 ml-5 mb-3">Collections</Text>
              <View className="mx-5 gap-2.5">
                {BOOKS.map((book) => (
                  <PressableScale key={book.id} onPress={() => router.push({ pathname: "/book/[bookId]", params: { bookId: book.id } })}>
                    <View className="flex-row items-center rounded-xl px-4 py-4 border border-gray-100 dark:border-slate-800" style={{ backgroundColor: isDark ? `${book.color}0D` : `${book.color}08` }}>
                      <View className="w-11 h-11 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: book.color + "18" }}>
                        <Text className="text-[17px] font-bold" style={{ color: book.color }}>
                          {book.shortName.charAt(0)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[16px] font-semibold text-text-primary dark:text-gray-100">{book.name}</Text>
                        <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">{book.desc}</Text>
                        <Text className="text-[11px] font-medium text-text-muted dark:text-gray-500 mt-1.5">
                          {book.count} hymns · {book.id === "golden-bells" ? "English" : "Kikuyu"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </View>
                  </PressableScale>
                ))}
              </View>
            </View>
          )}

          {/* ── Quick tip ── */}
          {!recents.length && idle && (
            <View className="mx-5 mb-8">
              <View className="flex-row items-start gap-3">
                <View className="w-9 h-9 rounded-lg bg-primary/8 dark:bg-primary/15 items-center justify-center mt-0.5">
                  <Ionicons name="bulb-outline" size={16} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-text-primary dark:text-gray-100 mb-0.5">Quick tip</Text>
                  <Text className="text-[13px] text-text-secondary dark:text-gray-400 leading-relaxed">
                    Type <Text className="font-semibold text-primary">#42</Text> to jump to a hymn number, or search by any phrase from the lyrics.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
}
