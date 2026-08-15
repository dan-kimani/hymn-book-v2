# Production Readiness Audit — Nyĩmbo na Kĩrĩkanĩro

**Date:** 2026-08-15
**Scope:** whole app (Expo SDK 57, RN 0.86, React 19.2, expo-router, zustand 5, expo-sqlite, expo-audio, Google Drive backup)
**Method:** 8 parallel reviewers across security, build/release, data/SQLite, state/hooks, audio/recording, backup/Drive, UI/navigation, and cross-cutting correctness; critical/major items re-verified against source.

---

## Summary

The code is generally clean — `tsc --noEmit` passes, FTS5 works, event listeners are cleaned up, the expo-audio SDK 57 API usage is correct, and no hardcoded secrets are committed. The Google Drive backup is correctly scoped to the app-private `drive.appdata` folder via `getTokens()` and needs no in-repo client ID (see note below). The real risks are a missing DB migration path, a first-launch SQLite copy race, and several correctness/data-loss bugs in the record/read and restore flows.

---

## 🔴 Release blocker

### 1. No DB migration — bundled SQLite never updates on existing installs

- **Where:** `src/data/database.ts:7-15`, `src/data/bibleDatabase.ts:7-15`
- **What:** `copyFromAsset` returns early when the documents copy already exists. The `meta.data_version_v2` key written by `scripts/build_data.py:402` / `build_bible.py:335` is never read anywhere.
- **Impact:** Any data or schema change to `hymns.db` / `kikuyu-bible.db` silently never reaches existing users; the first schema change throws `no such column/table` on every existing install.
- **Fix:** Version the bundled data and migrate on first open — read `data_version_v2` (or `PRAGMA user_version`), compare to a compile-time constant, and if older, `closeAsync()` + `deleteAsync()` + re-copy + reopen. Bump the stored value in both build scripts on every DB change.

---

## 🟠 Major

### 3. Wrong scripture after back-navigation (global chapter state) — ✅ Resolved

**Status:** ✅ Resolved (2026-08-15). Moved chapter data to local `useState` in `app/bible/[bookId]/[chapter].tsx` (loaded directly via `fetchBibleBook`/`fetchBibleChapter`/`fetchCrossReferences` with a cancellation guard); removed `book`/`verses`/`crossRefsMap`/`totalChapters`/`loadChapter` from `bibleStore.ts`. Verified with `tsc --noEmit` (exit 0).

- **Where:** `src/state/bibleStore.ts:22-25, 56-73`, `app/bible/[bookId]/[chapter].tsx:99-103, 180-182`
- **What:** `bibleStore` holds a single global `book`/`verses`/`crossRefsMap`. Pushing a second chapter screen (cross-ref, bookmark) overwrites that shared state; the covered screen stays mounted with unchanged params and never reloads (no `useFocusEffect`). The `chapterToken` guard prevents stale writes but not cross-screen leakage.
- **Impact:** Pressing back after opening a cross-reference shows the wrong chapter's verses under the old header — wrong scripture in a Bible app.
- **Fix:** Hold fetched chapter in per-screen local state, or key the store by `${bookId}:${chapter}`.

### 4. In-progress recording is silently lost on navigation — ✅ Resolved

**Status:** ✅ Resolved (2026-08-15). Added a `beforeRemove` navigation guard in `app/hymn/[bookId]/[number].tsx` that finalizes an in-progress recording (`finalizeRecording`, now `async`) before the screen is removed — covering header back, hardware back, and any pop. Uses `isRecordingRef`/`finalizeRecordingRef` refs plus a `navigatingRef` re-entry guard. Verified `beforeRemove` is emitted by the vendored React Navigation 7 (`canPreventDefault: true`, `data.action`), and `tsc --noEmit` passes.

- **Where:** `src/hooks/useRecorder.ts:104-108`, `app/hymn/[bookId]/[number].tsx:269`
- **What:** Unmount cleanup only clears the timer (the recorder is released by `useAudioRecorder`). Only `goToHymn` finalizes; the header back button / hardware back / any route pop has no guard.
- **Impact:** User records a hymn tune, taps back, and the take is discarded with no warning — unrecoverable core-feature data loss.
- **Fix:** `beforeRemove` / `usePreventRemove` in the reader that finalizes (or confirms) when `isRecording`; finalize from the screen (which still has a live recorder) rather than the unmount cleanup.

### 5. iOS playback muted in silent mode — `setAudioModeAsync` never called

- **Where:** `src/hooks/usePlayback.ts:10`, `src/hooks/useRecorder.ts:17`
- **What:** Zero hits for `setAudioModeAsync` / `playsInSilentMode` in the repo. expo-audio defaults `playsInSilentMode` to `false`.
- **Impact:** On iOS, recording playback is inaudible whenever the ringer/silent switch is off — the feature appears broken for the most common iPhone state.
- **Fix:** `setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true })` once before first use (app root or in both hooks).

