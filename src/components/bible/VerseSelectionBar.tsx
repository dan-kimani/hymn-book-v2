import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { BlurView } from "expo-blur";
import { useState } from "react";
import { Pressable, Share, Text, TextInput, useColorScheme, View } from "react-native";

import { theme } from "@/theme/colors";

export function VerseSelectionBar({
  text,
  onBookmark,
  onCopy,
  verseCount,
  anchorY,
}: {
  text: string;
  onBookmark: (note: string) => void;
  onCopy?: () => void;
  verseCount: number;
  anchorY: number;
}) {
  const isDark = useColorScheme() === "dark";
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    onCopy?.();
  };

  const handleShare = async () => {
    try { await Share.share({ message: text }); } catch {}
  };

  const handleSave = () => {
    onBookmark(note.trim());
    setNote("");
    setWriting(false);
  };

  const blurBg = isDark ? "bg-slate-900/70" : "bg-white/75";
  const border = "border border-gray-200/60 dark:border-slate-700/50";

  return (
    <View
      className="absolute left-1/2 z-20"
      style={{
        top: anchorY - 50,
        transform: [{ translateX: -140 }],
        shadowColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <View className={`rounded-2xl overflow-hidden ${border}`}>
        <BlurView intensity={isDark ? 30 : 22} tint={isDark ? "dark" : "light"}>
          {writing ? (
            <View className={`px-3 py-3 ${blurBg} min-w-[240px]`}>
              <TextInput
                className="text-[13px] text-text-primary dark:text-gray-100 mb-2 border-b border-gray-200/40 dark:border-slate-700/40 pb-2"
                placeholder="Add a note…"
                placeholderTextColor={theme.textMuted}
                value={note}
                onChangeText={setNote}
                autoFocus
                multiline
                numberOfLines={2}
              />
              <View className="flex-row gap-2 justify-end">
                <Pressable className="px-3 py-1.5 rounded-lg" onPress={() => { setWriting(false); setNote(""); }}>
                  <Text className="text-[12px] font-semibold text-text-muted dark:text-gray-400">Cancel</Text>
                </Pressable>
                <Pressable className="px-3 py-1.5 rounded-lg bg-primary" onPress={handleSave}>
                  <Text className="text-[12px] font-semibold text-white">Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className={`flex-row items-center px-1.5 py-1.5 gap-0.5 ${blurBg}`}>
              <Text className="text-[10px] font-semibold text-text-muted dark:text-gray-400 px-2">
                {verseCount}v
              </Text>
              <View className="w-px h-4 bg-gray-200/40 dark:bg-slate-700/40" />
              <ActionButton icon="copy-outline" label="Copy" onPress={handleCopy} />
              <ActionButton icon="share-outline" label="Share" onPress={handleShare} />
              <ActionButton icon="bookmark-outline" label="Bookmark" onPress={() => setWriting(true)} />
            </View>
          )}
        </BlurView>
      </View>
      <View className="items-center">
        <View
          className={`w-3 h-3 rotate-45 -mt-1.5 border-r border-b border-gray-200/60 dark:border-slate-700/50 ${blurBg}`}
        />
      </View>
    </View>
  );
}

function ActionButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-xl active:bg-gray-200/40 dark:active:bg-slate-700/40" onPress={onPress}>
      <Ionicons name={icon as any} size={15} color={theme.primary} />
      <Text className="text-[12px] font-semibold text-primary">{label}</Text>
    </Pressable>
  );
}
