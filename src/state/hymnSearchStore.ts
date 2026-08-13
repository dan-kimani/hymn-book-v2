import { create } from "zustand";

import { fetchDailyHymn, searchStanzas } from "@/data/queries";
import type { StanzaResult } from "@/data/types";

interface HymnSearchState {
  query: string;
  results: StanzaResult[];
  searching: boolean;
  dailyHymn: any;

  setQuery: (q: string, searchScope: string[] | null) => void;
  clearSearch: () => void;
  loadDailyHymn: () => void;
}

export const useHymnSearchStore = create<HymnSearchState>((set, get) => ({
  query: "",
  results: [],
  searching: false,
  dailyHymn: null,

  setQuery: (q: string, searchScope: string[] | null) => {
    const trimmed = q.trim();
    set({ query: trimmed });

    if (!trimmed) {
      set({ results: [], searching: false });
      return;
    }

    set({ searching: true, results: [] });

    searchStanzas(trimmed, searchScope, 40)
      .then((results) => {
        if (get().query.trim() === trimmed) {
          set({ results, searching: false });
        }
      })
      .catch((e) => {
        console.error("[hymnSearchStore.search]", e);
        if (get().query.trim() === trimmed) {
          set({ searching: false });
        }
      });
  },

  clearSearch: () => set({ query: "", results: [], searching: false }),

  loadDailyHymn: () => {
    fetchDailyHymn().then((h) => set({ dailyHymn: h })).catch((e) => console.error("[hymnSearchStore.dailyHymn]", e));
  },
}));
