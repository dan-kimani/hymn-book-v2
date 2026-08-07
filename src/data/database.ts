import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

async function copyFromAsset(dbName: string, assetModule: any): Promise<void> {
  const dbPath = `${FileSystem.documentDirectory}${dbName}`;
  const info = await FileSystem.getInfoAsync(dbPath);
  if (info.exists) return; // already copied

  const [{ localUri }] = await Asset.loadAsync(assetModule);
  if (!localUri) throw new Error("Asset localUri is null");
  await FileSystem.copyAsync({ from: localUri, to: dbPath });
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  await copyFromAsset("hymns.db", require("../../assets/data/hymns.db"));
  db = await SQLite.openDatabaseAsync("hymns.db", undefined, FileSystem.documentDirectory!);
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
