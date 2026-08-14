import { SCHEMA_VERSION, type DataStoreKey } from "./constants";

/** The persisted zustand payload shape: `{ state, version }`. */
export interface BackupStorePayload {
  state: Record<string, unknown>;
  version: number;
}

/** A single recorded audio file inside the archive. */
export interface BackupRecordingEntry {
  hymnId: string;
  /** Path relative to the document directory, e.g. `recordings/<hymnId>/<ts>.m4a`. */
  logicalPath: string;
  size: number;
}

export interface BackupManifest {
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  stores: Partial<Record<DataStoreKey, BackupStorePayload>>;
  recordings: BackupRecordingEntry[];
}

export function buildManifest(params: {
  appVersion: string;
  stores: Partial<Record<DataStoreKey, BackupStorePayload>>;
  recordings: BackupRecordingEntry[];
}): BackupManifest {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: params.appVersion,
    createdAt: new Date().toISOString(),
    stores: params.stores,
    recordings: params.recordings,
  };
}

export function parseManifest(json: string): BackupManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Backup manifest is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Backup manifest is empty");
  }
  const manifest = parsed as Partial<BackupManifest>;
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported backup version: ${manifest.schemaVersion}`);
  }
  if (!manifest.stores || typeof manifest.stores !== "object") {
    throw new Error("Backup manifest is missing stores");
  }
  if (!Array.isArray(manifest.recordings)) {
    throw new Error("Backup manifest is missing recordings");
  }
  return manifest as BackupManifest;
}
