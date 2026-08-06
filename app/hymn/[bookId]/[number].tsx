import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, PanResponder, Pressable, ScrollView, Share, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JumpSheet } from "@/components/search/JumpSheet";
import { fetchHymn } from "@/data/queries";
import type { Hymn } from "@/data/types";
import { usePlayback, useRecorder } from "@/hooks/useRecorder";
import { useFavoritesStore } from "@/state/favoritesStore";
import { useRecentsStore } from "@/state/recentsStore";
import { useRecordingsStore } from "@/state/recordingsStore";
import { useSettingsStore } from "@/state/settingsStore";
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
  const {
    bookId,
    number,
    verse: targetVerse,
    stanza: targetStanza,
  } = useLocalSearchParams<{
    bookId: string;
    number: string;
    verse?: string;
    stanza?: string;
  }>();
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const [hymn, setHymn] = useState<Hymn | null>(null);
  const scrollRef = useRef<ScrollView | Animated.LegacyRef<ScrollView>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Swipe state
  const slideX = useRef(new Animated.Value(0)).current;
  // Quick-jump / search sheet
  const [jumpVisible, setJumpVisible] = useState(false);

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
    (async () => {
      const data = await fetchHymn(hymnId);
      if (data) {
        setHymn(data);
        addRecent({
          hymnId,
          bookId: bookId!,
          bookName,
          number: currentNum,
          title: data.title,
        });
      }
    })();
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
    router.replace({ pathname: "/hymn/[bookId]/[number]", params: { bookId: bookId!, number: String(num) } });
  };

  // ── Swipe + Edge-back (PanResponder) ──────────────────────
  const touchStartX = useRef(0);
  const SCREEN_W = Dimensions.get("window").width;
  const EDGE = 30;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gs) => {
          // Edge swipe-back: started from left edge, moving right
          if (touchStartX.current < EDGE && gs.dx > 15 && gs.dx > Math.abs(gs.dy) * 0.8) return true;
          // Hymn navigation: horizontal swipe from main area
          return Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2;
        },
        onPanResponderGrant: (e) => {
          touchStartX.current = e.nativeEvent.pageX;
        },
        onPanResponderMove: (_, gs) => {
          slideX.setValue(gs.dx);
        },
        onPanResponderRelease: (_, gs) => {
          // Edge-swipe-back
          if (touchStartX.current < EDGE && gs.dx > 80) {
            Animated.timing(slideX, {
              toValue: SCREEN_W,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              slideX.setValue(0);
              router.back();
            });
            return;
          }
          // Hymn navigation
          const threshold = 80;
          if (gs.dx > threshold && currentNum > 1) {
            Animated.timing(slideX, {
              toValue: 400,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              slideX.setValue(0);
              goToHymn(currentNum - 1);
            });
          } else if (gs.dx < -threshold && currentNum < maxNum) {
            Animated.timing(slideX, {
              toValue: -400,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              slideX.setValue(0);
              goToHymn(currentNum + 1);
            });
          } else {
            Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [currentNum, maxNum, goToHymn],
  );

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
      {/* zIndex lowered when jump sheet is open so bottom sheet overlays it */}
      <Animated.View className="absolute top-0 left-0 right-0" style={{ paddingTop: insets.top + 8, zIndex: jumpVisible ? 0 : 10 }}>
        <Animated.View className="absolute left-0 right-0 top-0" style={{ height: headerHeight + 140, opacity: headerOpacity }} pointerEvents="none">
          <LinearGradient
            colors={isDark ? ["rgba(15,23,42,0.92)", "rgba(15,23,42,0.85)", "rgba(15,23,42,0.4)", "rgba(15,23,42,0.06)", "transparent"] : ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.82)", "rgba(255,255,255,0.3)", "rgba(255,255,255,0.05)", "transparent"]}
            locations={[0, 0.4, 0.62, 0.84, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="flex-1"
          />
        </Animated.View>
        <Animated.View className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: headerHeight, opacity: headerOpacity }} pointerEvents="none">
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>
        <View className="flex-row items-start px-4 pb-3.5 gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8} className="pt-0.5">
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </Pressable>
          <View className="flex-1">
            <Text className={`text-sm font-bold uppercase tracking-wide ${accent}`}>{bookName}</Text>
            <Text className="text-[13px] text-text-secondary dark:text-gray-400 mt-0.5">Hymn No. {number}</Text>
          </View>
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

      {/* Content — with swipe */}
      {hymn ? (
        <Animated.View className="flex-1" style={{ transform: [{ translateX: slideX }] }} {...panResponder.panHandlers}>
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
                <Pressable
                  className="flex-row items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800"
                  onPress={() => handlePlay(recording)}
                >
                  <Ionicons
                    name={playingId === recording.id ? "pause-circle" : "play-circle"}
                    size={22}
                    color={playingId === recording.id ? theme.primary : theme.textMuted}
                  />
                  <View className="flex-1">
                    <Text className="text-[13px] font-medium text-text-primary dark:text-gray-100">
                      {formatTime(Math.round(recording.duration))}
                    </Text>
                    <Text className="text-[11px] text-text-muted dark:text-gray-500 mt-0.5">
                      {new Date(recording.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable onPress={handleDeleteRecording} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                  </Pressable>
                </Pressable>
              </View>
            )}

            {/* Swipe hints */}
            <View className="flex-row justify-between items-center mt-8 mb-4 px-2">
              <View className="items-center">
                {currentNum > 1 && (
                  <>
                    <Ionicons name="chevron-back-circle-outline" size={22} color={theme.textMuted} />
                    <Text className="text-[11px] text-text-muted dark:text-gray-500 mt-1">Hymn {currentNum - 1}</Text>
                  </>
                )}
              </View>
              <View className="items-center">
                {currentNum < maxNum && (
                  <>
                    <Ionicons name="chevron-forward-circle-outline" size={22} color={theme.textMuted} />
                    <Text className="text-[11px] text-text-muted dark:text-gray-500 mt-1">Hymn {currentNum + 1}</Text>
                  </>
                )}
              </View>
            </View>

            <View className="h-28" />
          </Animated.ScrollView>
        </Animated.View>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-text-muted dark:text-gray-500">Loading...</Text>
        </View>
      )}

      {/* Font controls — independent floating pill */}
      <View
        className="absolute left-4 flex-row items-center px-2.5 py-2 rounded-2xl gap-1.5 overflow-hidden"
        style={{
          bottom: 20,
          shadowColor: isDark ? "rgba(37,99,235,0.2)" : "rgba(148,163,184,0.15)",
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
        <Pressable className="w-8 h-8 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 items-center justify-center" onPress={() => setFontSize(fontSize - 1)}>
          <Text className="text-[12px] font-semibold text-text-primary dark:text-gray-100">A−</Text>
        </Pressable>
        <Text className="text-xs font-semibold text-text-secondary dark:text-gray-400 w-7 text-center">{fontSize}px</Text>
        <Pressable className="w-8 h-8 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 items-center justify-center" onPress={() => setFontSize(fontSize + 1)}>
          <Text className="text-[12px] font-semibold text-text-primary dark:text-gray-100">A+</Text>
        </Pressable>
      </View>

      {/* Action icons — independent vertical pill on the right */}
      <View
        className="absolute right-4 rounded-2xl overflow-hidden"
        style={{
          bottom: 20,
          shadowColor: isDark ? "rgba(37,99,235,0.2)" : "rgba(148,163,184,0.15)",
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
      </View>

      {/* Quick-jump / Search Sheet */}
      <JumpSheet visible={jumpVisible} bookId={bookId!} bookName={bookName} maxNum={maxNum} onClose={handleJumpClose} />
    </View>
  );
}
