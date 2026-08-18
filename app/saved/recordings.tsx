import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/components/common/Text";
import { Modal, Pressable, ScrollView, SectionList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRecordingsStore } from "@/state/recordingsStore";
import { useDayPlaylist } from "@/hooks/useDayPlaylist";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { useWaveform } from "@/hooks/useWaveform";
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

function formatTime(secs: number): string {
  const safe = Number.isFinite(secs) && secs > 0 ? secs : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const WAVE_BARS = Array.from({ length: 60 }, (_, i) => {
  const v = 0.5 + 0.5 * Math.sin(i * 0.2) * Math.sin(i * 0.08 + 1.2);
  return Math.round(4 + v * 20);
});

export default function RecordingsListScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { fontSize, body, captionSmall, heading } = useFontScale();
  const recordings = useRecordingsStore((s) => s.recordings);
  const {
    activeDayKey,
    currentHymnId,
    currentTitle,
    isPlaying,
    position,
    duration,
    playFrom,
    next,
    prev,
    seekTo,
    toggle,
    canNext,
    canPrev,
    loopMode,
    cycleLoop,
    shuffle,
    toggleShuffle,
    speed,
    cycleSpeed,
    sleepMinutes,
    cycleSleepTimer,
    queue,
    index,
    jumpTo,
    stop,
  } = useDayPlaylist();
  const barWidthRef = useRef(0);
  const modalBarWidthRef = useRef(0);
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const currentPath = currentHymnId ? recordings[currentHymnId]?.path : null;
  const currentUri = currentPath ? (currentPath.startsWith("file://") ? currentPath : `file://${currentPath}`) : null;
  const peaks = useWaveform(currentUri);
  const bars = peaks.length > 0 ? peaks : WAVE_BARS.map((h) => h / 24);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);

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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View className="items-center pt-16">
            <Ionicons name="mic-outline" size={36} color={theme.textMuted} />
            <Text className="text-text-secondary mt-3 font-medium dark:text-gray-400" style={{ fontSize: body }}>
              No recordings yet
            </Text>
            <Text className="text-text-muted mt-1 text-center dark:text-gray-400" style={{ fontSize: captionSmall }}>
              Record a hymn tune from the reader
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => {
          const active = activeDayKey === section.title;
          return (
            <View className="flex-row items-center justify-between pt-5 pb-2">
              <Text className="text-text-muted text-[11px] font-semibold tracking-[1.5px] dark:text-gray-400">{section.title}</Text>
              <View className="flex-row items-center gap-1.5">
                <Pressable
                  onPress={prev}
                  disabled={!canPrev}
                  hitSlop={8}
                  className={`bg-primary/10 dark:bg-primary/20 h-8 w-8 items-center justify-center rounded-full ${!canPrev ? "opacity-30" : ""}`}
                >
                  <Ionicons name="play-skip-back" size={14} color={theme.primary} />
                </Pressable>
                <Pressable
                  onPress={() => playFrom(section.title ?? "", section.data, 0)}
                  hitSlop={8}
                  className="bg-primary/10 dark:bg-primary/20 h-8 w-8 items-center justify-center rounded-full"
                >
                  <Ionicons name={active && isPlaying ? "pause" : "play"} size={14} color={theme.primary} />
                </Pressable>
                <Pressable
                  onPress={next}
                  disabled={!canNext}
                  hitSlop={8}
                  className={`bg-primary/10 dark:bg-primary/20 h-8 w-8 items-center justify-center rounded-full ${!canNext ? "opacity-30" : ""}`}
                >
                  <Ionicons name="play-skip-forward" size={14} color={theme.primary} />
                </Pressable>
                <Pressable
                  onPress={cycleLoop}
                  hitSlop={8}
                  className="bg-primary/10 dark:bg-primary/20 relative h-8 w-8 items-center justify-center rounded-full"
                >
                  <Ionicons
                    name={loopMode === "off" ? "repeat-outline" : "repeat"}
                    size={14}
                    color={loopMode === "off" ? theme.textMuted : theme.primary}
                  />
                  {loopMode === "one" && (
                    <Text className="absolute top-1 right-1 text-[7px] leading-none font-bold" style={{ color: theme.primary }}>
                      1
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          );
        }}
        renderItem={({ item, section }) => {
          const [bookId, numStr] = item.hymnId.split(":");
          const itemIndex = section.data.findIndex((d) => d.hymnId === item.hymnId);
          const isActive = currentHymnId === item.hymnId;
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
                <Text
                  className="text-text-primary font-bold dark:text-gray-100"
                  numberOfLines={1}
                  style={{ fontSize: body, color: isActive ? theme.primary : undefined }}
                >
                  {item.title || `Hymn ${numStr}`}
                </Text>
                {isActive && (
                  <>
                    <View className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                      <View className="bg-primary h-1 rounded-full" style={{ width: `${progress * 100}%` }} />
                    </View>
                    <Text className="text-text-muted mt-0.5 dark:text-gray-400" style={{ fontSize: captionSmall }}>
                      {formatTime(position)} / {formatTime(duration)}
                    </Text>
                  </>
                )}
                <Text className="text-text-muted mt-0.5 dark:text-gray-400" style={{ fontSize: captionSmall }}>
                  {item.bookName || bookId} · #{numStr}
                </Text>
              </View>
              <Pressable
                onPress={() => playFrom(section.title ?? "", section.data, itemIndex)}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.12)" }}
              >
                <Ionicons name={currentHymnId === item.hymnId && isPlaying ? "pause" : "play"} size={14} color={theme.primary} />
              </Pressable>
            </Pressable>
          );
        }}
      />

      {currentTitle && (
        <View className="absolute right-0 bottom-0 left-0 px-4" style={{ paddingBottom: insets.bottom + 10 }}>
          <View className="rounded-2xl border border-gray-100 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <View className="mb-1 flex-row items-center justify-between">
              <Pressable onPress={() => setPlayerVisible(true)} hitSlop={8} className="flex-1">
                <Text className="text-text-primary font-semibold dark:text-gray-100" numberOfLines={1} style={{ fontSize: captionSmall }}>
                  {currentTitle}
                </Text>
              </Pressable>
              <Pressable onPress={stop} hitSlop={8} className="ml-2 items-center justify-center">
                <Ionicons name="close" size={18} color={isDark ? "#94A3B8" : theme.textSecondary} />
              </Pressable>
            </View>
            <Pressable
              onLayout={(e) => {
                barWidthRef.current = e.nativeEvent.layout.width;
              }}
              onPress={(e) => {
                if (barWidthRef.current > 0) seekTo((e.nativeEvent.locationX / barWidthRef.current) * duration);
              }}
              className="h-9 flex-row items-center gap-px"
            >
              {bars.map((peak, i) => {
                const played = i < Math.floor(progress * bars.length);
                return (
                  <View
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: Math.max(3, Math.round(peak * 24)),
                      backgroundColor: played ? theme.primary : isDark ? "#334155" : "#E2E8F0",
                    }}
                  />
                );
              })}
            </Pressable>
            <View className="mt-1 flex-row justify-between">
              <Text className="text-text-muted dark:text-gray-400" style={{ fontSize: captionSmall }}>
                {formatTime(position)}
              </Text>
              <Text className="text-text-muted dark:text-gray-400" style={{ fontSize: captionSmall }}>
                {formatTime(duration)}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-center gap-6">
              <Pressable onPress={prev} disabled={!canPrev} hitSlop={8} className={!canPrev ? "opacity-30" : ""}>
                <Ionicons name="play-skip-back" size={22} color={theme.primary} />
              </Pressable>
              <Pressable onPress={toggle} hitSlop={8} className="bg-primary h-10 w-10 items-center justify-center rounded-full">
                <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#fff" style={{ marginLeft: isPlaying ? 0 : 2 }} />
              </Pressable>
              <Pressable onPress={next} disabled={!canNext} hitSlop={8} className={!canNext ? "opacity-30" : ""}>
                <Ionicons name="play-skip-forward" size={22} color={theme.primary} />
              </Pressable>
            </View>
            <View className="mt-1 flex-row items-center justify-center gap-4">
              <Pressable onPress={toggleShuffle} hitSlop={8} className="h-8 w-8 items-center justify-center">
                <Ionicons name="shuffle" size={16} color={shuffle ? theme.primary : theme.textMuted} />
              </Pressable>
              <Pressable onPress={cycleSpeed} hitSlop={8} className="h-8 min-w-8 items-center justify-center px-1">
                <Text className="font-semibold" style={{ fontSize: captionSmall, color: speed === 1 ? theme.textMuted : theme.primary }}>
                  {speed}x
                </Text>
              </Pressable>
              <Pressable onPress={cycleSleepTimer} hitSlop={8} className="h-8 flex-row items-center justify-center gap-0.5 px-1">
                <Ionicons name={sleepMinutes ? "moon" : "moon-outline"} size={15} color={sleepMinutes ? theme.primary : theme.textMuted} />
                {sleepMinutes && (
                  <Text className="font-semibold" style={{ fontSize: captionSmall, color: theme.primary }}>
                    {sleepMinutes}m
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={cycleLoop} hitSlop={8} className="relative h-8 w-8 items-center justify-center">
                <Ionicons
                  name={loopMode === "off" ? "repeat-outline" : "repeat"}
                  size={16}
                  color={loopMode === "off" ? theme.textMuted : theme.primary}
                />
                {loopMode === "one" && (
                  <Text className="absolute top-0 right-0 text-[8px] leading-none font-bold" style={{ color: theme.primary }}>
                    1
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Modal visible={playerVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPlayerVisible(false)}>
        <View className="flex-1 bg-white dark:bg-slate-950" style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-row items-center justify-between px-4 pb-2">
            <Pressable onPress={() => setPlayerVisible(false)} hitSlop={8} className="h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-down" size={26} color={isDark ? "#94A3B8" : theme.textSecondary} />
            </Pressable>
            <Text
              className="text-text-primary flex-1 px-3 text-center font-bold dark:text-gray-100"
              numberOfLines={1}
              style={{ fontSize: heading }}
            >
              {currentTitle}
            </Text>
            <Pressable onPress={() => setQueueVisible(true)} hitSlop={8} className="h-9 w-9 items-center justify-center">
              <Ionicons name="list" size={24} color={isDark ? "#94A3B8" : theme.textSecondary} />
            </Pressable>
          </View>

          <View className="flex-1 justify-center px-8">
            <Text className="text-text-muted mb-2 font-medium dark:text-gray-400" style={{ fontSize: captionSmall }}>
              {currentHymnId}
            </Text>
            <Pressable
              onLayout={(e) => {
                modalBarWidthRef.current = e.nativeEvent.layout.width;
              }}
              onPress={(e) => {
                if (modalBarWidthRef.current > 0) seekTo((e.nativeEvent.locationX / modalBarWidthRef.current) * duration);
              }}
              className="h-16 flex-row items-center gap-px"
            >
              {bars.map((peak, i) => {
                const played = i < Math.floor(progress * bars.length);
                return (
                  <View
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: Math.max(3, Math.round(peak * 40)),
                      backgroundColor: played ? theme.primary : isDark ? "#334155" : "#E2E8F0",
                    }}
                  />
                );
              })}
            </Pressable>
            <View className="mt-2 flex-row justify-between">
              <Text className="text-text-muted dark:text-gray-400" style={{ fontSize: captionSmall }}>
                {formatTime(position)}
              </Text>
              <Text className="text-text-muted dark:text-gray-400" style={{ fontSize: captionSmall }}>
                {formatTime(duration)}
              </Text>
            </View>

            <View className="mt-8 flex-row items-center justify-center gap-10">
              <Pressable onPress={prev} disabled={!canPrev} hitSlop={8} className={!canPrev ? "opacity-30" : ""}>
                <Ionicons name="play-skip-back" size={34} color={theme.primary} />
              </Pressable>
              <Pressable onPress={toggle} hitSlop={8} className="bg-primary h-16 w-16 items-center justify-center rounded-full">
                <Ionicons name={isPlaying ? "pause" : "play"} size={30} color="#fff" style={{ marginLeft: isPlaying ? 0 : 3 }} />
              </Pressable>
              <Pressable onPress={next} disabled={!canNext} hitSlop={8} className={!canNext ? "opacity-30" : ""}>
                <Ionicons name="play-skip-forward" size={34} color={theme.primary} />
              </Pressable>
            </View>

            <View className="mt-10 flex-row items-center justify-center gap-6">
              <Pressable onPress={toggleShuffle} hitSlop={8} className="h-10 w-10 items-center justify-center">
                <Ionicons name="shuffle" size={20} color={shuffle ? theme.primary : theme.textMuted} />
              </Pressable>
              <Pressable onPress={cycleSpeed} hitSlop={8} className="h-10 min-w-10 items-center justify-center px-1">
                <Text className="font-semibold" style={{ fontSize: captionSmall, color: speed === 1 ? theme.textMuted : theme.primary }}>
                  {speed}x
                </Text>
              </Pressable>
              <Pressable onPress={cycleSleepTimer} hitSlop={8} className="h-10 flex-row items-center justify-center gap-1 px-1">
                <Ionicons name={sleepMinutes ? "moon" : "moon-outline"} size={18} color={sleepMinutes ? theme.primary : theme.textMuted} />
                {sleepMinutes && (
                  <Text className="font-semibold" style={{ fontSize: captionSmall, color: theme.primary }}>
                    {sleepMinutes}m
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={cycleLoop} hitSlop={8} className="relative h-10 w-10 items-center justify-center">
                <Ionicons
                  name={loopMode === "off" ? "repeat-outline" : "repeat"}
                  size={20}
                  color={loopMode === "off" ? theme.textMuted : theme.primary}
                />
                {loopMode === "one" && (
                  <Text className="absolute top-1 right-0 text-[9px] leading-none font-bold" style={{ color: theme.primary }}>
                    1
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={{ paddingBottom: insets.bottom + 16 }} />
        </View>
      </Modal>

      <Modal visible={queueVisible} animationType="slide" transparent onRequestClose={() => setQueueVisible(false)}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setQueueVisible(false)} />
          <View className="max-h-[70%] rounded-t-3xl bg-white dark:bg-slate-900" style={{ paddingBottom: insets.bottom + 12 }}>
            <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
              <Text className="text-text-primary font-bold dark:text-gray-100" style={{ fontSize: heading }}>
                Up Next
              </Text>
              <Pressable onPress={() => setQueueVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={isDark ? "#94A3B8" : theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {queue.map((item, i) => {
                const active = i === index;
                return (
                  <Pressable key={`${item.hymnId}-${i}`} onPress={() => jumpTo(i)} className="flex-row items-center gap-3 px-5 py-3">
                    <Ionicons
                      name={active ? "musical-notes" : "musical-note-outline"}
                      size={18}
                      color={active ? theme.primary : theme.textMuted}
                    />
                    <View className="flex-1">
                      <Text
                        className="font-semibold dark:text-gray-100"
                        numberOfLines={1}
                        style={{ fontSize: body, color: active ? theme.primary : undefined }}
                      >
                        {item.title ?? item.hymnId}
                      </Text>
                      {item.bookName && (
                        <Text className="text-text-muted dark:text-gray-400" style={{ fontSize: captionSmall }}>
                          {item.bookName}
                        </Text>
                      )}
                    </View>
                    <Text className="text-text-muted dark:text-gray-400" style={{ fontSize: captionSmall }}>
                      {formatTime(item.duration)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
