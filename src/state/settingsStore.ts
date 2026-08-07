import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BookId } from "../data/types";

interface SettingsState {
  themeMode: "system" | "light" | "dark";
  fontSize: number;
  readingFont: "sans" | "serif";
  searchBooks: BookId[];
  setThemeMode: (mode: "system" | "light" | "dark") => void;
  setFontSize: (size: number) => void;
  setReadingFont: (font: "sans" | "serif") => void;
  setSearchBooks: (books: BookId[]) => void;
  toggleSearchBook: (bookId: BookId) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      themeMode: "system",
      fontSize: 18,
      readingFont: "sans",
      searchBooks: ["roho-mutheru", "atumwo", "kiroho", "golden-bells"],

      setThemeMode: (mode) => set({ themeMode: mode }),
      setFontSize: (size) => set({ fontSize: Math.max(14, Math.min(28, size)) }),
      setReadingFont: (font) => set({ readingFont: font }),
      setSearchBooks: (books) => set({ searchBooks: books }),
      toggleSearchBook: (bookId) => {
        const current = get().searchBooks;
        if (current.includes(bookId)) {
          set({ searchBooks: current.filter((b) => b !== bookId) });
        } else {
          set({ searchBooks: [...current, bookId] });
        }
      },
    }),
    {
      name: "gikuyuhymns-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
