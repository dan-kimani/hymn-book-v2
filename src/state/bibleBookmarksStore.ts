import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BibleBookmark } from "@/data/bibleTypes";

interface BibleBookmarksState {
  bookmarks: BibleBookmark[];
  addBookmark: (b: Omit<BibleBookmark, "id" | "createdAt">) => void;
  removeBookmark: (bookId: number, chapter: number, verse: number) => void;
  updateNote: (id: string, note: string) => void;
  isBookmarked: (bookId: number, chapter: number, verse: number) => BibleBookmark | undefined;
  getChapterBookmarks: (bookId: number, chapter: number) => BibleBookmark[];
}

export const useBibleBookmarksStore = create<BibleBookmarksState>()(
  persist(
    (set, get) => ({
      bookmarks: [],

      addBookmark: (b) => {
        const bookmark: BibleBookmark = {
          ...b,
          id: `${b.bookId}-${b.chapter}-${b.verseStart}-${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ bookmarks: [bookmark, ...s.bookmarks] }));
      },

      removeBookmark: (bookId, chapter, verse) => {
        set((s) => ({
          bookmarks: s.bookmarks.filter((b) => !(b.bookId === bookId && b.chapter === chapter && b.verseStart <= verse && b.verseEnd >= verse)),
        }));
      },

      updateNote: (id, note) => {
        set((s) => ({
          bookmarks: s.bookmarks.map((b) => (b.id === id ? { ...b, note } : b)),
        }));
      },

      isBookmarked: (bookId, chapter, verse) => {
        return get().bookmarks.find((b) => b.bookId === bookId && b.chapter === chapter && b.verseStart <= verse && b.verseEnd >= verse);
      },

      getChapterBookmarks: (bookId, chapter) => {
        return get().bookmarks.filter((b) => b.bookId === bookId && b.chapter === chapter);
      },
    }),
    {
      name: "gikuyuhymns-bible-bookmarks",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
