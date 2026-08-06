import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RecentItem } from "../data/types";

interface RecentsState {
  recents: RecentItem[];
  addRecent: (item: Omit<RecentItem, "openedAt">) => void;
  removeRecent: (hymnId: string) => void;
  clearRecents: () => void;
}

const MAX_RECENTS = 20;

export const useRecentsStore = create<RecentsState>()(
  persist(
    (set, get) => ({
      recents: [],

      addRecent: (item) => {
        const current = get().recents.filter((r) => r.hymnId !== item.hymnId);
        set({
          recents: [{ ...item, openedAt: Date.now() }, ...current].slice(0, MAX_RECENTS),
        });
      },

      removeRecent: (hymnId) => {
        set({ recents: get().recents.filter((r) => r.hymnId !== hymnId) });
      },

      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: "gikuyuhymns-recents",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
