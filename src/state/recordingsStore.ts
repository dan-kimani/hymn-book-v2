import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RecordingMeta {
  id: string; // unique ID (timestamp-based)
  path: string; // file path in FileSystem.documentDirectory
  duration: number; // duration in seconds
  createdAt: number; // timestamp
}

interface RecordingsState {
  recordings: Record<string, RecordingMeta[]>; // hymnId → recordings
  addRecording: (hymnId: string, recording: RecordingMeta) => void;
  removeRecording: (hymnId: string, recordingId: string) => void;
  getRecordings: (hymnId: string) => RecordingMeta[];
}

export const useRecordingsStore = create<RecordingsState>()(
  persist(
    (set, get) => ({
      recordings: {},
      addRecording: (hymnId, recording) =>
        set((state) => ({
          recordings: {
            ...state.recordings,
            [hymnId]: [...(state.recordings[hymnId] ?? []), recording],
          },
        })),
      removeRecording: (hymnId, recordingId) =>
        set((state) => ({
          recordings: {
            ...state.recordings,
            [hymnId]: (state.recordings[hymnId] ?? []).filter((r) => r.id !== recordingId),
          },
        })),
      getRecordings: (hymnId) => get().recordings[hymnId] ?? [],
    }),
    {
      name: "nyimbo-recordings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
