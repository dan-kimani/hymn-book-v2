import { BottomGlow, TopGlow } from "@/components/SoftGlow";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/common/Text";
import { useIsDark } from "@/hooks/useIsDark";

import { PressableScale } from "@/components/common/PressableScale";
import { useBibleStore } from "@/state/bibleStore";
import { useFontScale } from "@/hooks/useFontScale";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { SummarySheet } from "@/components/bible/SummarySheet";
import { BOOK_SUMMARIES } from "@/data/bookSummaries";
import { theme } from "@/theme/colors";

const CHAPTERS_PER_ROW = 4;

function ChapterCell({ ch, index, onPress }: { ch: number; index: number; onPress: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  const { heading: headingSize, captionSmall: captionSize } = useFontScale();

  useEffect(() => {
    const delay = 40 + index * 40;
    Animated.parallel([Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay, useNativeDriver: true }), Animated.timing(slideAnim, { toValue: 0, duration: 350, delay, useNativeDriver: true })]).start();
  }, []);

  const handlePressIn = () => {
    Animated.sequence([Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: false }), Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: false })]).start();
    onPress();
  };

  const flashBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(249,115,22,0)", "rgba(249,115,22,0.12)"],
  });

  // Alternating tint: even rows get a slightly lighter bg
  const rowIndex = Math.floor(index / CHAPTERS_PER_ROW);
  const altBg = rowIndex % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/40" : "bg-slate-100/50 dark:bg-slate-800/60";

  return (
    <Animated.View className="flex-1 aspect-square" style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <PressableScale className={`flex-1 aspect-square rounded-xl items-center justify-center border border-border dark:border-slate-800 ${altBg}`} onPress={handlePressIn}>
        <Animated.View className="absolute inset-0 rounded-xl" style={{ backgroundColor: flashBg }} pointerEvents="none" />
        <View className="items-center gap-0.5">
          <Text className="font-semibold text-text-muted dark:text-gray-500" style={{ fontSize: captionSize }}>
            Chapter
          </Text>
          <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: headingSize }}>
            {ch}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export default function BibleBookScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const id = parseInt(bookId ?? "1", 10);
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();

  const books = useBibleStore((s) => s.books);
  const loadBooks = useBibleStore((s) => s.loadBooks);
  const book = books.find((b) => b.id === id) ?? null;
  const chapterCount = book?.chapters ?? 0;
  const bookIdx = books.findIndex((b) => b.id === id);
  const prevBook = bookIdx > 0 ? books[bookIdx - 1] : null;
  const nextBook = bookIdx < books.length - 1 ? books[bookIdx + 1] : null;
  const scrollY = useRef(new Animated.Value(0)).current;

  const { fontSize, heading: headingSize, captionSmall: captionSize } = useFontScale();

  useEffect(() => {
    if (books.length === 0) loadBooks();
  }, []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });

  const rows: number[][] = [];
  for (let i = 0; i < chapterCount; i += CHAPTERS_PER_ROW) {
    rows.push(Array.from({ length: CHAPTERS_PER_ROW }, (_, j) => i + j + 1).filter((c) => c <= chapterCount));
  }

  const isOT = book?.testament === "OT";
  const [summaryVisible, setSummaryVisible] = useState(false);
  const summary = book ? BOOK_SUMMARIES[book.usfm] : null;
  const scrollRef = useRef<any>(null);

  const goToBook = (newId: number) => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    router.setParams({ bookId: String(newId) });
  };

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      {/* Header */}
      <Animated.View className="absolute top-0 left-0 right-0 z-10" style={{ paddingTop: insets.top }}>
        <TopGlow height={insets.top + 80} opacity={headerOpacity} />

        <Animated.View className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: insets.top + 48, opacity: headerOpacity }} pointerEvents="none">
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View className="flex-row items-center px-4 h-12 gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-semibold text-text-primary dark:text-gray-100" numberOfLines={1} style={{ fontSize: headingSize }}>
              {book?.name ?? "Loading..."}
            </Text>
          </View>
          <ThemeToggle />
          {prevBook && (
            <Pressable onPress={() => goToBook(prevBook.id)} hitSlop={8} className="p-1">
              <Ionicons name="chevron-back" size={18} color={isDark ? "#94A3B8" : theme.textSecondary} />
            </Pressable>
          )}
          {nextBook && (
            <Pressable onPress={() => goToBook(nextBook.id)} hitSlop={8} className="p-1">
              <Ionicons name="chevron-forward" size={18} color={isDark ? "#94A3B8" : theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Chapter grid */}
      {books.length === 0 ? (
        <View className="flex-1 items-center justify-center" style={{ paddingTop: insets.top + 64 }}>
          <View className="gap-3">
            {[0.6, 0.8, 0.5].map((w, i) => (
              <View key={i} className="h-4 rounded-lg bg-gray-100 dark:bg-slate-800" style={{ width: `${w * 100}%`, maxWidth: 280 }} />
            ))}
          </View>
        </View>
      ) : (
        <Animated.ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingTop: insets.top + 64,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 16,
          }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {/* Book heading */}
          {book && (
            <View className="mb-6 px-1">
              <View className="flex-row items-start gap-2">
                <View className="flex-1">
                  <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: fontSize + 4 }}>
                    {book.name}
                  </Text>
                  <Text className="text-text-muted dark:text-gray-500 mt-0.5" style={{ fontSize: headingSize }}>
                    {book.englishName}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
                    <Text className="font-medium" style={{ fontSize: captionSize, color: isOT ? "#B45309" : "#2563EB" }}>
                      {isOT ? "Kĩrĩkanĩro Gĩa Tene" : "Kĩrĩkanĩro Kĩerũ"}
                    </Text>
                    <Text className="text-text-muted/60 dark:text-gray-600" style={{ fontSize: captionSize }}>·</Text>
                    <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: captionSize }}>
                      {chapterCount} chapter{chapterCount === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>
                {summary && (
                  <Pressable onPress={() => setSummaryVisible(true)} hitSlop={8} className={`w-9 h-9 rounded-lg items-center justify-center mt-1 ${isOT ? "bg-amber-500/10 dark:bg-amber-500/15" : "bg-blue-500/10 dark:bg-blue-500/15"}`}>
                    <Ionicons name="sparkles" size={18} color={isOT ? "#B45309" : "#2563EB"} />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {rows.map((row, ri) => (
            <View key={ri} className="flex-row gap-2 mb-2">
              {row.map((ch, ci) => (
                <ChapterCell
                  key={ch}
                  ch={ch}
                  index={ri * CHAPTERS_PER_ROW + ci}
                  onPress={() =>
                    router.push({
                      pathname: "/bible/[bookId]/[chapter]",
                      params: { bookId: String(id), chapter: String(ch) },
                    })
                  }
                />
              ))}
              {/* Fill remaining slots with invisible placeholders */}
              {row.length < CHAPTERS_PER_ROW && Array.from({ length: CHAPTERS_PER_ROW - row.length }).map((_, i) => <View key={`pad-${i}`} className="flex-1 aspect-square" />)}
            </View>
          ))}
        </Animated.ScrollView>
      )}

      <BottomGlow />

      {summary && (
        <SummarySheet
          visible={summaryVisible}
          bookName={book?.name ?? ""}
          isOT={isOT}
          context={summary.context}
          summary={summary.summary}
          aftermath={summary.aftermath}
          onClose={() => setSummaryVisible(false)}
        />
      )}
    </View>
  );
}
