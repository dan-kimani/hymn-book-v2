import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/common/Text";
import { fetchBibleVerse } from "@/data/bibleQueries";
import type { BibleVerse, CrossReference } from "@/data/bibleTypes";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";

interface CrossRefExplorerProps {
  visible: boolean;
  bookId: number;
  bookName: string;
  chapter: number;
  crossRefsMap: Record<number, CrossReference[]>;
  verses: BibleVerse[];
  onClose: () => void;
}

interface GroupedRef extends CrossReference {
  sourceVerse: number;
}

interface RefVerseCardProps {
  ref: GroupedRef;
  captionSize: number;
  captionSmallSize: number;
  bodySize: number;
  onOpenInChapter: () => void;
}

function RefVerseCard({ ref, captionSize, captionSmallSize, bodySize, onOpenInChapter }: RefVerseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [refText, setRefText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded || refText !== null) return;
    let cancelled = false;
    setLoading(true);
    fetchBibleVerse(ref.bookId, ref.chapter, ref.verseStart)
      .then((v) => {
        if (!cancelled) {
          setRefText(v?.text ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRefText(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, ref.bookId, ref.chapter, ref.verseStart, refText]);

  const refLabel = ref.verseStart === ref.verseEnd ? `${ref.shortName} ${ref.chapter}:${ref.verseStart}` : `${ref.shortName} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;

  return (
    <View className="ml-3 mb-1.5">
      <View className="flex-row items-center gap-2 py-1.5">
        <Pressable className="flex-row items-center gap-2 flex-1" onPress={() => setExpanded(!expanded)}>
          <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={12} color={theme.primary} />
          <Text className="font-medium text-primary" style={{ fontSize: captionSize }}>
            {refLabel}
          </Text>
        </Pressable>
        <Pressable onPress={onOpenInChapter} hitSlop={4}>
          <Ionicons name="open-outline" size={13} color={theme.textMuted} />
        </Pressable>
      </View>
      {expanded && (
        <View className="ml-4 pl-3 border-l border-primary/20 mt-1 mb-2">
          {loading ? (
            <Text className="text-text-muted dark:text-gray-500 italic" style={{ fontSize: captionSmallSize }}>
              Loading...
            </Text>
          ) : refText ? (
            <Text className="text-text-primary dark:text-gray-100 leading-relaxed" style={{ fontSize: bodySize }}>
              {refText}
            </Text>
          ) : (
            <Text className="text-text-muted dark:text-gray-500 italic" style={{ fontSize: captionSmallSize }}>
              Verse text not available
            </Text>
          )}
          <Pressable className="flex-row items-center gap-1 mt-2" onPress={onOpenInChapter}>
            <Text className="font-medium text-primary" style={{ fontSize: captionSmallSize }}>
              Open in chapter
            </Text>
            <Ionicons name="arrow-forward" size={11} color={theme.primary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function CrossRefExplorer({ visible, bookId, bookName, chapter, crossRefsMap, verses, onClose }: CrossRefExplorerProps) {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { body, caption, captionSmall, fontSize } = useFontScale();
  const snapPoints = useMemo(() => ["70%"], []);

  // Group cross-refs by source verse
  const sourceGroups = useMemo(() => {
    const verseNums = Object.keys(crossRefsMap)
      .map(Number)
      .sort((a, b) => a - b);
    return verseNums.map((vn) => ({
      verse: vn,
      text: verses.find((v) => v.verse === vn)?.text ?? "",
      refs: crossRefsMap[vn],
    }));
  }, [crossRefsMap, verses]);

  const totalRefs = useMemo(() => Object.values(crossRefsMap).reduce((sum, refs) => sum + refs.length, 0), [crossRefsMap]);

  const handleOpenInChapter = useCallback(
    (ref: CrossReference) => {
      onClose();
      // Already viewing this chapter — don't push a duplicate screen.
      if (ref.bookId === bookId && ref.chapter === chapter) return;
      setTimeout(() => {
        router.push({
          pathname: "/bible/[bookId]/[chapter]" as any,
          params: { bookId: String(ref.bookId), chapter: String(ref.chapter), verse: String(ref.verseStart) },
        });
      }, 350);
    },
    [onClose, bookId, chapter],
  );

  const handleChange = useCallback(
    (idx: number) => {
      if (idx === -1) onClose();
    },
    [onClose],
  );

  return (
    <BottomSheet
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleChange}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} onPress={onClose} />}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#475569" : "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: isDark ? "#0f172a" : "#fff" }}
      topInset={insets.top + 12}
      containerStyle={{ zIndex: 100, elevation: 100 }}
    >
      {/* Header */}
      <View className="mb-5 px-4">
        <View className="flex-row items-center gap-2.5 mb-1">
          <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
            <Ionicons name="git-branch-outline" size={16} color={theme.primary} />
          </View>
          <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: body }}>
            Cross-Reference Explorer
          </Text>
        </View>
        <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: captionSmall }}>
          {bookName} {chapter} · {totalRefs} connection{totalRefs === 1 ? "" : "s"} across {sourceGroups.length} verse{sourceGroups.length === 1 ? "" : "s"}
        </Text>
      </View>
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 60 }} showsVerticalScrollIndicator={false}>
        {sourceGroups.length === 0 ? (
          <View className="items-center py-12 gap-2">
            <Ionicons name="link-outline" size={32} color={theme.textMuted} />
            <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: caption }}>
              No cross-references for this chapter
            </Text>
          </View>
        ) : (
          sourceGroups.map((group) => (
            <View key={group.verse} className="mb-4">
              {/* Source verse */}
              <View className="flex-row gap-2 mb-2">
                <Text className="font-semibold text-text-muted dark:text-gray-500" style={{ fontSize: caption, minWidth: 24 }}>
                  {group.verse}
                </Text>
                <Text className="flex-1 shrink text-text-primary dark:text-gray-100" style={{ fontSize, lineHeight: fontSize * 1.5 }}>
                  {group.text}
                </Text>
              </View>
              {/* References */}
              {group.refs.map((ref, i) => (
                <RefVerseCard
                  // Verse card key includes index to handle multiple refs to same verse (e.g. 1 Cor 10:1-2 has two refs to Exod 14:21)
                  key={`${ref.bookId}-${ref.chapter}-${ref.verseStart}-${i}`}
                  ref={{ ...ref, sourceVerse: group.verse }}
                  captionSize={caption}
                  captionSmallSize={captionSmall}
                  bodySize={body}
                  onOpenInChapter={() => handleOpenInChapter(ref)}
                />
              ))}
            </View>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
