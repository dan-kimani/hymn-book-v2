import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text } from "@/components/common/Text";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HighlightedText } from "./HighlightedText";

import { fetchHymnMeta, searchStanzas } from "@/data/queries";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";

interface JumpSheetProps {
  visible: boolean;
  bookId: string;
  bookName: string;
  maxNum: number;
  onClose: (selectedNumber?: number) => void;
}

export function JumpSheet({ visible, bookId, bookName, maxNum, onClose }: JumpSheetProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [allHymns, setAllHymns] = useState<any[]>([]);
  const [kbHeight, setKbHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { body, caption, captionSmall } = useFontScale();

  const snapPoints = useMemo(() => ["60%"], []);

  // Open / close
  const sheetIndex = visible ? 0 : -1;

  // Track keyboard height for push-up
  useEffect(() => {
    const { Keyboard } = require("react-native");
    const show = Keyboard.addListener("keyboardDidShow" as any, (e: any) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide" as any, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleChange = useCallback((idx: number) => {
    if (idx === -1) {
      setQuery("");
      setResults([]);
    }
  }, []);

  // Preload hymns when visible
  useEffect(() => {
    if (visible && allHymns.length === 0) {
      fetchHymnMeta(bookId).then(setAllHymns);
    }
  }, [visible, bookId, allHymns.length]);

  // Search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const num = query.match(/^#?(\d{1,4})$/);
        if (num) {
          const n = parseInt(num[1]);
          if (n >= 1 && n <= maxNum) {
            setResults([{ hymnNumber: n, hymnTitle: `Hymn ${n}`, stanzaText: `Go to hymn ${n}`, bookId, bookName }]);
            setSearching(false);
            return;
          }
        }
        setResults(await searchStanzas(query, [bookId], 20));
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, bookId, maxNum]);

  const handleSelect = useCallback(
    (num: number) => {
      // Close first, then navigate — crucial to avoid addViewAt crash
      onClose(num);
    },
    [onClose],
  );

  const handleDismiss = useCallback(() => {
    onClose(undefined);
  }, [onClose]);

  const data = query.trim() ? results : allHymns;
  const emptyMessage = query.trim() ? (searching ? undefined : "No hymns found") : undefined;

  return (
    <BottomSheet
      index={sheetIndex}
      snapPoints={snapPoints}
      onChange={handleChange}
      enablePanDownToClose
      onClose={handleDismiss}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} onPress={handleDismiss} />}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#475569" : "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: isDark ? "#0f172a" : "#fff" }}
      topInset={insets.top + 12}
      style={{ marginBottom: kbHeight }}
    >
      {/* Search input */}
      <View className="px-5 pt-1 pb-3">
        <View
          className="flex-row items-center px-4 h-11.5 rounded-2xl gap-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800"
          style={{
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <Ionicons name="search" size={17} color={theme.textMuted} />
          <BottomSheetTextInput
            className="flex-1 text-text-primary dark:text-gray-100"
            style={{ fontSize: body }}
            placeholder={`Search ${bookName}…`}
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus={visible}
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

      {/* Results */}
      <BottomSheetFlatList
        data={data}
        keyExtractor={(item, i) => `${item.number ?? item.hymnNumber ?? item.hymnId}-${i}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          emptyMessage ? (
            <View className="items-center py-8">
              <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: caption }}>{emptyMessage}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const num = item.number ?? item.hymnNumber;
          const title = item.title ?? item.hymnTitle;
          const isSearch = !!query.trim();
          return (
            <Pressable
              className="py-3 border-b border-gray-100/60 dark:border-slate-800/60"
              onPress={() => {
                if (num) handleSelect(parseInt(String(num)));
              }}
            >
              <View className="flex-row items-center gap-2 mb-0.5">
                <Text className="font-bold text-primary" style={{ fontSize: caption }}>#{num}</Text>
                {isSearch && item.bookName && <Text className="text-text-muted dark:text-gray-500 uppercase" style={{ fontSize: captionSmall }}>{item.bookName}</Text>}
              </View>
              <Text className="font-bold text-text-primary dark:text-gray-100" numberOfLines={1} style={{ fontSize: body }}>
                {title}
              </Text>
              {isSearch && item.stanzaText && item.stanzaText !== `Go to hymn ${num}` ? (
                <HighlightedText text={item.stanzaText} query={query} className="text-text-secondary dark:text-gray-400 mt-0.5" style={{ fontSize: caption }} numberOfLines={2} />
              ) : item.snippet ? (
                <Text className="text-text-secondary dark:text-gray-400 mt-0.5" numberOfLines={2} style={{ fontSize: caption }}>
                  {item.snippet}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}
