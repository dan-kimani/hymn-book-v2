import { create } from "zustand";

import type { RecordingMeta } from "@/state/recordingsStore";

export type DayRecording = { hymnId: string } & RecordingMeta;
export type LoopMode = "off" | "all" | "one";

interface PlayerState {
  queue: DayRecording[];
  index: number;
  /** Actual native playback state, synced from the audio element's onPlay/onPause. */
  playing: boolean;
  /** Desired state — drives auto-play on source change, independent of `playing`. */
  desiredPlaying: boolean;
  /** Current playback position in seconds, synced from onPositionChange. */
  position: number;
  /** Day-section key active for a day-play. */
  activeDayKey: string | null;
  loopMode: LoopMode;

  setPlaying: (playing: boolean) => void;
  setDesiredPlaying: (desiredPlaying: boolean) => void;
  setPosition: (position: number) => void;
  setQueue: (queue: DayRecording[], index: number) => void;
  setIndex: (index: number) => void;
  setActiveDay: (activeDayKey: string | null) => void;
  setLoopMode: (loopMode: LoopMode) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  queue: [],
  index: 0,
  playing: false,
  desiredPlaying: false,
  position: 0,
  activeDayKey: null,
  loopMode: "off",

  setPlaying: (playing) => set({ playing }),
  setDesiredPlaying: (desiredPlaying) => set({ desiredPlaying }),
  setPosition: (position) => set({ position }),
  setQueue: (queue, index) => set({ queue, index, position: 0 }),
  setIndex: (index) => set({ index, position: 0 }),
  setActiveDay: (activeDayKey) => set({ activeDayKey }),
  setLoopMode: (loopMode) => set({ loopMode }),
  reset: () => set({ queue: [], index: 0, playing: false, desiredPlaying: false, position: 0, activeDayKey: null }),
}));
