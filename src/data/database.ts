import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function copyFromAsset(dbName: string, assetModule: any): Promise<void> {
  const dbPath = `${FileSystem.documentDirectory}${dbName}`;
  const info = await FileSystem.getInfoAsync(dbPath);
  if (info.exists) return; // already copied

  const [{ localUri }] = await Asset.loadAsync(assetModule);
  if (!localUri) throw new Error("Asset localUri is null");

  // Copy to a temp path, then move into place atomically so an interrupted copy
  // never leaves a truncated DB that the "already copied" check above would
  // treat as valid on the next launch.
  const tmpPath = `${dbPath}.tmp`;
  await FileSystem.copyAsync({ from: localUri, to: tmpPath });
  await FileSystem.moveAsync({ from: tmpPath, to: dbPath });
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Memoize the init promise so concurrent callers (loadBooks, loadChapter's
  // Promise.all, Home's daily hymn) share a single copy + open instead of racing
  // copyAsync/openDatabaseAsync on the same file.
  if (!dbPromise) {
    dbPromise = (async () => {
      await copyFromAsset("hymns.db", require("../../assets/data/hymns.db"));
      return SQLite.openDatabaseAsync("hymns.db", undefined, FileSystem.documentDirectory!);
    })().catch((e) => {
      dbPromise = null; // allow a retry on the next call
      throw e;
    });
  }
  return dbPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}
