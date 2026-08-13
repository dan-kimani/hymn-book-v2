import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RecordingMeta {
  id: string;
  path: string;
  duration: number;
  createdAt: number;
}

interface RecordingsState {
  recordings: Record<string, RecordingMeta | null>;
  setRecording: (hymnId: string, recording: RecordingMeta) => void;
  removeRecording: (hymnId: string) => void;
}

export const useRecordingsStore = create<RecordingsState>()(
  persist(
    (set) => ({
      recordings: {},
      setRecording: (hymnId, recording) =>
        set((state) => ({
          recordings: { ...state.recordings, [hymnId]: recording },
        })),
      removeRecording: (hymnId) =>
        set((state) => {
          const { [hymnId]: _removed, ...rest } = state.recordings;
          return { recordings: rest };
        }),
    }),
    {
      name: "nyimbonakirikaniro-recordings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
