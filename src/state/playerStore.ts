import { create } from "zustand";

interface PlayerState {
  /** The date-section key of the day currently loaded in the queue, if any. */
  activeDayKey: string | null;
  setActiveDay: (key: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  activeDayKey: null,
  setActiveDay: (key) => set({ activeDayKey: key }),
}));
