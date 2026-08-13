import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/components/common/Text";
import { SectionList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRecordingsStore } from "@/state/recordingsStore";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

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
          <Text className="font-bold tracking-tight text-text-primary dark:text-gray-100" style={{ fontSize: fontSize + 10 }}>Recordings</Text>
          <Text className="font-medium text-text-secondary dark:text-gray-400 mt-1" style={{ fontSize: body }}>
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
            <Text className="font-medium text-text-secondary dark:text-gray-400 mt-3" style={{ fontSize: body }}>No recordings yet</Text>
            <Text className="text-text-muted dark:text-gray-500 text-center mt-1" style={{ fontSize: captionSmall }}>Record a hymn tune from the reader</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="pt-5 pb-2">
            <Text className="text-[11px] font-semibold tracking-[1.5px] text-text-muted dark:text-gray-500">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const [bookId, numStr] = item.hymnId.split(":");
          return (
            <Pressable
              className="flex-row items-center gap-3 mb-2"
              onPress={() =>
                router.push({
                  pathname: "/hymn/[bookId]/[number]",
                  params: { bookId, number: numStr },
                })
              }
            >
              <View className="flex-1">
                <Text className="font-bold text-text-primary dark:text-gray-100" numberOfLines={1} style={{ fontSize: body }}>
                  {item.title || `Hymn ${numStr}`}
                </Text>
                <Text className="text-text-muted dark:text-gray-500 mt-0.5" style={{ fontSize: captionSmall }}>
                  {item.bookName || bookId} · #{numStr}
                </Text>
              </View>
              <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: isDark ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.12)" }}>
                <Ionicons name="mic" size={11} color={theme.primary} />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
