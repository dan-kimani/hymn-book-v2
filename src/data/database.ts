import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  const DB_NAME = "hymns.db";
  const dbPath = `${FileSystem.documentDirectory}${DB_NAME}`;

  // Copy database from bundled asset to writable location.
  // Always overwrite to avoid stale/corrupt cached copies.
  try {
    const [{ localUri }] = await Asset.loadAsync(require("../../assets/data/hymns.db"));
    if (!localUri) throw new Error("Asset localUri is null");
    await FileSystem.copyAsync({ from: localUri, to: dbPath });
  } catch (e) {
    // If the asset is already at the document directory (development),
    // try to open it directly without copying.
    const info = await FileSystem.getInfoAsync(dbPath);
    if (!info.exists) {
      throw new Error(`Failed to copy database: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Verify the copied file is non-trivial (13 MB)
  const info = await FileSystem.getInfoAsync(dbPath);
  if (!info.exists || (info.size && info.size < 1024)) {
    throw new Error("Database copy failed: file is missing or too small");
  }

  db = await SQLite.openDatabaseAsync(DB_NAME, undefined, FileSystem.documentDirectory!);
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
