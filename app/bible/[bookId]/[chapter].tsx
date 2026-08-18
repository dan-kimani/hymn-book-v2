import { BottomGlow, TopGlow } from "@/components/SoftGlow";
import { VerseSelectionBar } from "@/components/bible/VerseSelectionBar";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@/components/common/Text";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { BibleBook, BibleVerse, CrossReference } from "@/data/bibleTypes";
import { fetchBibleBook, fetchBibleChapter, fetchCrossReferences } from "@/data/bibleQueries";
import { useBibleBookmarksStore } from "@/state/bibleBookmarksStore";
import { theme } from "@/theme/colors";
import { useFontScale } from "@/hooks/useFontScale";
import { FontSizePill } from "@/components/common/FontSizePill";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { AIStudyModal } from "@/components/bible/AIStudyModal";
import { CrossRefExplorer } from "@/components/bible/CrossRefExplorer";
import { useIsDark } from "@/hooks/useIsDark";
import { useHorizontalSwipeNav } from "@/hooks/useHorizontalSwipeNav";
import { ChapterShimmer } from "@/components/bible/ChapterShimmer";

function VerseRow({
  verse,
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
  crossRefs?: CrossReference[];
  onRefPress: (ref: CrossReference) => void;
  highlighted?: boolean;
  bookmarked?: boolean;
  selected?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
  onLayout?: (y: number) => void;
}) {
  const { fontSize, verseNumber: vsSize } = useFontScale();
  const leading = fontSize * 1.6;
  const hlBg = highlighted ? "bg-primary-tint/30 dark:bg-primary/10 rounded-lg py-2 -mx-1" : "";
  const selBg = selected && !highlighted ? "bg-primary/15 dark:bg-primary/20 rounded-lg py-2 -mx-1 border-l-2 border-primary" : "";
  const bmBg = bookmarked && !selected && !highlighted ? "bg-amber-50 dark:bg-amber-950/20 rounded-lg py-1.5 -mx-1" : "";

  return (
    <Pressable
      className={`mb-3 px-5 ${hlBg} ${selBg} ${bmBg}`}
      onLongPress={onLongPress}
      onPress={onPress}
      delayLongPress={400}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
    >
      <Text className="text-text-primary dark:text-gray-100" style={{ fontSize, lineHeight: leading }}>
        <Text
          className={bookmarked && !selected ? "font-semibold text-amber-700" : "text-primary dark:text-primary-light font-medium"}
          style={{
            fontSize: vsSize,
            lineHeight: leading,
          }}
        >
          {bookmarked && !selected ? "🔖 " : `${verse.verse}. `}
        </Text>
        {verse.text}
        {crossRefs && crossRefs.length > 0 && (
          <Text className="text-primary dark:text-primary-light font-medium" style={{ fontSize: vsSize }}>
            {"  "}
            {crossRefs.slice(0, 8).map((ref, i) => (
              <Text key={i} onPress={() => onRefPress(ref)}>
                {i > 0 ? " · " : ""}
                {ref.shortName} {ref.chapter}:{ref.verseStart}
                {ref.verseEnd !== ref.verseStart ? `-${ref.verseEnd}` : ""}
              </Text>
            ))}
            {crossRefs.length > 8 && `  +${crossRefs.length - 8} more`}
          </Text>
        )}
      </Text>
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
  const isDark = useIsDark();
  const { fontSize, heading, bodySmall, captionSmall } = useFontScale();

  const currentKey = `${id}:${ch}`;
  const [chapterData, setChapterData] = useState<{
    key: string;
    book: BibleBook | null;
    verses: BibleVerse[];
    crossRefsMap: Record<number, CrossReference[]>;
    totalChapters: number;
  } | null>(null);

  // Derive the visible chapter from the current route key — no reset effect needed:
  // when id/ch change, this naturally falls back to empty (shimmer) until fetch lands.
  const book = chapterData?.key === currentKey ? chapterData.book : null;
  const verses = chapterData?.key === currentKey ? chapterData.verses : [];
  const crossRefsMap = chapterData?.key === currentKey ? chapterData.crossRefsMap : {};
  const totalChapters = chapterData?.key === currentKey ? chapterData.totalChapters : 0;

  const scrollY = useRef(new Animated.Value(0)).current;

  // Selection
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [explorerVisible, setExplorerVisible] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);

  const addBookmark = useBibleBookmarksStore((s) => s.addBookmark);
  const isBookmarked = useBibleBookmarksStore((s) => s.isBookmarked);

  const { selectionRef, englishSelectionRef, selectionText, headerVerses } = useMemo(() => {
    const sorted = verses.filter((v) => selectedVerses.has(v.verse)).toSorted((a, b) => a.verse - b.verse);
    const verseRange = sorted.length > 0 ? `${ch}:${sorted[0].verse}${sorted.length > 1 ? `-${sorted[sorted.length - 1].verse}` : ""}` : "";
    return {
      headerVerses: sorted,
      selectionText: sorted.map((v) => `${v.verse}. ${v.text}`).join("\n"),
      selectionRef: sorted.length > 0 ? `${book?.name ?? ""} ${verseRange}` : "",
      englishSelectionRef: sorted.length > 0 ? `${book?.englishName ?? book?.name ?? ""} ${verseRange}` : "",
    };
  }, [verses, selectedVerses, book?.name, book?.englishName, ch]);

  const clearSelection = useCallback(() => {
    setSelectionAnchor(null);
    setSelectedVerses(new Set());
  }, []);

  const handleVersePress = (vs: number) => {
    // Not in selection mode — ignore taps
    if (selectionAnchor == null) return;
    // Extend range from anchor to tapped verse
    const start = Math.min(selectionAnchor, vs);
    const end = Math.max(selectionAnchor, vs);
    const set = new Set<number>();
    for (let i = start; i <= end; i++) set.add(i);
    setSelectedVerses(set);
  };

  const handleVerseLongPress = (vs: number) => {
    // Long-pressing the only selected verse deselects it
    if (selectionAnchor === vs && selectedVerses.size === 1) {
      clearSelection();
      return;
    }
    // Start or move anchor to this verse
    setSelectionAnchor(vs);
    setSelectedVerses(new Set([vs]));
  };

  const handleSelectAll = () => {
    setSelectionAnchor(1);
    const set = new Set<number>();
    for (const v of verses) set.add(v.verse);
    setSelectedVerses(set);
  };

  const handleCopied = () => {
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bk, vs, crs] = await Promise.all([fetchBibleBook(id), fetchBibleChapter(id, ch), fetchCrossReferences(id, ch)]);
        if (cancelled) return;
        const map: Record<number, CrossReference[]> = {};
        for (const cr of crs) {
          const vsN = cr.sourceVerse;
          if (!map[vsN]) map[vsN] = [];
          map[vsN].push(cr);
        }
        setChapterData({ key: currentKey, book: bk, verses: vs, crossRefsMap: map, totalChapters: bk?.chapters ?? 0 });
      } catch (e) {
        console.error("[chapter.load]", e);
        if (!cancelled) {
          setChapterData({ key: currentKey, book: null, verses: [], crossRefsMap: {}, totalChapters: 0 });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, ch]);

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

  const handleRefPress = useCallback(
    (ref: CrossReference) => {
      if (ref.bookId === id && ref.chapter === ch) {
        // Same chapter — highlight and scroll instead of pushing a duplicate screen.
        setHighlightedVs(ref.verseStart);
        const y = verseYs.current[ref.verseStart];
        if (y != null) {
          scrollRef.current?.scrollTo?.({ y: Math.max(y - 140, 0), animated: true });
        }
        return;
      }
      router.push({
        pathname: "/bible/[bookId]/[chapter]" as any,
        params: { bookId: String(ref.bookId), chapter: String(ref.chapter), verse: String(ref.verseStart) },
      });
    },
    [id, ch],
  );

  const goToChapter = useCallback(
    (newCh: number) => {
      if (newCh < 1 || newCh > totalChapters) return;
      clearSelection();
      scrollRef.current?.scrollTo?.({ y: 0, animated: false });
      router.setParams({ bookId: String(id), chapter: String(newCh), verse: "" });
    },
    [id, totalChapters, clearSelection],
  );

  const panResponder = useHorizontalSwipeNav({
    current: ch,
    max: totalChapters,
    onPrev: () => goToChapter(ch - 1),
    onNext: () => goToChapter(ch + 1),
  });

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
      <Animated.View className="absolute top-0 right-0 left-0 z-10" style={{ paddingTop: insets.top }}>
        <TopGlow height={insets.top + 80} opacity={headerOpacity} />

        <Animated.View
          className="absolute top-0 right-0 left-0 overflow-hidden"
          style={{ height: insets.top + 48, opacity: headerOpacity }}
          pointerEvents="none"
        >
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View className="h-12 flex-row items-center gap-2 px-3" style={{ backgroundColor: "transparent" }}>
          <Pressable onPress={() => router.back()} hitSlop={8} className="pr-1">
            <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <View className="flex-1 flex-row items-center gap-2">
            {selectionAnchor != null ? (
              <>
                <Pressable onPress={handleSelectAll} className="bg-primary-tint/40 dark:bg-primary/20 rounded-md px-2 py-0.5">
                  <Text className="text-primary font-semibold" style={{ fontSize: captionSmall }}>
                    Select All
                  </Text>
                </Pressable>
                <Pressable onPress={clearSelection} className="rounded-md bg-gray-200/60 px-2 py-0.5 dark:bg-slate-700/40">
                  <Text className="text-text-secondary font-semibold dark:text-gray-400" style={{ fontSize: captionSmall }}>
                    Deselect
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-text-primary line-clamp-1 font-semibold dark:text-gray-100" style={{ fontSize: heading }}>
                  {book?.name ?? "..."}
                </Text>
                <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: bodySmall }}>
                  {ch}
                </Text>
              </>
            )}
          </View>
          {Object.keys(crossRefsMap).length > 0 && (
            <Pressable onPress={() => setExplorerVisible(true)} hitSlop={8} className="p-1">
              <Ionicons name="git-branch-outline" size={17} color={isDark ? "#94A3B8" : theme.textSecondary} />
            </Pressable>
          )}
          <ThemeToggle />
          {/* Prev/next */}
          <Pressable onPress={() => goToChapter(ch - 1)} disabled={ch <= 1} hitSlop={8} className="p-1.5">
            <Ionicons name="chevron-back" size={18} color={ch <= 1 ? theme.textMuted : isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => goToChapter(ch + 1)} disabled={ch >= totalChapters} hitSlop={8} className="p-1.5">
            <Ionicons
              name="chevron-forward"
              size={18}
              color={ch >= totalChapters ? theme.textMuted : isDark ? "#94A3B8" : theme.textSecondary}
            />
          </Pressable>
        </View>
      </Animated.View>

      {/* Verse content */}
      <View className="flex-1" {...panResponder.panHandlers}>
        {verses.length === 0 ? (
          <ChapterShimmer paddingTop={insets.top + 64} />
        ) : (
          <Animated.ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{
              paddingTop: insets.top + 64,
              paddingBottom: insets.bottom + 80,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {/* Chapter title */}
            <View className="mt-2 mb-6 px-5">
              <Text className="text-text-muted text-[13px] font-semibold tracking-[1.5px] uppercase dark:text-gray-500">{book?.name}</Text>
              <Text className="text-text-primary mt-1 font-bold dark:text-gray-100" style={{ fontSize: fontSize + 4 }}>
                Chapter {ch}
              </Text>
            </View>

            {verses.map((v) => (
              <VerseRow
                key={v.verse}
                verse={v}
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
            <View className="mt-8 mb-4 flex-row justify-center gap-4">
              <Pressable
                onPress={() => goToChapter(ch - 1)}
                disabled={ch <= 1}
                className={`flex-row items-center gap-1.5 rounded-full px-5 py-2.5 ${ch <= 1 ? "opacity-30" : ""}`}
                style={{
                  backgroundColor: isDark ? "rgba(30,41,59,0.6)" : theme.surfaceAlt,
                }}
              >
                <Ionicons name="chevron-back" size={16} color={isDark ? "#94A3B8" : theme.textSecondary} />
                <Text className="text-text-secondary dark:text-gray-400" style={{ fontSize: bodySmall }}>
                  Chapter {ch - 1}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => goToChapter(ch + 1)}
                disabled={ch >= totalChapters}
                className={`flex-row items-center gap-1.5 rounded-full px-5 py-2.5 ${ch >= totalChapters ? "opacity-30" : ""}`}
                style={{
                  backgroundColor: isDark ? "rgba(30,41,59,0.6)" : theme.surfaceAlt,
                }}
              >
                <Text className="text-text-secondary dark:text-gray-400" style={{ fontSize: bodySmall }}>
                  Chapter {ch + 1}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={isDark ? "#94A3B8" : theme.textSecondary} />
              </Pressable>
            </View>
          </Animated.ScrollView>
        )}

        {selectionAnchor != null && selectedVerses.size > 0 && (
          <VerseSelectionBar
            text={`${selectionRef}\n\n${selectionText}`}
            verseCount={selectedVerses.size}
            anchorY={verseYs.current[selectionAnchor] ?? 200}
            scrollY={scrollY}
            onBookmark={handleBookmark}
            onCopy={handleCopied}
            onAskAI={() => setAiVisible(true)}
          />
        )}
      </View>

      {/* Copy toast */}
      {copied && (
        <View
          className="bg-primary/90 absolute z-20 rounded-full px-5 py-2.5"
          style={{ top: "50%", left: "50%", transform: [{ translateX: -50 }, { translateY: -50 }] }}
        >
          <Text className="text-sm font-semibold text-white">Copied {selectedVerses.size} verses</Text>
        </View>
      )}

      {/* Font controls floating pill */}
      <View
        className="absolute left-4 z-10 flex-row items-center gap-1.5 overflow-hidden rounded-2xl px-2.5 py-2"
        style={{
          bottom: insets.bottom + 20,
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
        <FontSizePill />
      </View>

      <BottomGlow />

      <AIStudyModal visible={aiVisible} reference={englishSelectionRef} onClose={() => setAiVisible(false)} />

      <CrossRefExplorer
        visible={explorerVisible}
        bookId={id}
        bookName={book?.name ?? ""}
        chapter={ch}
        crossRefsMap={crossRefsMap}
        verses={verses}
        onClose={() => setExplorerVisible(false)}
      />
    </View>
  );
}
