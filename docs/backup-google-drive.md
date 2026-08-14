# Backup to Google Drive

## Context

The app stores all user-generated data locally: audio recordings (`.m4a` files under
`documentDirectory/recordings/` plus metadata in AsyncStorage) and six zustand `persist`
stores (favorites, Bible bookmarks, collections, recents, settings, recordings metadata).
If a user uninstalls or changes devices, everything is lost. This feature adds a
WhatsApp-style backup to Google Drive so the user can restore their recordings, bookmarks,
favorites, collections, recents, and settings after a reinstall.

Confirmed scope: **Android only**, **manual + scheduled** backup, **everything** included,
**no encryption** (MVP).

## Key technical decisions (verified against Expo SDK 57 / RN 0.86 docs)

- **Auth:** `@react-native-google-signin/google-signin` (native). `expo-auth-session`'s Google
  provider is deprecated in SDK 57. The native module gives `signIn()`, `signInSilently()`
  (session restore for the scheduled path), and `getTokens()` → `{ accessToken }`.
- **Scope:** `https://www.googleapis.com/auth/drive.appdata` (non-sensitive, no OAuth
  verification). Backups live in Drive's hidden **app data folder** (`spaces=appDataFolder`),
  exactly like WhatsApp — app-private, not visible in the user's normal Drive.
- **File I/O (new code):** use the new `expo-file-system` classes
  (`import { File, Directory, Paths } from "expo-file-system"`). Do **not** migrate
  `useRecorder.ts` — the legacy API it uses interoperates on the same `file://` URIs.
- **Archive:** `fflate` (pure JS) — `zipSync`/`unzipSync` produce/consume a single `.zip`
  containing a manifest + all audio. No native module.
- **Upload:** Drive **resumable** upload (multipart is capped at 5 MB; audio exceeds it).
  Resumable commits atomically, so a failed upload never corrupts the last good backup.
- **Scheduling:** check "is a backup due?" on app launch + `AppState` foreground transitions.
  A true OS background task (`expo-background-task`) is unreliable with native Google Sign-In's
  silent restore — deferred out of MVP.
- **HTTP:** `import { fetch } from "expo/fetch"` for Drive REST calls.

## Dependencies (yarn)

```sh
yarn add @react-native-google-signin/google-signin@^16.1.4 fflate@^0.8.3
```

Native module added → requires rebuild (`npx expo prebuild --platform android`, then
`yarn android` / `eas build`). No `expo-auth-session`, no `expo-background-task`.

## Google Cloud Console setup (prerequisite — needs user's Google account + signing key)

1. Create/select a Google Cloud project; enable the **Google Drive API**.
2. OAuth consent screen → External; add scope `https://www.googleapis.com/auth/drive.appdata`.
3. Create client IDs:
   - **Android** client: package `app.frame.nyimbonakirikaniro` + the SHA-1 of the signing key
     used for the shipped APK (obtain via `eas credentials`, or `keytool -list -v` against the
     keystore referenced in `scripts/build-apk.sh`; register one Android client per key).
   - **Web** client: used as `webClientId` in `configure()`.
4. Add config plugin `["@react-native-google-signin/google-signin", {}]` to `app.json` and put
   the Web client ID in `app.json` `expo.extra.webClientId` (read via `Constants.expoConfig?.extra`).

## New files

```sh
src/services/backup/constants.ts        – BACKUP_FILE_NAME, BACKUP_MIME, SCHEMA_VERSION, DATA_STORE_KEYS
src/services/drive/googleSignIn.ts      – configure / signIn / signInSilently / getTokens / signOut
src/services/drive/driveApi.ts          – Drive REST v3: listBackup / uploadBackup (resumable) / downloadBackup / deleteBackup
src/services/backup/backupManifest.ts   – build/parse manifest + normalizeRecordingPath
src/services/backup/createBackup.ts     – snapshot stores → zip → cache file { uri, size }
src/services/backup/restoreBackup.ts    – download → unzip → write AsyncStorage + audio → rehydrate stores
src/services/backup/scheduler.ts        – isBackupDue(freq, lastAt) + interval map
src/state/backupStore.ts                – zustand persist: frequency, lastBackupAt, status, error, driveFileId
src/hooks/useBackup.ts                  – UI hook: signIn, backUpNow, restore, progress, error, in-flight guard
src/components/settings/BackupSection.tsx – Settings card
```

## Files to modify

- `app.json` — add google-signin plugin + `extra.webClientId`.
- `app/(tabs)/settings.tsx` — render `<BackupSection />` (new "Backup" section).
- `app/_layout.tsx` — add `AppState` foreground-check hook that triggers a due scheduled backup.

## Backup manifest format (`backup.json` inside the archive)

