import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FavoriteInfo {
  hymnId: string;
  bookId: string;
  bookName: string;
  number: number;
  title: string;
}

interface FavoritesState {
  favorites: FavoriteInfo[];
  isFavorite: (hymnId: string) => boolean;
  toggleFavorite: (info: FavoriteInfo) => void;
  removeFavorite: (hymnId: string) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      isFavorite: (hymnId) => get().favorites.some((f) => f.hymnId === hymnId),

      toggleFavorite: (info) => {
        const exists = get().favorites.some((f) => f.hymnId === info.hymnId);
        if (exists) {
          set({ favorites: get().favorites.filter((f) => f.hymnId !== info.hymnId) });
        } else {
          set({ favorites: [...get().favorites, info] });
        }
      },

      removeFavorite: (hymnId) => {
        set({ favorites: get().favorites.filter((f) => f.hymnId !== hymnId) });
      },
    }),
    {
      name: "nyimbo-favorites",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
