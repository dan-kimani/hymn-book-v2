import TrackPlayer, { useIsPlaying, type Track } from "react-native-track-player";

import { setupPlayer } from "@/player/setupPlayer";
import { usePlayerStore } from "@/state/playerStore";
import type { RecordingMeta } from "@/state/recordingsStore";

export type DayRecording = { hymnId: string } & RecordingMeta;

// Guards against a double-tap racing two reset+add+play sequences.
let toggling = false;

function toTrack(r: DayRecording): Track {
  const url = r.path.startsWith("file://") ? r.path : `file://${r.path}`;
  return {
    id: r.hymnId,
    url,
    title: r.title ?? r.hymnId,
    artist: r.bookName,
    duration: r.duration,
  };
}

export function useDayPlaylist() {
  const activeDayKey = usePlayerStore((s) => s.activeDayKey);
  const { playing } = useIsPlaying();
  const isPlaying = playing === true;

  /** Play a day's recordings (already sorted newest-first), or pause/resume if it is the active day. */
  const toggleDay = async (dayKey: string, recordings: readonly DayRecording[]) => {
    if (toggling) return;
    toggling = true;
    try {
      if (activeDayKey === dayKey) {
        if (isPlaying) await TrackPlayer.pause();
        else await TrackPlayer.play();
        return;
      }
      await setupPlayer();
      await TrackPlayer.reset();
      await TrackPlayer.add(recordings.map(toTrack));
      await TrackPlayer.play();
      usePlayerStore.getState().setActiveDay(dayKey);
    } finally {
      toggling = false;
    }
  };

  return { activeDayKey, isPlaying, toggleDay };
}
