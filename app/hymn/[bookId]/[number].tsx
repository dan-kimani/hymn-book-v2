import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { BottomGlow, TopGlow } from "@/components/SoftGlow";
import { useEffect, useRef, useState } from "react";
import { Text } from "@/components/common/Text";
import { Animated, Modal, Pressable, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JumpSheet } from "@/components/search/JumpSheet";
import { fetchHymn } from "@/data/queries";
import type { Hymn } from "@/data/types";
import { usePlayback, useRecorder } from "@/hooks/useRecorder";
import { useFavoritesStore } from "@/state/favoritesStore";
import { useRecentsStore } from "@/state/recentsStore";
import { useCollectionsStore } from "@/state/collectionsStore";
import { useRecordingsStore } from "@/state/recordingsStore";
import { useFontScale } from "@/hooks/useFontScale";
import { FontSizePill } from "@/components/common/FontSizePill";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useIsDark } from "@/hooks/useIsDark";
import { useHorizontalSwipeNav } from "@/hooks/useHorizontalSwipeNav";
import { HymnShimmer } from "@/components/hymn/HymnShimmer";
import { theme } from "@/theme/colors";

const BOOK_NAMES: Record<string, string> = {
  "roho-mutheru": "Nyimbo Cia Roho Mutheru",
  atumwo: "Nyimbo Cia Atumwo",
  kiroho: "Nyimbo Cia Kiroho",
  "golden-bells": "Golden Bells",
};

const BOOK_COLORS: Record<string, string> = {
  "roho-mutheru": "text-book-roho-mutheru",
  atumwo: "text-book-atumwo",
  kiroho: "text-book-kiroho",
  "golden-bells": "text-book-golden-bells",
};

const BOOK_COUNTS: Record<string, number> = {
  "roho-mutheru": 555,
  atumwo: 218,
  kiroho: 464,
  "golden-bells": 771,
};

