import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface HymnRef {
  hymnId: string;
  bookId: string;
  number: number;
  title: string;
  bookName: string;
}

export interface Collection {
  id: string;
  name: string;
  hymns: HymnRef[];
  createdAt: number;
}

interface CollectionsState {
  collections: Collection[];
  createCollection: (name: string) => void;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  addToCollection: (collectionId: string, hymn: HymnRef) => void;
  removeFromCollection: (collectionId: string, hymnId: string) => void;
  isInCollection: (collectionId: string, hymnId: string) => boolean;
}

export const useCollectionsStore = create<CollectionsState>()(
  persist(
    (set, get) => ({
      collections: [],

      createCollection: (name) =>
        set((state) => ({
          collections: [
            ...state.collections,
            {
              id: Date.now().toString(36),
              name,
              hymns: [],
              createdAt: Date.now(),
            },
          ],
        })),

      deleteCollection: (id) =>
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
        })),

      renameCollection: (id, name) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, name } : c,
          ),
        })),

      addToCollection: (collectionId, hymn) =>
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            if (c.hymns.some((h) => h.hymnId === hymn.hymnId)) return c;
            return { ...c, hymns: [...c.hymns, hymn] };
          }),
        })),

      removeFromCollection: (collectionId, hymnId) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? { ...c, hymns: c.hymns.filter((h) => h.hymnId !== hymnId) }
              : c,
          ),
        })),

      isInCollection: (collectionId, hymnId) => {
        const col = get().collections.find((c) => c.id === collectionId);
        return col?.hymns.some((h) => h.hymnId === hymnId) ?? false;
      },
    }),
    {
      name: "nyimbonakirikaniro-collections",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