### 6. Restore is non-atomic and destructively overwrites newer data

- **Where:** `src/services/backup/restoreBackup.ts:56-58, 119-132`, `src/components/settings/BackupSection.tsx:49-58`
- **What:** Restore writes recordings then six `AsyncStorage.setItem` sequentially with no journal/staging/rollback. No recency check and no pre-restore snapshot; `lastBackupAt` is left unchanged, so the next auto-backup uploads the restored (older) state over the only cloud copy.
- **Impact:** A mid-restore failure leaves a mixed state; restoring a stale backup permanently destroys newer local data — irreversible, with no recovery path.
- **Fix:** Stage all payloads under temp keys + a staging dir, validate, then swap atomically; keep a pre-restore snapshot; show backup `createdAt` vs local recency and warn/refuse when older; reset `lastBackupAt` after restore.

### 7. First-launch SQLite copy/open race — ✅ Resolved

**Status:** ✅ Resolved (2026-08-15). `getDatabase()`/`getBibleDatabase()` now memoize a single init promise (`dbPromise ??= …`), so concurrent callers share one copy + open; the copy goes to a `.tmp` path then `moveAsync` (atomic), and a `.catch` resets the promise to allow retry. Verified `tsc --noEmit` (exit 0).

- **Where:** `src/data/database.ts:17-23`, `src/data/bibleDatabase.ts:17-23`
- **What:** The getters check a module-level `db` and are not promise-memoized. `loadChapter` fires 4 concurrent `getBibleDatabase()` calls; `loadBooks` races the Bible tab; Home's daily-hymn races search.
- **Impact:** Concurrent `copyAsync` + `openDatabaseAsync` on the same 10 MB file on first install → possible truncated/corrupt DB that then persists (the file exists, so the copy is skipped forever).
- **Fix:** Memoize one shared promise per DB: `dbPromise ??= (async () => { await copyFromAsset(...); return openDatabaseAsync(...); })()`; copy to a unique temp path then `moveAsync` for atomicity.

### 8. Build/distribution gaps

- **Where:** `eas.json:6-13`, `package.json:5-13`
- **What:** No `ios` build profile (iOS cannot ship via EAS). Production profile emits `buildType: "apk"` — Google Play requires AAB. No `test`/`lint`/`typecheck` scripts and no CI.
- **Impact:** iOS unreleasable; Play upload blocked (unless sideloading APKs is intentional); nothing verifies a build before release.
- **Fix:** Add an `ios` section to the production profile; use `buildType: "aab"` (default) for Play (keep a separate `apk` profile for sideloading); add `typecheck`/`lint` scripts and a CI workflow.

### 9. Backup/restore compress synchronously on the JS thread — ✅ Resolved

**Status:** ✅ Resolved (2026-08-15). Replaced `zipSync`/`unzipSync` with fflate's async `zip`/`unzip` (promisified), which yield between chunks so compression no longer blocks the JS thread. Verified `tsc --noEmit` (exit 0). Note: audio is still held in memory during zip (fflate has no per-entry streaming); fully streaming/memory-bounded compression would need a native module or worker — left as a future optimization.

- **Where:** `src/services/backup/createBackup.ts:49-70`, `restoreBackup.ts:49`
- **What:** All recordings loaded into memory via `file.bytes()` then `zipSync` (level 6) on the JS thread; `unzipSync` mirrors it on restore.
- **Impact:** UI freezes for seconds-to-minutes and can OOM on low-end devices (the target market), aborting backup mid-operation.
- **Fix:** Process entries one at a time, free buffers, use `fflate` async zip/unzip (or a worker/native compression), and `try/finally` cleanup of cache files.

---

## 🟡 Minor

### Data correctness

- **Cross-references spanning chapters mis-render.** `src/data/bibleQueries.ts:187` never selects `ref_end_chapter`, so `Deut 26:19-27:1` renders as `Deut 26:19-1` (23 affected rows).
- **`resolveBibleReference` accepts out-of-range verses** (`Johana 3:999`) and misses the `"Psalm 23"` alias (`PSA.englishName` is `"Psalms"`). `src/data/bibleQueries.ts:85-93`.

### State

- **`addBookmark` allows duplicates and colliding `Date.now().toString(36)` ids** (`src/state/bibleBookmarksStore.ts:21-28`).
- **`createCollection` uses `Date.now().toString(36)` ids** → two quick creates collide and delete/rename both (`src/state/collectionsStore.ts:60-64`).
- **Backup snapshots read raw AsyncStorage** (stale vs. live state); a "Back up now" right after an edit can overwrite the Drive copy with an incomplete snapshot (`src/services/backup/createBackup.ts:25-33`).
- **Dead `openaiKey`** persisted in plaintext AsyncStorage and included in every Drive backup; no consumer exists (`src/state/settingsStore.ts:12`).

