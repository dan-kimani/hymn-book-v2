import { Ionicons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert, Pressable, View } from "react-native";

import { Text } from "@/components/common/Text";
import { useIsDark } from "@/hooks/useIsDark";
import { usePlayback } from "@/hooks/usePlayback";
import type { RecordingMeta } from "@/state/recordingsStore";
import { theme } from "@/theme/colors";

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Stable pseudo-natural waveform shape — one thin bar per column, height in px.
const WAVE_BARS = Array.from({ length: 120 }, (_, i) => {
  const v = 0.5 + 0.5 * Math.sin(i * 0.16) * Math.sin(i * 0.06 + 1.2);
  return Math.round(3 + v * 24);
});

interface RecordingCardProps {
  recording: RecordingMeta;
  onDelete: () => void;
}

export function RecordingCard({ recording, onDelete }: RecordingCardProps) {
  const playback = usePlayback(recording.path);
  const isDark = useIsDark();
  const progress = recording.duration > 0 ? playback.currentTime / recording.duration : 0;
  const playedCount = Math.floor(progress * WAVE_BARS.length);
  const unplayedColor = isDark ? "#334155" : "#E2E8F0";

  const handleDelete = () => {
    playback.stop();
    onDelete();
  };

  const handleShare = async () => {
    try {
      const file = new File(recording.path);
      if (!file.exists) {
        Alert.alert("Recording missing", "The audio file could not be found.");
        return;
      }
      await Sharing.shareAsync(recording.path, { mimeType: "audio/x-m4a" });
    } catch (e: any) {
      Alert.alert("Could not share", e?.message ?? "Something went wrong.");
    }
  };

  return (
    <View className="mt-6 px-2">
      <Text className="text-text-muted mb-2 text-[11px] font-semibold tracking-[1.5px] uppercase dark:text-gray-500">Recording</Text>

      <View className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        {/* Waveform */}
        <View className="h-4 flex-row items-center gap-px">
          {WAVE_BARS.map((h, i) => (
            <View
              key={i}
              className="flex-1 rounded-full"
              style={{ height: h, backgroundColor: i < playedCount ? theme.primary : unplayedColor }}
            />
          ))}
        </View>

        {/* Controls */}
        <View className="mt-4 flex-row items-center">
          <Pressable
            onPress={() => playback.toggle()}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: isDark ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.12)" }}
          >
            <Ionicons
              name={playback.isPlaying ? "pause" : "play"}
              size={18}
              color={theme.primary}
              style={{ marginLeft: playback.isPlaying ? 0 : 2 }}
            />
          </Pressable>

          <Text className="text-text-secondary flex-1 text-center text-[13px] font-medium dark:text-gray-400">
            {formatTime(Math.round(playback.currentTime))}
            <Text className="text-text-muted dark:text-gray-500"> / {formatTime(Math.round(recording.duration))}</Text>
          </Text>

          <Pressable
            onPress={handleShare}
            hitSlop={8}
            className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800"
          >
            <Ionicons name="share-outline" size={16} color={theme.textMuted} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800"
          >
            <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
