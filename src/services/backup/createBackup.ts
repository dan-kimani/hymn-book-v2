import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import { strToU8, zipSync } from "fflate";

import type { RecordingMeta } from "@/state/recordingsStore";
import { BACKUP_CACHE_FILENAME, DATA_STORE_KEYS } from "./constants";
import {
  buildManifest,
  type BackupManifest,
  type BackupRecordingEntry,
  type BackupStorePayload,
} from "./backupManifest";

export interface BackupArchive {
  uri: string;
  size: number;
}

/** Builds a single-file archive (manifest + recordings) and writes it to the cache. */
export async function createBackupArchive(): Promise<BackupArchive> {
  // 1. Snapshot the persisted store payloads verbatim (captures the `{state, version}` wrapper).
  const stores: BackupManifest["stores"] = {};
  const skipped: string[] = [];
  for (const key of DATA_STORE_KEYS) {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) continue;
    try {
      stores[key] = JSON.parse(raw) as BackupStorePayload;
    } catch {
      skipped.push(key);
    }
  }
  if (skipped.length > 0) {
    console.warn("[backup] skipped unreadable stores:", skipped.join(", "));
  }

  // 2. Collect recording audio files from the same persisted snapshot as the manifest
  // (not the in-memory store), so a scheduled backup fired before the recordings store
  // hydrates can't archive metadata with no audio.
  const recPayload = stores["nyimbonakirikaniro-recordings"];
  const recState = recPayload?.state as
    | { recordings?: Record<string, RecordingMeta | null> }
    | undefined;
  const recordings = recState?.recordings ?? {};
  const entries: BackupRecordingEntry[] = [];
  const files: Record<string, Uint8Array> = {};

  for (const [hymnId, rec] of Object.entries(recordings)) {
    if (!rec) continue;
    const file = new File(rec.path);
    if (!file.exists) continue;
    const basename = rec.path.split("/").pop() ?? "recording.m4a";
    const logicalPath = `recordings/${hymnId}/${basename}`;
    const bytes = await file.bytes();
    entries.push({ hymnId, logicalPath, size: bytes.byteLength });
    files[logicalPath] = bytes;
  }

  // 3. Build the manifest and zip everything into one archive.
  const manifest = buildManifest({
    appVersion: Constants.expoConfig?.version ?? "unknown",
    stores,
    recordings: entries,
  });

  const zipBytes = zipSync(
    { "backup.json": strToU8(JSON.stringify(manifest)), ...files },
    { level: 6 },
  );

  // 4. Write the archive to cache for upload.
  const out = new File(Paths.cache, BACKUP_CACHE_FILENAME);
  out.write(zipBytes);
  return { uri: out.uri, size: zipBytes.byteLength };
}
