import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/components/common/Text";
import { SectionList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRecordingsStore } from "@/state/recordingsStore";
import { useDayPlaylist } from "@/hooks/useDayPlaylist";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";

function getOrdinal(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  const last = day % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}

function dateLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const label = `${day}${getOrdinal(day)} ${month}`;
  return d.getFullYear() === now.getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

export default function RecordingsListScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { fontSize, body, captionSmall } = useFontScale();
  const recordings = useRecordingsStore((s) => s.recordings);
  const { activeDayKey, isPlaying, toggleDay } = useDayPlaylist();

  const recordedHymns = Object.entries(recordings)
    .filter(([, rec]) => rec != null)
    .map(([hymnId, rec]) => ({ hymnId, ...rec! }))
    .sort((a, b) => b.createdAt - a.createdAt);

  // Group by recording date, preserving most-recent-first order.
  const sections = (() => {
    const map: Record<string, typeof recordedHymns> = {};
    for (const rec of recordedHymns) {
      const key = dateLabel(rec.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(rec);
    }
    return Object.keys(map).map((title) => ({ title, data: map[title] }));
  })();

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <View className="flex-row items-center gap-3 px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-text-primary font-bold tracking-tight dark:text-gray-100" style={{ fontSize: fontSize + 10 }}>
            Recordings
          </Text>
          <Text className="text-text-secondary mt-1 font-medium dark:text-gray-400" style={{ fontSize: body }}>
            {recordedHymns.length} recording{recordedHymns.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.hymnId}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View className="items-center pt-16">
            <Ionicons name="mic-outline" size={36} color={theme.textMuted} />
            <Text className="text-text-secondary mt-3 font-medium dark:text-gray-400" style={{ fontSize: body }}>
              No recordings yet
            </Text>
            <Text className="text-text-muted mt-1 text-center dark:text-gray-500" style={{ fontSize: captionSmall }}>
              Record a hymn tune from the reader
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => {
          const active = activeDayKey === section.title;
          return (
            <View className="flex-row items-center justify-between pt-5 pb-2">
              <Text className="text-text-muted text-[11px] font-semibold tracking-[1.5px] dark:text-gray-500">{section.title}</Text>
              <Pressable
                onPress={() => toggleDay(section.title ?? "", section.data)}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20"
              >
                <Ionicons name={active && isPlaying ? "pause" : "play"} size={14} color={theme.primary} />
              </Pressable>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const [bookId, numStr] = item.hymnId.split(":");
          return (
            <Pressable
              className="mb-2 flex-row items-center gap-3"
              onPress={() =>
                router.push({
                  pathname: "/hymn/[bookId]/[number]",
                  params: { bookId, number: numStr },
                })
              }
            >
              <View className="flex-1">
                <Text className="text-text-primary font-bold dark:text-gray-100" numberOfLines={1} style={{ fontSize: body }}>
                  {item.title || `Hymn ${numStr}`}
                </Text>
                <Text className="text-text-muted mt-0.5 dark:text-gray-500" style={{ fontSize: captionSmall }}>
                  {item.bookName || bookId} · #{numStr}
                </Text>
              </View>
              <View
                className="h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.12)" }}
              >
                <Ionicons name="mic" size={11} color={theme.primary} />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