### Audio / recording

- **No playback↔recording mutual exclusion** — recording while playing back captures the playback (echo) into the new take (`src/components/hymn/RecordingCard.tsx:68`).
- **Every recording orphans a temp `.m4a` in the Android cache** (recorder writes to `cacheDirectory`, never deleted after copy) (`src/hooks/useRecorder.ts:92`).
- **On copy failure a cache URI is persisted as a durable path** (`src/hooks/useRecorder.ts:97`) → "Recording missing" later.
- **`start()` doesn't clear a prior interval; a restart during a pending `stop()` misattributes the file** (`src/hooks/useRecorder.ts:44-47, 53-99`).

### Backup / Drive

- **`logicalPath` uses a `:` where the recorder sanitizes to `-`** → restored recordings live under a different directory scheme (`src/services/backup/createBackup.ts:54`).
- **No connectivity check / retry / 401 handling** — offline launches surface recurring error banners; no backoff against Drive quota (`src/hooks/useAutoBackup.ts:15-21`, `src/services/drive/driveApi.ts`).
- **A store whose persisted JSON fails to parse is silently dropped, then restored as empty defaults** (`src/services/backup/createBackup.ts:28-36`, `restoreBackup.ts:119-131`).
- **Restore deletes target recordings not in the archive and leaves orphaned audio files** (`src/services/backup/restoreBackup.ts:106-110`).

### Build / config

- **`allowBackup: true`** double-backs-up recordings/AsyncStorage alongside the in-app Drive backup (`app.json:33`).
- **`buildArchs: ["arm64-v8a"]`** excludes 32-bit devices (`app.json:55-57`).
- **`resourceConfigurations: ["en"]`** would strip any future Kikuyu resource localization (`app.json:58-60`).
- **Missing `POST_NOTIFICATIONS`** — no media-session notification on Android 13+ (`app.json:25-31`).
- **Manual version bump risk** — `appVersionSource: "local"` + `autoIncrement: false`; stale `1.1.3` values remain in the gitignored native dirs.
- **Legacy `.jks` in the working tree** (gitignored but stale) and local release builds sign with the debug key (`android/app/build.gradle:115`).

### UI / navigation

- **No error/retry states** — failed or out-of-range loads shimmer forever in the chapter reader (`app/bible/[bookId]/[chapter].tsx:296`), hymn reader (`app/hymn/[bookId]/[number].tsx:370`), and book screen (`app/bible/[bookId]/index.tsx:73`).
- **Disabling all search-scope books silently searches all books** (`app/(tabs)/index.tsx:47`, `src/data/queries.ts:50`).
- **Root layout returns `null` forever if fonts fail to load** (`app/_layout.tsx:48`).
- **`CrossRefExplorer` unhandled rejection** leaves an expanded card stuck on "Loading…" (`src/components/bible/CrossRefExplorer.tsx:46`).
- **`AIStudyModal` is a fragile Perplexity WebView** — DOM-scraping injected JS + hardcoded 3 s spinner; breaks on any Perplexity markup change, potential App Review risk (`src/components/bible/AIStudyModal.tsx:33, 72-89`).

### Types

- **`as any` casts bypass `typedRoutes`** in the most-trafficked nav paths (`app/bible/[bookId]/[chapter].tsx:207`, `CrossRefExplorer.tsx:126`, `BibleReferenceCard.tsx:21`, `bookmarks.tsx:116`, `favorites.tsx:96`).
- **Data-layer `any` hides row-shape drift** (`bibleStore.ts:63`, `queries.ts:13`, `bibleQueries.ts:166,195`) — e.g. `CrossReference` is missing `sourceVerse`.

---

## Recommended fix order

1. **Promise-memoize the two DB getters** (kills the first-launch corruption race — small, safe).
2. **Add a DB version check + migrate-on-open** (before the next data change).
3. **Scope chapter data to the screen** (or key the store by `bookId:chapter`).
4. **`beforeRemove` guard + finalize on the hymn reader** (recording loss).
5. **`setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true })`**.
6. **Make restore atomic + snapshot before overwrite** (data loss).
7. **Switch EAS to `aab` (+ iOS profile); add `typecheck`/`lint` scripts + CI.**
8. Move backup compression off the JS thread.
9. Triage the minor items (data-correctness bugs first).

---

## Verification note

The DB migration and first-launch race (`database.ts`/`bibleDatabase.ts`), the global chapter state (`bibleStore.ts`), the recording-loss and silent-mode issues (`useRecorder.ts`/`usePlayback.ts`), and the build/config items (`app.json`/`eas.json`) were independently verified against source. The Drive-auth finding was originally mis-flagged as a blocker and has been corrected (the `drive.appdata` flow needs no in-repo client ID). The remaining items were reported by the parallel reviewers, which also read the actual source and provided file:line evidence.
