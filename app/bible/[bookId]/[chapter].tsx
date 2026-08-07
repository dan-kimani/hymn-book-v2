import { BottomGlow, TopGlow } from "@/components/SoftGlow";
import { VerseSelectionBar } from "@/components/bible/VerseSelectionBar";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { setStringAsync } from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { BibleVerse, CrossReference } from "@/data/bibleTypes";
import { useBibleStore } from "@/state/bibleStore";
import { useBibleBookmarksStore } from "@/state/bibleBookmarksStore";
import { useSettingsStore } from "@/state/settingsStore";
import { theme } from "@/theme/colors";

function VerseRow({
  verse,
  isDark,
  fontSize,
  crossRefs,
  onRefPress,
  highlighted,
  bookmarked,
  selected,
  onLongPress,
  onPress,
  onLayout,
}: {
  verse: BibleVerse;
  isDark: boolean;
  fontSize: number;
  crossRefs?: CrossReference[];
  onRefPress: (ref: CrossReference) => void;
  highlighted?: boolean;
  bookmarked?: boolean;
  selected?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
  onLayout?: (y: number) => void;
}) {
  const vsSize = Math.max(10, fontSize - 5);
  const leading = fontSize * 1.6;
  const hlBg = highlighted ? "bg-primary-tint/30 dark:bg-primary/10 rounded-lg py-2 -mx-1" : "";
  const selBg = selected && !highlighted ? "bg-primary-tint/30 dark:bg-primary/10 rounded-lg py-2 -mx-1" : "";
  const bmBg = bookmarked && !selected && !highlighted ? "bg-amber-50 dark:bg-amber-950/20 rounded-lg py-1.5 -mx-1" : "";

  return (
    <Pressable className={`mb-3 px-5 ${hlBg} ${selBg} ${bmBg}`} onLongPress={onLongPress} onPress={onPress} delayLongPress={400} onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}>
      <View className="flex-row">
        <Text
          className="font-semibold mr-2.5 mt-0.5"
          style={{
            fontSize: vsSize,
            color: bookmarked && !selected ? "#B45309" : isDark ? "rgba(249,115,22,0.6)" : "rgba(249,115,22,0.55)",
            minWidth: 24,
            lineHeight: leading,
          }}
        >
          {bookmarked && !selected ? "🔖" : verse.verse}
        </Text>
        <Text className="flex-1 text-text-primary dark:text-gray-100" style={{ fontSize, lineHeight: leading }}>
          {verse.text}
        </Text>
      </View>
      {crossRefs && crossRefs.length > 0 && (
        <View className="flex-row flex-wrap gap-1 ml-8 mt-1">
          {crossRefs.slice(0, 8).map((ref, i) => (
            <Pressable key={i} onPress={() => onRefPress(ref)} className="px-1.5 py-0.5 rounded bg-primary-tint/40 dark:bg-primary/10">
              <Text className="text-[10px] text-primary font-medium">
                {ref.shortName} {ref.chapter}:{ref.verseStart}
                {ref.verseEnd !== ref.verseStart ? `-${ref.verseEnd}` : ""}
              </Text>
            </Pressable>
          ))}
          {crossRefs.length > 8 && <Text className="text-[10px] text-text-muted dark:text-gray-500 self-center">+{crossRefs.length - 8} more</Text>}
        </View>
      )}
    </Pressable>
  );
}