```json
{
  "schemaVersion": 1,
  "appVersion": "1.1.3",
  "createdAt": "2026-08-13T18:00:00.000Z",
  "stores": {
    "nyimbonakirikaniro-recordings": { "state": { "recordings": {} }, "version": 0 },
    "nyimbonakirikaniro-favorites": { "state": { "favorites": [] }, "version": 0 },
    "nyimbonakirikaniro-bible-bookmarks": { "state": { "bookmarks": [] }, "version": 0 },
    "nyimbonakirikaniro-collections": { "state": { "collections": [], "_seedVersion": 2, "_touchedDefaultIds": [] }, "version": 0 },
    "nyimbonakirikaniro-recents": { "state": { "recents": [] }, "version": 0 },
    "nyimbonakirikaniro-settings": { "state": { "themeMode": "system", "fontSize": 18, "readingFont": "sans", "searchBooks": [], "openaiKey": "" }, "version": 0 }
  },
  "recordings": [{ "id": "m4a-xyz", "hymnId": "roho-mutheru", "logicalPath": "recordings/roho-mutheru/m4a-xyz.m4a", "size": 482123 }]
}
```

- Archive layout: `backup.json` + `recordings/<bookId>/<ts>.m4a`.
- The `-settings` payload includes `openaiKey` (the user's own private Drive app-data folder);
  call this out in the Settings copy.
- The backup store's own AsyncStorage key is **excluded** from the manifest — it's device-local
  scheduling state and restoring it would mis-schedule on a new device.
- `schemaVersion` enables future migrations.

## Implementation order

1. Google Cloud setup (above).
2. `yarn add` deps; add plugin + `extra.webClientId` to `app.json`.
3. Pure logic first: `constants.ts`, `backupStore.ts`, `scheduler.ts`.
4. `googleSignIn.ts` (configure with Web client ID + `drive.appdata` scope).
5. `driveApi.ts` — resumable upload via `expo/fetch` + new `File` classes:
   - list: `GET .../drive/v3/files?spaces=appDataFolder&q=name='nyimbonakirikaniro-backup.zip'&fields=files(id,name,modifiedTime,size)`
   - create/update: `POST`/`PATCH` `.../upload/drive/v3/files[?fileId]?uploadType=resumable`
     with `{ name, parents:["appDataFolder"] }` (parents on create only) + `X-Upload-Content-Type: application/zip`
     - `X-Upload-Content-Length`; then `PUT` the returned session URI with `body: new File(zipUri)`.
   - download: `GET .../drive/v3/files/{fileId}?alt=media`.
6. `backupManifest.ts` + `createBackup.ts` — read each `DATA_STORE_KEYS` raw JSON from AsyncStorage
   (captures the `{state,version}` wrapper), list recordings (skip missing files), `zipSync`, write to cache.
7. `restoreBackup.ts` — silent sign-in → list → download → `unzipSync` → `AsyncStorage.setItem` each
   store payload → write audio to `Paths.document` (create parent dirs) → `await Promise.all(STORES.map(s => s.persist.rehydrate()))`.
8. `useBackup.ts` (module-level in-flight flag to prevent double runs).
9. `BackupSection.tsx` + render in `settings.tsx`.
10. `AppState` scheduler in `_layout.tsx`.
11. Rebuild + verify.

## Error handling & edge cases

- **No network** → set error; `lastBackupAt` unchanged; scheduled run fails silently, retries next foreground.
- **Auth expired/revoked** → `signInSilently()`/`getTokens()` fails → prompt sign-in; never crash.
- **Partial upload** → resumable commit is atomic; prior backup intact; next run updates same `fileId`.
- **Empty recordings dir** → valid backup of stores only.
- **Missing/moved recording file** → `File(path).exists()` check; skip + log.
- **Fresh install** → same package ⇒ same `Paths.document` ⇒ restored absolute paths line up.
- **First-time vs incremental** → full snapshot each time (MVP); exactly one Drive file (fixed name → in-place update).

## Verification (real device / EAS APK — no test framework in this repo)

1. Rebuild: `npx expo prebuild --platform android` then `yarn android` or `eas build -p android --profile production`.
2. Settings → Backup → sign in → "Back up now" → spinner → "Last backup: just now (X MB)".
3. Mutate data (record, favorite, bookmark, collection) → back up again → confirm one file via
   `curl .../drive/v3/files?spaces=appDataFolder`.
4. Fresh-install restore: `adb shell pm clear app.frame.nyimbonakirikaniro` → relaunch → Restore →
   assert favorites/bookmarks/collections/recents/settings restored, recordings playable, theme applied.
5. Edge runs: airplane-mode backup (graceful error); sign-out then restore (prompts); deleted
   recording then backup (skip, no crash); double restore (idempotent).
6. Regression: recording flow still works (legacy file-system code untouched).
