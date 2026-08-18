import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_COLLECTIONS, CURRENT_SEED_VERSION } from "@/data/defaultCollections";

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
  _seedVersion: number;
  _touchedDefaultIds: string[];

  createCollection: (name: string) => void;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  addToCollection: (collectionId: string, hymn: HymnRef) => void;
  removeFromCollection: (collectionId: string, hymnId: string) => void;
  isInCollection: (collectionId: string, hymnId: string) => boolean;

  seedDefaultsIfNeeded: () => void;
}

const DEFAULT_IDS = new Set(DEFAULT_COLLECTIONS.map((d) => d.id));

function touchIfDefault(state: CollectionsState, id: string): Partial<CollectionsState> {
  if (DEFAULT_IDS.has(id) && !state._touchedDefaultIds.includes(id)) {
    return { _touchedDefaultIds: [...state._touchedDefaultIds, id] };
  }
  return {};
}

export const useCollectionsStore = create<CollectionsState>()(
  persist(
    (set, get) => ({
      collections: [],
      _seedVersion: 0,
      _touchedDefaultIds: [],

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
          ...touchIfDefault(state, id),
        })),

      renameCollection: (id, name) =>
        set((state) => ({
          collections: state.collections.map((c) => (c.id === id ? { ...c, name } : c)),
          ...touchIfDefault(state, id),
        })),

      addToCollection: (collectionId, hymn) =>
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            if (c.hymns.some((h) => h.hymnId === hymn.hymnId)) return c;
            return { ...c, hymns: [...c.hymns, hymn] };
          }),
          ...touchIfDefault(state, collectionId),
        })),

      removeFromCollection: (collectionId, hymnId) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId ? { ...c, hymns: c.hymns.filter((h) => h.hymnId !== hymnId) } : c,
          ),
          ...touchIfDefault(state, collectionId),
        })),

      isInCollection: (collectionId, hymnId) => {
        const col = get().collections.find((c) => c.id === collectionId);
        return col?.hymns.some((h) => h.hymnId === hymnId) ?? false;
      },

      seedDefaultsIfNeeded: () => {
        const state = get();
        if (state._seedVersion >= CURRENT_SEED_VERSION) return;

        const updated = [...state.collections];

        for (const def of DEFAULT_COLLECTIONS) {
          if (state._touchedDefaultIds.includes(def.id)) continue;

          const existingIdx = updated.findIndex((c) => c.id === def.id);
          if (existingIdx >= 0) {
            // Sync hymns for untouched default — adds new, removes deprecated
            updated[existingIdx] = {
              ...updated[existingIdx],
              hymns: def.hymns,
            };
          } else {
            // Brand new default collection
            updated.push({
              id: def.id,
              name: def.name,
              hymns: def.hymns,
              createdAt: Date.now(),
            });
          }
        }

        set({ collections: updated, _seedVersion: CURRENT_SEED_VERSION });
      },
    }),
    {
      name: "nyimbonakirikaniro-collections",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.error("[collectionsStore] hydration failed:", error);
          }
          // Seed defaults after persisted state is restored
          useCollectionsStore.getState().seedDefaultsIfNeeded();
        };
      },
    },
  ),
);
