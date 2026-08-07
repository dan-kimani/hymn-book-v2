import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

let bibleDb: SQLite.SQLiteDatabase | null = null;

async function copyFromAsset(dbName: string, assetModule: any): Promise<void> {
  const dbPath = `${FileSystem.documentDirectory}${dbName}`;
  const info = await FileSystem.getInfoAsync(dbPath);
  if (info.exists) return;

  const [{ localUri }] = await Asset.loadAsync(assetModule);
  if (!localUri) throw new Error("Asset localUri is null");
  await FileSystem.copyAsync({ from: localUri, to: dbPath });
}

export async function getBibleDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (bibleDb) return bibleDb;

  await copyFromAsset("kikuyu-bible.db", require("../../assets/data/kikuyu-bible.db"));
  bibleDb = await SQLite.openDatabaseAsync("kikuyu-bible.db", undefined, FileSystem.documentDirectory!);
  return bibleDb;
}

export async function closeBibleDatabase(): Promise<void> {
  if (bibleDb) {
    await bibleDb.closeAsync();
    bibleDb = null;
  }
}
