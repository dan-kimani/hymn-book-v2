import { Appearance } from "react-native";
import { Uniwind } from "uniwind";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BookId } from "../data/types";

function resolveTheme(mode: "system" | "light" | "dark"): "light" | "dark" {
  if (mode === "system") {
    const system = Appearance.getColorScheme();
    return system === "dark" ? "dark" : "light";
  }
  return mode;
}

interface SettingsState {
  themeMode: "system" | "light" | "dark";
  fontSize: number;
  readingFont: "sans" | "serif";
  searchBooks: BookId[];
  openaiKey: string;
  setThemeMode: (mode: "system" | "light" | "dark") => void;
  setFontSize: (size: number) => void;
  setReadingFont: (font: "sans" | "serif") => void;
  setOpenAIKey: (key: string) => void;
  toggleSearchBook: (bookId: BookId) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      themeMode: "system",
      fontSize: 18,
      readingFont: "sans",
      searchBooks: ["roho-mutheru", "atumwo", "kiroho", "golden-bells"],
      openaiKey: "",

      setThemeMode: (mode) => {
        Uniwind.setTheme(resolveTheme(mode));
        set({ themeMode: mode });
      },
      setFontSize: (size) => set({ fontSize: Math.max(14, Math.min(28, size)) }),
      setReadingFont: (font) => set({ readingFont: font }),
      setOpenAIKey: (key) => set({ openaiKey: key }),
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
