/** Fixed Google Drive file name so backups update in place (single snapshot). */
export const BACKUP_FILE_NAME = "nyimbonakirikaniro-backup.zip";

/** MIME type of the backup archive. */
export const BACKUP_MIME = "application/zip";

/** Schema version of the backup manifest. Bump on breaking format changes. */
export const SCHEMA_VERSION = 1;

/** AsyncStorage keys of the zustand `persist` stores that hold user data. */
export const DATA_STORE_KEYS = [
  "nyimbonakirikaniro-recordings",
  "nyimbonakirikaniro-favorites",
  "nyimbonakirikaniro-bible-bookmarks",
  "nyimbonakirikaniro-collections",
  "nyimbonakirikaniro-recents",
  "nyimbonakirikaniro-settings",
] as const;

export type DataStoreKey = (typeof DATA_STORE_KEYS)[number];

/** Cache filename while the archive is being built for upload. */
export const BACKUP_CACHE_FILENAME = "nyimbonakirikaniro-backup.zip";

/** Cache filename while the archive is being downloaded for restore. */
export const RESTORE_CACHE_FILENAME = "nyimbonakirikaniro-restore.zip";