export default function HymnReaderScreen() {
  const insets = useSafeAreaInsets();
  const { bookId, number, verse: targetVerse, stanza: targetStanza } = useLocalSearchParams<{ bookId: string; number: string; verse?: string; stanza?: string }>();
  const { fontSize, heading, caption } = useFontScale();
  const [hymn, setHymn] = useState<Hymn | null>(null);
  const scrollRef = useRef<any>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const isDark = useIsDark();

  // Quick-jump / search sheet
  const [jumpVisible, setJumpVisible] = useState(false);

  // Add to collection
  const [collectionPickerVisible, setCollectionPickerVisible] = useState(false);
  const collections = useCollectionsStore((s) => s.collections);
  const addToCollection = useCollectionsStore((s) => s.addToCollection);

  // Copied feedback
  const [copied, setCopied] = useState(false);

  // Match highlighting from search
  const matchKey = targetVerse && targetStanza ? `${targetVerse}:${targetStanza}` : null;
  const highlightAnim = useRef(new Animated.Value(1)).current;
  const [highlightKey, setHighlightKey] = useState<string | null>(matchKey);

  useEffect(() => {
    if (!matchKey) return;
    setHighlightKey(matchKey);
    highlightAnim.setValue(1);
    // Delay fade until after scroll lands
    const fadeTimer = setTimeout(() => {
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 2500,
        useNativeDriver: false,
      }).start(() => setHighlightKey(null));
    }, 600);
    return () => clearTimeout(fadeTimer);
  }, [matchKey]);

  const bookName = BOOK_NAMES[bookId ?? ""] ?? bookId ?? "";
  const hymnId = `${bookId}:${number}`;

  // Recording
  const { isRecording, elapsed, start, stop } = useRecorder(hymnId);
  const recording = useRecordingsStore((s) => s.recordings[hymnId]);
  const setRecording = useRecordingsStore((s) => s.setRecording);
  const removeRecording = useRecordingsStore((s) => s.removeRecording);
  // Playback state
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playback = usePlayback(playingPath);

  const handleMicPress = () => {
    if (isRecording) {
      stop().then((result) => {
        if (result) {
          setRecording(hymnId, {
            id: Date.now().toString(36),
            path: result.path,
            duration: result.duration,
            createdAt: Date.now(),
          });
        }
      });
    } else {
      start();
    }
  };

  const handlePlay = (rec: { id: string; path: string }) => {
    if (playingId === rec.id) {
      playback.toggle();
    } else {
      setPlayingId(rec.id);
      setPlayingPath(rec.path);
    }
  };

  const isActive = playingId === recording?.id;
  const recDuration = recording?.duration ?? 0;
  const progress = isActive && recDuration > 0 ? playback.currentTime / recDuration : 0;

  const handleDeleteRecording = () => {
    removeRecording(hymnId);
    setPlayingId(null);
    setPlayingPath(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 48], outputRange: [0, 1], extrapolate: "clamp" });
  const headerHeight = insets.top + 68;

  const isFav = useFavoritesStore((s) => s.favorites.some((f) => f.hymnId === `${bookId}:${number}`));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const addRecent = useRecentsStore((s) => s.addRecent);

  const accent = BOOK_COLORS[bookId ?? ""] ?? "text-primary";
  const currentNum = parseInt(number ?? "1");
  const maxNum = BOOK_COUNTS[bookId ?? ""] ?? 999;

  // Store verse Y offsets for scroll-to-match
  const verseYs = useRef<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchHymn(hymnId);
      if (!cancelled && data) {
        setHymn(data);
        addRecent({ hymnId, bookId: bookId!, bookName, number: currentNum, title: data.title });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hymnId]);

  // Auto-scroll to matched verse from search
  useEffect(() => {
    if (!hymn || !targetVerse) return;
    const tv = parseInt(targetVerse);
    // Small delay to let layout settle, then scroll
    const timer = setTimeout(() => {
      const y = verseYs.current[tv];
      if (y != null) {
        (scrollRef.current as any)?.scrollTo?.({ y: y - 20, animated: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [hymn, targetVerse]);

  const goToHymn = (num: number) => {
    if (num < 1 || num > maxNum) return;
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    setHymn(null);
    router.setParams({ bookId: bookId!, number: String(num), verse: "", stanza: "" });
  };

  const panResponder = useHorizontalSwipeNav({
    current: currentNum,
    max: maxNum,
    onPrev: () => goToHymn(currentNum - 1),
    onNext: () => goToHymn(currentNum + 1),
  });

  const lineHeight = fontSize * 1.7;
  const verseGap = fontSize * 1.3;

  const handleShare = async () => {
    if (!hymn) return;
    const lines: string[] = [];
    lines.push(`${hymn.title}`);
    lines.push(`${bookName} · Hymn No. ${number}`);
    lines.push("");
    hymn.verses.forEach((verse, vi) => {
      if (vi > 0) lines.push("");
      verse.stanzas.forEach((stanza) => {
        stanza.forEach((line) => lines.push(line));
      });
    });
    try {
      await Share.share({ message: lines.join("\n") });
    } catch {}
  };

  const handleCopyStanza = async (stanza: string[]) => {
    await Clipboard.setStringAsync(stanza.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleJumpClose = (num?: number) => {
    setJumpVisible(false);
    if (num != null) {
      // Delay navigation so bottom sheet fully unmounts — avoids addViewAt crash
      setTimeout(() => goToHymn(num), 350);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      {copied && (
        <View className="absolute top-14 left-0 right-0 z-20 items-center" pointerEvents="none">
          <View className="bg-primary/90 dark:bg-primary/80 px-4 py-2 rounded-full">
            <Text className="text-white text-sm font-semibold">Copied to clipboard</Text>
          </View>
        </View>
      )}

      {/* Header — floating glass, scroll-responsive */}
      <Animated.View className="absolute top-0 left-0 right-0" style={{ paddingTop: insets.top + 8, zIndex: 10 }}>
        <TopGlow height={headerHeight + 140} opacity={headerOpacity} />
        <Animated.View className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: headerHeight, opacity: headerOpacity }} pointerEvents="none">
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>
        <View className="flex-row items-start px-4 pb-3.5 gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8} className="pt-0.5">
            <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <View className="flex-1">
            <Text className={`font-semibold tracking-wide ${accent} dark:text-gray-100 line-clamp-1`} style={{ fontSize: heading }}>
              {bookName}
            </Text>
            <Text className="text-text-muted dark:text-gray-400 mt-0.5" style={{ fontSize: caption }}>
              Hymn No. {number}
            </Text>
          </View>
          <ThemeToggle />
          {/* Prev/next arrows */}
          <Pressable onPress={() => goToHymn(currentNum - 1)} disabled={currentNum <= 1} hitSlop={8} className="p-1">
            <Ionicons name="chevron-back" size={18} color={currentNum <= 1 ? theme.textMuted : isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => goToHymn(currentNum + 1)} disabled={currentNum >= maxNum} hitSlop={8} className="p-1">
            <Ionicons name="chevron-forward" size={18} color={currentNum >= maxNum ? theme.textMuted : isDark ? "#94A3B8" : theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => toggleFavorite({ hymnId, bookId: bookId!, bookName, number: currentNum, title: hymn?.title ?? "" })} hitSlop={8} className="pt-0.5">
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color={isFav ? theme.favorite : theme.textMuted} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Recording indicator */}
      {isRecording && (
        <Animated.View
          className="absolute left-1/2 z-20 flex-row items-center gap-1.5 bg-red-500/90 px-3.5 py-1.5 rounded-full"
          style={{
            top: insets.top + 80,
            transform: [{ translateX: -50 }],
          }}
        >
          <View className="w-2.5 h-2.5 rounded-full bg-white" />
          <Text className="text-white text-[13px] font-semibold">{formatTime(elapsed)}</Text>
        </Animated.View>
      )}

      {/* Content */}
      {hymn ? (
        <View className="flex-1" {...panResponder.panHandlers}>
          <Animated.ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: headerHeight + 12 }}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          >
            <Text className="font-bold text-text-primary dark:text-gray-100 text-center mb-1" style={{ fontSize: fontSize + 4, lineHeight: (fontSize + 4) * 1.4 }}>
              {hymn.title}
            </Text>

            {hymn.verses.map((verse, vi) => {
              const vn = verse.number ?? vi + 1;
              return (
                <View
                  key={vi}
                  style={{ marginTop: vi > 0 ? verseGap : fontSize }}
                  onLayout={(e) => {
                    verseYs.current[vn] = e.nativeEvent.layout.y;
                  }}
                >
                  {verse.stanzas.map((stanza, si) => {
                    const isMatch = highlightKey === `${vn}:${si}`;
                    return (
                      <Animated.View
                        key={si}
                        style={{
                          marginBottom: si < verse.stanzas.length - 1 ? fontSize * 0.7 : 0,
                          borderRadius: 8,
                          backgroundColor: isMatch
                            ? highlightAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["transparent", theme.primary + "18"],
                              })
                            : "transparent",
                        }}
                      >
                        <Pressable onLongPress={() => handleCopyStanza(stanza)} delayLongPress={400} style={{ paddingHorizontal: 6, paddingVertical: 2 }}>
                          {stanza.map((line, li) => (
                            <Text key={li} className="text-text-primary dark:text-gray-100 font-normal" style={{ fontSize, lineHeight }}>
                              {line}
                            </Text>
                          ))}
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
              );
            })}

            {/* Recording */}
            {recording && (
              <View className="mt-6 px-2">
                <Text className="text-[11px] font-semibold tracking-[1.5px] uppercase text-text-muted dark:text-gray-500 mb-2">Recording</Text>
                <View className="rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-3 py-2.5">
                  {/* Controls row */}
                  <View className="flex-row items-center gap-2.5">
                    <Pressable onPress={() => handlePlay(recording)} hitSlop={8}>
                      <Ionicons name={isActive && playback.isPlaying ? "pause-circle" : "play-circle"} size={24} color={isActive && playback.isPlaying ? theme.primary : theme.textMuted} />
                    </Pressable>

                    <View className="flex-1">
                      {/* Progress bar */}
                      <View className="h-1 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                        <View className="h-full rounded-full bg-primary" style={{ width: `${isActive ? progress * 100 : 0}%` }} />
                      </View>

                      {/* Time + date */}
                      <View className="flex-row justify-between mt-1.5">
                        <Text className="text-[11px] text-text-muted dark:text-gray-500">{isActive ? formatTime(Math.round(playback.currentTime)) : formatTime(Math.round(recording.duration))}</Text>
                        <Text className="text-[11px] text-text-muted dark:text-gray-500">{new Date(recording.createdAt).toLocaleDateString()}</Text>
                      </View>
                    </View>

                    <Pressable onPress={handleDeleteRecording} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            <View className="h-28" />
          </Animated.ScrollView>
        </View>
      ) : (
        <HymnShimmer headerHeight={headerHeight} />
      )}

      {/* Bottom glow — fades from opaque at screen bottom to transparent above */}
      <BottomGlow />

      {/* Font controls — independent floating pill */}
      <View
        className="absolute left-4 flex-row items-center px-2.5 py-2 rounded-2xl gap-1.5 overflow-hidden"
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
        <FontSizePill step={1} />
      </View>

      {/* Action icons — independent vertical pill on the right */}
      <View
        className="absolute right-4 rounded-2xl overflow-hidden"
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

        <Pressable className={`w-10 h-10 items-center justify-center ${isRecording ? "bg-red-500/20" : ""}`} onPress={handleMicPress}>
          <Ionicons name={isRecording ? "radio" : "mic-outline"} size={18} color={isRecording ? theme.danger : theme.textMuted} />
        </Pressable>
        <View className="h-px bg-gray-200/40 dark:bg-slate-700/40 mx-3" />
        <Pressable className="w-10 h-10 items-center justify-center" onPress={() => setJumpVisible(true)}>
          <Ionicons name="map-outline" size={18} color={theme.textMuted} />
        </Pressable>
        <View className="h-px bg-gray-200/40 dark:bg-slate-700/40 mx-3" />
        <Pressable className={`w-10 h-10 items-center justify-center ${isFav ? "bg-favorite/15" : ""}`} onPress={() => toggleFavorite({ hymnId, bookId: bookId!, bookName, number: currentNum, title: hymn?.title ?? "" })}>
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? theme.favorite : theme.textMuted} />
        </Pressable>
        <View className="h-px bg-gray-200/40 dark:bg-slate-700/40 mx-3" />
        <Pressable className="w-10 h-10 items-center justify-center" onPress={handleShare}>
          <Ionicons name="share-outline" size={18} color={theme.textMuted} />
        </Pressable>
        <View className="h-px bg-gray-200/40 dark:bg-slate-700/40 mx-3" />
        <Pressable className="w-10 h-10 items-center justify-center" onPress={() => setCollectionPickerVisible(true)}>
          <Ionicons name="folder-outline" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {/* Collection picker modal */}
      <Modal visible={collectionPickerVisible} transparent animationType="fade" onRequestClose={() => setCollectionPickerVisible(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setCollectionPickerVisible(false)}>
          <Pressable className="rounded-t-2xl bg-white dark:bg-slate-900 px-5 pt-4 pb-8" onPress={() => {}}>
            <View className="items-center mb-4">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-slate-600" />
            </View>
            <Text className="text-[17px] font-bold text-text-primary dark:text-gray-100 mb-4">Add to collection</Text>
            {collections.length === 0 ? (
              <Text className="text-[13px] text-text-muted dark:text-gray-500 py-4">No collections yet. Create one in Saved.</Text>
            ) : (
              collections.map((col) => {
                const added = col.hymns.some((h) => h.hymnId === hymnId);
                return (
                  <Pressable
                    key={col.id}
                    className={`flex-row items-center gap-3 py-3 border-b border-gray-100/60 dark:border-slate-800/60 ${added ? "opacity-50" : ""}`}
                    onPress={() => {
                      if (!added) {
                        addToCollection(col.id, {
                          hymnId,
                          bookId: bookId!,
                          number: currentNum,
                          title: hymn?.title ?? "",
                          bookName,
                        });
                      }
                      setCollectionPickerVisible(false);
                    }}
                  >
                    <Ionicons name={added ? "checkmark-circle" : "folder-outline"} size={20} color={added ? theme.primary : theme.textMuted} />
                    <View className="flex-1">
                      <Text className="text-[15px] font-medium text-text-primary dark:text-gray-100">{col.name}</Text>
                      <Text className="text-[12px] text-text-muted dark:text-gray-500">{col.hymns.length} hymns</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Quick-jump / Search Sheet */}
      <JumpSheet visible={jumpVisible} bookId={bookId!} bookName={bookName} maxNum={maxNum} onClose={handleJumpClose} />
    </View>
  );
}
