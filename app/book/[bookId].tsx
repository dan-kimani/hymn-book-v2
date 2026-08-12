import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { BottomGlow, TopGlow } from "@/components/SoftGlow";
import { useEffect, useRef, useState } from "react";
import { Text } from "@/components/common/Text";
import { Animated, Dimensions, PanResponder, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/common/PressableScale";
import { JumpSheet } from "@/components/search/JumpSheet";
import { fetchHymnMeta } from "@/data/queries";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { theme } from "@/theme/colors";

const BOOK_INFO: Record<string, { name: string; language: string; color: string }> = {
  "roho-mutheru": { name: "Nyimbo Cia Roho Mutheru", language: "Kikuyu", color: "text-book-roho-mutheru" },
  atumwo: { name: "Nyimbo Cia Atumwo", language: "Kikuyu", color: "text-book-atumwo" },
  kiroho: { name: "Nyimbo Cia Kiroho", language: "Kikuyu", color: "text-book-kiroho" },
  "golden-bells": { name: "Golden Bells", language: "English", color: "text-book-golden-bells" },
};

const BOOK_IDS = Object.keys(BOOK_INFO);

export default function BookDetailScreen() {
  const insets = useSafeAreaInsets();
  const { heading, caption, captionSmall } = useFontScale();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [hymns, setHymns] = useState<Array<{ id: string; number: number; title: string; snippet: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [jumpVisible, setJumpVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const isDark = useIsDark();

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 40], outputRange: [0, 1], extrapolate: "clamp" });
  const headerHeight = insets.top + 78;

  const info = BOOK_INFO[bookId ?? ""] ?? { name: bookId, language: "", color: "text-primary" };

  const currentBookIdx = BOOK_IDS.indexOf(bookId ?? "");
  const prevBookId = currentBookIdx > 0 ? BOOK_IDS[currentBookIdx - 1] : null;
  const nextBookId = currentBookIdx < BOOK_IDS.length - 1 ? BOOK_IDS[currentBookIdx + 1] : null;

  const goToBook = (id: string) => {
    setHymns([]);
    setLoading(true);
    router.setParams({ bookId: id });
  };

  const maxNum = hymns.length;

  const handleJumpClose = (num?: number) => {
    setJumpVisible(false);
    if (num != null) {
      setTimeout(() => {
        router.push({ pathname: "/hymn/[bookId]/[number]", params: { bookId: bookId!, number: String(num) } });
      }, 350);
    }
  };

  // Edge-swipe-back
  const touchStartX = useRef(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const SW = Dimensions.get("window").width;
  const edgePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => touchStartX.current < 30 && gs.dx > 15 && gs.dx > Math.abs(gs.dy) * 0.8,
      onPanResponderGrant: (e) => {
        touchStartX.current = e.nativeEvent.pageX;
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) slideX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 80) {
          Animated.timing(slideX, { toValue: SW, duration: 200, useNativeDriver: true }).start(() => {
            slideX.setValue(0);
            router.back();
          });
        } else {
          Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHymnMeta(bookId!);
        if (!cancelled) { setHymns(data); setLoading(false); }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookId]);

  return (
    <Animated.View className="flex-1 bg-white dark:bg-slate-950" style={{ transform: [{ translateX: slideX }] }} {...edgePan.panHandlers}>
      {/* Header — floating glass, scroll-responsive */}
      <Animated.View className="absolute top-0 left-0 right-0" style={{ paddingTop: insets.top + 8, zIndex: 10 }}>
        {/* Tall seamless gradient — opaque behind header, imperceptibly fades to transparent */}
        <TopGlow height={headerHeight + 130} opacity={headerOpacity} />

        {/* BlurView — only behind the header, fades in on scroll */}
        <Animated.View className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: headerHeight, opacity: headerOpacity }} pointerEvents="none">
          <BlurView intensity={isDark ? 20 : 12} tint={isDark ? "dark" : "light"} style={{ flex: 1 }} />
        </Animated.View>

        <View className="flex-row items-start px-4 pb-4 gap-3">
          <PressableScale onPress={() => router.back()} hitSlop={8} className="pt-0.5">
            <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
          </PressableScale>
          <View className="flex-1">
            <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: heading }}>{info.name}</Text>
            <View className="flex-row items-center gap-2 mt-1">
              <View className="px-2 py-0.5 rounded-md bg-primary-tint dark:bg-primary/20">
                <Text className="font-semibold text-primary dark:text-primary-light" style={{ fontSize: captionSmall }}>{info.language}</Text>
              </View>
              <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: caption }}>{loading ? "Loading..." : `${hymns.length} hymns`}</Text>
            </View>
          </View>
          <ThemeToggle />
          {prevBookId && (
            <Pressable onPress={() => goToBook(prevBookId)} hitSlop={8} className="p-0.5">
              <Ionicons name="chevron-back" size={18} color={isDark ? "#94A3B8" : theme.textSecondary} />
            </Pressable>
          )}
          {nextBookId && (
            <Pressable onPress={() => goToBook(nextBookId)} hitSlop={8} className="p-0.5">
              <Ionicons name="chevron-forward" size={18} color={isDark ? "#94A3B8" : theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Hymn List */}
      <Animated.FlatList
        data={hymns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: headerHeight + 8, paddingBottom: 100 }}
        initialNumToRender={25}
        maxToRenderPerBatch={15}
        windowSize={7}
        getItemLayout={(_, index) => ({ length: 64, offset: 64 * index, index })}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        renderItem={({ item }) => (
          <PressableScale
            className="flex-row items-center px-4 py-3.5 border-b-hairline border-border-light dark:border-gray-800 gap-3"
            onPress={() => router.push({ pathname: "/hymn/[bookId]/[number]", params: { bookId: bookId!, number: String(item.number) } })}
          >
            <Text className={`text-[15px] font-bold min-w-6 ${info.color}`}>{item.number}.</Text>
            <View className="flex-1">
              <Text className="text-base text-text-primary dark:text-gray-100" numberOfLines={2}>
                <Text className="font-semibold">{item.title}</Text>
                {item.snippet ? <Text className="text-text-secondary dark:text-gray-400"> {item.snippet}</Text> : null}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </PressableScale>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick-jump floating button */}
      {!loading && (
        <Pressable
          className="absolute right-5 bottom-24 w-11 h-11 rounded-2xl bg-primary/90 items-center justify-center"
          style={{
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
          onPress={() => setJumpVisible(true)}
        >
          <Ionicons name="map-outline" size={19} color="#fff" />
        </Pressable>
      )}

      <BottomGlow />

      {/* Quick-jump / Search Sheet */}
      <JumpSheet visible={jumpVisible} bookId={bookId!} bookName={info.name} maxNum={maxNum} onClose={handleJumpClose} />
    </Animated.View>
  );
}
