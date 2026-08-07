import { create } from "zustand";

import {
  fetchBibleBooks as fetchBooksFromDb,
  fetchBibleChapter as fetchVerses,
  fetchBibleBook as fetchBook,
  fetchBibleChapterCount,
  fetchCrossReferences,
  resolveBibleReference as resolveRef,
  searchBibleBooks as searchBooks,
  searchBibleVerses as searchVerses,
} from "@/data/bibleQueries";
import type { BibleBook, BibleReference, BibleSearchResult, BibleVerse, CrossReference } from "@/data/bibleTypes";

interface BibleState {
  // Book list
  books: BibleBook[];
  booksLoaded: boolean;
  loadBooks: () => Promise<void>;

  // Chapter viewer
  book: BibleBook | null;
  verses: BibleVerse[];
  crossRefsMap: Record<number, CrossReference[]>;
  totalChapters: number;
  loadChapter: (bookId: number, chapter: number) => Promise<void>;

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

  // Chapter viewer
  book: null,
  verses: [],
  crossRefsMap: {},
  totalChapters: 0,
  loadChapter: async (bookId: number, chapter: number) => {
    const [book, verses, tc, crs] = await Promise.all([fetchBook(bookId), fetchVerses(bookId, chapter), fetchBibleChapterCount(bookId), fetchCrossReferences(bookId, chapter)]);
    const map: Record<number, CrossReference[]> = {};
    for (const cr of crs as any[]) {
      const vs = cr.sourceVerse as number;
      if (!map[vs]) map[vs] = [];
      map[vs].push(cr);
    }
    set({ book, verses, totalChapters: tc, crossRefsMap: map });
  },

  // Search
  query: "",
  searching: false,
  reference: null,
  bookResults: [],
  verseResults: [],

  setQuery: (q: string) => {
    const trimmed = q.trim();
    set({ query: q });

    if (!trimmed) {
      set({ searching: false, reference: null, bookResults: [], verseResults: [] });
      return;
    }

    set({ searching: true, reference: null });
    Promise.all([resolveRef(trimmed), searchBooks(trimmed), searchVerses(trimmed, 40)]).then(([ref, bkResults, vsResults]) => {
      // Only apply if query hasn't changed since
      if (get().query.trim() === trimmed) {
        set({ reference: ref, bookResults: bkResults, verseResults: vsResults, searching: false });
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
