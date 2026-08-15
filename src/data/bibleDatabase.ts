import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

let bibleDbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

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

export function getBibleDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Memoize the init promise so concurrent callers share a single copy + open.
  if (!bibleDbPromise) {
    bibleDbPromise = (async () => {
      await copyFromAsset("kikuyu-bible.db", require("../../assets/data/kikuyu-bible.db"));
      return SQLite.openDatabaseAsync("kikuyu-bible.db", undefined, FileSystem.documentDirectory!);
    })().catch((e) => {
      bibleDbPromise = null; // allow a retry on the next call
      throw e;
    });
  }
  return bibleDbPromise;
}

export async function closeBibleDatabase(): Promise<void> {
  if (bibleDbPromise) {
    const db = await bibleDbPromise;
    await db.closeAsync();
    bibleDbPromise = null;
  }
}
