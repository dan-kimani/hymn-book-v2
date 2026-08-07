import { BottomGlow, TopGlow } from "@/components/SoftGlow";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/common/PressableScale";
import { useBibleStore } from "@/state/bibleStore";
import { theme } from "@/theme/colors";

const CHAPTERS_PER_ROW = 6;

export default function BibleBookScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const id = parseInt(bookId ?? "1", 10);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const books = useBibleStore((s) => s.books);
  const loadBooks = useBibleStore((s) => s.loadBooks);
  const book = books.find((b) => b.id === id) ?? null;
  const chapterCount = book?.chapters ?? 0;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (books.length === 0) loadBooks();
  }, []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false },
  );

  const rows: number[][] = [];
  for (let i = 0; i < chapterCount; i += CHAPTERS_PER_ROW) {
    rows.push(
      Array.from({ length: CHAPTERS_PER_ROW }, (_, j) => i + j + 1).filter(
        (c) => c <= chapterCount,
      ),
    );
  }

  const bg = isDark ? "#0F172A" : "#FFFFFF";

  return (
    <View className="flex-1" style={{ backgroundColor: bg }}>
      {/* Header */}
      <Animated.View
        className="absolute top-0 left-0 right-0 z-10"
        style={{ paddingTop: insets.top }}
      >
        <TopGlow height={insets.top + 80} opacity={headerOpacity} />

        <Animated.View
          className="absolute left-0 right-0 top-0 overflow-hidden"
          style={{ height: insets.top + 48, opacity: headerOpacity }}
          pointerEvents="none"
        >
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View
          className="flex-row items-center px-4 h-12 gap-3"
          style={{ backgroundColor: "transparent" }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[17px] font-semibold text-text-primary dark:text-gray-100" numberOfLines={1}>
              {book?.name ?? "Loading..."}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Chapter grid */}
      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 64,
          paddingBottom: 40,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Book info */}
        {book && (
          <View className="mb-6 px-1">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="px-2 py-0.5 rounded-md bg-primary-tint dark:bg-primary/20">
                <Text className="text-[12px] font-semibold text-primary">
                  {book.testament === "OT" ? "Kĩrĩkanĩro Gĩa Tene" : "Kĩrĩkanĩro Kĩerũ"}
                </Text>
              </View>
              <Text className="text-[13px] text-text-muted dark:text-gray-500">
                {chapterCount} chapters
              </Text>
            </View>
          </View>
        )}

        {rows.map((row, ri) => (
          <View key={ri} className="flex-row gap-2 mb-2">
            {row.map((ch) => (
              <PressableScale
                key={ch}
                className="flex-1 aspect-square rounded-xl items-center justify-center border border-border dark:border-slate-800"
                style={{
                  backgroundColor: isDark ? "rgba(30,41,59,0.5)" : "#F8FAFC",
                }}
                onPress={() =>
                  router.push({
                    pathname: "/bible/[bookId]/[chapter]",
                    params: { bookId: String(id), chapter: String(ch) },
                  })
                }
              >
                <Text className="text-[16px] font-semibold text-text-primary dark:text-gray-100">
                  {ch}
                </Text>
              </PressableScale>
            ))}
            {/* Fill remaining slots with invisible placeholders */}
            {row.length < CHAPTERS_PER_ROW &&
              Array.from({ length: CHAPTERS_PER_ROW - row.length }).map((_, i) => (
                <View key={`pad-${i}`} className="flex-1 aspect-square" />
              ))}
          </View>
        ))}
      </Animated.ScrollView>

      <BottomGlow />
    </View>
  );
}
