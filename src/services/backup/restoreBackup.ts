import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import { strFromU8, unzipSync } from "fflate";

import { useBibleBookmarksStore } from "@/state/bibleBookmarksStore";
import { useCollectionsStore } from "@/state/collectionsStore";
import { useFavoritesStore } from "@/state/favoritesStore";
import { useRecentsStore } from "@/state/recentsStore";
import { useRecordingsStore, type RecordingMeta } from "@/state/recordingsStore";
import { useSettingsStore } from "@/state/settingsStore";
import { downloadBackup, listBackup } from "@/services/drive/driveApi";
import { DATA_STORE_KEYS, type DataStoreKey, RESTORE_CACHE_FILENAME } from "./constants";
import { parseManifest, type BackupManifest } from "./backupManifest";

/** The zustand `persist` stores that must be rehydrated after AsyncStorage is rewritten. */
const STORES = [
  useRecordingsStore,
  useFavoritesStore,
  useBibleBookmarksStore,
  useCollectionsStore,
  useRecentsStore,
  useSettingsStore,
] as const;

const RECORDINGS_KEY = "nyimbonakirikaniro-recordings";

type StoreWithInitial = { getInitialState: () => unknown };

const STORE_BY_KEY: Record<DataStoreKey, StoreWithInitial> = {
  "nyimbonakirikaniro-recordings": useRecordingsStore,
  "nyimbonakirikaniro-favorites": useFavoritesStore,
  "nyimbonakirikaniro-bible-bookmarks": useBibleBookmarksStore,
  "nyimbonakirikaniro-collections": useCollectionsStore,
  "nyimbonakirikaniro-recents": useRecentsStore,
  "nyimbonakirikaniro-settings": useSettingsStore,
};

export interface RestoreResult {
  restoredAt: string;
}

export async function restoreBackup(token: string): Promise<RestoreResult> {
  const existing = await listBackup(token);
  if (!existing) throw new Error("No backup found in Google Drive");

  const zipFile = new File(Paths.cache, RESTORE_CACHE_FILENAME);
  try {
    await downloadBackup(token, existing.id, zipFile);
    const unzipped = unzipSync(await zipFile.bytes());
    const manifestBytes = unzipped["backup.json"];
    if (!manifestBytes) throw new Error("Backup manifest missing");
    const manifest = parseManifest(strFromU8(manifestBytes));

    // Audio first: the most likely failure is disk space, and failing before touching
    // AsyncStorage leaves the previous local state intact.
    writeRecordings(manifest, unzipped);
    await writeStores(manifest);
    await rehydrateStores();

    return { restoredAt: manifest.createdAt };
  } finally {
    try {
      zipFile.delete();
    } catch {
      // Cleanup is best-effort.
    }
  }
}

/** A manifest logicalPath must stay within the recordings directory. */
function isSafeLogicalPath(p: string): boolean {
  return p.startsWith("recordings/") && !p.includes("..");
}

/**
 * Writes restored audio files to disk and, in the manifest's recordings payload,
 * rewrites each recording's path to the restored location. Entries whose bytes are
 * missing (or whose path is unsafe) are dropped from the metadata so no dangling
 * recording survives.
 */
function writeRecordings(
  manifest: BackupManifest,
  unzipped: Record<string, Uint8Array>,
): void {
  const recPayload = manifest.stores[RECORDINGS_KEY];
  const recState = recPayload?.state as
    | { recordings?: Record<string, RecordingMeta | null> }
    | undefined;
  const recs = recState?.recordings;
  const restored = new Set<string>();

  for (const entry of manifest.recordings) {
    const data = unzipped[entry.logicalPath];
    if (!data || !isSafeLogicalPath(entry.logicalPath)) continue;
    const dest = new File(Paths.document, entry.logicalPath);
    dest.parentDirectory.create({ intermediates: true, idempotent: true });
    dest.write(data);
    if (recs?.[entry.hymnId]) {
      recs[entry.hymnId]!.path = dest.uri;
    }
    restored.add(entry.hymnId);
  }

  // Drop metadata for recordings whose audio wasn't restored (missing on the source,
  // missing in the archive, or an unsafe path) so no dangling recording survives.
  if (recs) {
    for (const hymnId of Object.keys(recs)) {
      if (!restored.has(hymnId)) delete recs[hymnId];
    }
  }
}

/**
 * Persists every store. Present stores are written from the backup; stores absent from
 * the backup are reset to their initial state and persisted explicitly — `rehydrate()` is
 * a no-op for an absent key, so a bare `removeItem` would leave the previous device's
 * data in memory until the next launch.
 */
async function writeStores(manifest: BackupManifest): Promise<void> {
  for (const key of DATA_STORE_KEYS) {
    const payload = manifest.stores[key];
    if (payload) {
      await AsyncStorage.setItem(key, JSON.stringify(payload));
    } else {
      const store = STORE_BY_KEY[key];
      await AsyncStorage.setItem(
        key,
        JSON.stringify({ state: store.getInitialState(), version: 0 }),
      );
    }
  }
}

async function rehydrateStores(): Promise<void> {
  await Promise.all(STORES.map((s) => s.persist.rehydrate()));
}
