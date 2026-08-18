import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { BlurView } from "expo-blur";
import { useMemo, useState } from "react";
import { Text } from "@/components/common/Text";
import { Animated, Pressable, Share, TextInput, View } from "react-native";

import { useIsDark } from "@/hooks/useIsDark";
import { useFontScale } from "@/hooks/useFontScale";
import { theme } from "@/theme/colors";

interface VerseSelectionBarProps {
  text: string;
  onBookmark: (note: string) => void;
  onCopy?: () => void;
  onAskAI?: () => void;
  verseCount: number;
  anchorY: number;
  scrollY: Animated.Value;
}

export function VerseSelectionBar({ text, onBookmark, onCopy, onAskAI, verseCount, anchorY, scrollY }: VerseSelectionBarProps) {
  const isDark = useIsDark();
  const { caption, captionSmall } = useFontScale();
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [barHeight, setBarHeight] = useState(0);

  // Follow the anchor verse 1:1 as the list scrolls, clamped below the header (>= 80).
  // rawTop is the bar's screen top at scroll offset 0; the interpolation has slope -1
  // so `top = rawTop - scrollY` across the whole scroll range (both directions),
  // clamping at 80 once the verse passes under the floating header.
  const top = useMemo(() => {
    const rawTop = anchorY - barHeight - 12;
    const clampScroll = rawTop - 80;
    return scrollY.interpolate({
      inputRange: [-1000, clampScroll],
      outputRange: [rawTop + 1000, 80],
      extrapolate: "clamp",
    });
  }, [anchorY, barHeight, scrollY]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    onCopy?.();
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: text });
    } catch {}
  };

  const handleSave = () => {
    onBookmark(note.trim());
    setNote("");
    setWriting(false);
  };

  const blurBg = isDark ? "bg-slate-900" : "bg-white";
  const border = "border border-gray-200/60 dark:border-slate-700/50";

  return (
    <Animated.View
      className="absolute z-20"
      style={{
        width: 220,
        left: "50%",
        transform: [{ translateX: -110 }],
        top,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 32,
        elevation: 16,
      }}
      onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
    >
      <View className={`overflow-hidden rounded-2xl ${border}`}>
        <BlurView intensity={isDark ? 30 : 22} tint={isDark ? "dark" : "light"}>
          {writing ? (
            <View className={`px-3 py-3 ${blurBg}`}>
              <TextInput
                className="text-text-primary mb-2 border-b border-gray-200/40 pb-2 dark:border-slate-700/40 dark:text-gray-100"
                style={{ fontSize: caption }}
                placeholder="Add a note…"
                placeholderTextColor={theme.textMuted}
                value={note}
                onChangeText={setNote}
                autoFocus
                multiline
                numberOfLines={2}
              />
              <View className="flex-row justify-end gap-2">
                <Pressable
                  className="rounded-lg px-3 py-1.5"
                  onPress={() => {
                    setWriting(false);
                    setNote("");
                  }}
                >
                  <Text className="text-text-muted font-semibold dark:text-gray-400" style={{ fontSize: captionSmall }}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable className="bg-primary rounded-lg px-3 py-1.5" onPress={handleSave}>
                  <Text className="font-semibold text-white" style={{ fontSize: captionSmall }}>
                    Save
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className={`px-3 py-2.5 ${blurBg}`}>
              <Text className="text-text-muted mb-2 font-semibold dark:text-gray-400" style={{ fontSize: captionSmall }}>
                {verseCount} verse{verseCount === 1 ? "" : "s"} selected
              </Text>
              <ActionButton icon="copy-outline" label="Copy" fontSize={caption} onPress={handleCopy} />
              <View className="my-1 h-px bg-gray-200/40 dark:bg-slate-700/40" />
              <ActionButton icon="share-outline" label="Share" fontSize={caption} onPress={handleShare} />
              <View className="my-1 h-px bg-gray-200/40 dark:bg-slate-700/40" />
              <ActionButton icon="bookmark-outline" label="Bookmark" fontSize={caption} onPress={() => setWriting(true)} />
              <View className="my-1 h-px bg-gray-200/40 dark:bg-slate-700/40" />
              <ActionButton icon="sparkles-outline" label="Ask AI" fontSize={caption} onPress={() => onAskAI?.()} />
            </View>
          )}
        </BlurView>
      </View>
      <View className="items-center">
        <View className={`-mt-1.5 h-3 w-3 rotate-45 border-r border-b border-gray-200/60 dark:border-slate-700/50 ${blurBg}`} />
      </View>
    </Animated.View>
  );
}

function ActionButton({ icon, label, fontSize, onPress }: { icon: string; label: string; fontSize: number; onPress: () => void }) {
  return (
    <Pressable
      className="flex-row items-center gap-2.5 rounded-lg px-3 py-2.5 active:bg-gray-200/40 dark:active:bg-slate-700/40"
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={17} color={theme.primary} />
      <Text className="text-primary font-bold" style={{ fontSize }}>
        {label}
      </Text>
    </Pressable>
  );
}