export default function BibleChapterScreen() {
  const { bookId, chapter, verse } = useLocalSearchParams<{
    bookId: string;
    chapter: string;
    verse?: string;
  }>();
  const id = parseInt(bookId ?? "1", 10);
  const ch = parseInt(chapter ?? "1", 10);
  const highlightVerse = verse ? parseInt(verse, 10) : null;

  const [highlightedVs, setHighlightedVs] = useState<number | null>(highlightVerse);
  const scrollRef = useRef<any>(null);
  const verseYs = useRef<Record<number, number>>({});
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const fontSize = useSettingsStore((s) => s.fontSize ?? 18);
  const setFontSize = useSettingsStore((s) => s.setFontSize);

  const { verses, book, crossRefsMap, totalChapters, loadChapter } = useBibleStore((s) => s);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Selection
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const addBookmark = useBibleBookmarksStore((s) => s.addBookmark);
  const isBookmarked = useBibleBookmarksStore((s) => s.isBookmarked);

  const { selectionRef, selectionText, headerVerses } = useMemo(() => {
    const sorted = verses.filter((v) => selectedVerses.has(v.verse)).sort((a, b) => a.verse - b.verse);
    return {
      headerVerses: sorted,
      selectionText: sorted.map((v) => `${v.verse}. ${v.text}`).join("\n"),
      selectionRef: sorted.length > 0 ? `${book?.name ?? ""} ${ch}:${sorted[0].verse}${sorted.length > 1 ? `-${sorted[sorted.length - 1].verse}` : ""}` : "",
    };
  }, [verses, selectedVerses, book?.name, ch]);

  const clearSelection = () => {
    setSelectionAnchor(null);
    setSelectedVerses(new Set());
  };

  const handleVersePress = (vs: number) => {
    if (selectionAnchor == null) return;
    const start = Math.min(selectionAnchor, vs);
    const end = Math.max(selectionAnchor, vs);
    const set = new Set<number>();
    for (let i = start; i <= end; i++) set.add(i);
    setSelectedVerses(set);
  };

  const handleVerseLongPress = (vs: number) => {
    setSelectionAnchor(vs);
    setSelectedVerses(new Set([vs]));
  };

  const handleSelectAll = () => {
    setSelectionAnchor(1);
    const set = new Set<number>();
    for (const v of verses) set.add(v.verse);
    setSelectedVerses(set);
  };

  const handleCopy = () => {
    const text = `${selectionRef}\n\n${selectionText}`;
    setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookmark = (note: string) => {
    if (headerVerses.length === 0) return;
    addBookmark({
      bookId: id,
      bookName: book?.name ?? "",
      chapter: ch,
      verseStart: headerVerses[0].verse,
      verseEnd: headerVerses[headerVerses.length - 1].verse,
      note,
    });
    clearSelection();
  };

  useEffect(() => { loadChapter(id, ch); }, [id, ch, loadChapter]);

  // Sync + auto-scroll to highlighted verse on cross-reference navigation
  useEffect(() => {
    setHighlightedVs(highlightVerse);
    if (highlightVerse && verses.length > 0) {
      setTimeout(() => {
        const y = verseYs.current[highlightVerse];
        if (y != null) scrollRef.current?.scrollTo?.({ y: y - 120, animated: true });
        setTimeout(() => setHighlightedVs(null), 2500);
      }, 400);
    }
  }, [highlightVerse, verses.length]);

  const handleRefPress = useCallback((ref: CrossReference) => {
    router.push({
      pathname: "/bible/[bookId]/[chapter]" as any,
      params: { bookId: String(ref.bookId), chapter: String(ref.chapter), verse: String(ref.verseStart) },
    });
  }, []);

  const goToChapter = useCallback(
    (newCh: number) => {
      if (newCh < 1 || newCh > totalChapters) return;
      scrollRef.current?.scrollTo?.({ y: 0, animated: false });
      router.setParams({ bookId: String(id), chapter: String(newCh), verse: "" });
    },
    [id, totalChapters],
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 32],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });

  const bg = isDark ? "#0F172A" : "#FFFFFF";

  return (
    <View className="flex-1" style={{ backgroundColor: bg }}>
      {/* Floating header */}
      <Animated.View className="absolute top-0 left-0 right-0 z-10" style={{ paddingTop: insets.top }}>
        <TopGlow height={insets.top + 80} opacity={headerOpacity} />

        <Animated.View className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: insets.top + 48, opacity: headerOpacity }} pointerEvents="none">
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View className="flex-row items-center px-3 h-12 gap-2" style={{ backgroundColor: "transparent" }}>
          <Pressable onPress={() => router.back()} hitSlop={8} className="pr-1">
            <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <View className="flex-1 flex-row items-center gap-2">
            {selectionAnchor != null ? (
              <>
                <Pressable onPress={handleSelectAll} className="px-2 py-0.5 rounded-md bg-primary-tint/40 dark:bg-primary/20">
                  <Text className="text-[12px] font-semibold text-primary">Select All</Text>
                </Pressable>
                <Pressable onPress={clearSelection} className="px-2 py-0.5 rounded-md bg-gray-200/60 dark:bg-slate-700/40">
                  <Text className="text-[12px] font-semibold text-text-secondary dark:text-gray-400">Deselect</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-[15px] font-semibold text-text-primary dark:text-gray-100" numberOfLines={1}>
                  {book?.shortName ?? book?.name ?? "..."}
                </Text>
                <Text className="text-[14px] text-text-muted dark:text-gray-500">{ch}</Text>
              </>
            )}
          </View>
          {/* Prev/next */}
          <Pressable onPress={() => goToChapter(ch - 1)} disabled={ch <= 1} hitSlop={8} className="p-1.5">
            <Ionicons name="chevron-back" size={18} color={ch <= 1 ? theme.textMuted : isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => goToChapter(ch + 1)} disabled={ch >= totalChapters} hitSlop={8} className="p-1.5">
            <Ionicons name="chevron-forward" size={18} color={ch >= totalChapters ? theme.textMuted : isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Verse content */}
      <Animated.ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 64,
          paddingBottom: 60,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Chapter title */}
        <View className="px-5 mb-6 mt-2">
          <Text className="text-[13px] font-semibold tracking-[1.5px] uppercase text-text-muted dark:text-gray-500">{book?.name}</Text>
          <Text className="text-[22px] font-bold text-text-primary dark:text-gray-100 mt-1">Chapter {ch}</Text>
        </View>

        {selectionAnchor != null && selectedVerses.size > 0 && (
          <VerseSelectionBar text={`${selectionRef}\n\n${selectionText}`} verseCount={selectedVerses.size} anchorY={verseYs.current[selectionAnchor] ?? 200} onBookmark={handleBookmark} onCopy={handleCopy} />
        )}

        {verses.map((v) => (
          <VerseRow
            key={v.verse}
            verse={v}
            isDark={isDark}
            fontSize={fontSize}
            crossRefs={crossRefsMap[v.verse]}
            onRefPress={handleRefPress}
            highlighted={highlightedVs === v.verse}
            selected={selectedVerses.has(v.verse)}
            bookmarked={!!isBookmarked(id, ch, v.verse)}
            onLongPress={() => handleVerseLongPress(v.verse)}
            onPress={() => handleVersePress(v.verse)}
            onLayout={(y) => {
              verseYs.current[v.verse] = y;
            }}
          />
        ))}

        {/* Bottom chapter navigation */}
        <View className="flex-row justify-center gap-4 mt-8 mb-4">
          <Pressable
            onPress={() => goToChapter(ch - 1)}
            disabled={ch <= 1}
            className={`flex-row items-center gap-1.5 px-5 py-2.5 rounded-full ${ch <= 1 ? "opacity-30" : ""}`}
            style={{
              backgroundColor: isDark ? "rgba(30,41,59,0.6)" : theme.surfaceAlt,
            }}
          >
            <Ionicons name="chevron-back" size={16} color={isDark ? "#94A3B8" : theme.textSecondary} />
            <Text className="text-[14px] text-text-secondary dark:text-gray-400">Chapter {ch - 1}</Text>
          </Pressable>
          <Pressable
            onPress={() => goToChapter(ch + 1)}
            disabled={ch >= totalChapters}
            className={`flex-row items-center gap-1.5 px-5 py-2.5 rounded-full ${ch >= totalChapters ? "opacity-30" : ""}`}
            style={{
              backgroundColor: isDark ? "rgba(30,41,59,0.6)" : theme.surfaceAlt,
            }}
          >
            <Text className="text-[14px] text-text-secondary dark:text-gray-400">Chapter {ch + 1}</Text>
            <Ionicons name="chevron-forward" size={16} color={isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
        </View>
      </Animated.ScrollView>

      {/* Copy toast */}
      {copied && (
        <View className="absolute px-5 py-2.5 rounded-full bg-primary/90 z-20" style={{ top: "50%", left: "50%", transform: [{ translateX: -50 }, { translateY: -50 }] }}>
          <Text className="text-white text-sm font-semibold">Copied {selectedVerses.size} verses</Text>
        </View>
      )}

      {/* Font controls floating pill */}
      <View
        className="absolute left-4 flex-row items-center px-2.5 py-2 rounded-2xl gap-1.5 overflow-hidden z-10"
        style={{
          bottom: 20,
          shadowColor: isDark ? "rgba(249,115,22,0.2)" : "rgba(148,163,184,0.15)",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        <View className="absolute inset-0" pointerEvents="none">
          <BlurView intensity={isDark ? 25 : 18} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </View>
        <View className="absolute inset-0 bg-white/65 dark:bg-slate-950/55" pointerEvents="none" />
        <Pressable className="w-8 h-8 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 items-center justify-center" onPress={() => setFontSize(fontSize - 2)}>
          <Text className="text-[12px] font-semibold text-text-primary dark:text-gray-100">A−</Text>
        </Pressable>
        <Text className="text-xs font-semibold text-text-secondary dark:text-gray-400 w-7 text-center">{fontSize}px</Text>
        <Pressable className="w-8 h-8 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 items-center justify-center" onPress={() => setFontSize(fontSize + 2)}>
          <Text className="text-[12px] font-semibold text-text-primary dark:text-gray-100">A+</Text>
        </Pressable>
      </View>

      <BottomGlow />
    </View>
  );
}
