import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  shuffle: boolean;
  speed: number;
  /** Selected sleep-timer duration in minutes, or null when off. */
  sleepMinutes: number | null;

  setPlaying: (playing: boolean) => void;
  setDesiredPlaying: (desiredPlaying: boolean) => void;
  setPosition: (position: number) => void;
  setQueue: (queue: DayRecording[], index: number) => void;
  setIndex: (index: number) => void;
  setActiveDay: (activeDayKey: string | null) => void;
  setLoopMode: (loopMode: LoopMode) => void;
  setShuffle: (shuffle: boolean) => void;
  setSpeed: (speed: number) => void;
  setSleepMinutes: (sleepMinutes: number | null) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      queue: [],
      index: 0,
      playing: false,
      desiredPlaying: false,
      position: 0,
      activeDayKey: null,
      loopMode: "off",
      shuffle: false,
      speed: 1,
      sleepMinutes: null,

      setPlaying: (playing) => set({ playing }),
      setDesiredPlaying: (desiredPlaying) => set({ desiredPlaying }),
      setPosition: (position) => set({ position }),
      setQueue: (queue, index) => set({ queue, index, position: 0 }),
      setIndex: (index) => set({ index, position: 0 }),
      setActiveDay: (activeDayKey) => set({ activeDayKey }),
      setLoopMode: (loopMode) => set({ loopMode }),
      setShuffle: (shuffle) => set({ shuffle }),
      setSpeed: (speed) => set({ speed }),
      setSleepMinutes: (sleepMinutes) => set({ sleepMinutes }),
      reset: () => set({ queue: [], index: 0, playing: false, desiredPlaying: false, position: 0, activeDayKey: null }),
    }),
    {
      name: "nyimbonakirikaniro-player",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the playlist so playback can resume after a restart.
      // Transient runtime state (playing/desiredPlaying/position/sleepMinutes) is excluded.
      partialize: (state) => ({
        queue: state.queue,
        index: state.index,
        activeDayKey: state.activeDayKey,
        loopMode: state.loopMode,
        shuffle: state.shuffle,
        speed: state.speed,
      }),
    },
  ),
);
