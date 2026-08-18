import { BlurView } from "expo-blur";
import { useRef } from "react";
import { Animated, Pressable, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/common/Text";

import type { BookId } from "@/data/types";
import { useSettingsStore } from "@/state/settingsStore";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { FontSizePill } from "@/components/common/FontSizePill";
import { SectionLabel } from "@/components/common/SectionLabel";
import { BackupSection } from "@/components/settings/BackupSection";
import { TopGlow } from "@/components/SoftGlow";
import { theme } from "@/theme/colors";

const SEARCH_BOOKS: { id: BookId; name: string; count: number }[] = [
  { id: "roho-mutheru", name: "Nyimbo Cia Roho Mutheru", count: 555 },
  { id: "atumwo", name: "Nyimbo Cia Atumwo", count: 218 },
  { id: "kiroho", name: "Nyimbo Cia Kiroho", count: 464 },
  { id: "golden-bells", name: "Golden Bells", count: 771 },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { fontSize, body, bodySmall, caption, captionSmall } = useFontScale();
  const isDark = useIsDark();

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = insets.top + 68;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const readingFont = useSettingsStore((s) => s.readingFont);
  const setReadingFont = useSettingsStore((s) => s.setReadingFont);
  const searchBooks = useSettingsStore((s) => s.searchBooks);
  const toggleSearchBook = useSettingsStore((s) => s.toggleSearchBook);

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      {/* Floating header — fades in on scroll */}
      <Animated.View className="absolute top-0 right-0 left-0 z-10" style={{ paddingTop: insets.top + 8 }}>
        <TopGlow height={headerHeight + 90} opacity={headerOpacity} />

        <Animated.View
          className="absolute top-0 right-0 left-0 overflow-hidden"
          style={{ height: headerHeight, opacity: headerOpacity }}
          pointerEvents="none"
        >
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View className="px-6 pb-4">
          <Text className="text-text-primary font-extrabold tracking-tight dark:text-gray-100" style={{ fontSize: fontSize + 14 }}>
            Settings
          </Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: headerHeight, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        {/* Appearance */}
        <SectionLabel className="mb-3 ml-1">Appearance</SectionLabel>
        <View className="mb-8 flex-row gap-2">
          {(["system", "light", "dark"] as const).map((mode) => {
            const active = themeMode === mode;
            return (
              <Pressable
                key={mode}
                className={`flex-1 items-center rounded-xl border py-2.5 ${active ? "border-primary/40 bg-primary/5 dark:bg-primary/10" : "border-gray-200 dark:border-slate-700"}`}
                onPress={() => setThemeMode(mode)}
              >
                <Text
                  className={`font-semibold capitalize ${active ? "text-primary" : "text-text-secondary dark:text-gray-400"}`}
                  style={{ fontSize: bodySmall }}
                >
                  {mode}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Reading */}
        <SectionLabel className="mb-3 ml-1">Reading</SectionLabel>
        <View className="mb-8 rounded-xl border border-gray-100 bg-gray-50 px-4 py-1 dark:border-slate-800 dark:bg-slate-900">
          {/* Font family */}
          <View className="flex-row items-center justify-between border-b border-gray-100/60 py-2.5 dark:border-slate-800/60">
            <View className="flex-1">
              <Text className="text-text-primary font-semibold dark:text-gray-100" style={{ fontSize: body }}>
                Serif font
              </Text>
              <Text className="text-text-muted mt-0.5 dark:text-gray-500" style={{ fontSize: captionSmall }}>
                Literata typeface for reading
              </Text>
            </View>
            <Switch
              value={readingFont === "serif"}
              onValueChange={(v) => setReadingFont(v ? "serif" : "sans")}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={readingFont === "serif" ? theme.primary : theme.textMuted}
            />
          </View>
          {/* Font size */}
          <View className="flex-row items-center justify-between py-2.5">
            <View className="flex-1">
              <Text className="text-text-primary font-semibold dark:text-gray-100" style={{ fontSize: body }}>
                Font size
              </Text>
              <Text className="text-text-muted mt-0.5 dark:text-gray-500" style={{ fontSize: captionSmall }}>
                Adjust reading text size
              </Text>
            </View>
            <FontSizePill />
          </View>
        </View>

        {/* Search scope */}
        <SectionLabel className="mb-3 ml-1">Search scope</SectionLabel>
        <View className="mb-8 rounded-xl border border-gray-100 bg-gray-50 px-4 py-1 dark:border-slate-800 dark:bg-slate-900">
          {SEARCH_BOOKS.map((book) => (
            <View
              key={book.id}
              className="flex-row items-center justify-between border-b border-gray-100/60 py-2.5 last:border-b-0 dark:border-slate-800/60"
            >
              <View className="flex-1">
                <Text className="text-text-primary font-semibold dark:text-gray-100" style={{ fontSize: body }}>
                  {book.name}
                </Text>
                <Text className="text-text-muted mt-0.5 dark:text-gray-500" style={{ fontSize: captionSmall }}>
                  {book.count} hymns
                </Text>
              </View>
              <Switch
                // Switch component to toggle search scope for each book
                value={searchBooks.includes(book.id)}
                onValueChange={() => toggleSearchBook(book.id)}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={searchBooks.includes(book.id) ? theme.primary : theme.textMuted}
              />
            </View>
          ))}
        </View>

        <BackupSection />

        {/* About */}
        <Text className="text-text-muted text-center dark:text-gray-500" style={{ fontSize: caption }}>
          2,008 hymns across 4 books
        </Text>
      </Animated.ScrollView>
    </View>
  );
}
