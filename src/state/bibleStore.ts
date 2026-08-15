import { create } from "zustand";

import {
  fetchBibleBooks as fetchBooksFromDb,
  resolveBibleReference as resolveRef,
  searchBibleBooks as searchBooks,
  searchBibleVerses as searchVerses,
} from "@/data/bibleQueries";
import type { BibleBook, BibleReference, BibleSearchResult } from "@/data/bibleTypes";

interface BibleState {
  // Book list
  books: BibleBook[];
  booksLoaded: boolean;
  loadBooks: () => Promise<void>;

  // Search
  query: string;
  searching: boolean;
  reference: BibleReference | null;
  bookResults: BibleBook[];
  verseResults: BibleSearchResult[];

  setQuery: (q: string) => void;
  clearSearch: () => void;
}

export const useBibleStore = create<BibleState>((set, get) => ({
  // Book list — lazy-loaded once and cached
  books: [],
  booksLoaded: false,
  loadBooks: async () => {
    if (get().booksLoaded) return;
    const books = await fetchBooksFromDb();
    set({ books, booksLoaded: true });
  },

  // Search
  query: "",
  searching: false,
  reference: null,
  bookResults: [],
  verseResults: [],

  setQuery: (q: string) => {
    const trimmed = q.trim();
    set({ query: trimmed });

    if (!trimmed) {
      set({ searching: false, reference: null, bookResults: [], verseResults: [] });
      return;
    }

    set({ searching: true, reference: null, bookResults: [], verseResults: [] });
    Promise.all([resolveRef(trimmed), searchBooks(trimmed), searchVerses(trimmed, 40)])
      .then(([ref, bkResults, vsResults]) => {
        if (get().query.trim() === trimmed) {
          set({ reference: ref, bookResults: bkResults, verseResults: vsResults, searching: false });
        }
      })
      .catch((e) => {
        console.error("[bibleStore.search]", e);
        if (get().query.trim() === trimmed) {
          set({ searching: false });
        }
      });
  },

  clearSearch: () =>
    set({
      query: "",
      searching: false,
      reference: null,
      bookResults: [],
      verseResults: [],
    }),
}));
